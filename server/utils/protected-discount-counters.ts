/**
 * PR-A C1 — usage / redemption counters are server-internal.
 * Strip them from any client-supplied payload before service-role writes.
 */
export const PROTECTED_DISCOUNT_COUNTER_FIELDS = ['usage_count'] as const
export const PROTECTED_VOUCHER_REDEMPTION_FIELDS = ['current_redemptions'] as const

export function stripProtectedCounterFields<T extends Record<string, unknown>>(
  input: T,
  fields: readonly string[],
): T {
  const out = { ...input }
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(out, field)) {
      delete out[field]
    }
  }
  return out
}

export function stripDiscountUsageCount<T extends Record<string, unknown>>(input: T): T {
  return stripProtectedCounterFields(input, PROTECTED_DISCOUNT_COUNTER_FIELDS)
}

export function stripVoucherCurrentRedemptions<T extends Record<string, unknown>>(input: T): T {
  return stripProtectedCounterFields(input, PROTECTED_VOUCHER_REDEMPTION_FIELDS)
}
