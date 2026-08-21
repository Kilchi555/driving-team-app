import { describe, expect, it } from 'vitest'
import { addMonthsIso, dueDatesUntil, nextDueDate } from '../accounting-recurring'

describe('accounting recurring dates', () => {
  it('clamps month-end (31 Jan → 28 Feb)', () => {
    expect(addMonthsIso('2026-01-31', 1)).toBe('2026-02-28')
    expect(nextDueDate('2026-01-31', 'monthly')).toBe('2026-02-28')
  })

  it('advances quarterly and yearly', () => {
    expect(nextDueDate('2026-03-15', 'quarterly')).toBe('2026-06-15')
    expect(nextDueDate('2026-03-15', 'yearly')).toBe('2027-03-15')
  })

  it('collects missed dues and returns the next open date', () => {
    const { dates, next } = dueDatesUntil('2026-01-01', 'monthly', '2026-03-18')
    expect(dates).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
    expect(next).toBe('2026-04-01')
  })

  it('stops at ends_on', () => {
    const { dates, next } = dueDatesUntil('2026-01-01', 'monthly', '2026-06-01', '2026-02-01')
    expect(dates).toEqual(['2026-01-01', '2026-02-01'])
    expect(next).toBeNull()
  })
})
