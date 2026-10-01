import { describe, expect, it } from 'vitest'
import { parseManualCreditTopup, parseManualTopupIdempotencyKey } from '../manual-credit-topup'

describe('parseManualCreditTopup', () => {
  it('accepts a positive rappen amount and a note', () => {
    expect(parseManualCreditTopup({ amountRappen: 1500, note: '  Bar erhalten  ' })).toEqual({
      ok: true,
      amountRappen: 1500,
      note: 'Bar erhalten',
    })
  })

  it('rejects fractional, zero, and oversized amounts', () => {
    expect(parseManualCreditTopup({ amountRappen: 10.5, note: 'Vermerk' }).ok).toBe(false)
    expect(parseManualCreditTopup({ amountRappen: 0, note: 'Vermerk' }).ok).toBe(false)
    expect(parseManualCreditTopup({ amountRappen: -100, note: 'Vermerk' }).ok).toBe(false)
    expect(parseManualCreditTopup({ amountRappen: 1_000_001, note: 'Vermerk' }).ok).toBe(false)
  })

  it('still allows exactly CHF 10000', () => {
    expect(parseManualCreditTopup({ amountRappen: 1_000_000, note: 'Bar erhalten' })).toEqual({
      ok: true,
      amountRappen: 1_000_000,
      note: 'Bar erhalten',
    })
  })

  it('rejects CHF 10000.01', () => {
    expect(parseManualCreditTopup({ amountRappen: 1_000_001, note: 'Bar erhalten' }).ok).toBe(false)
  })

  it('accepts a UUID idempotency key and rejects an empty or invented key', () => {
    expect(parseManualTopupIdempotencyKey('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toEqual({
      ok: true,
      key: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    })
    expect(parseManualTopupIdempotencyKey('').ok).toBe(false)
    expect(parseManualTopupIdempotencyKey('   ').ok).toBe(false)
    expect(parseManualTopupIdempotencyKey(null).ok).toBe(false)
    expect(parseManualTopupIdempotencyKey('amount:100:user').ok).toBe(false)
  })

  it('requires a vermerk', () => {
    expect(parseManualCreditTopup({ amountRappen: 100, note: '  ' }).ok).toBe(false)
    expect(parseManualCreditTopup({ amountRappen: 100, note: 'ab' }).ok).toBe(false)
    expect(parseManualCreditTopup({ amountRappen: 100, note: null }).ok).toBe(false)
  })
})
