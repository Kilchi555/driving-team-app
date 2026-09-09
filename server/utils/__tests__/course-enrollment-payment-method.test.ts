import { describe, expect, it } from 'vitest'
import { resolveNonWalleeEnrollmentMethod } from '../course-enrollment-payment-method'

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
