import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  readBody: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getServerSession: vi.fn(),
}))

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>()
  return {
    ...actual,
    defineEventHandler: (fn: (event: unknown) => unknown) => fn,
    readBody: mocks.readBody,
  }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

vi.mock('#auth', () => ({
  getServerSession: mocks.getServerSession,
}))

vi.mock('~/server/utils/cookies', () => ({
  setAuthCookies: vi.fn(),
}))

vi.mock('~/server/utils/password-validator', () => ({
  validatePassword: vi.fn(),
  logPasswordValidationAttempt: vi.fn(),
}))

vi.mock('~/server/utils/hibp-checker', () => ({
  checkPasswordPwned: vi.fn(),
}))

vi.mock('~/server/utils/notify-new-client-registration', () => ({
  notifyTenantAdminsNewClient: vi.fn(),
}))

vi.mock('~/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('server supabase clients are created inside the request', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { tenant_id: 't1', role: 'staff' }, error: null }),
          }),
        }),
      }),
    })
  })

  it('does not construct a client when the three routes are imported', async () => {
    await import('~/server/api/admin/manage.post')
    await import('~/server/api/auth/register.post')
    await import('~/server/api/documents/upload.post')
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('preserves the admin authorization failure after creating the configured client', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ db_user_id: 'user-1' })
    mocks.readBody.mockResolvedValue({ action: 'get-evaluation-categories' })
    const handler = (await import('~/server/api/admin/manage.post')).default as (event: unknown) => Promise<{ success: boolean, error?: string }>
    const result = await handler({})
    expect(mocks.createClient).toHaveBeenCalledTimes(1)
    expect(mocks.createClient).toHaveBeenCalledWith('http://localhost:54321', 'test-key')
    expect(result).toEqual({ success: false, error: 'Unauthorized - not admin' })
  })

  it('keeps invalid admin actions failing before a client is created', async () => {
    mocks.getAuthenticatedUser.mockResolvedValue({ db_user_id: 'user-1' })
    mocks.readBody.mockResolvedValue({ action: 'not-an-action' })
    const handler = (await import('~/server/api/admin/manage.post')).default as (event: unknown) => Promise<{ success: boolean, error?: string }>
    const result = await handler({})
    expect(mocks.createClient).not.toHaveBeenCalled()
    expect(result).toEqual({ success: false, error: 'Invalid action' })
  })

  it('keeps invalid registration actions failing before a client is created', async () => {
    mocks.readBody.mockResolvedValue({ action: 'not-an-action' })
    const handler = (await import('~/server/api/auth/register.post')).default as (event: unknown) => Promise<unknown>
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid registration action',
    })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

})
