import { describe, expect, it } from 'vitest'
import { buildProfitabilityReport, closedMonthCount } from '../accounting-profitability'

describe('closedMonthCount', () => {
  it('uses finished years in full and the current year only up to today', () => {
    expect(closedMonthCount(2025, 2026, 8)).toBe(12)
    expect(closedMonthCount(2026, 2026, 8)).toBe(8)
    expect(closedMonthCount(2027, 2026, 8)).toBe(0)
  })
})

describe('buildProfitabilityReport', () => {
  it('does not add payroll runs on top of Lohnaufwand and ignores linked payment income', () => {
    const report = buildProfitabilityReport({
      year: 2026,
      todayYear: 2026,
      todayMonth: 8,
      paymentsIncomeByMonth: [50_000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      entries: [
        { type: 'income', amount_rappen: 50_000, entry_date: '2026-01-10', linked_payment_id: 'p1' },
        { type: 'income', amount_rappen: 8_000, entry_date: '2026-02-01', linked_payment_id: null },
        { type: 'expense', amount_rappen: 20_000, entry_date: '2026-01-31', category_name: 'Lohnaufwand' },
        { type: 'expense', amount_rappen: 4_000, entry_date: '2026-01-15', category_name: 'Miete & Raumkosten' },
        { type: 'expense', amount_rappen: 9_000, entry_date: '2026-01-20', document_kind: 'contract' },
      ],
    })

    expect(report.summary.total_revenue_rappen).toBe(58_000)
    expect(report.summary.payroll_total_rappen).toBe(20_000)
    expect(report.summary.manual_expense_rappen).toBe(4_000)
    expect(report.summary.total_expense_rappen).toBe(24_000)
    expect(report.summary.result_rappen).toBe(34_000)
    expect(report.monthly[0].revenue_rappen).toBe(50_000)
    expect(report.monthly[0].payroll_rappen).toBe(20_000)
    expect(report.monthly[1].revenue_rappen).toBe(8_000)
  })

  it('averages break-even over closed months only', () => {
    const report = buildProfitabilityReport({
      year: 2026,
      todayYear: 2026,
      todayMonth: 2,
      paymentsIncomeByMonth: [12_000, 12_000, 99_000, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      entries: [
        { type: 'expense', amount_rappen: 6_000, entry_date: '2026-01-01', category_name: 'Miete & Raumkosten' },
        { type: 'expense', amount_rappen: 6_000, entry_date: '2026-02-01', category_name: 'Miete & Raumkosten' },
        { type: 'expense', amount_rappen: 90_000, entry_date: '2026-03-01', category_name: 'Miete & Raumkosten' },
      ],
    })
    expect(report.closed_months).toBe(2)
    expect(report.summary.avg_monthly_revenue_rappen).toBe(12_000)
    expect(report.summary.break_even_monthly_rappen).toBe(6_000)
    expect(report.summary.coverage_ratio).toBe(2)
  })
})
