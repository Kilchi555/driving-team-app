/**
 * Derive booking-wizard prefill from a customer's previous appointments
 * so returning clients can skip category / duration / location / instructor.
 */

export const BOOKING_PREFILL_SKIP_EVENT_CODES = new Set([
  'vacation',
  'break',
  'staff_meeting',
  'meeting',
  'training',
  'maintenance',
  'admin',
  'team_invite',
  'exam',
  'theory',
  'consultation',
  'nothelfer',
  'vku',
])

export const BOOKING_PREFILL_SKIP_STATUSES = new Set([
  'cancelled',
  'canceled',
  'aborted',
  'deleted',
])

/** Values that appear on `appointments.type` for Fahrschule, not as a wizard category. */
const GENERIC_TYPE_CODES = new Set([
  'lesson',
  'exam',
  'theory',
  'consultation',
  'other',
])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SWISS_PLZ_RE = /^\d{4}$/

export type BookingPrefillMode = 'full' | 'partial'

export interface BookingPrefillSource {
  type?: string | null
  event_type_code?: string | null
  status?: string | null
  staff_id?: string | null
  location_id?: string | null
  duration_minutes?: number | string | null
  start_time?: string | null
  end_time?: string | null
  customer_pickup_plz?: string | null
  customer_pickup_address?: string | null
  deleted_at?: string | null
}

export interface BookingPrefill {
  mode: BookingPrefillMode
  category: string
  staffId?: string
  locationId?: string
  durationMinutes?: number
  pickupPlz?: string
  pickupAddress?: string
}

function trimCode(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isSkippedEvent(code: string): boolean {
  return BOOKING_PREFILL_SKIP_EVENT_CODES.has(code.toLowerCase())
}

export function isUsableBookingPrefillAppointment(apt: BookingPrefillSource | null | undefined): boolean {
  if (!apt || apt.deleted_at) return false
  const status = trimCode(apt.status).toLowerCase()
  if (status && BOOKING_PREFILL_SKIP_STATUSES.has(status)) return false
  const eventCode = trimCode(apt.event_type_code)
  if (eventCode && isSkippedEvent(eventCode)) return false
  return true
}

export interface DeriveBookingPrefillOptions {
  /**
   * Public bookable wizard codes: category codes (Fahrschule) or
   * public_bookable event type codes (Haku, Sara, Coaching).
   * When set, appointments whose derived code is not in this list are skipped.
   */
  bookableCodes?: string[]
}

function allowedCodeSet(codes?: string[]): Set<string> {
  return new Set((codes || []).map((c) => c.trim().toLowerCase()).filter(Boolean))
}

function isAllowedCode(code: string, bookableCodes?: string[]): boolean {
  const allowed = allowedCodeSet(bookableCodes)
  if (allowed.size === 0) return true
  return allowed.has(code.toLowerCase())
}

export function categoryFromAppointment(
  apt: BookingPrefillSource,
  opts?: DeriveBookingPrefillOptions,
): string | null {
  const type = trimCode(apt.type)
  const eventCode = trimCode(apt.event_type_code)
  if (eventCode && isSkippedEvent(eventCode)) return null

  const typeIsLicenseCategory =
    !!type && !GENERIC_TYPE_CODES.has(type.toLowerCase()) && !isSkippedEvent(type)

  let candidate: string | null = null
  if (typeIsLicenseCategory) {
    candidate = type
  } else if (eventCode && eventCode.toLowerCase() !== 'lesson' && !isSkippedEvent(eventCode)) {
    // Event-type tenants (Haku/Sara): the event code is the booking "category"
    // including names like session, intake, discovery.
    candidate = eventCode
  } else if (type && type.toLowerCase() !== 'lesson' && !isSkippedEvent(type) && !GENERIC_TYPE_CODES.has(type.toLowerCase())) {
    candidate = type
  }

  if (!candidate || !isAllowedCode(candidate, opts?.bookableCodes)) return null
  return candidate
}

export function durationFromAppointment(apt: BookingPrefillSource): number | null {
  const raw = apt.duration_minutes
  const fromField = typeof raw === 'number' ? raw : Number(raw)
  if (Number.isFinite(fromField) && fromField > 0) return Math.round(fromField)

  if (apt.start_time && apt.end_time) {
    const ms = new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime()
    if (Number.isFinite(ms) && ms > 0) return Math.round(ms / 60000)
  }
  return null
}

export function pickupPlzFromAppointment(apt: BookingPrefillSource): string | null {
  const direct = trimCode(apt.customer_pickup_plz)
  if (SWISS_PLZ_RE.test(direct)) return direct
  const address = trimCode(apt.customer_pickup_address)
  const match = address.match(/\b(\d{4})\b/)
  return match ? match[1] : null
}

export function snapDuration(requested: number, options: number[]): number | null {
  if (!options.length) return null
  if (options.includes(requested)) return requested
  return options.reduce((best, option) =>
    Math.abs(option - requested) < Math.abs(best - requested) ? option : best
  )
}

function asUuid(value: unknown): string | undefined {
  const raw = trimCode(value)
  return UUID_RE.test(raw) ? raw : undefined
}

export function deriveBookingPrefill(
  appointments: BookingPrefillSource[] | null | undefined,
  opts?: DeriveBookingPrefillOptions,
): BookingPrefill | null {
  if (!appointments?.length) return null

  for (const apt of appointments) {
    if (!isUsableBookingPrefillAppointment(apt)) continue
    const category = categoryFromAppointment(apt, opts)
    if (!category) continue

    const staffId = asUuid(apt.staff_id)
    const locationId = asUuid(apt.location_id)
    const durationMinutes = durationFromAppointment(apt) ?? undefined
    const pickupPlz = pickupPlzFromAppointment(apt) ?? undefined
    const pickupAddress = trimCode(apt.customer_pickup_address).slice(0, 200) || undefined

    const hasPlace = Boolean(locationId || pickupPlz)
    const mode: BookingPrefillMode =
      category && staffId && durationMinutes && hasPlace ? 'full' : 'partial'

    return {
      mode,
      category,
      staffId,
      locationId,
      durationMinutes,
      pickupPlz,
      pickupAddress,
    }
  }

  return null
}

export function bookingPrefillToQuery(prefs: BookingPrefill): Record<string, string> {
  const query: Record<string, string> = {
    prefill: prefs.mode === 'full' ? 'true' : 'partial',
    category: prefs.category,
  }
  if (prefs.staffId) query.staff = prefs.staffId
  if (prefs.locationId) query.location = prefs.locationId
  if (prefs.durationMinutes) query.duration = String(prefs.durationMinutes)
  if (prefs.pickupPlz) query.pickup_plz = prefs.pickupPlz
  if (prefs.pickupAddress) query.pickup_address = prefs.pickupAddress
  return query
}
