/**
 * Phase 0 characterization (origin/main @ 6aaed632) — documented, not encoded
 * as the desired architecture:
 *
 * 1. Guest paid + no matching price: already 503 (not silent CHF 0).
 * 2. Preview paid + no matching price: returned { success: true, price_rappen: 0 }.
 * 3. Authenticated create-appointment + missing price: already 503.
 * 4. driving_school + zero categories: empty public catalog (business_type branch).
 * 5. Explicit require_payment=false: 0 via freePublicEvent (also required public_bookable).
 *
 * Tests below lock the remediated contract and the extracted legacy catalog helper.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { offerPriceToHttpError, previewPayloadFromOfferPrice } from '../resolve-offer-price'
import { selectPublicBookingCatalogLegacyByBusinessType } from '../select-public-booking-catalog'

const previewSrc = readFileSync(resolve(process.cwd(), 'server/api/booking/preview-price.post.ts'), 'utf8')
const guestSrc = readFileSync(resolve(process.cwd(), 'server/api/booking/guest-book.post.ts'), 'utf8')
const createSrc = readFileSync(resolve(process.cwd(), 'server/api/booking/create-appointment.post.ts'), 'utf8')
const initSrc = readFileSync(resolve(process.cwd(), 'server/api/booking/get-booking-init.get.ts'), 'utf8')

describe('Phase 0 characterization → remediated HTTP/catalog contract', () => {
  it('1. guest booking no longer continues at CHF 0 when paid and unpriced', () => {
    expect(guestSrc).toContain('resolveOfferPrice')
    expect(guestSrc).toContain('throwIfUnpriced')
    expect(guestSrc).toContain('Client-supplied discount_amount_rappen is non-authoritative')
  })

  it('2. preview paid + no matching price is not success + price_rappen: 0', () => {
    expect(previewSrc).toContain('resolveOfferPrice')
    expect(previewSrc).toContain('throwIfUnpriced')
    expect(previewSrc).not.toMatch(/if \(!pricingRule\) \{[\s\S]*success:\s*true[\s\S]*price_rappen:\s*0/)
    expect(offerPriceToHttpError({ kind: 'unpriced', error: 'NO_PRICE_RULE' })).toMatchObject({
      statusCode: 503,
      data: { code: 'NO_PRICE_RULE' },
    })
  })

  it('3. authenticated create-appointment stays fail-closed via the shared resolver', () => {
    expect(createSrc).toContain('resolveOfferPrice')
    expect(createSrc).toContain('throwIfUnpriced')
  })

  it('4. driving_school + zero categories used to be an empty catalog (legacy helper)', () => {
    const legacy = selectPublicBookingCatalogLegacyByBusinessType({
      businessType: 'driving_school',
      tenantId: 't1',
      categories: [],
      publicEventTypes: [{ id: 'et1', code: 'consulting', name: 'Erstgespräch', default_duration_minutes: 30 }],
    })
    expect(legacy.source).toBe('empty')
    expect(legacy.categories).toEqual([])
  })

  it('5. explicit require_payment=false preview may return kind=free and price_rappen 0', () => {
    expect(previewPayloadFromOfferPrice({
      kind: 'free',
      priceRappen: 0,
      reason: 'require_payment_false',
    })).toEqual({
      success: true,
      kind: 'free',
      price_rappen: 0,
    })
  })

  it('get-booking-init no longer branches catalog on business_type === driving_school', () => {
    expect(initSrc).toContain('selectPublicBookingCatalog')
    expect(initSrc).not.toMatch(/if \(tenant\.business_type === 'driving_school'\)/)
  })

  it('preview, guest, and authenticated booking bind identity to the reserved slot', () => {
    expect(previewSrc).toContain('bindPublicSlotOfferIdentity')
    expect(guestSrc).toContain('bindPublicSlotOfferIdentity')
    expect(createSrc).toContain('bindPublicSlotOfferIdentity')
    expect(previewSrc).toContain('identity.eventTypeCode')
    expect(createSrc).toContain('persistedEventTypeCode')
  })

  it('client discount_amount_rappen is not used as the offer price', () => {
    expect(guestSrc).not.toMatch(/totalAmountRappen\s*=\s*body\.discount_amount_rappen/)
    expect(createSrc).not.toMatch(/totalAmountRappen\s*=\s*body\.discount_amount_rappen/)
    expect(createSrc).toContain('Client-supplied discount_amount_rappen is non-authoritative')
  })
})
