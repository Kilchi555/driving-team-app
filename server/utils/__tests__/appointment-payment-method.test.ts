import { describe, expect, it } from 'vitest'
import {
  classifyStaffPaymentChoice,
  eventTypePaymentMethodForTenant,
  InvalidEventTypePaymentMethodError,
  InvalidStaffPaymentMethodError,
  parseEventTypePaymentMethod,
  resolveAppointmentPaymentMethod,
  resolvePublicAppointmentPaymentMethod,
} from '../appointment-payment-method'
import type { OnlineBookingPaymentPolicy } from '../resolve-online-booking-payment-method'

const walleeOnly: OnlineBookingPaymentPolicy = {
  walleeEnabled: true,
  invoiceEnabled: false,
  cashEnabledForCustomers: false,
  defaultMethod: 'wallee',
}

const allCustomerMethods: OnlineBookingPaymentPolicy = {
  walleeEnabled: true,
  invoiceEnabled: true,
  cashEnabledForCustomers: true,
  defaultMethod: 'wallee',
}

describe('resolveAppointmentPaymentMethod', () => {
  it('inherits wallee when the event type is null', () => {
    expect(resolveAppointmentPaymentMethod('wallee', null)).toBe('wallee')
  })

  it('uses an explicit cash override over the tenant default', () => {
    expect(resolveAppointmentPaymentMethod('wallee', 'cash')).toBe('cash')
  })

  it('inherits invoice when the event type is null', () => {
    expect(resolveAppointmentPaymentMethod('invoice', null)).toBe('invoice')
  })

  it('uses an explicit wallee override over an invoice tenant default', () => {
    expect(resolveAppointmentPaymentMethod('invoice', 'wallee')).toBe('wallee')
  })

  it('rejects an invalid event-type value, including credit', () => {
    expect(() => parseEventTypePaymentMethod('credit')).toThrow(InvalidEventTypePaymentMethodError)
    expect(() => resolveAppointmentPaymentMethod('wallee', 'WALLEE')).toThrow(InvalidEventTypePaymentMethodError)
    expect(() => resolveAppointmentPaymentMethod('wallee', 'CASH_ON_SITE')).toThrow(InvalidEventTypePaymentMethodError)
  })

  it('falls back to wallee for an invalid tenant default', () => {
    expect(resolveAppointmentPaymentMethod('bitcoin', null)).toBe('wallee')
    expect(resolveAppointmentPaymentMethod(undefined, '')).toBe('wallee')
  })
})

describe('payment snapshot', () => {
  it('keeps the stored method after the tenant default changes', () => {
    const stored = resolveAppointmentPaymentMethod('wallee', null)
    const laterDefault = resolveAppointmentPaymentMethod('invoice', null)
    expect(stored).toBe('wallee')
    expect(laterDefault).toBe('invoice')
    expect(stored).toBe('wallee')
  })

  it('does not rewrite a stored snapshot when the event type override changes', () => {
    const stored = resolveAppointmentPaymentMethod('wallee', 'cash')
    const next = resolveAppointmentPaymentMethod('wallee', 'invoice')
    expect(stored).toBe('cash')
    expect(next).toBe('invoice')
  })
})

describe('classifyStaffPaymentChoice', () => {
  it('inherits on create when the client omits the method', () => {
    expect(classifyStaffPaymentChoice(undefined, 'create')).toEqual({ kind: 'inherit' })
    expect(classifyStaffPaymentChoice('', 'create')).toEqual({ kind: 'inherit' })
  })

  it('does not recompute the snapshot when edit omits the method', () => {
    expect(classifyStaffPaymentChoice(undefined, 'edit')).toEqual({ kind: 'omit' })
  })

  it('keeps credit as an explicit payment action', () => {
    expect(classifyStaffPaymentChoice('credit', 'create')).toEqual({ kind: 'explicit', method: 'credit' })
  })

  it('maps existing staff aliases and rejects unknown values', () => {
    expect(classifyStaffPaymentChoice('bar', 'create')).toEqual({ kind: 'explicit', method: 'cash' })
    expect(() => classifyStaffPaymentChoice('bitcoin', 'create')).toThrow(InvalidStaffPaymentMethodError)
  })
})

describe('resolvePublicAppointmentPaymentMethod', () => {
  it('uses the tenant default when the event type inherits', () => {
    expect(resolvePublicAppointmentPaymentMethod({
      tenantDefault: 'wallee',
      eventTypePaymentMethod: null,
      requested: undefined,
      policy: walleeOnly,
    }).method).toBe('wallee')
  })

  it('uses an allowed event-type override as the public default', () => {
    expect(resolvePublicAppointmentPaymentMethod({
      tenantDefault: 'wallee',
      eventTypePaymentMethod: 'invoice',
      requested: undefined,
      policy: allCustomerMethods,
    }).method).toBe('invoice')
  })

  it('keeps a customer-allowed method when it differs from the override', () => {
    const resolved = resolvePublicAppointmentPaymentMethod({
      tenantDefault: 'wallee',
      eventTypePaymentMethod: 'invoice',
      requested: 'cash',
      policy: allCustomerMethods,
    })
    expect(resolved).toMatchObject({ method: 'cash', rejectedRequest: false })
  })

  it('rejects a customer method the public policy does not allow', () => {
    const resolved = resolvePublicAppointmentPaymentMethod({
      tenantDefault: 'wallee',
      eventTypePaymentMethod: null,
      requested: 'cash',
      policy: walleeOnly,
    })
    expect(resolved).toMatchObject({ method: 'wallee', rejectedRequest: true })
  })

  it('does not let an event-type override unlock a disallowed public method', () => {
    const resolved = resolvePublicAppointmentPaymentMethod({
      tenantDefault: 'wallee',
      eventTypePaymentMethod: 'cash',
      requested: 'cash',
      policy: walleeOnly,
    })
    expect(resolved.allowed).toEqual(['wallee'])
    expect(resolved).toMatchObject({ method: 'wallee', rejectedRequest: true })
  })
})

describe('eventTypePaymentMethodForTenant', () => {
  const rows = [
    { tenant_id: 'tenant-a', code: 'lesson', payment_method: null },
    { tenant_id: 'tenant-b', code: 'lesson', payment_method: 'cash' },
  ]

  it('does not read another tenant event type', () => {
    expect(eventTypePaymentMethodForTenant(rows, 'tenant-a', 'lesson')).toBeNull()
    expect(resolveAppointmentPaymentMethod('wallee', eventTypePaymentMethodForTenant(rows, 'tenant-a', 'lesson'))).toBe('wallee')
  })

  it('reads only the matching tenant row', () => {
    expect(eventTypePaymentMethodForTenant(rows, 'tenant-b', 'lesson')).toBe('cash')
  })
})
