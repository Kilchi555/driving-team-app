import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BOOKING_ERROR } from '../booking-errors'

const rpc = vi.fn()

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: () => ({ rpc }),
}))

import { bookOnlineAppointment } from '../book-online-appointment'

describe('bookOnlineAppointment', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  const base = {
    tenantId: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
    sessionId: 'sess-1',
    userId: '22222222-2222-4222-8222-222222222222',
    slotId: '33333333-3333-4333-8333-333333333333',
    staffId: '44444444-4444-4444-8444-444444444444',
    startTime: '2026-10-07T10:00:00Z',
    endTime: '2026-10-07T11:00:00Z',
    appointment: { type: 'B', event_type_code: 'lesson', status: 'confirmed' },
    payment: {
      lesson_price_rappen: 9000,
      admin_fee_rappen: 0,
      discount_amount_rappen: 0,
      total_amount_rappen: 9000,
      payment_method: 'wallee',
    },
  }

  it('returns a fresh booking from the RPC', async () => {
    rpc.mockResolvedValue({
      data: {
        replayed: false,
        appointment: { id: 'a1' },
        payment: { id: 'p1' },
      },
      error: null,
    })
    const result = await bookOnlineAppointment(base)
    expect(result.replayed).toBe(false)
    expect(result.appointment.id).toBe('a1')
    expect(rpc).toHaveBeenCalledWith('book_online_appointment', expect.objectContaining({
      p_tenant_id: base.tenantId,
      p_idempotency_key: base.idempotencyKey,
      p_slot_id: base.slotId,
    }))
  })

  it('replays a completed idempotent booking', async () => {
    rpc.mockResolvedValue({
      data: {
        replayed: true,
        appointment: { id: 'a1' },
        payment: { id: 'p1' },
      },
      error: null,
    })
    const result = await bookOnlineAppointment(base)
    expect(result.replayed).toBe(true)
    expect(result.appointment.id).toBe('a1')
  })

  it('rejects an invalid idempotency key before calling the RPC', async () => {
    await expect(bookOnlineAppointment({
      ...base,
      idempotencyKey: 'not-a-uuid',
    })).rejects.toMatchObject({
      statusCode: 400,
      data: { error: BOOKING_ERROR.IDEMPOTENCY_KEY_REQUIRED },
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('maps SLOT_UNAVAILABLE from the RPC', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'SLOT_UNAVAILABLE', hint: 'SLOT_UNAVAILABLE' },
    })
    await expect(bookOnlineAppointment(base)).rejects.toMatchObject({
      statusCode: 409,
      data: { error: BOOKING_ERROR.SLOT_UNAVAILABLE },
    })
  })

  it('maps BOOKING_CONFLICT from the RPC', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: '23P01', message: 'BOOKING_CONFLICT', hint: 'BOOKING_CONFLICT' },
    })
    await expect(bookOnlineAppointment(base)).rejects.toMatchObject({
      statusCode: 409,
      data: { error: BOOKING_ERROR.BOOKING_CONFLICT },
    })
  })

  it('maps IDEMPOTENCY_CONFLICT when the same key is reused with different payload', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'IDEMPOTENCY_CONFLICT', hint: 'IDEMPOTENCY_CONFLICT' },
    })
    await expect(bookOnlineAppointment(base)).rejects.toMatchObject({
      statusCode: 409,
      data: { error: BOOKING_ERROR.IDEMPOTENCY_CONFLICT },
    })
  })
})
