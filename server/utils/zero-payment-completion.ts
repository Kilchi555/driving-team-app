/**
 * Defense against the guest-booking CHF-0 amp: /api/payments/process used to
 * treat `finalAmountToPay <= 0` as "fully covered by credit" even when no
 * credit was used and the payment total was silently 0 (wrong pricing rule).
 *
 * Returns null when completing at CHF 0 is legitimate; otherwise a short
 * machine-readable reason to abort before marking the payment completed.
 */

export function suspiciousZeroPaymentCompletionReason(opts: {
  totalAmountRappen: number | null | undefined
  lessonPriceRappen?: number | null | undefined
  discountAmountRappen?: number | null | undefined
  voucherDiscountRappen?: number | null | undefined
  /** Credit that will be deducted in this request. */
  creditToDeductRappen?: number | null | undefined
  /** Credit already applied to this payment. */
  creditAlreadyUsedRappen?: number | null | undefined
  paymentMethod?: string | null | undefined
  /** Explicit allow from booking (free public event / intentional zero). */
  metadata?: Record<string, unknown> | null | undefined
}): string | null {
  const total = Number(opts.totalAmountRappen) || 0
  const creditNow = Number(opts.creditToDeductRappen) || 0
  const creditPrev = Number(opts.creditAlreadyUsedRappen) || 0
  const creditCovering = creditNow + creditPrev

  // Real wallet coverage — always OK.
  if (creditCovering > 0) return null

  // Positive totals without credit should not reach the zero-completion path.
  if (total > 0) return 'zero_due_without_credit'

  const discount = Number(opts.discountAmountRappen) || 0
  const voucher = Number(opts.voucherDiscountRappen) || 0
  if (discount > 0 || voucher > 0) return null

  if (opts.paymentMethod === 'free') return null

  const meta = opts.metadata && typeof opts.metadata === 'object' ? opts.metadata : null
  if (meta?.free_public_event === true || meta?.allow_zero_completion === true) return null

  // Classic bug signature: lesson + total both 0, no discount, no credit.
  const lesson = opts.lessonPriceRappen == null ? null : Number(opts.lessonPriceRappen)
  if (lesson != null && Number.isFinite(lesson) && lesson <= 0) {
    return 'zero_lesson_without_benefit'
  }

  return 'zero_total_without_benefit'
}
