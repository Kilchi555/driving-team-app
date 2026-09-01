import { describe, expect, it } from 'vitest'
import {
  applyTimeRangeOverlap,
  intervalsOverlap,
  slotOverlapsAnyBusy,
} from '../time-range-overlap'

describe('intervalsOverlap', () => {
  // Marc Hermann Ferien (Apple calendar): 25.08.2026 08:00 – 06.09.2026 09:30 Zurich
  const ferienStart = '2026-08-25T06:00:00.000Z'
  const ferienEnd = '2026-09-06T07:30:00.000Z'

  it('matches a lesson on a later day of a multi-day Ferien block', () => {
    expect(
      intervalsOverlap(
        ferienStart,
        ferienEnd,
        '2026-09-01T12:30:00.000Z',
        '2026-09-01T13:30:00.000Z',
      ),
    ).toBe(true)
  })

  it('does not match a lesson after Ferien ends', () => {
    expect(
      intervalsOverlap(
        ferienStart,
        ferienEnd,
        '2026-09-06T08:00:00.000Z',
        '2026-09-06T09:00:00.000Z',
      ),
    ).toBe(false)
  })

  it('does not match a lesson before Ferien starts', () => {
    expect(
      intervalsOverlap(
        ferienStart,
        ferienEnd,
        '2026-08-25T04:00:00.000Z',
        '2026-08-25T05:00:00.000Z',
      ),
    ).toBe(false)
  })

  it('matches when the query window starts after the event start (recalc-from-now)', () => {
    const recalcStart = '2026-08-26T19:07:00.000Z'
    const recalcEnd = '2026-09-25T19:07:00.000Z'
    expect(intervalsOverlap(ferienStart, ferienEnd, recalcStart, recalcEnd)).toBe(true)
  })
})

describe('slotOverlapsAnyBusy', () => {
  const staffId = '2c9cd044-a4bb-4063-9392-f7bc943beb34'
  const ferien = {
    staff_id: staffId,
    start_time: '2026-08-25T06:00:00.000Z',
    end_time: '2026-09-06T07:30:00.000Z',
  }

  it('hides a stale availability slot that sits inside multi-day Ferien', () => {
    expect(
      slotOverlapsAnyBusy(
        {
          staff_id: staffId,
          start_time: '2026-09-01T12:30:00.000Z',
          end_time: '2026-09-01T13:30:00.000Z',
        },
        [ferien],
      ),
    ).toBe(true)
  })

  it('ignores busy times of another staff member', () => {
    expect(
      slotOverlapsAnyBusy(
        {
          staff_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          start_time: '2026-09-01T12:30:00.000Z',
          end_time: '2026-09-01T13:30:00.000Z',
        },
        [ferien],
      ),
    ).toBe(false)
  })
})

describe('applyTimeRangeOverlap', () => {
  it('filters on start < rangeEnd and end > rangeStart (not start_time >= window)', () => {
    const calls: Array<[string, string]> = []
    const query = {
      lt(column: string, value: string) {
        calls.push(['lt', `${column}:${value}`])
        return this
      },
      gt(column: string, value: string) {
        calls.push(['gt', `${column}:${value}`])
        return this
      },
    }

    applyTimeRangeOverlap(query, '2026-08-26T19:07:00.000Z', '2026-09-25T19:07:00.000Z')

    expect(calls).toEqual([
      ['lt', 'start_time:2026-09-25T19:07:00.000Z'],
      ['gt', 'end_time:2026-08-26T19:07:00.000Z'],
    ])
  })
})
