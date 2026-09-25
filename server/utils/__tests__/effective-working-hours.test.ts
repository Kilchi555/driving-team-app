import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { wallTimeToUtc } from '../zurich-wall-time'
import { isWithinTimeWindows } from '../../../utils/travelTimeValidation'
import {
  ExceptionInputError,
  civilDayOfWeek,
  nonWorkingSpans,
  resolveEffectiveWorkingHours,
  utcCivilDate,
  validateExceptionDays,
  zurichCivilDate,
  type EffectiveException,
  type EffectiveWeeklyHour,
} from '../../../utils/effective-working-hours'

const monday = '2026-09-14'
const saturday = '2026-09-12'
const sunday = '2026-09-13'

function weekly(day: number, start: string, end: string): EffectiveWeeklyHour {
  return { day_of_week: day, start_time: start, end_time: end, is_active: true, timezone: 'Europe/Zurich' }
}

function hours(date: string, rows: EffectiveWeeklyHour[], exception: EffectiveException | null = null) {
  return resolveEffectiveWorkingHours({
    civilDate: date,
    dayOfWeek: civilDayOfWeek(date),
    weeklyHours: rows,
    exception,
    timezone: 'Europe/Zurich',
  }).map((interval) => `${interval.start_time}-${interval.end_time}`)
}

describe('resolveEffectiveWorkingHours', () => {
  const mondayHours = [
    weekly(1, '08:00', '12:00'),
    weekly(1, '13:00', '18:00'),
    weekly(1, '14:00:00', '16:00:00'),
  ]

  it('uses weekly hours when no exception exists', () => {
    expect(hours(monday, [weekly(1, '14:00', '16:00')])).toEqual(['14:00-16:00'])
  })

  it('replaces weekly hours and does not merge them', () => {
    expect(hours(monday, [weekly(1, '14:00', '16:00')], {
      isClosed: false,
      intervals: [{ start_time: '10:00', end_time: '12:00' }],
    })).toEqual(['10:00-12:00'])

    expect(hours(monday, [weekly(1, '14:00', '16:00')], {
      isClosed: false,
      intervals: [{ start_time: '08:00', end_time: '10:00' }],
    })).toEqual(['08:00-10:00'])
  })

  it('opens a weekday that has no weekly hours', () => {
    expect(hours(monday, [], {
      isClosed: false,
      intervals: [{ start_time: '10:00', end_time: '16:00' }],
    })).toEqual(['10:00-16:00'])
  })

  it('shrinks and extends by replacement', () => {
    expect(hours(monday, [weekly(1, '08:00', '18:00')], {
      isClosed: false,
      intervals: [{ start_time: '10:00', end_time: '15:00' }],
    })).toEqual(['10:00-15:00'])

    expect(hours(monday, [weekly(1, '08:00', '18:00')], {
      isClosed: false,
      intervals: [{ start_time: '07:00', end_time: '20:00' }],
    })).toEqual(['07:00-20:00'])
  })

  it('keeps multiple exception intervals and ignores the weekly split', () => {
    expect(hours(monday, mondayHours, {
      isClosed: false,
      intervals: [
        { start_time: '13:00', end_time: '15:00' },
        { start_time: '10:00', end_time: '12:00' },
      ],
    })).toEqual(['10:00-12:00', '13:00-15:00'])
  })

  it('returns no hours for CLOSED and restores weekly hours when the exception is gone', () => {
    expect(hours(monday, [weekly(1, '14:00', '16:00')], { isClosed: true, intervals: [] })).toEqual([])
    expect(hours(monday, [weekly(1, '14:00', '16:00')], null)).toEqual(['14:00-16:00'])
  })

  it('keeps independent dates independent', () => {
    const weeklyMonday = [weekly(1, '14:00', '16:00')]
    expect(hours('2026-09-14', weeklyMonday, {
      isClosed: false,
      intervals: [{ start_time: '10:00', end_time: '12:00' }],
    })).toEqual(['10:00-12:00'])
    expect(hours('2026-09-21', weeklyMonday, {
      isClosed: false,
      intervals: [{ start_time: '08:00', end_time: '10:00' }],
    })).toEqual(['08:00-10:00'])
    expect(hours('2026-09-28', weeklyMonday, null)).toEqual(['14:00-16:00'])
  })

  it('rejects invalid intervals and civil dates', () => {
    expect(() => hours(monday, [], {
      isClosed: false,
      intervals: [{ start_time: '12:00', end_time: '10:00' }],
    })).toThrow(ExceptionInputError)
    expect(() => hours(monday, [], {
      isClosed: false,
      intervals: [{ start_time: '10:00', end_time: '10:00' }],
    })).toThrow(/before end_time/)
    expect(() => validateExceptionDays([{
      date: '2099-01-04',
      isClosed: false,
      blocks: [
        { start_time: '10:00', end_time: '13:00' },
        { start_time: '12:00', end_time: '15:00' },
      ],
    }])).toThrow(/overlap/i)
    expect(() => hours('2026-02-31', [])).toThrow(/civil date/i)
    expect(() => hours('19.09.2026', [])).toThrow(/civil date/i)
  })

  it('maps Saturday and Sunday from the civil date, not from an instant', () => {
    expect(civilDayOfWeek(saturday)).toBe(6)
    expect(civilDayOfWeek(sunday)).toBe(7)
    expect(hours(saturday, [weekly(6, '10:00', '14:00')])).toEqual(['10:00-14:00'])
    expect(hours(sunday, [weekly(7, '09:00', '12:00')])).toEqual(['09:00-12:00'])
    expect(new Date(Date.UTC(2026, 8, 12)).getUTCDay()).toBe(6)
  })

  it('keeps the civil day when Zurich midnight is still the previous UTC date', () => {
    const earlyMonday = wallTimeToUtc(2026, 8, 14, 0, 30, 'Europe/Zurich')
    expect(earlyMonday.toISOString().startsWith('2026-09-13')).toBe(true)
    expect(utcCivilDate(earlyMonday)).toBe('2026-09-13')
    expect(civilDayOfWeek('2026-09-14')).toBe(1)
    expect(hours('2026-09-14', [weekly(1, '14:00', '16:00')])).toEqual(['14:00-16:00'])
  })

  it('lets wallTimeToUtc apply the spring and autumn offsets without moving the civil date', () => {
    const springBefore = wallTimeToUtc(2026, 2, 28, 10, 0, 'Europe/Zurich')
    const springAfter = wallTimeToUtc(2026, 2, 29, 10, 0, 'Europe/Zurich')
    expect(springBefore.toISOString()).toBe('2026-03-28T09:00:00.000Z')
    expect(springAfter.toISOString()).toBe('2026-03-29T08:00:00.000Z')
    expect(hours('2026-03-29', [weekly(7, '10:00', '12:00')])).toEqual(['10:00-12:00'])

    const autumnBefore = wallTimeToUtc(2026, 9, 24, 10, 0, 'Europe/Zurich')
    const autumnAfter = wallTimeToUtc(2026, 9, 25, 10, 0, 'Europe/Zurich')
    expect(autumnBefore.toISOString()).toBe('2026-10-24T08:00:00.000Z')
    expect(autumnAfter.toISOString()).toBe('2026-10-25T09:00:00.000Z')
    expect(civilDayOfWeek('2026-10-25')).toBe(7)
    expect(zurichCivilDate(new Date('2026-10-24T22:30:00.000Z'))).toBe('2026-10-25')
    expect(utcCivilDate(new Date('2026-10-24T22:30:00.000Z'))).toBe('2026-10-24')
    expect(zurichCivilDate(autumnAfter)).toBe('2026-10-25')
  })

  it('paints gaps outside effective intervals, including a fully closed day', () => {
    const effective = resolveEffectiveWorkingHours({
      civilDate: monday,
      dayOfWeek: 1,
      weeklyHours: [weekly(1, '08:00', '18:00')],
      exception: {
        isClosed: false,
        intervals: [
          { start_time: '10:00', end_time: '12:00' },
          { start_time: '13:00', end_time: '16:00' },
        ],
      },
    })
    expect(nonWorkingSpans(effective)).toEqual([
      { start: '00:00', end: '10:00' },
      { start: '12:00', end: '13:00' },
      { start: '16:00', end: '23:59' },
    ])
    expect(nonWorkingSpans([])).toEqual([{ start: '00:00', end: '23:59' }])
  })

  it('rejects past dates, closed-with-blocks, open-without-blocks, and a bad day inside a batch', () => {
    expect(() => validateExceptionDays([{
      date: '2020-01-06',
      isClosed: false,
      blocks: [{ start_time: '10:00', end_time: '12:00' }],
    }])).toThrow(/before today/)

    expect(() => validateExceptionDays([{
      date: '2099-01-04',
      isClosed: true,
      blocks: [{ start_time: '10:00', end_time: '12:00' }],
    }])).toThrow(/CLOSED/)

    expect(() => validateExceptionDays([{
      date: '2099-01-04',
      isClosed: false,
      blocks: [],
    }])).toThrow(/at least one block/)

    expect(() => validateExceptionDays([
      { date: '2099-01-04', isClosed: false, blocks: [{ start_time: '10:00', end_time: '12:00' }] },
      { date: '2099-02-31', isClosed: true, blocks: [] },
    ])).toThrow(/civil date/)
  })
})

describe('availability integration contracts', () => {
  const calculator = readFileSync(
    resolve(process.cwd(), 'server/services/availability-calculator.ts'),
    'utf8',
  )
  const publicSlots = readFileSync(
    resolve(process.cwd(), 'server/api/booking/get-available-slots.get.ts'),
    'utf8',
  )
  const migration = readFileSync(
    resolve(process.cwd(), 'migrations/20260922_staff_working_hour_exceptions.sql'),
    'utf8',
  )

  it('resolves effective hours inside generateSlots and still subtracts the existing blockers', () => {
    expect(calculator).toContain('resolveEffectiveWorkingHours')
    expect(calculator).toContain('loadWorkingHourExceptions')
    expect(calculator).toContain('tenantId is required to resolve working-hour exceptions')
    expect(calculator).not.toContain('Skipping working-hour exceptions because tenantId is missing')
    expect(calculator).toContain(".eq('tenant_id', tenantId)")
    expect(calculator).toContain('hasConflict')
    expect(calculator).toContain('isWithinTimeWindows')
    const writeSlots = calculator.slice(
      calculator.indexOf('private async writeSlots'),
      calculator.indexOf('Get day of week'),
    )
    expect(writeSlots).not.toContain("from('appointments')")
    expect(writeSlots).toContain('isActivelyReserved')
    expect(writeSlots).toContain('reserved_by_session')
    expect(writeSlots).toContain('reserved_until')
  })

  it('keeps a future reservation when the new set does not contain that slot', () => {
    const now = new Date('2026-09-14T08:00:00.000Z')
    const slot = {
      reserved_by_session: 'session-1',
      reserved_until: '2026-09-14T08:10:00.000Z',
    }
    const activelyReserved = Boolean(
      slot.reserved_by_session
      && slot.reserved_until
      && new Date(slot.reserved_until) > now,
    )
    expect(activelyReserved).toBe(true)

    const expired = {
      reserved_by_session: 'session-1',
      reserved_until: '2026-09-14T07:00:00.000Z',
    }
    expect(new Date(expired.reserved_until) > now).toBe(false)
  })

  it('keeps a closed location as a hard intersection', () => {
    const mondayMorning = new Date(2026, 8, 14, 10, 0, 0)
    expect(mondayMorning.getDay()).toBe(1)
    expect(isWithinTimeWindows(mondayMorning, [
      { start: '08:00', end: '18:00', days: [2, 3, 4, 5] },
    ])).toBe(false)
    expect(isWithinTimeWindows(mondayMorning, [])).toBe(true)
  })

  it('does not make public booking read exception rows', () => {
    expect(publicSlots).not.toContain('staff_working_hour_exceptions')
  })

  it('encodes database integrity in the unapplied migration', () => {
    expect(migration).toContain('CHECK (start_time < end_time)')
    expect(migration).toContain('FOREIGN KEY (exception_id, tenant_id, staff_id)')
    expect(migration).toContain('closed_exception_cannot_have_intervals')
    expect(migration).toContain('open_exception_requires_interval')
    expect(migration).toContain('overlapping_intervals')
    expect(migration).toContain('NEW.start_time < existing.end_time')
    expect(migration).toContain('NEW.end_time > existing.start_time')
    expect(migration).toContain('DEFERRABLE INITIALLY DEFERRED')
    expect(migration).toContain('child tenant != parent tenant')
    expect(migration).toContain('REVOKE ALL ON TABLE public.staff_working_hour_exceptions FROM anon')
    expect(migration).not.toMatch(/CREATE POLICY[\s\S]{0,120}FOR ALL/)
    expect(migration).not.toMatch(/ALTER TABLE public\.staff_working_hours/)
    expect(migration).not.toMatch(/UPDATE public\.availability_slots/)
    expect(migration).not.toMatch(/DELETE FROM public\.appointments/)
  })

  it('rejects past civil dates in the database trigger, using Europe/Zurich', () => {
    const guard = readFileSync(
      resolve(process.cwd(), 'migrations/20260925_staff_working_hour_exception_not_past.sql'),
      'utf8',
    )
    expect(guard).toContain('enforce_staff_working_hour_exception_not_past')
    expect(guard).toContain("(timezone('Europe/Zurich', now()))::date")
    expect(guard).toContain('BEFORE INSERT OR UPDATE')
    expect(guard).toContain("RAISE EXCEPTION 'date_in_past'")
    expect(guard).not.toContain('CHECK (exception_date')
  })
})
