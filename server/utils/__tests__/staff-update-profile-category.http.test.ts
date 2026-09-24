import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  requireAdminProfile: vi.fn(),
  userUpdate: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/utils/auth', () => ({
  requireAdminProfile: mocks.requireAdminProfile,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const TENANT = '64259d68-195a-4c68-8875-f1b44d962830'
const OTHER = '11111111-1111-1111-1111-111111111111'
const USER = '051ce913-169f-480a-9cc6-e96c7b748a21'

const taxonomy = [
  { id: 22, code: 'B', parent_category_id: null, tenant_id: TENANT, is_active: true },
  { id: 60, code: 'B Automatik', parent_category_id: 22, tenant_id: TENANT, is_active: true },
  { id: 54, code: 'B Schaltung', parent_category_id: 22, tenant_id: TENANT, is_active: true },
  { id: 25, code: 'BPT', parent_category_id: 22, tenant_id: TENANT, is_active: true },
  { id: 24, code: 'BE', parent_category_id: null, tenant_id: TENANT, is_active: true },
  { id: 31, code: 'Boot', parent_category_id: null, tenant_id: TENANT, is_active: true },
  { id: 29, code: 'D', parent_category_id: null, tenant_id: TENANT, is_active: true },
  { id: 91, code: 'FOREIGN', parent_category_id: null, tenant_id: OTHER, is_active: true },
]

type Query = {
  select: () => Query
  eq: () => Query
  update?: (payload: unknown) => Query
  single?: () => Promise<{ data: { id: string; auth_user_id: null }; error: null }>
  then?: (resolve: (value: unknown) => unknown) => unknown
}

function categoriesQuery(): Query {
  const query: Query = {
    select: () => query,
    eq: () => query,
    then: (resolve) => resolve({ data: taxonomy.filter((row) => row.tenant_id === TENANT), error: null }),
  }
  return query
}

function usersQuery(): Query {
  const query: Query = {
    select: () => query,
    eq: () => query,
    update: (payload) => {
      mocks.userUpdate(payload)
      return query
    },
    single: async () => ({ data: { id: USER, auth_user_id: null }, error: null }),
  }
  return query
}

describe('POST /api/staff/update-profile category leaf validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdminProfile.mockResolvedValue({
      id: USER,
      tenant_id: TENANT,
      role: 'staff',
      email: 'samir@example.test',
      auth_user_id: 'auth-1',
    })
    mocks.getSupabaseAdmin.mockReturnValue({
      from: (table: string) => (table === 'categories' ? categoriesQuery() : usersQuery()),
      auth: { admin: { updateUserById: vi.fn() } },
    })
  })

  async function post(body: unknown) {
    mocks.readBody.mockResolvedValue(body)
    const handler = (await import('~/server/api/staff/update-profile.post')).default as (event: unknown) => Promise<unknown>
    return handler({})
  }

  it.each(['B Automatik', 'B Schaltung', 'BPT', 'BE', 'Boot', 'D'])('stores leaf %s', async (code) => {
    await post({ category: [code] })
    expect(mocks.userUpdate).toHaveBeenCalledWith({ category: [code] })
  })

  it('stores an empty category list', async () => {
    await post({ category: [] })
    expect(mocks.userUpdate).toHaveBeenCalledWith({ category: [] })
  })

  it('deduplicates repeated leaf codes before writing', async () => {
    await post({ category: ['B Automatik', 'B Automatik'] })
    expect(mocks.userUpdate).toHaveBeenCalledWith({ category: ['B Automatik'] })
  })

  it('rejects a parent with children and does not write', async () => {
    await expect(post({ category: ['B'] })).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  it('rejects a parent mixed with a leaf and does not write', async () => {
    await expect(post({ category: ['B', 'B Automatik'] })).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  it('rejects an unknown code and does not write', async () => {
    await expect(post({ category: ['unknown'] })).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  it('rejects a code from another tenant and does not write', async () => {
    await expect(post({ category: ['FOREIGN'] })).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })

  it.each([null, 'B', [123]])('rejects malformed category %j and does not write', async (category) => {
    await expect(post({ category })).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })
})
