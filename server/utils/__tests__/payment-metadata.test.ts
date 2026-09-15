import { describe, expect, it } from 'vitest'
import {
  inspectWalleeTopupPayment,
  mergePaymentMetadata,
  normalizePaymentMetadata,
  reconstructCharKeyJson,
  toCharKeyMetadata,
} from '../payment-metadata'

const TOPUP_OBJECT = { is_topup: true, topup_amount_rappen: 10000 }
const TOPUP_STRING = JSON.stringify(TOPUP_OBJECT)

describe('normalizePaymentMetadata', () => {
  it('returns {} for null/undefined', () => {
    expect(normalizePaymentMetadata(null)).toEqual({})
    expect(normalizePaymentMetadata(undefined)).toEqual({})
  })

  it('copies a real JSON object', () => {
    expect(normalizePaymentMetadata({ is_topup: true, topup_amount_rappen: 10000 }))
      .toEqual(TOPUP_OBJECT)
  })

  it('parses a JSON string stored in jsonb', () => {
    expect(normalizePaymentMetadata(TOPUP_STRING)).toEqual(TOPUP_OBJECT)
  })

  it('returns {} for a JSON string that is an array', () => {
    expect(normalizePaymentMetadata('["is_topup", true]')).toEqual({})
  })

  it('returns {} for a JSON string that is a primitive', () => {
    expect(normalizePaymentMetadata('true')).toEqual({})
    expect(normalizePaymentMetadata('10000')).toEqual({})
    expect(normalizePaymentMetadata('"is_topup"')).toEqual({})
  })

  it('reconstructs a char-key object from a spread JSON string', () => {
    const charKey = toCharKeyMetadata(TOPUP_OBJECT)
    expect(reconstructCharKeyJson(charKey)).toEqual(TOPUP_OBJECT)
    expect(normalizePaymentMetadata(charKey)).toEqual(TOPUP_OBJECT)
  })

  it('does not treat unrelated objects as top-ups', () => {
    expect(normalizePaymentMetadata({ course_id: 'abc' })).toEqual({ course_id: 'abc' })
    expect(normalizePaymentMetadata('not-json')).toEqual({})
    expect(normalizePaymentMetadata(42)).toEqual({})
    expect(normalizePaymentMetadata(['is_topup'])).toEqual({})
  })

  it('does not invent is_topup from garbage char-keys', () => {
    expect(normalizePaymentMetadata({ 0: 'x', 1: 'y' })).toEqual({ 0: 'x', 1: 'y' })
  })

  it('drops prototype-pollution keys', () => {
    const raw = JSON.parse('{"is_topup":true,"topup_amount_rappen":10000,"__proto__":{"polluted":true},"constructor":{"prototype":{"hacked":true}}}')
    const normalized = normalizePaymentMetadata(raw)
    expect(normalized.is_topup).toBe(true)
    expect(Object.prototype.hasOwnProperty.call(normalized, '__proto__')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(normalized, 'constructor')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'hacked')).toBe(false)
  })

  it('refuses oversized JSON strings', () => {
    const huge = `{"is_topup":true,"pad":"${'x'.repeat(21_000)}"}`
    expect(normalizePaymentMetadata(huge)).toEqual({})
  })
})

describe('mergePaymentMetadata', () => {
  it('never spreads a JSON string', () => {
    const merged = mergePaymentMetadata(TOPUP_STRING, { vat_rate: 0 })
    expect(merged.is_topup).toBe(true)
    expect(merged.topup_amount_rappen).toBe(10000)
    expect(merged.vat_rate).toBe(0)
    expect(merged['0']).toBeUndefined()
  })

  it('Test 4: retry/VAT merge keeps is_topup intact', () => {
    const afterRetry = mergePaymentMetadata(
      JSON.stringify({ is_topup: true, topup_amount_rappen: 10000 }),
      { vat_rate: 0, vat_amount_rappen: 0 },
    )
    expect(inspectWalleeTopupPayment({
      payment_method: 'wallee',
      description: 'Guthaben aufladen – Test',
      metadata: afterRetry,
      total_amount_rappen: 10000,
    })).toMatchObject({ isTopup: true, amountRappen: 10000, source: 'metadata' })
  })
})

describe('inspectWalleeTopupPayment', () => {
  const base = {
    payment_method: 'wallee',
    description: 'Guthaben aufladen – Sophia Niederbacher',
    total_amount_rappen: 10000,
    lesson_price_rappen: 10000,
    products_price_rappen: 0,
    appointment_id: null,
    invoice_id: null,
    course_registration_id: null,
  }

  it('detects object metadata', () => {
    expect(inspectWalleeTopupPayment({ ...base, metadata: TOPUP_OBJECT })).toMatchObject({
      isTopup: true,
      amountRappen: 10000,
      source: 'metadata',
    })
  })

  it('detects legacy JSON-string metadata', () => {
    expect(inspectWalleeTopupPayment({ ...base, metadata: TOPUP_STRING })).toMatchObject({
      isTopup: true,
      amountRappen: 10000,
      source: 'legacy_string',
    })
  })

  it('detects reconstructed char-key metadata', () => {
    expect(inspectWalleeTopupPayment({ ...base, metadata: toCharKeyMetadata(TOPUP_OBJECT) })).toMatchObject({
      isTopup: true,
      amountRappen: 10000,
      source: 'char_key',
    })
  })

  it('falls back to a unique Guthaben-aufladen description only for damaged metadata', () => {
    expect(inspectWalleeTopupPayment({
      ...base,
      metadata: { '0': '{', receipt_sent_at: 'x', vat_rate: 0 },
    })).toMatchObject({
      isTopup: true,
      amountRappen: 10000,
      source: 'description',
    })
  })

  it('does not treat a shop payment as a top-up via a spoofed description', () => {
    expect(inspectWalleeTopupPayment({
      payment_method: 'wallee',
      description: 'Guthaben aufladen – Angreifer',
      metadata: { products: [{ id: 'prod-1', quantity: 1 }] },
      total_amount_rappen: 10000,
      lesson_price_rappen: 0,
      products_price_rappen: 10000,
      appointment_id: null,
    })).toMatchObject({ isTopup: false, reason: 'not_topup' })
  })

  it('does not treat an admin-fee-only shop payment as a top-up', () => {
    expect(inspectWalleeTopupPayment({
      payment_method: 'wallee',
      description: 'Guthaben aufladen – Angreifer',
      metadata: { products: [] },
      total_amount_rappen: 500,
      lesson_price_rappen: 0,
      products_price_rappen: 0,
      appointment_id: null,
    })).toMatchObject({ isTopup: false, reason: 'not_topup' })
  })

  it('does not treat a lesson payment as a top-up via a spoofed description', () => {
    expect(inspectWalleeTopupPayment({
      ...base,
      description: 'Guthaben aufladen – Fahrstunde',
      metadata: {},
      appointment_id: 'appt-1',
    })).toMatchObject({ isTopup: false, reason: 'not_topup' })
  })

  it('does not classify a payment with missing payment_method as a top-up', () => {
    expect(inspectWalleeTopupPayment({
      ...base,
      payment_method: null,
      metadata: TOPUP_OBJECT,
    })).toMatchObject({ isTopup: false, reason: 'not_wallee' })
  })

  it('does not credit a normal lesson payment', () => {
    expect(inspectWalleeTopupPayment({
      payment_method: 'wallee',
      description: 'Fahrstunde',
      metadata: { appointment_id: 'a' },
      total_amount_rappen: 10000,
      lesson_price_rappen: 10000,
      appointment_id: 'appt-1',
    })).toMatchObject({ isTopup: false, reason: 'not_topup' })
  })

  it('does not credit Umair-style payment_method=credit', () => {
    expect(inspectWalleeTopupPayment({
      ...base,
      payment_method: 'credit',
      metadata: TOPUP_OBJECT,
    })).toMatchObject({ isTopup: false, reason: 'payment_method_credit' })
  })

  it('does not classify by amount or lesson_price alone', () => {
    expect(inspectWalleeTopupPayment({
      payment_method: 'wallee',
      description: 'Fahrstunde B Automatik',
      metadata: {},
      total_amount_rappen: 10000,
      lesson_price_rappen: 10000,
    })).toMatchObject({ isTopup: false })
  })

  it('refuses a metadata/total mismatch', () => {
    expect(inspectWalleeTopupPayment({
      ...base,
      metadata: { is_topup: true, topup_amount_rappen: 50000 },
      total_amount_rappen: 10000,
    })).toMatchObject({ isTopup: true, amountRappen: null, reason: 'invalid_amount' })
  })

  it('does not treat a course payment as a top-up via description', () => {
    expect(inspectWalleeTopupPayment({
      ...base,
      metadata: { course_id: 'course-1' },
      course_registration_id: null,
    })).toMatchObject({ isTopup: false })
  })
})
