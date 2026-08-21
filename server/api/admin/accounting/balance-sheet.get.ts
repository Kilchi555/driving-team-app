import { defineEventHandler, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { computeNetAssets, invoiceOutstandingRappen } from '~/server/utils/accounting'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const supabase = getSupabaseAdmin()

  const [{ data: cashRows }, { data: tenant }, { data: invoices }, { data: payables }] = await Promise.all([
    supabase
      .from('cash_balances')
      .select('current_balance_rappen, register_type, office_cash_register_id, instructor_id')
      .eq('tenant_id', profile.tenant_id),
    supabase
      .from('tenants')
      .select('bank_balance_rappen, accounting_export_completed_at')
      .eq('id', profile.tenant_id)
      .single(),
    supabase
      .from('invoices')
      .select('total_amount_rappen, paid_amount_rappen, payment_status, status, document_kind')
      .eq('tenant_id', profile.tenant_id),
    supabase
      .from('accounting_entries')
      .select('amount_rappen')
      .eq('tenant_id', profile.tenant_id)
      .eq('type', 'expense')
      .eq('approval_status', 'approved')
      .eq('is_paid', false)
      .is('deleted_at', null)
      .is('storno_of_id', null),
  ])

  const officeCashRappen = (cashRows ?? [])
    .filter(r => r.office_cash_register_id || r.register_type === 'office')
    .reduce((s, r) => s + (r.current_balance_rappen ?? 0), 0)
  const staffCashRappen = (cashRows ?? [])
    .filter(r => r.instructor_id && r.register_type !== 'office' && !r.office_cash_register_id)
    .reduce((s, r) => s + (r.current_balance_rappen ?? 0), 0)
  const cashRappen = (cashRows ?? []).reduce((s, r) => s + (r.current_balance_rappen ?? 0), 0)

  const receivablesRappen = (invoices ?? []).reduce((s, inv) => s + invoiceOutstandingRappen(inv), 0)
  const payablesRappen = (payables ?? []).reduce((s, e) => s + (e.amount_rappen ?? 0), 0)
  const bankRappen = tenant?.bank_balance_rappen ?? 0

  return {
    success: true,
    as_of: new Date().toISOString().slice(0, 10),
    cash_rappen: cashRappen,
    office_cash_rappen: officeCashRappen,
    staff_cash_rappen: staffCashRappen,
    bank_rappen: bankRappen,
    receivables_rappen: receivablesRappen,
    payables_rappen: payablesRappen,
    net_assets_rappen: computeNetAssets({
      cashRappen,
      bankRappen,
      receivablesRappen,
      payablesRappen,
    }),
    accounting_export_completed_at: tenant?.accounting_export_completed_at ?? null,
  }
})
