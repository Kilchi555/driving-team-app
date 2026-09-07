import { describe, expect, it, vi } from 'vitest'
import { isGiftCardReservedForOther } from '../checkout-benefits'

describe('isGiftCardReservedForOther', () => {
  const now = Date.parse('2026-08-28T10:00:00.000Z')

  it('allows an unreserved card', () => {
    expect(isGiftCardReservedForOther({}, 'pay-1', now)).toBe(false)
  })

  it('treats an expired reservation as free', () => {
    expect(isGiftCardReservedForOther({
      reserved_for_payment_id: 'pay-other',
      reserved_until: '2026-08-28T09:00:00.000Z',
    }, 'pay-1', now)).toBe(false)
  })

  it('blocks a live reservation for another payment', () => {
    expect(isGiftCardReservedForOther({
      reserved_for_payment_id: 'pay-other',
      reserved_until: '2026-08-28T10:30:00.000Z',
    }, 'pay-1', now)).toBe(true)
  })

  it('allows the payment that already holds the card', () => {
    expect(isGiftCardReservedForOther({
      reserved_for_payment_id: 'pay-1',
      reserved_until: '2026-08-28T10:30:00.000Z',
    }, 'pay-1', now)).toBe(false)
  })
})

describe('lockCheckoutBenefits', () => {
  it('reserves a gift card and marks the payment claimed', async () => {
    const { lockCheckoutBenefits } = await import('../checkout-benefits')
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: 'reserved', error: null }),
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: { metadata: { discount_code: 'GIFT' } }, error: null }
                  },
                }
              },
            }
          },
          update() {
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            }
          },
        }
      },
    }

    await expect(lockCheckoutBenefits({
      supabase,
      tenantId: 't1',
      paymentId: 'pay-1',
      code: 'GIFT',
    })).resolves.toEqual({ ok: true, kind: 'gift_card' })
    expect(supabase.rpc).toHaveBeenCalledWith('reserve_gift_card_for_payment', {
      p_tenant_id: 't1',
      p_code: 'GIFT',
      p_payment_id: 'pay-1',
      p_ttl_minutes: 45,
    })
  })

  it('returns a user-facing lock payload', async () => {
    const { benefitLockUnavailablePayload } = await import('../checkout-benefits')
    expect(benefitLockUnavailablePayload('Dieser Gutschein wurde bereits eingelöst')).toEqual({
      statusCode: 409,
      statusMessage: 'Dieser Gutschein wurde bereits eingelöst',
      data: { code: 'DISCOUNT_UNAVAILABLE' },
    })
  })

  it('rejects a card already held by another payment', async () => {
    const { lockCheckoutBenefits } = await import('../checkout-benefits')
    const supabase = {
      rpc: vi.fn().mockResolvedValue({ data: 'held_by_other', error: null }),
    }

    await expect(lockCheckoutBenefits({
      supabase,
      tenantId: 't1',
      paymentId: 'pay-1',
      code: 'GIFT',
    })).resolves.toMatchObject({ ok: false, kind: 'gift_card' })
  })
})

type UpdateOp = {
  table: string
  payload: Record<string, unknown>
  filters: Array<[string, unknown]>
}

function chainableUpdate(ops: UpdateOp[], table: string) {
  return {
    update(payload: Record<string, unknown>) {
      const op: UpdateOp = { table, payload, filters: [] }
      ops.push(op)
      const obj = {
        eq(col: string, val: unknown) {
          op.filters.push([col, val])
          return obj
        },
        then(resolve: (value: { error: null }) => unknown, reject?: (reason: unknown) => unknown) {
          return Promise.resolve({ error: null }).then(resolve, reject)
        },
      }
      return obj
    },
  }
}

describe('abortCheckoutAfterBenefitLockFail', () => {
  it('cancels booking rows, fails the idempotency key, and releases the slot', async () => {
    const { abortCheckoutAfterBenefitLockFail } = await import('../checkout-benefits')
    const ops: UpdateOp[] = []
    const supabase = {
      from(table: string) {
        return chainableUpdate(ops, table)
      },
    }

    await abortCheckoutAfterBenefitLockFail({
      supabase,
      paymentId: 'pay-1',
      appointmentId: 'appt-1',
    })

    const payments = ops.find(o => o.table === 'payments')
    const appointments = ops.find(o => o.table === 'appointments')
    const idempotency = ops.filter(o => o.table === 'booking_idempotency_keys')
    const slots = ops.find(o => o.table === 'availability_slots')

    expect(payments?.payload.payment_status).toBe('cancelled')
    expect(payments?.filters).toContainEqual(['id', 'pay-1'])
    expect(appointments?.payload.status).toBe('cancelled')
    expect(appointments?.filters).toContainEqual(['id', 'appt-1'])

    expect(idempotency.length).toBeGreaterThan(0)
    expect(idempotency.every(o => o.payload.status === 'failed')).toBe(true)
    expect(idempotency.every(o => o.payload.response_snapshot === null)).toBe(true)
    expect(idempotency.some(o => o.filters.some(([col, val]) => col === 'appointment_id' && val === 'appt-1'))).toBe(true)
    expect(idempotency.every(o => o.filters.some(([col, val]) => col === 'status' && val === 'completed'))).toBe(true)

    expect(slots?.payload.is_available).toBe(true)
    expect(slots?.payload.appointment_id).toBeNull()
    expect(slots?.filters).toContainEqual(['appointment_id', 'appt-1'])
  })

  it('does not create a second appointment or payment while aborting', async () => {
    const { abortCheckoutAfterBenefitLockFail } = await import('../checkout-benefits')
    const ops: UpdateOp[] = []
    const supabase = {
      from(table: string) {
        return chainableUpdate(ops, table)
      },
      insert: vi.fn(),
    }

    await abortCheckoutAfterBenefitLockFail({
      supabase,
      paymentId: 'pay-1',
      appointmentId: 'appt-1',
    })

    expect(ops.every(o => o.table !== 'appointments' || o.payload.status === 'cancelled')).toBe(true)
    expect(ops.every(o => o.table !== 'payments' || o.payload.payment_status === 'cancelled')).toBe(true)
    expect(supabase.insert).not.toHaveBeenCalled()
  })
})
