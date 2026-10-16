import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const TENANT = '64259d68-195a-4c68-8875-f1b44d962830'
const OTHER = '11111111-1111-1111-1111-111111111111'

const mocks = vi.hoisted(() => ({
  getQuery: vi.fn(),
  requireAdminProfile: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    getQuery: mocks.getQuery,
  }
})

vi.mock('~/server/utils/auth', () => ({
  requireAdminProfile: (...args: unknown[]) => mocks.requireAdminProfile(...args),
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

type UserRow = {
  id: string
  tenant_id: string
  role: string
  first_name: string
  last_name: string
  email: string
  phone: string
  company_id: string | null
  street: string
  street_nr: string
  zip: string
  city: string
}

const ownUser: UserRow = {
  id: 'user-1',
  tenant_id: TENANT,
  role: 'client',
  first_name: 'Anna',
  last_name: 'Meier',
  email: 'anna@example.ch',
  phone: '',
  company_id: null,
  street: 'Bahnhofstrasse',
  street_nr: '12a',
  zip: '8001',
  city: 'Zürich',
}

const foreignUser: UserRow = {
  ...ownUser,
  id: 'user-2',
  tenant_id: OTHER,
  email: 'other@example.ch',
  street_nr: '9',
}

let selects: string[] = []

type UserQuery = {
  select: (columns: string) => UserQuery
  eq: (column: string, value: string) => UserQuery
  order: () => UserQuery
  or: () => UserQuery
  limit: () => UserQuery
  then: (onFulfilled: (value: { data: UserRow[]; error: null }) => unknown) => Promise<unknown>
}

function supabaseFor(rows: UserRow[]) {
  return {
    from() {
      const filters: Record<string, string> = {}
      const query: UserQuery = {
        select(columns: string) {
          selects.push(columns)
          return query
        },
        eq(column: string, value: string) {
          filters[column] = value
          return query
        },
        order() { return query },
        or() { return query },
        limit() { return query },
        then(onFulfilled: (value: { data: UserRow[]; error: null }) => unknown) {
          const data = rows.filter((row) => {
            if (filters.tenant_id && row.tenant_id !== filters.tenant_id) return false
            if (filters.role && row.role !== filters.role) return false
            if (filters.company_id && row.company_id !== filters.company_id) return false
            return true
          })
          return Promise.resolve({ data, error: null }).then(onFulfilled)
        },
      }
      return query
    },
  }
}

describe('GET /api/admin/users/search address fields', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    selects = []
    mocks.requireAdminProfile.mockResolvedValue({ id: 'admin-1', tenant_id: TENANT, role: 'admin' })
    mocks.getSupabaseAdmin.mockReturnValue(supabaseFor([ownUser, foreignUser]))
  })

  it('returns street, street_nr, zip and city for the caller tenant only', async () => {
    mocks.getQuery.mockReturnValue({ q: 'Anna' })
    const handler = (await import('~/server/api/admin/users/search.get')).default as (event: unknown) => Promise<{ users: UserRow[] }>
    const result = await handler({})
    expect(selects[0]).toContain('street')
    expect(selects[0]).toContain('street_nr')
    expect(selects[0]).toContain('zip')
    expect(selects[0]).toContain('city')
    expect(result.users.map((user) => user.id)).toEqual(['user-1'])
    expect(result.users[0]).toMatchObject({
      street: 'Bahnhofstrasse',
      street_nr: '12a',
      zip: '8001',
      city: 'Zürich',
    })
    expect(mocks.requireAdminProfile).toHaveBeenCalledOnce()
  })

  it('returns the same address columns for a tenant company roster', async () => {
    const member = { ...ownUser, company_id: 'company-1' }
    const outsider = { ...ownUser, id: 'user-3', company_id: 'company-2', street_nr: '4' }
    mocks.getSupabaseAdmin.mockReturnValue(supabaseFor([member, outsider, foreignUser]))
    mocks.getQuery.mockReturnValue({ company_id: 'company-1' })
    const handler = (await import('~/server/api/admin/users/search.get')).default as (event: unknown) => Promise<{ users: UserRow[] }>
    const result = await handler({})
    expect(selects[0]).toContain('street, street_nr, zip, city')
    expect(result.users.map((user) => user.id)).toEqual(['user-1'])
    expect(result.users[0].street_nr).toBe('12a')
    expect(mocks.requireAdminProfile).toHaveBeenCalledOnce()
  })

  it('does not query users when admin authorization fails', async () => {
    mocks.requireAdminProfile.mockRejectedValue(createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
    mocks.getQuery.mockReturnValue({ q: 'Anna' })
    const handler = (await import('~/server/api/admin/users/search.get')).default as (event: unknown) => Promise<unknown>
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })
})
