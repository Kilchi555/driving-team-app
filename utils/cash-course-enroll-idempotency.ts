/**
 * Public cash_on_site enroll — client idempotency key lifecycle.
 *
 * Canonical transport: body.idempotencyKey (UUID v4).
 * Generate once per logical submit attempt; reuse on uncertain outcomes;
 * retire only after confirmed HTTP success (or modal close = new attempt).
 */

/** UUID v4 (RFC 4122 variant). */
const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isCashEnrollUuidV4(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4_RE.test(value)
}

/**
 * Cryptographically secure UUID v4. Fails closed when Web Crypto is unavailable
 * — never fall back to Math.random().
 */
export function createSecureCashEnrollIdempotencyKey(): string {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new Error('secure_uuid_unavailable')
  }
  const key = crypto.randomUUID()
  if (!isCashEnrollUuidV4(key)) {
    throw new Error('secure_uuid_invalid')
  }
  return key
}

export type CashIdempotencyErrorLike = {
  statusCode?: number
  status?: number
  data?: { code?: string } | null
  response?: { status?: number; _data?: { data?: { code?: string } } }
}

function extractHttpStatus(error: CashIdempotencyErrorLike | null | undefined): number {
  return Number(
    error?.statusCode
    || error?.status
    || error?.response?.status
    || 0,
  )
}

function extractErrorCode(error: CashIdempotencyErrorLike | null | undefined): string {
  const direct = error?.data?.code
  if (typeof direct === 'string') return direct
  const nested = error?.response?._data?.data?.code
  return typeof nested === 'string' ? nested : ''
}

/**
 * Whether the in-memory key must be kept so a user retry reuses the same attempt.
 *
 * Preserve on: network/unknown, 408, 429, 5xx, and idempotency_conflict (409).
 * Do not auto-rotate the key on arbitrary 4xx — only confirmed success (or closing
 * the modal for a new human attempt) retires it.
 */
export function shouldPreserveCashIdempotencyKeyAfterError(
  error: CashIdempotencyErrorLike | null | undefined,
): boolean {
  const status = extractHttpStatus(error)
  if (!status) return true
  if (status === 408 || status === 429) return true
  if (status >= 500) return true
  if (status === 409 && extractErrorCode(error) === 'idempotency_conflict') return true
  // Other confirmed 4xx: keep key until success/close (no blind rotate on retry).
  return true
}

/** @deprecated Prefer shouldPreserve… — retire only on confirmed success / modal close. */
export function shouldRetireCashIdempotencyKeyAfterError(
  error: CashIdempotencyErrorLike | null | undefined,
): boolean {
  return !shouldPreserveCashIdempotencyKeyAfterError(error)
}
