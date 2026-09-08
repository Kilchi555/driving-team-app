import { describe, expect, it } from 'vitest'
import {
  filterOccupyingAppointments,
  occupiesScheduleSlot,
} from '~/utils/appointment-schedule-occupancy'

describe('appointment schedule occupancy', () => {
  it('treats confirmed/scheduled/pending as occupying', () => {
    for (const status of ['confirmed', 'scheduled', 'pending', 'pending_confirmation']) {
      expect(occupiesScheduleSlot({ status, deleted_at: null })).toBe(true)
    }
  })

  it('never lets cancelled occupy a slot even with deleted_at NULL', () => {
    expect(occupiesScheduleSlot({ status: 'cancelled', deleted_at: null })).toBe(false)
    expect(occupiesScheduleSlot({ status: 'canceled', deleted_at: null })).toBe(false)
  })

  it('respects soft-delete independently of status', () => {
    expect(occupiesScheduleSlot({
      status: 'confirmed',
      deleted_at: '2026-08-29T20:48:00.000Z',
    })).toBe(false)
  })

  it('filters mixed schedule rows for availability', () => {
    const rows = [
      { id: 'c', status: 'cancelled', deleted_at: null },
      { id: 'ok', status: 'confirmed', deleted_at: null },
      { id: 'del', status: 'confirmed', deleted_at: 'x' },
      { id: 'pend', status: 'pending', deleted_at: null },
    ]
    expect(filterOccupyingAppointments(rows).map((r) => r.id)).toEqual(['ok', 'pend'])
  })
})
