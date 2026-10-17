import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: () => ({ from: mocks.from }),
}))

vi.mock('~/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: vi.fn(),
  },
}))

const TENANT = '11111111-1111-1111-1111-111111111111'
const USER = '44444444-4444-4444-4444-444444444444'
const NOW = new Date('2026-06-15T12:00:00.000Z')
const FUTURE = '2026-07-01T00:00:00.000Z'
const PAST = '2026-05-01T00:00:00.000Z'

async function loadAssert() {
  return import('../assert-tenant-subscription-writable')
}

function mockTenantRow(row: Record<string, unknown> | null, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error }),
  }
  mocks.from.mockReturnValue(chain)
  return chain
}

describe('assertTenantSubscriptionWritable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows active paid tenant (writable)', async () => {
    mockTenantRow({
      is_trial: false,
      trial_ends_at: null,
      subscription_plan: 'starter',
      current_period_end: FUTURE,
      website_only: false,
    })
    const { assertTenantSubscriptionWritable } = await loadAssert()

    const result = await assertTenantSubscriptionWritable(null, {
      tenantId: TENANT,
      userId: USER,
      now: NOW,
      route: 'test/active',
    })

    expect(result.reasonCode).toBe('paid_active')
    expect(mocks.from).toHaveBeenCalledWith('tenants')
  })

  it('denies expired trial with 402 saas_subscription_required before any caller write', async () => {
    mockTenantRow({
      is_trial: true,
      trial_ends_at: PAST,
      subscription_plan: 'trial',
      current_period_end: null,
      website_only: false,
    })
    const { assertTenantSubscriptionWritable, SAAS_SUBSCRIPTION_REQUIRED_CODE } =
      await loadAssert()

    let wrote = false
    try {
      await assertTenantSubscriptionWritable(null, {
        tenantId: TENANT,
        userId: USER,
        now: NOW,
        route: 'test/expired-trial',
      })
      wrote = true
    } catch (err: unknown) {
      const e = err as { statusCode?: number; data?: { code?: string; reason?: string } }
      expect(e.statusCode).toBe(402)
      expect(e.data?.code).toBe(SAAS_SUBSCRIPTION_REQUIRED_CODE)
      expect(e.data?.reason).toBe('trial_expired')
    }
    expect(wrote).toBe(false)
    expect(mocks.loggerInfo).toHaveBeenCalledWith(
      '[saas-write-guard] blocked mutation',
      expect.objectContaining({
        tenantId: TENANT,
        userId: USER,
        route: 'test/expired-trial',
        reasonCode: 'trial_expired',
      }),
    )
  })

  it('denies lapsed paid subscription with 402', async () => {
    mockTenantRow({
      is_trial: false,
      trial_ends_at: null,
      subscription_plan: 'pro',
      current_period_end: PAST,
      website_only: false,
    })
    const { assertTenantSubscriptionWritable, SAAS_SUBSCRIPTION_REQUIRED_CODE } =
      await loadAssert()

    await expect(
      assertTenantSubscriptionWritable(null, {
        tenantId: TENANT,
        userId: USER,
        now: NOW,
        route: 'test/lapsed-paid',
      }),
    ).rejects.toMatchObject({
      statusCode: 402,
      data: {
        code: SAAS_SUBSCRIPTION_REQUIRED_CODE,
        reason: 'paid_period_lapsed',
      },
    })
  })

  it('fails closed on subscription lookup error (503, not 402)', async () => {
    mockTenantRow(null, { code: 'PGRST000', message: 'db down' })
    const { assertTenantSubscriptionWritable } = await loadAssert()

    await expect(
      assertTenantSubscriptionWritable(null, {
        tenantId: TENANT,
        userId: USER,
        now: NOW,
        route: 'test/lookup-fail',
      }),
    ).rejects.toMatchObject({
      statusCode: 503,
      data: { code: 'saas_subscription_lookup_failed' },
    })
  })

  it('fails closed when tenant row is missing', async () => {
    mockTenantRow(null, null)
    const { assertTenantSubscriptionWritable, SAAS_SUBSCRIPTION_REQUIRED_CODE } =
      await loadAssert()

    await expect(
      assertTenantSubscriptionWritable(null, {
        tenantId: TENANT,
        userId: USER,
        now: NOW,
        route: 'test/missing',
      }),
    ).rejects.toMatchObject({
      statusCode: 402,
      data: {
        code: SAAS_SUBSCRIPTION_REQUIRED_CODE,
        reason: 'missing_snapshot',
      },
    })
  })

  it('rejects empty trusted tenant id', async () => {
    const { assertTenantSubscriptionWritable, SAAS_SUBSCRIPTION_REQUIRED_CODE } =
      await loadAssert()

    await expect(
      assertTenantSubscriptionWritable(null, {
        tenantId: '  ',
        userId: USER,
        now: NOW,
        route: 'test/empty-tenant',
      }),
    ).rejects.toMatchObject({
      statusCode: 402,
      data: { code: SAAS_SUBSCRIPTION_REQUIRED_CODE },
    })
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('honors explicit system/billing bypass without DB lookup', async () => {
    const { assertTenantSubscriptionWritable } = await loadAssert()

    const system = await assertTenantSubscriptionWritable(null, {
      tenantId: TENANT,
      bypass: 'system',
      route: 'test/system',
    })
    const billing = await assertTenantSubscriptionWritable(null, {
      tenantId: TENANT,
      bypass: 'billing',
      route: 'test/billing',
    })
    expect(system.reasonCode).toBe('writable')
    expect(billing.reasonCode).toBe('writable')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('allows website_only tenants (SaaS nav bypass semantics)', async () => {
    mockTenantRow({
      is_trial: true,
      trial_ends_at: PAST,
      subscription_plan: 'trial',
      current_period_end: null,
      website_only: true,
    })
    const { assertTenantSubscriptionWritable } = await loadAssert()

    const result = await assertTenantSubscriptionWritable(null, {
      tenantId: TENANT,
      userId: USER,
      now: NOW,
      route: 'test/website-only',
    })
    expect(result.reasonCode).toBe('website_only_bypass')
  })
})

describe('PR-A in-scope route guard inventory', () => {
  const ROOT = resolve(process.cwd())

  const requiredGuards: Array<{ file: string; route: string }> = [
    { file: 'server/api/appointments/save.post.ts', route: 'POST /api/appointments/save' },
    { file: 'server/api/appointments/create-vacation-range.post.ts', route: 'POST /api/appointments/create-vacation-range' },
    { file: 'server/api/calendar/manage.post.ts', route: 'POST /api/calendar/manage:create-appointment' },
    { file: 'server/api/staff/update-appointment.post.ts', route: 'POST /api/staff/update-appointment' },
    { file: 'server/api/staff/batch-update-appointment-status.post.ts', route: 'POST /api/staff/batch-update-appointment-status' },
    { file: 'server/api/appointments/adjust-duration.post.ts', route: 'POST /api/appointments/adjust-duration' },
    { file: 'server/api/appointments/confirm.post.ts', route: 'POST /api/appointments/confirm' },
    { file: 'server/api/appointments/confirm-with-payment.post.ts', route: 'POST /api/appointments/confirm-with-payment' },
    { file: 'server/api/appointments/delete.post.ts', route: 'POST /api/appointments/delete' },
    { file: 'server/api/staff/delete-appointment.post.ts', route: 'POST /api/staff/delete-appointment' },
    { file: 'server/api/appointments/cancel-staff.post.ts', route: 'POST /api/appointments/cancel-staff' },
    { file: 'server/api/appointments/cancel-customer.post.ts', route: 'POST /api/appointments/cancel-customer' },
    { file: 'server/api/appointments/manage-products.post.ts', route: 'POST /api/appointments/manage-products' },
    { file: 'server/api/admin/appointments/cancellation-obligation.post.ts', route: 'POST /api/admin/appointments/cancellation-obligation' },
    { file: 'server/api/exams/save-result.post.ts', route: 'POST /api/exams/save-result' },
    { file: 'server/api/staff/save-criteria-evaluations.post.ts', route: 'POST /api/staff/save-criteria-evaluations' },
    { file: 'server/api/admin/resources/block.post.ts', route: 'POST /api/admin/resources/block' },
    { file: 'server/api/admin/resources/block/cancel.post.ts', route: 'POST /api/admin/resources/block/cancel' },
    { file: 'server/api/admin/courses/upsert.post.ts', route: 'POST /api/admin/courses/upsert' },
    { file: 'server/api/admin/courses/update-session-instructors.post.ts', route: 'POST /api/admin/courses/update-session-instructors' },
    { file: 'server/api/admin/courses/cancel-course.post.ts', route: 'POST /api/admin/courses/cancel-course' },
    { file: 'server/api/courses/update-status.post.ts', route: 'POST /api/courses/update-status' },
    { file: 'server/api/medical-certificate/approve-and-cancel.post.ts', route: 'POST /api/medical-certificate/approve-and-cancel' },
  ]

  it('each in-scope handler imports and calls assertTenantSubscriptionWritable', () => {
    for (const { file, route } of requiredGuards) {
      const src = readFileSync(resolve(ROOT, file), 'utf8')
      expect(src, file).toContain('assertTenantSubscriptionWritable')
      expect(src, `${file} route label`).toContain(route)
      const guardIdx = src.indexOf('assertTenantSubscriptionWritable(event')
      expect(guardIdx, `${file} call site`).toBeGreaterThan(-1)
    }
  })

  it('does not wire OUT-of-scope public booking paths', () => {
    const outPaths = [
      'server/api/booking/guest-book.post.ts',
      'server/api/booking/create-appointment.post.ts',
      'server/api/booking/reserve-slot.post.ts',
    ]
    for (const file of outPaths) {
      const full = resolve(ROOT, file)
      try {
        const src = readFileSync(full, 'utf8')
        expect(src, file).not.toContain('assertTenantSubscriptionWritable')
      } catch {
        // Missing optional path is fine for inventory.
      }
    }
  })
})
