import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { groupSlotsByTenantLocalDate } from '~/utils/group-slots-by-local-date'
import {
  formatInTenantZone,
  formatSlotTimeLabel,
  slotLocalDateKey,
} from '~/utils/slot-display-time'

function slot(iso: string) {
  return { id: iso, start_time: iso }
}

function grouped(isos: string[], timeZone?: string | null) {
  return groupSlotsByTenantLocalDate(isos.map(slot), timeZone).map((day) => {
    const first = day.slots[0].start_time
    return {
      dayKey: day.dayKey,
      dayName: formatInTenantZone(first, timeZone, { weekday: 'long' }, 'de-DE'),
      dateFormatted: formatInTenantZone(
        first,
        timeZone,
        { day: '2-digit', month: '2-digit', year: 'numeric' },
        'de-DE',
      ),
      times: day.slots.map((s) => formatSlotTimeLabel(s.start_time, timeZone)),
      localDates: day.slots.map((s) => slotLocalDateKey(s.start_time, timeZone)),
      startTimes: day.slots.map((s) => s.start_time),
    }
  })
}

describe('groupSlotsByTenantLocalDate', () => {
  it('puts Zurich summer midnight slots on the local calendar day', () => {
    const days = grouped(
      [
        '2026-10-17T22:30:00Z',
        '2026-10-16T22:30:00Z',
        '2026-10-17T05:00:00Z',
        '2026-10-16T21:00:00Z',
      ],
      'Europe/Zurich',
    )

    expect(days).toEqual([
      {
        dayKey: '2026-10-16',
        dayName: 'Freitag',
        dateFormatted: '16.10.2026',
        times: ['23:00'],
        localDates: ['2026-10-16'],
        startTimes: ['2026-10-16T21:00:00Z'],
      },
      {
        dayKey: '2026-10-17',
        dayName: 'Samstag',
        dateFormatted: '17.10.2026',
        times: ['00:30', '07:00'],
        localDates: ['2026-10-17', '2026-10-17'],
        startTimes: ['2026-10-16T22:30:00Z', '2026-10-17T05:00:00Z'],
      },
      {
        dayKey: '2026-10-18',
        dayName: 'Sonntag',
        dateFormatted: '18.10.2026',
        times: ['00:30'],
        localDates: ['2026-10-18'],
        startTimes: ['2026-10-17T22:30:00Z'],
      },
    ])
    for (const day of days) {
      expect(day.localDates.every((date) => date === day.dayKey)).toBe(true)
    }
  })

  it('keeps a Zurich winter midnight slot off the previous local day', () => {
    const days = grouped(
      ['2026-01-15T23:30:00Z', '2026-01-15T20:00:00Z'],
      'Europe/Zurich',
    )
    expect(days.map((day) => [day.dayKey, day.times, day.dateFormatted])).toEqual([
      ['2026-01-15', ['21:00'], '15.01.2026'],
      ['2026-01-16', ['00:30'], '16.01.2026'],
    ])
  })

  it('groups Asia/Tokyo across local midnight', () => {
    const days = grouped(
      ['2026-10-16T15:30:00Z', '2026-10-16T14:00:00Z'],
      'Asia/Tokyo',
    )
    expect(days).toMatchObject([
      { dayKey: '2026-10-16', times: ['23:00'], dateFormatted: '16.10.2026' },
      { dayKey: '2026-10-17', times: ['00:30'], dateFormatted: '17.10.2026' },
    ])
  })

  it('groups Europe/London across local midnight in summer', () => {
    const days = grouped(
      ['2026-07-15T23:30:00Z', '2026-07-15T22:00:00Z'],
      'Europe/London',
    )
    expect(days).toMatchObject([
      { dayKey: '2026-07-15', times: ['23:00'] },
      { dayKey: '2026-07-16', times: ['00:30'] },
    ])
  })

  it('uses the Europe/Zurich fallback for a missing or invalid zone', () => {
    const isos = ['2026-10-16T22:30:00Z', '2026-10-16T21:00:00Z']
    expect(grouped(isos, null)).toEqual(grouped(isos, 'Europe/Zurich'))
    expect(grouped(isos, 'Not/AZone')).toEqual(grouped(isos, 'Europe/Zurich'))
    expect(grouped(isos, 'Not/AZone').map((day) => day.dayKey)).toEqual([
      '2026-10-16',
      '2026-10-17',
    ])
  })

  it('keeps daytime slots whose UTC and local dates match in one group', () => {
    const days = grouped(
      ['2026-10-17T08:30:00Z', '2026-10-17T05:00:00Z'],
      'Europe/Zurich',
    )
    expect(days).toHaveLength(1)
    expect(days[0].dayKey).toBe('2026-10-17')
    expect(days[0].times).toEqual(['07:00', '10:30'])
    expect(days[0].startTimes).toEqual([
      '2026-10-17T05:00:00Z',
      '2026-10-17T08:30:00Z',
    ])
  })

  it('does not rewrite the stored instant', () => {
    const original = '2026-10-16T22:30:00.000Z'
    const [day] = groupSlotsByTenantLocalDate([{ start_time: original }], 'Europe/Zurich')
    expect(day.slots[0].start_time).toBe(original)
    expect(day.dayKey).toBe('2026-10-17')
  })
})

describe('booking page uses the local day key', () => {
  it('groups with bookingTimeZone and no longer keys the UTC date', () => {
    const vue = readFileSync(
      resolve(process.cwd(), 'pages/booking/availability/[slug].vue'),
      'utf8',
    )
    const start = vue.indexOf('const groupedTimeSlots = computed')
    const end = vue.indexOf('const visibleGroupedTimeSlots')
    const body = vue.slice(start, end)
    expect(body).toContain(
      'groupSlotsByTenantLocalDate(availableTimeSlots.value, bookingTimeZone.value)',
    )
    expect(body).toContain('formatBookingWeekday(firstSlot.start_time)')
    expect(body).toContain('formatBookingNumericDate(firstSlot.start_time)')
    expect(body).not.toContain('toISOString')
    expect(body).not.toContain("split('T')")
  })
})
