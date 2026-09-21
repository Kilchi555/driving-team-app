import { describe, expect, it, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ACCESS_JWT_SEMANTICS,
  DISCARDED_PASSWORD_BYTES,
  FORCE_RESET_ACTION,
  FORCE_RESET_PASSWORD_MIN_LENGTH,
  RESET_TOKEN_TTL_MS,
  forceInvalidatePassword,
  generateDiscardedPassword,
  generateResetToken,
  resetForceResetLocksForTests,
  type ForceResetDeps,
  type PublicUserRow,
} from '../force-password-reset'

const AUTH_ID = '322e7ee8-9443-40aa-8d8a-8ab0b000a0ef'
const PUBLIC_ID = '64a167c8-8da8-42b0-9212-32dcf7bc4759'
const TENANT_ID = '64259d68-195a-4c68-8875-f1b44d962830'
const ACTOR_AUTH = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const AUTH_ONLY = '2bf686d2-216b-4433-8f8a-d963b535c807'

const publicUser: PublicUserRow = {
  id: PUBLIC_ID,
  auth_user_id: AUTH_ID,
  email: 'user@example.test',
  first_name: 'Alex',
  tenant_id: TENANT_ID,
}

function makeDeps(overrides: Partial<ForceResetDeps> = {}) {
  const calls = {
    passwords: [] as string[],
    revoked: [] as string[],
    expired: [] as string[],
    tokens: [] as Array<{ publicUserId: string; email: string; token: string; expiresAt: string }>,
    emails: [] as Array<{ to: string; firstName: string | null; resetLink: string; tenantId: string | null }>,
    audits: [] as any[],
  }

  const deps: ForceResetDeps = {
    findPublicUser: vi.fn(async () => publicUser),
    updateUserPassword: vi.fn(async (_id, password) => {
      calls.passwords.push(password)
    }),
    revokeAllSessions: vi.fn(async (id) => {
      calls.revoked.push(id)
      return 310
    }),
    closeImpersonations: vi.fn(async () => {}),
    expireUnusedResetTokens: vi.fn(async (id) => {
      calls.expired.push(id)
    }),
    createResetToken: vi.fn(async (row) => {
      calls.tokens.push(row)
    }),
    sendRecoveryEmail: vi.fn(async (row) => {
      calls.emails.push(row)
    }),
    audit: vi.fn(async (entry) => {
      calls.audits.push(entry)
    }),
    randomPassword: () => 'CSPRNG-temp-password-value-XXXX',
    randomToken: () => 'a'.repeat(64),
    appBaseUrl: 'https://app.simy.ch',
    resolveTenantSlug: vi.fn(async () => 'driving-team'),
    now: () => new Date('2026-09-21T06:00:00.000Z'),
    ...overrides,
  }

  return { deps, calls }
}

describe('generateDiscardedPassword', () => {
  it('meets Simy minimum length and is not derived from identity', () => {
    const a = generateDiscardedPassword()
    const b = generateDiscardedPassword()
    expect(a.length).toBeGreaterThanOrEqual(FORCE_RESET_PASSWORD_MIN_LENGTH)
    expect(b.length).toBeGreaterThanOrEqual(FORCE_RESET_PASSWORD_MIN_LENGTH)
    expect(FORCE_RESET_PASSWORD_MIN_LENGTH).toBe(12)
    expect(a).not.toEqual(b)
    expect(a).not.toContain(AUTH_ID)
    expect(a).not.toContain('user@example.test')
    expect(DISCARDED_PASSWORD_BYTES).toBe(32)
  })

  it('reset tokens are 64-hex and unique', () => {
    const a = generateResetToken()
    const b = generateResetToken()
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toEqual(b)
  })
})

describe('forceInvalidatePassword success path', () => {
  beforeEach(() => {
    resetForceResetLocksForTests()
  })

  it('invalidates password, revokes ALL sessions, and dispatches one recovery link', async () => {
    const { deps, calls } = makeDeps()
    const result = await forceInvalidatePassword({ authUserId: AUTH_ID }, { authUserId: ACTOR_AUTH }, deps)

    expect(result.complete).toBe(true)
    expect(result.password_changed).toBe(true)
    expect(result.sessions_revoked).toBe(true)
    expect(result.sessions_revoked_count).toBe(310)
    expect(result.recovery_required).toBe(true)
    expect(result.recovery_dispatched).toBe(true)
    expect(result.access_jwt).toBe(ACCESS_JWT_SEMANTICS)
    expect(result.error).toBeUndefined()

    expect(calls.passwords).toHaveLength(1)
    expect(calls.passwords[0]).toBe('CSPRNG-temp-password-value-XXXX')
    expect(calls.revoked).toEqual([AUTH_ID])
    expect(calls.expired).toEqual([PUBLIC_ID])
    expect(calls.tokens).toHaveLength(1)
    expect(calls.tokens[0].token).toBe('a'.repeat(64))
    expect(calls.emails).toHaveLength(1)
    expect(calls.emails[0].resetLink).toBe(
      `https://app.simy.ch/password-reset?token=${'a'.repeat(64)}&tenant=driving-team`,
    )
    expect(calls.emails[0].resetLink).not.toContain('CSPRNG')
    expect(JSON.stringify(calls.audits[0])).not.toContain('CSPRNG-temp-password')
    expect(JSON.stringify(calls.audits[0])).not.toContain('a'.repeat(64))
    expect(calls.audits[0].action).toBe(FORCE_RESET_ACTION)
    expect(calls.audits[0].status).toBe('success')
    expect(calls.audits[0].details.sessions_revoked_count).toBe(310)
  })

  it('treats zero live sessions as successful revoke', async () => {
    const { deps } = makeDeps({
      revokeAllSessions: vi.fn(async () => 0),
    })
    const result = await forceInvalidatePassword({ publicUserId: PUBLIC_ID }, { authUserId: ACTOR_AUTH }, deps)
    expect(result.complete).toBe(true)
    expect(result.sessions_revoked).toBe(true)
    expect(result.sessions_revoked_count).toBe(0)
  })

  it('uses a 1 hour recovery TTL', () => {
    expect(RESET_TOKEN_TTL_MS).toBe(60 * 60 * 1000)
  })
})

describe('forceInvalidatePassword failure modes', () => {
  beforeEach(() => {
    resetForceResetLocksForTests()
  })

  it('does not revoke sessions when password update fails', async () => {
    const { deps, calls } = makeDeps({
      updateUserPassword: vi.fn(async () => {
        throw new Error('gotrue rejected')
      }),
    })
    const result = await forceInvalidatePassword({ authUserId: AUTH_ID }, { authUserId: ACTOR_AUTH }, deps)
    expect(result.complete).toBe(false)
    expect(result.password_changed).toBe(false)
    expect(result.sessions_revoked).toBe(false)
    expect(result.recovery_dispatched).toBe(false)
    expect(result.error?.code).toBe('PASSWORD_UPDATE_FAILED')
    expect(calls.revoked).toEqual([])
    expect(calls.emails).toEqual([])
    expect(calls.audits[0].status).toBe('failed')
  })

  it('does not report complete success when session revoke fails after password change', async () => {
    const { deps, calls } = makeDeps({
      revokeAllSessions: vi.fn(async () => {
        throw new Error('rpc failed')
      }),
    })
    const result = await forceInvalidatePassword({ authUserId: AUTH_ID }, { authUserId: ACTOR_AUTH }, deps)
    expect(result.complete).toBe(false)
    expect(result.password_changed).toBe(true)
    expect(result.sessions_revoked).toBe(false)
    expect(result.recovery_required).toBe(true)
    expect(result.recovery_dispatched).toBe(false)
    expect(result.error?.code).toBe('SESSION_REVOKE_FAILED')
    expect(calls.emails).toEqual([])
    expect(calls.audits[0].status).toBe('partial')
  })

  it('does not roll back the password when recovery email fails', async () => {
    const { deps, calls } = makeDeps({
      sendRecoveryEmail: vi.fn(async () => {
        throw new Error('resend down')
      }),
    })
    const result = await forceInvalidatePassword({ authUserId: AUTH_ID }, { authUserId: ACTOR_AUTH }, deps)
    expect(result.complete).toBe(false)
    expect(result.password_changed).toBe(true)
    expect(result.sessions_revoked).toBe(true)
    expect(result.recovery_required).toBe(true)
    expect(result.recovery_dispatched).toBe(false)
    expect(result.error?.code).toBe('RECOVERY_EMAIL_FAILED')
    expect(calls.passwords).toHaveLength(1)
    expect(calls.audits[0].status).toBe('partial')
  })

  it('rejects AUTH_ONLY accounts without creating a public.users row', async () => {
    const findPublicUser = vi.fn(async () => null)
    const updateUserPassword = vi.fn()
    const { deps } = makeDeps({ findPublicUser, updateUserPassword })
    const result = await forceInvalidatePassword({ authUserId: AUTH_ONLY }, { authUserId: ACTOR_AUTH }, deps)
    expect(result.complete).toBe(false)
    expect(result.error?.code).toBe('AUTH_ONLY_NO_PUBLIC_ROW')
    expect(updateUserPassword).not.toHaveBeenCalled()
    expect(findPublicUser).toHaveBeenCalledTimes(1)
  })

  it('rejects pending public rows without an auth user', async () => {
    const { deps, calls } = makeDeps({
      findPublicUser: vi.fn(async () => ({ ...publicUser, auth_user_id: null })),
    })
    const result = await forceInvalidatePassword({ publicUserId: PUBLIC_ID }, { authUserId: ACTOR_AUTH }, deps)
    expect(result.error?.code).toBe('NO_AUTH_USER')
    expect(calls.passwords).toEqual([])
  })

  it('rejects self-reset', async () => {
    const { deps, calls } = makeDeps()
    const result = await forceInvalidatePassword({ authUserId: AUTH_ID }, { authUserId: AUTH_ID }, deps)
    expect(result.error?.code).toBe('SELF_RESET_FORBIDDEN')
    expect(calls.passwords).toEqual([])
  })
})

describe('forceInvalidatePassword idempotency', () => {
  beforeEach(() => {
    resetForceResetLocksForTests()
  })

  it('can run twice sequentially and issues one fresh recovery each time', async () => {
    const { deps, calls } = makeDeps()
    const first = await forceInvalidatePassword({ authUserId: AUTH_ID }, { authUserId: ACTOR_AUTH }, deps)
    const second = await forceInvalidatePassword({ authUserId: AUTH_ID }, { authUserId: ACTOR_AUTH }, deps)
    expect(first.complete).toBe(true)
    expect(second.complete).toBe(true)
    expect(calls.passwords).toHaveLength(2)
    expect(calls.revoked).toHaveLength(2)
    expect(calls.expired).toHaveLength(2)
    expect(calls.emails).toHaveLength(2)
  })

  it('rejects a parallel second execution for the same user', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const { deps } = makeDeps({
      updateUserPassword: vi.fn(async () => {
        await gate
      }),
    })
    const first = forceInvalidatePassword({ authUserId: AUTH_ID }, { authUserId: ACTOR_AUTH }, deps)
    await vi.waitFor(() => expect(deps.updateUserPassword).toHaveBeenCalled())
    const second = await forceInvalidatePassword({ authUserId: AUTH_ID }, { authUserId: ACTOR_AUTH }, deps)
    expect(second.complete).toBe(false)
    expect(second.error?.code).toBe('IN_PROGRESS')
    release()
    const finished = await first
    expect(finished.complete).toBe(true)
  })
})

describe('force-reset source contracts', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const utilSrc = readFileSync(resolve(here, '../force-password-reset.ts'), 'utf8')
  const apiSrc = readFileSync(resolve(here, '../../api/admin/force-password-reset.post.ts'), 'utf8')
  const policySrc = readFileSync(resolve(here, '../../../composables/usePasswordStrength.ts'), 'utf8')

  it('keeps the discarded-password minimum aligned with the app policy', () => {
    expect(policySrc).toContain('export const PASSWORD_MIN_LENGTH = 12')
    expect(utilSrc).toContain('export const FORCE_RESET_PASSWORD_MIN_LENGTH = 12')
  })

  it('never writes encrypted_password in SQL', () => {
    expect(utilSrc).not.toMatch(/encrypted_password/)
    expect(apiSrc).not.toMatch(/encrypted_password/)
  })

  it('uses admin.updateUserById and all-session revoke', () => {
    expect(utilSrc).toContain('updateUserById')
    expect(utilSrc).toContain('revokeAuthSessions')
    expect(utilSrc).toContain('revokeAuthSessions(supabase, authUserId, null)')
  })

  it('documents access JWT residual', () => {
    expect(utilSrc).toContain("VALID_UNTIL_EXPIRY")
    expect(apiSrc).toContain('ACCESS_JWT_SEMANTICS')
  })

  it('core util does not import h3 or Vue', () => {
    expect(utilSrc).not.toMatch(/from 'h3'/)
    expect(utilSrc).not.toMatch(/from 'vue'/)
  })

  it('HTTP wrapper is super_admin only and does not return secrets', () => {
    expect(apiSrc).toContain('requireSuperAdmin')
    expect(apiSrc).not.toContain('password:')
    expect(apiSrc).not.toContain('token:')
    expect(apiSrc).not.toMatch(/temporary password/i)
  })

  it('recovery copy does not include a temporary password', () => {
    expect(utilSrc).toContain('Es wird kein temporäres Passwort per E-Mail verschickt')
    expect(utilSrc).not.toMatch(/Your temporary password/i)
  })
})
