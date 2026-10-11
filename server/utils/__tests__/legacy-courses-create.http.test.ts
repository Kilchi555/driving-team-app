import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: (...args: unknown[]) => mocks.getAuthenticatedUser(...args),
}))

vi.mock('~/server/utils/rate-limiter', () => ({
  checkRateLimit: (...args: unknown[]) => mocks.checkRateLimit(...args),
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    createError: (opts: { statusCode?: number; statusMessage?: string }) =>
      Object.assign(new Error(opts.statusMessage || 'error'), opts),
  }
})

describe('legacy POST /api/admin/courses/create', () => {
  beforeEach(() => {
    mocks.getAuthenticatedUser.mockReset()
    mocks.checkRateLimit.mockClear()
    vi.resetModules()
  })

  it('rejects authenticated callers with 410 and does not insert', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({
      id: 'user-1',
      tenant_id: 'tenant-1',
      role: 'admin',
    })
    const handler = (await import('~/server/api/admin/courses/create.post')).default as (
      event: unknown,
    ) => Promise<unknown>
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 410,
      statusMessage: expect.stringContaining('/api/admin/courses/upsert'),
    })
  })

  it('still requires auth', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null)
    const handler = (await import('~/server/api/admin/courses/create.post')).default as (
      event: unknown,
    ) => Promise<unknown>
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
  })
})
