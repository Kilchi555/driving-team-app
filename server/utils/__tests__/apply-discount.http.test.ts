import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  lockCheckoutBenefits: vi.fn(async () => ({ ok: true, kind: 'discount' as const })),
  releaseCheckoutBenefits: vi.fn(async () => undefined),
  getTenantTerminology: vi.fn(async () => ({
    appointmentsPlural: 'Termine',
    appointment: 'Termin',
  })),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

vi.mock('~/server/utils/tenant-terminology', () => ({
  getTenantTerminology: mocks.getTenantTerminology,
}))

vi.mock('~/server/utils/checkout-benefits', () => ({
  lockCheckoutBenefits: mocks.lockCheckoutBenefits,
  releaseCheckoutBenefits: mocks.releaseCheckoutBenefits,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const TENANT = '11111111-1111-1111-1111-111111111111'
const CLIENT = '33333333-3333-3333-3333-333333333333'
const OTHER_CLIENT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const APPT = '55555555-5555-5555-5555-555555555555'
const PAY = '66666666-6666-6666-6666-666666666666'
const VEHICLE = '77777777-7777-7777-7777-777777777777'
const AUTH = 'auth-client'

type ResourceRow = {
  id: string
  tenant_id: string
  is_active?: boolean
  hourly_rate_rappen?: number
  pricing_tiers?: unknown
}

function percentVoucher(overrides: Record<string, unknown> = {}) {
  return {
    code: 'TENPCT',
    tenant_id: TENANT,
    is_active: true,
    type: 'discount',
    applies_to: 'appointments',
    discount_type: 'percentage',
    discount_value: 10,
    valid_from: '2020-01-01T00:00:00.000Z',
    valid_until: null,
    ...overrides,
  }
}

function createDiscountSupabase(opts: {
  userProfile?: { id: string; role: string; tenant_id: string }
  payment: Record<string, unknown>
  appointment?: Record<string, unknown> | null
  vehicles?: ResourceRow[]
  rooms?: ResourceRow[]
  voucherCodes?: Record<string, unknown>[]
  paymentUpdates: Record<string, unknown>[]
}) {
  const vehicles = opts.vehicles || []
  const rooms = opts.rooms || []
  const vouchers = opts.voucherCodes || []
  const profile = opts.userProfile || { id: CLIENT, role: 'client', tenant_id: TENANT }

  return {
    from(table: string) {
      const state: {
        filters: Record<string, unknown>
        updatePayload: Record<string, unknown> | null
        op: 'select' | 'insert' | 'update' | 'delete'
        ilikeCode?: string
      } = { filters: {}, updatePayload: null, op: 'select' }

      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = (col: string, val: unknown) => {
        state.filters[col] = val
        return chain
      }
      chain.ilike = (col: string, val: unknown) => {
        if (col === 'code') state.ilikeCode = String(val)
        return chain
      }
      chain.in = () => chain
      chain.insert = () => {
        state.op = 'insert'
        return chain
      }
      chain.update = (payload?: Record<string, unknown>) => {
        state.op = 'update'
        state.updatePayload = payload || {}
        if (table === 'payments' && payload) opts.paymentUpdates.push(payload)
        return chain
      }
      chain.delete = () => {
        state.op = 'delete'
        return chain
      }
      const resolveRow = async () => {
        if (table === 'users') {
          return { data: { ...profile, auth_user_id: AUTH }, error: null }
        }
        if (table === 'payments') {
          if (state.op === 'update') {
            return { data: { id: PAY, ...opts.payment, ...state.updatePayload }, error: null }
          }
          if (state.filters.user_id && state.filters.user_id !== opts.payment.user_id) {
            return { data: null, error: { message: 'not found' } }
          }
          if (state.filters.tenant_id && state.filters.tenant_id !== opts.payment.tenant_id) {
            return { data: null, error: { message: 'not found' } }
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
        if (table === 'voucher_codes') {
          const needle = (state.ilikeCode || '').toLowerCase()
          const data = vouchers.find((row) =>
            String(row.code || '').toLowerCase() === needle
            && row.tenant_id === (state.filters.tenant_id || TENANT)
            && row.is_active === true
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
      chain.then = (resolveFn: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        return Promise.resolve({ data: [], error: null }).then(resolveFn, reject)
      }
      return chain
    },
  }
}

type Handler = (event: object) => Promise<unknown>

const handlerPromise = import('~/server/api/appointments/apply-discount.post') as Promise<{ default: Handler }>

describe('POST /api/appointments/apply-discount resource preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedUser.mockResolvedValue({ id: AUTH })
    mocks.lockCheckoutBenefits.mockResolvedValue({ ok: true, kind: 'discount' })
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
    user_id: CLIENT,
    appointment_id: APPT,
    lesson_price_rappen: 9000,
    admin_fee_rappen: 1000,
    products_price_rappen: 2000,
    credit_used_rappen: 0,
    discount_amount_rappen: 0,
    total_amount_rappen: 19500,
    payment_status: 'pending',
    tenant_id: TENANT,
    metadata: {},
  }

  const baseAppointment = {
    id: APPT,
    tenant_id: TENANT,
    vehicle_id: VEHICLE,
    room_id: null,
    duration_minutes: 45,
    type: 'B',
  }

  async function run(opts: {
    payment?: Record<string, unknown>
    appointment?: Record<string, unknown> | null
    body?: Record<string, unknown>
    userProfile?: { id: string; role: string; tenant_id: string }
    voucherCodes?: Record<string, unknown>[]
    vehicles?: ResourceRow[]
  }) {
    const paymentUpdates: Record<string, unknown>[] = []
    mocks.getSupabaseAdmin.mockReturnValue(createDiscountSupabase({
      userProfile: opts.userProfile,
      payment: opts.payment || basePayment,
      appointment: opts.appointment === undefined ? baseAppointment : opts.appointment,
      vehicles: opts.vehicles === undefined ? [hourlyVehicle] : opts.vehicles,
      voucherCodes: opts.voucherCodes || [percentVoucher()],
      paymentUpdates,
    }))
    mocks.readBody.mockResolvedValue({
      paymentId: PAY,
      code: 'TENPCT',
      ...opts.body,
    })
    const { default: handler } = await handlerPromise
    const result = await handler({})
    return { result, paymentUpdates }
  }

  it('A/B. percentage discount uses resource-inclusive gross and keeps resource in the total', async () => {
    const { result, paymentUpdates } = await run({})
    const payload = result as { isValid: boolean; discount_amount_rappen: number; new_total_rappen: number }
    expect(payload.isValid).toBe(true)
    expect(payload.discount_amount_rappen).toBe(1950)
    expect(payload.discount_amount_rappen).not.toBe(1200)
    expect(payload.new_total_rappen).toBe(17550)
    expect(payload.new_total_rappen).not.toBe(10800)
    expect(paymentUpdates[0].discount_amount_rappen).toBe(1950)
    expect(paymentUpdates[0].total_amount_rappen).toBe(17550)
    expect(paymentUpdates[0]).not.toHaveProperty('lesson_price_rappen')
    expect(paymentUpdates[0]).not.toHaveProperty('credit_used_rappen')
    expect(paymentUpdates[0]).not.toHaveProperty('payment_status')
  })

  it('C. client resource fields cannot influence the quote or discount', async () => {
    const { result } = await run({
      body: {
        resourceSurcharges: [{ rappen: 1, type: 'vehicle' }],
        vehicleId: '00000000-0000-0000-0000-000000000001',
        roomId: '00000000-0000-0000-0000-000000000002',
        resourceSurchargeRappen: 999999,
        duration: 1,
      },
    })
    const payload = result as { discount_amount_rappen: number; new_total_rappen: number }
    expect(payload.discount_amount_rappen).toBe(1950)
    expect(payload.new_total_rappen).toBe(17550)
  })

  it('D. no vehicle or room keeps lesson + admin + products as the gross', async () => {
    const { result } = await run({
      appointment: { ...baseAppointment, vehicle_id: null, room_id: null },
    })
    const payload = result as { discount_amount_rappen: number; new_total_rappen: number }
    expect(payload.discount_amount_rappen).toBe(1200)
    expect(payload.new_total_rappen).toBe(10800)
  })

  it('E. discount is capped at the resource-inclusive gross', async () => {
    const { result, paymentUpdates } = await run({
      voucherCodes: [percentVoucher({
        code: 'HUGE',
        discount_type: 'fixed',
        discount_value: 999999,
      })],
      body: { code: 'HUGE' },
    })
    const payload = result as { discount_amount_rappen: number; new_total_rappen: number }
    expect(payload.discount_amount_rappen).toBe(19500)
    expect(payload.new_total_rappen).toBe(0)
    expect(paymentUpdates[0].total_amount_rappen).toBe(0)
  })

  it('F. existing credit is NOT subtracted from total; remaining is total - credit', async () => {
    const { result, paymentUpdates } = await run({
      payment: { ...basePayment, credit_used_rappen: 5000 },
    })
    const payload = result as {
      discount_amount_rappen: number
      new_total_rappen: number
      remaining_amount_rappen: number
      credit_used_rappen: number
    }
    expect(payload.discount_amount_rappen).toBe(1950)
    expect(payload.new_total_rappen).toBe(17550)
    expect(payload.credit_used_rappen).toBe(5000)
    expect(payload.remaining_amount_rappen).toBe(12550)
    expect(paymentUpdates[0].total_amount_rappen).toBe(17550)
    expect(paymentUpdates[0]).not.toHaveProperty('credit_used_rappen')
  })

  it('F2. zero credit keeps payable total', async () => {
    const { result } = await run({
      payment: { ...basePayment, credit_used_rappen: 0 },
    })
    const payload = result as { new_total_rappen: number; remaining_amount_rappen: number }
    expect(payload.new_total_rappen).toBe(17550)
    expect(payload.remaining_amount_rappen).toBe(17550)
  })

  it('F2b. pending payment with no credit_used column treated as 0 still keeps payable total', async () => {
    const { result } = await run({
      payment: { ...basePayment, credit_used_rappen: null },
    })
    const payload = result as { new_total_rappen: number; remaining_amount_rappen: number; credit_used_rappen: number }
    expect(payload.new_total_rappen).toBe(17550)
    expect(payload.credit_used_rappen).toBe(0)
    expect(payload.remaining_amount_rappen).toBe(17550)
  })

  it('F3. full credit leaves remaining 0 without netting credit into total', async () => {
    const { result } = await run({
      payment: { ...basePayment, credit_used_rappen: 17550 },
    })
    const payload = result as { new_total_rappen: number; remaining_amount_rappen: number }
    expect(payload.new_total_rappen).toBe(17550)
    expect(payload.remaining_amount_rappen).toBe(0)
  })

  it('F4. credit above payable cannot make total negative via credit', async () => {
    const { result } = await run({
      payment: { ...basePayment, credit_used_rappen: 999999 },
    })
    const payload = result as { new_total_rappen: number; remaining_amount_rappen: number }
    expect(payload.new_total_rappen).toBe(17550)
    expect(payload.remaining_amount_rappen).toBe(0)
  })

  it('G. completed payments are still rejected', async () => {
    await expect(run({
      payment: { ...basePayment, payment_status: 'completed' },
    })).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Rabattcode kann nur auf offene Zahlungen angewendet werden',
    })
  })

  it('H. owning client is allowed; other client and staff are rejected', async () => {
    const allowed = await run({})
    expect((allowed.result as { isValid: boolean }).isValid).toBe(true)

    await expect(run({
      userProfile: { id: OTHER_CLIENT, role: 'client', tenant_id: TENANT },
    })).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Zahlung nicht gefunden',
    })

    await expect(run({
      userProfile: { id: CLIENT, role: 'staff', tenant_id: TENANT },
    })).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Nur Kunden können Rabattcodes anwenden',
    })
  })

  it('I. product-only payments quote resource as zero', async () => {
    const { result } = await run({
      payment: {
        ...basePayment,
        appointment_id: null,
        lesson_price_rappen: 0,
        admin_fee_rappen: 0,
        products_price_rappen: 2000,
        total_amount_rappen: 2000,
      },
      appointment: null,
      voucherCodes: [percentVoucher({ applies_to: 'products' })],
    })
    const payload = result as { discount_amount_rappen: number; new_total_rappen: number }
    expect(payload.discount_amount_rappen).toBe(200)
    expect(payload.new_total_rappen).toBe(1800)
  })
})

describe('apply-discount Slice 2 contract', () => {
  const src = readFileSync(resolve(process.cwd(), 'server/api/appointments/apply-discount.post.ts'), 'utf8')

  it('reuses PR-B composer and resource quote without re-quoting the lesson', () => {
    expect(src).toContain('quoteStaffResourceSurcharge')
    expect(src).toContain('composeStaffPaymentFromOffer')
    expect(src).toContain('staffQuoteFromPersistedLesson')
    expect(src).not.toContain('quoteStaffAppointmentOffer')
    expect(src).toContain('role !== \'client\'')
    expect(src).toContain('payment_status !== \'pending\'')
    expect(src).toContain('roundToNearest5Rappen')
    expect(src).toContain('credit_used_rappen')
    expect(src).toContain('Math.max(0, grossRappen - discountAmountRappen)')
    expect(src).not.toContain('grossRappen - discountAmountRappen - (payment.credit_used_rappen')
  })
})
