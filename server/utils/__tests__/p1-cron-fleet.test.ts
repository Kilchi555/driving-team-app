import { describe, expect, it, vi, afterEach } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cronDir = resolve(process.cwd(), 'server/api/cron')

describe('cron fleet fail-closed', () => {
  it('requires assertCronRequest before privileged work on every cron route', () => {
    const files = readdirSync(cronDir).filter((name) => name.endsWith('.ts'))
    expect(files.length).toBeGreaterThan(20)
    for (const name of files) {
      const src = readFileSync(resolve(cronDir, name), 'utf8')
      if (/export \{ default \} from/.test(src)) continue
      const handlerIdx = src.indexOf('export default defineEventHandler')
      expect(handlerIdx).toBeGreaterThanOrEqual(0)
      const body = src.slice(handlerIdx)
      const authCandidates = ['assertCronRequest(event)', 'verifyCronToken(event)']
        .map((needle) => body.indexOf(needle))
        .filter((idx) => idx >= 0)
      expect(authCandidates.length).toBeGreaterThan(0)
      const authAt = Math.min(...authCandidates)
      const adminAt = body.indexOf('getSupabaseAdmin(')
      const createAt = body.indexOf('createClient(')
      if (adminAt >= 0) {
        expect(authAt).toBeLessThan(adminAt)
      }
      if (createAt >= 0) {
        expect(authAt).toBeLessThan(createAt)
      }
      expect(src).not.toMatch(/x-vercel-cron/)
      expect(src).not.toMatch(/if \(cronSecret &&/)
    }
  })

  it('keeps trial-reminder fail-closed via assertCronRequest', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'server/api/stripe/trial-reminder.post.ts'),
      'utf8',
    )
    expect(src).toContain('assertCronRequest(event)')
    expect(src).not.toMatch(/if \(cronSecret && authHeader/)
  })
})

const mocks = vi.hoisted(() => ({
  getHeader: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  recalculateForStaff: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    getHeader: mocks.getHeader,
  }
})

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

vi.mock('~/server/services/availability-calculator', () => ({
  availabilityCalculator: {
    recalculateForStaff: mocks.recalculateForStaff,
  },
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

type EventHandler = (event: object) => Promise<unknown>

describe('process-recalc-queue fail-closed', () => {
  afterEach(() => {
    mocks.getHeader.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    delete process.env.CRON_SECRET
  })

  async function handler(): Promise<EventHandler> {
    vi.resetModules()
    return (await import('../../api/cron/process-recalc-queue.get')).default as EventHandler
  }

  it('rejects when CRON_SECRET is missing', async () => {
    delete process.env.CRON_SECRET
    mocks.getHeader.mockReturnValue('Bearer anything')
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('rejects a missing Authorization header', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    mocks.getHeader.mockReturnValue(undefined)
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('rejects x-vercel-cron without a valid bearer secret', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    mocks.getHeader.mockImplementation((_event: unknown, name: string) => {
      if (name === 'x-vercel-cron') return '1'
      return undefined
    })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('rejects a forged x-vercel-cron header even with a Bearer prefix and the wrong secret', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    mocks.getHeader.mockImplementation((_event: unknown, name: string) => {
      if (name === 'x-vercel-cron') return '1'
      if (name === 'authorization') return 'Bearer forged'
      return undefined
    })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled()
  })

  it('rejects the wrong bearer secret', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    mocks.getHeader.mockImplementation((_event: unknown, name: string) => {
      if (name === 'authorization') return 'Bearer wrong'
      return undefined
    })
    await expect((await handler())({})).rejects.toMatchObject({ statusCode: 401 })
  })

  it('accepts a valid bearer secret and returns when the queue is empty', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    mocks.getHeader.mockImplementation((_event: unknown, name: string) => {
      if (name === 'authorization') return 'Bearer test-cron-secret'
      return undefined
    })
    mocks.getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [], error: null })),
            })),
          })),
        })),
      })),
    })
    const result = await (await handler())({})
    expect(result).toMatchObject({ success: true, processed: 0 })
  })
})

