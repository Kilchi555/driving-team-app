import { describe, expect, it } from 'vitest'
import { parsePaidPriceChf, parsePriceChf, normalizeSwissDecimalString } from '../parse-price-chf'

describe('parsePriceChf — Swiss decimal UX', () => {
  it('21. malformed empty price cannot become paid CHF 0', () => {
    expect(parsePriceChf('')).toEqual({ ok: false, error: 'EMPTY' })
    expect(parsePriceChf('   ')).toEqual({ ok: false, error: 'EMPTY' })
    expect(parsePriceChf(null)).toEqual({ ok: false, error: 'EMPTY' })
    expect(parsePriceChf(undefined)).toEqual({ ok: false, error: 'EMPTY' })
    expect(parsePaidPriceChf('')).toEqual({ ok: false, error: 'EMPTY' })
    expect(parsePaidPriceChf(0)).toEqual({ ok: false, error: 'INVALID' })
    expect(parsePaidPriceChf('0')).toEqual({ ok: false, error: 'INVALID' })
    expect(parsePaidPriceChf('0,00')).toEqual({ ok: false, error: 'INVALID' })
  })

  it('22. invalid negative price rejected', () => {
    expect(parsePriceChf(-1)).toEqual({ ok: false, error: 'NEGATIVE' })
    expect(parsePriceChf('-80')).toEqual({ ok: false, error: 'NEGATIVE' })
    expect(parsePaidPriceChf('-1')).toEqual({ ok: false, error: 'NEGATIVE' })
  })

  it('23. valid Swiss decimal format follows intended parser semantics', () => {
    expect(parsePriceChf('80,5')).toEqual({ ok: true, chf: 80.5 })
    expect(parsePriceChf('80.5')).toEqual({ ok: true, chf: 80.5 })
    expect(parsePriceChf('95')).toEqual({ ok: true, chf: 95 })
    expect(parsePriceChf("1'200.50")).toEqual({ ok: true, chf: 1200.5 })
    expect(parsePriceChf('1 200,50')).toEqual({ ok: true, chf: 1200.5 })
    expect(parsePaidPriceChf('80,5')).toEqual({ ok: true, chf: 80.5 })
  })

  it('explicit free CHF 0 is valid on parsePriceChf but not on parsePaidPriceChf', () => {
    expect(parsePriceChf(0)).toEqual({ ok: true, chf: 0 })
    expect(parsePriceChf('0,00')).toEqual({ ok: true, chf: 0 })
  })

  it('rejects NaN / junk without collapsing to 0', () => {
    expect(parsePriceChf(NaN)).toEqual({ ok: false, error: 'INVALID' })
    expect(parsePriceChf('abc')).toEqual({ ok: false, error: 'INVALID' })
    expect(normalizeSwissDecimalString('80,5')).toBe('80.5')
  })
})
