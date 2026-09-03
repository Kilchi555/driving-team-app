/**
 * F-02 — Public /api/auth/manage bypass remediation contract + handler tests.
 *
 * Live production probes (signin/signup against app.simy.ch) are documented in
 * audits/2026-09-02-f02-remediation.md and remain NOT VERIFIED until deploy.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const managePath = resolve(process.cwd(), 'server/api/auth/manage.post.ts')
const loginPath = resolve(process.cwd(), 'server/api/auth/login.post.ts')
const registerStaffPage = resolve(process.cwd(), 'pages/register-staff.vue')
const resetPasswordPage = resolve(process.cwd(), 'pages/reset-password.vue')
const setPasswordPage = resolve(process.cwd(), 'pages/login/set-password.vue')
const passwordResetPage = resolve(process.cwd(), 'pages/password-reset.vue')
const staffRegisterApi = resolve(process.cwd(), 'server/api/staff/register.post.ts')
const resetPasswordApi = resolve(process.cwd(), 'server/api/auth/reset-password.post.ts')

describe('F-02 manage.post.ts retirement contract', () => {
  const src = readFileSync(managePath, 'utf8')

  it('does not create a service-role Supabase client', () => {
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/)
    expect(src).not.toMatch(/createClient\s*\(/)
  })

  it('does not call signInWithPassword or auth.signUp', () => {
    expect(src).not.toMatch(/signInWithPassword/)
    expect(src).not.toMatch(/\.signUp\s*\(/)
    expect(src).not.toMatch(/auth\.admin/)
  })

  it('returns HTTP 410 Gone for all requests', () => {
    expect(src).toContain('statusCode: 410')
    expect(src).toContain('AUTH_MANAGE_RETIRED')
  })

  it('lists retired privileged actions including signin-password and signup', async () => {
    vi.resetModules()
    const { RETIRED_AUTH_MANAGE_ACTIONS } = await import('../../api/auth/manage.post')
    expect(RETIRED_AUTH_MANAGE_ACTIONS).toEqual(
      expect.arrayContaining([
        'signin-password',
        'signup',
        'set-session',
        'update-user',
        'reset-password-email',
        'get-session',
      ])
    )
  })
})

describe('F-02 caller migration contract', () => {
  it('register-staff auto-login uses hardened /api/auth/login', () => {
    const src = readFileSync(registerStaffPage, 'utf8')
    expect(src).toContain("/api/auth/login")
    expect(src).not.toMatch(/\/api\/auth\/manage/)
    expect(src).not.toContain("signin-password")
  })

  it('legacy reset-password.vue uses client Supabase session/password APIs', () => {
    const src = readFileSync(resetPasswordPage, 'utf8')
    expect(src).toContain('supabase.auth.setSession')
    expect(src).toContain('supabase.auth.updateUser')
    expect(src).not.toMatch(/\/api\/auth\/manage/)
  })

  it('set-password.vue establishes session from URL then uses client updateUser', () => {
    const src = readFileSync(setPasswordPage, 'utf8')
    expect(src).toContain('supabase.auth.setSession')
    expect(src).toContain('supabase.auth.verifyOtp')
    expect(src).toContain('supabase.auth.updateUser')
    expect(src).toContain('supabase.auth.getUser')
    expect(src).not.toMatch(/\/api\/auth\/manage/)
  })

  it('preferred password-reset page uses token-bound /api/auth/reset-password', () => {
    const src = readFileSync(passwordResetPage, 'utf8')
    expect(src).toContain('/api/auth/reset-password')
    expect(src).toContain('/api/auth/validate-reset-token')
    expect(src).not.toMatch(/\/api\/auth\/manage/)
  })
})

describe('F-02 hardened login & staff/reset authorization still present', () => {
  it('login.post retains rate limit, IP block, optional captcha hooks', () => {
    const src = readFileSync(loginPath, 'utf8')
    expect(src).toContain('checkRateLimit')
    expect(src).toContain('blocked_ip_addresses')
    expect(src).toContain('HCAPTCHA_SECRET_KEY')
    expect(src).toContain('signInWithPassword')
    expect(src).toContain('setAuthCookies')
  })

  it('staff register binds tenant/role from invitation, not client alone', () => {
    const src = readFileSync(staffRegisterApi, 'utf8')
    expect(src).toContain('invitationToken')
    expect(src).toContain('staff_invitations')
    expect(src).toContain("role: 'staff'")
    expect(src).toContain('invitation.tenant_id')
  })

  it('reset-password API requires token with expiry and used_at checks', () => {
    const src = readFileSync(resetPasswordApi, 'utf8')
    expect(src).toContain('password_reset_tokens')
    expect(src).toContain('expires_at')
    expect(src).toContain('used_at')
    expect(src).toContain('token')
    expect(src).not.toMatch(/userId.*newPassword/)
  })
})

type CreateErrorOpts = {
  statusCode: number
  statusMessage: string
  data?: Record<string, unknown>
}

type H3ErrorLike = Error & {
  statusCode: number
  data?: Record<string, unknown>
}

type EventHandler = (event: object) => Promise<unknown> | unknown

function mockCreateError(opts: CreateErrorOpts): H3ErrorLike {
  const err = new Error(opts.statusMessage) as H3ErrorLike
  err.statusCode = opts.statusCode
  err.data = opts.data
  return err
}

describe('F-02 manage handler rejects legacy actions (Test A/B)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws 410 for signin-password without creating a session', async () => {
    const createError = vi.fn(mockCreateError)
    const readBody = vi.fn(async () => ({
      action: 'signin-password',
      email: 'attacker@example.com',
      password: 'Anything123!',
    }))
    const loggerWarn = vi.fn()

    vi.doMock('h3', () => ({
      defineEventHandler: (fn: EventHandler) => fn,
      createError,
      readBody,
    }))
    vi.doMock('~/utils/logger', () => ({
      logger: { warn: loggerWarn, debug: vi.fn(), info: vi.fn(), error: vi.fn() },
    }))

    const handler = (await import('../../api/auth/manage.post')).default as EventHandler
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 410,
      data: expect.objectContaining({ code: 'AUTH_MANAGE_RETIRED', action: 'signin-password' }),
    })
    expect(createError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 410 })
    )
  })

  it('throws 410 for signup without creating auth users', async () => {
    const createError = vi.fn(mockCreateError)
    const readBody = vi.fn(async () => ({
      action: 'signup',
      email: 'factory@example.com',
      password: 'Anything123!',
      options: { data: { role: 'super_admin', tenant_id: 'foreign-tenant' } },
    }))

    vi.doMock('h3', () => ({
      defineEventHandler: (fn: EventHandler) => fn,
      createError,
      readBody,
    }))
    vi.doMock('~/utils/logger', () => ({
      logger: { warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() },
    }))

    const handler = (await import('../../api/auth/manage.post')).default as EventHandler
    await expect(handler({})).rejects.toMatchObject({
      statusCode: 410,
      data: expect.objectContaining({ code: 'AUTH_MANAGE_RETIRED', action: 'signup' }),
    })
  })
})
