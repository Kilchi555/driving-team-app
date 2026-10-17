/**
 * C1 regression: POST /api/appointments/save binds SaaS write guard to the
 * authorized entity/profile tenant — never body.tenant_id alone.
 * Does NOT mock away assertTenantSubscriptionWritable.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  requireAdminProfile: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  assertStaffCanApplyManualDiscount: vi.fn(async () => undefined),
  getTenantTerminology: vi.fn(async () => ({ appointment: 'Termin' })),
  enqueueStaffAvailabilityRecalc: vi.fn(async () => undefined),
  attachProposalAttributionToStaffAppointment: vi.fn(async () => undefined),
  becameBindingConfirmed: vi.fn(() => false),
  hashCustomerIdentifiers: vi.fn(async () => ({ hashedEmail: null, hashedPhone: null })),
  reportBindingAppointmentConversionSafely: vi.fn(async () => undefined),
  dispatchAppointmentConfirmation: vi.fn(async () => undefined),
  appointmentUpdates: [] as unknown[],
  appointmentInserts: [] as unknown[],
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

vi.mock('~/server/utils/supabase-admin', () => ({
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
    releaseSlots: vi.fn(async () => ({ releasedCount: 0, success: true })),
    invalidateSlots: vi.fn(async () => ({ invalidatedCount: 0, success: true })),
  }),
}))

vi.mock('~/server/utils/dispatch-appointment-confirmation', () => ({
  dispatchAppointmentConfirmation: mocks.dispatchAppointmentConfirmation,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const CALLER_TENANT = '11111111-1111-1111-1111-111111111111'
const EXPIRED_TENANT = '22222222-2222-2222-2222-222222222222'
const OTHER_TENANT = '33333333-3333-3333-3333-333333333333'
const STAFF = '44444444-4444-4444-4444-444444444444'
const USER = '55555555-5555-5555-5555-555555555555'
const APPT = '66666666-6666-6666-6666-666666666666'
const NOW = new Date('2026-06-15T12:00:00.000Z')
const FUTURE = '2026-07-01T00:00:00.000Z'
const PAST = '2026-05-01T00:00:00.000Z'

type TenantSnap = {
  id: string
  is_trial: boolean
  trial_ends_at: string | null
  subscription_plan: string | null
  current_period_end: string | null
  website_only?: boolean
}

function writableSnap(id: string): TenantSnap {
  return {
    id,
    is_trial: false,
    trial_ends_at: null,
    subscription_plan: 'starter',
    current_period_end: FUTURE,
    website_only: false,
  }
}

function expiredTrialSnap(id: string): TenantSnap {
  return {
    id,
    is_trial: true,
    trial_ends_at: PAST,
    subscription_plan: 'trial',
    current_period_end: null,
    website_only: false,
  }
}

function existingAppt(tenantId: string) {
  return {
    id: APPT,
    start_time: '2026-06-16T10:00:00.000Z',
    end_time: '2026-06-16T10:45:00.000Z',
    staff_id: STAFF,
    tenant_id: tenantId,
    duration_minutes: 45,
    status: 'confirmed',
    user_id: USER,
    event_type_code: 'lesson',
    type: 'B',
    gclid: null,
    gbraid: null,
    wbraid: null,
    fbclid: null,
    fbc: null,
    fbp: null,
  }
}

function createClient(opts: {
  tenants: TenantSnap[]
  appointment: Record<string, unknown> | null
}) {
  return {
    from(table: string) {
      const state: {
        filters: Record<string, unknown>
        op: 'select' | 'insert' | 'update'
        updatePayload: Record<string, unknown> | null
        insertPayload: Record<string, unknown> | null
      } = { filters: {}, op: 'select', updatePayload: null, insertPayload: null }

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
        if (table === 'appointments') mocks.appointmentInserts.push(payload)
        return chain
      }
      chain.update = (payload?: Record<string, unknown>) => {
        state.op = 'update'
        state.updatePayload = payload || {}
        if (table === 'appointments') mocks.appointmentUpdates.push(payload)
        return chain
      }
      chain.maybeSingle = async () => {
        if (table === 'tenants') {
          const row = opts.tenants.find((t) => t.id === state.filters.id) || null
          return { data: row, error: null }
        }
        if (table === 'appointments') {
          const appt = opts.appointment
          if (!appt) return { data: null, error: null }
          if (state.filters.id && appt.id !== state.filters.id) {
            return { data: null, error: null }
          }
          if (state.filters.tenant_id && appt.tenant_id !== state.filters.tenant_id) {
            return { data: null, error: null }
          }
          return { data: appt, error: null }
        }
        if (table === 'event_types') {
          return {
            data: {
              tenant_id: state.filters.tenant_id,
              code: 'lesson',
              require_payment: false,
              is_active: true,
            },
            error: null,
          }
        }
        if (table === 'payments') return { data: null, error: null }
        return { data: null, error: null }
      }
      chain.single = async () => {
        if (table === 'appointments' && state.op === 'update') {
          return {
            data: {
              ...(opts.appointment || {}),
              ...(state.updatePayload || {}),
              id: APPT,
            },
            error: null,
          }
        }
        if (table === 'appointments' && state.op === 'insert' && state.insertPayload) {
          return { data: { id: APPT, ...state.insertPayload }, error: null }
        }
        if (table === 'appointments' && opts.appointment) {
          if (state.filters.tenant_id && opts.appointment.tenant_id !== state.filters.tenant_id) {
            return { data: null, error: { message: 'not found' } }
          }
          return { data: opts.appointment, error: null }
        }
        return { data: null, error: { message: 'not found' } }
      }
      chain.then = (resolveFn: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolveFn, reject)
      return chain
    },
  }
}

type Handler = (event: object) => Promise<unknown>

describe('POST /api/appointments/save C1 SaaS tenant binding', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.appointmentUpdates.length = 0
    mocks.appointmentInserts.length = 0
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    mocks.assertStaffCanApplyManualDiscount.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function loadHandler(): Promise<Handler> {
    return (await import('../../api/appointments/save.post')).default as Handler
  }

  function editBody(bodyTenant: string) {
    return {
      mode: 'edit',
      eventId: APPT,
      appointmentData: {
        user_id: USER,
        staff_id: STAFF,
        tenant_id: bodyTenant,
        start_time: '2026-06-16T10:00:00.000Z',
        end_time: '2026-06-16T10:45:00.000Z',
        duration_minutes: 45,
        type: 'B',
        event_type_code: 'lesson',
        status: 'confirmed',
        title: 'Fahrstunde B',
      },
      paymentMethodForPayment: 'cash',
      adminFeeRappen: 0,
      productsPriceRappen: 0,
      discountAmountRappen: 0,
      creditUsedRappen: 0,
    }
  }

  function createBody(bodyTenant: string) {
    return {
      mode: 'create',
      appointmentData: {
        user_id: USER,
        staff_id: STAFF,
        tenant_id: bodyTenant,
        start_time: '2026-06-16T10:00:00.000Z',
        end_time: '2026-06-16T10:45:00.000Z',
        duration_minutes: 45,
        type: 'B',
        event_type_code: 'vacation',
        status: 'confirmed',
        title: 'Ferien',
      },
      paymentMethodForPayment: 'cash',
      adminFeeRappen: 0,
      productsPriceRappen: 0,
      discountAmountRappen: 0,
      creditUsedRappen: 0,
    }
  }

  it('superadmin cannot redirect subscription check via writable body tenant_id (transfer rejected)', async () => {
    mocks.requireAdminProfile.mockResolvedValue({
      id: STAFF,
      tenant_id: CALLER_TENANT,
      role: 'super_admin',
      email: 'sa@example.com',
      auth_user_id: 'auth-sa',
    })
    mocks.getSupabaseAdmin.mockReturnValue(
      createClient({
        tenants: [writableSnap(CALLER_TENANT), expiredTrialSnap(EXPIRED_TENANT)],
        appointment: existingAppt(EXPIRED_TENANT),
      }),
    )
    mocks.readBody.mockResolvedValue(editBody(CALLER_TENANT))

    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Access denied: tenant transfer not allowed',
    })
    expect(mocks.appointmentUpdates).toEqual([])
  })

  it('superadmin editing expired-tenant appointment is blocked by entity subscription (402 before write)', async () => {
    mocks.requireAdminProfile.mockResolvedValue({
      id: STAFF,
      tenant_id: CALLER_TENANT,
      role: 'super_admin',
      email: 'sa@example.com',
      auth_user_id: 'auth-sa',
    })
    mocks.getSupabaseAdmin.mockReturnValue(
      createClient({
        tenants: [writableSnap(CALLER_TENANT), expiredTrialSnap(EXPIRED_TENANT)],
        appointment: existingAppt(EXPIRED_TENANT),
      }),
    )
    // Body matches entity tenant — still must evaluate EXPIRED_TENANT subscription.
    mocks.readBody.mockResolvedValue(editBody(EXPIRED_TENANT))

    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 402,
      data: { code: 'saas_subscription_required', reason: 'trial_expired' },
    })
    expect(mocks.appointmentUpdates).toEqual([])
  })

  it('staff cannot edit another tenant appointment by eventId alone', async () => {
    mocks.requireAdminProfile.mockResolvedValue({
      id: STAFF,
      tenant_id: CALLER_TENANT,
      role: 'staff',
      email: 'staff@example.com',
      auth_user_id: 'auth-staff',
    })
    mocks.getSupabaseAdmin.mockReturnValue(
      createClient({
        tenants: [writableSnap(CALLER_TENANT), writableSnap(OTHER_TENANT)],
        appointment: existingAppt(OTHER_TENANT),
      }),
    )
    mocks.readBody.mockResolvedValue(editBody(CALLER_TENANT))

    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(mocks.appointmentUpdates).toEqual([])
  })

  it('writable caller tenant cannot make an expired target tenant writable on edit', async () => {
    mocks.requireAdminProfile.mockResolvedValue({
      id: STAFF,
      tenant_id: CALLER_TENANT,
      role: 'admin',
      email: 'admin@example.com',
      auth_user_id: 'auth-admin',
    })
    mocks.getSupabaseAdmin.mockReturnValue(
      createClient({
        tenants: [writableSnap(CALLER_TENANT), expiredTrialSnap(EXPIRED_TENANT)],
        // Staff of CALLER_TENANT cannot see EXPIRED_TENANT row due to tenant filter.
        appointment: existingAppt(EXPIRED_TENANT),
      }),
    )
    mocks.readBody.mockResolvedValue(editBody(CALLER_TENANT))

    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 404 })
    expect(mocks.appointmentUpdates).toEqual([])
  })

  it('legitimate same-tenant edit succeeds when subscription is writable', async () => {
    mocks.requireAdminProfile.mockResolvedValue({
      id: STAFF,
      tenant_id: CALLER_TENANT,
      role: 'staff',
      email: 'staff@example.com',
      auth_user_id: 'auth-staff',
    })
    mocks.getSupabaseAdmin.mockReturnValue(
      createClient({
        tenants: [writableSnap(CALLER_TENANT)],
        appointment: existingAppt(CALLER_TENANT),
      }),
    )
    mocks.readBody.mockResolvedValue(editBody(CALLER_TENANT))

    const handler = await loadHandler()
    const result = await handler({})
    expect(result).toMatchObject({ success: true })
    expect(mocks.appointmentUpdates.length).toBeGreaterThan(0)
  })

  it('create mode uses authenticated caller tenant, not a body-selected foreign tenant', async () => {
    mocks.requireAdminProfile.mockResolvedValue({
      id: STAFF,
      tenant_id: CALLER_TENANT,
      role: 'staff',
      email: 'staff@example.com',
      auth_user_id: 'auth-staff',
    })
    mocks.getSupabaseAdmin.mockReturnValue(
      createClient({
        tenants: [writableSnap(CALLER_TENANT), writableSnap(OTHER_TENANT)],
        appointment: null,
      }),
    )
    mocks.readBody.mockResolvedValue(createBody(OTHER_TENANT))

    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Access denied: tenant mismatch',
    })
    expect(mocks.appointmentInserts).toEqual([])
  })

  it('create mode forces caller tenant and succeeds when writable', async () => {
    mocks.requireAdminProfile.mockResolvedValue({
      id: STAFF,
      tenant_id: CALLER_TENANT,
      role: 'staff',
      email: 'staff@example.com',
      auth_user_id: 'auth-staff',
    })
    mocks.getSupabaseAdmin.mockReturnValue(
      createClient({
        tenants: [writableSnap(CALLER_TENANT)],
        appointment: null,
      }),
    )
    // Body omits foreign tenant — create uses caller tenant.
    mocks.readBody.mockResolvedValue(createBody(CALLER_TENANT))

    const handler = await loadHandler()
    const result = await handler({})
    expect(result).toMatchObject({ success: true })
    expect(mocks.appointmentInserts.length).toBeGreaterThan(0)
    expect((mocks.appointmentInserts[0] as { tenant_id: string }).tenant_id).toBe(CALLER_TENANT)
  })

  it('edit denial for expired entity happens before business mutation even when body tenant is writable', async () => {
    mocks.requireAdminProfile.mockResolvedValue({
      id: STAFF,
      tenant_id: EXPIRED_TENANT,
      role: 'staff',
      email: 'staff-expired@example.com',
      auth_user_id: 'auth-expired',
    })
    mocks.getSupabaseAdmin.mockReturnValue(
      createClient({
        tenants: [writableSnap(CALLER_TENANT), expiredTrialSnap(EXPIRED_TENANT)],
        appointment: existingAppt(EXPIRED_TENANT),
      }),
    )
    // Attacker tries to redirect subscription check via writable body tenant.
    mocks.readBody.mockResolvedValue(editBody(CALLER_TENANT))

    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'Access denied: tenant transfer not allowed',
    })
    expect(mocks.appointmentUpdates).toEqual([])
  })
})
