import { describe, expect, it } from 'vitest'
import { parseManualCreditTopup } from '../manual-credit-topup'

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

  it('requires a vermerk', () => {
    expect(parseManualCreditTopup({ amountRappen: 100, note: '  ' }).ok).toBe(false)
    expect(parseManualCreditTopup({ amountRappen: 100, note: 'ab' }).ok).toBe(false)
    expect(parseManualCreditTopup({ amountRappen: 100, note: null }).ok).toBe(false)
  })
})
