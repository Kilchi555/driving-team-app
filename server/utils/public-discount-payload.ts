/**
 * Public discount/voucher payload for POST /api/discounts/validate.
 * Checkout only needs enough to display the discount and re-submit the code.
 * Server-side create-appointment / shop payment re-resolve the code and
 * never trust this object for money movement.
 */

export type PublicDiscountKind = 'voucher_code' | 'gift_card' | 'discount'

export function toPublicDiscountPayload(
  row: Record<string, any>,
  kind: PublicDiscountKind,
): Record<string, any> {
  const name = row.name || row.description || null
  const payload: Record<string, any> = {
    id: row.id,
    code: row.code,
    name,
    discount_type: row.discount_type || 'fixed',
    discount_value: row.discount_value ?? row.amount_rappen ?? row.credit_amount_rappen ?? 0,
    min_amount_rappen: row.min_amount_rappen || 0,
    max_discount_rappen: row.max_discount_rappen ?? null,
    applies_to: row.applies_to || null,
    first_lesson_only: !!row.first_lesson_only,
  }

  if (kind === 'voucher_code') {
    payload.is_voucher_code = true
  }
  if (kind === 'gift_card') {
    payload.is_gift_card = true
    payload.discount_type = 'fixed'
    payload.discount_value = row.amount_rappen
    payload.max_discount_rappen = row.amount_rappen
  }

  return payload
}

const FORBIDDEN_PUBLIC_DISCOUNT_KEYS = [
  'tenant_id',
  'recipient_email',
  'recipient_name',
  'buyer_email',
  'buyer_name',
  'payment_id',
  'redeemed_by',
  'created_by',
  'usage_count_per_user',
  'allowed_categories',
  'current_redemptions',
  'max_redemptions',
  'reserved_for_payment_id',
]

export function assertNoSensitiveDiscountFields(payload: Record<string, any>) {
  for (const key of FORBIDDEN_PUBLIC_DISCOUNT_KEYS) {
    if (key in payload && payload[key] != null) {
      throw new Error(`Public discount payload must not include ${key}`)
    }
  }
}
