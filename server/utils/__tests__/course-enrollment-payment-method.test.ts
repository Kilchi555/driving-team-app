import { describe, expect, it } from 'vitest'
import { resolveNonWalleeEnrollmentMethod } from '../course-enrollment-payment-method'
import { computeCourseInvoiceTotals } from '../course-enrollment-billing'
import { computeVatAmountRappen } from '../invoice-vat'

describe('resolveNonWalleeEnrollmentMethod', () => {
  it('uses invoice when the course is locked to Rechnung and the tenant allows it', () => {
    expect(resolveNonWalleeEnrollmentMethod({
      coursePaymentMethod: 'INVOICE',
      invoiceEnabled: true,
    })).toBe('invoice')
  })

  it('does not store cash for an invoice course (wrong confirmation email)', () => {
    expect(resolveNonWalleeEnrollmentMethod({
      coursePaymentMethod: 'INVOICE',
      invoiceEnabled: true,
    })).not.toBe('cash_on_site')
  })

  it('falls back to cash when invoice is disabled on the tenant', () => {
    expect(resolveNonWalleeEnrollmentMethod({
      coursePaymentMethod: 'INVOICE',
      invoiceEnabled: false,
    })).toBe('cash_on_site')
  })

  it('keeps cash courses on cash', () => {
    expect(resolveNonWalleeEnrollmentMethod({
      coursePaymentMethod: 'CASH_ON_SITE',
      invoiceEnabled: true,
    })).toBe('cash_on_site')
  })
})

describe('computeCourseInvoiceTotals', () => {
  it('uses the tenant VAT rate on the net, then subtracts the discount', () => {
    const vat = computeVatAmountRappen(10000, 8.1)
    const totals = computeCourseInvoiceTotals(10000, 500, 8.1)
    expect(totals.vatAmountRappen).toBe(vat)
    expect(totals.totalAmountRappen).toBe(10000 + vat - 500)
    expect(totals.discountRappen).toBe(500)
  })

  it('keeps a 0 VAT rate as net minus discount', () => {
    expect(computeCourseInvoiceTotals(10000, 250, 0)).toEqual({
      netRappen: 10000,
      discountRappen: 250,
      vatRate: 0,
      vatAmountRappen: 0,
      totalAmountRappen: 9750,
    })
  })

  it('defaults discount to 0 so an admin amount stays net plus VAT', () => {
    const totals = computeCourseInvoiceTotals(1000, undefined, 0)
    expect(totals.discountRappen).toBe(0)
    expect(totals.totalAmountRappen).toBe(1000)
  })

  it('does not let a discount exceed the net', () => {
    expect(computeCourseInvoiceTotals(1000, 5000, 0).totalAmountRappen).toBe(0)
  })
})
