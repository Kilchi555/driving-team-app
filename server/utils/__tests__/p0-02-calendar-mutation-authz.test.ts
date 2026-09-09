import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createError } from 'h3'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  requireTenantStaff: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  invalidateSlots: vi.fn(async () => ({ invalidatedCount: 0 })),
  releaseSlots: vi.fn(async () => ({ releasedCount: 0 })),
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

vi.mock('~/server/utils/availability-slot-manager', () => ({
  createAvailabilitySlotManager: () => ({
    invalidateSlots: mocks.invalidateSlots,
    releaseSlots: mocks.releaseSlots,
  }),
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

function thenable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.insert = vi.fn(chain)
  builder.update = vi.fn(chain)
  builder.delete = vi.fn(chain)
  builder.single = vi.fn(chain)
  builder.maybeSingle = vi.fn(async () => result)
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder as {
    eq: ReturnType<typeof vi.fn>
    insert: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
  }
}

function staffUserRow(id = 'staff-a') {
  return { id, tenant_id: 'tenant-a', role: 'staff', is_active: true, deleted_at: null }
}

const src = readFileSync(
  resolve(process.cwd(), 'server/api/staff/manage-external-busy-times.post.ts'),
  'utf8',
)

describe('P0-02 calendar mutation source contract', () => {
  it('authenticates before reading the body', () => {
    const handlerStart = src.indexOf('export default defineEventHandler')
    expect(src.indexOf('requireTenantStaff(event)', handlerStart)).toBeGreaterThan(handlerStart)
    expect(src.indexOf('readBody', handlerStart)).toBeGreaterThan(
      src.indexOf('requireTenantStaff(event)', handlerStart),
    )
  })

  it('scopes update and delete to session tenant, not id alone', () => {
    expect(src).toContain("eq('id', existing.id)")
    expect(src).toContain("eq('tenant_id', actor.tenant_id)")
    expect(src).toContain('tenant_id: actor.tenant_id')
    expect(src).toContain("const { staff_id, start_time, end_time, title, source }")
  })
})

describe('P0-02 manage-external-busy-times', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.requireTenantStaff.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.invalidateSlots.mockClear()
    mocks.releaseSlots.mockClear()
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/staff/manage-external-busy-times.post')).default as EventHandler
  }

  it('returns 401 for anonymous callers before reading the body', async () => {
    mocks.requireTenantStaff.mockRejectedValue(createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.readBody).not.toHaveBeenCalled()
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('refuses create for a staff_id outside the session tenant', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      action: 'create',
      staff_id: 'staff-b',
      start_time: '2026-09-09T08:00:00Z',
      end_time: '2026-09-09T09:00:00Z',
      tenant_id: 'tenant-b',
    })
    const from = vi.fn((table: string) => {
      if (table === 'users') return thenable({ data: null, error: null })
      throw new Error(`unexpected table ${table}`)
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(from).not.toHaveBeenCalledWith('external_busy_times')
  })

  it('inserts create rows with the session tenant, ignoring body.tenant_id', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      action: 'create',
      staff_id: 'staff-a',
      start_time: '2026-09-09T08:00:00Z',
      end_time: '2026-09-09T09:00:00Z',
      tenant_id: 'tenant-attacker',
    })
    const insertBuilder = thenable({ data: { id: 'busy-1' }, error: null })
    const from = vi.fn((table: string) => {
      if (table === 'users') return thenable({ data: staffUserRow(), error: null })
      return insertBuilder
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })
    await expect((await handler())({})).resolves.toMatchObject({
      success: true,
      data: { id: 'busy-1' },
    })
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        staff_id: 'staff-a',
        tenant_id: 'tenant-a',
      }),
    )
    expect(insertBuilder.insert).not.toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: 'tenant-attacker' }),
    )
  })

  it('returns 403 when updating a busy time that is not in the session tenant', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      action: 'update',
      id: 'busy-foreign',
      start_time: '2026-09-09T10:00:00Z',
      end_time: '2026-09-09T11:00:00Z',
    })
    const from = vi.fn((table: string) => {
      if (table === 'external_busy_times') return thenable({ data: null, error: null })
      throw new Error(`unexpected table ${table}`)
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns 403 when staff updates another instructor busy time in the same tenant', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      action: 'update',
      id: 'busy-1',
      start_time: '2026-09-09T10:00:00Z',
      end_time: '2026-09-09T11:00:00Z',
    })
    const from = vi.fn((table: string) => {
      if (table === 'external_busy_times') {
        return thenable({
          data: {
            id: 'busy-1',
            staff_id: 'staff-b',
            tenant_id: 'tenant-a',
            start_time: '2026-09-09T08:00:00Z',
            end_time: '2026-09-09T09:00:00Z',
          },
          error: null,
        })
      }
      return thenable({ data: staffUserRow('staff-b'), error: null })
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
  })

  it('deletes only after loading the row in the session tenant', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      action: 'delete',
      id: 'busy-1',
      tenant_id: 'tenant-attacker',
    })
    const lookup = thenable({
      data: {
        id: 'busy-1',
        staff_id: 'staff-a',
        tenant_id: 'tenant-a',
        start_time: '2026-09-09T08:00:00Z',
        end_time: '2026-09-09T09:00:00Z',
      },
      error: null,
    })
    const deletion = thenable({ data: null, error: null })
    let busyCalls = 0
    const from = vi.fn((table: string) => {
      if (table === 'users') return thenable({ data: staffUserRow(), error: null })
      busyCalls += 1
      return busyCalls === 1 ? lookup : deletion
    })
    mocks.getSupabaseAdmin.mockReturnValue({ from })
    await expect((await handler())({})).resolves.toEqual({
      success: true,
      message: 'External busy time deleted',
    })
    expect(lookup.eq).toHaveBeenCalledWith('id', 'busy-1')
    expect(lookup.eq).toHaveBeenCalledWith('tenant_id', 'tenant-a')
    expect(deletion.delete).toHaveBeenCalled()
    expect(deletion.eq).toHaveBeenCalledWith('id', 'busy-1')
    expect(deletion.eq).toHaveBeenCalledWith('tenant_id', 'tenant-a')
    expect(mocks.releaseSlots).toHaveBeenCalledWith(
      'staff-a',
      '2026-09-09T08:00:00Z',
      '2026-09-09T09:00:00Z',
      'tenant-a',
    )
  })
})
