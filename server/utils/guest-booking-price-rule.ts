import type { RoomServiceType } from '~/server/utils/room-availability'

export type BookingPriceRuleType = 'base_price' | 'theory' | 'consultation'

/**
 * Maps the public booking service type to the pricing_rules.rule_type that
 * must be used for lesson price. Guest checkout must never load "any active
 * rule for category" — consultation/admin_fee rows are often CHF 0.
 */
export function guestBookingPriceRuleType(
  serviceType: RoomServiceType | null | undefined
): BookingPriceRuleType {
  if (serviceType === 'theorie') return 'theory'
  if (serviceType === 'beratung') return 'consultation'
  return 'base_price'
}

/**
 * Slot-based guest checkout (`/api/booking/guest-book`) only books practical
 * Fahrstunden. Theorie/Beratung intentionally skip slots in the UI and go
 * through the proposal form instead.
 *
 * Accepting client `service_type=beratung|theorie` here would let an attacker
 * load a CHF-0 consultation/theory rule while still inserting a real
 * appointment on a reserved driving-lesson slot (often with
 * `event_type_code=lesson`). Treat any non-fahrstunde value as spoofing.
 */
export function normalizeGuestSlotServiceType(
  serviceType: RoomServiceType | string | null | undefined
): { ok: true; serviceType: 'fahrstunde' } | { ok: false; reason: 'spoofed_non_lesson_service' } {
  if (serviceType == null || serviceType === '' || serviceType === 'fahrstunde') {
    return { ok: true, serviceType: 'fahrstunde' }
  }
  return { ok: false, reason: 'spoofed_non_lesson_service' }
}

/**
 * Price must follow the category of the reserved slot — clients must not
 * undercharge by swapping `category_code` to a cheaper (or free) category
 * while holding a different slot.
 *
 * Returns null when OK, or a short machine-readable reason when mismatched.
 */
export function guestSlotCategoryMismatchReason(opts: {
  slotCategoryCode: string | null | undefined
  bodyCategoryCode: string | null | undefined
}): string | null {
  const slotCat = typeof opts.slotCategoryCode === 'string' ? opts.slotCategoryCode.trim() : ''
  const bodyCat = typeof opts.bodyCategoryCode === 'string' ? opts.bodyCategoryCode.trim() : ''
  if (!slotCat || !bodyCat) return null
  if (slotCat !== bodyCat) return 'category_slot_mismatch'
  return null
}

/**
 * Defense in depth: a persisted practical lesson must never be priced via
 * consultation/theory rules (the classic guest-book spoof: service_type=
 * beratung → consultation @ CHF 0 → still event_type_code=lesson).
 */
export function invalidPersistedLessonPricingReason(opts: {
  persistedEventTypeCode: string | null | undefined
  ruleTypeUsed: BookingPriceRuleType | string | null | undefined
}): string | null {
  const event = opts.persistedEventTypeCode || 'lesson'
  const isPracticalLesson =
    event === 'lesson' || event === 'practical' || event === 'fahrstunde'
  if (!isPracticalLesson) return null
  if (opts.ruleTypeUsed === 'consultation' || opts.ruleTypeUsed === 'theory') {
    return 'service_type_price_mismatch'
  }
  return null
}

/**
 * Fahrstunden (base_price) may end up at CHF 0 after discount / voucher /
 * wallet credit — that is fine. What must never happen is a silent CHF 0
 * because the base pricing rule is missing or itself priced at 0 (e.g. the
 * wrong consultation/admin_fee row was loaded).
 *
 * Returns null when OK, or a short machine-readable reason when the booking
 * must be aborted before insert.
 */
export function invalidDrivingLessonBasePriceReason(opts: {
  ruleType: BookingPriceRuleType | string | null | undefined
  /** True when this booking is an intentional free public event (require_payment=false). */
  allowFreePublicEvent?: boolean
  pricePerMinuteRappen?: number | string | null
  hasPricingRule: boolean
}): string | null {
  if (opts.ruleType !== 'base_price') return null
  if (opts.allowFreePublicEvent) return null
  if (!opts.hasPricingRule) return 'missing_base_price_rule'
  const ppm = Number(opts.pricePerMinuteRappen)
  if (!Number.isFinite(ppm) || ppm <= 0) return 'zero_base_price_rule'
  return null
}
