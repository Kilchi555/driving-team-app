/**
 * P1-04 working-hours API authorization.
 * Service-role mutations run only after authorizeWorkingHoursMutation.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createError } from 'h3'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  requireTenantStaff: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  enqueueStaffAvailabilityRecalc: vi.fn(async () => undefined),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/require-tenant-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/require-tenant-auth')>()
  return {
    ...actual,
    requireTenantStaff: mocks.requireTenantStaff,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/queue-availability-recalc', () => ({
  enqueueStaffAvailabilityRecalc: mocks.enqueueStaffAvailabilityRecalc,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

type EventHandler = (event: object) => Promise<unknown>

const staffA = {
  id: 'staff-a',
  tenant_id: 'tenant-a',
  role: 'staff',
  email: 'a@example.com',
  auth_user_id: 'auth-a',
}

const adminA = {
  ...staffA,
  id: 'admin-a',
  role: 'admin',
  auth_user_id: 'auth-admin',
}

function thenable(result: { data: unknown; error: unknown }) {
  const builder: {
    select: ReturnType<typeof vi.fn>
    insert: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>
  } = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  return builder
}

function staffRow(id: string, tenantId = 'tenant-a', role = 'staff') {
  return { id, tenant_id: tenantId, role, is_active: true, deleted_at: null }
}

function adminClient(lookup: { data: unknown; error: unknown }, hoursCalls: string[]) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'users') return thenable(lookup)
      hoursCalls.push(table)
      return thenable({ data: [{ id: 'wh-1' }], error: null })
    }),
  }
}

describe('staff working-hours API ownership', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.requireTenantStaff.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.enqueueStaffAvailabilityRecalc.mockClear()
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/staff/working-hours.post')).default as EventHandler
  }

  const saveOwn = {
    action: 'save',
    staffId: 'staff-a',
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '12:00',
    isActive: true,
  }

  it('allows staff A to save their own hours', async () => {
    const hoursCalls: string[] = []
    mocks.requireTenantStaff.mockResolvedValue(staffA)
    mocks.readBody.mockResolvedValue(saveOwn)
    mocks.getSupabaseAdmin.mockReturnValue(
      adminClient({ data: staffRow('staff-a'), error: null }, hoursCalls),
    )
    const result = await (await handler())({}) as { success: boolean }
    expect(result.success).toBe(true)
    expect(hoursCalls).toContain('staff_working_hours')
  })

  it('denies staff A saving hours for staff B in the same tenant', async () => {
    const hoursCalls: string[] = []
    mocks.requireTenantStaff.mockResolvedValue(staffA)
    mocks.readBody.mockResolvedValue({ ...saveOwn, staffId: 'staff-b' })
    mocks.getSupabaseAdmin.mockReturnValue(
      adminClient({ data: staffRow('staff-b'), error: null }, hoursCalls),
    )
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(hoursCalls).toEqual([])
  })

  it('denies staff A saving hours for a staff member in another tenant', async () => {
    const hoursCalls: string[] = []
    mocks.requireTenantStaff.mockResolvedValue(staffA)
    mocks.readBody.mockResolvedValue({ ...saveOwn, staffId: 'staff-other' })
    mocks.getSupabaseAdmin.mockReturnValue(
      adminClient({ data: null, error: null }, hoursCalls),
    )
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(hoursCalls).toEqual([])
  })

  it('allows a tenant admin to save hours for staff B in the same tenant', async () => {
    const hoursCalls: string[] = []
    mocks.requireTenantStaff.mockResolvedValue(adminA)
    mocks.readBody.mockResolvedValue({ ...saveOwn, staffId: 'staff-b' })
    mocks.getSupabaseAdmin.mockReturnValue(
      adminClient({ data: staffRow('staff-b'), error: null }, hoursCalls),
    )
    const result = await (await handler())({}) as { success: boolean }
    expect(result.success).toBe(true)
    expect(hoursCalls).toContain('staff_working_hours')
  })

  it('denies a tenant admin targeting staff in another tenant', async () => {
    const hoursCalls: string[] = []
    mocks.requireTenantStaff.mockResolvedValue(adminA)
    mocks.readBody.mockResolvedValue({ ...saveOwn, staffId: 'staff-other' })
    mocks.getSupabaseAdmin.mockReturnValue(
      adminClient({ data: null, error: null }, hoursCalls),
    )
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(hoursCalls).toEqual([])
  })

  it('denies clients before any working-hours mutation', async () => {
    mocks.requireTenantStaff.mockRejectedValue(
      createError({ statusCode: 403, statusMessage: 'Forbidden' }),
    )
    mocks.readBody.mockResolvedValue({ ...saveOwn, staffId: 'client-1' })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })
})
