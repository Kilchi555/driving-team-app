import type { RoomServiceType } from '~/server/utils/room-availability'

/**
 * Maps the public booking service type to the pricing_rules.rule_type that
 * must be used for lesson price. Guest checkout must never load "any active
 * rule for category" — consultation/admin_fee rows are often CHF 0.
 */
export function guestBookingPriceRuleType(
  serviceType: RoomServiceType | null | undefined
): 'base_price' | 'theory' | 'consultation' {
  if (serviceType === 'theorie') return 'theory'
  if (serviceType === 'beratung') return 'consultation'
  return 'base_price'
}
