import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  InvalidEventTypePaymentMethodError,
  parseEventTypePaymentMethod,
  resolveAdminPaymentPrefill,
  resolveAppointmentPaymentMethod,
  snapshotPaymentMethod,
} from '../resolve-appointment-payment-method'
import {
  onlineBookingDefaultFromEventType,
  resolveOnlineBookingPaymentMethod,
  type OnlineBookingPaymentPolicy,
} from '../resolve-online-booking-payment-method'

const walleeOnly: OnlineBookingPaymentPolicy = {
  walleeEnabled: true,
  invoiceEnabled: false,
  cashEnabledForCustomers: false,
  defaultMethod: 'wallee',
}

describe('resolveAppointmentPaymentMethod', () => {
  it('inherits wallee when the event type is null', () => {
    expect(resolveAppointmentPaymentMethod({
      tenantDefaultPaymentMethod: 'wallee',
      eventTypePaymentMethod: null,
    })).toBe('wallee')
  })

  it('uses a cash event-type override over wallee', () => {
    expect(resolveAppointmentPaymentMethod({
      tenantDefaultPaymentMethod: 'wallee',
      eventTypePaymentMethod: 'cash',
    })).toBe('cash')
  })

  it('inherits invoice when the event type is null', () => {
    expect(resolveAppointmentPaymentMethod({
      tenantDefaultPaymentMethod: 'invoice',
      eventTypePaymentMethod: null,
    })).toBe('invoice')
  })

  it('uses a wallee event-type override over invoice', () => {
    expect(resolveAppointmentPaymentMethod({
      tenantDefaultPaymentMethod: 'invoice',
      eventTypePaymentMethod: 'wallee',
    })).toBe('wallee')
  })

  it('rejects an invalid event-type value', () => {
    expect(() => parseEventTypePaymentMethod('credit')).toThrow(InvalidEventTypePaymentMethodError)
    expect(() => resolveAppointmentPaymentMethod({
      tenantDefaultPaymentMethod: 'wallee',
      eventTypePaymentMethod: 'twint',
    })).toThrow(InvalidEventTypePaymentMethodError)
  })

  it('keeps the existing missing-tenant fallback of wallee', () => {
    expect(resolveAppointmentPaymentMethod({
      tenantDefaultPaymentMethod: undefined,
      eventTypePaymentMethod: null,
    })).toBe('wallee')
  })
})

describe('payment snapshot does not follow later setting changes', () => {
  it('keeps wallee after the tenant default becomes invoice', () => {
    const created = snapshotPaymentMethod(resolveAppointmentPaymentMethod({
      tenantDefaultPaymentMethod: 'wallee',
      eventTypePaymentMethod: null,
    }))
    resolveAppointmentPaymentMethod({
      tenantDefaultPaymentMethod: 'invoice',
      eventTypePaymentMethod: null,
    })
    expect(created.payment_method).toBe('wallee')
  })

  it('keeps cash after the event type later changes to invoice', () => {
    const created = snapshotPaymentMethod(resolveAppointmentPaymentMethod({
      tenantDefaultPaymentMethod: 'wallee',
      eventTypePaymentMethod: 'cash',
    }))
    resolveAppointmentPaymentMethod({
      tenantDefaultPaymentMethod: 'wallee',
      eventTypePaymentMethod: 'invoice',
    })
    expect(created.payment_method).toBe('cash')
  })
})

describe('admin booking prefill priority', () => {
  it('keeps an existing payment snapshot, including credit', () => {
    expect(resolveAdminPaymentPrefill({
      existingPaymentMethod: 'credit',
      preferredPaymentMethod: 'cash',
      eventTypePaymentMethod: 'invoice',
      tenantDefaultPaymentMethod: 'wallee',
    })).toBe('credit')
    expect(resolveAdminPaymentPrefill({
      existingPaymentMethod: 'wallee',
      eventTypePaymentMethod: 'cash',
      tenantDefaultPaymentMethod: 'invoice',
    })).toBe('wallee')
  })

  it('uses the customer preference before the event-type default', () => {
    expect(resolveAdminPaymentPrefill({
      preferredPaymentMethod: 'invoice',
      eventTypePaymentMethod: 'cash',
      tenantDefaultPaymentMethod: 'wallee',
    })).toBe('invoice')
  })

  it('uses the event-type override when there is no preference and no payment', () => {
    expect(resolveAdminPaymentPrefill({
      preferredPaymentMethod: null,
      eventTypePaymentMethod: 'cash',
      tenantDefaultPaymentMethod: 'wallee',
    })).toBe('cash')
  })

  it('falls back to the tenant default', () => {
    expect(resolveAdminPaymentPrefill({
      eventTypePaymentMethod: null,
      tenantDefaultPaymentMethod: 'invoice',
    })).toBe('invoice')
  })
})

describe('public booking keeps the tenant allowlist', () => {
  it('uses the event-type override when that method is allowed', () => {
    const policy: OnlineBookingPaymentPolicy = {
      ...walleeOnly,
      cashEnabledForCustomers: true,
      defaultMethod: 'wallee',
    }
    expect(onlineBookingDefaultFromEventType(policy, 'cash')).toBe('cash')
    expect(resolveOnlineBookingPaymentMethod({
      policy,
      eventTypePaymentMethod: 'cash',
    }).method).toBe('cash')
  })

  it('does not let an event-type invoice override bypass a wallee-only policy', () => {
    expect(onlineBookingDefaultFromEventType(walleeOnly, 'invoice')).toBe('wallee')
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'invoice',
      policy: walleeOnly,
      eventTypePaymentMethod: 'invoice',
    })).toMatchObject({ method: 'wallee', rejectedRequest: true })
  })

  it('keeps an allowed explicit customer choice over the event-type default', () => {
    const policy: OnlineBookingPaymentPolicy = {
      walleeEnabled: true,
      invoiceEnabled: true,
      cashEnabledForCustomers: true,
      defaultMethod: 'wallee',
    }
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'invoice',
      policy,
      eventTypePaymentMethod: 'cash',
    }).method).toBe('invoice')
  })

  it('rejects a disallowed customer method even when it matches the event type', () => {
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'cash',
      policy: walleeOnly,
      eventTypePaymentMethod: 'cash',
    })).toMatchObject({ method: 'wallee', rejectedRequest: true })
  })
})

describe('free event types and credit stay on their existing paths', () => {
  it('chargeability ignores payment_method and still reads require_payment', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/utils/event-type-charge.ts'), 'utf8')
    expect(src).toContain('require_payment')
    expect(src).not.toContain('payment_method')
  })

  it('appointment save still creates a payment only for a paid quote and still accepts credit', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/api/appointments/save.post.ts'), 'utf8')
    expect(src).toContain("if (staffQuote.kind === 'paid')")
    expect(src).toContain("'credit'")
  })

  it('does not retarget auto-invoice or course payment columns', () => {
    const migration = readFileSync(resolve(process.cwd(), 'migrations/20260924_event_types_payment_method.sql'), 'utf8')
    expect(migration).not.toMatch(/UPDATE\s+(payments|appointments|event_types|courses)/i)
    expect(migration).toContain('event_types')
    expect(migration).not.toContain('invoice_timing')
  })
})
