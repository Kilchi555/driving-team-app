import { describe, expect, it } from 'vitest'
import {
  assertNoSensitiveDiscountFields,
  toPublicDiscountPayload,
} from '~/server/utils/public-discount-payload'

describe('toPublicDiscountPayload', () => {
  it('keeps the fields shop checkout uses and drops PII', () => {
    const payload = toPublicDiscountPayload(
      {
        id: 'disc-1',
        code: 'SAVE10',
        name: 'Zehn Prozent',
        discount_type: 'percentage',
        discount_value: 10,
        min_amount_rappen: 5000,
        max_discount_rappen: 2000,
        applies_to: 'appointments',
        first_lesson_only: true,
        tenant_id: 'secret-tenant',
        recipient_email: 'buyer@example.com',
        buyer_email: 'payer@example.com',
        payment_id: 'pay-1',
      },
      'discount',
    )

    expect(payload.id).toBe('disc-1')
    expect(payload.code).toBe('SAVE10')
    expect(payload.name).toBe('Zehn Prozent')
    expect(payload.discount_type).toBe('percentage')
    expect(payload.discount_value).toBe(10)
    expect(payload.min_amount_rappen).toBe(5000)
    expect(payload.max_discount_rappen).toBe(2000)
    expect(payload.applies_to).toBe('appointments')
    expect(payload.first_lesson_only).toBe(true)
    expect(payload.tenant_id).toBeUndefined()
    expect(payload.recipient_email).toBeUndefined()
    expect(payload.buyer_email).toBeUndefined()
    expect(payload.payment_id).toBeUndefined()
    expect(() => assertNoSensitiveDiscountFields(payload)).not.toThrow()
  })

  it('normalizes gift cards to a fixed public discount', () => {
    const payload = toPublicDiscountPayload(
      {
        id: 'gift-1',
        code: 'GIFT50',
        name: 'Gutschein',
        amount_rappen: 5000,
        recipient_email: 'hidden@example.com',
        buyer_name: 'Secret',
        redeemed_by: 'user-1',
      },
      'gift_card',
    )

    expect(payload.is_gift_card).toBe(true)
    expect(payload.discount_type).toBe('fixed')
    expect(payload.discount_value).toBe(5000)
    expect(payload.max_discount_rappen).toBe(5000)
    expect(payload.recipient_email).toBeUndefined()
    expect(payload.buyer_name).toBeUndefined()
    expect(payload.redeemed_by).toBeUndefined()
  })

  it('marks voucher codes without leaking redemption counters', () => {
    const payload = toPublicDiscountPayload(
      {
        id: 'vc-1',
        code: 'PROMO',
        description: 'Promo',
        discount_type: 'fixed',
        discount_value: 1000,
        current_redemptions: 4,
        max_redemptions: 5,
      },
      'voucher_code',
    )

    expect(payload.is_voucher_code).toBe(true)
    expect(payload.name).toBe('Promo')
    expect(payload.current_redemptions).toBeUndefined()
    expect(payload.max_redemptions).toBeUndefined()
  })
})
