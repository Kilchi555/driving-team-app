/**
 * Staff composition around the canonical offer price resolver (#213).
 *
 * Public booking binds a reserved slot, then calls resolveOfferPrice.
 * Staff has no public slot: identity comes from the appointment fields the
 * server already authenticated (tenant, event type, optional category, duration).
 *
 * This file must not reimplement ppm × duration. One engine: resolveOfferPrice.
 */
import {
  resolveOfferPrice,
  throwIfUnpriced,
  type OfferPriceClient,
  type OfferPriceRuleRef,
  type OfferPriceRuleTypeHint,
} from '~/server/utils/resolve-offer-price'

export type StaffOfferIdentity = {
  tenantId: string
  eventTypeCode: string
  categoryCode?: string | null
  durationMinutes: number
  startTime?: string | Date | null
}

export type StaffOfferQuote =
  | {
      kind: 'paid'
      lessonPriceRappen: number
      rule: OfferPriceRuleRef
    }
  | {
      kind: 'free'
      lessonPriceRappen: 0
      reason: 'require_payment_false'
    }

export type StaffPaymentComposition = {
  lessonPriceRappen: number
  adminFeeRappen: number
  productsPriceRappen: number
  discountAmountRappen: number
  creditUsedRappen: number
  totalAmountRappen: number
  remainingAmountRappen: number
}

/**
 * Category rule_type for resolveOfferPrice. Built-in codes map to the
 * existing theory/consultation/exam rows; everything else uses base_price
 * (or an event_price row, which the resolver prefers).
 */
export function staffRuleTypeHint(eventTypeCode: string | null | undefined): OfferPriceRuleTypeHint {
  const code = String(eventTypeCode || '').trim().toLowerCase()
  if (code === 'theory') return 'theory'
  if (code === 'consultation') return 'consultation'
  if (code === 'exam') return 'exam'
  return 'base_price'
}

export function staffOfferIdentityFromAppointment(input: {
  tenantId: string
  eventTypeCode?: string | null
  categoryCode?: string | null
  durationMinutes?: number | null
  startTime?: string | Date | null
}): StaffOfferIdentity {
  return {
    tenantId: String(input.tenantId || '').trim(),
    eventTypeCode: String(input.eventTypeCode || '').trim(),
    categoryCode: input.categoryCode ? String(input.categoryCode).trim() : null,
    durationMinutes: Number(input.durationMinutes),
    startTime: input.startTime || null,
  }
}

export async function quoteStaffAppointmentOffer(
  supabase: OfferPriceClient,
  identity: StaffOfferIdentity,
): Promise<StaffOfferQuote> {
  const offer = await resolveOfferPrice(supabase, {
    tenantId: identity.tenantId,
    eventTypeCode: identity.eventTypeCode,
    categoryCode: identity.categoryCode,
    durationMinutes: identity.durationMinutes,
    startTime: identity.startTime || undefined,
    ruleTypeHint: staffRuleTypeHint(identity.eventTypeCode),
  })
  throwIfUnpriced(offer)
  if (offer.kind === 'free') {
    return { kind: 'free', lessonPriceRappen: 0, reason: 'require_payment_false' }
  }
  return {
    kind: 'paid',
    lessonPriceRappen: offer.priceRappen,
    rule: offer.rule,
  }
}

function nonNegativeRappen(value: unknown): number {
  const n = Math.round(Number(value) || 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Overlays (admin fee, products, discount, credit) stay client-supplied in PR A.
 * The offer/lesson base and the resulting total are never taken from the client.
 */
export function composeStaffPaymentFromOffer(
  quote: StaffOfferQuote,
  overlays: {
    adminFeeRappen?: unknown
    productsPriceRappen?: unknown
    discountAmountRappen?: unknown
    creditUsedRappen?: unknown
  } = {},
): StaffPaymentComposition {
  const lessonPriceRappen = quote.lessonPriceRappen
  const adminFeeRappen = nonNegativeRappen(overlays.adminFeeRappen)
  const productsPriceRappen = nonNegativeRappen(overlays.productsPriceRappen)
  const discountAmountRappen = nonNegativeRappen(overlays.discountAmountRappen)
  const creditUsedRappen = nonNegativeRappen(overlays.creditUsedRappen)
  const totalAmountRappen = Math.max(
    0,
    lessonPriceRappen + adminFeeRappen + productsPriceRappen - discountAmountRappen,
  )
  return {
    lessonPriceRappen,
    adminFeeRappen,
    productsPriceRappen,
    discountAmountRappen,
    creditUsedRappen,
    totalAmountRappen,
    remainingAmountRappen: Math.max(0, totalAmountRappen - creditUsedRappen),
  }
}
