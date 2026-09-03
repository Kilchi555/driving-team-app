import { describe, expect, it } from 'vitest'
import {
  onlineBookingPaymentProvider,
  resolveOnlineBookingPaymentMethod,
} from '../resolve-online-booking-payment-method'

describe('resolveOnlineBookingPaymentMethod', () => {
  it('defaults missing, wallee, cash, and unknown values to wallee', () => {
    for (const requested of [undefined, null, '', 'wallee', 'cash', 'bar', 'twint']) {
      expect(resolveOnlineBookingPaymentMethod({
        requested,
        invoicePaymentsEnabled: false,
      })).toEqual({ method: 'wallee', rejectedInvoice: false })
    }
  })

  it('never keeps cash even when the tenant has invoice enabled', () => {
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'cash',
      invoicePaymentsEnabled: true,
    })).toEqual({ method: 'wallee', rejectedInvoice: false })
  })

  it('honors invoice only when the tenant enabled it', () => {
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'invoice',
      invoicePaymentsEnabled: true,
    })).toEqual({ method: 'invoice', rejectedInvoice: false })
  })

  it('falls back to wallee when invoice is requested but not enabled', () => {
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'invoice',
      invoicePaymentsEnabled: false,
    })).toEqual({ method: 'wallee', rejectedInvoice: true })
  })
})

describe('onlineBookingPaymentProvider', () => {
  it('stores the wallee provider only for online checkout', () => {
    expect(onlineBookingPaymentProvider('wallee')).toBe('wallee')
    expect(onlineBookingPaymentProvider('invoice')).toBeNull()
  })
})
