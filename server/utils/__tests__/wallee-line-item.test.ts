import { describe, expect, it } from 'vitest'
import { buildWalleeTaxedLineItem, mergeVatIntoMetadata } from '../wallee-line-item'

describe('buildWalleeTaxedLineItem', () => {
  it('keeps taxRate 0 for driving schools', () => {
    const line = buildWalleeTaxedLineItem({
      name: 'Fahrstunde',
      amountIncludingTaxChf: 90,
      vatRatePercent: 0,
    })
    expect(line.taxRate).toBe(0)
    expect(line.amountIncludingTax).toBe(90)
  })

  it('passes the tenant rate through without changing the charged amount', () => {
    const line = buildWalleeTaxedLineItem({
      name: 'Fernbehandlung',
      amountIncludingTaxChf: 180,
      vatRatePercent: 8.1,
    })
    expect(line.taxRate).toBe(8.1)
    expect(line.amountIncludingTax).toBe(180)
  })
})

describe('mergeVatIntoMetadata', () => {
  it('keeps existing metadata keys', () => {
    expect(mergeVatIntoMetadata({ course_id: 'x' }, { vatRate: 8.1, vatAmountRappen: 1349 }))
      .toEqual({ course_id: 'x', vat_rate: 8.1, vat_amount_rappen: 1349 })
  })
})
