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
