import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createError } from 'h3'

const mocks = vi.hoisted(() => ({
  assertCronRequest: vi.fn(),
  run: vi.fn(),
  requireSuperAdmin: vi.fn(),
  analyze: vi.fn(),
  generate: vi.fn(),
  readBody: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/cron-auth', () => ({
  assertCronRequest: mocks.assertCronRequest,
}))

vi.mock('~/server/utils/website-prospect-discover', () => ({
  runCronWebsiteProspectDiscovery: mocks.run,
}))

vi.mock('~/server/utils/require-super-admin', () => ({
  requireSuperAdmin: mocks.requireSuperAdmin,
}))

vi.mock('~/server/utils/website-prospect-analyze', () => ({
  analyzeWebsiteProspect: mocks.analyze,
}))

vi.mock('~/server/utils/website-prospect-generate', () => ({
  generateWebsiteProspectSite: mocks.generate,
}))

type EventHandler = (event: object) => Promise<unknown>

describe('discover-website-prospects cron auth', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.assertCronRequest.mockReset()
    mocks.run.mockReset()
    mocks.readBody.mockReset()
  })

  it('returns 401 without CRON_SECRET and does not search', async () => {
    mocks.assertCronRequest.mockImplementation(() => {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    })
    const handler = (await import('../../api/cron/discover-website-prospects.get')).default as EventHandler
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.run).not.toHaveBeenCalled()
  })
})

describe('website prospect analyze stays superadmin', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.requireSuperAdmin.mockReset()
    mocks.analyze.mockReset()
    mocks.generate.mockReset()
    mocks.readBody.mockReset()
  })

  it('returns 401 when there is no session and does not analyze', async () => {
    mocks.requireSuperAdmin.mockRejectedValue(
      createError({ statusCode: 401, statusMessage: 'Unauthorized' }),
    )
    const handler = (await import('../../api/tenant-admin/website-prospects/analyze.post')).default as EventHandler
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.readBody).not.toHaveBeenCalled()
    expect(mocks.analyze).not.toHaveBeenCalled()
    expect(mocks.generate).not.toHaveBeenCalled()
  })
})
