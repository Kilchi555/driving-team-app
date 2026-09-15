import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getAuthUserFromRequest: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/auth-helper', () => ({
  getAuthUserFromRequest: mocks.getAuthUserFromRequest,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

vi.mock('~/utils/logger', () => {
  const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  return { default: logger, logger }
})

const TENANT = '11111111-1111-1111-1111-111111111111'
const OTHER_TENANT = '22222222-2222-2222-2222-222222222222'
const STAFF = '44444444-4444-4444-4444-444444444444'
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

function createUpdatePaymentSupabase(opts: {
  userProfile?: { id: string; role: string; tenant_id: string; is_active?: boolean }
  payment: Record<string, unknown>
  appointment?: Record<string, unknown> | null
  vehicles?: ResourceRow[]
  rooms?: ResourceRow[]
  paymentUpdates: Record<string, unknown>[]
}) {
  const vehicles = opts.vehicles || []
  const rooms = opts.rooms || []
  const profile = opts.userProfile || {
    id: STAFF,
    role: 'staff',
    tenant_id: TENANT,
    is_active: true,
  }

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
      chain.update = (payload?: Record<string, unknown>) => {
        state.op = 'update'
        state.updatePayload = payload || {}
        if (table === 'payments' && payload) opts.paymentUpdates.push(payload)
        return chain
      }
      const resolveRow = async () => {
        if (table === 'users') {
          return { data: { ...profile, auth_user_id: AUTH }, error: null }
        }
        if (table === 'payments') {
          if (state.filters.tenant_id && state.filters.tenant_id !== opts.payment.tenant_id) {
            return { data: null, error: { message: 'not found' } }
          }
          if (state.op === 'update') {
            return { data: { id: PAY, ...opts.payment, ...state.updatePayload }, error: null }
          }
          return { data: opts.payment, error: null }
        }
        if (table === 'appointments') {
          const appointment = opts.appointment
          if (!appointment) return { data: null, error: null }
          if (state.filters.id && appointment.id !== state.filters.id) {
            return { data: null, error: null }
          }
          if (state.filters.tenant_id && appointment.tenant_id !== state.filters.tenant_id) {
            return { data: null, error: null }
          }
          return { data: appointment, error: null }
        }
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
      chain.maybeSingle = resolveRow
      chain.single = async () => {
        const result = await resolveRow()
        if (!result.data) return { data: null, error: result.error || { message: 'not found' } }
        return result
      }
      return chain
    },
  }
}

type Handler = (event: object) => Promise<unknown>
const handlerPromise = import('~/server/api/staff/update-payment.post') as Promise<{ default: Handler }>

describe('POST /api/staff/update-payment resource preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthUserFromRequest.mockResolvedValue({ id: AUTH })
  })

  const hourlyVehicle: ResourceRow = {
    id: VEHICLE,
    tenant_id: TENANT,
    is_active: true,
    hourly_rate_rappen: 10000,
    pricing_tiers: [],
  }

  const basePayment = {
    id: PAY,
    tenant_id: TENANT,
    appointment_id: APPT,
    lesson_price_rappen: 9000,
    admin_fee_rappen: 1000,
    products_price_rappen: 2000,
    discount_amount_rappen: 0,
    credit_used_rappen: 0,
    payment_status: 'pending',
  }

  const baseAppointment = {
    id: APPT,
    tenant_id: TENANT,
    vehicle_id: VEHICLE,
    room_id: null,
    duration_minutes: 45,
  }

  async function run(opts: {
    payment?: Record<string, unknown>
    appointment?: Record<string, unknown> | null
    updateData?: Record<string, unknown>
    body?: Record<string, unknown>
    userProfile?: { id: string; role: string; tenant_id: string; is_active?: boolean }
    vehicles?: ResourceRow[]
  }) {
    const paymentUpdates: Record<string, unknown>[] = []
    mocks.createClient.mockReturnValue(createUpdatePaymentSupabase({
      userProfile: opts.userProfile,
      payment: opts.payment || basePayment,
      appointment: opts.appointment === undefined ? baseAppointment : opts.appointment,
      vehicles: opts.vehicles === undefined ? [hourlyVehicle] : opts.vehicles,
      paymentUpdates,
    }))
    mocks.readBody.mockResolvedValue({
      payment_id: PAY,
      update_data: opts.updateData || {
        lesson_price_rappen: 9000,
        total_amount_rappen: 11000,
      },
      ...opts.body,
    })
    const { default: handler } = await handlerPromise
    const result = await handler({})
    return { result, paymentUpdates }
  }

  it('A. duration update preserves persisted 45-minute vehicle resource', async () => {
    const { paymentUpdates } = await run({})
    expect(paymentUpdates[0].lesson_price_rappen).toBe(9000)
    expect(paymentUpdates[0].total_amount_rappen).toBe(19500)
    expect(paymentUpdates[0].total_amount_rappen).not.toBe(11000)
    expect(paymentUpdates[0]).not.toHaveProperty('credit_used_rappen')
    expect(paymentUpdates[0]).not.toHaveProperty('discount_amount_rappen')
  })

  it('B. persisted 60-minute duration re-quotes resource at 10000, ignoring client total', async () => {
    const { paymentUpdates } = await run({
      appointment: { ...baseAppointment, duration_minutes: 60 },
      updateData: {
        lesson_price_rappen: 12000,
        total_amount_rappen: 15000,
      },
    })
    expect(paymentUpdates[0].lesson_price_rappen).toBe(12000)
    expect(paymentUpdates[0].total_amount_rappen).toBe(25000)
    expect(paymentUpdates[0].total_amount_rappen).not.toBe(15000)
  })

  it('C. client total 0 cannot wipe the server total', async () => {
    const { paymentUpdates } = await run({
      updateData: {
        lesson_price_rappen: 9000,
        total_amount_rappen: 0,
      },
    })
    expect(paymentUpdates[0].total_amount_rappen).toBe(19500)
    expect(paymentUpdates[0].total_amount_rappen).not.toBe(0)
  })

  it('D. client vehicle/room/resource fields cannot influence the quote', async () => {
    const { paymentUpdates } = await run({
      body: {
        vehicleId: '00000000-0000-0000-0000-000000000001',
        roomId: '00000000-0000-0000-0000-000000000002',
        resourceSurchargeRappen: 0,
      },
      updateData: {
        lesson_price_rappen: 9000,
        total_amount_rappen: 1,
        vehicleId: '00000000-0000-0000-0000-000000000001',
        resourceSurchargeRappen: 999999,
      },
    })
    expect(paymentUpdates[0].total_amount_rappen).toBe(19500)
    expect(paymentUpdates[0]).not.toHaveProperty('vehicleId')
    expect(paymentUpdates[0]).not.toHaveProperty('resourceSurchargeRappen')
  })

  it('E. no vehicle or room keeps lesson + admin + products - discount', async () => {
    const { paymentUpdates } = await run({
      appointment: { ...baseAppointment, vehicle_id: null, room_id: null },
      updateData: {
        lesson_price_rappen: 9000,
        total_amount_rappen: 0,
      },
    })
    expect(paymentUpdates[0].total_amount_rappen).toBe(12000)
  })

  it('F. existing discount is applied and not rewritten unless sent', async () => {
    const { paymentUpdates } = await run({
      payment: { ...basePayment, discount_amount_rappen: 500 },
    })
    expect(paymentUpdates[0].total_amount_rappen).toBe(19000)
    expect(paymentUpdates[0]).not.toHaveProperty('discount_amount_rappen')
  })

  it('G. existing credit is not rewritten and is not subtracted from total', async () => {
    const { paymentUpdates } = await run({
      payment: { ...basePayment, credit_used_rappen: 500 },
    })
    expect(paymentUpdates[0].total_amount_rappen).toBe(19500)
    expect(paymentUpdates[0]).not.toHaveProperty('credit_used_rappen')
  })

  it('H. other tenant and non-staff roles are rejected', async () => {
    await expect(run({
      userProfile: { id: STAFF, role: 'staff', tenant_id: OTHER_TENANT, is_active: true },
    })).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Payment not found or access denied',
    })

    await expect(run({
      userProfile: { id: STAFF, role: 'client', tenant_id: TENANT, is_active: true },
    })).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Insufficient permissions – staff or admin role required',
    })
  })

  it('cancel path with lesson 0 does not add a resource surcharge', async () => {
    const { paymentUpdates } = await run({
      updateData: {
        lesson_price_rappen: 0,
        admin_fee_rappen: 0,
        total_amount_rappen: 2000,
      },
    })
    expect(paymentUpdates[0].lesson_price_rappen).toBe(0)
    expect(paymentUpdates[0].admin_fee_rappen).toBe(0)
    expect(paymentUpdates[0].total_amount_rappen).toBe(2000)
  })
})

describe('staff/update-payment Slice 3 contract', () => {
  const src = readFileSync(resolve(process.cwd(), 'server/api/staff/update-payment.post.ts'), 'utf8')

  it('reuses PR-B composer and resource quote without lesson re-quote or client total authority', () => {
    expect(src).toContain('quoteStaffResourceSurcharge')
    expect(src).toContain('composeStaffPaymentFromOffer')
    expect(src).toContain('staffQuoteFromPersistedLesson')
    expect(src).not.toContain('quoteStaffAppointmentOffer')
    expect(src).toContain('delete sanitizedUpdateData.total_amount_rappen')
  })
})
