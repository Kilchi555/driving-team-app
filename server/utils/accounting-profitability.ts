import { computeSimpleBookIncome, isAccountingPlEntry, LOHN_CATEGORY_NAME } from '~/server/utils/accounting'

export type ProfitEntry = {
  type: string
  amount_rappen: number
  entry_date?: string | null
  category_id?: string | null
  category_name?: string | null
  linked_payment_id?: string | null
  document_kind?: string | null
  external_reference?: string | null
}

export function closedMonthCount(year: number, todayYear: number, todayMonth: number): number {
  if (year < todayYear) return 12
  if (year > todayYear) return 0
  return Math.min(12, Math.max(0, todayMonth))
}

export function categoryNameOf(entry: ProfitEntry & { category?: { name?: string | null } | Array<{ name?: string | null }> | null }): string {
  const raw = entry.category
  if (Array.isArray(raw)) return String(raw[0]?.name || '').trim()
  if (raw?.name) return String(raw.name).trim()
  return String(entry.category_name || '').trim()
}

export function isLohnExpense(entry: ProfitEntry & { category?: { name?: string | null } | Array<{ name?: string | null }> | null }): boolean {
  return entry.type === 'expense' && categoryNameOf(entry) === LOHN_CATEGORY_NAME && isAccountingPlEntry(entry)
}

export function buildProfitabilityReport(input: {
  year: number
  todayYear: number
  todayMonth: number
  paymentsIncomeByMonth: number[]
  entries: Array<ProfitEntry & { category?: { name?: string | null } | Array<{ name?: string | null }> | null }>
}) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const closed = closedMonthCount(input.year, input.todayYear, input.todayMonth)

  const monthly = months.map((month) => {
    const mStr = String(month).padStart(2, '0')
    const monthEntries = input.entries.filter(e => (e.entry_date || '').startsWith(`${input.year}-${mStr}`))
    const income = computeSimpleBookIncome({
      paymentsIncomeRappen: input.paymentsIncomeByMonth[month - 1] || 0,
      entries: monthEntries,
    }).totalIncomeRappen
    const pl = monthEntries.filter(isAccountingPlEntry)
    const expenses = pl.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount_rappen || 0), 0)
    const payroll = pl.filter(isLohnExpense).reduce((s, e) => s + (e.amount_rappen || 0), 0)
    return {
      month,
      label: new Date(input.year, month - 1, 1).toLocaleDateString('de-CH', { month: 'short' }),
      revenue_rappen: income,
      expenses_rappen: expenses - payroll,
      payroll_rappen: payroll,
      result_rappen: income - expenses,
    }
  })

  const yearIncome = computeSimpleBookIncome({
    paymentsIncomeRappen: input.paymentsIncomeByMonth.reduce((s, n) => s + (n || 0), 0),
    entries: input.entries,
  })
  const plYear = input.entries.filter(isAccountingPlEntry)
  const totalExpenseRappen = plYear.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount_rappen || 0), 0)
  const payrollTotalRappen = plYear.filter(isLohnExpense).reduce((s, e) => s + (e.amount_rappen || 0), 0)
  const resultRappen = yearIncome.totalIncomeRappen - totalExpenseRappen

  const closedMonths = monthly.slice(0, closed)
  const avgMonthlyRevenue = closed
    ? Math.round(closedMonths.reduce((s, m) => s + m.revenue_rappen, 0) / closed)
    : 0
  const avgMonthlyExpense = closed
    ? Math.round(closedMonths.reduce((s, m) => s + m.expenses_rappen + m.payroll_rappen, 0) / closed)
    : 0

  return {
    year: input.year,
    closed_months: closed,
    monthly,
    summary: {
      total_revenue_rappen: yearIncome.totalIncomeRappen,
      payments_income_rappen: yearIncome.paymentsIncomeRappen,
      manual_income_rappen: yearIncome.manualIncomeRappen,
      total_expense_rappen: totalExpenseRappen,
      manual_expense_rappen: totalExpenseRappen - payrollTotalRappen,
      payroll_total_rappen: payrollTotalRappen,
      result_rappen: resultRappen,
      payroll_share_pct: totalExpenseRappen > 0 ? Math.round((payrollTotalRappen / totalExpenseRappen) * 100) : 0,
      break_even_monthly_rappen: avgMonthlyExpense,
      avg_monthly_revenue_rappen: avgMonthlyRevenue,
      coverage_ratio: avgMonthlyExpense > 0 ? avgMonthlyRevenue / avgMonthlyExpense : 1,
      profitable: resultRappen > 0,
    },
  }
}
