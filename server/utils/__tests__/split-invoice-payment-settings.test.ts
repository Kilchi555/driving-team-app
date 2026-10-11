/**
 * Split public invoice controls: courses vs individual appointments.
 * Documents legacy fallback + fail-closed appointment invoice semantics.
 * Does not touch Production.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  APPOINTMENT_INVOICE_PAYMENTS_KEY,
  COURSE_INVOICE_PAYMENTS_KEY,
  LEGACY_INVOICE_PAYMENTS_KEY,
  hasExplicitPaymentSetting,
  resolveCourseInvoicePaymentsEnabled,
  resolveIndividualAppointmentInvoicePaymentsEnabled,
} from '../tenant-default-payment-method'
import {
  APPOINTMENT_INVOICE_PAYMENT_DISABLED_MESSAGE,
  paymentPolicyFromTenantSettings,
  resolveOnlineBookingPaymentMethod,
} from '../resolve-online-booking-payment-method'
import { assertInvoiceEnrollmentAllowed } from '../course-enrollment-payment-method'

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

describe('scoped invoice payment resolution (legacy fallback)', () => {
  it('1. course enabled / appointment disabled', () => {
    const settings = {
      [COURSE_INVOICE_PAYMENTS_KEY]: true,
      [APPOINTMENT_INVOICE_PAYMENTS_KEY]: false,
      [LEGACY_INVOICE_PAYMENTS_KEY]: true,
    }
    expect(resolveCourseInvoicePaymentsEnabled(settings)).toBe(true)
    expect(resolveIndividualAppointmentInvoicePaymentsEnabled(settings)).toBe(false)
  })

  it('2. course disabled / appointment enabled', () => {
    const settings = {
      [COURSE_INVOICE_PAYMENTS_KEY]: false,
      [APPOINTMENT_INVOICE_PAYMENTS_KEY]: true,
      [LEGACY_INVOICE_PAYMENTS_KEY]: false,
    }
    expect(resolveCourseInvoicePaymentsEnabled(settings)).toBe(false)
    expect(resolveIndividualAppointmentInvoicePaymentsEnabled(settings)).toBe(true)
  })

  it('3. both enabled', () => {
    const settings = {
      [COURSE_INVOICE_PAYMENTS_KEY]: true,
      [APPOINTMENT_INVOICE_PAYMENTS_KEY]: true,
    }
    expect(resolveCourseInvoicePaymentsEnabled(settings)).toBe(true)
    expect(resolveIndividualAppointmentInvoicePaymentsEnabled(settings)).toBe(true)
  })

  it('4. both disabled', () => {
    const settings = {
      [COURSE_INVOICE_PAYMENTS_KEY]: false,
      [APPOINTMENT_INVOICE_PAYMENTS_KEY]: false,
      [LEGACY_INVOICE_PAYMENTS_KEY]: true,
    }
    expect(resolveCourseInvoicePaymentsEnabled(settings)).toBe(false)
    expect(resolveIndividualAppointmentInvoicePaymentsEnabled(settings)).toBe(false)
  })

  it('5. legacy=true with both new keys absent → both allow', () => {
    const settings = { [LEGACY_INVOICE_PAYMENTS_KEY]: true }
    expect(hasExplicitPaymentSetting(settings, COURSE_INVOICE_PAYMENTS_KEY)).toBe(false)
    expect(hasExplicitPaymentSetting(settings, APPOINTMENT_INVOICE_PAYMENTS_KEY)).toBe(false)
    expect(resolveCourseInvoicePaymentsEnabled(settings)).toBe(true)
    expect(resolveIndividualAppointmentInvoicePaymentsEnabled(settings)).toBe(true)
  })

  it('6. legacy=false with both new keys absent → both block', () => {
    const settings = { [LEGACY_INVOICE_PAYMENTS_KEY]: false }
    expect(resolveCourseInvoicePaymentsEnabled(settings)).toBe(false)
    expect(resolveIndividualAppointmentInvoicePaymentsEnabled(settings)).toBe(false)
    expect(resolveCourseInvoicePaymentsEnabled({})).toBe(false)
    expect(resolveIndividualAppointmentInvoicePaymentsEnabled(null)).toBe(false)
  })

  it('7. explicit course=false overrides legacy=true', () => {
    const settings = {
      [COURSE_INVOICE_PAYMENTS_KEY]: false,
      [LEGACY_INVOICE_PAYMENTS_KEY]: true,
    }
    expect(resolveCourseInvoicePaymentsEnabled(settings)).toBe(false)
    // Appointment still falls back to legacy
    expect(resolveIndividualAppointmentInvoicePaymentsEnabled(settings)).toBe(true)
  })

  it('8. explicit appointment=false overrides legacy=true', () => {
    const settings = {
      [APPOINTMENT_INVOICE_PAYMENTS_KEY]: false,
      [LEGACY_INVOICE_PAYMENTS_KEY]: true,
    }
    expect(resolveIndividualAppointmentInvoicePaymentsEnabled(settings)).toBe(false)
    expect(resolveCourseInvoicePaymentsEnabled(settings)).toBe(true)
  })

  it('treats null scoped keys as absent (legacy fallback), not as false', () => {
    const settings = {
      [COURSE_INVOICE_PAYMENTS_KEY]: null,
      [APPOINTMENT_INVOICE_PAYMENTS_KEY]: null,
      [LEGACY_INVOICE_PAYMENTS_KEY]: true,
    }
    expect(hasExplicitPaymentSetting(settings, COURSE_INVOICE_PAYMENTS_KEY)).toBe(false)
    expect(resolveCourseInvoicePaymentsEnabled(settings)).toBe(true)
    expect(resolveIndividualAppointmentInvoicePaymentsEnabled(settings)).toBe(true)
  })
})

describe('9. admin course INVOICE save remains ungated by public course toggle', () => {
  it('category/course admin save must not call invoice-option assert', () => {
    const categorySave = read('server/api/admin/course-categories/save.post.ts')
    const courseUpsert = read('server/api/admin/courses/upsert.post.ts')
    expect(categorySave).not.toContain('assertInvoicePaymentMethodAllowed')
    expect(categorySave).not.toContain('getTenantInvoicePaymentsEnabled')
    expect(categorySave).not.toContain('resolveCourseInvoicePaymentsEnabled')
    expect(courseUpsert).not.toContain('assertInvoicePaymentMethodAllowed')
    expect(courseUpsert).not.toContain('getTenantInvoicePaymentsEnabled')
    expect(courseUpsert).not.toContain('resolveCourseInvoicePaymentsEnabled')
  })
})

describe('10. disabled appointment INVOICE rejected without fallback', () => {
  it('resolver marks explicit invoice as invoiceRequestRejected (no silent rewrite used by callers)', () => {
    const policy = paymentPolicyFromTenantSettings({
      settings: {
        [APPOINTMENT_INVOICE_PAYMENTS_KEY]: false,
        [LEGACY_INVOICE_PAYMENTS_KEY]: true,
        cash_payments_enabled: true,
        cash_payment_visibility: 'customers_and_staff',
        default_payment_method: 'wallee',
      },
      walleeEnabled: true,
    })
    expect(policy.invoiceEnabled).toBe(false)
    const result = resolveOnlineBookingPaymentMethod({
      requested: 'invoice',
      policy,
    })
    expect(result.invoiceRequestRejected).toBe(true)
    expect(result.rejectedRequest).toBe(true)
    expect(result.allowed).not.toContain('invoice')
  })

  it('create-appointment and guest-book throw on invoiceRequestRejected', () => {
    const createAppt = read('server/api/booking/create-appointment.post.ts')
    const guestBook = read('server/api/booking/guest-book.post.ts')
    for (const src of [createAppt, guestBook]) {
      expect(src).toContain('invoiceRequestRejected')
      expect(src).toContain('APPOINTMENT_INVOICE_PAYMENT_DISABLED_MESSAGE')
      expect(src).toContain("code: 'APPOINTMENT_INVOICE_DISABLED'")
      expect(src).toContain('statusCode: 400')
    }
  })

  it('non-invoice rejected methods still allow silent fallback (narrow change)', () => {
    const policy = paymentPolicyFromTenantSettings({
      settings: {
        [APPOINTMENT_INVOICE_PAYMENTS_KEY]: true,
        cash_payments_enabled: true,
        cash_payment_visibility: 'staff_only',
        default_payment_method: 'wallee',
      },
      walleeEnabled: true,
    })
    const cashRejected = resolveOnlineBookingPaymentMethod({
      requested: 'cash',
      policy,
    })
    expect(cashRejected.rejectedRequest).toBe(true)
    expect(cashRejected.invoiceRequestRejected).toBe(false)
    expect(cashRejected.method).toBe('wallee')
  })
})

describe('course public invoice enforcement', () => {
  it('blocks course invoice enrollment when course toggle is off (legacy on)', () => {
    const courseEnabled = resolveCourseInvoicePaymentsEnabled({
      [COURSE_INVOICE_PAYMENTS_KEY]: false,
      [LEGACY_INVOICE_PAYMENTS_KEY]: true,
    })
    expect(() => assertInvoiceEnrollmentAllowed({
      coursePaymentMethod: 'INVOICE',
      invoiceEnabled: courseEnabled,
    })).toThrow()
  })

  it('allows course invoice enrollment when course toggle is on (appointment off)', () => {
    const courseEnabled = resolveCourseInvoicePaymentsEnabled({
      [COURSE_INVOICE_PAYMENTS_KEY]: true,
      [APPOINTMENT_INVOICE_PAYMENTS_KEY]: false,
    })
    expect(() => assertInvoiceEnrollmentAllowed({
      coursePaymentMethod: 'INVOICE',
      invoiceEnabled: courseEnabled,
    })).not.toThrow()
  })

  it('enroll endpoints use course-scoped resolver', () => {
    const cash = read('server/api/courses/enroll-cash.post.ts')
    const wallee = read('server/api/courses/enroll-wallee.post.ts')
    expect(cash).toContain('resolveCourseInvoicePaymentsEnabled')
    expect(wallee).toContain('resolveCourseInvoicePaymentsEnabled')
    expect(cash).not.toContain('invoice_payments_enabled === true')
    expect(wallee).not.toContain('invoice_payments_enabled === true')
  })
})

describe('booking policy uses appointment-scoped invoice flag', () => {
  it('legacy alone enables appointment invoice in online policy', () => {
    const policy = paymentPolicyFromTenantSettings({
      settings: { [LEGACY_INVOICE_PAYMENTS_KEY]: true },
      walleeEnabled: true,
    })
    expect(policy.invoiceEnabled).toBe(true)
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'invoice',
      policy,
    })).toMatchObject({
      method: 'invoice',
      invoiceRequestRejected: false,
    })
  })

  it('get-booking-init exposes both scoped flags', () => {
    const src = read('server/api/booking/get-booking-init.get.ts')
    expect(src).toContain('course_invoice_payments_enabled')
    expect(src).toContain('individual_appointment_invoice_payments_enabled')
    expect(src).toContain('resolveCourseInvoicePaymentsEnabled')
  })
})

describe('admin UI + settings API contracts', () => {
  it('profile exposes two independent toggles and keeps legacy key', () => {
    const profile = read('pages/admin/profile.vue')
    expect(profile).toContain('Rechnung als Zahlungsoption für Kurse erlauben')
    expect(profile).toContain('Rechnung als Zahlungsoption für Einzeltermine erlauben')
    expect(profile).toContain('setCourseInvoicePaymentsEnabled')
    expect(profile).toContain('setAppointmentInvoicePaymentsEnabled')
    expect(profile).toContain('invoice_payments_enabled')
    expect(profile).not.toContain('v-model="paymentSettings.invoice_payments_enabled"')
  })

  it('invoice-payment-settings returns scoped resolved flags', () => {
    const src = read('server/api/settings/invoice-payment-settings.get.ts')
    expect(src).toContain('resolveCourseInvoicePaymentsEnabled')
    expect(src).toContain('resolveIndividualAppointmentInvoicePaymentsEnabled')
    expect(src).toContain(COURSE_INVOICE_PAYMENTS_KEY)
    expect(src).toContain(APPOINTMENT_INVOICE_PAYMENTS_KEY)
    expect(src).toContain("eq('tenant_id', tenantId")
  })

  it('tenant-settings write requires admin profile (no client tenant override)', () => {
    const src = read('server/api/admin/tenant-settings.post.ts')
    expect(src).toContain('requireAdminProfile')
    expect(src).toContain('tenant_id: profile.tenant_id')
    expect(src).not.toContain('body.tenant_id')
  })
})

describe('existing wallee/cash behavior preserved on resolver', () => {
  it('keeps wallee default and cash staff-only off the allowlist', () => {
    const policy = paymentPolicyFromTenantSettings({
      settings: {
        cash_payments_enabled: true,
        cash_payment_visibility: 'staff_only',
        [APPOINTMENT_INVOICE_PAYMENTS_KEY]: false,
        default_payment_method: 'wallee',
      },
      walleeEnabled: true,
    })
    expect(resolveOnlineBookingPaymentMethod({
      requested: undefined,
      policy,
    }).method).toBe('wallee')
    expect(resolveOnlineBookingPaymentMethod({
      requested: 'cash',
      policy,
    })).toMatchObject({ method: 'wallee', rejectedRequest: true, invoiceRequestRejected: false })
  })

  it('exports fail-closed message for API responses', () => {
    expect(APPOINTMENT_INVOICE_PAYMENT_DISABLED_MESSAGE.length).toBeGreaterThan(10)
  })
})
