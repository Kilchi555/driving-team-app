import { describe, expect, it } from 'vitest'
import { isInvoicedPayment, isInvoicedPaymentStatus } from '~/utils/payment-invoiced'

describe('isInvoicedPayment', () => {
  it('treats legacy invoice status as invoiced', () => {
    expect(isInvoicedPaymentStatus('invoice')).toBe(true)
    expect(isInvoicedPayment({ payment_status: 'invoice' })).toBe(true)
  })

  it('treats invoice_id as invoiced even if status is still pending', () => {
    expect(isInvoicedPayment({ payment_status: 'pending', invoice_id: 'inv-1' })).toBe(true)
  })

  it('leaves uninvoiced pending payments open', () => {
    expect(isInvoicedPayment({ payment_status: 'pending', invoice_id: null })).toBe(false)
  })
})
