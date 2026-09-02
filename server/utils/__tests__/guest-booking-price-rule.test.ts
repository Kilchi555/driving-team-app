import { describe, expect, it } from 'vitest'
import {
  guestBookingPriceRuleType,
  guestSlotCategoryMismatchReason,
  invalidDrivingLessonBasePriceReason,
  invalidPersistedLessonPricingReason,
  normalizeGuestSlotServiceType,
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

describe('normalizeGuestSlotServiceType (adversarial)', () => {
  it('allows missing / fahrstunde (legitimate guest UI omits service_type)', () => {
    expect(normalizeGuestSlotServiceType(undefined)).toEqual({ ok: true, serviceType: 'fahrstunde' })
    expect(normalizeGuestSlotServiceType(null)).toEqual({ ok: true, serviceType: 'fahrstunde' })
    expect(normalizeGuestSlotServiceType('')).toEqual({ ok: true, serviceType: 'fahrstunde' })
    expect(normalizeGuestSlotServiceType('fahrstunde')).toEqual({ ok: true, serviceType: 'fahrstunde' })
  })

  it('rejects beratung spoof that would load CHF-0 consultation while inserting a lesson', () => {
    expect(normalizeGuestSlotServiceType('beratung')).toEqual({
      ok: false,
      reason: 'spoofed_non_lesson_service',
    })
  })

  it('rejects theorie spoof that would steal a driving slot at theory prices', () => {
    expect(normalizeGuestSlotServiceType('theorie')).toEqual({
      ok: false,
      reason: 'spoofed_non_lesson_service',
    })
  })

  it('rejects arbitrary junk service_type values', () => {
    expect(normalizeGuestSlotServiceType('admin_fee')).toEqual({
      ok: false,
      reason: 'spoofed_non_lesson_service',
    })
    expect(normalizeGuestSlotServiceType('free')).toEqual({
      ok: false,
      reason: 'spoofed_non_lesson_service',
    })
  })
})

describe('guestSlotCategoryMismatchReason (adversarial)', () => {
  it('allows matching categories', () => {
    expect(guestSlotCategoryMismatchReason({
      slotCategoryCode: 'B Automatik',
      bodyCategoryCode: 'B Automatik',
    })).toBeNull()
  })

  it('rejects cheap-category swap against a reserved expensive slot', () => {
    expect(guestSlotCategoryMismatchReason({
      slotCategoryCode: 'B Automatik',
      bodyCategoryCode: 'B',
    })).toBe('category_slot_mismatch')
    expect(guestSlotCategoryMismatchReason({
      slotCategoryCode: 'B',
      bodyCategoryCode: 'A',
    })).toBe('category_slot_mismatch')
  })

  it('skips when slot has no category (legacy / open slots)', () => {
    expect(guestSlotCategoryMismatchReason({
      slotCategoryCode: null,
      bodyCategoryCode: 'B',
    })).toBeNull()
    expect(guestSlotCategoryMismatchReason({
      slotCategoryCode: '',
      bodyCategoryCode: 'B',
    })).toBeNull()
  })
})

describe('invalidPersistedLessonPricingReason (adversarial)', () => {
  it('blocks consultation/theory pricing when the appointment is stored as a lesson', () => {
    expect(invalidPersistedLessonPricingReason({
      persistedEventTypeCode: 'lesson',
      ruleTypeUsed: 'consultation',
    })).toBe('service_type_price_mismatch')
    expect(invalidPersistedLessonPricingReason({
      persistedEventTypeCode: 'lesson',
      ruleTypeUsed: 'theory',
    })).toBe('service_type_price_mismatch')
  })

  it('allows base_price for practical lessons', () => {
    expect(invalidPersistedLessonPricingReason({
      persistedEventTypeCode: 'lesson',
      ruleTypeUsed: 'base_price',
    })).toBeNull()
  })

  it('does not apply to theory appointments priced as theory', () => {
    expect(invalidPersistedLessonPricingReason({
      persistedEventTypeCode: 'theory',
      ruleTypeUsed: 'theory',
    })).toBeNull()
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
