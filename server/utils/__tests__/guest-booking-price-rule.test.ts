import { describe, expect, it } from 'vitest'
import { guestBookingPriceRuleType } from '../guest-booking-price-rule'

describe('guestBookingPriceRuleType', () => {
  it('uses base_price for driving lessons (default)', () => {
    expect(guestBookingPriceRuleType('fahrstunde')).toBe('base_price')
    expect(guestBookingPriceRuleType(undefined)).toBe('base_price')
    expect(guestBookingPriceRuleType(null)).toBe('base_price')
  })

  it('uses theory / consultation when those services are booked', () => {
    expect(guestBookingPriceRuleType('theorie')).toBe('theory')
    expect(guestBookingPriceRuleType('beratung')).toBe('consultation')
  })
})
