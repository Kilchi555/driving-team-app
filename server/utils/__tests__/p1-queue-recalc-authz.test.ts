import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createError } from 'h3'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  requireStaffOrInternal: vi.fn(),
  loadStaffInTenant: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/require-staff-or-internal', () => ({
  requireStaffOrInternal: mocks.requireStaffOrInternal,
  internalSecretHeaders: () => ({ 'x-internal-secret': 'test-secret' }),
}))

vi.mock('~/server/utils/require-tenant-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/require-tenant-auth')>()
  return {
    ...actual,
    loadStaffInTenant: mocks.loadStaffInTenant,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

type EventHandler = (event: object) => Promise<unknown>

const staffActor = {
  id: 'staff-a',
  tenant_id: 'tenant-a',
  role: 'staff',
  email: 'staff@example.com',
  auth_user_id: 'auth-staff-a',
}

function queueClient() {
  return {
    from: vi.fn(() => ({
      upsert: vi.fn(async () => ({ data: null, error: null })),
    })),
  }
}

describe('queue-recalc authorization', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.requireStaffOrInternal.mockReset()
    mocks.loadStaffInTenant.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    delete process.env.CRON_SECRET
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/availability/queue-recalc.post')).default as EventHandler
  }

  it('returns 401 for anonymous callers before reading the body', async () => {
    mocks.requireStaffOrInternal.mockRejectedValue(
      createError({ statusCode: 401, statusMessage: 'Unauthorized' }),
    )
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.readBody).not.toHaveBeenCalled()
  })

  it('rejects a wrong or missing internal secret when there is no staff session', async () => {
    mocks.requireStaffOrInternal.mockRejectedValue(
      createError({ statusCode: 401, statusMessage: 'Unauthorized' }),
    )
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
  })

  it('ignores a spoofed body.tenant_id for staff and binds the session tenant', async () => {
    mocks.requireStaffOrInternal.mockResolvedValue({ mode: 'staff', profile: staffActor })
    mocks.readBody.mockResolvedValue({
      staff_id: 'staff-a',
      tenant_id: 'tenant-b',
      trigger: 'appointment',
    })
    mocks.loadStaffInTenant.mockResolvedValue({ id: 'staff-a', tenant_id: 'tenant-a', role: 'staff' })
    const upsert = vi.fn(async () => ({ data: null, error: null }))
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({ upsert })),
    })

    const result = await (await handler())({}) as { queued: { tenant_id: string } }
    expect(mocks.loadStaffInTenant).toHaveBeenCalledWith(expect.anything(), 'staff-a', 'tenant-a')
    expect(result.queued.tenant_id).toBe('tenant-a')
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: 'tenant-a', staff_id: 'staff-a' }),
      expect.anything(),
    )
  })

  it('rejects spoofed staff_id outside the session tenant', async () => {
    mocks.requireStaffOrInternal.mockResolvedValue({ mode: 'staff', profile: staffActor })
    mocks.readBody.mockResolvedValue({
      staff_id: 'staff-other',
      tenant_id: 'tenant-a',
      trigger: 'appointment',
    })
    mocks.loadStaffInTenant.mockRejectedValue(createError({ statusCode: 403, statusMessage: 'Forbidden' }))
    mocks.getSupabaseAdmin.mockReturnValue(queueClient())
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects staff enqueueing another instructor in the same tenant', async () => {
    mocks.requireStaffOrInternal.mockResolvedValue({ mode: 'staff', profile: staffActor })
    mocks.readBody.mockResolvedValue({
      staff_id: 'staff-b',
      tenant_id: 'tenant-a',
      trigger: 'appointment',
    })
    mocks.loadStaffInTenant.mockResolvedValue({ id: 'staff-b', tenant_id: 'tenant-a', role: 'staff' })
    mocks.getSupabaseAdmin.mockReturnValue(queueClient())
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects a forged x-vercel-cron header without staff session or internal secret', async () => {
    mocks.requireStaffOrInternal.mockRejectedValue(
      createError({ statusCode: 401, statusMessage: 'Unauthorized' }),
    )
    await expect((await handler())({ headers: { 'x-vercel-cron': '1' } })).rejects.toMatchObject({
      statusCode: 401,
    })
    expect(mocks.readBody).not.toHaveBeenCalled()
  })

  it('allows an internal secret caller after verifying staff belongs to the tenant', async () => {
    mocks.requireStaffOrInternal.mockResolvedValue({ mode: 'internal', profile: null })
    mocks.readBody.mockResolvedValue({
      staff_id: 'staff-a',
      tenant_id: 'tenant-a',
      trigger: 'working_hours',
    })
    mocks.loadStaffInTenant.mockResolvedValue({ id: 'staff-a', tenant_id: 'tenant-a', role: 'staff' })
    const upsert = vi.fn(async () => ({ data: null, error: null }))
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({ upsert })),
    })
    const result = await (await handler())({}) as { success: boolean }
    expect(result.success).toBe(true)
    expect(mocks.loadStaffInTenant).toHaveBeenCalledWith(expect.anything(), 'staff-a', 'tenant-a')
  })
})
