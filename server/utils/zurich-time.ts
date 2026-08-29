/**
 * Convert a date+time entered as Zurich local time to a UTC ISO string.
 * DST-aware: 08:00 in July is 06:00 UTC, 08:00 in January is 07:00 UTC.
 */
export function zurichLocalToUtcIso(dateStr: string, timeStr: string): string {
  const localStr = `${dateStr}T${timeStr}:00`
  const asUtc = new Date(`${localStr}Z`)
  const zurichStr = asUtc.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
  const zurichFake = new Date(`${zurichStr.replace(' ', 'T')}Z`)
  const offsetMs = asUtc.getTime() - zurichFake.getTime()
  return new Date(asUtc.getTime() + offsetMs).toISOString()
}
