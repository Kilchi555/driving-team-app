/**
 * Staff-profile entry for date-specific working hours.
 * Maps the three UI modes onto the existing exception API.
 * Normal means no row: the weekly plan stays the fallback.
 */

import {
  ExceptionInputError,
  MAX_EXCEPTION_DATES,
  assertCivilDate,
  civilDayOfWeek,
  utcCivilDate,
  zurichTodayCivilDate,
  type ExceptionDayInput,
} from '~/utils/effective-working-hours'

export type ExceptionUiMode = 'normal' | 'custom' | 'closed'

export interface ExceptionUiDay {
  date: string
  mode: ExceptionUiMode
  existed: boolean
  blocks: Array<{ start_time: string; end_time: string }>
}

export interface ExceptionSavePlan {
  deletes: string[]
  upserts: ExceptionDayInput[]
}

const WEEKDAY_LABELS = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_LABELS[weekday] || ''
}

/** Adds civil days with UTC date parts. Host timezone cannot shift the result. */
export function addCivilDays(civilDate: string, days: number): string {
  const date = assertCivilDate(civilDate)
  const [year, month, day] = date.split('-').map(Number)
  return utcCivilDate(new Date(Date.UTC(year, month - 1, day + days)))
}

/**
 * Next occurrence of a weekday in Europe/Zurich.
 * 1 = Monday … 7 = Sunday. If today is that weekday, today is returned.
 */
export function nextCivilDateForWeekday(weekday: number, now: Date = new Date()): string {
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
    throw new ExceptionInputError('Invalid weekday')
  }
  const today = zurichTodayCivilDate(now)
  const delta = (weekday - civilDayOfWeek(today) + 7) % 7
  return addCivilDays(today, delta)
}

/** German label such as "Freitag, 25.09.2026". Built from civil parts, not local Date parsing. */
export function formatExceptionDateLabel(civilDate: string): string {
  const date = assertCivilDate(civilDate)
  const year = date.slice(0, 4)
  const month = date.slice(5, 7)
  const day = date.slice(8, 10)
  return `${weekdayLabel(civilDayOfWeek(date))}, ${day}.${month}.${year}`
}

export function modeFromStoredException(existing: { isClosed: boolean } | null | undefined): ExceptionUiMode {
  if (!existing) return 'normal'
  return existing.isClosed ? 'closed' : 'custom'
}

/**
 * Inclusive civil dates that share the start date's weekday.
 * Other weekdays in the range are omitted so a Friday pencil cannot write Monday rows.
 */
export function civilDatesForWeekday(start: string, end: string, weekday: number): string[] {
  const first = assertCivilDate(start)
  const last = assertCivilDate(end)
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
    throw new ExceptionInputError('Invalid weekday')
  }
  if (last < first) return []
  const dates: string[] = []
  let cursor = first
  let steps = 0
  const maxSteps = MAX_EXCEPTION_DATES * 7 + 1
  while (cursor <= last && steps <= maxSteps) {
    if (civilDayOfWeek(cursor) === weekday) {
      dates.push(cursor)
      if (dates.length > MAX_EXCEPTION_DATES) {
        throw new ExceptionInputError('Too many dates')
      }
    }
    cursor = addCivilDays(cursor, 1)
    steps += 1
  }
  if (cursor <= last) {
    throw new ExceptionInputError('Too many dates')
  }
  return dates
}

/** Normal deletes an existing row. It never upserts a copy of the weekly plan. */
export function planExceptionSave(days: ExceptionUiDay[]): ExceptionSavePlan {
  const deletes: string[] = []
  const upserts: ExceptionDayInput[] = []
  for (const day of days) {
    if (day.mode === 'normal') {
      if (day.existed) deletes.push(day.date)
      continue
    }
    if (day.mode === 'closed') {
      upserts.push({ date: day.date, isClosed: true, blocks: [] })
      continue
    }
    upserts.push({
      date: day.date,
      isClosed: false,
      blocks: day.blocks.map((block) => ({
        start_time: block.start_time,
        end_time: block.end_time,
      })),
    })
  }
  return { deletes, upserts }
}
