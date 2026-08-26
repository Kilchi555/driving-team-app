import { describe, expect, it } from 'vitest'
import {
  invoiceTotalsInclusive,
  normalizeVatRate,
  splitGrossVat,
  vatIncludedInGross,
} from '../../../utils/vat'

describe('splitGrossVat', () => {
  it('keeps 0% tenants unchanged (driving school)', () => {
    expect(splitGrossVat(18000, 0)).toEqual({
      net: 18000,
      vat: 0,
      gross: 18000,
      rate: 0,
    })
  })

  it('extracts 8.1% from CHF 180 without changing the charged price', () => {
    const split = splitGrossVat(18000, 8.1)
    expect(split.gross).toBe(18000)
    expect(split.net + split.vat).toBe(18000)
    expect(split.vat).toBe(1349)
    expect(split.net).toBe(16651)
  })

  it('extracts 8.1% from CHF 100', () => {
    expect(vatIncludedInGross(10000, 8.1)).toBe(749)
  })

  it('returns zero VAT for empty or invalid amounts', () => {
    expect(splitGrossVat(0, 8.1).vat).toBe(0)
    expect(splitGrossVat(-100, 8.1).gross).toBe(0)
    expect(splitGrossVat(18000, Number.NaN).vat).toBe(0)
  })

  it('never lets VAT exceed gross', () => {
    const split = splitGrossVat(1, 8.1)
    expect(split.vat).toBeLessThanOrEqual(split.gross)
    expect(split.net + split.vat).toBe(split.gross)
  })
})

describe('invoiceTotalsInclusive', () => {
  it('matches the old exclusive total when the rate is 0%', () => {
    const totals = invoiceTotalsInclusive(18000, 0, 1000)
    expect(totals.total_amount_rappen).toBe(17000)
    expect(totals.vat_amount_rappen).toBe(0)
    expect(totals.subtotal_rappen).toBe(17000)
  })

  it('does not add VAT on top of a charged 8.1% amount', () => {
    const totals = invoiceTotalsInclusive(18000, 8.1, 0)
    expect(totals.total_amount_rappen).toBe(18000)
    expect(totals.vat_amount_rappen).toBe(1349)
    expect(totals.subtotal_rappen).toBe(16651)
  })

  it('extracts VAT from the amount after discount', () => {
    const totals = invoiceTotalsInclusive(18000, 8.1, 1800)
    expect(totals.total_amount_rappen).toBe(16200)
    expect(totals.vat_amount_rappen + totals.subtotal_rappen).toBe(16200)
  })

  it('keeps PDF math consistent: (net + discount) - discount + vat = total', () => {
    const discount = 1800
    const totals = invoiceTotalsInclusive(18000, 8.1, discount)
    const storedSubtotal = totals.subtotal_rappen + discount
    expect(storedSubtotal - discount + totals.vat_amount_rappen).toBe(totals.total_amount_rappen)
  })
})

describe('normalizeVatRate', () => {
  it('treats 8.1 as 8.1 and junk as 0', () => {
    expect(normalizeVatRate(8.1)).toBe(8.1)
    expect(normalizeVatRate(null)).toBe(0)
    expect(normalizeVatRate(-1)).toBe(0)
  })
})
