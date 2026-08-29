import { describe, expect, it, vi } from 'vitest'
import { isGiftCardReservedForOther } from '../checkout-benefits'

describe('isGiftCardReservedForOther', () => {
  const now = Date.parse('2026-08-28T10:00:00.000Z')

  it('allows an unreserved card', () => {
    expect(isGiftCardReservedForOther({}, 'pay-1', now)).toBe(false)
  })

  it('treats an expired reservation as free', () => {
    expect(isGiftCardReservedForOther({
      reserved_for_payment_id: 'pay-other',
      reserved_until: '2026-08-28T09:00:00.000Z',
    }, 'pay-1', now)).toBe(false)
  })

  it('blocks a live reservation for another payment', () => {
    expect(isGiftCardReservedForOther({
      reserved_for_payment_id: 'pay-other',
      reserved_until: '2026-08-28T10:30:00.000Z',
    }, 'pay-1', now)).toBe(true)
  })

  it('allows the payment that already holds the card', () => {
    expect(isGiftCardReservedForOther({
      reserved_for_payment_id: 'pay-1',
      reserved_until: '2026-08-28T10:30:00.000Z',
    }, 'pay-1', now)).toBe(false)
  })
})

describe('lockCheckoutBenefits', () => {
  it('reserves a gift card and marks the payment claimed', async () => {
    const { lockCheckoutBenefits } = await import('../checkout-benefits')
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: 'reserved', error: null }),
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: { metadata: { discount_code: 'GIFT' } }, error: null }
                  },
                }
              },
            }
          },
          update() {
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            }
          },
        }
      },
    }

    await expect(lockCheckoutBenefits({
      supabase,
      tenantId: 't1',
      paymentId: 'pay-1',
      code: 'GIFT',
    })).resolves.toEqual({ ok: true, kind: 'gift_card' })
    expect(supabase.rpc).toHaveBeenCalledWith('reserve_gift_card_for_payment', {
      p_tenant_id: 't1',
      p_code: 'GIFT',
      p_payment_id: 'pay-1',
      p_ttl_minutes: 45,
    })
  })

  it('returns a user-facing lock payload', async () => {
    const { benefitLockUnavailablePayload } = await import('../checkout-benefits')
    expect(benefitLockUnavailablePayload('Dieser Gutschein wurde bereits eingelöst')).toEqual({
      statusCode: 409,
      statusMessage: 'Dieser Gutschein wurde bereits eingelöst',
      data: { code: 'DISCOUNT_UNAVAILABLE' },
    })
  })

  it('rejects a card already held by another payment', async () => {
    const { lockCheckoutBenefits } = await import('../checkout-benefits')
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: 'held_by_other', error: null }),
    }

    await expect(lockCheckoutBenefits({
      supabase,
      tenantId: 't1',
      paymentId: 'pay-1',
      code: 'GIFT',
    })).resolves.toMatchObject({ ok: false, kind: 'gift_card' })
  })
})
