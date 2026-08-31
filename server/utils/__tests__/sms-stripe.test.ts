import { describe, expect, it } from 'vitest'
import { isBasilCompatibleRecurringPrice } from '~/server/utils/sms-stripe'

describe('isBasilCompatibleRecurringPrice', () => {
  it('accepts licensed recurring prices', () => {
    expect(isBasilCompatibleRecurringPrice({
      recurring: { usage_type: 'licensed', meter: null },
    })).toBe(true)
  })

  it('accepts metered prices that have a Billing Meter', () => {
    expect(isBasilCompatibleRecurringPrice({
      recurring: { usage_type: 'metered', meter: 'mtr_123' },
    })).toBe(true)
  })

  it('rejects legacy metered prices without a meter (Basil checkout 502)', () => {
    expect(isBasilCompatibleRecurringPrice({
      recurring: { usage_type: 'metered', meter: null },
    })).toBe(false)
    expect(isBasilCompatibleRecurringPrice({
      recurring: { usage_type: 'metered' },
    })).toBe(false)
  })

  it('rejects missing prices', () => {
    expect(isBasilCompatibleRecurringPrice(null)).toBe(false)
    expect(isBasilCompatibleRecurringPrice(undefined)).toBe(false)
  })
})
