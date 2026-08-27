import { describe, expect, it } from 'vitest'
import { staffCalendarBlocksMatch, staffCourseBlockTitle } from '../course-staff-notifications'

describe('staffCalendarBlocksMatch', () => {
  const sessions = [
    { id: 's1', start_time: '2026-09-12T11:00:00.000Z', end_time: '2026-09-12T15:00:00.000Z' },
    { id: 's2', start_time: '2026-09-13T11:00:00.000Z', end_time: '2026-09-13T15:00:00.000Z' },
    { id: 's3', start_time: '2026-09-15T15:00:00.000Z', end_time: '2026-09-15T19:00:00.000Z' },
  ]

  it('matches padded calendar blocks for current session times', () => {
    const appointments = [
      { start_time: '2026-09-12T10:15:00.000Z', end_time: '2026-09-12T15:15:00.000Z' },
      { start_time: '2026-09-13T10:15:00.000Z', end_time: '2026-09-13T15:15:00.000Z' },
      { start_time: '2026-09-15T14:15:00.000Z', end_time: '2026-09-15T19:15:00.000Z' },
    ]
    expect(staffCalendarBlocksMatch(sessions, appointments)).toBe(true)
  })

  it('detects leftover blocks after SARI moved the course dates', () => {
    const staleAppointments = [
      { start_time: '2026-09-07T09:15:00.000Z', end_time: '2026-09-07T14:15:00.000Z' },
      { start_time: '2026-09-14T09:15:00.000Z', end_time: '2026-09-14T14:15:00.000Z' },
      { start_time: '2026-09-21T09:15:00.000Z', end_time: '2026-09-21T14:15:00.000Z' },
    ]
    expect(staffCalendarBlocksMatch(sessions, staleAppointments)).toBe(false)
  })

  it('detects missing calendar blocks after a cancel/reactivate cycle', () => {
    expect(staffCalendarBlocksMatch(sessions, [])).toBe(false)
  })
})

describe('staffCourseBlockTitle', () => {
  it('uses this block’s session date and time, not the course start', () => {
    expect(staffCourseBlockTitle(
      { id: 'c1', name: 'Motorrad Zürich-Altstetten - 12.09.2026', tenant_id: 't1' },
      [{ id: 's3', start_time: '2026-09-15T15:00:00.000Z', end_time: '2026-09-15T19:00:00.000Z' }],
    )).toBe('Motorrad Zürich-Altstetten · 15.09. 17:00–21:00')
  })
})
