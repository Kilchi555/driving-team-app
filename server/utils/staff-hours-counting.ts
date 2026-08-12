/**
 * Shared appointment counting rules for staff working hours.
 * Used by staff_monthly_hours recalculation and live card stats.
 *
 * Rules:
 *  - Not cancelled → always count (except vacation → separate)
 *  - Cancelled + has a payment that is NOT cancelled/refunded/failed → count
 *  - Cancelled + no payment OR payment cancelled/refunded → do NOT count
 *  - Missing duration_minutes → 0
 *  - Hours rounded to 0.01
 *  - Calendar month/day in Europe/Zurich
 */

export const STAFF_HOURS_TIMEZONE = 'Europe/Zurich'

/** payment_status values that mean "the appointment was effectively not paid for" */
export const VOID_PAYMENT_STATUSES = new Set(['cancelled', 'canceled', 'refunded', 'failed'])

export type CountableAppointment = {
  status: string
  payments?: Array<{ payment_status: string }> | null
  event_type_code?: string | null
  duration_minutes?: number | null
  start_time?: string | null
}

/** UTC ISO string → calendar month in Zurich (1-based). */
export function zurichMonth(isoString: string): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      timeZone: STAFF_HOURS_TIMEZONE,
    }).format(new Date(isoString))
  )
}

/** UTC ISO string → calendar year in Zurich. */
export function zurichYear(isoString: string): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      timeZone: STAFF_HOURS_TIMEZONE,
    }).format(new Date(isoString))
  )
}

/** Date → { year, month } in Zurich. */
export function zurichYearMonth(date: Date = new Date()): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: STAFF_HOURS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date)
  const year = parseInt(parts.find((p) => p.type === 'year')!.value)
  const month = parseInt(parts.find((p) => p.type === 'month')!.value)
  return { year, month }
}

/** Add delta months to a 1-based year/month pair. */
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 }
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** YYYY-MM-01 for a Zurich year/month. */
export function monthStartDate(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`
}

export function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100
}

export function appointmentHours(apt: { duration_minutes?: number | null }): number {
  return (apt.duration_minutes || 0) / 60
}

export function isVacationAppointment(apt: { event_type_code?: string | null }): boolean {
  return apt.event_type_code === 'vacation'
}

/**
 * True when a vacation appointment should reduce Ferien entitlement (Mo–Fr days).
 * Calendar leave that is not annual leave (e.g. Vaterschaftsurlaub) still uses
 * event_type_code=vacation for blocking + hours, but must not consume Ferien days.
 */
export function isFerienEntitlementAppointment(apt: {
  event_type_code?: string | null
  title?: string | null
}): boolean {
  if (apt.event_type_code !== 'vacation') return false
  const title = (apt.title || '').trim().toLowerCase()
  if (!title || title === 'ferien' || title.startsWith('ferien')) return true
  // Explicit non-Ferien leave titles stay on the calendar / in hours, not in Ferien saldo
  if (title.includes('vaterschaft') || title.includes('mutterschaft') || title.includes('elternzeit')) {
    return false
  }
  return true
}

/**
 * Ferien day credit for entitlement: full day = 1, half day (shorter block) = 0.5.
 * Full-day calendar blocks are 07:00–19:00 (720 min); half days use ≤ half of that.
 */
export function ferienDayCredit(apt: {
  event_type_code?: string | null
  title?: string | null
  duration_minutes?: number | null
  start_time?: string | null
}): number {
  if (!isFerienEntitlementAppointment(apt) || !apt.start_time) return 0
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: STAFF_HOURS_TIMEZONE }).format(new Date(apt.start_time))
  const weekday = new Date(dateStr + 'T12:00:00').getDay()
  if (weekday < 1 || weekday > 5) return 0
  const duration = apt.duration_minutes ?? 0
  // Half-day leave blocks are shorter than the standard 720 min full-day vacation block
  if (duration > 0 && duration <= 420) return 0.5
  return 1
}

/**
 * Returns true when an appointment should be counted toward a staff member's
 * actual working hours (Ist).
 */
export function shouldCountAppointment(apt: {
  status: string
  payments?: Array<{ payment_status: string }> | null
}): boolean {
  if (apt.status !== 'cancelled') return true
  const payments = apt.payments || []
  return payments.some((p) => !VOID_PAYMENT_STATUSES.has(p.payment_status))
}
