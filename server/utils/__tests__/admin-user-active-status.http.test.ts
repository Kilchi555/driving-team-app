import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isDeactivatedOrDeleted } from '../profile-access'

const TENANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const CALLER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const SUB = 'abababab-abab-4aba-8aba-abababababab'
const CLIENT = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const FOREIGN = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const DELETED = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
const OTHER_PRIMARY = '99999999-9999-4999-8999-999999999999'
const CLIENT_AUTH = '12121212-1212-4121-8121-121212121212'

type Row = {
  id: string
  tenant_id: string | null
  role: string
  is_primary_admin: boolean
  is_active: boolean
  deleted_at: string | null
  deletion_reason: string | null
  auth_user_id: string | null
  first_name: string
}

type Filter = { op: 'eq' | 'is'; column: string; value: unknown }

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  revoke: vi.fn(),
  logAudit: vi.fn(),
  client: vi.fn(),
}))

const db = {
  rows: [] as Row[],
  updates: [] as Record<string, unknown>[],
  failUpdate: false,
}

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mocks.client(),
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

vi.mock('~/server/utils/ip-utils', () => ({
  getClientIP: () => '203.0.113.10',
}))

vi.mock('~/server/utils/audit', () => ({
  logAudit: mocks.logAudit,
}))

vi.mock('~/server/utils/session-control', () => ({
  revokeAuthSessions: mocks.revoke,
}))

function seed(): Row[] {
  return [
    {
      id: CALLER,
      tenant_id: TENANT,
      role: 'admin',
      is_primary_admin: true,
      is_active: true,
      deleted_at: null,
      deletion_reason: null,
      auth_user_id: 'auth-caller',
      first_name: 'Ada',
    },
    {
      id: SUB,
      tenant_id: TENANT,
      role: 'admin',
      is_primary_admin: false,
      is_active: true,
      deleted_at: null,
      deletion_reason: null,
      auth_user_id: 'auth-sub',
      first_name: 'Bea',
    },
    {
      id: CLIENT,
      tenant_id: TENANT,
      role: 'client',
      is_primary_admin: false,
      is_active: true,
      deleted_at: null,
      deletion_reason: 'unverändert',
      auth_user_id: CLIENT_AUTH,
      first_name: 'Cara',
    },
    {
      id: FOREIGN,
      tenant_id: OTHER,
      role: 'client',
      is_primary_admin: false,
      is_active: true,
      deleted_at: null,
      deletion_reason: null,
      auth_user_id: 'auth-foreign',
      first_name: 'Dora',
    },
    {
      id: DELETED,
      tenant_id: TENANT,
      role: 'client',
      is_primary_admin: false,
      is_active: false,
      deleted_at: '2026-01-01T00:00:00',
      deletion_reason: 'gelöscht',
      auth_user_id: 'auth-deleted',
      first_name: 'Eva',
    },
    {
      id: OTHER_PRIMARY,
      tenant_id: TENANT,
      role: 'admin',
      is_primary_admin: true,
      is_active: true,
      deleted_at: null,
      deletion_reason: null,
      auth_user_id: 'auth-other-primary',
      first_name: 'Fia',
    },
  ]
}

function row(id: string) {
  const found = db.rows.find((item) => item.id === id)
  if (!found) throw new Error(`missing row ${id}`)
  return found
}

function matches(candidate: Row, filters: Filter[]) {
  return filters.every((filter) => candidate[filter.column as keyof Row] === filter.value)
}

function createQueryClient() {
  return {
    from(table: string) {
      if (table !== 'users') throw new Error(`unexpected table ${table}`)
      const filters: Filter[] = []
      let operation: 'select' | 'update' = 'select'
      let payload: Record<string, unknown> | null = null
      let head = false

      const run = () => {
        const matched = db.rows.filter((candidate) => matches(candidate, filters))
        if (operation === 'update') {
          if (db.failUpdate) return { data: [], error: { code: 'XX000', message: 'db down' }, count: 0 }
          db.updates.push({ ...(payload || {}) })
          for (const candidate of matched) Object.assign(candidate, payload)
          return { data: matched, error: null, count: matched.length }
        }
        return { data: matched, error: null, count: matched.length }
      }

      const query: {
        select: (columns: string, options?: { head?: boolean }) => typeof query
        update: (next: Record<string, unknown>) => typeof query
        eq: (column: string, value: unknown) => typeof query
        is: (column: string, value: unknown) => typeof query
        order: () => typeof query
        maybeSingle: () => Promise<{ data: Row | null; error: unknown }>
        single: () => Promise<{ data: Row | null; error: unknown }>
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => void
      } = {
        select(_columns, options) {
          head = !!options?.head
          return query
        },
        update(next) {
          operation = 'update'
          payload = next
          return query
        },
        eq(column, value) {
          filters.push({ op: 'eq', column, value })
          return query
        },
        is(column, value) {
          filters.push({ op: 'is', column, value })
          return query
        },
        order() {
          return query
        },
        async maybeSingle() {
          const result = run()
          if (result.error) return { data: null, error: result.error }
          if (result.data.length > 1) return { data: null, error: { code: 'PGRST116' } }
          return { data: result.data[0] ? { ...result.data[0] } : null, error: null }
        },
        async single() {
          const result = await query.maybeSingle()
          if (result.error || !result.data) {
            return {
              data: null,
              error: result.error || {
                code: 'PGRST116',
                details: 'The result contains 0 rows',
                message: 'JSON object requested, multiple (or no) rows returned',
              },
            }
          }
          return result
        },
        then(resolve, reject) {
          try {
            const result = run()
            resolve({ data: head ? null : result.data, error: result.error, count: result.count })
          } catch (err) {
            if (reject) reject(err)
            else throw err
          }
        },
      }
      return query
    },
  }
}

function adminAuth(userId = CALLER, role = 'admin') {
  return {
    id: `auth-${userId}`,
    db_user_id: userId,
    role,
    tenant_id: TENANT,
  }
}

type AdminUsersResponse = {
  success: boolean
  data?: {
    id?: string
    is_active?: boolean
    deleted_at?: string | null
    first_name?: string
  }
}

type AdminUsersHandler = (event: unknown) => Promise<AdminUsersResponse>

describe('POST /api/admin/users active status', () => {
  let handler: AdminUsersHandler

  beforeEach(async () => {
    vi.clearAllMocks()
    db.rows = seed()
    db.updates = []
    db.failUpdate = false
    mocks.getAuthenticatedUser.mockResolvedValue(adminAuth())
    mocks.readBody.mockResolvedValue({})
    mocks.revoke.mockResolvedValue(1)
    mocks.logAudit.mockResolvedValue(undefined)
    mocks.client.mockImplementation(() => createQueryClient())
    handler = (await import('~/server/api/admin/users.post')).default as AdminUsersHandler
  })

  it('deactivates a same-tenant client without touching deletion metadata and revokes sessions', async () => {
    mocks.readBody.mockResolvedValue({ action: 'set-user-active', user_id: CLIENT, is_active: false })

    const result = await handler({})

    expect(result).toEqual({
      success: true,
      data: { id: CLIENT, is_active: false, deleted_at: null },
    })
    expect(row(CLIENT)).toMatchObject({
      is_active: false,
      deleted_at: null,
      deletion_reason: 'unverändert',
      role: 'client',
      tenant_id: TENANT,
    })
    expect(db.updates).toEqual([{ is_active: false }])
    expect(mocks.revoke).toHaveBeenCalledWith(expect.anything(), CLIENT_AUTH)
    expect(mocks.logAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'user_active_status_changed',
      resource_id: CLIENT,
      status: 'success',
      tenant_id: TENANT,
    }))
    expect(isDeactivatedOrDeleted(row(CLIENT))).toBe(true)
  })

  it('activates only is_active and does not clear deletion metadata or revive a session', async () => {
    row(CLIENT).is_active = false
    mocks.readBody.mockResolvedValue({ action: 'set-user-active', user_id: CLIENT, is_active: true })

    const result = await handler({})

    expect(result.data).toEqual({ id: CLIENT, is_active: true, deleted_at: null })
    expect(row(CLIENT)).toMatchObject({
      is_active: true,
      deleted_at: null,
      deletion_reason: 'unverändert',
    })
    expect(db.updates).toEqual([{ is_active: true }])
    expect(mocks.revoke).not.toHaveBeenCalled()
  })

  it('rejects ordinary activation of a deleted account without a write or session change', async () => {
    const before = { ...row(DELETED) }
    mocks.readBody.mockResolvedValue({ action: 'set-user-active', user_id: DELETED, is_active: true })

    await expect(handler({})).rejects.toMatchObject({ statusCode: 409 })
    expect(row(DELETED)).toEqual(before)
    expect(db.updates).toEqual([])
    expect(mocks.revoke).not.toHaveBeenCalled()
    expect(mocks.logAudit).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown target without a mutation', async () => {
    mocks.readBody.mockResolvedValue({
      action: 'set-user-active',
      user_id: '00000000-0000-4000-8000-000000000000',
      is_active: false,
    })

    await expect(handler({})).rejects.toMatchObject({ statusCode: 404 })
    expect(db.updates).toEqual([])
    expect(mocks.revoke).not.toHaveBeenCalled()
  })

  it('returns 403 for a foreign-tenant target without a mutation', async () => {
    mocks.readBody.mockResolvedValue({ action: 'set-user-active', user_id: FOREIGN, is_active: false })

    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
    expect(row(FOREIGN).is_active).toBe(true)
    expect(db.updates).toEqual([])
    expect(mocks.revoke).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated and unauthorized callers', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null)
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })

    mocks.getAuthenticatedUser.mockResolvedValue(adminAuth(CALLER, 'staff'))
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
    expect(db.updates).toEqual([])
    expect(mocks.client).not.toHaveBeenCalled()
  })

  it('lets a subadmin deactivate a client and blocks a foreign main admin', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(adminAuth(SUB))
    mocks.readBody.mockResolvedValue({ action: 'set-user-active', user_id: CLIENT, is_active: false })
    await expect(handler({})).resolves.toMatchObject({ success: true, data: { is_active: false } })
    expect(db.updates).toEqual([{ is_active: false }])

    db.updates = []
    mocks.revoke.mockClear()
    mocks.readBody.mockResolvedValue({ action: 'set-user-active', user_id: OTHER_PRIMARY, is_active: false })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
    expect(row(OTHER_PRIMARY).is_active).toBe(true)
    expect(db.updates).toEqual([])
    expect(mocks.revoke).not.toHaveBeenCalled()
  })

  it('does not mutate when the database update fails', async () => {
    db.failUpdate = true
    mocks.readBody.mockResolvedValue({ action: 'set-user-active', user_id: CLIENT, is_active: false })

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Status konnte nicht gespeichert werden',
    })
    expect(row(CLIENT).is_active).toBe(true)
    expect(db.updates).toEqual([])
    expect(mocks.revoke).not.toHaveBeenCalled()
  })
})

describe('POST /api/admin/users profile updates', () => {
  let handler: AdminUsersHandler

  beforeEach(async () => {
    vi.clearAllMocks()
    db.rows = seed()
    db.updates = []
    db.failUpdate = false
    mocks.getAuthenticatedUser.mockResolvedValue(adminAuth())
    mocks.revoke.mockResolvedValue(1)
    mocks.logAudit.mockResolvedValue(undefined)
    mocks.client.mockImplementation(() => createQueryClient())
    handler = (await import('~/server/api/admin/users.post')).default as AdminUsersHandler
  })

  it('returns 400 for an empty profile update without a database mutation', async () => {
    mocks.readBody.mockResolvedValue({ action: 'update-user', user_id: CLIENT, user_data: {} })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(db.updates).toEqual([])
  })

  it('returns 400 when the payload contains only is_active or only role', async () => {
    mocks.readBody.mockResolvedValue({
      action: 'update-user',
      user_id: CLIENT,
      user_data: { is_active: false },
    })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })

    mocks.readBody.mockResolvedValue({
      action: 'update-user',
      user_id: CLIENT,
      user_data: { role: 'admin' },
    })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(row(CLIENT)).toMatchObject({ is_active: true, role: 'client' })
    expect(db.updates).toEqual([])
  })

  it('updates permitted profile fields and leaves privileged fields unchanged', async () => {
    mocks.readBody.mockResolvedValue({
      action: 'update-user',
      user_id: CLIENT,
      user_data: { first_name: 'Neu', is_active: false, role: 'admin', deleted_at: '2026-02-02' },
    })

    const result = await handler({})

    expect(result.success).toBe(true)
    expect(db.updates).toEqual([{ first_name: 'Neu' }])
    expect(row(CLIENT)).toMatchObject({
      first_name: 'Neu',
      is_active: true,
      role: 'client',
      deleted_at: null,
      deletion_reason: 'unverändert',
      tenant_id: TENANT,
    })
  })

  it('rejects a profile update for another tenant and a database error without success', async () => {
    mocks.readBody.mockResolvedValue({
      action: 'update-user',
      user_id: FOREIGN,
      user_data: { first_name: 'Neu' },
    })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
    expect(db.updates).toEqual([])

    db.failUpdate = true
    mocks.readBody.mockResolvedValue({
      action: 'update-user',
      user_id: CLIENT,
      user_data: { first_name: 'Neu' },
    })
    await expect(handler({})).rejects.toMatchObject({ statusCode: 500 })
    expect(row(CLIENT).first_name).toBe('Cara')
    expect(db.updates).toEqual([])
  })

  it('keeps privileged columns out of the profile whitelist', () => {
    const source = readFileSync(resolve(process.cwd(), 'server/api/admin/users.post.ts'), 'utf8')
    const whitelistStart = source.indexOf('const USER_UPDATE_WHITELIST')
    const whitelist = source.slice(whitelistStart, source.indexOf('] as const', whitelistStart))
    expect(whitelist).not.toContain('is_active')
    expect(whitelist).not.toContain('role')
    expect(whitelist).not.toContain('deleted_at')
    expect(source).toContain('assertProfileUpdate(safeData)')
    expect(source).toContain("action === 'set-user-active'")
  })
})
