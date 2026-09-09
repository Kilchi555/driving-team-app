import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createError } from 'h3'

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  requireSuperAdmin: vi.fn(),
  createClient: vi.fn(),
  fetch: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('~/server/utils/require-super-admin', () => ({
  requireSuperAdmin: mocks.requireSuperAdmin,
}))

vi.mock('~/server/utils/supabase-service-env', () => ({
  getSupabaseServiceCredentials: () => ({
    supabaseUrl: 'http://localhost',
    supabaseServiceKey: 'service-role-test',
  }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

vi.mock('~/composables/useTerminology', () => ({
  getTerminologyDefaults: () => ({
    businessNoun: 'Fahrschule',
    appointmentsPlural: 'Termine',
    staff: 'Team',
  }),
}))

type EventHandler = (event: object) => Promise<unknown>

const src = readFileSync(
  resolve(process.cwd(), 'server/api/whitelabel/create-app.post.ts'),
  'utf8',
)

describe('P0-10 whitelabel create-app source contract', () => {
  it('requires super_admin before reading the body or calling GitHub', () => {
    const handlerStart = src.indexOf('export default defineEventHandler')
    const authAt = src.indexOf('requireSuperAdmin(event)', handlerStart)
    const bodyAt = src.indexOf('readBody', handlerStart)
    const githubAt = src.indexOf('SIMY_GITHUB_PAT', handlerStart)
    expect(authAt).toBeGreaterThan(handlerStart)
    expect(bodyAt).toBeGreaterThan(authAt)
    expect(githubAt).toBeGreaterThan(bodyAt)
  })
})

describe('P0-10 whitelabel/create-app', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.readBody.mockReset()
    mocks.requireSuperAdmin.mockReset()
    mocks.createClient.mockReset()
    mocks.fetch.mockReset()
    vi.stubGlobal('fetch', mocks.fetch)
    delete process.env.SIMY_GITHUB_PAT
  })

  async function handler(): Promise<EventHandler> {
    return (await import('../../api/whitelabel/create-app.post')).default as EventHandler
  }

  it('returns 401 for anonymous callers before reading the body', async () => {
    mocks.requireSuperAdmin.mockRejectedValue(
      createError({ statusCode: 401, statusMessage: 'Unauthorized' }),
    )
    await expect(handler().then((fn) => fn({}))).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.readBody).not.toHaveBeenCalled()
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('returns 403 for tenant admins', async () => {
    mocks.requireSuperAdmin.mockRejectedValue(
      createError({ statusCode: 403, statusMessage: 'Super admin access required' }),
    )
    await expect(handler().then((fn) => fn({}))).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.readBody).not.toHaveBeenCalled()
    expect(mocks.fetch).not.toHaveBeenCalled()
  })

  it('lets super_admin provision a tenant without calling GitHub when PAT is unset', async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ id: 'auth-super', role: 'super_admin' })
    mocks.readBody.mockResolvedValue({ tenantId: 'tenant-b' })
    mocks.createClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: {
                id: 'tenant-b',
                name: 'School B',
                slug: 'school-b',
                primary_color: '#000',
                logo_square_url: null,
                domain: null,
                contact_email: null,
                business_type: 'driving_school',
              },
              error: null,
            })),
          })),
        })),
        upsert: vi.fn(async () => ({ error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
      })),
    })

    const result = (await handler().then((fn) => fn({}))) as { status: string }
    expect(result.status).toBe('config_saved_no_build')
    expect(mocks.fetch).not.toHaveBeenCalled()
  })
})
