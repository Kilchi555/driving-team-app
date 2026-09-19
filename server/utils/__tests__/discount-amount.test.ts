import { describe, expect, it } from 'vitest'
import {
  computeDiscountAmountRappen,
  discountKindForSource,
  payableAfterSourceDiscount,
  walleeAmountIncludingTaxChf,
} from '../discount-amount'

const BASE_240 = 24000
const BASE_100 = 10000

describe('discountKindForSource', () => {
  it('maps discounts.fixed to CHF, voucher/gift-card fixed to rappen', () => {
    expect(discountKindForSource('discount', 'fixed')).toBe('fixed_chf')
    expect(discountKindForSource('voucher_code', 'fixed')).toBe('fixed_rappen')
    expect(discountKindForSource('gift_card', 'fixed')).toBe('fixed_rappen')
  })

  it('keeps percentage and free kinds independent of source', () => {
    expect(discountKindForSource('discount', 'percentage')).toBe('percentage')
    expect(discountKindForSource('voucher_code', 'percentage')).toBe('percentage')
    expect(discountKindForSource('gift_card', 'free_lesson')).toBe('free_lesson')
  })
})

describe('payableAfterSourceDiscount', () => {
  it('A. discounts.fixed 190 CHF off 240 CHF → 50 CHF Wallee', () => {
    const payable = payableAfterSourceDiscount({
      baseRappen: BASE_240,
      source: 'discount',
      discountType: 'fixed',
      discountValue: 190,
    })
    expect(payable.discountRappen).toBe(19000)
    expect(payable.finalRappen).toBe(5000)
    expect(payable.walleeAmountIncludingTax).toBe(50)
    expect(payable.walleeAmountIncludingTax).not.toBe(238.1)
  })

  it('B. voucher_codes.fixed 19000 rappen is not multiplied by 100', () => {
    const payable = payableAfterSourceDiscount({
      baseRappen: BASE_240,
      source: 'voucher_code',
      discountType: 'fixed',
      discountValue: 19000,
    })
    expect(payable.discountRappen).toBe(19000)
    expect(payable.finalRappen).toBe(5000)
    expect(payable.walleeAmountIncludingTax).toBe(50)
    expect(payable.discountRappen).not.toBe(1_900_000)
  })

  it('C. gift card amount_rappen 19000 stays rappen', () => {
    const payable = payableAfterSourceDiscount({
      baseRappen: BASE_240,
      source: 'gift_card',
      discountType: 'fixed',
      discountValue: 19000,
    })
    expect(payable.discountRappen).toBe(19000)
    expect(payable.finalRappen).toBe(5000)
    expect(payable.walleeAmountIncludingTax).toBe(50)
  })

  it('D. 10% of 240 CHF stays 2400 rappen / CHF 216', () => {
    for (const source of ['discount', 'voucher_code'] as const) {
      const payable = payableAfterSourceDiscount({
        baseRappen: BASE_240,
        source,
        discountType: 'percentage',
        discountValue: 10,
      })
      expect(payable.discountRappen).toBe(2400)
      expect(payable.finalRappen).toBe(21600)
      expect(payable.walleeAmountIncludingTax).toBe(216)
    }
  })

  it('E. fixed CHF discount is capped at the base price', () => {
    const payable = payableAfterSourceDiscount({
      baseRappen: BASE_100,
      source: 'discount',
      discountType: 'fixed',
      discountValue: 190,
    })
    expect(payable.discountRappen).toBe(10000)
    expect(payable.finalRappen).toBe(0)
    expect(payable.walleeAmountIncludingTax).toBe(0)
  })

  it('F. client amount / discountAmountRappen cannot control the payable', () => {
    const clientHint = { amount: 1.9, discountAmountRappen: 190 }
    const payable = payableAfterSourceDiscount({
      baseRappen: BASE_240,
      source: 'discount',
      discountType: 'fixed',
      discountValue: 190,
    })
    expect(payable.walleeAmountIncludingTax).toBe(50)
    expect(payable.walleeAmountIncludingTax).not.toBe(clientHint.amount)
    expect(payable.discountRappen).not.toBe(clientHint.discountAmountRappen)
  })

  it('G. Wallee representation is major-units CHF, not rappen', () => {
    expect(walleeAmountIncludingTaxChf(5000)).toBe(50)
    expect(walleeAmountIncludingTaxChf(21600)).toBe(216)
    expect(walleeAmountIncludingTaxChf(23810)).not.toBe(50)
  })

  it('never treats voucher_codes 19000 as CHF 19000', () => {
    const amount = computeDiscountAmountRappen({
      kind: discountKindForSource('voucher_code', 'fixed'),
      value: 19000,
      baseAmountRappen: BASE_240,
    })
    expect(amount).toBe(19000)
    expect(amount).not.toBe(1_900_000)
  })
})

describe('shop discounts.fixed', () => {
  it('converts a discounts-table fixed CHF value the same way as course checkout', () => {
    const productsRappen = 24000
    const discountRappen = computeDiscountAmountRappen({
      kind: discountKindForSource('discount', 'fixed'),
      value: 190,
      baseAmountRappen: productsRappen,
    })
    const totalRappen = productsRappen - discountRappen
    expect(discountRappen).toBe(19000)
    expect(totalRappen).toBe(5000)
    expect(walleeAmountIncludingTaxChf(totalRappen)).toBe(50)
  })

  it('leaves voucher_codes fixed rappen unchanged in the shop path', () => {
    const discountRappen = computeDiscountAmountRappen({
      kind: discountKindForSource('voucher_code', 'fixed'),
      value: 19000,
      baseAmountRappen: 24000,
    })
    expect(discountRappen).toBe(19000)
  })
})
