import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  EMPTY_INVOICE_SNAPSHOT,
  buildStaffC1PaymentMetadata,
} from '~/utils/staff-payment-c1-metadata'

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
const OTHER = '22222222-2222-2222-2222-222222222222'
const USER = '33333333-3333-3333-3333-333333333333'
const STAFF = '44444444-4444-4444-4444-444444444444'
const APPT = '55555555-5555-5555-5555-555555555555'
const PAY = '66666666-6666-6666-6666-666666666666'

type EventTypeRow = {
  tenant_id: string
  code: string
  require_payment: boolean
  is_active?: boolean
}

type RuleRow = {
  tenant_id: string
  id: string
  rule_type: string
  category_code?: string | null
  event_type_code?: string | null
  price_per_minute_rappen: number
}

const VEHICLE = '77777777-7777-7777-7777-777777777777'
const ROOM = '88888888-8888-8888-8888-888888888888'

type ResourceRow = {
  id: string
  tenant_id: string
  is_active?: boolean
  hourly_rate_rappen?: number
  pricing_tiers?: unknown
}

function emptyInserts() {
  return {
    appointments: [] as unknown[],
    payments: [] as unknown[],
    vehicle_bookings: [] as unknown[],
    room_bookings: [] as unknown[],
  }
}

function createSaveSupabase(opts: {
  eventTypes?: EventTypeRow[]
  rules?: RuleRow[]
  vehicles?: ResourceRow[]
  rooms?: ResourceRow[]
  existingAppointment?: Record<string, unknown>
  existingPayment?: Record<string, unknown> | null
  inserts: {
    appointments: unknown[]
    payments: unknown[]
    vehicle_bookings?: unknown[]
    room_bookings?: unknown[]
  }
  paymentUpdates?: unknown[]
}) {
  const eventTypes = (opts.eventTypes || []).map((et) => ({ is_active: true, ...et }))
  const rules = (opts.rules || []).map((r) => ({
    is_active: true,
    valid_from: '2020-01-01T00:00:00.000Z',
    created_at: '2020-01-01T00:00:00.000Z',
    ...r,
  }))
  const vehicles = opts.vehicles || []
  const rooms = opts.rooms || []
  if (!opts.inserts.vehicle_bookings) opts.inserts.vehicle_bookings = []
  if (!opts.inserts.room_bookings) opts.inserts.room_bookings = []
  const paymentUpdates = opts.paymentUpdates || []

  return {
    from(table: string) {
      const state: {
        filters: Record<string, unknown>
        insertPayload: Record<string, unknown> | null
        updatePayload: Record<string, unknown> | null
        op: 'select' | 'insert' | 'update' | 'delete'
      } = { filters: {}, insertPayload: null, updatePayload: null, op: 'select' }

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
        if (table === 'vehicle_bookings') opts.inserts.vehicle_bookings!.push(payload)
        if (table === 'room_bookings') opts.inserts.room_bookings!.push(payload)
        return chain
      }
      chain.update = (payload?: Record<string, unknown>) => {
        state.op = 'update'
        state.updatePayload = payload || {}
        if (table === 'payments' && payload) paymentUpdates.push(payload)
        return chain
      }
      chain.delete = () => {
        state.op = 'delete'
        return chain
      }
      chain.maybeSingle = async () => {
        if (table === 'event_types') {
          const data = eventTypes.find((r) =>
            r.tenant_id === state.filters.tenant_id && r.code === state.filters.code
          ) || null
          return { data, error: null }
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
        if (table === 'payments') {
          return { data: opts.existingPayment ?? null, error: null }
        }
        return { data: null, error: null }
      }
      chain.single = async () => {
        if (table === 'appointments' && state.op === 'insert' && state.insertPayload) {
          opts.inserts.appointments.push(state.insertPayload)
          return {
            data: {
              id: APPT,
              ...state.insertPayload,
            },
            error: null,
          }
        }
        if (table === 'appointments' && state.op === 'update') {
          return {
            data: {
              id: APPT,
              ...(opts.existingAppointment || {}),
              ...(state.updatePayload || {}),
            },
            error: null,
          }
        }
        if (table === 'appointments' && opts.existingAppointment) {
          return { data: opts.existingAppointment, error: null }
        }
        if (table === 'payments' && state.op === 'insert' && state.insertPayload) {
          opts.inserts.payments.push(state.insertPayload)
          return {
            data: {
              id: PAY,
              ...state.insertPayload,
            },
            error: null,
          }
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
            && (!state.filters.event_type_code || r.event_type_code === state.filters.event_type_code)
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
    basePriceRappen: 1,
    totalAmountRappenForPayment: 0,
    adminFeeRappen: 0,
    productsPriceRappen: 0,
    discountAmountRappen: 0,
    creditUsedRappen: 0,
  }
}

type Handler = (event: object) => Promise<unknown>

function asPayment(row: unknown): Record<string, unknown> {
  return row && typeof row === 'object' ? row as Record<string, unknown> : {}
}

const handlerPromise = import('~/server/api/appointments/save.post') as Promise<{ default: Handler }>

describe('POST /api/appointments/save staff pricing authority', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdminProfile.mockResolvedValue({
      id: STAFF,
      tenant_id: TENANT,
      role: 'staff',
      email: 'staff@example.com',
      auth_user_id: 'auth-staff',
    })
    mocks.assertStaffCanApplyManualDiscount.mockResolvedValue(undefined)
  })

  it('G. valid paid save persists the server offer, not the planted client amounts', async () => {
    const inserts = { appointments: [] as unknown[], payments: [] as unknown[] }
    mocks.getSupabaseAdmin.mockReturnValue(createSaveSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [{
        tenant_id: TENANT,
        id: 'rule-b',
        rule_type: 'base_price',
        category_code: 'B',
        price_per_minute_rappen: 200,
      }],
      inserts,
    }))
    mocks.readBody.mockResolvedValue(appointmentBody())

    const { default: handler } = await handlerPromise
    const result = await handler({})

    expect(result).toMatchObject({ success: true, data: { id: APPT } })
    expect(inserts.appointments).toHaveLength(1)
    expect(inserts.payments).toHaveLength(1)
    const payment = asPayment(inserts.payments[0])
    expect(payment.lesson_price_rappen).toBe(9000)
    expect(payment.total_amount_rappen).toBe(9000)
    expect(payment.lesson_price_rappen).not.toBe(1)
    expect(payment.total_amount_rappen).not.toBe(0)
    expect(payment.tenant_id).toBe(TENANT)
  })

  it('exam without exam rule persists category base_price × duration, not planted client amounts', async () => {
    const inserts = { appointments: [] as unknown[], payments: [] as unknown[] }
    mocks.getSupabaseAdmin.mockReturnValue(createSaveSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'exam', require_payment: true }],
      rules: [{
        tenant_id: TENANT,
        id: 'c-lesson',
        rule_type: 'base_price',
        category_code: 'C',
        price_per_minute_rappen: 366.6667,
      }],
      inserts,
    }))
    mocks.readBody.mockResolvedValue(appointmentBody({
      type: 'C',
      event_type_code: 'exam',
      duration_minutes: 130,
      title: 'Prüfungsfahrt C',
    }))

    const { default: handler } = await handlerPromise
    const result = await handler({})

    expect(result).toMatchObject({ success: true, data: { id: APPT } })
    expect(inserts.appointments).toHaveLength(1)
    expect(inserts.payments).toHaveLength(1)
    const payment = asPayment(inserts.payments[0])
    expect(payment.lesson_price_rappen).toBe(47665)
    expect(payment.total_amount_rappen).toBe(47665)
    expect(payment.lesson_price_rappen).not.toBe(1)
    expect(payment.total_amount_rappen).not.toBe(0)
  })

  it('exam with explicit exam rule persists that rule, not category base_price', async () => {
    const inserts = { appointments: [] as unknown[], payments: [] as unknown[] }
    mocks.getSupabaseAdmin.mockReturnValue(createSaveSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'exam', require_payment: true }],
      rules: [
        {
          tenant_id: TENANT,
          id: 'c-exam',
          rule_type: 'exam',
          category_code: 'C',
          price_per_minute_rappen: 100,
        },
        {
          tenant_id: TENANT,
          id: 'c-lesson',
          rule_type: 'base_price',
          category_code: 'C',
          price_per_minute_rappen: 366.6667,
        },
      ],
      inserts,
    }))
    mocks.readBody.mockResolvedValue(appointmentBody({
      type: 'C',
      event_type_code: 'exam',
      duration_minutes: 130,
    }))

    const { default: handler } = await handlerPromise
    await handler({})
    expect(asPayment(inserts.payments[0]).lesson_price_rappen).toBe(13000)
  })

  it('exam with neither exam nor base_price rule rejects with no write', async () => {
    const inserts = { appointments: [] as unknown[], payments: [] as unknown[] }
    mocks.getSupabaseAdmin.mockReturnValue(createSaveSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'exam', require_payment: true }],
      rules: [],
      inserts,
    }))
    mocks.readBody.mockResolvedValue(appointmentBody({
      type: 'C',
      event_type_code: 'exam',
      duration_minutes: 130,
    }))

    const { default: handler } = await handlerPromise
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 503,
      data: { code: 'NO_PRICE_RULE' },
    })
    expect(inserts.appointments).toHaveLength(0)
    expect(inserts.payments).toHaveLength(0)
  })

  it('A/B. planted 1 / 0 is ignored; paid + no rule rejects with no appointment or payment insert', async () => {
    const inserts = { appointments: [] as unknown[], payments: [] as unknown[] }
    mocks.getSupabaseAdmin.mockReturnValue(createSaveSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [],
      inserts,
    }))
    mocks.readBody.mockResolvedValue(appointmentBody())

    const { default: handler } = await handlerPromise
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 503,
      data: { code: 'NO_PRICE_RULE' },
    })
    expect(inserts.appointments).toHaveLength(0)
    expect(inserts.payments).toHaveLength(0)
  })

  it('B. require_payment=false skips the payment row', async () => {
    const inserts = { appointments: [] as unknown[], payments: [] as unknown[] }
    mocks.getSupabaseAdmin.mockReturnValue(createSaveSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'vacation', require_payment: false }],
      rules: [{
        tenant_id: TENANT,
        id: 'rule-b',
        rule_type: 'base_price',
        category_code: 'B',
        price_per_minute_rappen: 200,
      }],
      inserts,
    }))
    mocks.readBody.mockResolvedValue(appointmentBody({ event_type_code: 'vacation' }))

    const { default: handler } = await handlerPromise
    const result = await handler({})
    expect(result).toMatchObject({ success: true })
    expect(inserts.appointments).toHaveLength(1)
    expect(inserts.payments).toHaveLength(0)
  })

  it('D. category A vs B persist different lesson prices', async () => {
    const rules = [
      {
        tenant_id: TENANT,
        id: 'rule-b',
        rule_type: 'base_price',
        category_code: 'B',
        price_per_minute_rappen: 200,
      },
      {
        tenant_id: TENANT,
        id: 'rule-a',
        rule_type: 'base_price',
        category_code: 'A',
        price_per_minute_rappen: 100,
      },
    ]

    const insertsB = { appointments: [] as unknown[], payments: [] as unknown[] }
    mocks.getSupabaseAdmin.mockReturnValue(createSaveSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules,
      inserts: insertsB,
    }))
    mocks.readBody.mockResolvedValue(appointmentBody({ type: 'B' }))
    const { default: handler } = await handlerPromise
    await handler({})
    expect(asPayment(insertsB.payments[0]).lesson_price_rappen).toBe(9000)

    const insertsA = { appointments: [] as unknown[], payments: [] as unknown[] }
    mocks.getSupabaseAdmin.mockReturnValue(createSaveSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules,
      inserts: insertsA,
    }))
    mocks.readBody.mockResolvedValue(appointmentBody({ type: 'A' }))
    await handler({})
    expect(asPayment(insertsA.payments[0]).lesson_price_rappen).toBe(4500)
  })

  it('E. tenant A cannot use tenant B rules', async () => {
    const inserts = { appointments: [] as unknown[], payments: [] as unknown[] }
    mocks.getSupabaseAdmin.mockReturnValue(createSaveSupabase({
      eventTypes: [{ tenant_id: OTHER, code: 'lesson', require_payment: true }],
      rules: [{
        tenant_id: OTHER,
        id: 'rule-other',
        rule_type: 'base_price',
        category_code: 'B',
        price_per_minute_rappen: 999,
      }],
      inserts,
    }))
    mocks.readBody.mockResolvedValue(appointmentBody())

    const { default: handler } = await handlerPromise
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 503,
      data: { code: 'NO_PRICE_RULE' },
    })
    expect(inserts.appointments).toHaveLength(0)
    expect(inserts.payments).toHaveLength(0)
  })

  it('F. duration is priced from the appointment duration, not a client total', async () => {
    const inserts = { appointments: [] as unknown[], payments: [] as unknown[] }
    mocks.getSupabaseAdmin.mockReturnValue(createSaveSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [{
        tenant_id: TENANT,
        id: 'rule-b',
        rule_type: 'base_price',
        category_code: 'B',
        price_per_minute_rappen: 200,
      }],
      inserts,
    }))
    mocks.readBody.mockResolvedValue({
      ...appointmentBody({
        duration_minutes: 90,
        end_time: '2026-09-14T11:30:00.000Z',
      }),
      totalAmountRappenForPayment: 1,
      basePriceRappen: 1,
    })

    const { default: handler } = await handlerPromise
    await handler({})
    expect(asPayment(inserts.payments[0]).lesson_price_rappen).toBe(18000)
    expect(asPayment(inserts.payments[0]).total_amount_rappen).toBe(18000)
  })

  it('composes overlays onto the server lesson price and ignores a planted client total', async () => {
    const inserts = { appointments: [] as unknown[], payments: [] as unknown[] }
    mocks.getSupabaseAdmin.mockReturnValue(createSaveSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [{
        tenant_id: TENANT,
        id: 'rule-b',
        rule_type: 'base_price',
        category_code: 'B',
        price_per_minute_rappen: 200,
      }],
      inserts,
    }))
    mocks.readBody.mockResolvedValue({
      ...appointmentBody(),
      adminFeeRappen: 500,
      productsPriceRappen: 1000,
      discountAmountRappen: 200,
      totalAmountRappenForPayment: 1,
    })

    const { default: handler } = await handlerPromise
    await handler({})
    const payment = asPayment(inserts.payments[0])
    expect(payment.lesson_price_rappen).toBe(9000)
    expect(payment.admin_fee_rappen).toBe(500)
    expect(payment.products_price_rappen).toBe(1000)
    expect(payment.discount_amount_rappen).toBe(200)
    expect(payment.total_amount_rappen).toBe(10300)
  })

  const LESSON_45 = 9000
  const HOURLY_45 = 7500
  const VEHICLE_B = '99999999-9999-9999-9999-999999999999'

  function paidLesson(inserts: ReturnType<typeof emptyInserts>, extra: Partial<Parameters<typeof createSaveSupabase>[0]> = {}) {
    return createSaveSupabase({
      eventTypes: [{ tenant_id: TENANT, code: 'lesson', require_payment: true }],
      rules: [{
        tenant_id: TENANT,
        id: 'rule-b',
        rule_type: 'base_price',
        category_code: 'B',
        price_per_minute_rappen: 200,
      }],
      inserts,
      ...extra,
    })
  }

  function hourlyVehicle(id = VEHICLE, extras: Partial<ResourceRow> = {}): ResourceRow {
    return {
      id,
      tenant_id: TENANT,
      is_active: true,
      hourly_rate_rappen: 10000,
      pricing_tiers: [],
      ...extras,
    }
  }

  function hourlyRoom(id = ROOM, extras: Partial<ResourceRow> = {}): ResourceRow {
    return {
      id,
      tenant_id: TENANT,
      is_active: true,
      hourly_rate_rappen: 10000,
      ...extras,
    }
  }

  function paymentResourceContribution(payment: Record<string, unknown>): number {
    return (
      Number(payment.total_amount_rappen)
      - Number(payment.lesson_price_rappen)
      - Number(payment.admin_fee_rappen || 0)
      - Number(payment.products_price_rappen || 0)
      + Number(payment.discount_amount_rappen || 0)
    )
  }

  function asBooking(row: unknown): Record<string, unknown> {
    return row && typeof row === 'object' ? row as Record<string, unknown> : {}
  }

  function existingAppointment(overrides: Record<string, unknown> = {}) {
    return {
      id: APPT,
      start_time: '2026-09-14T10:00:00.000Z',
      end_time: '2026-09-14T10:45:00.000Z',
      staff_id: STAFF,
      tenant_id: TENANT,
      duration_minutes: 45,
      status: 'confirmed',
      user_id: USER,
      event_type_code: 'lesson',
      type: 'B',
      ...overrides,
    }
  }

  it('8. client resource = 1 loses to server hourly vehicle', async () => {
    const inserts = emptyInserts()
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, { vehicles: [hourlyVehicle()] }))
    const clientResourceAmount = 1
    mocks.readBody.mockResolvedValue({
      ...appointmentBody({ vehicle_id: VEHICLE }),
      resourceSurcharges: [{ label: 'Fahrzeug', rappen: clientResourceAmount, type: 'vehicle' }],
    })

    const { default: handler } = await handlerPromise
    await handler({})
    const payment = asPayment(inserts.payments[0])
    const persistedPaymentResourceContribution = paymentResourceContribution(payment)
    expect(payment.lesson_price_rappen).toBe(LESSON_45)
    expect(payment.total_amount_rappen).toBe(LESSON_45 + HOURLY_45)
    expect(persistedPaymentResourceContribution).toBe(HOURLY_45)
    expect(clientResourceAmount).not.toBe(persistedPaymentResourceContribution)
    expect(asBooking(inserts.vehicle_bookings[0]).cost_rappen).toBe(HOURLY_45)
  })

  it('9. client resource = 0 loses to server hourly vehicle', async () => {
    const inserts = emptyInserts()
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, { vehicles: [hourlyVehicle()] }))
    const clientResourceAmount = 0
    mocks.readBody.mockResolvedValue({
      ...appointmentBody({ vehicle_id: VEHICLE }),
      resourceSurcharges: [{ label: 'Fahrzeug', rappen: clientResourceAmount, type: 'vehicle' }],
    })

    const { default: handler } = await handlerPromise
    await handler({})
    const persistedPaymentResourceContribution = paymentResourceContribution(asPayment(inserts.payments[0]))
    expect(persistedPaymentResourceContribution).toBe(HOURLY_45)
    expect(clientResourceAmount).not.toBe(persistedPaymentResourceContribution)
  })

  it('10. inflated client resource loses to server hourly vehicle', async () => {
    const inserts = emptyInserts()
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, { vehicles: [hourlyVehicle()] }))
    const clientResourceAmount = 99999
    mocks.readBody.mockResolvedValue({
      ...appointmentBody({ vehicle_id: VEHICLE }),
      resourceSurcharges: [{ label: 'Fahrzeug', rappen: clientResourceAmount, type: 'vehicle' }],
    })

    const { default: handler } = await handlerPromise
    await handler({})
    const persistedPaymentResourceContribution = paymentResourceContribution(asPayment(inserts.payments[0]))
    expect(persistedPaymentResourceContribution).toBe(HOURLY_45)
    expect(clientResourceAmount).not.toBe(persistedPaymentResourceContribution)
  })

  it('11. negative client resource loses to server hourly vehicle', async () => {
    const inserts = emptyInserts()
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, { vehicles: [hourlyVehicle()] }))
    const clientResourceAmount = -5000
    mocks.readBody.mockResolvedValue({
      ...appointmentBody({ vehicle_id: VEHICLE }),
      resourceSurcharges: [{ label: 'Fahrzeug', rappen: clientResourceAmount, type: 'vehicle' }],
    })

    const { default: handler } = await handlerPromise
    await handler({})
    const persistedPaymentResourceContribution = paymentResourceContribution(asPayment(inserts.payments[0]))
    expect(persistedPaymentResourceContribution).toBe(HOURLY_45)
    expect(clientResourceAmount).not.toBe(persistedPaymentResourceContribution)
  })

  it('20. missing resourceSurcharges still quotes the server vehicle', async () => {
    const inserts = emptyInserts()
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, { vehicles: [hourlyVehicle()] }))
    const body = appointmentBody({ vehicle_id: VEHICLE })
    expect(body).not.toHaveProperty('resourceSurcharges')
    mocks.readBody.mockResolvedValue(body)

    const { default: handler } = await handlerPromise
    await handler({})
    expect(paymentResourceContribution(asPayment(inserts.payments[0]))).toBe(HOURLY_45)
    expect(asBooking(inserts.vehicle_bookings[0]).cost_rappen).toBe(HOURLY_45)
  })

  it('2. object lesson vehicle is a pauschale in payment and booking', async () => {
    const inserts = emptyInserts()
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, {
      vehicles: [hourlyVehicle(VEHICLE, { pricing_tiers: { lesson: 3500 } })],
    }))
    mocks.readBody.mockResolvedValue(appointmentBody({ vehicle_id: VEHICLE }))

    const { default: handler } = await handlerPromise
    await handler({})
    expect(asPayment(inserts.payments[0]).total_amount_rappen).toBe(LESSON_45 + 3500)
    expect(asBooking(inserts.vehicle_bookings[0]).cost_rappen).toBe(3500)
  })

  it('3. array lesson vehicle is a pauschale in payment and booking', async () => {
    const inserts = emptyInserts()
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, {
      vehicles: [hourlyVehicle(VEHICLE, {
        pricing_tiers: [{ type: 'lesson', enabled: true, rate_rappen: 4200 }],
      })],
    }))
    mocks.readBody.mockResolvedValue(appointmentBody({ vehicle_id: VEHICLE }))

    const { default: handler } = await handlerPromise
    await handler({})
    expect(asPayment(inserts.payments[0]).total_amount_rappen).toBe(LESSON_45 + 4200)
    expect(asBooking(inserts.vehicle_bookings[0]).cost_rappen).toBe(4200)
  })

  it('6. room pricing_tiers.lesson is ignored; hourly is used', async () => {
    const inserts = emptyInserts()
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, {
      rooms: [hourlyRoom(ROOM, { pricing_tiers: { lesson: 9999 } })],
    }))
    mocks.readBody.mockResolvedValue({
      ...appointmentBody({ room_id: ROOM }),
      resourceSurcharges: [{ label: 'Raum', rappen: 1, type: 'room' }],
    })

    const { default: handler } = await handlerPromise
    await handler({})
    expect(paymentResourceContribution(asPayment(inserts.payments[0]))).toBe(HOURLY_45)
    expect(asBooking(inserts.room_bookings[0]).room_cost_rappen).toBe(HOURLY_45)
  })

  it('7. vehicle + room sum in payment and booking costs', async () => {
    const inserts = emptyInserts()
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, {
      vehicles: [hourlyVehicle()],
      rooms: [hourlyRoom()],
    }))
    mocks.readBody.mockResolvedValue(appointmentBody({ vehicle_id: VEHICLE, room_id: ROOM }))

    const { default: handler } = await handlerPromise
    await handler({})
    expect(asPayment(inserts.payments[0]).total_amount_rappen).toBe(LESSON_45 + HOURLY_45 + HOURLY_45)
    expect(asBooking(inserts.vehicle_bookings[0]).cost_rappen).toBe(HOURLY_45)
    expect(asBooking(inserts.room_bookings[0]).room_cost_rappen).toBe(HOURLY_45)
  })

  it('12. foreign-tenant vehicle contributes 0, not the foreign price', async () => {
    const inserts = emptyInserts()
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, {
      vehicles: [hourlyVehicle(VEHICLE, { tenant_id: OTHER, pricing_tiers: { lesson: 8800 } })],
    }))
    mocks.readBody.mockResolvedValue({
      ...appointmentBody({ vehicle_id: VEHICLE }),
      resourceSurcharges: [{ label: 'Fahrzeug', rappen: 8800, type: 'vehicle' }],
    })

    const { default: handler } = await handlerPromise
    await handler({})
    expect(paymentResourceContribution(asPayment(inserts.payments[0]))).toBe(0)
    expect(asPayment(inserts.payments[0]).total_amount_rappen).toBe(LESSON_45)
    expect(asBooking(inserts.vehicle_bookings[0]).cost_rappen).toBe(0)
  })

  it('13. foreign-tenant room contributes 0, not the foreign price', async () => {
    const inserts = emptyInserts()
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, {
      rooms: [hourlyRoom(ROOM, { tenant_id: OTHER })],
    }))
    mocks.readBody.mockResolvedValue({
      ...appointmentBody({ room_id: ROOM }),
      resourceSurcharges: [{ label: 'Raum', rappen: 7500, type: 'room' }],
    })

    const { default: handler } = await handlerPromise
    await handler({})
    expect(paymentResourceContribution(asPayment(inserts.payments[0]))).toBe(0)
    expect(asBooking(inserts.room_bookings[0]).room_cost_rappen).toBe(0)
  })

  it('14. inactive vehicle is 0', async () => {
    const inserts = emptyInserts()
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, {
      vehicles: [hourlyVehicle(VEHICLE, { is_active: false, pricing_tiers: { lesson: 3500 } })],
    }))
    mocks.readBody.mockResolvedValue(appointmentBody({ vehicle_id: VEHICLE }))

    const { default: handler } = await handlerPromise
    await handler({})
    expect(paymentResourceContribution(asPayment(inserts.payments[0]))).toBe(0)
    expect(asBooking(inserts.vehicle_bookings[0]).cost_rappen).toBe(0)
  })

  it('15. inactive room is 0', async () => {
    const inserts = emptyInserts()
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, {
      rooms: [hourlyRoom(ROOM, { is_active: false })],
    }))
    mocks.readBody.mockResolvedValue(appointmentBody({ room_id: ROOM }))

    const { default: handler } = await handlerPromise
    await handler({})
    expect(paymentResourceContribution(asPayment(inserts.payments[0]))).toBe(0)
    expect(asBooking(inserts.room_bookings[0]).room_cost_rappen).toBe(0)
  })

  it('16. edit vehicle A → B persists B', async () => {
    const inserts = emptyInserts()
    const paymentUpdates: unknown[] = []
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, {
      vehicles: [
        hourlyVehicle(VEHICLE, { pricing_tiers: { lesson: 3500 } }),
        hourlyVehicle(VEHICLE_B, { pricing_tiers: { lesson: 6100 } }),
      ],
      existingAppointment: existingAppointment({ vehicle_id: VEHICLE }),
      existingPayment: {
        id: PAY,
        payment_status: 'pending',
        total_amount_rappen: LESSON_45 + 3500,
        amount_paid_rappen: 0,
        metadata: {},
      },
      paymentUpdates,
    }))
    mocks.readBody.mockResolvedValue({
      ...appointmentBody({ vehicle_id: VEHICLE_B }),
      mode: 'edit',
      eventId: APPT,
      resourceSurcharges: [{ label: 'Fahrzeug', rappen: 1, type: 'vehicle' }],
    })

    const { default: handler } = await handlerPromise
    await handler({})
    const updated = asPayment(paymentUpdates[0])
    expect(updated.total_amount_rappen).toBe(LESSON_45 + 6100)
    expect(updated.lesson_price_rappen).toBe(LESSON_45)
    expect(asBooking(inserts.vehicle_bookings[0]).cost_rappen).toBe(6100)
  })

  it('17. edit removing the vehicle zeros the resource share', async () => {
    const inserts = emptyInserts()
    const paymentUpdates: unknown[] = []
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, {
      vehicles: [hourlyVehicle()],
      existingAppointment: existingAppointment({ vehicle_id: VEHICLE }),
      existingPayment: {
        id: PAY,
        payment_status: 'pending',
        total_amount_rappen: LESSON_45 + HOURLY_45,
        amount_paid_rappen: 0,
        metadata: {},
      },
      paymentUpdates,
    }))
    mocks.readBody.mockResolvedValue({
      ...appointmentBody({ vehicle_id: null }),
      mode: 'edit',
      eventId: APPT,
      resourceSurcharges: [{ label: 'Fahrzeug', rappen: 7500, type: 'vehicle' }],
    })

    const { default: handler } = await handlerPromise
    await handler({})
    expect(asPayment(paymentUpdates[0]).total_amount_rappen).toBe(LESSON_45)
    expect(inserts.vehicle_bookings).toHaveLength(0)
  })

  it('18. edit duration 45 → 90 scales hourly resource', async () => {
    const inserts = emptyInserts()
    const paymentUpdates: unknown[] = []
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, {
      vehicles: [hourlyVehicle()],
      existingAppointment: existingAppointment({ duration_minutes: 45 }),
      existingPayment: {
        id: PAY,
        payment_status: 'pending',
        total_amount_rappen: LESSON_45 + HOURLY_45,
        amount_paid_rappen: 0,
        metadata: {},
      },
      paymentUpdates,
    }))
    mocks.readBody.mockResolvedValue({
      ...appointmentBody({
        vehicle_id: VEHICLE,
        duration_minutes: 90,
        end_time: '2026-09-14T11:30:00.000Z',
      }),
      mode: 'edit',
      eventId: APPT,
    })

    const { default: handler } = await handlerPromise
    await handler({})
    const updated = asPayment(paymentUpdates[0])
    expect(updated.lesson_price_rappen).toBe(18000)
    expect(paymentResourceContribution(updated)).toBe(15000)
    expect(updated.total_amount_rappen).toBe(33000)
    expect(asBooking(inserts.vehicle_bookings[0]).cost_rappen).toBe(15000)
  })

  it('19. edit payment update keeps server resource; browser amount rewrite is gone', async () => {
    const inserts = emptyInserts()
    const paymentUpdates: unknown[] = []
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, {
      vehicles: [hourlyVehicle()],
      existingAppointment: existingAppointment({ vehicle_id: VEHICLE }),
      existingPayment: {
        id: PAY,
        payment_status: 'pending',
        total_amount_rappen: LESSON_45,
        amount_paid_rappen: 0,
        metadata: {},
      },
      paymentUpdates,
    }))
    mocks.readBody.mockResolvedValue({
      ...appointmentBody({ vehicle_id: VEHICLE }),
      mode: 'edit',
      eventId: APPT,
      resourceSurcharges: [{ label: 'Fahrzeug', rappen: 0, type: 'vehicle' }],
    })

    const { default: handler } = await handlerPromise
    await handler({})
    expect(asPayment(paymentUpdates[0]).total_amount_rappen).toBe(LESSON_45 + HOURLY_45)
    expect(asPayment(paymentUpdates[0]).lesson_price_rappen).toBe(LESSON_45)
  })

  it('edit persists payment_method through save, not a client JWT write', async () => {
    const inserts = emptyInserts()
    const paymentUpdates: unknown[] = []
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, {
      existingAppointment: existingAppointment(),
      existingPayment: {
        id: PAY,
        payment_status: 'pending',
        total_amount_rappen: LESSON_45,
        amount_paid_rappen: 0,
        metadata: {},
      },
      paymentUpdates,
    }))
    mocks.readBody.mockResolvedValue({
      ...appointmentBody(),
      mode: 'edit',
      eventId: APPT,
      paymentMethodForPayment: 'invoice',
    })

    const { default: handler } = await handlerPromise
    await handler({})
    expect(asPayment(paymentUpdates[0]).payment_method).toBe('invoice')
    expect(asPayment(paymentUpdates[0]).lesson_price_rappen).toBe(LESSON_45)
  })

  const BILLING = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const INVOICE_SNAPSHOT = {
    company_name: 'Acme GmbH',
    city: 'Zürich',
    country: 'Schweiz',
  }

  async function editPaymentUpdate(
    body: Record<string, unknown>,
    existingPaymentExtras: Record<string, unknown> = {},
  ) {
    const inserts = emptyInserts()
    const paymentUpdates: unknown[] = []
    mocks.getSupabaseAdmin.mockReturnValue(paidLesson(inserts, {
      existingAppointment: existingAppointment(),
      existingPayment: {
        id: PAY,
        payment_status: 'pending',
        total_amount_rappen: LESSON_45,
        amount_paid_rappen: 0,
        metadata: {},
        ...existingPaymentExtras,
      },
      paymentUpdates,
    }))
    mocks.readBody.mockResolvedValue({
      ...appointmentBody(),
      mode: 'edit',
      eventId: APPT,
      ...body,
    })
    const { default: handler } = await handlerPromise
    await handler({})
    return asPayment(paymentUpdates[0])
  }

  it('C1 invoice method persists invoice_address snapshot', async () => {
    const updated = await editPaymentUpdate({
      paymentMethodForPayment: 'invoice',
      invoiceAddress: INVOICE_SNAPSHOT,
    })
    expect(updated.invoice_address).toEqual(INVOICE_SNAPSHOT)
    expect(updated.payment_method).toBe('invoice')
  })

  it('C1 cash clears invoice_address even if leftover snapshot is sent', async () => {
    const updated = await editPaymentUpdate({
      paymentMethodForPayment: 'cash',
      invoiceAddress: INVOICE_SNAPSHOT,
    })
    expect(updated.invoice_address).toBeNull()
    expect(updated.payment_method).toBe('cash')
  })

  it('C1 online/wallee clears invoice_address even if leftover snapshot is sent', async () => {
    const updated = await editPaymentUpdate({
      paymentMethodForPayment: 'online',
      invoiceAddress: INVOICE_SNAPSHOT,
    })
    expect(updated.invoice_address).toBeNull()
    expect(updated.payment_method).toBe('wallee')
  })

  it('C1 switching invoice → cash clears an existing invoice_address', async () => {
    const updated = await editPaymentUpdate(
      {
        paymentMethodForPayment: 'cash',
        invoiceAddress: null,
      },
      { invoice_address: INVOICE_SNAPSHOT },
    )
    expect(updated.invoice_address).toBeNull()
  })

  it('C1 cash omits invoiceAddress in the request but still writes null', async () => {
    const updated = await editPaymentUpdate({
      paymentMethodForPayment: 'cash',
    })
    expect(updated.invoice_address).toBeNull()
  })

  it('C1 notes supplied with text are persisted', async () => {
    const updated = await editPaymentUpdate({
      paymentNotes: 'Discount: staff courtesy',
    })
    expect(updated.notes).toBe('Discount: staff courtesy')
  })

  it('C1 notes explicitly null are persisted as null', async () => {
    const updated = await editPaymentUpdate({
      paymentNotes: null,
    })
    expect(updated.notes).toBeNull()
  })

  it('C1 existing notes + explicit clear removes stale notes', async () => {
    const updated = await editPaymentUpdate(
      { paymentNotes: null },
      { notes: 'Discount: old reason' },
    )
    expect(updated.notes).toBeNull()
  })

  it('C1 omitted notes do not appear on the payment update', async () => {
    const updated = await editPaymentUpdate({
      paymentMethodForPayment: 'cash',
    })
    expect(updated).not.toHaveProperty('notes')
  })

  it('C1 billing address ID supplied is persisted', async () => {
    const updated = await editPaymentUpdate({
      paymentMethodForPayment: 'invoice',
      companyBillingAddressId: BILLING,
    })
    expect(updated.company_billing_address_id).toBe(BILLING)
  })

  it('C1 billing address ID explicitly null is persisted as null', async () => {
    const updated = await editPaymentUpdate({
      companyBillingAddressId: null,
    })
    expect(updated.company_billing_address_id).toBeNull()
  })

  it('C1 existing billing address + explicit clear removes the stale ID', async () => {
    const updated = await editPaymentUpdate(
      { companyBillingAddressId: null },
      { company_billing_address_id: BILLING },
    )
    expect(updated.company_billing_address_id).toBeNull()
  })

  it('C1 omitted billing address ID does not appear on the payment update', async () => {
    const updated = await editPaymentUpdate({
      paymentMethodForPayment: 'cash',
    })
    expect(updated).not.toHaveProperty('company_billing_address_id')
  })

  it('EventModal uninitialized invoice payload preserves stored billing id and snapshot', async () => {
    const c1 = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'invoice',
      companyBillingAddressId: undefined,
      invoiceData: EMPTY_INVOICE_SNAPSHOT,
    })
    expect(c1).not.toHaveProperty('companyBillingAddressId')
    expect(c1).not.toHaveProperty('invoiceAddress')
    const updated = await editPaymentUpdate(
      {
        paymentMethodForPayment: 'invoice',
        ...c1,
      },
      {
        company_billing_address_id: BILLING,
        invoice_address: INVOICE_SNAPSHOT,
      },
    )
    expect(updated).not.toHaveProperty('company_billing_address_id')
    expect(updated).not.toHaveProperty('invoice_address')
    expect(updated.payment_method).toBe('invoice')
  })

  it('EventModal hydrated invoice payload persists known UUID and snapshot', async () => {
    const c1 = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'invoice',
      companyBillingAddressId: BILLING,
      invoiceData: INVOICE_SNAPSHOT,
    })
    const updated = await editPaymentUpdate(
      {
        paymentMethodForPayment: 'invoice',
        ...c1,
      },
      {
        company_billing_address_id: BILLING,
        invoice_address: { company_name: 'Old' },
      },
    )
    expect(updated.company_billing_address_id).toBe(BILLING)
    expect(updated.invoice_address).toEqual({
      company_name: 'Acme GmbH',
      contact_person: '',
      email: '',
      phone: '',
      street: '',
      street_number: '',
      zip: '',
      city: 'Zürich',
      country: 'Schweiz',
    })
  })

  it('EventModal cash payload from C1 builder clears billing id and invoice snapshot', async () => {
    const c1 = buildStaffC1PaymentMetadata({
      paymentMethodRaw: 'cash',
      companyBillingAddressId: BILLING,
      invoiceData: INVOICE_SNAPSHOT,
    })
    expect(c1.companyBillingAddressId).toBeNull()
    expect(c1.invoiceAddress).toBeNull()
    const updated = await editPaymentUpdate(
      {
        paymentMethodForPayment: 'cash',
        ...c1,
      },
      {
        company_billing_address_id: BILLING,
        invoice_address: INVOICE_SNAPSHOT,
      },
    )
    expect(updated.company_billing_address_id).toBeNull()
    expect(updated.invoice_address).toBeNull()
  })
})
