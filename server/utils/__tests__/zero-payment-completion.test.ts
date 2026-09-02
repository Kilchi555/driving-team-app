import { describe, expect, it } from 'vitest'
import { suspiciousZeroPaymentCompletionReason } from '../zero-payment-completion'

describe('suspiciousZeroPaymentCompletionReason', () => {
  it('allows real credit coverage', () => {
    expect(suspiciousZeroPaymentCompletionReason({
      totalAmountRappen: 12665,
      creditToDeductRappen: 12665,
    })).toBeNull()
    expect(suspiciousZeroPaymentCompletionReason({
      totalAmountRappen: 12665,
      creditAlreadyUsedRappen: 12665,
      creditToDeductRappen: 0,
    })).toBeNull()
  })

  it('allows intentional 100% discount / voucher', () => {
    expect(suspiciousZeroPaymentCompletionReason({
      totalAmountRappen: 0,
      lessonPriceRappen: 12665,
      discountAmountRappen: 12665,
    })).toBeNull()
    expect(suspiciousZeroPaymentCompletionReason({
      totalAmountRappen: 0,
      lessonPriceRappen: 12665,
      voucherDiscountRappen: 12665,
    })).toBeNull()
  })

  it('allows free_public_event / allow_zero_completion metadata', () => {
    expect(suspiciousZeroPaymentCompletionReason({
      totalAmountRappen: 0,
      lessonPriceRappen: 0,
      metadata: { free_public_event: true },
    })).toBeNull()
    expect(suspiciousZeroPaymentCompletionReason({
      totalAmountRappen: 0,
      lessonPriceRappen: 0,
      metadata: { allow_zero_completion: true },
    })).toBeNull()
    expect(suspiciousZeroPaymentCompletionReason({
      totalAmountRappen: 0,
      lessonPriceRappen: 0,
      paymentMethod: 'free',
    })).toBeNull()
  })

  it('rejects the classic wrong-pricing-rule amp (CHF 0 lesson completed as credit)', () => {
    expect(suspiciousZeroPaymentCompletionReason({
      totalAmountRappen: 0,
      lessonPriceRappen: 0,
      creditToDeductRappen: 0,
      creditAlreadyUsedRappen: 0,
      discountAmountRappen: 0,
    })).toBe('zero_lesson_without_benefit')
  })

  it('rejects zero due on a positive total without any credit', () => {
    expect(suspiciousZeroPaymentCompletionReason({
      totalAmountRappen: 12665,
      creditToDeductRappen: 0,
      creditAlreadyUsedRappen: 0,
    })).toBe('zero_due_without_credit')
  })
})
