/**
 * Representative HTTP-boundary coverage for PR-A SaaS write guard.
 * Uses mocked tenant snapshots — not production evidence.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  enqueueStaffAvailabilityRecalc: vi.fn(async () => undefined),
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

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/queue-availability-recalc', () => ({
  enqueueStaffAvailabilityRecalc: mocks.enqueueStaffAvailabilityRecalc,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const TENANT = '11111111-1111-1111-1111-111111111111'
const OTHER = '22222222-2222-2222-2222-222222222222'
const STAFF = '44444444-4444-4444-4444-444444444444'
const NOW = new Date('2026-06-15T12:00:00.000Z')
const FUTURE = '2026-07-01T00:00:00.000Z'
const PAST = '2026-05-01T00:00:00.000Z'

function tenantChain(row: Record<string, unknown> | null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error }),
  }
}

function createAdminClient(opts: {
  tenantRow?: Record<string, unknown> | null
  tenantError?: unknown
  staffOk?: boolean
}) {
  const tenantRow =
    opts.tenantRow === undefined
      ? {
          is_trial: false,
          trial_ends_at: null,
          subscription_plan: 'starter',
          current_period_end: FUTURE,
          website_only: false,
        }
      : opts.tenantRow

  return {
    from(table: string) {
      if (table === 'tenants') {
        return tenantChain(tenantRow, opts.tenantError ?? null)
      }
      if (table === 'users') {
        const chain: Record<string, unknown> = {}
        chain.select = () => chain
        chain.eq = () => chain
        chain.single = async () =>
          opts.staffOk === false
            ? { data: null, error: { message: 'missing' } }
            : { data: { id: STAFF, weekly_contracted_hours: 40 }, error: null }
        return chain
      }
      if (table === 'event_types') {
        const chain: Record<string, unknown> = {}
        chain.select = () => chain
        chain.eq = () => chain
        chain.or = () => chain
        chain.order = () => chain
        chain.limit = () => chain
        chain.maybeSingle = async () => ({ data: { id: 'evt-vac', name: 'Vacation' }, error: null })
        return chain
      }
      if (table === 'appointments') {
        const chain: Record<string, unknown> = {}
        chain.insert = (payload: unknown) => {
          mocks.appointmentInserts.push(payload)
          return chain
        }
        chain.select = () => chain
        // thenable for await supabase.from(...).insert(...)
        chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve({ data: [{ id: 'new-1' }], error: null }).then(resolve, reject)
        return chain
      }
      const empty: Record<string, unknown> = {}
      empty.select = () => empty
      empty.eq = () => empty
      empty.single = async () => ({ data: null, error: null })
      empty.maybeSingle = async () => ({ data: null, error: null })
      return empty
    },
  }
}

type Handler = (event: object) => Promise<unknown>

describe('POST /api/appointments/create-vacation-range SaaS write guard', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.getAuthenticatedUser.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.enqueueStaffAvailabilityRecalc.mockClear()
    mocks.appointmentInserts.length = 0
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function loadHandler(): Promise<Handler> {
    return (await import('../../api/appointments/create-vacation-range.post'))
      .default as Handler
  }

  it('allows active tenant mutation and reaches appointment insert', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      id: 'auth-1',
      tenant_id: TENANT,
    })
    mocks.readBody.mockResolvedValue({
      startDate: '2026-06-16',
      endDate: '2026-06-16',
      staffId: STAFF,
    })
    mocks.getSupabaseAdmin.mockReturnValue(createAdminClient({}))

    const handler = await loadHandler()
    const result = (await handler({})) as { success?: boolean; created?: number }
    expect(result.success).toBe(true)
    expect(result.created).toBeGreaterThan(0)
    expect(mocks.appointmentInserts.length).toBeGreaterThan(0)
  })

  it('denies expired-trial tenant before any appointment write', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      id: 'auth-1',
      tenant_id: TENANT,
    })
    mocks.readBody.mockResolvedValue({
      startDate: '2026-06-16',
      endDate: '2026-06-16',
      staffId: STAFF,
    })
    mocks.getSupabaseAdmin.mockReturnValue(
      createAdminClient({
        tenantRow: {
          is_trial: true,
          trial_ends_at: PAST,
          subscription_plan: 'trial',
          current_period_end: null,
          website_only: false,
        },
      }),
    )

    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 402,
      data: { code: 'saas_subscription_required', reason: 'trial_expired' },
    })
    expect(mocks.appointmentInserts).toEqual([])
  })

  it('denies lapsed-paid tenant before any appointment write', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      id: 'auth-1',
      tenant_id: TENANT,
    })
    mocks.readBody.mockResolvedValue({
      startDate: '2026-06-16',
      endDate: '2026-06-16',
      staffId: STAFF,
    })
    mocks.getSupabaseAdmin.mockReturnValue(
      createAdminClient({
        tenantRow: {
          is_trial: false,
          trial_ends_at: null,
          subscription_plan: 'starter',
          current_period_end: PAST,
          website_only: false,
        },
      }),
    )

    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 402,
      data: { code: 'saas_subscription_required', reason: 'paid_period_lapsed' },
    })
    expect(mocks.appointmentInserts).toEqual([])
  })

  it('fails closed on subscription lookup error without writes', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      id: 'auth-1',
      tenant_id: TENANT,
    })
    mocks.readBody.mockResolvedValue({
      startDate: '2026-06-16',
      endDate: '2026-06-16',
      staffId: STAFF,
    })
    mocks.getSupabaseAdmin.mockReturnValue(
      createAdminClient({
        tenantRow: null,
        tenantError: { code: 'XX000', message: 'db unavailable' },
      }),
    )

    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 503,
      data: { code: 'saas_subscription_lookup_failed' },
    })
    expect(mocks.appointmentInserts).toEqual([])
  })

  it('retains auth rejection when tenant_id is missing (no write)', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      id: 'auth-1',
      tenant_id: null,
    })
    mocks.readBody.mockResolvedValue({
      startDate: '2026-06-16',
      endDate: '2026-06-16',
      staffId: STAFF,
    })
    mocks.getSupabaseAdmin.mockReturnValue(createAdminClient({}))

    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.appointmentInserts).toEqual([])
  })
})

describe('authorization order: subscription after tenant ownership', () => {
  it('delete.post asserts subscription only after same-tenant authorization', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const src = readFileSync(
      resolve(process.cwd(), 'server/api/appointments/delete.post.ts'),
      'utf8',
    )
    const authIdx = src.indexOf('Unauthorized to delete this appointment')
    const guardIdx = src.indexOf('await assertTenantSubscriptionWritable')
    const deleteIdx = src.indexOf(".from('appointments')\n      .delete()")
    expect(authIdx).toBeGreaterThan(-1)
    expect(guardIdx).toBeGreaterThan(authIdx)
    expect(deleteIdx).toBeGreaterThan(guardIdx)
  })

  it('save.post validates tenant isolation before subscription assert', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const src = readFileSync(
      resolve(process.cwd(), 'server/api/appointments/save.post.ts'),
      'utf8',
    )
    const isolationIdx = src.indexOf('SaaS write gate')
    const guardIdx = src.indexOf('await assertTenantSubscriptionWritable')
    expect(isolationIdx).toBeGreaterThan(-1)
    expect(guardIdx).toBeGreaterThan(isolationIdx)
    void OTHER
  })
})
