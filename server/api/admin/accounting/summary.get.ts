import { defineEventHandler, getQuery, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()
  const query = getQuery(event)

  const year = query.year ? parseInt(query.year as string) : new Date().getFullYear()
  const dateFrom = `${year}-01-01`
  const dateTo = `${year}-12-31`

  // 1. Einnahmen aus bestehenden Zahlungen (completed payments)
  const { data: paymentsData, error: paymentsError } = await supabase
    .from('payments')
    .select('total_amount_rappen, created_at')
    .eq('tenant_id', profile.tenant_id)
    .eq('status', 'completed')
    .gte('created_at', `${dateFrom}T00:00:00Z`)
    .lte('created_at', `${dateTo}T23:59:59Z`)

  if (paymentsError) throw createError({ statusCode: 500, statusMessage: paymentsError.message })

  // 2. Manuelle Buchungen (Ausgaben + manuelle Einnahmen)
  const { data: entriesData, error: entriesError } = await supabase
    .from('accounting_entries')
    .select('type, amount_rappen, vat_amount_rappen, entry_date, category_id')
    .eq('tenant_id', profile.tenant_id)
    .is('deleted_at', null)
    .gte('entry_date', dateFrom)
    .lte('entry_date', dateTo)

  if (entriesError) throw createError({ statusCode: 500, statusMessage: entriesError.message })

  // Aggregieren: Einnahmen
  const paymentsIncomeRappen = (paymentsData ?? []).reduce((sum, p) => sum + (p.total_amount_rappen ?? 0), 0)
  const manualIncomeRappen = (entriesData ?? [])
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + e.amount_rappen, 0)
  const totalIncomeRappen = paymentsIncomeRappen + manualIncomeRappen

  // Aggregieren: Ausgaben
  const totalExpenseRappen = (entriesData ?? [])
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount_rappen, 0)

  // MWST
  const totalVatRappen = (entriesData ?? [])
    .reduce((sum, e) => sum + (e.vat_amount_rappen ?? 0), 0)

  // Ergebnis
  const resultRappen = totalIncomeRappen - totalExpenseRappen

  // Monatliche Aufschlüsselung (12 Monate)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const mStr = String(m).padStart(2, '0')

    const monthIncomePayments = (paymentsData ?? [])
      .filter(p => {
        const d = new Date(p.created_at)
        return d.getFullYear() === year && d.getMonth() + 1 === m
      })
      .reduce((sum, p) => sum + (p.total_amount_rappen ?? 0), 0)

    const monthIncomeManual = (entriesData ?? [])
      .filter(e => e.type === 'income' && e.entry_date?.startsWith(`${year}-${mStr}`))
      .reduce((sum, e) => sum + e.amount_rappen, 0)

    const monthExpense = (entriesData ?? [])
      .filter(e => e.type === 'expense' && e.entry_date?.startsWith(`${year}-${mStr}`))
      .reduce((sum, e) => sum + e.amount_rappen, 0)

    return {
      month: m,
      label: new Date(year, i, 1).toLocaleDateString('de-CH', { month: 'short' }),
      income_rappen: monthIncomePayments + monthIncomeManual,
      expense_rappen: monthExpense,
      result_rappen: (monthIncomePayments + monthIncomeManual) - monthExpense,
    }
  })

  // Ausgaben nach Kategorie
  const expensesByCategory: Record<string, { name: string; amount_rappen: number }> = {}
  for (const e of (entriesData ?? []).filter(e => e.type === 'expense')) {
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
      total_income_rappen: totalIncomeRappen,
      payments_income_rappen: paymentsIncomeRappen,
      manual_income_rappen: manualIncomeRappen,
      total_expense_rappen: totalExpenseRappen,
      total_vat_rappen: totalVatRappen,
      result_rappen: resultRappen,
    },
    monthly: monthlyData,
    expenses_by_category: Object.values(expensesByCategory).sort((a, b) => b.amount_rappen - a.amount_rappen),
  }
})
