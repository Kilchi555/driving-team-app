import { describe, expect, it } from 'vitest'
import {
  createSecureCashEnrollIdempotencyKey,
  isCashEnrollUuidV4,
  shouldPreserveCashIdempotencyKeyAfterError,
  shouldRetireCashIdempotencyKeyAfterError,
} from '../cash-course-enroll-idempotency'

describe('cash course enroll client idempotency key', () => {
  it('createSecureCashEnrollIdempotencyKey returns UUID v4 via crypto.randomUUID', () => {
    const key = createSecureCashEnrollIdempotencyKey()
    expect(isCashEnrollUuidV4(key)).toBe(true)
    expect(key).not.toEqual(createSecureCashEnrollIdempotencyKey())
  })

  it('preserves key on network, 408, 429, 5xx, and idempotency_conflict', () => {
    expect(shouldPreserveCashIdempotencyKeyAfterError({})).toBe(true)
    expect(shouldPreserveCashIdempotencyKeyAfterError({ statusCode: 408 })).toBe(true)
    expect(shouldPreserveCashIdempotencyKeyAfterError({ statusCode: 429 })).toBe(true)
    expect(shouldPreserveCashIdempotencyKeyAfterError({ statusCode: 500 })).toBe(true)
    expect(shouldPreserveCashIdempotencyKeyAfterError({ statusCode: 503 })).toBe(true)
    expect(shouldPreserveCashIdempotencyKeyAfterError({
      statusCode: 409,
      data: { code: 'idempotency_conflict' },
    })).toBe(true)
    // Do not blindly rotate on other 4xx either — retire only on success/close.
    expect(shouldPreserveCashIdempotencyKeyAfterError({ statusCode: 400 })).toBe(true)
    expect(shouldPreserveCashIdempotencyKeyAfterError({
      statusCode: 409,
      statusMessage: 'Sie sind bereits für diesen Kurs angemeldet.',
    })).toBe(true)
    expect(shouldRetireCashIdempotencyKeyAfterError({ statusCode: 500 })).toBe(false)
  })
})
