import { describe, expect, it, vi } from 'vitest'
import {
  consumeGiftCardByCode,
  consumeGiftCardForPayment,
  giftCardCodeFromPaymentMetadata,
} from '../consume-gift-card'

describe('giftCardCodeFromPaymentMetadata', () => {
  it('reads a trimmed discount_code', () => {
    expect(giftCardCodeFromPaymentMetadata({ discount_code: '  GIFT-1  ' })).toBe('GIFT-1')
    expect(giftCardCodeFromPaymentMetadata({ discount_code: '' })).toBeNull()
    expect(giftCardCodeFromPaymentMetadata(null)).toBeNull()
  })
})

describe('consumeGiftCardByCode', () => {
  it('redeems only via the unreserved RPC and does not fall back to a table update', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: false, error: null })
    const supabase = { rpc, from: vi.fn() }

    const first = await consumeGiftCardByCode({
      supabase,
      tenantId: 't1',
      code: 'GIFT-1',
      redeemedBy: 'user-1',
    })
    const second = await consumeGiftCardByCode({
      supabase,
      tenantId: 't1',
      code: 'GIFT-1',
      redeemedBy: 'user-1',
    })

    expect(first).toEqual({ consumed: true, alreadyRedeemed: false })
    expect(second).toEqual({ consumed: false, alreadyRedeemed: true })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenNthCalledWith(1, 'consume_gift_card_for_payment', {
      p_tenant_id: 't1',
      p_code: 'GIFT-1',
      p_payment_id: null,
      p_redeemed_by: 'user-1',
    })
  })
})

describe('consumeGiftCardForPayment', () => {
  it('never falls back to an unscoped table consume', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null })
    const supabase = { rpc, from: vi.fn() }

    await expect(consumeGiftCardForPayment({
      supabase,
      tenantId: 't1',
      paymentId: 'pay-1',
      discountCode: 'GIFT-1',
      redeemedBy: 'user-1',
    })).resolves.toEqual({ consumed: false })

    expect(supabase.from).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenCalledWith('consume_gift_card_for_payment', {
      p_tenant_id: 't1',
      p_code: 'GIFT-1',
      p_payment_id: 'pay-1',
      p_redeemed_by: 'user-1',
    })
  })
})
