import { describe, expect, it } from 'vitest'
import {
  EMPTY_BOOKING_WEEK_MESSAGE,
  resolveBookingWeekView,
  shouldFetchLastBookingPrefs,
} from '../booking-week-view'

describe('shouldFetchLastBookingPrefs', () => {
  it('does not call for a guest (no role)', () => {
    expect(shouldFetchLastBookingPrefs(undefined)).toBe(false)
    expect(shouldFetchLastBookingPrefs(null)).toBe(false)
    expect(shouldFetchLastBookingPrefs('')).toBe(false)
  })

  it('calls for an authenticated client', () => {
    expect(shouldFetchLastBookingPrefs('client')).toBe(true)
  })

  it('does not call for admin, staff, tenant_admin, or super_admin', () => {
    expect(shouldFetchLastBookingPrefs('admin')).toBe(false)
    expect(shouldFetchLastBookingPrefs('staff')).toBe(false)
    expect(shouldFetchLastBookingPrefs('tenant_admin')).toBe(false)
    expect(shouldFetchLastBookingPrefs('super_admin')).toBe(false)
  })
})

describe('resolveBookingWeekView', () => {
  const week1 = { week_number: 1 }
  const week3 = { week_number: 3 }

  it('shows slots when the current week has slots', () => {
    expect(resolveBookingWeekView({
      loading: false,
      error: null,
      slots: [week1, week1],
      week: 1,
    })).toBe('slots')
  })

  it('shows the empty-week state when the current week has zero slots', () => {
    expect(resolveBookingWeekView({
      loading: false,
      error: null,
      slots: [week1],
      week: 2,
    })).toBe('empty')
    expect(EMPTY_BOOKING_WEEK_MESSAGE).toBe(
      'In dieser Woche sind keine buchbaren Termine vorhanden.',
    )
  })

  it('treats other weeks as irrelevant to the selected week', () => {
    const slots = Array.from({ length: 24 }, () => week1).concat(
      Array.from({ length: 24 }, () => week3),
    )
    expect(resolveBookingWeekView({ loading: false, error: null, slots, week: 2 })).toBe('empty')
    expect(resolveBookingWeekView({ loading: false, error: null, slots, week: 1 })).toBe('slots')
    expect(resolveBookingWeekView({ loading: false, error: null, slots, week: 3 })).toBe('slots')
  })

  it('stays on loading and does not show the empty message', () => {
    expect(resolveBookingWeekView({
      loading: true,
      error: null,
      slots: [],
      week: 1,
    })).toBe('loading')
  })

  it('keeps an API error ahead of the empty state', () => {
    expect(resolveBookingWeekView({
      loading: false,
      error: 'Fehler beim Laden der Verfügbarkeit',
      slots: [week1],
      week: 2,
    })).toBe('error')
  })

  it('uses the existing proposal path when no week has slots', () => {
    expect(resolveBookingWeekView({
      loading: false,
      error: null,
      slots: [],
      week: 1,
    })).toBe('proposal')
  })

  it('follows the selected week when navigating between populated and empty weeks', () => {
    const slots = [week1, week3]
    expect(resolveBookingWeekView({ loading: false, error: null, slots, week: 1 })).toBe('slots')
    expect(resolveBookingWeekView({ loading: false, error: null, slots, week: 2 })).toBe('empty')
    expect(resolveBookingWeekView({ loading: false, error: null, slots, week: 3 })).toBe('slots')
  })

  it('does not re-bucket slots by a second timezone calculation', () => {
    // Labels use Europe/Zurich. Emptiness uses the already assigned week_number,
    // including slots that fall on opposite sides of a Zurich midnight.
    const zurichMidnightBoundary = [
      { week_number: 2, start_time: '2026-03-29T21:30:00.000Z' }, // 23:30 Zurich, before DST
      { week_number: 2, start_time: '2026-03-29T22:30:00.000Z' }, // 00:30 Zurich, after midnight
    ]
    expect(resolveBookingWeekView({
      loading: false,
      error: null,
      slots: zurichMidnightBoundary,
      week: 2,
    })).toBe('slots')
    expect(resolveBookingWeekView({
      loading: false,
      error: null,
      slots: zurichMidnightBoundary,
      week: 1,
    })).toBe('empty')
  })
})
