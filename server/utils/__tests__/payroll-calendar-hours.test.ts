import { describe, expect, it } from 'vitest'
import { summarizeStaffMonthHours } from '../payroll-calendar-hours'

const staff = 'staff-1'

function apt(partial: {
  start_time: string
  duration_minutes: number
  event_type_code?: string
  status?: string
  payments?: Array<{ payment_status: string }>
}) {
  return { staff_id: staff, ...partial }
}

describe('summarizeStaffMonthHours', () => {
  it('counts worked lessons and weekday vacation days', () => {
    const row = summarizeStaffMonthHours(
      [
        apt({ start_time: '2026-08-03T07:00:00.000Z', duration_minutes: 90 }),
        apt({ start_time: '2026-08-04T07:00:00.000Z', duration_minutes: 720, event_type_code: 'vacation' }),
        apt({ start_time: '2026-08-08T07:00:00.000Z', duration_minutes: 720, event_type_code: 'vacation' }),
      ],
      staff,
      2026,
      8,
      33.75,
    )
    expect(row.actual_hours).toBe(1.5)
    expect(row.vacation_days).toBe(1)
    expect(row.vacation_hours).toBe(6.5)
  })

  it('ignores cancelled unpaid appointments', () => {
    const row = summarizeStaffMonthHours(
      [apt({
        start_time: '2026-08-03T07:00:00.000Z',
        duration_minutes: 90,
        status: 'cancelled',
        payments: [{ payment_status: 'cancelled' }],
      })],
      staff,
      2026,
      8,
    )
    expect(row.actual_hours).toBe(0)
  })

  it('keeps charged cancellations as worked hours', () => {
    const row = summarizeStaffMonthHours(
      [apt({
        start_time: '2026-08-03T07:00:00.000Z',
        duration_minutes: 60,
        status: 'cancelled',
        payments: [{ payment_status: 'completed' }],
      })],
      staff,
      2026,
      8,
    )
    expect(row.actual_hours).toBe(1)
  })
})
