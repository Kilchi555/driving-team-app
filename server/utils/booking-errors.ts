import { createError } from 'h3'
import type { H3Error } from 'h3'
import { createHash } from 'node:crypto'
import { logger } from '~/utils/logger'

export const BOOKING_ERROR = {
  SLOT_UNAVAILABLE: 'SLOT_UNAVAILABLE',
  BOOKING_CONFLICT: 'BOOKING_CONFLICT',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  IDEMPOTENCY_KEY_REQUIRED: 'IDEMPOTENCY_KEY_REQUIRED',
  PAYMENT_ALREADY_COMPLETED: 'PAYMENT_ALREADY_COMPLETED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  CHECKOUT_IN_PROGRESS: 'CHECKOUT_IN_PROGRESS',
  CHECKOUT_RECOVERY_PENDING: 'CHECKOUT_RECOVERY_PENDING',
  RATE_LIMITED: 'RATE_LIMITED',
} as const

export type BookingErrorCode = (typeof BOOKING_ERROR)[keyof typeof BOOKING_ERROR]

export const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuidV4(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4_RE.test(value)
}

export function requireIdempotencyKey(value: unknown): string {
  if (!isUuidV4(value)) {
    throw bookingError(400, BOOKING_ERROR.IDEMPOTENCY_KEY_REQUIRED, 'Idempotency-Key fehlt oder ist ungültig')
  }
  return value
}

export function hashBookingRequest(payload: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export function bookingError(
  statusCode: number,
  code: BookingErrorCode,
  statusMessage: string,
  extra?: Record<string, unknown>
): H3Error {
  return createError({
    statusCode,
    statusMessage,
    data: { error: code, ...extra },
  })
}

export function rateLimitedError(message = 'Zu viele Anfragen. Bitte später erneut versuchen.'): H3Error {
  return bookingError(429, BOOKING_ERROR.RATE_LIMITED, message)
}

export interface BookingErrorContext {
  tenantId?: string | null
  staffId?: string | null
  slotId?: string | null
  appointmentId?: string | null
  domain?: string
}

export function logBookingConcurrency(context: BookingErrorContext & {
  sqlstate?: string | null
  domainError: string
}): void {
  logger.warn('booking_concurrency', {
    tenant: context.tenantId || null,
    staff: context.staffId || null,
    slot: context.slotId || null,
    appointment: context.appointmentId || null,
    sqlstate: context.sqlstate || null,
    domain: context.domainError,
  })
}

function supabaseParts(error: unknown): { code?: string; message: string; hint?: string; details?: string } {
  const err = error as { code?: string; message?: string; hint?: string; details?: string }
  return {
    code: err?.code,
    message: String(err?.message || ''),
    hint: err?.hint,
    details: err?.details,
  }
}

export function bookingDomainFromUnknown(error: unknown): BookingErrorCode | null {
  const { code, message, hint, details } = supabaseParts(error)
  const blob = `${hint || ''} ${message} ${details || ''}`

  if (blob.includes('IDEMPOTENCY_KEY_REQUIRED') || code === '22023') {
    if (blob.includes('IDEMPOTENCY_KEY_REQUIRED')) return BOOKING_ERROR.IDEMPOTENCY_KEY_REQUIRED
  }
  if (blob.includes('IDEMPOTENCY_CONFLICT')) return BOOKING_ERROR.IDEMPOTENCY_CONFLICT
  if (blob.includes('SLOT_UNAVAILABLE')) return BOOKING_ERROR.SLOT_UNAVAILABLE
  if (code === '23P01' || blob.includes('BOOKING_CONFLICT') || blob.includes('staff_occupancy')) {
    return BOOKING_ERROR.BOOKING_CONFLICT
  }
  return null
}

export function mapBookingRpcError(error: unknown, context: BookingErrorContext = {}): H3Error {
  const { code } = supabaseParts(error)
  const domain = bookingDomainFromUnknown(error)
  if (domain) {
    logBookingConcurrency({ ...context, sqlstate: code, domainError: domain })
    if (domain === BOOKING_ERROR.IDEMPOTENCY_KEY_REQUIRED) {
      return bookingError(400, domain, 'Idempotency-Key fehlt oder ist ungültig')
    }
    if (domain === BOOKING_ERROR.IDEMPOTENCY_CONFLICT) {
      return bookingError(409, domain, 'Diese Buchung wurde bereits mit anderen Daten gestartet')
    }
    if (domain === BOOKING_ERROR.SLOT_UNAVAILABLE) {
      return bookingError(409, domain, 'Dieser Zeitslot ist nicht mehr verfügbar')
    }
    return bookingError(409, domain, 'Dieser Zeitraum ist bereits belegt')
  }
  return createError({
    statusCode: 500,
    statusMessage: 'Termin konnte nicht erstellt werden',
  })
}

export function mapAppointmentWriteError(error: unknown, context: BookingErrorContext = {}): H3Error {
  const mapped = bookingDomainFromUnknown(error)
  if (mapped === BOOKING_ERROR.BOOKING_CONFLICT) {
    const { code } = supabaseParts(error)
    logBookingConcurrency({ ...context, sqlstate: code, domainError: mapped })
    return bookingError(409, mapped, 'Dieser Zeitraum ist bereits belegt')
  }
  return createError({
    statusCode: 500,
    statusMessage: 'Termin konnte nicht gespeichert werden',
  })
}

export function isAppointmentWriteConflict(error: unknown): boolean {
  return bookingDomainFromUnknown(error) === BOOKING_ERROR.BOOKING_CONFLICT
}
