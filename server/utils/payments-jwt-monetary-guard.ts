/**
 * Specification of the JWT payment monetary freeze.
 * Production enforcement is the SQL trigger in
 * migrations/20260911_prevent_authenticated_payment_monetary_mutation.sql.
 * Tests use this replica so JWT injection behavior is asserted without a live DB.
 *
 * service_role (Nuxt APIs, webhooks, shop/create-payment) may write amounts.
 * authenticated JWTs cannot INSERT payments or change monetary columns.
 * anon shop checkout INSERT is unchanged (appointment_id IS NULL, lesson=0).
 */

export const PAYMENT_MONETARY_FIELDS = [
  'lesson_price_rappen',
  'admin_fee_rappen',
  'products_price_rappen',
  'discount_amount_rappen',
  'voucher_discount_rappen',
  'credit_used_rappen',
  'total_amount_rappen',
] as const

export type PaymentMonetaryField = (typeof PAYMENT_MONETARY_FIELDS)[number]

export const PAYMENTS_JWT_INSERT_FORBIDDEN = 'payments_jwt_insert_forbidden'
export const PAYMENTS_JWT_MONETARY_UPDATE_FORBIDDEN = 'payments_jwt_monetary_update_forbidden'

export function applyJwtPaymentMonetaryGuard<T extends Record<string, unknown>>(opts: {
  role: string
  op: 'INSERT' | 'UPDATE'
  oldRow?: T
  newRow: T
}): { ok: true; row: T } | { ok: false; code: string } {
  if (opts.role === 'service_role') {
    return { ok: true, row: opts.newRow }
  }

  if (opts.op === 'INSERT') {
    if (opts.role === 'authenticated') {
      return { ok: false, code: PAYMENTS_JWT_INSERT_FORBIDDEN }
    }
    return { ok: true, row: opts.newRow }
  }

  const previous = opts.oldRow || ({} as T)
  for (const field of PAYMENT_MONETARY_FIELDS) {
    if (opts.newRow[field] !== previous[field]) {
      return { ok: false, code: PAYMENTS_JWT_MONETARY_UPDATE_FORBIDDEN }
    }
  }
  return { ok: true, row: opts.newRow }
}
