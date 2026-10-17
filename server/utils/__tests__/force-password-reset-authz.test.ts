import { describe, expect, it, vi, beforeEach } from 'vitest'

function httpError(statusCode: number, statusMessage: string, data?: unknown) {
  const err = new Error(statusMessage) as Error & { statusCode: number; statusMessage: string; data?: unknown }
  err.statusCode = statusCode
  err.statusMessage = statusMessage
  err.data = data
  return err
}

const mocks = vi.hoisted(() => ({
  readBody: vi.fn(),
  requireSuperAdmin: vi.fn(),
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 2, limit: 3, reset: 0, retryAfter: 1 })),
  getClientIP: vi.fn(() => '203.0.113.10'),
  forceInvalidatePassword: vi.fn(),
}))

vi.mock('h3', () => ({
  defineEventHandler: (fn: (event: unknown) => unknown) => fn,
  readBody: mocks.readBody,
  createError: ({ statusCode, statusMessage, data }: { statusCode: number; statusMessage: string; data?: unknown }) =>
    httpError(statusCode, statusMessage, data),
}))

vi.mock('~/server/utils/require-super-admin', () => ({
  requireSuperAdmin: mocks.requireSuperAdmin,
}))

vi.mock('~/server/utils/rate-limiter', () => ({
  checkRateLimit: mocks.checkRateLimit,
}))

vi.mock('~/server/utils/ip-utils', () => ({
  getClientIP: mocks.getClientIP,
}))

vi.mock('~/server/utils/session-control', () => ({
  actorDbUserId: (user: { db_user_id?: string; profile?: { id?: string } }) => user.db_user_id || user.profile?.id || null,
  isUuid: (value: unknown) =>
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
}))

vi.mock('~/server/utils/force-password-reset', () => ({
  ACCESS_JWT_SEMANTICS: 'VALID_UNTIL_EXPIRY',
  forceInvalidatePassword: mocks.forceInvalidatePassword,
}))

type EventHandler = (event: object) => Promise<unknown>

const superAdmin = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  role: 'super_admin',
  db_user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  profile: { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', role: 'super_admin' },
}

const tenantAdmin = {
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  role: 'admin',
  tenant_id: '64259d68-195a-4c68-8875-f1b44d962830',
}

const TARGET_AUTH = '322e7ee8-9443-40aa-8d8a-8ab0b000a0ef'

async function loadHandler(): Promise<EventHandler> {
  vi.resetModules()
  const mod = await import('../../api/admin/force-password-reset.post')
  return mod.default as EventHandler
}

describe('force-password-reset HTTP authorization', () => {
  beforeEach(() => {
    mocks.readBody.mockReset()
    mocks.requireSuperAdmin.mockReset()
    mocks.checkRateLimit.mockReset()
    mocks.forceInvalidatePassword.mockReset()
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 2, limit: 3, reset: 0, retryAfter: 1 })
  })

  it('rejects unauthenticated callers', async () => {
    mocks.requireSuperAdmin.mockRejectedValue(httpError(401, 'Unauthorized'))
    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 401 })
    expect(mocks.forceInvalidatePassword).not.toHaveBeenCalled()
  })

  it('rejects tenant admin / staff (cross-tenant and same-tenant)', async () => {
    mocks.requireSuperAdmin.mockRejectedValue(httpError(403, 'Super admin access required'))
    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 403 })
    expect(mocks.forceInvalidatePassword).not.toHaveBeenCalled()
  })

  it('requires confirm=true', async () => {
    mocks.requireSuperAdmin.mockResolvedValue(superAdmin)
    mocks.readBody.mockResolvedValue({ auth_user_id: TARGET_AUTH })
    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.forceInvalidatePassword).not.toHaveBeenCalled()
  })

  it('rate-limits repeated triggers', async () => {
    mocks.requireSuperAdmin.mockResolvedValue(superAdmin)
    mocks.checkRateLimit.mockResolvedValue({ allowed: false, remaining: 0, limit: 3, reset: 1000, retryAfter: 1 })
    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 429 })
    expect(mocks.forceInvalidatePassword).not.toHaveBeenCalled()
  })

  it('allows super_admin and does not return secrets', async () => {
    mocks.requireSuperAdmin.mockResolvedValue(superAdmin)
    mocks.readBody.mockResolvedValue({ confirm: true, auth_user_id: TARGET_AUTH })
    mocks.forceInvalidatePassword.mockResolvedValue({
      complete: true,
      password_changed: true,
      sessions_revoked: true,
      sessions_revoked_count: 310,
      recovery_required: true,
      recovery_dispatched: true,
      auth_user_id: TARGET_AUTH,
      public_user_id: '64a167c8-8da8-42b0-9212-32dcf7bc4759',
      tenant_id: '64259d68-195a-4c68-8875-f1b44d962830',
      access_jwt: 'VALID_UNTIL_EXPIRY',
    })
    const handler = await loadHandler()
    const response = await handler({}) as Record<string, unknown>
    expect(response.complete).toBe(true)
    expect(response.sessions_revoked_count).toBe(310)
    expect(response.access_jwt).toBe('VALID_UNTIL_EXPIRY')
    expect(response).not.toHaveProperty('password')
    expect(response).not.toHaveProperty('token')
    expect(response).not.toHaveProperty('email')
    expect(mocks.forceInvalidatePassword).toHaveBeenCalledWith(
      { authUserId: TARGET_AUTH, publicUserId: undefined },
      expect.objectContaining({ authUserId: superAdmin.id }),
    )
  })

  it('surfaces AUTH_ONLY as 404 without mutation leakage', async () => {
    mocks.requireSuperAdmin.mockResolvedValue(superAdmin)
    mocks.readBody.mockResolvedValue({
      confirm: true,
      auth_user_id: '2bf686d2-216b-4433-8f8a-d963b535c807',
    })
    mocks.forceInvalidatePassword.mockResolvedValue({
      complete: false,
      password_changed: false,
      sessions_revoked: false,
      sessions_revoked_count: 0,
      recovery_required: false,
      recovery_dispatched: false,
      auth_user_id: '2bf686d2-216b-4433-8f8a-d963b535c807',
      public_user_id: null,
      tenant_id: null,
      access_jwt: 'VALID_UNTIL_EXPIRY',
      error: { stage: 'lookup', code: 'AUTH_ONLY_NO_PUBLIC_ROW', message: 'blocked' },
    })
    const handler = await loadHandler()
    await expect(handler({})).rejects.toMatchObject({ statusCode: 404 })
  })
})
