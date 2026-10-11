// server/api/invoices/mark-invoice-paid.post.ts
// Markiert eine Rechnung als bezahlt — NUR für Admins.
// Bankimport = technisch verifiziert; sonst nur mit ausdrücklicher manueller Attestierung.
// Finanzielle Writes NUR über mark_invoice_paid_core (atomar). Kein sequential Fallback.
// Schreibt keine cash_transactions. Staff-POS/Credits/Audit sind post-commit.

import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { applyInvoiceCreditOnPaid } from '~/server/utils/invoice-credit'
import { applyStaffPosCreditsForPaidInvoice } from '~/server/utils/staff-pos-completion'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'
import {
  MarkInvoicePaidError,
  assertMarkInvoicePaidRole,
  buildMarkInvoicePaidAuditDetails,
  computePaidTotals,
  isBankDedupeAlreadySettledOutcome,
  mapMarkInvoicePaidRpcMessage,
  normalizePaymentMethodLabel,
  planCourseRegistrationPaySync,
  resolveSettlementSource,
} from '~/server/utils/mark-invoice-paid'

function httpErrorFromMark(err: unknown) {
  if (err instanceof MarkInvoicePaidError) {
    return createError({
      statusCode: err.statusCode,
      statusMessage: err.message,
      data: err.settlementCode ? { settlement_code: err.settlementCode } : undefined,
    })
  }
  const message = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : ''
  const mapped = mapMarkInvoicePaidRpcMessage(message)
  if (mapped) {
    return createError({
      statusCode: mapped.statusCode,
      statusMessage: mapped.message,
      data: mapped.settlementCode ? { settlement_code: mapped.settlementCode } : undefined,
    })
  }
  if ((err as any)?.code === 'PGRST202') {
    return createError({
      statusCode: 503,
      statusMessage: 'Zahlungsverbuchung nicht verfügbar (mark_invoice_paid_core fehlt). Keine Teilbuchung ausgeführt.',
      data: { settlement_code: 'rpc_missing' },
    })
  }
  return null
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const ipAddress = getClientIP(event)

  const { data: staffUser } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  try {
    assertMarkInvoicePaidRole(staffUser?.role)
  } catch (err) {
    const mapped = httpErrorFromMark(err)
    if (mapped) throw mapped
    throw err
  }

  if (!staffUser?.tenant_id || !staffUser.id) {
    throw createError({ statusCode: 403, statusMessage: 'Nur Admins dürfen Rechnungen als bezahlt markieren' })
  }

  const body = await readBody(event)
  const {
    invoice_id,
    paid_at,
    paid_amount_rappen,
    note,
    payment_method,
    camt_dedupe_key,
    camt_bank_ref,
    camt_reference,
    camt_debtor_name,
    import_source,
    manual_payment_attested,
  } = body || {}

  if (!invoice_id || typeof invoice_id !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'invoice_id required' })
  }

  const now = new Date().toISOString()
  const paidAt = typeof paid_at === 'string' && paid_at.trim() ? paid_at : now
  const methodLabel = normalizePaymentMethodLabel(payment_method, note)

  let settlement: { source: 'bank_import' | 'manual_attestation'; technicallyVerified: boolean }
  try {
    settlement = resolveSettlementSource({
      camtDedupeKey: camt_dedupe_key,
      manualPaymentAttested: manual_payment_attested === true,
      paymentMethod: methodLabel,
    })
  } catch (err) {
    const mapped = httpErrorFromMark(err)
    if (mapped) throw mapped
    throw err
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, user_id, tenant_id, total_amount_rappen, paid_amount_rappen, payment_status, internal_notes')
    .eq('id', invoice_id)
    .eq('tenant_id', staffUser.tenant_id)
    .single()

  if (!invoice || invoice.tenant_id !== staffUser.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
  }

  let totals: { newPaymentRappen: number; clampedTotalRappen: number; isPartial: boolean }
  try {
    totals = computePaidTotals({
      invoiceTotalRappen: invoice.total_amount_rappen || 0,
      previouslyPaidRappen: invoice.paid_amount_rappen || 0,
      requestedPaymentRappen: paid_amount_rappen,
    })
  } catch (err) {
    const mapped = httpErrorFromMark(err)
    if (mapped) throw mapped
    throw err
  }

  const { data: linkedRegs, error: regLoadError } = await supabase
    .from('course_registrations')
    .select('id, tenant_id, invoice_id')
    .eq('invoice_id', invoice_id)
    .eq('tenant_id', staffUser.tenant_id)
    .is('deleted_at', null)
    .neq('status', 'cancelled')

  if (regLoadError) {
    throw createError({ statusCode: 500, statusMessage: 'Kursanmeldungen konnten nicht geladen werden' })
  }

  let syncPlan
  try {
    syncPlan = planCourseRegistrationPaySync({
      isPartial: totals.isPartial,
      clampedTotalRappen: totals.clampedTotalRappen,
      registrations: linkedRegs || [],
      tenantId: staffUser.tenant_id,
      invoiceId: invoice_id,
    })
  } catch (err) {
    const mapped = httpErrorFromMark(err)
    if (mapped) throw mapped
    throw err
  }

  const noteText = typeof note === 'string' && note.trim() ? note.trim() : null
  const settlementNote =
    settlement.source === 'manual_attestation'
      ? [noteText, '[manual_attestation]'].filter(Boolean).join(' ')
      : noteText

  const bankKey =
    settlement.source === 'bank_import' && typeof camt_dedupe_key === 'string'
      ? camt_dedupe_key.trim()
      : null

  const rpcArgs: Record<string, unknown> = {
    p_tenant_id: staffUser.tenant_id,
    p_invoice_id: invoice_id,
    p_actor_user_id: staffUser.id,
    p_expected_paid_amount_rappen: invoice.paid_amount_rappen || 0,
    p_requested_payment_rappen: totals.newPaymentRappen,
    p_paid_at: paidAt,
    p_payment_method: methodLabel,
    p_notes: settlementNote,
    p_internal_notes: noteText,
    p_settlement_source: settlement.source,
    p_sync_registration_id: syncPlan.action === 'sync' ? syncPlan.registrationId : null,
    p_bank_dedupe_key: bankKey,
    p_bank_ref: bankKey ? (camt_bank_ref || null) : null,
    p_bank_entry_date: bankKey && paid_at ? paidAt.substring(0, 10) : null,
    p_bank_reference: bankKey ? (camt_reference || null) : null,
    p_bank_debtor_name: bankKey ? (camt_debtor_name || null) : null,
    p_bank_import_source: bankKey ? (import_source === 'csv' ? 'csv' : 'camt') : null,
  }

  // Fail closed BEFORE any settlement write if the atomic RPC is missing.
  const { data: rpcResult, error: rpcError } = await supabase.rpc('mark_invoice_paid_core', rpcArgs)

  if (rpcError) {
    const mapped = httpErrorFromMark(rpcError)
    if (mapped) throw mapped
    throw createError({
      statusCode: 500,
      statusMessage: rpcError.message || 'Zahlung konnte nicht verbucht werden',
      data: { settlement_code: 'rpc_error' },
    })
  }

  const alreadySettled = isBankDedupeAlreadySettledOutcome(rpcResult)
  const settledPaidRappen =
    typeof (rpcResult as any)?.paid_amount_rappen === 'number'
      ? (rpcResult as any).paid_amount_rappen
      : totals.clampedTotalRappen
  const settledIsPartial =
    typeof (rpcResult as any)?.is_partial === 'boolean'
      ? (rpcResult as any).is_partial
      : totals.isPartial
  const settledNewPayment =
    typeof (rpcResult as any)?.new_payment_rappen === 'number'
      ? (rpcResult as any).new_payment_rappen
      : alreadySettled
        ? 0
        : totals.newPaymentRappen
  const courseRegistrationId =
    (rpcResult as any)?.course_registration_id
    || (syncPlan.action === 'sync' ? syncPlan.registrationId : null)

  // Post-commit side effects only after atomic settlement succeeded.
  // These are intentionally outside the DB transaction (no cash ledger here).
  if (!alreadySettled && !settledIsPartial) {
    await supabase
      .from('payments')
      .update({ payment_status: 'completed', paid_at: paidAt, updated_at: now })
      .eq('invoice_id', invoice_id)
      .eq('tenant_id', invoice.tenant_id)
      .in('payment_status', ['invoice', 'invoiced', 'pending', 'open', 'failed', 'partial'])

    const { data: invoiceItems } = await supabase
      .from('invoice_items')
      .select('appointment_id')
      .eq('invoice_id', invoice_id)
      .not('appointment_id', 'is', null)

    if (invoiceItems && invoiceItems.length > 0 && invoice.user_id) {
      const appointmentIds = invoiceItems.map((item: any) => item.appointment_id).filter(Boolean)
      if (appointmentIds.length > 0) {
        await supabase
          .from('payments')
          .update({ payment_status: 'completed', invoice_id, paid_at: paidAt, updated_at: now })
          .eq('user_id', invoice.user_id)
          .eq('tenant_id', invoice.tenant_id)
          .in('appointment_id', appointmentIds)
          .in('payment_status', ['invoice', 'invoiced', 'pending', 'open', 'failed', 'partial'])
      }
    }

    const { data: invoicePayments, error: staffPosLoadError } = await supabase
      .from('payments')
      .select('id, tenant_id, metadata')
      .eq('invoice_id', invoice_id)
      .eq('tenant_id', invoice.tenant_id)

    if (staffPosLoadError) {
      throw createError({ statusCode: 500, statusMessage: 'Staff-POS-Zahlungen konnten nicht geladen werden' })
    }

    try {
      await applyStaffPosCreditsForPaidInvoice({
        payments: invoicePayments || [],
        tenantId: invoice.tenant_id,
        actorUserId: staffUser.id,
        isPartial: false,
        rpc: async (args) => {
          const { data, error: rpcStaffError } = await supabase.rpc('staff_pos_sale', args)
          if (rpcStaffError) throw rpcStaffError
          return data
        },
      })
    } catch (staffPosErr: any) {
      throw createError({
        statusCode: staffPosErr?.statusCode || 500,
        statusMessage: staffPosErr?.message || 'Staff-POS-Guthaben konnte nicht gebucht werden',
      })
    }
  }

  let creditAppliedRappen = 0
  if (!alreadySettled && !settledIsPartial && invoice.user_id) {
    try {
      const creditResult = await applyInvoiceCreditOnPaid({
        supabase,
        invoiceId: invoice_id,
        tenantId: staffUser.tenant_id,
        userId: invoice.user_id,
        actorUserId: staffUser.id,
      })
      creditAppliedRappen = creditResult.applied_rappen
    } catch (creditErr: any) {
      console.warn('⚠️ Invoice paid but wallet credit failed:', creditErr?.message || creditErr)
    }
  }

  const auditDetails = buildMarkInvoicePaidAuditDetails({
    settlementSource: settlement.source,
    technicallyVerified: settlement.technicallyVerified,
    paymentMethod: methodLabel,
    newPaymentRappen: settledNewPayment,
    clampedTotalRappen: settledPaidRappen,
    isPartial: settledIsPartial,
    courseRegistrationId,
    importSource: import_source || null,
    outcome: alreadySettled ? 'already_settled' : 'settled',
    auditWritten: false,
  })

  const auditWritten = await logAudit({
    user_id: staffUser.id,
    auth_user_id: authUser.id,
    action: 'mark_invoice_paid',
    resource_type: 'invoice',
    resource_id: invoice_id,
    status: 'success',
    tenant_id: staffUser.tenant_id,
    ip_address: ipAddress,
    details: { ...auditDetails, audit_written: true },
  }, event)

  if (!auditWritten) {
    console.warn('⚠️ mark_invoice_paid settled but audit log was not written', {
      invoice_id,
      tenant_id: staffUser.tenant_id,
      settlement_source: settlement.source,
    })
  }

  return {
    success: true,
    invoice_id,
    paid_amount_rappen: settledPaidRappen,
    new_payment_rappen: settledNewPayment,
    is_partial: settledIsPartial,
    credit_applied_rappen: creditAppliedRappen,
    settlement_source: settlement.source,
    technically_verified: settlement.technicallyVerified,
    course_registration_id: courseRegistrationId,
    outcome: alreadySettled ? 'already_settled' : 'settled',
    idempotent: alreadySettled,
    audit_written: auditWritten,
    payment_confirmation_kind:
      settlement.source === 'bank_import' ? 'technically_verified' : 'manual_attestation',
  }
})
