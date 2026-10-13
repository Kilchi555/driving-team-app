/**
 * Shared custom-amount voucher helpers for shop cart + checkout.
 * A "custom voucher" is identified by DB flags (is_voucher + allow_custom_amount),
 * not by a synthetic cart id.
 */

export const CUSTOM_VOUCHER_SINGLE_CHECKOUT_MESSAGE =
  'Pro Bestellung ist nur ein individueller Gutschein erlaubt. Bitte entfernen Sie den bestehenden Gutschein, bevor Sie einen neuen hinzufügen.'

export type CustomVoucherLike = {
  id?: string | null
  product_id?: string | null
  is_voucher?: boolean | null
  allow_custom_amount?: boolean | null
  quantity?: number | null
  name?: string | null
  display_name?: string | null
  description?: string | null
  recipient?: string | null
  recipient_name?: string | null
  unit_price_rappen?: number | null
  price_rappen?: number | null
}

export function isCustomAmountVoucher(product: CustomVoucherLike | null | undefined): boolean {
  return product?.is_voucher === true && product?.allow_custom_amount === true
}

export function customVoucherUnitCount(lines: CustomVoucherLike[]): number {
  return lines.reduce((sum, line) => {
    if (!isCustomAmountVoucher(line)) return sum
    const qty = Number(line.quantity)
    const safeQty = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1
    return sum + safeQty
  }, 0)
}

/** Returns an error message when more than one custom-voucher unit is present. */
export function customVoucherCheckoutLimitError(lines: CustomVoucherLike[]): string | null {
  return customVoucherUnitCount(lines) > 1 ? CUSTOM_VOUCHER_SINGLE_CHECKOUT_MESSAGE : null
}

/** Client cart: reject adding another custom voucher before mutating state. */
export function canAddCustomVoucherToCart(existingLines: CustomVoucherLike[]): {
  ok: boolean
  message?: string
} {
  if (customVoucherUnitCount(existingLines) >= 1) {
    return { ok: false, message: CUSTOM_VOUCHER_SINGLE_CHECKOUT_MESSAGE }
  }
  return { ok: true }
}

export function resolveCustomVoucherDisplayName(
  item: CustomVoucherLike,
  templateName: string,
  sanitize: (value: string | null | undefined, maxLength: number) => string,
): string {
  const candidate = sanitize(item.display_name || item.name || '', 200)
  return candidate || templateName
}

export function resolveCustomVoucherDescription(
  item: CustomVoucherLike,
  sanitize: (value: string | null | undefined, maxLength: number) => string,
): string {
  return sanitize(item.description || '', 500)
}

export function resolveCustomVoucherRecipient(
  item: CustomVoucherLike,
  sanitize: (value: string | null | undefined, maxLength: number) => string,
): string {
  return sanitize(item.recipient || item.recipient_name || '', 120)
}

/** Stable idempotency marker stored in payment metadata / used by webhook. */
export function customVoucherFulfillmentKey(productId: string): string {
  return `custom-voucher:${productId}`
}
