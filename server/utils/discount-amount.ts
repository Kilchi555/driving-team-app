/**
 * Source-aware checkout money math.
 *
 * `discounts.discount_value` for type=fixed is stored in CHF.
 * `voucher_codes.discount_value` and `vouchers.amount_rappen` are already rappen.
 * Never apply a global * 100.
 */

export type DiscountValueSource = 'discount' | 'voucher_code' | 'gift_card'

export type DiscountAmountKind = 'percentage' | 'fixed_rappen' | 'fixed_chf' | 'free_lesson'

export function discountKindForSource(
  source: DiscountValueSource,
  discountType: string | null | undefined,
): DiscountAmountKind {
  if (discountType === 'percentage') return 'percentage'
  if (discountType === 'free_lesson' || discountType === 'free_product') return 'free_lesson'
  if (source === 'discount') return 'fixed_chf'
  return 'fixed_rappen'
}

export function computeDiscountAmountRappen(opts: {
  kind: DiscountAmountKind
  value: number
  baseAmountRappen: number
  maxDiscountRappen?: number | null
}): number {
  const base = Math.max(0, Math.round(Number(opts.baseAmountRappen) || 0))
  let amount = 0
  if (opts.kind === 'percentage') {
    amount = Math.round((base * Number(opts.value || 0)) / 100)
  } else if (opts.kind === 'fixed_rappen') {
    amount = Math.round(Number(opts.value || 0))
  } else if (opts.kind === 'fixed_chf') {
    amount = Math.round(Number(opts.value || 0) * 100)
  } else {
    amount = base
  }
  if (opts.maxDiscountRappen != null && Number.isFinite(Number(opts.maxDiscountRappen))) {
    amount = Math.min(amount, Number(opts.maxDiscountRappen))
  }
  return Math.max(0, amount)
}

export function walleeAmountIncludingTaxChf(amountRappen: number): number {
  return Math.round(Number(amountRappen) || 0) / 100
}

export function payableAfterSourceDiscount(opts: {
  baseRappen: number
  source: DiscountValueSource
  discountType: string | null | undefined
  discountValue: number
  maxDiscountRappen?: number | null
}): { discountRappen: number; finalRappen: number; walleeAmountIncludingTax: number } {
  const baseRappen = Math.max(0, Math.round(Number(opts.baseRappen) || 0))
  const discountRappen = Math.min(
    computeDiscountAmountRappen({
      kind: discountKindForSource(opts.source, opts.discountType),
      value: opts.discountValue,
      baseAmountRappen: baseRappen,
      maxDiscountRappen: opts.maxDiscountRappen,
    }),
    baseRappen,
  )
  const finalRappen = Math.max(0, baseRappen - discountRappen)
  return {
    discountRappen,
    finalRappen,
    walleeAmountIncludingTax: walleeAmountIncludingTaxChf(finalRappen),
  }
}
