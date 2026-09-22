import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  decideNonWorkingDisplay,
  failClosedSpans,
  finishCalendarReload,
  graySpansForCivilDates,
  requestCalendarReload,
  type DisplaySpan,
} from '../../../utils/calendar-non-working-display'
import type { EffectiveWeeklyHour } from '../../../utils/effective-working-hours'

const monday = '2026-09-14'

function weekly(start: string, end: string): EffectiveWeeklyHour {
  return { day_of_week: 1, start_time: start, end_time: end, is_active: true, timezone: 'Europe/Zurich' }
}

describe('calendar non-working display', () => {
  const previous: DisplaySpan[] = [
    { date: monday, start: '00:00', end: '14:00' },
    { date: monday, start: '16:00', end: '23:59' },
  ]
  const next: DisplaySpan[] = [
    { date: monday, start: '00:00', end: '10:00' },
    { date: monday, start: '12:00', end: '23:59' },
  ]

  it('keeps the last successful gray blocks when the exception request fails', () => {
    const shown = decideNonWorkingDisplay(previous, { ok: false }, failClosedSpans([monday]))
    expect(shown.display).toEqual(previous)
    expect(shown.showError).toBe(true)
    expect(shown.usingFailClosed).toBe(false)
    expect(shown.display).not.toEqual([])
  })

  it('exposes a visible error without replacing a known schedule with an open day', () => {
    const shown = decideNonWorkingDisplay(previous, { ok: false }, failClosedSpans([monday]))
    expect(shown.showError).toBe(true)
    expect(shown.display.some((span) => span.start === '00:00')).toBe(true)
    expect(shown.display).not.toEqual([{ date: monday, start: '00:00', end: '23:59' }])

    const calendar = readFileSync(resolve(process.cwd(), 'components/CalendarComponent.vue'), 'utf8')
    expect(calendar).toContain('nonWorkingLoadError')
    expect(calendar).toContain('Erneut laden')
    expect(calendar).toContain('role="status"')
    expect(calendar).not.toContain('skipping gray blocks')
  })

  it('replaces the cached schedule only after a later success', () => {
    const kept = decideNonWorkingDisplay(previous, { ok: false }, failClosedSpans([monday]))
    expect(kept.display).toEqual(previous)
    const replaced = decideNonWorkingDisplay(kept.lastSuccessful, { ok: true, blocks: next }, failClosedSpans([monday]))
    expect(replaced.display).toEqual(next)
    expect(replaced.lastSuccessful).toEqual(next)
    expect(replaced.showError).toBe(false)
  })

  it('does not render an open day when the first load fails', () => {
    const shown = decideNonWorkingDisplay(null, { ok: false }, failClosedSpans([monday, '2026-09-15']))
    expect(shown.lastSuccessful).toBeNull()
    expect(shown.usingFailClosed).toBe(true)
    expect(shown.showError).toBe(true)
    expect(shown.display).toEqual([
      { date: monday, start: '00:00', end: '23:59' },
      { date: '2026-09-15', start: '00:00', end: '23:59' },
    ])
  })

  it('keeps weekly-plus-exception gray identical to the resolver', () => {
    const replaced = graySpansForCivilDates(
      [monday],
      [weekly('14:00', '16:00')],
      new Map([[monday, { isClosed: false, intervals: [{ start_time: '10:00', end_time: '12:00' }] }]]),
    )
    expect(replaced).toEqual([
      { date: monday, start: '00:00', end: '10:00' },
      { date: monday, start: '12:00', end: '23:59' },
    ])

    const weeklyOnly = graySpansForCivilDates([monday], [weekly('14:00', '16:00')], new Map())
    expect(weeklyOnly).toEqual([
      { date: monday, start: '00:00', end: '14:00' },
      { date: monday, start: '16:00', end: '23:59' },
    ])

    const split = graySpansForCivilDates(
      [monday],
      [weekly('08:00', '18:00')],
      new Map([[monday, {
        isClosed: false,
        intervals: [
          { start_time: '10:00', end_time: '12:00' },
          { start_time: '13:00', end_time: '16:00' },
        ],
      }]]),
    )
    expect(split).toEqual([
      { date: monday, start: '00:00', end: '10:00' },
      { date: monday, start: '12:00', end: '13:00' },
      { date: monday, start: '16:00', end: '23:59' },
    ])
  })

  it('runs a queued force reload after the in-flight load so save and delete are not dropped', () => {
    const busy = requestCalendarReload({ busy: true, queuedForce: false }, true)
    expect(busy.start).toBe(false)
    expect(busy.gate.queuedForce).toBe(true)

    const finished = finishCalendarReload(busy.gate)
    expect(finished.startForce).toBe(true)

    const saved = decideNonWorkingDisplay(previous, { ok: true, blocks: next }, failClosedSpans([monday]))
    expect(saved.display).toEqual(next)

    const restored = decideNonWorkingDisplay(saved.lastSuccessful, { ok: true, blocks: previous }, failClosedSpans([monday]))
    expect(restored.display).toEqual(previous)
    expect(restored.showError).toBe(false)
  })
})
