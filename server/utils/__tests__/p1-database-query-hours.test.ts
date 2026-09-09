/**
 * /api/database/query staff_working_hours writes must not use service role
 * to bypass ownership. JWT client + authorizeWorkingHoursMutation.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getHeader: vi.fn(),
  getAuthenticatedUserWithDbId: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
    getHeader: mocks.getHeader,
  }
})

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUserWithDbId: mocks.getAuthenticatedUserWithDbId,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

vi.mock('~/server/utils/supabase-error', () => ({
  mapSupabaseError: (error: unknown) => error,
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
    maybeSingle: ReturnType<typeof vi.fn>
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>
  } = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  return builder
}

function staffRow(id: string, tenantId = 'tenant-a', role = 'staff') {
  return { id, tenant_id: tenantId, role, is_active: true, deleted_at: null }
}

describe('database/query working-hours service-role bypass', () => {
  const jwtHours: string[] = []
  const adminHours: string[] = []

  beforeEach(() => {
    vi.resetModules()
    jwtHours.length = 0
    adminHours.length = 0
    mocks.readBody.mockReset()
    mocks.getHeader.mockReset()
    mocks.getAuthenticatedUserWithDbId.mockReset()
    mocks.createClient.mockReset()
    process.env.SUPABASE_URL = 'http://supabase.test'
    process.env.SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
    mocks.getHeader.mockReturnValue('Bearer user-jwt')
  })

  function mockClients(lookup: { data: unknown; error: unknown }) {
    const jwtFrom = vi.fn((table: string) => {
      if (table === 'staff_working_hours') jwtHours.push('insert-or-write')
      return thenable({ data: [{ id: 'wh-1' }], error: null })
    })
    const adminFrom = vi.fn((table: string) => {
      if (table === 'users') return thenable(lookup)
      if (table === 'staff_working_hours') adminHours.push('service-role-write')
      return thenable({ data: [{ id: 'wh-1' }], error: null })
    })
    mocks.createClient.mockImplementation((_url: string, key: string) => {
      if (key === 'service-key') return { from: adminFrom }
      return { from: jwtFrom }
    })
    return { jwtFrom, adminFrom }
  }

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/database/query.post')).default as EventHandler
  }

  const insertOwn = {
    action: 'insert',
    table: 'staff_working_hours',
    data: {
      staff_id: 'staff-a',
      tenant_id: 'tenant-a',
      day_of_week: 1,
      start_time: '08:00',
      end_time: '12:00',
      is_active: true,
    },
  }

  it('denies anonymous callers', async () => {
    mocks.getAuthenticatedUserWithDbId.mockResolvedValue(null)
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('allows staff A to insert their own hours through the JWT client', async () => {
    mocks.getAuthenticatedUserWithDbId.mockResolvedValue(staffA)
    mocks.readBody.mockResolvedValue(insertOwn)
    mockClients({ data: staffRow('staff-a'), error: null })
    const result = await (await handler())({}) as { success: boolean }
    expect(result.success).toBe(true)
    expect(jwtHours.length).toBeGreaterThan(0)
    expect(adminHours).toEqual([])
  })

  it('denies staff A inserting hours for staff B in the same tenant', async () => {
    mocks.getAuthenticatedUserWithDbId.mockResolvedValue(staffA)
    mocks.readBody.mockResolvedValue({
      ...insertOwn,
      data: { ...insertOwn.data, staff_id: 'staff-b' },
    })
    mockClients({ data: staffRow('staff-b'), error: null })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(jwtHours).toEqual([])
    expect(adminHours).toEqual([])
  })

  it('denies staff A targeting a staff member in another tenant', async () => {
    mocks.getAuthenticatedUserWithDbId.mockResolvedValue(staffA)
    mocks.readBody.mockResolvedValue({
      ...insertOwn,
      data: { ...insertOwn.data, staff_id: 'staff-other', tenant_id: 'tenant-a' },
    })
    mockClients({ data: null, error: null })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(jwtHours).toEqual([])
    expect(adminHours).toEqual([])
  })

  it('allows a tenant admin to insert hours for staff B in the same tenant via JWT', async () => {
    mocks.getAuthenticatedUserWithDbId.mockResolvedValue(adminA)
    mocks.readBody.mockResolvedValue({
      ...insertOwn,
      data: { ...insertOwn.data, staff_id: 'staff-b' },
    })
    mockClients({ data: staffRow('staff-b'), error: null })
    const result = await (await handler())({}) as { success: boolean }
    expect(result.success).toBe(true)
    expect(jwtHours.length).toBeGreaterThan(0)
    expect(adminHours).toEqual([])
  })

  it('denies a tenant admin targeting another tenant even if body.tenant_id is forged', async () => {
    mocks.getAuthenticatedUserWithDbId.mockResolvedValue(adminA)
    mocks.readBody.mockResolvedValue({
      ...insertOwn,
      data: { ...insertOwn.data, staff_id: 'staff-other', tenant_id: 'tenant-b' },
    })
    mockClients({ data: null, error: null })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(jwtHours).toEqual([])
  })

  it('denies clients any working-hours mutation', async () => {
    mocks.getAuthenticatedUserWithDbId.mockResolvedValue({
      ...staffA,
      id: 'client-1',
      role: 'client',
    })
    mocks.readBody.mockResolvedValue(insertOwn)
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('updates working hours through the JWT client, not service role', async () => {
    mocks.getAuthenticatedUserWithDbId.mockResolvedValue(staffA)
    mocks.readBody.mockResolvedValue({
      action: 'update',
      table: 'staff_working_hours',
      data: { start_time: '09:00', staff_id: 'staff-b', tenant_id: 'tenant-b' },
      filters: [{ column: 'staff_id', operator: 'eq', value: 'staff-a' }],
    })
    const { jwtFrom, adminFrom } = mockClients({ data: staffRow('staff-a'), error: null })
    const result = await (await handler())({}) as { success: boolean }
    expect(result.success).toBe(true)
    expect(jwtFrom).toHaveBeenCalledWith('staff_working_hours')
    expect(adminFrom).not.toHaveBeenCalledWith('staff_working_hours')
  })
})
