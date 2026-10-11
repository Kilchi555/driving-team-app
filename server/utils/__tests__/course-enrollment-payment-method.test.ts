import { describe, expect, it } from 'vitest'
import {
  INVOICE_ENROLLMENT_DISABLED_MESSAGE,
  assertInvoiceEnrollmentAllowed,
  resolveNonWalleeEnrollmentMethod,
} from '../course-enrollment-payment-method'

describe('resolveNonWalleeEnrollmentMethod', () => {
  it('uses invoice when the course is locked to Rechnung and the tenant allows it', () => {
    expect(resolveNonWalleeEnrollmentMethod({
      coursePaymentMethod: 'INVOICE',
      invoiceEnabled: true,
    })).toBe('invoice')
    expect(resolveNonWalleeEnrollmentMethod({
      coursePaymentMethod: 'INVOICE',
      invoiceEnabled: true,
    })).not.toBe('cash_on_site')
  })

  it('refuses INVOICE when invoices are disabled (no silent cash rewrite)', () => {
    expect(() => resolveNonWalleeEnrollmentMethod({
      coursePaymentMethod: 'INVOICE',
      invoiceEnabled: false,
    })).toThrow(INVOICE_ENROLLMENT_DISABLED_MESSAGE)
  })

  it('keeps cash courses on cash', () => {
    expect(resolveNonWalleeEnrollmentMethod({
      coursePaymentMethod: 'CASH_ON_SITE',
      invoiceEnabled: true,
    })).toBe('cash_on_site')
  })
})

describe('assertInvoiceEnrollmentAllowed', () => {
  it('allows non-invoice methods when invoices are disabled', () => {
    expect(() => assertInvoiceEnrollmentAllowed({
      coursePaymentMethod: 'WALLEE',
      invoiceEnabled: false,
    })).not.toThrow()
    expect(() => assertInvoiceEnrollmentAllowed({
      coursePaymentMethod: 'CASH_ON_SITE',
      invoiceEnabled: false,
    })).not.toThrow()
  })

  it('blocks INVOICE when invoices are disabled', () => {
    expect(() => assertInvoiceEnrollmentAllowed({
      coursePaymentMethod: 'INVOICE',
      invoiceEnabled: false,
    })).toThrow(INVOICE_ENROLLMENT_DISABLED_MESSAGE)
  })
})
