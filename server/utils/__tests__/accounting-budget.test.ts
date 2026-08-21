import { describe, expect, it } from 'vitest'
import {
  aggregateActualsByCategory,
  aggregateRecurringAnnualByCategory,
  annualizeRecurringRappen,
  budgetDeltaRappen,
  buildBudgetLines,
  suggestedBudgetRappen,
} from '../accounting-budget'

describe('accounting budget helpers', () => {
  it('annualizes recurring intervals', () => {
    expect(annualizeRecurringRappen(1000, 'monthly')).toBe(12_000)
    expect(annualizeRecurringRappen(1000, 'quarterly')).toBe(4_000)
    expect(annualizeRecurringRappen(1000, 'yearly')).toBe(1000)
  })

  it('prefers last year actuals over recurring when seeding', () => {
    expect(suggestedBudgetRappen(50_000, 12_000)).toBe(50_000)
    expect(suggestedBudgetRappen(0, 12_000)).toBe(12_000)
  })

  it('aggregates books without double-counting payments or contracts', () => {
    const actuals = aggregateActualsByCategory([
      { type: 'income', amount_rappen: 50_000, category_id: 'termine', linked_payment_id: 'p1' },
      { type: 'income', amount_rappen: 3_000, category_id: 'sonst' },
      { type: 'expense', amount_rappen: 8_000, category_id: 'miete' },
      { type: 'expense', amount_rappen: 1_000, category_id: 'vertrag', document_kind: 'contract' },
    ], 50_000)
    expect(actuals.get('income:_')).toBe(50_000)
    expect(actuals.get('income:sonst')).toBe(3_000)
    expect(actuals.get('expense:miete')).toBe(8_000)
    expect(actuals.get('expense:vertrag')).toBeUndefined()
  })

  it('sums recurring templates to a yearly suggestion', () => {
    const map = aggregateRecurringAnnualByCategory([
      { type: 'expense', amount_rappen: 2000, interval: 'monthly', category_id: 'miete', is_active: true },
      { type: 'expense', amount_rappen: 6000, interval: 'yearly', category_id: 'miete', is_active: true },
      { type: 'expense', amount_rappen: 999, interval: 'monthly', category_id: 'miete', is_active: false },
    ])
    expect(map.get('expense:miete')).toBe(30_000)
  })

  it('computes actual minus budget', () => {
    expect(budgetDeltaRappen(80, 100)).toBe(-20)
  })

  it('fills empty budgets from last year or recurring', () => {
    const lines = buildBudgetLines({
      categories: [{ id: 'miete', name: 'Miete & Raumkosten', type: 'expense', color: '#f59e0b' }],
      saved: new Map(),
      actuals: new Map([['expense:miete', 4_000]]),
      recurringAnnual: new Map([['expense:miete', 24_000]]),
      lastYearActuals: new Map([['expense:miete', 20_000]]),
    })
    expect(lines[0].budget_rappen).toBe(20_000)
    expect(lines[0].actual_rappen).toBe(4_000)
    expect(lines[0].delta_rappen).toBe(-16_000)
  })
})
