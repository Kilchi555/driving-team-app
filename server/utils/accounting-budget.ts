import { isAccountingPlEntry } from '~/server/utils/accounting'
import type { RecurringInterval } from '~/server/utils/accounting-recurring'

export type BudgetKind = 'income' | 'expense'

export function annualizeRecurringRappen(amountRappen: number, interval: RecurringInterval): number {
  const amount = Math.max(0, Math.round(amountRappen || 0))
  if (interval === 'monthly') return amount * 12
  if (interval === 'quarterly') return amount * 4
  return amount
}

export function suggestedBudgetRappen(lastYearActualRappen: number, recurringAnnualRappen: number): number {
  const last = Math.max(0, Math.round(lastYearActualRappen || 0))
  const recurring = Math.max(0, Math.round(recurringAnnualRappen || 0))
  return last > 0 ? last : recurring
}

export function budgetDeltaRappen(actualRappen: number, budgetRappen: number): number {
  return Math.round(actualRappen || 0) - Math.round(budgetRappen || 0)
}

export function budgetLineKey(type: BudgetKind, categoryId?: string | null): string {
  return `${type}:${categoryId || '_'}`
}

export function aggregateActualsByCategory(
  entries: Array<{
    type: string
    amount_rappen: number
    category_id?: string | null
    linked_payment_id?: string | null
    document_kind?: string | null
    external_reference?: string | null
  }>,
  paymentsIncomeRappen: number,
): Map<string, number> {
  const map = new Map<string, number>()
  if (paymentsIncomeRappen > 0) {
    map.set(budgetLineKey('income', null), paymentsIncomeRappen)
  }
  for (const entry of entries) {
    if (!isAccountingPlEntry(entry)) continue
    if (entry.type === 'income' && entry.linked_payment_id) continue
    if (entry.type !== 'income' && entry.type !== 'expense') continue
    const key = budgetLineKey(entry.type, entry.category_id)
    map.set(key, (map.get(key) || 0) + (entry.amount_rappen || 0))
  }
  return map
}

export type BudgetCategory = {
  id: string
  name: string
  type: string
  color?: string | null
}

export type BudgetLineView = {
  key: string
  type: BudgetKind
  category_id: string | null
  name: string
  color: string | null
  budget_rappen: number
  suggested_rappen: number
  actual_rappen: number
  delta_rappen: number
}

export function buildBudgetLines(input: {
  categories: BudgetCategory[]
  saved: Map<string, number>
  actuals: Map<string, number>
  recurringAnnual: Map<string, number>
  lastYearActuals: Map<string, number>
}): BudgetLineView[] {
  const keys = new Set<string>([
    ...input.categories.map(c => budgetLineKey(c.type === 'income' ? 'income' : 'expense', c.id)),
    ...input.saved.keys(),
    ...input.actuals.keys(),
    ...input.recurringAnnual.keys(),
    ...input.lastYearActuals.keys(),
  ])

  const catByKey = new Map<string, BudgetCategory>()
  for (const category of input.categories) {
    catByKey.set(budgetLineKey(category.type === 'income' ? 'income' : 'expense', category.id), category)
  }

  const lines: BudgetLineView[] = []
  for (const key of keys) {
    const [typeRaw, categoryRaw] = key.split(':')
    const type: BudgetKind = typeRaw === 'income' ? 'income' : 'expense'
    const categoryId = !categoryRaw || categoryRaw === '_' ? null : categoryRaw
    const category = catByKey.get(key)
    const suggested = suggestedBudgetRappen(input.lastYearActuals.get(key) || 0, input.recurringAnnual.get(key) || 0)
    const saved = input.saved.get(key)
    const budget = saved != null ? saved : suggested
    const actual = input.actuals.get(key) || 0
    if (!category && budget <= 0 && actual <= 0 && suggested <= 0) continue
    lines.push({
      key,
      type,
      category_id: categoryId,
      name: category?.name
        || (type === 'income' && !categoryId ? 'Kundenzahlungen' : 'Ohne Kategorie'),
      color: category?.color || null,
      budget_rappen: budget,
      suggested_rappen: suggested,
      actual_rappen: actual,
      delta_rappen: budgetDeltaRappen(actual, budget),
    })
  }

  const rank = (line: BudgetLineView) => (line.type === 'income' ? 0 : 1)
  return lines.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'de'))
}

export function aggregateRecurringAnnualByCategory(
  rows: Array<{
    type: string
    amount_rappen: number
    interval: RecurringInterval
    category_id?: string | null
    is_active?: boolean | null
    document_kind?: string | null
  }>,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    if (row.is_active === false) continue
    if (row.type !== 'income' && row.type !== 'expense') continue
    if (row.document_kind === 'contract') continue
    const key = budgetLineKey(row.type, row.category_id)
    map.set(key, (map.get(key) || 0) + annualizeRecurringRappen(row.amount_rappen, row.interval))
  }
  return map
}
