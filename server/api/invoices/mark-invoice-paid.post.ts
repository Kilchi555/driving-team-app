// server/api/invoices/mark-invoice-paid.post.ts
// Markiert eine Rechnung als bezahlt — NUR für Admins.
// Die Header-, Journal- und offenen Payment-Zeilen schreibt
// settle_marked_invoice_payment in einer Transaktion. Wallet-Guthaben bleibt
// danach und ist weiterhin nicht fatal, wenn es fehlschlägt.

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { applyInvoiceCreditOnPaid } from '~/server/utils/invoice-credit'
import { settlementFailure } from '~/server/utils/payment-settlement'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: staffUser } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!staffUser || !['admin', 'tenant_admin'].includes(staffUser.role) || !UUID_RE.test(String(staffUser.tenant_id || ''))) {
    throw createError({ statusCode: 403, statusMessage: 'Nur Admins dürfen Rechnungen als bezahlt markieren' })
  }

  const {
    invoice_id, paid_at, paid_amount_rappen, note, payment_method,
    camt_dedupe_key, camt_bank_ref, camt_reference, camt_debtor_name, import_source,
  } = await readBody(event)
  if (!invoice_id) throw createError({ statusCode: 400, statusMessage: 'invoice_id required' })

  const now = new Date().toISOString()
  const paidAt = paid_at || now

  // Rechnung laden (tenant-scoped) inkl. bereits bezahltem Betrag
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, user_id, tenant_id, total_amount_rappen, paid_amount_rappen, payment_status')
    .eq('id', invoice_id)
    .eq('tenant_id', staffUser.tenant_id)
    .single()

  if (!invoice) throw createError({ statusCode: 404, statusMessage: 'Rechnung nicht gefunden' })

  // Header, bank dedupe, journal, and open payment rows commit together.
  const { data: settled, error: settleError } = await supabase.rpc('settle_marked_invoice_payment', {
    p_actor_user_id: staffUser.id,
    p_invoice_id: invoice_id,
    p_paid_amount_rappen: paid_amount_rappen ?? null,
    p_paid_at: paidAt,
    p_note: note ?? null,
    p_payment_method: payment_method ?? null,
    p_camt_dedupe_key: camt_dedupe_key ?? null,
    p_camt_bank_ref: camt_bank_ref ?? null,
    p_camt_entry_date: paid_at ? paidAt.substring(0, 10) : null,
    p_camt_reference: camt_reference ?? null,
    p_camt_debtor_name: camt_debtor_name ?? null,
    p_import_source: import_source ?? null,
  })

  const failure = settlementFailure(settleError, settled, 'Rechnung nicht gefunden')
  if (failure) throw createError(failure)

  const settledRow = settled as { paid_amount_rappen: number; is_partial: boolean }
  const isPartial = settledRow.is_partial === true
  const clampedTotal = settledRow.paid_amount_rappen

  let creditAppliedRappen = 0
  if (!isPartial && invoice.user_id) {
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

  return {
    success: true,
    invoice_id,
    paid_amount_rappen: clampedTotal,
    is_partial: isPartial,
    credit_applied_rappen: creditAppliedRappen,
  }
})
