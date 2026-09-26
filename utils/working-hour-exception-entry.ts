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

export interface ListedWorkingHourException {
  date: string
  isClosed: boolean
  blocks?: Array<{ start_time?: string; end_time?: string }> | null
}

const EMPTY_BLOCK = { start_time: '08:00', end_time: '12:00' }

function wallClock(value: string | undefined): string {
  return String(value || '').slice(0, 5)
}

/** One parent row per date. Duplicate date keys keep every interval instead of the last row. */
export function indexExceptionsByDate(rows: ListedWorkingHourException[]): Map<string, ListedWorkingHourException> {
  const map = new Map<string, ListedWorkingHourException>()
  for (const row of rows) {
    const date = String(row.date || '').slice(0, 10)
    if (!date) continue
    const blocks = (Array.isArray(row.blocks) ? row.blocks : []).map((block) => ({
      start_time: wallClock(block.start_time),
      end_time: wallClock(block.end_time),
    }))
    const prev = map.get(date)
    if (!prev) {
      map.set(date, {
        date,
        isClosed: row.isClosed === true,
        blocks: row.isClosed === true ? [] : blocks,
      })
      continue
    }
    if (prev.isClosed || row.isClosed === true) {
      map.set(date, { date, isClosed: true, blocks: [] })
      continue
    }
    map.set(date, {
      date,
      isClosed: false,
      blocks: [...(prev.blocks || []), ...blocks],
    })
  }
  return map
}

/**
 * Closed stays an empty interval list.
 * An open exception keeps every stored interval, including the second and third.
 */
export function draftBlocksForStoredException(
  existing: { isClosed: boolean; blocks?: Array<{ start_time?: string; end_time?: string }> | null },
): Array<{ start_time: string; end_time: string }> {
  if (existing.isClosed) return []
  const blocks = (Array.isArray(existing.blocks) ? existing.blocks : [])
    .map((block) => ({
      start_time: wallClock(block.start_time),
      end_time: wallClock(block.end_time),
    }))
    .filter((block) => block.start_time && block.end_time)
    .sort((a, b) => a.start_time.localeCompare(b.start_time) || a.end_time.localeCompare(b.end_time))
  return blocks.length > 0 ? blocks : [{ ...EMPTY_BLOCK }]
}

/**
 * Reopening the pencil must not jump back to the next weekday when the sheet
 * already holds another future date of that same weekday.
 */
export function resolveExceptionOpenDate(initialDate: string, currentDate: string, today: string): string {
  if (!currentDate || currentDate < today) return initialDate
  try {
    if (civilDayOfWeek(currentDate) === civilDayOfWeek(initialDate)) return currentDate
  } catch {
    return initialDate
  }
  return initialDate
}

/** Counts exception rows per weekday. Several intervals on one date count as one exception. */
export function exceptionCountsByWeekday(rows: Array<{ date: string }>): Record<number, number> {
  const counts: Record<number, number> = {}
  const seen = new Set<string>()
  for (const row of rows) {
    const date = String(row.date || '').slice(0, 10)
    if (!date || seen.has(date)) continue
    seen.add(date)
    let weekday = 0
    try {
      weekday = civilDayOfWeek(date)
    } catch {
      continue
    }
    counts[weekday] = (counts[weekday] || 0) + 1
  }
  return counts
}

export function exceptionCountLabel(count: number): string {
  if (count === 1) return '1 Ausnahme'
  if (count > 1) return `${count} Ausnahmen`
  return ''
}

/** Saved exception rows that fall on one weekday, one row per date. */
export function exceptionsForWeekday(rows: ListedWorkingHourException[], weekday: number): ListedWorkingHourException[] {
  return [...indexExceptionsByDate(rows).values()]
    .filter((row) => {
      try {
        return civilDayOfWeek(row.date) === weekday
      } catch {
        return false
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function exceptionRowLabel(row: ListedWorkingHourException): string {
  let dateLabel = row.date
  try {
    dateLabel = formatExceptionDateLabel(row.date)
  } catch {
    dateLabel = row.date
  }
  if (row.isClosed) return `${dateLabel} · geschlossen`
  const blocks = (Array.isArray(row.blocks) ? row.blocks : [])
    .map((block) => ({
      start_time: wallClock(block.start_time),
      end_time: wallClock(block.end_time),
    }))
    .filter((block) => block.start_time && block.end_time)
    .sort((a, b) => a.start_time.localeCompare(b.start_time) || a.end_time.localeCompare(b.end_time))
  if (blocks.length === 0) return dateLabel
  return `${dateLabel} · ${blocks.map((block) => `${block.start_time}–${block.end_time}`).join(' / ')}`
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
