/**
 * Wall-clock labels for bookable slots.
 *
 * availability_slots.start_time is a canonical UTC instant (timestamptz → ISO).
 * The website process runs in UTC, so Intl without an explicit timeZone prints
 * that UTC clock. Display must use the tenant IANA zone (Swiss schools:
 * Europe/Zurich) so summer is UTC+2 and winter is UTC+1. Never apply a fixed
 * offset, and never rewrite the stored instant.
 */

export const DEFAULT_SLOT_TIMEZONE = 'Europe/Zurich'

const zoneOk = new Map<string, boolean>()

export function resolveSlotTimeZone(value: unknown): string {
  const tz = String(value ?? '').trim()
  if (!tz) return DEFAULT_SLOT_TIMEZONE
  const cached = zoneOk.get(tz)
  if (cached === true) return tz
  if (cached === false) return DEFAULT_SLOT_TIMEZONE
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz }).format(0)
    zoneOk.set(tz, true)
    return tz
  } catch {
    zoneOk.set(tz, false)
    return DEFAULT_SLOT_TIMEZONE
  }
}

function zonedParts(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((p) => p.type === type)?.value || ''
}

/** YYYY-MM-DD in the tenant zone. This is the calendar day the customer sees. */
export function slotLocalDateKey(iso: string, timeZone?: string | null): string {
  try {
    const parts = zonedParts(iso, resolveSlotTimeZone(timeZone))
    const key = `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}`
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : String(iso).slice(0, 10)
  } catch {
    return String(iso).slice(0, 10)
  }
}

/** Hour 0–23 in the tenant zone. NaN when the instant cannot be read. */
export function slotLocalHour(iso: string, timeZone?: string | null): number {
  try {
    const parts = zonedParts(iso, resolveSlotTimeZone(timeZone))
    const hour = Number(part(parts, 'hour'))
    return Number.isInteger(hour) ? hour : Number.NaN
  } catch {
    return Number.NaN
  }
}

export function formatSlotTimeLabel(iso: string, timeZone?: string | null): string {
  const tz = resolveSlotTimeZone(timeZone)
  try {
    return new Intl.DateTimeFormat('de-CH', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

export function formatSlotDayLabel(iso: string, timeZone?: string | null): string {
  const tz = resolveSlotTimeZone(timeZone)
  try {
    return new Intl.DateTimeFormat('de-CH', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso))
  } catch {
    return String(iso).slice(0, 10)
  }
}

/** True only for a real IANA name. Display fallback must not use this for writes. */
export function isValidIanaTimeZone(value: unknown): boolean {
  const tz = String(value ?? '').trim()
  if (!tz || tz.length > 100) return false
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: tz }).format(0)
    return true
  } catch {
    return false
  }
}

/**
 * Registration write. Empty keeps the column default. A provided value must be
 * a valid IANA zone and is stored as given — not rewritten to Europe/Zurich.
 */
export function parseTenantTimeZoneWrite(
  value: unknown,
): { ok: true; timezone: string } | { ok: false; error: string } {
  const raw = value == null ? '' : String(value).trim()
  if (!raw) return { ok: true, timezone: DEFAULT_SLOT_TIMEZONE }
  if (!isValidIanaTimeZone(raw)) return { ok: false, error: 'Zeitzone ist ungültig' }
  return { ok: true, timezone: raw }
}

export function formatInTenantZone(
  iso: string,
  timeZone: unknown,
  options: Intl.DateTimeFormatOptions,
  locale = 'de-CH',
): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: resolveSlotTimeZone(timeZone),
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

/** Course card clock. Same options as the old client formatter, with an explicit zone. */
export function formatCourseWhenLabel(iso: string, timeZone?: string | null): string {
  return formatInTenantZone(iso, timeZone, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}
