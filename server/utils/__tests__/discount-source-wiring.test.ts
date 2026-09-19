import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function src(rel: string) {
  return readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8')
}

describe('source-aware discount wiring', () => {
  it('enroll-wallee recomputes from DB source units, not client rappen', () => {
    const enroll = src('api/courses/enroll-wallee.post.ts')
    expect(enroll).toContain('payableAfterSourceDiscount')
    expect(enroll).toContain("unitSource = 'discount'")
    expect(enroll).toContain("voucherData ? 'voucher_code'")
    expect(enroll).toContain("unitSource = 'gift_card'")
    expect(enroll).not.toMatch(/discount_type === 'fixed'[\s\S]{0,120}discountRow\.discount_value \|\| 0/)
    expect(enroll).toContain('discountAmountRappen')
    expect(enroll).not.toMatch(/validatedDiscountAmount\s*=\s*discountAmountRappen/)
  })

  it('process-public overrides client amount and sends Wallee CHF via helper', () => {
    const pay = src('api/payments/process-public.post.ts')
    expect(pay).toContain('payableAfterSourceDiscount')
    expect(pay).toContain('walleeAmountIncludingTaxChf(amount)')
    expect(pay).toContain('Override client amount')
    expect(pay).toContain("unitSource = 'discount'")
    expect(pay).toContain("unitSource = 'voucher_code'")
    expect(pay).toContain("unitSource = 'gift_card'")
    expect(pay).not.toMatch(/amountIncludingTax:\s*amount\s*\/\s*100/)
    expect(pay).not.toMatch(/discount_type === 'fixed'[\s\S]{0,120}Number\(discountRow\.discount_value/)
  })

  it('shop tags discounts vs voucher_codes before converting', () => {
    const shop = src('api/shop/create-payment.post.ts')
    expect(shop).toContain('discountKindForSource')
    expect(shop).toContain('computeDiscountAmountRappen')
    expect(shop).toContain("source: 'discount'")
    expect(shop).toContain("source: 'voucher_code'")
    expect(shop).not.toMatch(/else \{\s*amount = Number\(row\.discount_value \|\| 0\)/)
  })
})
