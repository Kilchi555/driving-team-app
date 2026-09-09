import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createError } from 'h3'

const mocks = vi.hoisted(() => ({
  getQuery: vi.fn(() => ({ timeRange: '30d' })),
  requireSuperAdmin: vi.fn(),
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

vi.mock('~/server/utils/require-super-admin', () => ({
  requireSuperAdmin: mocks.requireSuperAdmin,
}))

vi.mock('~/utils/supabase', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

type EventHandler = (event: object) => Promise<unknown>

function thenable(result: { data: unknown; error: unknown; count?: number } = { data: [], error: null, count: 0 }) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.gte = vi.fn(chain)
  builder.lt = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.limit = vi.fn(chain)
  builder.insert = vi.fn(chain)
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder as { insert: ReturnType<typeof vi.fn> }
}

const src = readFileSync(resolve(process.cwd(), 'server/api/analytics/dashboard.get.ts'), 'utf8')

describe('P0-03 platform analytics source contract', () => {
  it('requires super_admin before any database access', () => {
    const handlerStart = src.indexOf('export default defineEventHandler')
    const authAt = src.indexOf('requireSuperAdmin(event)', handlerStart)
    const dbAt = src.indexOf('getSupabaseAdmin()', handlerStart)
    expect(authAt).toBeGreaterThan(handlerStart)
    expect(dbAt).toBeGreaterThan(authAt)
  })

  it('does not write analytics_events from the GET handler', () => {
    expect(src).not.toMatch(/from\('analytics_events'\)[\s\S]{0,80}\.insert\(/)
    expect(src).not.toContain("event_type: 'api_call'")
  })
})

describe('P0-03 analytics/dashboard', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.getQuery.mockReturnValue({ timeRange: '30d' })
    mocks.requireSuperAdmin.mockReset()
    mocks.getSupabaseAdmin.mockReset()
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/analytics/dashboard.get')).default as EventHandler
  }

  it('returns 401 for anonymous callers before querying the database', async () => {
    mocks.requireSuperAdmin.mockRejectedValue(createError({ statusCode: 401, statusMessage: 'Unauthorized' }))
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('returns 403 for tenant admins', async () => {
    mocks.requireSuperAdmin.mockRejectedValue(
      createError({ statusCode: 403, statusMessage: 'Super admin access required' }),
    )
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('returns 403 for normal clients', async () => {
    mocks.requireSuperAdmin.mockRejectedValue(
      createError({ statusCode: 403, statusMessage: 'Super admin access required' }),
    )
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('returns 200 for super_admin without writing analytics events', async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ id: 'auth-sa', role: 'super_admin' })
    const builders: Array<ReturnType<typeof thenable>> = []
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => {
        const builder = thenable()
        builders.push(builder)
        return builder
      }),
    })
    const result = await (await handler())({})
    expect(result).toMatchObject({
      metrics: expect.objectContaining({
        activeTenants: 0,
        totalUsers: 0,
      }),
      topTenants: [],
    })
    expect(builders.some((b) => b.insert.mock.calls.length > 0)).toBe(false)
  })
})
