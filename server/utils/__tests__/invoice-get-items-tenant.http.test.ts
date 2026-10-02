import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getQuery: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    getQuery: mocks.getQuery,
  }
})

vi.mock('~/utils/supabase', () => ({ getSupabaseAdmin: mocks.getSupabaseAdmin }))
vi.mock('~/server/utils/auth', () => ({ getAuthenticatedUser: mocks.getAuthenticatedUser }))

const TENANT = 'tenant-a'
const OTHER = 'tenant-b'

function createDb(tables: Record<string, Array<Record<string, unknown>>>) {
  function from(table: string) {
    const filters: Array<(row: Record<string, unknown>) => boolean> = []
    const chain: {
      select: () => typeof chain
      eq: (col: string, val: unknown) => typeof chain
      in: (col: string, vals: unknown[]) => typeof chain
      order: () => typeof chain
      maybeSingle: () => Promise<{ data: Record<string, unknown> | null, error: null }>
      then: (resolve: (value: unknown) => unknown) => Promise<unknown>
    } = {
      select: () => chain,
      eq(col: string, val: unknown) {
        filters.push((row) => row[col] === val)
        return chain
      },
      in(col: string, vals: unknown[]) {
        filters.push((row) => vals.includes(row[col]))
        return chain
      },
      order: () => chain,
      maybeSingle: async () => ({ data: (tables[table] || []).filter((row) => filters.every((fn) => fn(row)))[0] || null, error: null }),
      then(resolve: (value: unknown) => unknown) {
        const data = (tables[table] || []).filter((row) => filters.every((fn) => fn(row)))
        return Promise.resolve({ data, error: null }).then(resolve)
      },
    }
    return chain
  }
  return { from }
}

async function handler() {
  return (await import('../../api/invoices/get-items.get')).default as (event: unknown) => Promise<{ data: Array<{ id: string }> }>
}

describe('GET /api/invoices/get-items tenant isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAuthenticatedUser.mockResolvedValue({ db_user_id: 'staff', tenant_id: TENANT })
  })

  it('rejects a foreign invoice id', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(createDb({
      invoices: [{ id: 'inv-other', tenant_id: OTHER }],
      invoice_items: [{ id: 'item-other', invoice_id: 'inv-other', tenant_id: OTHER, product_name: 'Geheim' }],
    }))
    mocks.getQuery.mockReturnValue({ invoice_id: 'inv-other' })
    await expect(handler().then((fn) => fn({}))).rejects.toMatchObject({ statusCode: 404 })
  })

  it('returns only the authenticated tenant items', async () => {
    mocks.getSupabaseAdmin.mockReturnValue(createDb({
      invoices: [{ id: 'inv-a', tenant_id: TENANT }],
      invoice_items: [
        { id: 'item-a', invoice_id: 'inv-a', tenant_id: TENANT, product_name: 'Theorie', appointment_id: null },
        { id: 'item-b', invoice_id: 'inv-a', tenant_id: OTHER, product_name: 'Geheim', appointment_id: null },
      ],
    }))
    mocks.getQuery.mockReturnValue({ invoice_id: 'inv-a' })
    const result = await handler().then((fn) => fn({}))
    expect(result.data.map((row) => row.id)).toEqual(['item-a'])
  })
})
