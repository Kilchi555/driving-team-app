/**
 * Binding booking conversion semantics.
 *
 * A binding booking is a conversion. Payment status does NOT determine
 * whether a confirmed appointment or course registration is a conversion.
 *
 * appointments.status = confirmed            → binding lesson booking
 * course_registrations.status = confirmed    → binding course registration
 *
 * pending + pay_before_confirm is a hold, not a conversion.
 */

import { ECONOMICS_SKIP_EVENT_CODES } from '~/utils/unit-economics'

export const BINDING_CONFIRMED_STATUS = 'confirmed'

/** Historical productive bookings still count after the lesson is completed. */
export const BINDING_HISTORY_APPOINTMENT_STATUSES = ['confirmed', 'completed'] as const

export const BINDING_HISTORY_REGISTRATION_STATUSES = ['confirmed'] as const

export function isBindingConfirmedAppointment(status: string | null | undefined): boolean {
  return String(status || '').trim().toLowerCase() === BINDING_CONFIRMED_STATUS
}

export function isBindingConfirmedRegistration(status: string | null | undefined): boolean {
  return String(status || '').trim().toLowerCase() === BINDING_CONFIRMED_STATUS
}

/**
 * True only on the transition that establishes the binding booking.
 * Unrelated updates to an already-confirmed appointment must not re-fire.
 */
export function becameBindingConfirmed(
  previousStatus: string | null | undefined,
  newStatus: string | null | undefined,
): boolean {
  return !isBindingConfirmedAppointment(previousStatus) && isBindingConfirmedAppointment(newStatus)
}

/**
 * Productive customer-facing event types. Internal calendar codes
 * (vacation, meetings, …) are not bookings.
 *
 * Authoritative skip list: ECONOMICS_SKIP_EVENT_CODES in utils/unit-economics.ts.
 */
export function isProductiveEventTypeCode(code: string | null | undefined): boolean {
  const normalized = String(code || '').trim()
  if (!normalized) return true
  return !ECONOMICS_SKIP_EVENT_CODES.has(normalized)
}

export function hasGoogleClickId(input: {
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
}): boolean {
  return !!(cleanToken(input.gclid) || cleanToken(input.gbraid) || cleanToken(input.wbraid))
}

export function appointmentConversionOrderId(appointmentId: string): string {
  // Google Ads orderId must stay the appointment UUID so historical uploads
  // and cancellation RETRACT adjustments continue to match.
  return appointmentId
}

export function courseConversionOrderId(registrationId: string): string {
  return `course_${registrationId}`
}

export function appointmentMetaEventId(appointmentId: string): string {
  return `capi_${appointmentId}`
}

export function courseMetaEventId(registrationId: string): string {
  return `capi_course_${registrationId}`
}

export function isEligibleForGooglePrimaryBookingConversion(input: {
  newCustomerState: 'new' | 'existing' | 'unknown'
  hasGoogleClickId: boolean
}): boolean {
  return input.newCustomerState === 'new' && input.hasGoogleClickId
}

export function isEligibleForMetaPurchaseConversion(input: {
  newCustomerState: 'new' | 'existing' | 'unknown'
  hasMetaClickId: boolean
}): boolean {
  return input.newCustomerState === 'new' && input.hasMetaClickId
}

export function isUniqueViolation(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false
  if (error.code === '23505') return true
  return /duplicate key value violates unique constraint/i.test(String(error.message || ''))
}

function cleanToken(value: string | null | undefined): string | null {
  if (!value) return null
  const v = String(value).trim()
  return v && v !== 'undefined' && v !== 'null' ? v : null
}
