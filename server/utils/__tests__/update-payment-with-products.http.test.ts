import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/utils/supabase', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const TENANT = '11111111-1111-1111-1111-111111111111'
const STAFF = '44444444-4444-4444-4444-444444444444'
const OTHER_STAFF = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const APPT = '55555555-5555-5555-5555-555555555555'
const PAY = '66666666-6666-6666-6666-666666666666'
const VEHICLE = '77777777-7777-7777-7777-777777777777'
const AUTH = 'auth-staff'

type ResourceRow = {
  id: string
  tenant_id: string
  is_active?: boolean
  hourly_rate_rappen?: number
  pricing_tiers?: unknown
}

function createProductsSupabase(opts: {
  userProfile?: { id: string; role: string; tenant_id: string }
  payment: Record<string, unknown>
  appointment: Record<string, unknown>
  vehicles?: ResourceRow[]
  rooms?: ResourceRow[]
  paymentUpdates: unknown[]
  bookingTouches: string[]
}) {
  const vehicles = opts.vehicles || []
  const rooms = opts.rooms || []
  const profile = opts.userProfile || { id: STAFF, role: 'staff', tenant_id: TENANT }

  return {
    from(table: string) {
      const state: {
        filters: Record<string, unknown>
        updatePayload: Record<string, unknown> | null
        op: 'select' | 'insert' | 'update' | 'delete'
      } = { filters: {}, updatePayload: null, op: 'select' }

      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = (col: string, val: unknown) => {
        state.filters[col] = val
        return chain
      }
      chain.insert = () => {
        opts.bookingTouches.push(`${table}.insert`)
        state.op = 'insert'
        return chain
      }
      chain.update = (payload?: Record<string, unknown>) => {
        state.op = 'update'
        state.updatePayload = payload || {}
        if (table === 'payments' && payload) opts.paymentUpdates.push(payload)
        if (table === 'vehicle_bookings' || table === 'room_bookings') {
          opts.bookingTouches.push(`${table}.update`)
        }
        return chain
      }
      chain.delete = () => {
        opts.bookingTouches.push(`${table}.delete`)
        state.op = 'delete'
        return chain
      }
      chain.maybeSingle = async () => {
        if (table === 'vehicles') {
          const data = vehicles.find((r) =>
            r.id === state.filters.id && r.tenant_id === state.filters.tenant_id
          ) || null
          return { data, error: null }
        }
        if (table === 'rooms') {
          const data = rooms.find((r) =>
            r.id === state.filters.id && r.tenant_id === state.filters.tenant_id
          ) || null
          return { data, error: null }
        }
        return { data: null, error: null }
      }
      chain.single = async () => {
        if (table === 'users') {
          return { data: { ...profile, auth_user_id: AUTH }, error: null }
        }
        if (table === 'payments' && state.op === 'update') {
          return {
            data: { id: PAY, ...opts.payment, ...state.updatePayload },
            error: null,
          }
        }
        if (table === 'payments') {
          return { data: opts.payment, error: null }
        }
        if (table === 'appointments') {
          return { data: opts.appointment, error: null }
        }
        return { data: null, error: { message: 'not found' } }
      }
      chain.then = (resolveFn: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolveFn, reject)
      }
      return chain
    },
  }
}

type Handler = (event: object) => Promise<unknown>

const handlerPromise = import('~/server/api/appointments/update-payment-with-products.post') as Promise<{ default: Handler }>

describe('POST /api/appointments/update-payment-with-products resource preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedUser.mockResolvedValue({ id: AUTH })
  })

  function asPayment(row: unknown): Record<string, unknown> {
    return row && typeof row === 'object' ? row as Record<string, unknown> : {}
  }

  const hourlyVehicle: ResourceRow = {
    id: VEHICLE,
    tenant_id: TENANT,
    is_active: true,
    hourly_rate_rappen: 10000,
    pricing_tiers: [],
  }

  const basePayment = {
    id: PAY,
    appointment_id: APPT,
    lesson_price_rappen: 9000,
    admin_fee_rappen: 1000,
    discount_amount_rappen: 0,
    payment_status: 'pending',
  }

  const baseAppointment = {
    id: APPT,
    staff_id: STAFF,
    tenant_id: TENANT,
    vehicle_id: VEHICLE,
    room_id: null,
    duration_minutes: 45,
  }

  it('1. preserves server resource in the payment total', async () => {
    const paymentUpdates: unknown[] = []
    const bookingTouches: string[] = []
    mocks.getSupabaseAdmin.mockReturnValue(createProductsSupabase({
      payment: basePayment,
      appointment: baseAppointment,
      vehicles: [hourlyVehicle],
      paymentUpdates,
      bookingTouches,
    }))
    mocks.readBody.mockResolvedValue({
      appointmentId: APPT,
      productsPriceRappen: 2000,
    })

    const { default: handler } = await handlerPromise
    const result = await handler({}) as { success: boolean; data: Record<string, unknown> }
    expect(result.success).toBe(true)
    const updated = asPayment(paymentUpdates[0])
    expect(updated.products_price_rappen).toBe(2000)
    expect(updated.total_amount_rappen).toBe(19500)
    expect(updated.total_amount_rappen).not.toBe(12000)
    expect(updated).not.toHaveProperty('lesson_price_rappen')
    expect(updated).not.toHaveProperty('credit_used_rappen')
    expect(updated).not.toHaveProperty('discount_amount_rappen')
    expect(bookingTouches).toEqual([])
  })

  it('2. client resource amount cannot influence the total', async () => {
    const paymentUpdates: unknown[] = []
    mocks.getSupabaseAdmin.mockReturnValue(createProductsSupabase({
      payment: basePayment,
      appointment: baseAppointment,
      vehicles: [hourlyVehicle],
      paymentUpdates,
      bookingTouches: [],
    }))
    mocks.readBody.mockResolvedValue({
      appointmentId: APPT,
      productsPriceRappen: 2000,
      resourceSurcharges: [{ label: 'Fahrzeug', rappen: 1, type: 'vehicle' }],
      resource: 1,
    })

    const { default: handler } = await handlerPromise
    await handler({})
    expect(asPayment(paymentUpdates[0]).total_amount_rappen).toBe(19500)
    expect(asPayment(paymentUpdates[0]).total_amount_rappen).not.toBe(12001)
  })

  it('3. no resource keeps lesson + admin + products - discount', async () => {
    const paymentUpdates: unknown[] = []
    mocks.getSupabaseAdmin.mockReturnValue(createProductsSupabase({
      payment: basePayment,
      appointment: { ...baseAppointment, vehicle_id: null, room_id: null },
      vehicles: [hourlyVehicle],
      paymentUpdates,
      bookingTouches: [],
    }))
    mocks.readBody.mockResolvedValue({
      appointmentId: APPT,
      productsPriceRappen: 2000,
    })

    const { default: handler } = await handlerPromise
    await handler({})
    expect(asPayment(paymentUpdates[0]).total_amount_rappen).toBe(12000)
  })

  it('4. discount comes exclusively from the existing payment row', async () => {
    const paymentUpdates: unknown[] = []
    mocks.getSupabaseAdmin.mockReturnValue(createProductsSupabase({
      payment: { ...basePayment, discount_amount_rappen: 500 },
      appointment: baseAppointment,
      vehicles: [hourlyVehicle],
      paymentUpdates,
      bookingTouches: [],
    }))
    mocks.readBody.mockResolvedValue({
      appointmentId: APPT,
      productsPriceRappen: 2000,
      discountAmountRappen: 9999,
    })

    const { default: handler } = await handlerPromise
    await handler({})
    expect(asPayment(paymentUpdates[0]).total_amount_rappen).toBe(19000)
    expect(asPayment(paymentUpdates[0])).not.toHaveProperty('discount_amount_rappen')
  })

  it('5. preserves pending and completed payment status', async () => {
    const { default: handler } = await handlerPromise

    for (const status of ['pending', 'completed'] as const) {
      const paymentUpdates: unknown[] = []
      mocks.getSupabaseAdmin.mockReturnValue(createProductsSupabase({
        payment: { ...basePayment, payment_status: status },
        appointment: baseAppointment,
        vehicles: [hourlyVehicle],
        paymentUpdates,
        bookingTouches: [],
      }))
      mocks.readBody.mockResolvedValue({
        appointmentId: APPT,
        productsPriceRappen: 2000,
      })
      await handler({})
      expect(asPayment(paymentUpdates[0]).payment_status).toBe(status)
    }
  })

  it('6. staff mismatch still fails', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(createProductsSupabase({
      userProfile: { id: STAFF, role: 'staff', tenant_id: TENANT },
      payment: basePayment,
      appointment: { ...baseAppointment, staff_id: OTHER_STAFF },
      vehicles: [hourlyVehicle],
      paymentUpdates: [],
      bookingTouches: [],
    }))
    mocks.readBody.mockResolvedValue({
      appointmentId: APPT,
      productsPriceRappen: 2000,
    })

    const { default: handler } = await handlerPromise
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Unauthorized to update this appointment',
    })
  })

  it('7. does not write vehicle or room booking costs', async () => {
    const bookingTouches: string[] = []
    mocks.getSupabaseAdmin.mockReturnValue(createProductsSupabase({
      payment: basePayment,
      appointment: baseAppointment,
      vehicles: [hourlyVehicle],
      paymentUpdates: [],
      bookingTouches,
    }))
    mocks.readBody.mockResolvedValue({
      appointmentId: APPT,
      productsPriceRappen: 2000,
    })

    const { default: handler } = await handlerPromise
    await handler({})
    expect(bookingTouches).toEqual([])
  })
})

describe('update-payment-with-products Slice 1 contract', () => {
  const src = readFileSync(resolve(process.cwd(), 'server/api/appointments/update-payment-with-products.post.ts'), 'utf8')

  it('reuses PR-B composer and resource quote, not a second formula or lesson re-quote', () => {
    expect(src).toContain('quoteStaffResourceSurcharge')
    expect(src).toContain('composeStaffPaymentFromOffer')
    expect(src).toContain('staffQuoteFromPersistedLesson')
    expect(src).not.toContain('quoteStaffAppointmentOffer')
    expect(src).not.toContain('resourceSurcharges')
    expect(src).not.toContain('lesson + admin')
    expect(src).toContain('appointment.staff_id !== userProfile.id')
  })
})
