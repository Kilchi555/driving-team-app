/**
 * Authorization for date-specific working-hour exceptions.
 * Service-role writes run only after authorizeWorkingHoursMutation.
 * body.tenant_id is never the tenant that is written.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

function builder(result: { data: unknown; error: unknown }) {
  const query: {
    select: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    gte: ReturnType<typeof vi.fn>
    lte: ReturnType<typeof vi.fn>
    in: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>
  } = {
    select: vi.fn(() => query),
    delete: vi.fn(() => query),
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  return query
}

function staffRow(id: string, tenantId = 'tenant-a', role = 'staff') {
  return { id, tenant_id: tenantId, role, is_active: true, deleted_at: null }
}

function adminClient(lookup: { data: unknown; error: unknown }) {
  const tables: string[] = []
  const rpc = vi.fn(async () => ({ data: 1, error: null }))
  return {
    tables,
    rpc,
    client: {
      from: vi.fn((table: string) => {
        tables.push(table)
        if (table === 'users') return builder(lookup)
        return builder({ data: [], error: null })
      }),
      rpc,
    },
  }
}

describe('working-hour exception API authorization', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.requireTenantStaff.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.enqueueStaffAvailabilityRecalc.mockClear()
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/staff/working-hour-exceptions.post')).default as EventHandler
  }

  const openMonday = {
    action: 'upsert' as const,
    staffId: 'staff-a',
    date: '2099-01-05',
    isClosed: false,
    blocks: [{ start_time: '10:00', end_time: '12:00' }],
    tenant_id: 'tenant-b',
  }

  it('lets staff A replace their own day and ignores body.tenant_id', async () => {
    const db = adminClient({ data: staffRow('staff-a'), error: null })
    mocks.requireTenantStaff.mockResolvedValue(staffA)
    mocks.readBody.mockResolvedValue(openMonday)
    mocks.getSupabaseAdmin.mockReturnValue(db.client)

    const result = await (await handler())({}) as { success: boolean }
    expect(result.success).toBe(true)
    expect(db.rpc).toHaveBeenCalledWith('replace_staff_working_hour_exceptions', expect.objectContaining({
      p_tenant_id: 'tenant-a',
      p_staff_id: 'staff-a',
    }))
    expect(db.tables).not.toContain('staff_working_hours')
    expect(db.tables).not.toContain('appointments')
    expect(mocks.enqueueStaffAvailabilityRecalc).toHaveBeenCalledWith({
      staff_id: 'staff-a',
      tenant_id: 'tenant-a',
      trigger: 'working_hours',
    })
  })

  it('denies staff A writing staff B, including another tenant', async () => {
    const sameTenant = adminClient({ data: staffRow('staff-b'), error: null })
    mocks.requireTenantStaff.mockResolvedValue(staffA)
    mocks.readBody.mockResolvedValue({ ...openMonday, staffId: 'staff-b' })
    mocks.getSupabaseAdmin.mockReturnValue(sameTenant.client)
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(sameTenant.rpc).not.toHaveBeenCalled()
    expect(mocks.enqueueStaffAvailabilityRecalc).not.toHaveBeenCalled()

    const otherTenant = adminClient({ data: null, error: null })
    mocks.readBody.mockResolvedValue({ ...openMonday, staffId: 'staff-other' })
    mocks.getSupabaseAdmin.mockReturnValue(otherTenant.client)
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(otherTenant.rpc).not.toHaveBeenCalled()
  })

  it('lets a tenant admin write staff in the same tenant and denies another tenant', async () => {
    const allowed = adminClient({ data: staffRow('staff-b'), error: null })
    mocks.requireTenantStaff.mockResolvedValue(adminA)
    mocks.readBody.mockResolvedValue({ ...openMonday, staffId: 'staff-b' })
    mocks.getSupabaseAdmin.mockReturnValue(allowed.client)
    const result = await (await handler())({}) as { success: boolean }
    expect(result.success).toBe(true)
    expect(allowed.rpc).toHaveBeenCalledWith('replace_staff_working_hour_exceptions', expect.objectContaining({
      p_tenant_id: 'tenant-a',
      p_staff_id: 'staff-b',
    }))

    const denied = adminClient({ data: null, error: null })
    mocks.readBody.mockResolvedValue({ ...openMonday, staffId: 'staff-other' })
    mocks.getSupabaseAdmin.mockReturnValue(denied.client)
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(denied.rpc).not.toHaveBeenCalled()
  })

  it('rejects anonymous and client callers before any database access', async () => {
    mocks.requireTenantStaff.mockRejectedValue(createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
    mocks.readBody.mockResolvedValue(openMonday)
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
    expect(mocks.enqueueStaffAvailabilityRecalc).not.toHaveBeenCalled()
  })

  it('does not save or queue when one date in upsert_many is invalid', async () => {
    const db = adminClient({ data: staffRow('staff-a'), error: null })
    mocks.requireTenantStaff.mockResolvedValue(staffA)
    mocks.readBody.mockResolvedValue({
      action: 'upsert_many',
      staffId: 'staff-a',
      tenant_id: 'tenant-b',
      days: [
        { date: '2099-01-05', isClosed: false, blocks: [{ start_time: '10:00', end_time: '12:00' }] },
        { date: '2099-01-06', isClosed: true, blocks: [{ start_time: '08:00', end_time: '09:00' }] },
      ],
    })
    mocks.getSupabaseAdmin.mockReturnValue(db.client)

    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 400 })
    expect(db.rpc).not.toHaveBeenCalled()
    expect(mocks.enqueueStaffAvailabilityRecalc).not.toHaveBeenCalled()
    expect(db.tables).not.toContain('staff_working_hour_exceptions')
  })

  it('lists only through the actor tenant and staff id', async () => {
    const db = adminClient({ data: staffRow('staff-a'), error: null })
    mocks.requireTenantStaff.mockResolvedValue(staffA)
    mocks.readBody.mockResolvedValue({
      action: 'list',
      staffId: 'staff-a',
      startDate: '2099-01-05',
      endDate: '2099-01-18',
      tenant_id: 'tenant-b',
    })
    mocks.getSupabaseAdmin.mockReturnValue(db.client)

    const result = await (await handler())({}) as { success: boolean; exceptions: unknown[] }
    expect(result.success).toBe(true)
    expect(result.exceptions).toEqual([])
    expect(db.tables).toContain('staff_working_hour_exceptions')
    expect(db.rpc).not.toHaveBeenCalled()
    expect(mocks.enqueueStaffAvailabilityRecalc).not.toHaveBeenCalled()
  })

  it('rejects deleting a past date and deletes a future date when authorized', async () => {
    const past = adminClient({ data: staffRow('staff-a'), error: null })
    mocks.requireTenantStaff.mockResolvedValue(staffA)
    mocks.readBody.mockResolvedValue({
      action: 'delete',
      staffId: 'staff-a',
      date: '2000-01-01',
      tenant_id: 'tenant-b',
    })
    mocks.getSupabaseAdmin.mockReturnValue(past.client)
    await expect((await handler())({})).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Date is before today in Europe/Zurich',
    })
    expect(past.tables).not.toContain('staff_working_hour_exceptions')
    expect(mocks.enqueueStaffAvailabilityRecalc).not.toHaveBeenCalled()

    const future = adminClient({ data: staffRow('staff-a'), error: null })
    mocks.readBody.mockResolvedValue({
      action: 'delete',
      staffId: 'staff-a',
      date: '2099-01-05',
      tenant_id: 'tenant-b',
    })
    mocks.getSupabaseAdmin.mockReturnValue(future.client)
    const restored = await (await handler())({}) as { success: boolean }
    expect(restored.success).toBe(true)
    expect(future.tables).toContain('staff_working_hour_exceptions')
    expect(future.client.from).toHaveBeenCalledWith('staff_working_hour_exceptions')
    expect(mocks.enqueueStaffAvailabilityRecalc).toHaveBeenCalledWith({
      staff_id: 'staff-a',
      tenant_id: 'tenant-a',
      trigger: 'working_hours',
    })

    const denied = adminClient({ data: staffRow('staff-b'), error: null })
    mocks.enqueueStaffAvailabilityRecalc.mockClear()
    mocks.readBody.mockResolvedValue({
      action: 'delete',
      staffId: 'staff-b',
      date: '2099-01-05',
    })
    mocks.getSupabaseAdmin.mockReturnValue(denied.client)
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(denied.tables).not.toContain('staff_working_hour_exceptions')
    expect(mocks.enqueueStaffAvailabilityRecalc).not.toHaveBeenCalled()
  })

  it('lists every interval of one exception and leaves a closed day without blocks', async () => {
    const tables: string[] = []
    const filters: Array<{ column: string; value: unknown }> = []
    function query(result: { data: unknown; error: unknown }) {
      const chain: {
        select: ReturnType<typeof vi.fn>
        eq: ReturnType<typeof vi.fn>
        gte: ReturnType<typeof vi.fn>
        lte: ReturnType<typeof vi.fn>
        in: ReturnType<typeof vi.fn>
        order: ReturnType<typeof vi.fn>
        maybeSingle: ReturnType<typeof vi.fn>
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>
      } = {
        select: vi.fn(() => chain),
        eq: vi.fn((column: string, value: unknown) => {
          filters.push({ column, value })
          return chain
        }),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        in: vi.fn((column: string, value: unknown) => {
          filters.push({ column, value })
          return chain
        }),
        order: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => result),
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
      }
      return chain
    }

    const client = {
      from: vi.fn((table: string) => {
        tables.push(table)
        if (table === 'users') return query({ data: staffRow('staff-a'), error: null })
        if (table === 'staff_working_hour_exceptions') {
          return query({
            data: [
              { id: 'open-day', exception_date: '2099-01-05', is_closed: false, timezone: 'Europe/Zurich' },
              { id: 'closed-day', exception_date: '2099-01-06', is_closed: true, timezone: 'Europe/Zurich' },
            ],
            error: null,
          })
        }
        return query({
          data: [
            { exception_id: 'open-day', start_time: '15:00:00', end_time: '18:00:00' },
            { exception_id: 'open-day', start_time: '08:00:00', end_time: '10:00:00' },
            { exception_id: 'open-day', start_time: '11:00:00', end_time: '14:00:00' },
            { exception_id: 'other-staff', start_time: '09:00:00', end_time: '10:00:00' },
          ],
          error: null,
        })
      }),
      rpc: vi.fn(),
    }

    mocks.requireTenantStaff.mockResolvedValue(staffA)
    mocks.readBody.mockResolvedValue({
      action: 'list',
      staffId: 'staff-a',
      startDate: '2099-01-05',
      endDate: '2099-01-06',
      tenant_id: 'tenant-b',
    })
    mocks.getSupabaseAdmin.mockReturnValue(client)

    const result = await (await handler())({}) as {
      exceptions: Array<{ date: string; isClosed: boolean; blocks: Array<{ start_time: string; end_time: string }> }>
    }
    const open = result.exceptions.find((row) => row.date === '2099-01-05')
    const closed = result.exceptions.find((row) => row.date === '2099-01-06')
    expect(open?.blocks).toEqual([
      { start_time: '08:00', end_time: '10:00' },
      { start_time: '11:00', end_time: '14:00' },
      { start_time: '15:00', end_time: '18:00' },
    ])
    expect(closed).toMatchObject({ isClosed: true, blocks: [] })
    expect(filters).toContainEqual({ column: 'tenant_id', value: 'tenant-a' })
    expect(filters).toContainEqual({ column: 'staff_id', value: 'staff-a' })
    expect(filters.some((filter) => filter.column === 'tenant_id' && filter.value === 'tenant-b')).toBe(false)
    expect(client.rpc).not.toHaveBeenCalled()
    expect(tables).not.toContain('staff_working_hours')
  })

  it('does not reference weekly hours or appointments in the handler source', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'server/api/staff/working-hour-exceptions.post.ts'),
      'utf8',
    )
    expect(source).not.toContain(".from('staff_working_hours')")
    expect(source).not.toContain(".from('appointments')")
    expect(source).toContain('actor.tenant_id')
    expect(source).toContain("trigger: 'working_hours'")
  })
})
