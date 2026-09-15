import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { capStaffAppointmentCredit } from '../apply-credit-to-payment'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  requireAdminProfile: vi.fn(),
  assertStaffCanApplyManualDiscount: vi.fn(async () => undefined),
  getTenantTerminology: vi.fn(async () => ({ appointment: 'Termin' })),
  enqueueStaffAvailabilityRecalc: vi.fn(async () => undefined),
  attachProposalAttributionToStaffAppointment: vi.fn(async () => undefined),
  becameBindingConfirmed: vi.fn(() => false),
  hashCustomerIdentifiers: vi.fn(async () => ({ hashedEmail: null, hashedPhone: null })),
  reportBindingAppointmentConversionSafely: vi.fn(async () => undefined),
  dispatchAppointmentConfirmation: vi.fn(async () => undefined),
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
  requireAdminProfile: mocks.requireAdminProfile,
}))

vi.mock('~/server/utils/staff-manual-discount', () => ({
  assertStaffCanApplyManualDiscount: mocks.assertStaffCanApplyManualDiscount,
}))

vi.mock('~/server/utils/tenant-terminology', () => ({
  getTenantTerminology: mocks.getTenantTerminology,
}))

vi.mock('~/server/utils/queue-availability-recalc', () => ({
  enqueueStaffAvailabilityRecalc: mocks.enqueueStaffAvailabilityRecalc,
}))

vi.mock('~/server/utils/proposal-booking-conversion', () => ({
  attachProposalAttributionToStaffAppointment: mocks.attachProposalAttributionToStaffAppointment,
}))

vi.mock('~/server/utils/binding-booking', () => ({
  becameBindingConfirmed: mocks.becameBindingConfirmed,
}))

vi.mock('~/server/utils/binding-booking-conversion', () => ({
  hashCustomerIdentifiers: mocks.hashCustomerIdentifiers,
  reportBindingAppointmentConversionSafely: mocks.reportBindingAppointmentConversionSafely,
}))

vi.mock('~/server/utils/availability-slot-manager', () => ({
  createAvailabilitySlotManager: () => ({
    releaseSlots: vi.fn(async () => ({ releasedCount: 0 })),
    invalidateSlots: vi.fn(async () => ({ invalidatedCount: 0 })),
  }),
}))

vi.mock('~/server/utils/dispatch-appointment-confirmation', () => ({
  dispatchAppointmentConfirmation: mocks.dispatchAppointmentConfirmation,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const TENANT = '11111111-1111-1111-1111-111111111111'
const USER = '33333333-3333-3333-3333-333333333333'
const STAFF = '44444444-4444-4444-4444-444444444444'
const APPT = '55555555-5555-5555-5555-555555555555'
const PAY = '66666666-6666-6666-6666-666666666666'
const VEHICLE = '77777777-7777-7777-7777-777777777777'
const LESSON_45 = 9000
const HOURLY_45 = 7500

type Handler = (event: object) => Promise<unknown>
const handlerPromise = import('~/server/api/appointments/save.post') as Promise<{ default: Handler }>

function asPayment(row: unknown): Record<string, unknown> {
  return row && typeof row === 'object' ? row as Record<string, unknown> : {}
}

function createSaveSupabase(opts: {
  inserts: { appointments: unknown[]; payments: unknown[] }
  vehicles?: { id: string; tenant_id: string; is_active?: boolean; hourly_rate_rappen?: number; pricing_tiers?: unknown }[]
  wallet?: { balance_rappen: number; pending_withdrawal_rappen?: number }
  rpcError?: string
  rpcCalls?: Record<string, unknown>[]
}) {
  const vehicles = opts.vehicles || []
  const rules = [{
    tenant_id: TENANT,
    id: 'rule-b',
    rule_type: 'base_price',
    category_code: 'B',
    price_per_minute_rappen: 200,
    is_active: true,
    valid_from: '2020-01-01T00:00:00.000Z',
    created_at: '2020-01-01T00:00:00.000Z',
  }]
  const eventTypes = [{ tenant_id: TENANT, code: 'lesson', require_payment: true, is_active: true }]
  let alreadyApplied = false
  let storedUsed = 0

  return {
    async rpc(name: string, args: Record<string, unknown>) {
      opts.rpcCalls?.push({ name, ...args })
      if (opts.rpcError) return { data: null, error: { message: opts.rpcError } }
      if (name !== 'apply_credit_to_payment') return { data: null, error: { message: 'unknown' } }
      const payment = asPayment(opts.inserts.payments[0])
      const payable = Math.max(0, Number(payment.total_amount_rappen) || 0)
      if (alreadyApplied) {
        return {
          data: [{
            payment_id: args.p_payment_id,
            credit_used_rappen: storedUsed,
            remaining_amount_rappen: Math.max(0, payable - storedUsed),
            payment_status: payable - storedUsed === 0 ? 'completed' : 'pending',
            credit_to_use_rappen: 0,
            credit_transaction_id: 'tx-1',
            applied: false,
          }],
          error: null,
        }
      }
      const use = capStaffAppointmentCredit({
        availableWalletRappen: Math.max(0, (opts.wallet?.balance_rappen || 0) - (opts.wallet?.pending_withdrawal_rappen || 0)),
        payableRappen: payable,
        alreadyUsedRappen: 0,
        requestedRappen: Number(args.p_requested_rappen) || 0,
      })
      storedUsed = use
      alreadyApplied = use > 0
      const remaining = Math.max(0, payable - use)
      return {
        data: [{
          payment_id: args.p_payment_id,
          credit_used_rappen: use,
          remaining_amount_rappen: remaining,
          payment_status: remaining === 0 ? 'completed' : 'pending',
          credit_to_use_rappen: use,
          credit_transaction_id: use > 0 ? 'tx-1' : null,
          applied: use > 0,
        }],
        error: null,
      }
    },
    from(table: string) {
      const state: {
        filters: Record<string, unknown>
        insertPayload: Record<string, unknown> | null
        op: 'select' | 'insert' | 'update' | 'delete'
      } = { filters: {}, insertPayload: null, op: 'select' }
      const chain: Record<string, unknown> = {}
      const self = () => chain
      chain.select = () => chain
      chain.eq = (col: string, val: unknown) => {
        state.filters[col] = val
        return chain
      }
      chain.lte = self
      chain.or = self
      chain.order = self
      chain.lt = self
      chain.gt = self
      chain.in = self
      chain.neq = self
      chain.limit = self
      chain.insert = (payload: Record<string, unknown>) => {
        state.op = 'insert'
        state.insertPayload = payload
        return chain
      }
      chain.update = self
      chain.delete = () => {
        state.op = 'delete'
        return chain
      }
      chain.maybeSingle = async () => {
        if (table === 'event_types') {
          return {
            data: eventTypes.find((r) => r.tenant_id === state.filters.tenant_id && r.code === state.filters.code) || null,
            error: null,
          }
        }
        if (table === 'vehicles') {
          return {
            data: vehicles.find((r) => r.id === state.filters.id && r.tenant_id === state.filters.tenant_id) || null,
            error: null,
          }
        }
        return { data: null, error: null }
      }
      chain.single = async () => {
        if (table === 'appointments' && state.op === 'insert' && state.insertPayload) {
          opts.inserts.appointments.push(state.insertPayload)
          return { data: { id: APPT, ...state.insertPayload }, error: null }
        }
        if (table === 'payments' && state.op === 'insert' && state.insertPayload) {
          opts.inserts.payments.push(state.insertPayload)
          return { data: { id: PAY, ...state.insertPayload }, error: null }
        }
        return { data: null, error: { message: 'not found' } }
      }
      chain.then = (resolveFn: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        let data: unknown[] = []
        if (table === 'pricing_rules') {
          data = rules.filter((r) =>
            (!state.filters.tenant_id || r.tenant_id === state.filters.tenant_id)
            && (!state.filters.rule_type || r.rule_type === state.filters.rule_type)
            && (!state.filters.category_code || r.category_code === state.filters.category_code)
          )
        }
        return Promise.resolve({ data, error: null }).then(resolveFn, reject)
      }
      return chain
    },
  }
}

function appointmentBody(overrides: Record<string, unknown> = {}) {
  return {
    mode: 'create',
    appointmentData: {
      user_id: USER,
      staff_id: STAFF,
      tenant_id: TENANT,
      start_time: '2026-09-14T10:00:00.000Z',
      end_time: '2026-09-14T10:45:00.000Z',
      duration_minutes: 45,
      type: 'B',
      event_type_code: 'lesson',
      status: 'confirmed',
      title: 'Fahrstunde B',
      ...overrides,
    },
    paymentMethodForPayment: 'wallee',
    adminFeeRappen: 1000,
    productsPriceRappen: 2000,
    discountAmountRappen: 1950,
    creditUsedRappen: 5000,
  }
}

describe('POST /api/appointments/save staff credit apply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ success: true }))
    mocks.requireAdminProfile.mockResolvedValue({
      id: STAFF,
      tenant_id: TENANT,
      role: 'staff',
      email: 'staff@example.com',
      auth_user_id: 'auth-staff',
    })
  })

  async function run(opts: {
    wallet?: { balance_rappen: number; pending_withdrawal_rappen?: number }
    body?: Record<string, unknown>
    rpcError?: string
    rpcCalls?: Record<string, unknown>[]
  }) {
    const inserts = { appointments: [] as unknown[], payments: [] as unknown[] }
    const rpcCalls = opts.rpcCalls || []
    mocks.getSupabaseAdmin.mockReturnValue(createSaveSupabase({
      inserts,
      vehicles: [{
        id: VEHICLE,
        tenant_id: TENANT,
        is_active: true,
        hourly_rate_rappen: 10000,
        pricing_tiers: [],
      }],
      wallet: opts.wallet || { balance_rappen: 30000 },
      rpcError: opts.rpcError,
      rpcCalls,
    }))
    mocks.readBody.mockResolvedValue({
      ...appointmentBody({ vehicle_id: VEHICLE }),
      ...opts.body,
    })
    const { default: handler } = await handlerPromise
    const result = await handler({})
    return { result, inserts, rpcCalls }
  }

  it('1-5. client 5000 debits wallet 5000; total stays payable 17550; remaining 12550; pending', async () => {
    const rpcCalls: Record<string, unknown>[] = []
    const { result, inserts } = await run({ rpcCalls })
    const payment = asPayment(inserts.payments[0])
    expect(payment.lesson_price_rappen).toBe(LESSON_45)
    expect(payment.admin_fee_rappen).toBe(1000)
    expect(payment.products_price_rappen).toBe(2000)
    expect(payment.discount_amount_rappen).toBe(1950)
    expect(payment.total_amount_rappen).toBe(LESSON_45 + 1000 + 2000 + HOURLY_45 - 1950)
    expect(payment.total_amount_rappen).toBe(17550)
    expect(payment.credit_used_rappen).toBe(0)
    expect(payment.payment_status).toBe('pending')
    expect(rpcCalls[0]).toMatchObject({
      name: 'apply_credit_to_payment',
      p_payment_id: PAY,
      p_tenant_id: TENANT,
      p_requested_rappen: 5000,
    })
    expect(result).toMatchObject({
      success: true,
      data: {
        credit_used_rappen: 5000,
        remaining_amount_rappen: 12550,
        payment_status: 'pending',
      },
    })
  })

  it('6. insufficient wallet → partial credit, payment pending', async () => {
    const { result, inserts } = await run({ wallet: { balance_rappen: 3000 } })
    expect(asPayment(inserts.payments[0]).payment_status).toBe('pending')
    expect(result).toMatchObject({
      data: {
        credit_used_rappen: 3000,
        remaining_amount_rappen: 14550,
        payment_status: 'pending',
      },
    })
  })

  it('7/8. forged credit above payable is capped and can complete', async () => {
    const { result, inserts } = await run({
      wallet: { balance_rappen: 30000 },
      body: { creditUsedRappen: 999999 },
    })
    expect(asPayment(inserts.payments[0]).total_amount_rappen).toBe(17550)
    expect(result).toMatchObject({
      data: {
        credit_used_rappen: 17550,
        remaining_amount_rappen: 0,
        payment_status: 'completed',
      },
    })
  })

  it('9/10. resource and discount are in payable before credit', async () => {
    const { inserts } = await run({})
    expect(asPayment(inserts.payments[0]).total_amount_rappen).toBe(17550)
    expect(asPayment(inserts.payments[0]).total_amount_rappen).not.toBe(12000)
    expect(asPayment(inserts.payments[0]).total_amount_rappen).not.toBe(12550)
  })

  it('cashAlreadyPaid + partial credit applies RPC then completes remaining cash', async () => {
    const rpcCalls: Record<string, unknown>[] = []
    const { result, inserts } = await run({
      rpcCalls,
      body: {
        paymentMethodForPayment: 'cash',
        cashAlreadyPaid: true,
        creditUsedRappen: 5000,
      },
    })
    const payment = asPayment(inserts.payments[0])
    expect(payment.payment_status).toBe('pending')
    expect(payment.credit_used_rappen).toBe(0)
    expect(payment.total_amount_rappen).toBe(17550)
    expect(rpcCalls[0]).toMatchObject({
      name: 'apply_credit_to_payment',
      p_payment_id: PAY,
      p_tenant_id: TENANT,
      p_requested_rappen: 5000,
    })
    expect(result).toMatchObject({
      success: true,
      data: {
        credit_used_rappen: 5000,
        remaining_amount_rappen: 12550,
        payment_status: 'completed',
      },
    })
  })

  it('12. credit apply failure cannot produce completed payment', async () => {
    const { result, inserts } = await run({
      rpcError: 'insufficient_available_credit',
      body: { creditUsedRappen: 17550 },
    })
    expect(asPayment(inserts.payments[0]).credit_used_rappen).toBe(0)
    expect(asPayment(inserts.payments[0]).payment_status).toBe('pending')
    expect(result).toMatchObject({
      data: {
        credit_used_rappen: 0,
        remaining_amount_rappen: 17550,
        payment_status: 'pending',
        credit_apply_error: 'insufficient_available_credit',
      },
    })
  })
})

describe('staff save credit source contract', () => {
  it('11. EventModal no longer fire-and-forgets /api/credit/use-for-appointment', () => {
    const modal = readFileSync(resolve(process.cwd(), 'components/EventModal.vue'), 'utf8')
    expect(modal).not.toContain("/api/credit/use-for-appointment")
    expect(modal).not.toContain('Background credit apply')
    const form = readFileSync(resolve(process.cwd(), 'composables/useEventModalForm.ts'), 'utf8')
    expect(form).not.toContain("/api/credit/use-for-appointment")
    expect(form).toContain('Payment will be created automatically by appointments/save API')
    const save = readFileSync(resolve(process.cwd(), 'server/api/appointments/save.post.ts'), 'utf8')
    expect(save).toContain('applyCreditToPayment')
    expect(save).toContain('credit_used_rappen: 0')
    expect(save).not.toContain('credit_used_rappen: staffPayment.creditUsedRappen')
  })
})
