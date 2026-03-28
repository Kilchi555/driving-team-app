/**
 * Convert a calendar date + wall-clock time in a given IANA timezone to a UTC Date.
 * Used for staff working hours → availability slots so DST is applied per calendar day.
 *
 * The iterative approach starts with a UTC guess and adjusts until the target
 * timezone shows the requested wall-clock time — no npm dependency needed.
 */

export const DEFAULT_TIMEZONE = 'Europe/Zurich'

export function wallTimeToUtc(
  year: number,
  monthIndex0: number,
  dayOfMonth: number,
  hour: number,
  minute: number,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  let guessMs = Date.UTC(year, monthIndex0, dayOfMonth, hour, minute, 0)

  for (let i = 0; i < 48; i++) {
    const d = new Date(guessMs)
    const s = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(d)
    const [datePart, timePart] = s.split(' ')
    const [y, mo, da] = datePart.split('-').map(Number)
    const [ho, mi] = timePart.split(':').map(Number)
    if (
      y === year &&
      mo === monthIndex0 + 1 &&
      da === dayOfMonth &&
      ho === hour &&
      mi === minute
    ) {
      return d
    }
    const diffMin = (hour - ho) * 60 + (minute - mi)
    guessMs += diffMin * 60 * 1000
  }

  // Fallback: UTC (should never be reached for valid IANA timezones)
  return new Date(Date.UTC(year, monthIndex0, dayOfMonth, hour, minute, 0))
}

/** Backwards-compatible alias — always uses Europe/Zurich */
export const zurichWallTimeToUtc = (
  year: number,
  monthIndex0: number,
  dayOfMonth: number,
  hour: number,
  minute: number
): Date => wallTimeToUtc(year, monthIndex0, dayOfMonth, hour, minute, DEFAULT_TIMEZONE)

/**
 * Parse DB/API time strings like "07:00", "07:00:00", "07:00:00+00" → hours, minutes
 */
export function parseWorkingTimeParts(timeStr: string): { hours: number; minutes: number } {
  if (!timeStr || typeof timeStr !== 'string') {
    return { hours: 0, minutes: 0 }
  }
  const m = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/)
  if (!m) {
    return { hours: 0, minutes: 0 }
  }
  return {
    hours: parseInt(m[1], 10),
    minutes: parseInt(m[2], 10)
  }
}
