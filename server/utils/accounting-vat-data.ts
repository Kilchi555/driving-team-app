import type { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import type { VatQuarterInput } from '~/server/utils/accounting-vat'

type Admin = ReturnType<typeof getSupabaseAdmin>

export type VatTenantMeta = {
  name: string
  uid_number: string | null
  mwst_obligated: boolean
  default_vat_rate: number
}

async function fetchYearEntries(supabase: Admin, tenantId: string, dateFrom: string, dateTo: string) {
  const rows: Array<{
    id: string
    type: string
    entry_date: string
    amount_rappen: number
    vat_rate: number | null
    vat_amount_rappen: number | null
    linked_payment_id: string | null
    receipt_url: string | null
    storno_of_id: string | null
    document_kind: string | null
    category: { name?: string } | null
  }> = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('accounting_entries')
      .select('id, type, entry_date, amount_rappen, vat_rate, vat_amount_rappen, linked_payment_id, receipt_url, storno_of_id, document_kind, category:accounting_categories(name)')
      .eq('tenant_id', tenantId)
      .eq('approval_status', 'approved')
      .is('deleted_at', null)
      .gte('entry_date', dateFrom)
      .lte('entry_date', dateTo)
      .order('entry_date')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    const chunk = data ?? []
    rows.push(...chunk)
    if (chunk.length < PAGE) break
    from += PAGE
  }
  return rows
}

export async function loadVatYearInput(
  supabase: Admin,
  tenantId: string,
  year: number,
): Promise<{ tenant: VatTenantMeta; input: VatQuarterInput }> {
  const dateFrom = `${year}-01-01`
  const dateTo = `${year}-12-31`

  const [{ data: tenant, error: tenantError }, { data: invoices, error: invError }] = await Promise.all([
    supabase
      .from('tenants')
      .select('name, uid_number, mwst_obligated, default_vat_rate')
      .eq('id', tenantId)
      .single(),
    supabase
      .from('invoices')
      .select('invoice_date, status, vat_rate, vat_amount_rappen, subtotal_rappen, total_amount_rappen')
      .eq('tenant_id', tenantId)
      .neq('document_kind', 'quote')
      .gte('invoice_date', dateFrom)
      .lte('invoice_date', dateTo),
  ])
  if (tenantError) throw new Error(tenantError.message)
  if (invError) throw new Error(invError.message)

  const entries = await fetchYearEntries(supabase, tenantId, dateFrom, dateTo)
  const reversedIds = new Set(entries.filter(e => e.storno_of_id).map(e => e.storno_of_id as string))

  const paymentIds = [...new Set(entries.map(e => e.linked_payment_id).filter(Boolean))] as string[]
  const invoiceByPayment = new Map<string, boolean>()
  for (let i = 0; i < paymentIds.length; i += 200) {
    const chunk = paymentIds.slice(i, i + 200)
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('id, invoice_id')
      .in('id', chunk)
    if (payError) throw new Error(payError.message)
    for (const p of payments ?? []) {
      invoiceByPayment.set(p.id, !!p.invoice_id)
    }
  }

  const defaultVatRate = Number(tenant?.default_vat_rate)
  const input: VatQuarterInput = {
    defaultVatRate: Number.isFinite(defaultVatRate) && defaultVatRate >= 0 ? defaultVatRate : 0,
    invoices: invoices ?? [],
    incomeEntries: entries.filter(e => e.type === 'income' && e.document_kind !== 'contract').map(e => ({
      entry_date: e.entry_date,
      amount_rappen: e.amount_rappen,
      vat_rate: e.vat_rate,
      vat_amount_rappen: e.vat_amount_rappen,
      linked_payment_id: e.linked_payment_id,
      payment_has_invoice: e.linked_payment_id ? (invoiceByPayment.get(e.linked_payment_id) ?? false) : false,
      storno_of_id: e.storno_of_id,
      is_reversed: reversedIds.has(e.id),
    })),
    expenseEntries: entries.filter(e => e.type === 'expense' && e.document_kind !== 'contract').map(e => ({
      entry_date: e.entry_date,
      amount_rappen: e.amount_rappen,
      vat_rate: e.vat_rate,
      vat_amount_rappen: e.vat_amount_rappen,
      receipt_url: e.receipt_url,
      category_name: e.category?.name ?? null,
      storno_of_id: e.storno_of_id,
      is_reversed: reversedIds.has(e.id),
    })),
  }

  return {
    tenant: {
      name: tenant?.name ?? '',
      uid_number: tenant?.uid_number ?? null,
      mwst_obligated: tenant?.mwst_obligated === true,
      default_vat_rate: input.defaultVatRate,
    },
    input,
  }
}
