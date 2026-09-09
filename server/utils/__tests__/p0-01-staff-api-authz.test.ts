import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createError } from 'h3'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  requireTenantStaff: vi.fn(),
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

vi.mock('~/server/utils/category-groups', () => ({
  resolveCategoryGroup: vi.fn(async () => ['B']),
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

const adminActor = {
  ...staffActor,
  id: 'admin-a',
  role: 'admin',
  auth_user_id: 'auth-admin-a',
}

function thenable(result: { data: unknown; error: unknown }) {
  const builder: {
    eq: ReturnType<typeof vi.fn>
    select: ReturnType<typeof vi.fn>
    in: ReturnType<typeof vi.fn>
    not: ReturnType<typeof vi.fn>
    is: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise<unknown>
  } = {
    eq: vi.fn(() => builder),
    select: vi.fn(() => builder),
    in: vi.fn(() => builder),
    not: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  return builder
}

function staffUserRow(id = 'staff-a', tenantId = 'tenant-a', role = 'staff') {
  return {
    id,
    tenant_id: tenantId,
    role,
    is_active: true,
    deleted_at: null,
  }
}

function adminForTables(tables: Record<string, Array<{ data: unknown; error: unknown }>>) {
  const remaining = Object.fromEntries(
    Object.entries(tables).map(([table, results]) => [table, [...results]]),
  )
  const from = vi.fn((table: string) => {
    const queue = remaining[table]
    const next = queue?.length ? queue.shift()! : { data: [], error: null }
    return thenable(next)
  })
  return { from }
}

const cashSrc = readFileSync(resolve(process.cwd(), 'server/api/staff/cash-balance.post.ts'), 'utf8')
const examSrc = readFileSync(resolve(process.cwd(), 'server/api/staff/exam-stats.post.ts'), 'utf8')
const evalSrc = readFileSync(resolve(process.cwd(), 'server/api/staff/evaluation-history.post.ts'), 'utf8')

describe('P0-01 staff API source contract', () => {
  it('authenticates before reading the body on all three routes', () => {
    for (const src of [cashSrc, examSrc, evalSrc]) {
      const handlerStart = src.indexOf('export default defineEventHandler')
      const authAt = src.indexOf('requireTenantStaff(event)', handlerStart)
      const bodyAt = src.indexOf('readBody', handlerStart)
      expect(handlerStart).toBeGreaterThanOrEqual(0)
      expect(authAt).toBeGreaterThan(handlerStart)
      expect(bodyAt).toBeGreaterThan(authAt)
    }
  })

  it('does not trust client tenant_id on exam-stats', () => {
    expect(examSrc).not.toMatch(/body\?\.tenant_id|tenant_id:\s*body/)
    expect(examSrc).toContain("eq('tenant_id', actor.tenant_id)")
  })

  it('binds cash and evaluation queries to the session tenant', () => {
    expect(cashSrc).toContain('loadStaffInTenant')
    expect(cashSrc).toContain('assertSelfOrTenantAdmin')
    expect(cashSrc).toContain("eq('tenant_id', actor.tenant_id)")
    expect(evalSrc).toContain("eq('tenant_id', actor.tenant_id)")
    expect(evalSrc).toContain('appointment.user_id !== userId')
  })
})

describe('P0-01 cash-balance', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.requireTenantStaff.mockReset()
    mocks.getSupabaseAdmin.mockReset()
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/staff/cash-balance.post')).default as EventHandler
  }

  it('returns 401 for anonymous callers before reading the body', async () => {
    mocks.requireTenantStaff.mockRejectedValue(createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.readBody).not.toHaveBeenCalled()
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('returns 403 when the instructor is outside the session tenant', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      action: 'loadMovements',
      data: { instructorId: 'staff-b' },
    })
    const admin = adminForTables({
      users: [{ data: null, error: null }],
    })
    mocks.getSupabaseAdmin.mockReturnValue(admin)
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(admin.from).not.toHaveBeenCalledWith('cash_movements')
  })

  it('returns 403 when staff requests another instructor in the same tenant', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      action: 'loadMovements',
      data: { instructorId: 'staff-b' },
    })
    const admin = adminForTables({
      users: [{ data: staffUserRow('staff-b'), error: null }],
    })
    mocks.getSupabaseAdmin.mockReturnValue(admin)
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(admin.from).not.toHaveBeenCalledWith('cash_movements')
  })

  it('returns 200 for the instructor reading their own movements', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      action: 'loadMovements',
      data: { instructorId: 'staff-a' },
    })
    const movements = thenable({ data: [{ id: 'm1' }], error: null })
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'users') return thenable({ data: staffUserRow(), error: null })
        return movements
      }),
    }
    mocks.getSupabaseAdmin.mockReturnValue(admin)
    await expect((await handler())({})).resolves.toEqual({ success: true, data: [{ id: 'm1' }] })
    expect(movements.eq).toHaveBeenCalledWith('instructor_id', 'staff-a')
    expect(movements.eq).toHaveBeenCalledWith('tenant_id', 'tenant-a')
  })

  it('lets a tenant admin read another instructor in the same tenant', async () => {
    mocks.requireTenantStaff.mockResolvedValue(adminActor)
    mocks.readBody.mockResolvedValue({
      action: 'loadTransactions',
      data: { instructorId: 'staff-b' },
    })
    const tx = thenable({ data: [], error: null })
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'users') return thenable({ data: staffUserRow('staff-b'), error: null })
        return tx
      }),
    }
    mocks.getSupabaseAdmin.mockReturnValue(admin)
    await expect((await handler())({})).resolves.toEqual({ success: true, data: [] })
    expect(tx.eq).toHaveBeenCalledWith('instructor_id', 'staff-b')
    expect(tx.eq).toHaveBeenCalledWith('tenant_id', 'tenant-a')
  })
})

describe('P0-01 exam-stats', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.requireTenantStaff.mockReset()
    mocks.getSupabaseAdmin.mockReset()
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/staff/exam-stats.post')).default as EventHandler
  }

  it('returns 401 for anonymous callers before reading the body', async () => {
    mocks.requireTenantStaff.mockRejectedValue(createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.readBody).not.toHaveBeenCalled()
  })

  it('returns 403 for a foreign staff_id even if the client sends the victim tenant_id', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      staff_id: 'staff-b',
      tenant_id: 'tenant-b',
    })
    const admin = adminForTables({
      users: [{ data: null, error: null }],
    })
    mocks.getSupabaseAdmin.mockReturnValue(admin)
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(admin.from).not.toHaveBeenCalledWith('appointments')
  })

  it('queries the session tenant, not the client tenant_id, on authorized requests', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      staff_id: 'staff-a',
      tenant_id: 'tenant-attacker',
    })
    const appointments = thenable({ data: [], error: null })
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'users') return thenable({ data: staffUserRow(), error: null })
        return appointments
      }),
    }
    mocks.getSupabaseAdmin.mockReturnValue(admin)
    await expect((await handler())({})).resolves.toEqual({
      success: true,
      data: { appointments: [], exam_results: [], students: [] },
    })
    expect(appointments.eq).toHaveBeenCalledWith('staff_id', 'staff-a')
    expect(appointments.eq).toHaveBeenCalledWith('tenant_id', 'tenant-a')
    expect(appointments.eq).not.toHaveBeenCalledWith('tenant_id', 'tenant-attacker')
  })
})

describe('P0-01 evaluation-history', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.requireTenantStaff.mockReset()
    mocks.getSupabaseAdmin.mockReset()
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/staff/evaluation-history.post')).default as EventHandler
  }

  const appointment = {
    id: 'apt-1',
    user_id: 'student-a',
    staff_id: 'staff-a',
    tenant_id: 'tenant-a',
    type: 'B',
  }

  it('returns 401 for anonymous callers before reading the body', async () => {
    mocks.requireTenantStaff.mockRejectedValue(createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.readBody).not.toHaveBeenCalled()
  })

  it('returns 403 when the appointment is outside the session tenant', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      action: 'get-current',
      appointment_id: 'apt-foreign',
      user_id: 'student-a',
    })
    const admin = adminForTables({
      appointments: [{ data: null, error: null }],
    })
    mocks.getSupabaseAdmin.mockReturnValue(admin)
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(admin.from).not.toHaveBeenCalledWith('notes')
  })

  it('returns 403 when staff reads another instructor appointment', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      action: 'get-current',
      appointment_id: 'apt-1',
      user_id: 'student-a',
    })
    const admin = adminForTables({
      appointments: [{ data: { ...appointment, staff_id: 'staff-b' }, error: null }],
      users: [{ data: { id: 'student-a', tenant_id: 'tenant-a', role: 'client', is_active: true, deleted_at: null }, error: null }],
    })
    mocks.getSupabaseAdmin.mockReturnValue(admin)
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(admin.from).not.toHaveBeenCalledWith('notes')
  })

  it('returns 403 when appointment user_id does not match the requested student', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      action: 'get-current',
      appointment_id: 'apt-1',
      user_id: 'student-other',
    })
    const admin = adminForTables({
      appointments: [{ data: appointment, error: null }],
    })
    mocks.getSupabaseAdmin.mockReturnValue(admin)
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns 200 for the assigned instructor reading current evaluations', async () => {
    mocks.requireTenantStaff.mockResolvedValue(staffActor)
    mocks.readBody.mockResolvedValue({
      action: 'get-current',
      appointment_id: 'apt-1',
      user_id: 'student-a',
    })
    const notes = thenable({ data: [{ evaluation_criteria_id: 'c1', criteria_rating: 3 }], error: null })
    const lessonNote = thenable({ data: { staff_note: 'ok' }, error: null })
    let notesCalls = 0
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'appointments') return thenable({ data: appointment, error: null })
        if (table === 'users') {
          return thenable({
            data: { id: 'student-a', tenant_id: 'tenant-a', role: 'client', is_active: true, deleted_at: null },
            error: null,
          })
        }
        notesCalls += 1
        return notesCalls === 1 ? notes : lessonNote
      }),
    }
    mocks.getSupabaseAdmin.mockReturnValue(admin)
    await expect((await handler())({})).resolves.toMatchObject({
      success: true,
      data: {
        hasEvaluations: true,
        lesson_note: 'ok',
      },
    })
    expect(notes.eq).toHaveBeenCalledWith('appointment_id', 'apt-1')
  })
})
