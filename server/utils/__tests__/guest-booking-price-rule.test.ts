import { describe, expect, it } from 'vitest'
import {
  guestBookingPriceRuleType,
  invalidDrivingLessonBasePriceReason,
} from '../guest-booking-price-rule'

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

describe('invalidDrivingLessonBasePriceReason', () => {
  it('allows consultation / theory at CHF 0', () => {
    expect(invalidDrivingLessonBasePriceReason({
      ruleType: 'consultation',
      hasPricingRule: true,
      pricePerMinuteRappen: 0,
    })).toBeNull()
    expect(invalidDrivingLessonBasePriceReason({
      ruleType: 'theory',
      hasPricingRule: false,
      pricePerMinuteRappen: 0,
    })).toBeNull()
  })

  it('allows intentional free public events', () => {
    expect(invalidDrivingLessonBasePriceReason({
      ruleType: 'base_price',
      hasPricingRule: false,
      allowFreePublicEvent: true,
    })).toBeNull()
  })

  it('rejects missing or zero base_price rules for Fahrstunden', () => {
    expect(invalidDrivingLessonBasePriceReason({
      ruleType: 'base_price',
      hasPricingRule: false,
    })).toBe('missing_base_price_rule')
    expect(invalidDrivingLessonBasePriceReason({
      ruleType: 'base_price',
      hasPricingRule: true,
      pricePerMinuteRappen: 0,
    })).toBe('zero_base_price_rule')
  })

  it('allows a real base_price rule (net may still become 0 via discount/credit later)', () => {
    expect(invalidDrivingLessonBasePriceReason({
      ruleType: 'base_price',
      hasPricingRule: true,
      pricePerMinuteRappen: 211.1111,
    })).toBeNull()
  })
})
