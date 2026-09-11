import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getAuthUserFromRequest: vi.fn(),
  requireStaffOrInternal: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  createClient: vi.fn(),
  isChargeableEventType: vi.fn(),
  quoteStaffAppointmentFromRow: vi.fn(),
  quoteAndComposeStaffAppointmentPayment: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

vi.mock('~/server/utils/auth-helper', () => ({
  getAuthUserFromRequest: mocks.getAuthUserFromRequest,
}))

vi.mock('~/server/utils/require-staff-or-internal', () => ({
  requireStaffOrInternal: mocks.requireStaffOrInternal,
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/utils/supabase', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

vi.mock('~/server/utils/event-type-charge', () => ({
  isChargeableEventType: mocks.isChargeableEventType,
}))

vi.mock('~/server/utils/staff-appointment-price', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../staff-appointment-price')>()
  return {
    ...actual,
    quoteStaffAppointmentFromRow: mocks.quoteStaffAppointmentFromRow,
    quoteAndComposeStaffAppointmentPayment: mocks.quoteAndComposeStaffAppointmentPayment,
  }
})

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('~/server/utils/supabase-error', () => ({
  mapSupabaseError: (error: unknown) => error,
}))

type EventHandler = (event: object) => Promise<unknown>

const quoted = {
  quote: {
    lessonPriceRappen: 9495,
    adminFeeRappen: 5000,
    vehicleCostRappen: 0,
    roomCostRappen: 0,
    resourceCostRappen: 0,
    pricePerMinuteRappen: 211,
    durationMinutes: 45,
    appointmentNumber: 2,
    ruleSource: 'base',
    categoryCode: 'B',
    eventTypeCode: 'lesson',
    appliesAdminFee: true,
  },
  totals: {
    lesson_price_rappen: 9495,
    admin_fee_rappen: 5000,
    products_price_rappen: 0,
    discount_amount_rappen: 0,
    voucher_discount_rappen: 0,
    credit_used_rappen: 0,
    total_amount_rappen: 14495,
    resource_cost_rappen: 0,
    vehicle_cost_rappen: 0,
    room_cost_rappen: 0,
  },
}

const staffUser = {
  id: 'staff-a',
  tenant_id: 'tenant-a',
  role: 'staff',
  is_active: true,
}

const appointment = {
  id: 'apt-1',
  tenant_id: 'tenant-a',
  type: 'B',
  event_type_code: 'lesson',
  duration_minutes: 45,
  user_id: 'student-1',
  vehicle_id: null,
  room_id: null,
  staff_id: 'staff-a',
}

function thenable(result: { data: unknown; error: unknown }, extra: Record<string, unknown> = {}) {
  const builder: Record<string, unknown> = { ...extra }
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.limit = vi.fn(chain)
  builder.maybeSingle = vi.fn(async () => result)
  builder.single = vi.fn(async () => result)
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder
}

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('Phase 1 source contracts', () => {
  it('save quotes server-side and does not persist client money fields', () => {
    const src = read('server/api/appointments/save.post.ts')
    expect(src).toContain('quoteAndComposeStaffAppointmentPayment')
    expect(src).toContain('totals.lesson_price_rappen')
    expect(src).toContain('totals.total_amount_rappen')
    expect(src).toContain('delete appointmentData[key]')
    expect(src).not.toMatch(/lesson_price_rappen:\s*basePriceRappen/)
    expect(src).not.toMatch(/total_amount_rappen:\s*totalAmountRappenForPayment/)
    expect(src).not.toContain("from '~/server/api/pricing/calculate")
    expect(src).toContain('appointmentData.tenant_id = callerProfile.tenant_id')
    expect(src).toContain('never client resourceSurcharges')
  })

  it('staff payment writers ignore client monetary authority', () => {
    const create = read('server/api/staff/create-payment.post.ts')
    const update = read('server/api/staff/update-payment.post.ts')
    const manage = read('server/api/payments/manage.post.ts')
    const calendar = read('server/api/calendar/manage.post.ts')
    const adjust = read('server/api/appointments/adjust-duration.post.ts')
    expect(create).toContain('quoteStaffAppointmentFromRow')
    expect(create).not.toMatch(/\.\.\.paymentData/)
    expect(update).toContain('REJECTED_MONETARY_FIELDS')
    expect(update).toContain('Ignoring client monetary fields')
    expect(manage).not.toMatch(/\.\.\.paymentData/)
    expect(manage).toContain('quoteStaffAppointmentFromRow')
    expect(calendar).toContain('assertCalendarStaff')
    expect(calendar).toContain('quoteStaffAppointmentFromRow')
    expect(adjust).toContain('proportionalLessonPriceRappen')
    expect(adjust).not.toMatch(/pricePerMinute/)
  })

  it('browser EventModal no longer writes payment amounts over PostgREST', () => {
    const src = read('composables/useEventModalForm.ts')
    expect(src).toContain('Payment amounts are updated by appointments/save')
    expect(src).not.toMatch(/from\('payments'\)[\s\S]{0,80}\.update/)
    expect(src).toContain('productLines:')
    expect(read('utils/paymentService.ts')).toContain('Direct PostgREST payment inserts are not allowed')
  })

  it('does not change public booking pricing modules', () => {
    for (const path of [
      'server/api/booking/create-appointment.post.ts',
      'server/api/booking/guest-book.post.ts',
      'server/api/booking/preview-price.post.ts',
    ]) {
      const src = read(path)
      expect(src).not.toContain('quoteStaffAppointmentLessonPrice')
      expect(src).not.toContain('quoteAndComposeStaffAppointmentPayment')
    }
  })

  it('Wallee checkout charges the stored payment total, not a client amount', () => {
    const src = read('server/utils/wallee-appointment-checkout.ts')
    expect(src).toContain('remainingDueRappen')
    expect(src).toContain('total_amount_rappen: payment.total_amount_rappen')
  })
})

describe('POST /api/staff/create-payment forged money', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.getAuthenticatedUser.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.isChargeableEventType.mockReset()
    mocks.quoteStaffAppointmentFromRow.mockReset()
    mocks.getAuthenticatedUser.mockResolvedValue({ id: 'auth-staff-a' })
    mocks.isChargeableEventType.mockResolvedValue(true)
    mocks.quoteStaffAppointmentFromRow.mockResolvedValue(quoted)
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/staff/create-payment.post')).default as EventHandler
  }

  it('inserts the server quote instead of planted lesson/total amounts', async () => {
    const insert = vi.fn(() => thenable({ data: { id: 'pay-1' }, error: null }))
    const from = vi.fn((table: string) => {
      if (table === 'users') return thenable({ data: staffUser, error: null })
      if (table === 'appointments') return thenable({ data: appointment, error: null })
      if (table === 'payments') {
        return {
          ...thenable({ data: null, error: null }),
          insert,
        }
      }
      return thenable({ data: null, error: null })
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })
    mocks.readBody.mockResolvedValue({
      appointment_id: 'apt-1',
      user_id: 'student-1',
      tenant_id: 'forged-tenant',
      lesson_price_rappen: 1,
      total_amount_rappen: 1,
      admin_fee_rappen: 1,
      pricePerMinute: 1,
      payment_method: 'cash',
    })

    const result = await (await handler())({}) as { success: boolean; data: { id: string } }
    expect(result.success).toBe(true)
    expect(insert).toHaveBeenCalledTimes(1)
    const payload = insert.mock.calls[0][0]
    expect(payload.lesson_price_rappen).toBe(9495)
    expect(payload.total_amount_rappen).toBe(14495)
    expect(payload.tenant_id).toBe('tenant-a')
    expect(payload.lesson_price_rappen).not.toBe(1)
    expect(payload.total_amount_rappen).not.toBe(1)
  })

  it('rejects a client-role caller', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'users') return thenable({ data: { ...staffUser, role: 'client' }, error: null })
      return thenable({ data: null, error: null })
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })
    mocks.readBody.mockResolvedValue({ appointment_id: 'apt-1', user_id: 'student-1' })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('POST /api/staff/update-payment forged money', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.getAuthUserFromRequest.mockReset()
    mocks.createClient.mockReset()
    mocks.quoteStaffAppointmentFromRow.mockReset()
    process.env.SUPABASE_URL = 'http://localhost'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role'
    mocks.getAuthUserFromRequest.mockResolvedValue({ id: 'auth-staff-a' })
    mocks.quoteStaffAppointmentFromRow.mockResolvedValue(quoted)
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/staff/update-payment.post')).default as EventHandler
  }

  it('does not persist planted lesson or total amounts', async () => {
    const update = vi.fn(() => thenable({ data: { id: 'pay-1', lesson_price_rappen: 9495 }, error: null }))
    const from = vi.fn((table: string) => {
      if (table === 'users') return thenable({ data: staffUser, error: null })
      if (table === 'payments') {
        return {
          ...thenable({ data: { id: 'pay-1', tenant_id: 'tenant-a', appointment_id: 'apt-1', metadata: {}, payment_status: 'pending' }, error: null }),
          update,
        }
      }
      return thenable({ data: appointment, error: null })
    })
    mocks.createClient.mockReturnValue({ from })
    mocks.readBody.mockResolvedValue({
      payment_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      update_data: {
        lesson_price_rappen: 1,
        total_amount_rappen: 1,
        pricePerMinute: 1,
      },
    })

    const result = await (await handler())({}) as { success: boolean; data: { id: string } }
    expect(result.success).toBe(true)
    if (update.mock.calls.length) {
      const payload = update.mock.calls[0][0]
      expect(payload.lesson_price_rappen).toBeUndefined()
      expect(payload.total_amount_rappen).toBeUndefined()
    }
  })
})

describe('POST /api/payments/manage create forged money', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.getAuthenticatedUser.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.quoteStaffAppointmentFromRow.mockReset()
    mocks.getAuthenticatedUser.mockResolvedValue({ id: 'auth-staff-a' })
    mocks.quoteStaffAppointmentFromRow.mockResolvedValue(quoted)
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/payments/manage.post')).default as EventHandler
  }

  it('does not spread client paymentData monetary fields into the insert', async () => {
    const insert = vi.fn(() => thenable({ data: { id: 'pay-1' }, error: null }))
    const from = vi.fn((table: string) => {
      if (table === 'users') {
        const builder = thenable({ data: staffUser, error: null })
        builder.eq = vi.fn((column: string) => {
          if (column === 'id') return thenable({ data: { id: 'student-1', tenant_id: 'tenant-a' }, error: null })
          return builder
        })
        return builder
      }
      if (table === 'appointments') return thenable({ data: appointment, error: null })
      if (table === 'payments') return { ...thenable({ data: { id: 'pay-1' }, error: null }), insert }
      return thenable({ data: null, error: null })
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })
    mocks.readBody.mockResolvedValue({
      action: 'create',
      paymentData: {
        user_id: 'student-1',
        appointment_id: 'apt-1',
        lesson_price_rappen: 1,
        total_amount_rappen: 1,
        admin_fee_rappen: 999999,
        payment_method: 'cash',
      },
    })

    const result = await (await handler())({}) as { success: boolean }
    expect(result.success).toBe(true)
    expect(insert).toHaveBeenCalled()
    const payload = insert.mock.calls[0][0]
    expect(payload.lesson_price_rappen).toBe(9495)
    expect(payload.total_amount_rappen).toBe(14495)
  })
})

describe('POST /api/calendar/manage client-role rejection', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.getAuthenticatedUser.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.quoteStaffAppointmentFromRow.mockReset()
    mocks.getAuthenticatedUser.mockResolvedValue({ id: 'auth-client' })
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/calendar/manage.post')).default as EventHandler
  }

  it('rejects create-payment from a client JWT', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'users') return thenable({ data: { id: 'client-1', role: 'client', tenant_id: 'tenant-a' }, error: null })
      return thenable({ data: null, error: null })
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })
    mocks.readBody.mockResolvedValue({
      action: 'create-payment',
      payment_data: {
        appointment_id: 'apt-1',
        lesson_price_rappen: 1,
        total_amount_rappen: 1,
      },
    })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects create-appointment from a client JWT', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'users') return thenable({ data: { id: 'client-1', role: 'client', tenant_id: 'tenant-a' }, error: null })
      return thenable({ data: null, error: null })
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })
    mocks.readBody.mockResolvedValue({
      action: 'create-appointment',
      appointment_data: { tenant_id: 'tenant-a', original_price_rappen: 1 },
    })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('POST /api/appointments/adjust-duration ignores client ppm', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.requireStaffOrInternal.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.requireStaffOrInternal.mockResolvedValue({
      mode: 'staff',
      profile: { id: 'staff-a', tenant_id: 'tenant-a', role: 'staff' },
    })
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/appointments/adjust-duration.post')).default as EventHandler
  }

  it('scales the stored lesson price and ignores pricePerMinute=1', async () => {
    const update = vi.fn(() => thenable({ data: { id: 'pay-1' }, error: null }))
    const from = vi.fn((table: string) => {
      if (table === 'appointments') {
        return thenable({
          data: { id: 'apt-1', user_id: 'student-1', staff_id: 'staff-a', start_time: '2026-01-01', duration_minutes: 45, status: 'confirmed', tenant_id: 'tenant-a' },
          error: null,
        })
      }
      return {
        ...thenable({
          data: {
            id: 'pay-1',
            lesson_price_rappen: 9000,
            admin_fee_rappen: 0,
            products_price_rappen: 0,
            discount_amount_rappen: 0,
            payment_status: 'pending',
            total_amount_rappen: 9000,
            user_id: 'student-1',
            tenant_id: 'tenant-a',
          },
          error: null,
        }),
        update,
      }
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })
    mocks.readBody.mockResolvedValue({
      appointmentId: 'apt-1',
      newDurationMinutes: 30,
      pricePerMinute: 1,
    })

    const result = await (await handler())({}) as { success: boolean; action?: string }
    expect(result.success).toBe(true)
    expect(update).toHaveBeenCalled()
    const payload = update.mock.calls[0][0]
    expect(payload.lesson_price_rappen).toBe(6000)
    expect(payload.total_amount_rappen).toBe(6000)
    expect(payload.lesson_price_rappen).not.toBe(30)
  })
})
