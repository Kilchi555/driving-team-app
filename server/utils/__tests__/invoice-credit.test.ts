import { describe, expect, it } from 'vitest'
import {
  resolveInvoiceLineCreditRappen,
  sumInvoiceCreditRappen,
  toInvoiceRappen,
} from '../invoice-credit'

describe('toInvoiceRappen', () => {
  it('keeps integer rappen', () => {
    expect(toInvoiceRappen(19000)).toBe(19000)
  })

  it('converts CHF decimals that leaked into rappen fields', () => {
    expect(toInvoiceRappen(190.5)).toBe(19050)
  })
})

describe('resolveInvoiceLineCreditRappen', () => {
  it('returns 0 unless the line is flagged', () => {
    expect(resolveInvoiceLineCreditRappen({
      credit_to_wallet: false,
      total_price_rappen: 19000,
    })).toBe(0)
  })

  it('uses product credit amount times quantity', () => {
    expect(resolveInvoiceLineCreditRappen(
      { credit_to_wallet: true, quantity: 2, total_price_rappen: 30000 },
      { id: 'p1', is_credit_product: true, credit_amount_rappen: 20000 }
    )).toBe(40000)
  })

  it('falls back to the net line total for free-text amounts', () => {
    expect(resolveInvoiceLineCreditRappen({
      credit_to_wallet: true,
      total_price_rappen: 19000,
      quantity: 1,
    })).toBe(19000)
  })

  it('keeps an explicit snapshot if no credit product is loaded', () => {
    expect(resolveInvoiceLineCreditRappen({
      credit_to_wallet: true,
      credit_amount_rappen: 15000,
      total_price_rappen: 19000,
    })).toBe(15000)
  })
})

describe('sumInvoiceCreditRappen', () => {
  it('sums only flagged snapshots', () => {
    expect(sumInvoiceCreditRappen([
      { credit_to_wallet: true, credit_amount_rappen: 10000 },
      { credit_to_wallet: false, credit_amount_rappen: 5000 },
      { credit_to_wallet: true, credit_amount_rappen: 2500 },
    ])).toBe(12500)
  })
})
