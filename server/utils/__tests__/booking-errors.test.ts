import { describe, expect, it } from 'vitest'
import {
  BOOKING_ERROR,
  bookingDomainFromUnknown,
  hashBookingRequest,
  isUuidV4,
  mapAppointmentWriteError,
  mapBookingRpcError,
  requireIdempotencyKey,
} from '../booking-errors'

describe('idempotency key', () => {
  it('accepts UUID v4 only', () => {
    expect(isUuidV4('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isUuidV4('550e8400-e29b-11d4-a716-446655440000')).toBe(false)
    expect(isUuidV4('not-a-uuid')).toBe(false)
    expect(isUuidV4(undefined)).toBe(false)
  })

  it('throws 400 when the key is missing', () => {
    try {
      requireIdempotencyKey(undefined)
      expect.fail('expected throw')
    } catch (err: any) {
      expect(err.statusCode).toBe(400)
      expect(err.data.error).toBe(BOOKING_ERROR.IDEMPOTENCY_KEY_REQUIRED)
    }
  })

  it('hashes the same request to the same digest', () => {
    const payload = { tenant_id: 't', slot_id: 's', session_id: 'x' }
    expect(hashBookingRequest(payload)).toBe(hashBookingRequest(payload))
    expect(hashBookingRequest(payload)).not.toBe(hashBookingRequest({ ...payload, slot_id: 'other' }))
  })
})

describe('SQLSTATE mapping', () => {
  it('maps 23P01 and BOOKING_CONFLICT to 409 BOOKING_CONFLICT', () => {
    const mapped = mapAppointmentWriteError({ code: '23P01', message: 'BOOKING_CONFLICT', hint: 'BOOKING_CONFLICT' })
    expect(mapped.statusCode).toBe(409)
    expect(mapped.data).toMatchObject({ error: BOOKING_ERROR.BOOKING_CONFLICT })
  })

  it('maps SLOT_UNAVAILABLE', () => {
    const mapped = mapBookingRpcError({ code: 'P0001', message: 'SLOT_UNAVAILABLE', hint: 'SLOT_UNAVAILABLE' })
    expect(mapped.statusCode).toBe(409)
    expect(mapped.data).toMatchObject({ error: BOOKING_ERROR.SLOT_UNAVAILABLE })
  })

  it('maps IDEMPOTENCY_CONFLICT', () => {
    const mapped = mapBookingRpcError({ code: 'P0001', message: 'IDEMPOTENCY_CONFLICT', hint: 'IDEMPOTENCY_CONFLICT' })
    expect(mapped.statusCode).toBe(409)
    expect(mapped.data).toMatchObject({ error: BOOKING_ERROR.IDEMPOTENCY_CONFLICT })
  })

  it('does not treat generic unique violations as booking conflicts', () => {
    expect(bookingDomainFromUnknown({ code: '23505', message: 'duplicate key' })).toBeNull()
  })

  it('never leaks a raw SQLSTATE as the client error code', () => {
    const mapped = mapBookingRpcError({ code: '23P01', message: 'BOOKING_CONFLICT', hint: 'BOOKING_CONFLICT' })
    expect(mapped.data.error).toBe(BOOKING_ERROR.BOOKING_CONFLICT)
    expect(mapped.data.error).not.toBe('23P01')
    expect(mapped.statusMessage).not.toContain('23P01')
  })
})
