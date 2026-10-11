// server/api/invoices/mark-invoice-paid.post.ts
// Markiert eine Rechnung als bezahlt — NUR für Admins.
// Bankimport = technisch verifiziert; sonst nur mit ausdrücklicher manueller Attestierung.
// Schreibt keine cash_transactions und synct Kursanmeldungen tenant-sicher bei Vollzahlung.

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
  normalizePaymentMethodLabel,
  planCourseRegistrationPaySync,
  resolveSettlementSource,
} from '~/server/utils/mark-invoice-paid'

function httpErrorFromMark(err: unknown) {
  if (err instanceof MarkInvoicePaidError) {
    return createError({ statusCode: err.statusCode, statusMessage: err.message })
  }
  const message = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : ''
  if (/mark_invoice_paid_core_already_paid/i.test(message)) {
    return createError({ statusCode: 409, statusMessage: 'Rechnung ist bereits vollständig bezahlt' })
  }
  if (/mark_invoice_paid_core_concurrent_modification/i.test(message)) {
    return createError({ statusCode: 409, statusMessage: 'Rechnung wurde zwischenzeitlich geändert — bitte erneut laden' })
  }
  if (/mark_invoice_paid_core_ambiguous_registration/i.test(message)) {
    return createError({
      statusCode: 409,
      statusMessage: 'Mehrere Kursanmeldungen sind mit dieser Rechnung verknüpft — automatische Zahlungssynchronisation abgebrochen.',
    })
  }
  if (/mark_invoice_paid_core_invoice_not_found/i.test(message)) {
    return createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })
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

  // Bank import dedupe BEFORE money movement — unique (tenant_id, dedupe_key) prevents doubles.
  if (settlement.source === 'bank_import') {
    const { error: dedupeError } = await supabase
      .from('bank_import_records')
      .insert({
        tenant_id: staffUser.tenant_id,
        dedupe_key: String(camt_dedupe_key).trim(),
        bank_ref: camt_bank_ref || null,
        entry_date: paid_at ? paidAt.substring(0, 10) : null,
        amount_rappen: totals.newPaymentRappen,
        reference: camt_reference || null,
        debtor_name: camt_debtor_name || null,
        invoice_id,
        imported_by: staffUser.id,
        source: import_source === 'csv' ? 'csv' : 'camt',
      })
    if (dedupeError) {
      if (dedupeError.code === '23505') {
        throw createError({
          statusCode: 409,
          statusMessage: 'Diese Bank-Transaktion wurde bereits importiert und verbucht.',
        })
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Bankimport-Deduplizierung fehlgeschlagen',
      })
    }
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

  const rpcArgs = {
    p_tenant_id: staffUser.tenant_id,
    p_invoice_id: invoice_id,
    p_actor_user_id: staffUser.id,
    p_expected_paid_amount_rappen: invoice.paid_amount_rappen || 0,
    p_new_payment_rappen: totals.newPaymentRappen,
    p_clamped_total_rappen: totals.clampedTotalRappen,
    p_is_partial: totals.isPartial,
    p_paid_at: paidAt,
    p_payment_method: methodLabel,
    p_notes: settlementNote,
    p_internal_notes: noteText,
    p_settlement_source: settlement.source,
    p_sync_registration_id: syncPlan.action === 'sync' ? syncPlan.registrationId : null,
    p_sync_amount_paid_rappen: syncPlan.action === 'sync' ? syncPlan.amountPaidRappen : null,
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc('mark_invoice_paid_core', rpcArgs)

  if (rpcError) {
    const mapped = httpErrorFromMark(rpcError)
    if (mapped) throw mapped

    // Fallback when migration is not yet applied: optimistic sequential writes.
    // Prefer the RPC in production once migrated.
    if (!/function .*mark_invoice_paid_core.* does not exist/i.test(rpcError.message || '')
      && rpcError.code !== 'PGRST202'
      && !/Could not find the function/i.test(rpcError.message || '')) {
      throw createError({ statusCode: 500, statusMessage: rpcError.message || 'Zahlung konnte nicht verbucht werden' })
    }

    const isPartial = totals.isPartial
    const paymentStatus = isPartial ? 'partial' : 'paid'
    const invoiceStatus = isPartial ? 'sent' : 'paid'

    const { data: updatedRows, error: invoiceUpdateError } = await supabase
      .from('invoices')
      .update({
        payment_status: paymentStatus,
        status: invoiceStatus,
        paid_at: paidAt,
        paid_amount_rappen: totals.clampedTotalRappen,
        ...(noteText ? { internal_notes: noteText } : {}),
        ...(!isPartial ? { dunning_level: 0, dunning_paused: false } : {}),
        updated_at: now,
      })
      .eq('id', invoice_id)
      .eq('tenant_id', invoice.tenant_id)
      .eq('paid_amount_rappen', invoice.paid_amount_rappen || 0)
      .select('id')

    if (invoiceUpdateError) {
      throw createError({ statusCode: 500, statusMessage: invoiceUpdateError.message })
    }
    if (!updatedRows || updatedRows.length === 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Rechnung wurde zwischenzeitlich geändert — bitte erneut laden',
      })
    }

    const { error: payInsertError } = await supabase
      .from('invoice_payments')
      .insert({
        invoice_id,
        tenant_id: staffUser.tenant_id,
        amount_rappen: totals.newPaymentRappen,
        payment_date: paidAt,
        payment_method: methodLabel,
        notes: settlementNote,
        status: 'completed',
        currency: 'CHF',
      })

    if (payInsertError) {
      throw createError({ statusCode: 500, statusMessage: payInsertError.message })
    }

    if (syncPlan.action === 'sync') {
      const { data: synced, error: syncError } = await supabase
        .from('course_registrations')
        .update({
          payment_status: 'paid',
          amount_paid_rappen: syncPlan.amountPaidRappen,
          updated_at: now,
        })
        .eq('id', syncPlan.registrationId)
        .eq('tenant_id', staffUser.tenant_id)
        .eq('invoice_id', invoice_id)
        .select('id')

      if (syncError) {
        throw createError({ statusCode: 500, statusMessage: 'Kursanmeldung konnte nicht synchronisiert werden' })
      }
      if (!synced || synced.length !== 1) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Kursanmeldung-Zuordnung inkonsistent — Vorgang abgebrochen',
        })
      }
    }
  }

  // Linked payments table rows: complete only on full invoice settlement.
  if (!totals.isPartial) {
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
  if (!totals.isPartial && invoice.user_id) {
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

  const courseRegistrationId = syncPlan.action === 'sync' ? syncPlan.registrationId : null

  await logAudit({
    user_id: staffUser.id,
    auth_user_id: authUser.id,
    action: 'mark_invoice_paid',
    resource_type: 'invoice',
    resource_id: invoice_id,
    status: 'success',
    tenant_id: staffUser.tenant_id,
    ip_address: ipAddress,
    details: buildMarkInvoicePaidAuditDetails({
      settlementSource: settlement.source,
      technicallyVerified: settlement.technicallyVerified,
      paymentMethod: methodLabel,
      newPaymentRappen: totals.newPaymentRappen,
      clampedTotalRappen: totals.clampedTotalRappen,
      isPartial: totals.isPartial,
      courseRegistrationId,
      importSource: import_source || null,
    }),
  }, event)

  return {
    success: true,
    invoice_id,
    paid_amount_rappen: totals.clampedTotalRappen,
    is_partial: totals.isPartial,
    credit_applied_rappen: creditAppliedRappen,
    settlement_source: settlement.source,
    technically_verified: settlement.technicallyVerified,
    course_registration_id: courseRegistrationId,
    // Explicit product signal for UI
    payment_confirmation_kind:
      settlement.source === 'bank_import' ? 'technically_verified' : 'manual_attestation',
  }
})
