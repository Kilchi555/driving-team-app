import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RESCHEDULE_EMAIL_TRIGGERS,
  detectRescheduleChanges,
  normalizeRescheduleEmailTriggers,
  parseRescheduleChangedFields,
  shouldNotifyRescheduleChange,
} from '~/utils/reschedule-email-triggers'

describe('normalizeRescheduleEmailTriggers', () => {
  it('defaults to datetime only when missing', () => {
    expect(normalizeRescheduleEmailTriggers(undefined)).toEqual(['datetime'])
    expect(normalizeRescheduleEmailTriggers(null)).toEqual(['datetime'])
  })

  it('keeps an explicit empty list', () => {
    expect(normalizeRescheduleEmailTriggers([])).toEqual([])
  })

  it('drops unknown values', () => {
    expect(normalizeRescheduleEmailTriggers(['datetime', 'notes', 'staff'])).toEqual(['datetime', 'staff'])
  })
})

describe('parseRescheduleChangedFields', () => {
  it('treats omitted values as a datetime change for legacy callers', () => {
    expect(parseRescheduleChangedFields(undefined)).toEqual(['datetime'])
    expect(parseRescheduleChangedFields(null)).toEqual(['datetime'])
  })

  it('does not invent a datetime change from an empty list', () => {
    expect(parseRescheduleChangedFields([])).toEqual([])
    expect(shouldNotifyRescheduleChange(['datetime'], [])).toBe(false)
  })
})

describe('shouldNotifyRescheduleChange', () => {
  it('notifies on date/time with the default policy', () => {
    expect(shouldNotifyRescheduleChange(undefined, ['datetime'])).toBe(true)
    expect(shouldNotifyRescheduleChange(DEFAULT_RESCHEDULE_EMAIL_TRIGGERS, ['duration'])).toBe(false)
    expect(shouldNotifyRescheduleChange(DEFAULT_RESCHEDULE_EMAIL_TRIGGERS, ['staff'])).toBe(false)
  })

  it('notifies when an enabled extra trigger matches', () => {
    expect(shouldNotifyRescheduleChange(['datetime', 'duration'], ['duration'])).toBe(true)
    expect(shouldNotifyRescheduleChange(['staff'], ['location'])).toBe(false)
  })

  it('treats omitted changed fields as a datetime change', () => {
    expect(shouldNotifyRescheduleChange(['datetime'], undefined)).toBe(true)
    expect(shouldNotifyRescheduleChange([], undefined)).toBe(false)
  })
})

describe('detectRescheduleChanges', () => {
  const base = {
    startDate: '2026-08-29',
    startTime: '10:00',
    duration_minutes: 45,
    staff_id: 'staff-1',
    location_id: 'loc-1',
    custom_location_name: '',
    vehicle_id: null,
    vehicle_mode: null,
    room_id: null,
  }

  it('returns nothing when the snapshot is unchanged', () => {
    expect(detectRescheduleChanges(base, { ...base, startTime: '10:00:00' })).toEqual([])
  })

  it('detects a one-minute start-time change', () => {
    expect(detectRescheduleChanges(base, { ...base, startTime: '10:01' })).toEqual(['datetime'])
  })

  it('ignores missing duration instead of treating it as a change', () => {
    expect(detectRescheduleChanges(
      { ...base, duration_minutes: undefined },
      { ...base, duration_minutes: 45 },
    )).toEqual([])
  })

  it('detects duration, staff, location and resource independently', () => {
    expect(detectRescheduleChanges(base, { ...base, duration_minutes: 90 })).toEqual(['duration'])
    expect(detectRescheduleChanges(base, { ...base, staff_id: 'staff-2' })).toEqual(['staff'])
    expect(detectRescheduleChanges(base, { ...base, location_id: 'loc-2' })).toEqual(['location'])
    expect(detectRescheduleChanges(base, { ...base, vehicle_id: 'car-1' })).toEqual(['resource'])
  })

  it('does not flag staff when one side is empty', () => {
    expect(detectRescheduleChanges(
      { ...base, staff_id: '' },
      { ...base, staff_id: 'staff-1' },
    )).toEqual([])
  })
})
