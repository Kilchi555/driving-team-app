import { describe, expect, it } from 'vitest'
import {
  consumeGiftCardByCode,
  giftCardCodeFromPaymentMetadata,
} from '../consume-gift-card'

describe('giftCardCodeFromPaymentMetadata', () => {
  it('reads a trimmed discount_code', () => {
    expect(giftCardCodeFromPaymentMetadata({ discount_code: '  GIFT-1  ' })).toBe('GIFT-1')
    expect(giftCardCodeFromPaymentMetadata({ discount_code: '' })).toBeNull()
    expect(giftCardCodeFromPaymentMetadata(null)).toBeNull()
  })
})

function mockVoucherClient(results: Array<{ data: { id: string } | null }>) {
  let calls = 0
  return {
    from(table: string) {
      expect(table).toBe('vouchers')
      return {
        update() {
          return {
            ilike() {
              return {
                eq() {
                  return {
                    is() {
                      return {
                        select() {
                          return {
                            async maybeSingle() {
                              const result = results[calls] || { data: null }
                              calls += 1
                              return { data: result.data, error: null }
                            },
                          }
                        },
                      }
                    },
                  }
                },
              }
            },
          }
        },
      }
    },
  }
}

describe('consumeGiftCardByCode', () => {
  it('consumes the first redeem and rejects the second CAS update', async () => {
    const supabase = mockVoucherClient([
      { data: { id: 'voucher-1' } },
      { data: null },
    ])

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
  })
})
