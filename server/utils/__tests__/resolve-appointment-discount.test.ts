import { describe, expect, it } from 'vitest'
import {
  computeAppointmentDiscountRappen,
  netAfterAppointmentDiscount,
} from '../resolve-appointment-discount'

describe('computeAppointmentDiscountRappen', () => {
  it('applies a percentage to the lesson price', () => {
    expect(computeAppointmentDiscountRappen({
      kind: 'percentage',
      value: 30,
      lessonAmountRappen: 11000,
    })).toBe(3300)
  })

  it('uses rappen for voucher_codes / gift cards', () => {
    expect(computeAppointmentDiscountRappen({
      kind: 'fixed_rappen',
      value: 10000,
      lessonAmountRappen: 11000,
    })).toBe(10000)
  })

  it('converts discounts.discount_value from CHF', () => {
    expect(computeAppointmentDiscountRappen({
      kind: 'fixed_chf',
      value: 100,
      lessonAmountRappen: 11000,
    })).toBe(10000)
  })

  it('covers the full lesson for free_lesson', () => {
    expect(computeAppointmentDiscountRappen({
      kind: 'free_lesson',
      value: 0,
      lessonAmountRappen: 11000,
    })).toBe(11000)
  })
})

describe('netAfterAppointmentDiscount', () => {
  it('subtracts a 100 CHF voucher from lesson + admin fee', () => {
    expect(netAfterAppointmentDiscount(12665, 10000)).toBe(2665)
  })

  it('never goes negative when the voucher is larger than the bill', () => {
    expect(netAfterAppointmentDiscount(8000, 10000)).toBe(0)
  })
})
