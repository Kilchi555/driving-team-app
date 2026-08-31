import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAccountingAccess } from '~/server/utils/accountant-access'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { computeSimpleBookIncome, isAccountingPlEntry } from '~/server/utils/accounting'

export default defineEventHandler(async (event) => {
  const profile = await requireAccountingAccess(event)
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)

  const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()
  const dateFrom = `${year}-01-01`
  const dateTo = `${year}-12-31`

  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_payments_monthly_summary', {
      p_tenant_id: profile.tenant_id,
      p_year: year,
    })

  if (rpcError) throw createError({ statusCode: 500, statusMessage: rpcError.message })

  const paymentsByMonth = new Map<number, number>()
  let paymentsIncomeRappen = 0
  for (const row of (rpcData ?? [])) {
    const rappen = Number(row.total_rappen ?? 0)
    paymentsByMonth.set(row.month, rappen)
    paymentsIncomeRappen += rappen
  }

  const { data: entriesData, error: entriesError } = await supabase
    .from('accounting_entries')
    .select('type, amount_rappen, vat_amount_rappen, entry_date, category_id, linked_payment_id, document_kind, external_reference')
    .eq('tenant_id', profile.tenant_id)
    .eq('approval_status', 'approved')
    .is('deleted_at', null)
    .gte('entry_date', dateFrom)
    .lte('entry_date', dateTo)

  if (entriesError) throw createError({ statusCode: 500, statusMessage: entriesError.message })

  const income = computeSimpleBookIncome({
    paymentsIncomeRappen,
    entries: entriesData ?? [],
  })

  const plEntries = (entriesData ?? []).filter(isAccountingPlEntry)

  const totalExpenseRappen = plEntries
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount_rappen, 0)

  const totalVatRappen = plEntries
    .reduce((sum, e) => sum + (e.vat_amount_rappen ?? 0), 0)

  const resultRappen = income.totalIncomeRappen - totalExpenseRappen

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const mStr = String(m).padStart(2, '0')
    const monthEntries = (entriesData ?? []).filter(e => e.entry_date?.startsWith(`${year}-${mStr}`))
    const monthIncome = computeSimpleBookIncome({
      paymentsIncomeRappen: paymentsByMonth.get(m) ?? 0,
      entries: monthEntries,
    }).totalIncomeRappen
    const monthExpense = monthEntries
      .filter(e => e.type === 'expense' && isAccountingPlEntry(e))
      .reduce((sum, e) => sum + e.amount_rappen, 0)

    return {
      month: m,
      label: new Date(year, i, 1).toLocaleDateString('de-CH', { month: 'short' }),
      income_rappen: monthIncome,
      expense_rappen: monthExpense,
      result_rappen: monthIncome - monthExpense,
    }
  })

  const expensesByCategory: Record<string, { name: string; amount_rappen: number }> = {}
  for (const e of plEntries.filter(e => e.type === 'expense')) {
    const key = e.category_id ?? 'uncategorized'
    if (!expensesByCategory[key]) {
      expensesByCategory[key] = { name: key === 'uncategorized' ? 'Ohne Kategorie' : key, amount_rappen: 0 }
    }
    expensesByCategory[key].amount_rappen += e.amount_rappen
  }

  return {
    success: true,
    year,
    summary: {
      total_income_rappen: income.totalIncomeRappen,
      payments_income_rappen: income.paymentsIncomeRappen,
      manual_income_rappen: income.manualIncomeRappen,
      total_expense_rappen: totalExpenseRappen,
      total_vat_rappen: totalVatRappen,
      result_rappen: resultRappen,
    },
    monthly: monthlyData,
    expenses_by_category: Object.values(expensesByCategory).sort((a, b) => b.amount_rappen - a.amount_rappen),
  }
})
