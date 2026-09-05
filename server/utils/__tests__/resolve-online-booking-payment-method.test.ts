import { describe, expect, it } from 'vitest'
import {
  onlineBookingAllowedMethods,
  onlineBookingFallbackMethod,
  onlineBookingPaymentProvider,
  paymentPolicyFromTenantSettings,
  resolveOnlineBookingPaymentMethod,
  type OnlineBookingPaymentPolicy,
} from '../resolve-online-booking-payment-method'

const walleeOnly: OnlineBookingPaymentPolicy = {
  walleeEnabled: true,
  invoiceEnabled: false,
  cashEnabledForCustomers: false,
  defaultMethod: 'wallee',
}

describe('paymentPolicyFromTenantSettings', () => {
  it('keeps cash staff-only off the public allowlist', () => {
    expect(paymentPolicyFromTenantSettings({
      settings: {
        cash_payments_enabled: true,
        cash_payment_visibility: 'staff_only',
        invoice_payments_enabled: false,
        default_payment_method: 'wallee',
      },
      walleeEnabled: true,
    })).toEqual(walleeOnly)
  })

  it('allows cash only when customers can see it', () => {
    const policy = paymentPolicyFromTenantSettings({
      settings: {
        cash_payments_enabled: true,
        cash_payment_visibility: 'customers_and_staff',
        invoice_payments_enabled: true,
        default_payment_method: 'cash',
      },
      walleeEnabled: true,
    })
    expect(policy.cashEnabledForCustomers).toBe(true)
    expect(policy.invoiceEnabled).toBe(true)
    expect(policy.defaultMethod).toBe('cash')
    expect(onlineBookingAllowedMethods(policy)).toEqual(['wallee', 'invoice', 'cash'])
  })

  it('treats missing Wallee flag as enabled', () => {
    const policy = paymentPolicyFromTenantSettings({
      settings: {},
      walleeEnabled: null,
    })
    expect(policy.walleeEnabled).toBe(true)
    expect(onlineBookingAllowedMethods(policy)).toEqual(['wallee'])
  })
})

describe('resolveOnlineBookingPaymentMethod', () => {
  it('defaults Driving-Team-style tenants to wallee and rejects cash/invoice', () => {
    expect(resolveOnlineBookingPaymentMethod({
      requested: undefined,
      policy: walleeOnly,
    })).toMatchObject({ method: 'wallee', rejectedRequest: false })
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'cash',
      policy: walleeOnly,
    })).toMatchObject({ method: 'wallee', rejectedRequest: true })
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'invoice',
      policy: walleeOnly,
    })).toMatchObject({ method: 'wallee', rejectedRequest: true })
  })

  it('honors invoice and cash when the tenant enabled them for customers', () => {
    const policy: OnlineBookingPaymentPolicy = {
      walleeEnabled: true,
      invoiceEnabled: true,
      cashEnabledForCustomers: true,
      defaultMethod: 'wallee',
    }
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'invoice',
      policy,
    }).method).toBe('invoice')
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'cash',
      policy,
    }).method).toBe('cash')
  })

  it('uses the tenant default when it is allowed and nothing was requested', () => {
    const policy: OnlineBookingPaymentPolicy = {
      walleeEnabled: true,
      invoiceEnabled: true,
      cashEnabledForCustomers: true,
      defaultMethod: 'invoice',
    }
    expect(onlineBookingFallbackMethod(policy)).toBe('invoice')
    expect(resolveOnlineBookingPaymentMethod({ policy }).method).toBe('invoice')
  })

  it('uses the tenant default even when that method is not a customer choice', () => {
    const sara: OnlineBookingPaymentPolicy = {
      walleeEnabled: false,
      invoiceEnabled: false,
      cashEnabledForCustomers: false,
      defaultMethod: 'cash',
    }
    expect(onlineBookingAllowedMethods(sara)).toEqual([])
    expect(onlineBookingFallbackMethod(sara)).toBe('cash')
    expect(resolveOnlineBookingPaymentMethod({ policy: sara }).method).toBe('cash')
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'wallee',
      policy: sara,
    })).toMatchObject({ method: 'cash', rejectedRequest: true })
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'cash',
      policy: sara,
    })).toMatchObject({ method: 'cash', rejectedRequest: false })
  })

  it('can run a cash-only public booking when Wallee is off', () => {
    const policy: OnlineBookingPaymentPolicy = {
      walleeEnabled: false,
      invoiceEnabled: false,
      cashEnabledForCustomers: true,
      defaultMethod: 'cash',
    }
    expect(onlineBookingAllowedMethods(policy)).toEqual(['cash'])
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'wallee',
      policy,
    })).toMatchObject({ method: 'cash', rejectedRequest: true })
  })
})

describe('onlineBookingPaymentProvider', () => {
  it('stores the wallee provider only for online checkout', () => {
    expect(onlineBookingPaymentProvider('wallee')).toBe('wallee')
    expect(onlineBookingPaymentProvider('invoice')).toBeNull()
    expect(onlineBookingPaymentProvider('cash')).toBeNull()
  })
})
