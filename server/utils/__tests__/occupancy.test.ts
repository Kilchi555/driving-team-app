import { describe, expect, it } from 'vitest'
import {
  appointmentMayConfirmFromPayment,
  appointmentOccupiesStaff,
  timesOverlap,
} from '../occupancy'

describe('appointmentOccupiesStaff', () => {
  it('treats pending as occupying', () => {
    expect(appointmentOccupiesStaff({ status: 'pending', occupies_staff: true })).toBe(true)
  })

  it('treats confirmed as occupying', () => {
    expect(appointmentOccupiesStaff({ status: 'confirmed', occupies_staff: true })).toBe(true)
  })

  it('does not treat cancelled or deleted as occupying', () => {
    expect(appointmentOccupiesStaff({ status: 'cancelled', occupies_staff: true })).toBe(false)
    expect(appointmentOccupiesStaff({ status: 'deleted', occupies_staff: true })).toBe(false)
    expect(appointmentOccupiesStaff({ status: 'confirmed', deleted_at: '2026-01-01T00:00:00Z', occupies_staff: true })).toBe(false)
  })

  it('does not occupy when occupies_staff is false', () => {
    expect(appointmentOccupiesStaff({ status: 'confirmed', occupies_staff: false })).toBe(false)
  })

  it('does not use scheduled as the active filter', () => {
    expect(appointmentOccupiesStaff({ status: 'confirmed', occupies_staff: true })).toBe(true)
    expect(appointmentOccupiesStaff({ status: 'scheduled', occupies_staff: true })).toBe(true)
  })
})

describe('appointmentMayConfirmFromPayment', () => {
  it('allows pending and leftover scheduled', () => {
    expect(appointmentMayConfirmFromPayment({ status: 'pending' })).toBe(true)
    expect(appointmentMayConfirmFromPayment({ status: 'scheduled' })).toBe(true)
  })

  it('never resurrects cancelled or deleted', () => {
    expect(appointmentMayConfirmFromPayment({ status: 'cancelled' })).toBe(false)
    expect(appointmentMayConfirmFromPayment({ status: 'deleted' })).toBe(false)
    expect(appointmentMayConfirmFromPayment({ status: 'pending', deleted_at: '2026-01-01T00:00:00Z' })).toBe(false)
  })

  it('does not change already confirmed', () => {
    expect(appointmentMayConfirmFromPayment({ status: 'confirmed' })).toBe(false)
  })
})

describe('timesOverlap', () => {
  it('detects a 15 minute overlap', () => {
    expect(timesOverlap(
      '2026-09-16T15:45:00Z',
      '2026-09-16T16:45:00Z',
      '2026-09-16T14:30:00Z',
      '2026-09-16T16:00:00Z'
    )).toBe(true)
  })

  it('allows adjacent ranges', () => {
    expect(timesOverlap(
      '2026-09-16T16:00:00Z',
      '2026-09-16T17:00:00Z',
      '2026-09-16T15:00:00Z',
      '2026-09-16T16:00:00Z'
    )).toBe(false)
  })
})
