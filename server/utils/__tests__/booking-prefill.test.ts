import { describe, expect, it } from 'vitest'
import {
  bookingPrefillToQuery,
  categoryFromAppointment,
  deriveBookingPrefill,
  durationFromAppointment,
  pickupPlzFromAppointment,
  snapDuration,
} from '~/utils/booking-prefill'

const lesson = {
  type: 'B',
  event_type_code: 'lesson',
  status: 'confirmed',
  staff_id: '11111111-1111-4111-8111-111111111111',
  location_id: '22222222-2222-4222-8222-222222222222',
  duration_minutes: 45,
  start_time: '2026-08-01T08:00:00.000Z',
  end_time: '2026-08-01T08:45:00.000Z',
}

describe('categoryFromAppointment', () => {
  it('uses license type for driving-school lessons', () => {
    expect(categoryFromAppointment(lesson)).toBe('B')
  })

  it('uses event type code for non-license bookings', () => {
    expect(categoryFromAppointment({
      type: null,
      event_type_code: 'discovery',
      status: 'confirmed',
    })).toBe('discovery')
  })

  it('uses session/intake as the category for event-type tenants', () => {
    expect(categoryFromAppointment({
      type: null,
      event_type_code: 'session',
      status: 'confirmed',
    })).toBe('session')
    expect(categoryFromAppointment({
      type: 'session',
      event_type_code: 'session',
      status: 'confirmed',
    })).toBe('session')
    expect(categoryFromAppointment({
      type: null,
      event_type_code: 'intake',
    })).toBe('intake')
  })

  it('skips exams and vacations', () => {
    expect(categoryFromAppointment({ type: 'B', event_type_code: 'exam' })).toBeNull()
    expect(categoryFromAppointment({ type: 'B', event_type_code: 'vacation' })).toBeNull()
  })

  it('skips event types that are not publicly bookable', () => {
    expect(categoryFromAppointment(
      { type: null, event_type_code: 'mantrailing_montagsgruppe' },
      { bookableCodes: ['intake', 'session', 'ETVM'] },
    )).toBeNull()
    expect(categoryFromAppointment(
      { type: null, event_type_code: 'session' },
      { bookableCodes: ['intake', 'session', 'ETVM'] },
    )).toBe('session')
  })
})

describe('durationFromAppointment', () => {
  it('prefers duration_minutes', () => {
    expect(durationFromAppointment(lesson)).toBe(45)
  })

  it('falls back to start/end', () => {
    expect(durationFromAppointment({
      start_time: '2026-08-01T08:00:00.000Z',
      end_time: '2026-08-01T09:30:00.000Z',
    })).toBe(90)
  })
})

describe('pickupPlzFromAppointment', () => {
  it('reads PLZ and extracts from address', () => {
    expect(pickupPlzFromAppointment({ customer_pickup_plz: '8004' })).toBe('8004')
    expect(pickupPlzFromAppointment({
      customer_pickup_address: 'Langstrasse 10, 8004 Zürich',
    })).toBe('8004')
  })
})

describe('snapDuration', () => {
  it('keeps an exact match and otherwise picks nearest', () => {
    expect(snapDuration(90, [45, 90, 135])).toBe(90)
    expect(snapDuration(50, [45, 90])).toBe(45)
  })
})

describe('deriveBookingPrefill', () => {
  it('skips cancelled and exam rows, then returns a full prefill', () => {
    const prefs = deriveBookingPrefill([
      { ...lesson, event_type_code: 'exam', start_time: '2026-08-20T08:00:00.000Z' },
      { ...lesson, status: 'cancelled', start_time: '2026-08-10T08:00:00.000Z' },
      lesson,
    ])
    expect(prefs).toEqual({
      mode: 'full',
      category: 'B',
      staffId: lesson.staff_id,
      locationId: lesson.location_id,
      durationMinutes: 45,
      pickupPlz: undefined,
      pickupAddress: undefined,
    })
  })

  it('returns partial prefill when location is missing but pickup exists', () => {
    const prefs = deriveBookingPrefill([{
      ...lesson,
      location_id: null,
      customer_pickup_plz: '8800',
      customer_pickup_address: 'Seestrasse 1, 8800 Thalwil',
    }])
    expect(prefs?.mode).toBe('full')
    expect(prefs?.locationId).toBeUndefined()
    expect(prefs?.pickupPlz).toBe('8800')
    expect(prefs?.pickupAddress).toContain('Thalwil')
  })

  it('returns partial when only category is known', () => {
    expect(deriveBookingPrefill([{ type: 'A1', event_type_code: 'lesson', status: 'completed' }])).toEqual({
      mode: 'partial',
      category: 'A1',
      staffId: undefined,
      locationId: undefined,
      durationMinutes: undefined,
      pickupPlz: undefined,
      pickupAddress: undefined,
    })
  })

  it('returns null without usable history', () => {
    expect(deriveBookingPrefill([])).toBeNull()
    expect(deriveBookingPrefill([{ type: 'B', event_type_code: 'exam', status: 'confirmed' }])).toBeNull()
  })

  it('prefills Haku-style session appointments onto the event-type wizard', () => {
    const prefs = deriveBookingPrefill(
      [{
        type: null,
        event_type_code: 'session',
        status: 'confirmed',
        staff_id: lesson.staff_id,
        location_id: lesson.location_id,
        duration_minutes: 60,
      }],
      { bookableCodes: ['intake', 'session', 'ETVM'] },
    )
    expect(prefs).toMatchObject({
      mode: 'full',
      category: 'session',
      durationMinutes: 60,
    })
  })
})

describe('bookingPrefillToQuery', () => {
  it('maps full prefill to the booking URL params', () => {
    expect(bookingPrefillToQuery({
      mode: 'full',
      category: 'B',
      staffId: lesson.staff_id,
      locationId: lesson.location_id,
      durationMinutes: 45,
    })).toEqual({
      prefill: 'true',
      category: 'B',
      staff: lesson.staff_id,
      location: lesson.location_id,
      duration: '45',
    })
  })
})
