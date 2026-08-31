export const RECURRING_INTERVALS = ['monthly', 'quarterly', 'yearly'] as const
export type RecurringInterval = (typeof RECURRING_INTERVALS)[number]

export function isRecurringInterval(value: unknown): value is RecurringInterval {
  return RECURRING_INTERVALS.includes(value as RecurringInterval)
}

export function todayZurich(now = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Zurich' })
}

export function addMonthsIso(iso: string, months: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const cursor = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate()
  const clamped = Math.min(day, lastDay)
  return [
    cursor.getUTCFullYear(),
    String(cursor.getUTCMonth() + 1).padStart(2, '0'),
    String(clamped).padStart(2, '0'),
  ].join('-')
}

export function nextDueDate(from: string, interval: RecurringInterval): string {
  if (interval === 'monthly') return addMonthsIso(from, 1)
  if (interval === 'quarterly') return addMonthsIso(from, 3)
  return addMonthsIso(from, 12)
}

export function dueDatesUntil(
  startDue: string,
  interval: RecurringInterval,
  today: string,
  endsOn?: string | null,
  max = 24,
): { dates: string[]; next: string | null } {
  const dates: string[] = []
  let due = startDue
  for (let i = 0; i < max; i++) {
    if (endsOn && due > endsOn) return { dates, next: null }
    if (due > today) return { dates, next: due }
    dates.push(due)
    due = nextDueDate(due, interval)
  }
  return { dates, next: endsOn && due > endsOn ? null : due }
}

export function recurringExternalRef(templateId: string, dueDate: string): string {
  return `recurring:${templateId}:${dueDate}`
}
