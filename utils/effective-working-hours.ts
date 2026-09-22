/**
 * Date-specific working-hour resolution.
 * Pure: no database, no HTTP. Weekly rows are replaced, never merged.
 * Civil dates are YYYY-MM-DD. Weekday comes from those date parts, not from a timestamp.
 */

export const EXCEPTION_TIMEZONE = 'Europe/Zurich'
export const MAX_EXCEPTION_BLOCKS = 8
export const MAX_EXCEPTION_DATES = 62

export class ExceptionInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExceptionInputError'
  }
}

export interface EffectiveWeeklyHour {
  day_of_week: number
  start_time: string
  end_time: string
  is_active?: boolean
  timezone?: string | null
}

export interface EffectiveExceptionInterval {
  start_time: string
  end_time: string
}

export interface EffectiveException {
  isClosed: boolean
  intervals?: EffectiveExceptionInterval[]
  timezone?: string | null
}

export interface EffectiveWorkingInterval {
  start_time: string
  end_time: string
  timezone: string
  is_active: true
}

export interface ExceptionDayInput {
  date: string
  isClosed: boolean
  blocks: EffectiveExceptionInterval[]
}

const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const WALL_TIME = /^(\d{2}):(\d{2})$/

/** Weekday of a civil date. 1 = Monday … 7 = Sunday. Host timezone is irrelevant. */
export function civilDayOfWeek(civilDate: string): number {
  const [year, month, day] = parseCivilDate(civilDate)
  const utc = new Date(Date.UTC(year, month - 1, day))
  const jsDay = utc.getUTCDay()
  return jsDay === 0 ? 7 : jsDay
}

/** UTC calendar date of an instant, as YYYY-MM-DD. Matches the calculator's UTC day loop. */
export function utcCivilDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today's civil date in Europe/Zurich. */
export function zurichTodayCivilDate(now: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: EXCEPTION_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return formatted
}

export function normalizeWallTime(raw: string): string {
  if (typeof raw !== 'string') {
    throw new ExceptionInputError('Invalid time')
  }
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) {
    throw new ExceptionInputError('Invalid time')
  }
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) {
    throw new ExceptionInputError('Invalid time')
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function resolveEffectiveWorkingHours(input: {
  civilDate: string
  dayOfWeek: number
  weeklyHours: EffectiveWeeklyHour[]
  exception: EffectiveException | null
  timezone?: string
}): EffectiveWorkingInterval[] {
  const civilDate = assertCivilDate(input.civilDate)
  const dayOfWeek = civilDayOfWeek(civilDate)
  if (input.dayOfWeek !== dayOfWeek) {
    throw new ExceptionInputError('dayOfWeek does not match civil date')
  }

  const timezone = input.timezone || EXCEPTION_TIMEZONE
  if (input.exception) {
    if (input.exception.isClosed) {
      return []
    }
    const intervals = (input.exception.intervals || []).map((block) => ({
      start_time: normalizeWallTime(block.start_time),
      end_time: normalizeWallTime(block.end_time),
    }))
    assertOpenIntervals(intervals)
    intervals.sort((a, b) => a.start_time.localeCompare(b.start_time))
    const exceptionTimezone = input.exception.timezone || timezone
    return intervals.map((block) => ({
      start_time: block.start_time,
      end_time: block.end_time,
      timezone: exceptionTimezone,
      is_active: true as const,
    }))
  }

  const seen = new Set<string>()
  const weekly: EffectiveWorkingInterval[] = []
  for (const hour of input.weeklyHours) {
    if (hour.is_active === false) continue
    if (hour.day_of_week !== dayOfWeek) continue
    const start = normalizeWallTime(hour.start_time)
    const end = normalizeWallTime(hour.end_time)
    if (start >= end) continue
    const key = `${start}:${end}`
    if (seen.has(key)) continue
    seen.add(key)
    weekly.push({
      start_time: start,
      end_time: end,
      timezone: hour.timezone || timezone,
      is_active: true,
    })
  }
  weekly.sort((a, b) => a.start_time.localeCompare(b.start_time))
  return weekly
}

/** Rejects the whole batch before any write. Past dates use the Zurich civil date. */
export function validateExceptionDays(days: ExceptionDayInput[], now: Date = new Date()): ExceptionDayInput[] {
  if (!Array.isArray(days) || days.length < 1 || days.length > MAX_EXCEPTION_DATES) {
    throw new ExceptionInputError('Too many dates')
  }
  const today = zurichTodayCivilDate(now)
  const seen = new Set<string>()
  return days.map((day) => {
    const date = assertCivilDate(day.date)
    if (date < today) {
      throw new ExceptionInputError('Date is before today in Europe/Zurich')
    }
    if (seen.has(date)) {
      throw new ExceptionInputError('Duplicate date')
    }
    seen.add(date)
    const blocks = Array.isArray(day.blocks) ? day.blocks : null
    if (!blocks) {
      throw new ExceptionInputError('Blocks are required')
    }
    if (day.isClosed) {
      if (blocks.length > 0) {
        throw new ExceptionInputError('CLOSED exception cannot include blocks')
      }
      return { date, isClosed: true, blocks: [] }
    }
    if (blocks.length < 1) {
      throw new ExceptionInputError('Open exception requires at least one block')
    }
    if (blocks.length > MAX_EXCEPTION_BLOCKS) {
      throw new ExceptionInputError('Too many blocks')
    }
    const normalized = blocks.map((block) => ({
      start_time: normalizeWallTime(block.start_time),
      end_time: normalizeWallTime(block.end_time),
    }))
    assertOpenIntervals(normalized)
    return { date, isClosed: false, blocks: normalized }
  })
}

/** Gray spans outside effective intervals. Empty input is a fully closed day. */
export function nonWorkingSpans(
  intervals: Array<{ start_time: string; end_time: string }>,
): Array<{ start: string; end: string }> {
  if (intervals.length === 0) {
    return [{ start: '00:00', end: '23:59' }]
  }
  const spans: Array<{ start: string; end: string }> = []
  if (intervals[0].start_time > '00:00') {
    spans.push({ start: '00:00', end: intervals[0].start_time })
  }
  for (let i = 0; i < intervals.length - 1; i++) {
    if (intervals[i].end_time < intervals[i + 1].start_time) {
      spans.push({ start: intervals[i].end_time, end: intervals[i + 1].start_time })
    }
  }
  const lastEnd = intervals[intervals.length - 1].end_time
  if (lastEnd < '23:59') {
    spans.push({ start: lastEnd, end: '23:59' })
  }
  return spans
}

export function assertCivilDate(value: string): string {
  if (typeof value !== 'string') {
    throw new ExceptionInputError('Invalid civil date')
  }
  parseCivilDate(value)
  return value
}

function parseCivilDate(value: string): [number, number, number] {
  const match = CIVIL_DATE.exec(value)
  if (!match) {
    throw new ExceptionInputError('Invalid civil date')
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new ExceptionInputError('Invalid civil date')
  }
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (
    utc.getUTCFullYear() !== year
    || utc.getUTCMonth() !== month - 1
    || utc.getUTCDate() !== day
  ) {
    throw new ExceptionInputError('Invalid civil date')
  }
  return [year, month, day]
}

function assertOpenIntervals(intervals: EffectiveExceptionInterval[]): void {
  for (const block of intervals) {
    if (!WALL_TIME.test(block.start_time) || !WALL_TIME.test(block.end_time)) {
      throw new ExceptionInputError('Invalid time')
    }
    if (block.start_time >= block.end_time) {
      throw new ExceptionInputError('start_time must be before end_time')
    }
  }
  const sorted = [...intervals].sort((a, b) => a.start_time.localeCompare(b.start_time))
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start_time < sorted[i - 1].end_time) {
      throw new ExceptionInputError('Intervals overlap')
    }
  }
}
