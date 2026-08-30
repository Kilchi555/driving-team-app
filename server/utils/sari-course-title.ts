/**
 * SARI group.date is the original group start and often stays stale
 * when individual sessions are moved. The course title must follow
 * the first (earliest) session date instead.
 */

export function formatSariLocalDateForTitle(sariDate: string | null | undefined): string | null {
  if (!sariDate) return null
  const datePart = sariDate.trim().replace(' ', 'T').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null
  const [year, month, day] = datePart.split('-')
  return `${day}.${month}.${year}`
}

export function sariCourseDisplayName(
  groupName: string,
  sessions: Array<{ date?: string | null }>,
  groupDate?: string | null,
): string {
  const sessionDates = sessions
    .map((session) => session.date)
    .filter((date): date is string => !!date)
    .sort()
  const formatted = formatSariLocalDateForTitle(sessionDates[0] || groupDate)
  return formatted ? `${groupName} - ${formatted}` : groupName
}
