import { describe, expect, it } from 'vitest'
import {
  CH_VAT_REGISTRATION_THRESHOLD_RAPPEN,
  computeVatQuarter,
  computeVatYear,
  filingVatQuarter,
  formatIsoDate,
  splitGross,
  vatDeadlineDate,
  vatDeadlineStatus,
  vatQuarterRange,
  vatStatusLabel,
} from '../accounting-vat'

const empty = {
  invoices: [],
  incomeEntries: [],
  expenseEntries: [],
  defaultVatRate: 0,
}

describe('MWST quarter helpers', () => {
  it('computes quarter ranges and 60-day ESTV deadlines', () => {
    expect(vatQuarterRange(2026, 1)).toEqual({ from: '2026-01-01', to: '2026-03-31' })
    expect(vatQuarterRange(2026, 2)).toEqual({ from: '2026-04-01', to: '2026-06-30' })
    expect(vatQuarterRange(2026, 4)).toEqual({ from: '2026-10-01', to: '2026-12-31' })
    expect(formatIsoDate(vatDeadlineDate(2026, 1))).toBe('2026-05-30')
    expect(formatIsoDate(vatDeadlineDate(2026, 2))).toBe('2026-08-29')
    expect(formatIsoDate(vatDeadlineDate(2025, 4))).toBe('2026-03-01')
  })

  it('classifies deadline status', () => {
    const deadline = new Date('2026-05-30T23:59:59')
    expect(vatDeadlineStatus(deadline, false, new Date('2026-05-01'))).toBe('not_liable')
    expect(vatDeadlineStatus(deadline, true, new Date('2026-04-01'))).toBe('ok')
    expect(vatDeadlineStatus(deadline, true, new Date('2026-05-10'))).toBe('soon')
    expect(vatDeadlineStatus(deadline, true, new Date('2026-05-28'))).toBe('due')
    expect(vatDeadlineStatus(deadline, true, new Date('2026-06-01'))).toBe('overdue')
    expect(vatStatusLabel('overdue')).toBe('Überfällig')
  })

  it('highlights the previous quarter until its filing deadline', () => {
    expect(filingVatQuarter(new Date('2026-05-18T10:00:00'))).toEqual({ year: 2026, quarter: 1 })
    expect(filingVatQuarter(new Date('2026-06-15T10:00:00'))).toEqual({ year: 2026, quarter: 2 })
    expect(filingVatQuarter(new Date('2026-01-20T10:00:00'))).toEqual({ year: 2025, quarter: 4 })
  })

  it('splits gross amounts at 8.1%', () => {
    expect(splitGross(10_810, 8.1)).toEqual({ net: 10_000, vat: 810 })
    expect(splitGross(5_000, 0)).toEqual({ net: 5_000, vat: 0 })
  })

  it('takes output VAT from invoices and skips cancelled ones', () => {
    const q = computeVatQuarter(2026, 1, {
      ...empty,
      defaultVatRate: 8.1,
      invoices: [
        { invoice_date: '2026-02-10', status: 'sent', vat_rate: 8.1, vat_amount_rappen: 810, subtotal_rappen: 10_000, total_amount_rappen: 10_810 },
        { invoice_date: '2026-02-11', status: 'cancelled', vat_rate: 8.1, vat_amount_rappen: 810, subtotal_rappen: 10_000, total_amount_rappen: 10_810 },
        { invoice_date: '2026-04-01', status: 'sent', vat_rate: 8.1, vat_amount_rappen: 810, subtotal_rappen: 10_000, total_amount_rappen: 10_810 },
      ],
    }, true, new Date('2026-05-01'))
    expect(q.output_vat_rappen).toBe(810)
    expect(q.taxable[0]?.net_rappen).toBe(10_000)
    expect(q.total_turnover_rappen).toBe(10_810)
  })

  it('treats education / 0% invoices as exempt turnover', () => {
    const q = computeVatQuarter(2026, 1, {
      ...empty,
      invoices: [
        { invoice_date: '2026-01-15', status: 'paid', vat_rate: 0, vat_amount_rappen: 0, subtotal_rappen: 20_000, total_amount_rappen: 20_000 },
      ],
    }, false, new Date('2026-02-01'))
    expect(q.exempt_turnover_rappen).toBe(20_000)
    expect(q.output_vat_rappen).toBe(0)
    expect(q.status).toBe('not_liable')
  })

  it('does not double-count payment-linked income that already has an invoice', () => {
    const q = computeVatQuarter(2026, 1, {
      ...empty,
      defaultVatRate: 8.1,
      invoices: [
        { invoice_date: '2026-01-10', status: 'paid', vat_rate: 8.1, vat_amount_rappen: 810, subtotal_rappen: 10_000, total_amount_rappen: 10_810 },
      ],
      incomeEntries: [
        { entry_date: '2026-01-12', amount_rappen: 10_810, linked_payment_id: 'p1', payment_has_invoice: true },
        { entry_date: '2026-01-20', amount_rappen: 5_405, linked_payment_id: 'p2', payment_has_invoice: false },
      ],
    }, true)
    expect(q.output_vat_rappen).toBe(810 + 405)
    expect(q.exempt_turnover_rappen).toBe(0)
  })

  it('allows Vorsteuer only with receipt and not for private use', () => {
    const q = computeVatQuarter(2026, 1, {
      ...empty,
      expenseEntries: [
        { entry_date: '2026-01-05', amount_rappen: 10_810, vat_rate: 8.1, vat_amount_rappen: 810, receipt_url: 'https://beleg' },
        { entry_date: '2026-01-06', amount_rappen: 10_810, vat_rate: 8.1, vat_amount_rappen: 810, receipt_url: null },
        { entry_date: '2026-01-07', amount_rappen: 10_810, vat_rate: 8.1, vat_amount_rappen: 810, receipt_url: 'https://x', category_name: 'Eigenverbrauch / Privat' },
      ],
    }, true)
    expect(q.input_vat_rappen).toBe(810)
    expect(q.input_vat_blocked_rappen).toBe(1_620)
    expect(q.payable_rappen).toBe(-810)
  })

  it('skips storno and reversed bookings', () => {
    const q = computeVatQuarter(2026, 1, {
      ...empty,
      defaultVatRate: 8.1,
      incomeEntries: [
        { entry_date: '2026-01-08', amount_rappen: 10_810, vat_rate: 8.1, is_reversed: true },
        { entry_date: '2026-01-09', amount_rappen: 10_810, vat_rate: 8.1, storno_of_id: 'orig' },
        { entry_date: '2026-01-10', amount_rappen: 5_405, vat_rate: 8.1 },
      ],
    }, true)
    expect(q.output_vat_rappen).toBe(405)
  })

  it('flags the CHF 100k registration threshold on the year total', () => {
    const year = computeVatYear(2026, {
      ...empty,
      invoices: [
        { invoice_date: '2026-02-01', status: 'sent', vat_rate: 0, total_amount_rappen: CH_VAT_REGISTRATION_THRESHOLD_RAPPEN, subtotal_rappen: CH_VAT_REGISTRATION_THRESHOLD_RAPPEN },
      ],
    }, false)
    expect(year.threshold_reached).toBe(true)
    expect(year.year_exempt_rappen).toBe(CH_VAT_REGISTRATION_THRESHOLD_RAPPEN)
    expect(year.quarters).toHaveLength(4)
  })
})
