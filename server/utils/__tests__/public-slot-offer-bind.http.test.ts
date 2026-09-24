import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getClientIP: vi.fn(() => '198.51.100.10'),
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
  logAudit: vi.fn(async () => undefined),
  calculateAdminFee: vi.fn(async () => ({
    adminFeeRappen: 0,
    applies: false,
    reason: 'no_rule',
    appointmentNumber: 0,
  })),
  resolveVehicleSettings: vi.fn(() => null),
  calculateVehicleCost: vi.fn(() => 0),
  getTenantTerminology: vi.fn(async () => ({ businessNoun: 'Fahrschule' })),
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

vi.mock('~/server/utils/ip-utils', () => ({
  getClientIP: mocks.getClientIP,
}))

vi.mock('~/server/utils/rate-limiter', () => ({
  checkRateLimit: mocks.checkRateLimit,
}))

vi.mock('~/server/utils/audit', () => ({
  logAudit: mocks.logAudit,
}))

vi.mock('~/server/utils/admin-fee', () => ({
  calculateAdminFee: mocks.calculateAdminFee,
}))

vi.mock('~/server/utils/vehicle-availability', () => ({
  resolveVehicleSettings: mocks.resolveVehicleSettings,
  calculateVehicleCost: mocks.calculateVehicleCost,
}))

vi.mock('~/server/api/admin/booking-policy.get', () => ({
  DEFAULT_BOOKING_POLICY: {
    registration_required: false,
    booking_required_fields: ['first_name', 'last_name', 'phone'],
    booking_optional_fields: [],
  },
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const TENANT = 'tenant-a'
const SLOT_ID = 'slot-b-lesson'
const NOW = new Date()
const reservedUntil = new Date(NOW.getTime() + 10 * 60 * 1000).toISOString()

type EventTypeRow = {
  tenant_id: string
  code: string
  is_active?: boolean
  public_bookable?: boolean
  require_payment?: boolean
}

type RuleRow = {
  tenant_id: string
  id?: string
  rule_type: string
  category_code?: string | null
  event_type_code?: string | null
  price_per_minute_rappen: number
  is_active?: boolean
  valid_from?: string
  created_at?: string
}

type SlotRow = {
  id: string
  tenant_id: string
  staff_id: string
  location_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  is_available: boolean
  category_code: string
  reserved_by_session: string
  reserved_until: string
}

function createBookingSupabase(opts: {
  slot: SlotRow
  eventTypes: EventTypeRow[]
  rules?: RuleRow[]
  userProfile?: Record<string, unknown>
  inserts: Record<string, unknown[]>
  updates: Record<string, unknown[]>
}) {
  const eventTypes = opts.eventTypes.map((et) => ({
    is_active: true,
    public_bookable: true,
    require_payment: true,
    ...et,
  }))
  const rules = (opts.rules || []).map((r) => ({
    is_active: true,
    valid_from: '2020-01-01T00:00:00.000Z',
    created_at: '2020-01-01T00:00:00.000Z',
    id: r.id || 'rule-1',
    ...r,
  }))

  const tableRows = (table: string): Record<string, unknown>[] => {
    if (table === 'event_types') return eventTypes
    if (table === 'pricing_rules') return rules
    if (table === 'availability_slots') return [opts.slot]
    if (table === 'tenants') {
      return [{
        id: TENANT,
        slug: 'demo',
        is_active: true,
        name: 'Demo',
        booking_policy: { registration_required: false, booking_required_fields: ['first_name', 'last_name', 'phone'] },
        wallee_enabled: false,
      }]
    }
    if (table === 'users') {
      return [opts.userProfile || {
        id: 'user-1',
        auth_user_id: 'auth-1',
        tenant_id: TENANT,
        first_name: 'Ada',
        last_name: 'Lovelace',
        created_at: '2020-01-01T00:00:00.000Z',
      }]
    }
    if (table === 'audit_logs') return []
    if (table === 'external_busy_times') return []
    if (table === 'locations') return [{ id: opts.slot.location_id, name: 'HQ' }]
    if (table === 'categories') return []
    return []
  }

  return {
    from(table: string) {
      let current = [...tableRows(table)]
      const chain: Record<string, unknown> = {}
      const self = () => chain
      chain.select = vi.fn(self)
      chain.eq = vi.fn((col: string, val: unknown) => {
        current = current.filter((r) => r[col] === val)
        return chain
      })
      chain.in = vi.fn(self)
      chain.lte = vi.fn(self)
      chain.gte = vi.fn(self)
      chain.lt = vi.fn(self)
      chain.gt = vi.fn(self)
      chain.or = vi.fn(self)
      chain.order = vi.fn(self)
      chain.limit = vi.fn(self)
      chain.neq = vi.fn(self)
      chain.maybeSingle = vi.fn(async () => ({ data: current[0] ?? null, error: null }))
      chain.single = vi.fn(async () => ({
        data: current[0] ?? null,
        error: current[0] ? null : { message: 'not found' },
      }))
      chain.insert = vi.fn(async (row: unknown) => {
        if (!opts.inserts[table]) opts.inserts[table] = []
        opts.inserts[table].push(row)
        return { data: row, error: null, select: () => ({ single: async () => ({ data: row, error: null }) }) }
      })
      chain.update = vi.fn((row: unknown) => {
        if (!opts.updates[table]) opts.updates[table] = []
        opts.updates[table].push(row)
        return chain
      })
      chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve({ data: current, error: null }).then(resolve, reject)
      return chain
    },
  }
}

const lessonSlot: SlotRow = {
  id: SLOT_ID,
  tenant_id: TENANT,
  staff_id: 'staff-1',
  location_id: 'loc-1',
  start_time: '2026-09-20T08:00:00.000Z',
  end_time: '2026-09-20T08:45:00.000Z',
  duration_minutes: 45,
  is_available: true,
  category_code: 'B',
  reserved_by_session: 'session-1',
  reserved_until: reservedUntil,
}

const fsEventTypes: EventTypeRow[] = [
  { tenant_id: TENANT, code: 'lesson', public_bookable: true, require_payment: true },
  { tenant_id: TENANT, code: 'consulting', public_bookable: true, require_payment: false },
  { tenant_id: TENANT, code: 'internal_consulting', public_bookable: false, require_payment: false },
]

const bPriceRule: RuleRow = {
  tenant_id: TENANT,
  id: 'b-price',
  rule_type: 'base_price',
  category_code: 'B',
  price_per_minute_rappen: 211,
}

const consultingCheap: RuleRow = {
  tenant_id: TENANT,
  id: 'consult-price',
  rule_type: 'event_price',
  event_type_code: 'consulting',
  price_per_minute_rappen: 44,
}

type Handler = (event: object) => Promise<unknown>

function isHttpError(err: unknown): err is { statusCode: number; data?: { code?: string }; message?: string; stack?: string } {
  return typeof err === 'object' && err !== null && 'statusCode' in err && typeof (err as { statusCode: unknown }).statusCode === 'number'
}

async function expectHttpError(run: () => Promise<unknown>, code: string, status = 400) {
  try {
    const result = await run()
    throw new Error(`expected HTTP ${status} ${code}, got success: ${JSON.stringify(result)?.slice(0, 300)}`)
  } catch (err: unknown) {
    if (!isHttpError(err)) {
      const fallback = err instanceof Error ? err : new Error(String(err))
      throw new Error(`expected HTTP ${status} ${code}, got ${fallback.message}\n${fallback.stack || ''}`, { cause: err })
    }
    expect(err.statusCode).toBe(status)
    expect(err.data?.code).toBe(code)
    return err
  }
}

describe('HTTP: preview-price slot bind', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.getSupabaseAdmin.mockReset()
  })

  async function previewHandler(): Promise<Handler> {
    return (await import('../../api/booking/preview-price.post')).default as Handler
  }

  it('Attack 6: identity mismatch is 4xx, not a consulting/free price', async () => {
    const inserts: Record<string, unknown[]> = {}
    mocks.readBody.mockResolvedValue({
      slot_id: SLOT_ID,
      tenant_id: TENANT,
      category_code: 'B',
      event_type_code: 'consulting',
      appointment_type: 'consulting',
    })
    mocks.getSupabaseAdmin.mockReturnValue(createBookingSupabase({
      slot: lessonSlot,
      eventTypes: fsEventTypes,
      rules: [bPriceRule, consultingCheap],
      inserts,
      updates: {},
    }))

    await expectHttpError(() => (previewHandler().then((h) => h({}))), 'CATEGORY_SLOT_MISMATCH')
  })

  it('Attack 3: cheaper consulting event_price is not returned for a B lesson slot', async () => {
    mocks.readBody.mockResolvedValue({
      slot_id: SLOT_ID,
      tenant_id: TENANT,
      category_code: 'B',
      event_type_code: 'consulting',
      appointment_type: 'consulting',
    })
    mocks.getSupabaseAdmin.mockReturnValue(createBookingSupabase({
      slot: lessonSlot,
      eventTypes: fsEventTypes,
      rules: [bPriceRule, consultingCheap],
      inserts: {},
      updates: {},
    }))

    await expectHttpError(() => previewHandler().then((h) => h({})), 'CATEGORY_SLOT_MISMATCH')
  })

  it('Attack 5: honest B + lesson returns the category price, not 0', async () => {
    mocks.readBody.mockResolvedValue({
      slot_id: SLOT_ID,
      tenant_id: TENANT,
      category_code: 'B',
      event_type_code: 'lesson',
      appointment_type: 'lesson',
    })
    mocks.getSupabaseAdmin.mockReturnValue(createBookingSupabase({
      slot: lessonSlot,
      eventTypes: fsEventTypes,
      rules: [bPriceRule],
      inserts: {},
      updates: {},
    }))

    const result = await (await previewHandler())({}) as { success: boolean; kind: string; price_rappen: number }
    expect(result.success).toBe(true)
    expect(result.kind).toBe('paid')
    expect(result.price_rappen).toBe(9495)
  })
})

describe('HTTP: guest-book slot bind and side effects', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.getSupabaseAdmin.mockReset()
  })

  async function guestHandler(): Promise<Handler> {
    return (await import('../../api/booking/guest-book.post')).default as Handler
  }

  const guestBody = {
    slot_id: SLOT_ID,
    session_id: 'session-1',
    tenant_slug: 'demo',
    first_name: 'Ada',
    last_name: 'Lovelace',
    phone: '+41790000000',
    category_code: 'B',
    event_type_code: 'consulting',
    appointment_type: 'consulting',
  }

  it('Attack 1: guest B+consulting is CATEGORY_SLOT_MISMATCH and does not insert a user', async () => {
    const inserts: Record<string, unknown[]> = {}
    mocks.readBody.mockResolvedValue(guestBody)
    mocks.getSupabaseAdmin.mockReturnValue(createBookingSupabase({
      slot: lessonSlot,
      eventTypes: fsEventTypes,
      rules: [bPriceRule, consultingCheap],
      inserts,
      updates: {},
    }))

    await expectHttpError(() => guestHandler().then((h) => h({})), 'CATEGORY_SLOT_MISMATCH')
    expect(inserts.users || []).toEqual([])
    expect(inserts.appointments || []).toEqual([])
  })

  it('Attack 7: guest NO_PRICE_RULE does not insert a user', async () => {
    const inserts: Record<string, unknown[]> = {}
    mocks.readBody.mockResolvedValue({
      ...guestBody,
      event_type_code: 'lesson',
      appointment_type: 'lesson',
    })
    mocks.getSupabaseAdmin.mockReturnValue(createBookingSupabase({
      slot: lessonSlot,
      eventTypes: fsEventTypes,
      rules: [],
      inserts,
      updates: {},
    }))

    await expectHttpError(() => guestHandler().then((h) => h({})), 'NO_PRICE_RULE', 503)
    expect(inserts.users || []).toEqual([])
  })
})

describe('HTTP: create-appointment slot bind and side effects', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.getAuthenticatedUser.mockResolvedValue({ id: 'auth-1' })
  })

  async function createHandler(): Promise<Handler> {
    return (await import('../../api/booking/create-appointment.post')).default as Handler
  }

  it('Attack 1: auth booking B+consulting is 4xx and does not reserve overlapping slots', async () => {
    const updates: Record<string, unknown[]> = {}
    mocks.readBody.mockResolvedValue({
      slot_id: SLOT_ID,
      session_id: 'session-1',
      appointment_type: 'consulting',
      category_code: 'B',
      event_type_code: 'consulting',
    })
    mocks.getSupabaseAdmin.mockReturnValue(createBookingSupabase({
      slot: lessonSlot,
      eventTypes: fsEventTypes,
      rules: [bPriceRule, consultingCheap],
      inserts: {},
      updates,
    }))

    await expectHttpError(() => createHandler().then((h) => h({})), 'CATEGORY_SLOT_MISMATCH')
    expect(updates.availability_slots || []).toEqual([])
  })

  it('Attack 7: auth NO_PRICE_RULE does not mutate slot reservations', async () => {
    const updates: Record<string, unknown[]> = {}
    mocks.readBody.mockResolvedValue({
      slot_id: SLOT_ID,
      session_id: 'session-1',
      appointment_type: 'lesson',
      category_code: 'B',
      event_type_code: 'lesson',
    })
    mocks.getSupabaseAdmin.mockReturnValue(createBookingSupabase({
      slot: lessonSlot,
      eventTypes: fsEventTypes,
      rules: [],
      inserts: {},
      updates,
    }))

    await expectHttpError(() => createHandler().then((h) => h({})), 'NO_PRICE_RULE', 503)
    expect(updates.availability_slots || []).toEqual([])
  })
})
