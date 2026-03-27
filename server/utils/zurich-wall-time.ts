/**
 * Convert a calendar date + wall-clock time in Europe/Zurich to a UTC Date (instant).
 * Used for staff working hours → availability slots so CET/CEST is applied per day.
 */
const ZURICH = 'Europe/Zurich'

export function zurichWallTimeToUtc(
  year: number,
  monthIndex0: number,
  dayOfMonth: number,
  hour: number,
  minute: number
): Date {
  let guessMs = Date.UTC(year, monthIndex0, dayOfMonth, hour, minute, 0)

  for (let i = 0; i < 48; i++) {
    const d = new Date(guessMs)
    const s = new Intl.DateTimeFormat('sv-SE', {
      timeZone: ZURICH,
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

  return new Date(Date.UTC(year, monthIndex0, dayOfMonth, hour, minute, 0))
}

/** Parse DB/API time strings like "07:00", "07:00:00", "07:00:00+00" → hours, minutes */
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
