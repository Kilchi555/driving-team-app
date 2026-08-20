import { describe, expect, it } from 'vitest'
import { isCategoryPassed, isStudentCompleted } from '~/utils/student-exam'
import {
  aggregateStudentAppointmentActivity,
  compareByLastAppointmentOldestFirst,
  filterIdleStudents,
  matchesIdleFilter
} from '~/utils/student-appointment-activity'

const NOW = new Date('2026-08-20T10:00:00.000Z')

describe('isCategoryPassed / isStudentCompleted', () => {
  it('matches category variants against exam_passed_categories', () => {
    const student = { category: ['B Automatik', 'BE'], exam_passed_categories: ['B'] }
    expect(isCategoryPassed(student, 'B Automatik')).toBe(true)
    expect(isCategoryPassed(student, 'BE')).toBe(false)
    expect(isStudentCompleted(student)).toBe(false)
  })

  it('treats a student as completed only when every enrolled category is passed', () => {
    expect(isStudentCompleted({ category: ['B'], exam_passed_categories: ['B'] })).toBe(true)
    expect(isStudentCompleted({ category: [], exam_passed_categories: ['B'] })).toBe(false)
    expect(isStudentCompleted({ category: ['B'], exam_passed_categories: [] })).toBe(false)
  })
})

describe('aggregateStudentAppointmentActivity', () => {
  it('returns an entry for every requested student even without appointments', () => {
    const result = aggregateStudentAppointmentActivity([], ['a', 'b'], NOW)
    expect(result).toEqual({
      a: { lastStartTime: null, hasUpcoming: false },
      b: { lastStartTime: null, hasUpcoming: false }
    })
  })

  it('uses the latest non-cancelled appointment and detects upcoming bookings', () => {
    const result = aggregateStudentAppointmentActivity([
      { user_id: 's1', start_time: '2026-06-01T08:00:00.000Z', status: 'completed' },
      { user_id: 's1', start_time: '2026-07-01T08:00:00.000Z', status: 'cancelled' },
      { user_id: 's1', start_time: '2026-09-01T08:00:00.000Z', status: 'scheduled' },
      { user_id: 's2', start_time: '2026-05-01T08:00:00.000Z', status: 'completed' }
    ], ['s1', 's2'], NOW)

    expect(result.s1.hasUpcoming).toBe(true)
    expect(result.s1.lastStartTime).toBe('2026-09-01T08:00:00.000Z')
    expect(result.s2).toEqual({
      lastStartTime: '2026-05-01T08:00:00.000Z',
      hasUpcoming: false
    })
  })
})

describe('matchesIdleFilter', () => {
  const idleOld = { lastStartTime: '2026-05-01T08:00:00.000Z', hasUpcoming: false }
  const idleRecent = { lastStartTime: '2026-08-15T08:00:00.000Z', hasUpcoming: false }
  const booked = { lastStartTime: '2026-09-01T08:00:00.000Z', hasUpcoming: true }
  const never = { lastStartTime: null, hasUpcoming: false }

  it('keeps everyone for all', () => {
    expect(matchesIdleFilter(booked, 'all', NOW)).toBe(true)
    expect(matchesIdleFilter(never, 'all', NOW)).toBe(true)
  })

  it('no_upcoming ignores last-lesson age', () => {
    expect(matchesIdleFilter(idleRecent, 'no_upcoming', NOW)).toBe(true)
    expect(matchesIdleFilter(booked, 'no_upcoming', NOW)).toBe(false)
  })

  it('days filter requires no upcoming booking and a last lesson older than the threshold', () => {
    expect(matchesIdleFilter(idleOld, '30', NOW)).toBe(true)
    expect(matchesIdleFilter(idleOld, 45, NOW)).toBe(true)
    expect(matchesIdleFilter(idleRecent, '30', NOW)).toBe(false)
    expect(matchesIdleFilter(booked, '30', NOW)).toBe(false)
    expect(matchesIdleFilter(never, '30', NOW)).toBe(true)
  })

  it('never only matches students without any counted appointment', () => {
    expect(matchesIdleFilter(never, 'never', NOW)).toBe(true)
    expect(matchesIdleFilter(idleOld, 'never', NOW)).toBe(false)
    expect(matchesIdleFilter(booked, 'never', NOW)).toBe(false)
  })
})

describe('filterIdleStudents', () => {
  it('drops students who already passed every enrolled category', () => {
    const students = [
      { id: 'done', category: ['B'], exam_passed_categories: ['B'] },
      { id: 'open', category: ['B'], exam_passed_categories: [] }
    ]
    const activity = {
      done: { lastStartTime: '2026-01-01T00:00:00.000Z', hasUpcoming: false },
      open: { lastStartTime: '2026-01-01T00:00:00.000Z', hasUpcoming: false }
    }

    expect(filterIdleStudents(students, activity, '30', NOW).map(s => s.id)).toEqual(['open'])
  })
})

describe('compareByLastAppointmentOldestFirst', () => {
  it('sorts never-booked students first, then oldest last lesson', () => {
    const items = [
      { lastStartTime: '2026-07-01T00:00:00.000Z', hasUpcoming: false },
      { lastStartTime: null, hasUpcoming: false },
      { lastStartTime: '2026-03-01T00:00:00.000Z', hasUpcoming: false }
    ]
    const sorted = [...items].sort(compareByLastAppointmentOldestFirst)
    expect(sorted.map(i => i.lastStartTime)).toEqual([
      null,
      '2026-03-01T00:00:00.000Z',
      '2026-07-01T00:00:00.000Z'
    ])
  })
})
