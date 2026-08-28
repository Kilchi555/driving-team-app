import { describe, expect, it } from 'vitest'
import {
  AuthEmailClaimCode,
  claimOrCreateAuthUser,
  decideClientEmailClaim,
  isSupabaseEmailTakenError,
  isUniqueAuthUserIdViolation,
  messageForAuthEmailClaimCode,
  pendingContactMismatch,
  publicEmailCheckAvailable,
} from '../auth-email-claim'

const pendingId = 'pending-user'
const otherId = 'other-user'
const authId = 'auth-user'

describe('decideClientEmailClaim', () => {
  it('rejects invalid email', () => {
    const result = decideClientEmailClaim({
      email: 'not-an-email',
      tenantClientWithAuth: null,
      authUser: null,
      linkedProfileIds: [],
    })
    expect(result.code).toBe(AuthEmailClaimCode.INVALID)
    expect(result.availableForAccount).toBe(false)
    expect(result.availableForGuestBooking).toBe(false)
  })

  it('allows a free email', () => {
    const result = decideClientEmailClaim({
      email: 'new@example.com',
      tenantClientWithAuth: null,
      authUser: null,
      linkedProfileIds: [],
    })
    expect(result.code).toBe(AuthEmailClaimCode.AVAILABLE)
    expect(result.availableForAccount).toBe(true)
    expect(result.availableForGuestBooking).toBe(true)
  })

  it('blocks an activated client in the same tenant', () => {
    const result = decideClientEmailClaim({
      email: 'taken@example.com',
      tenantClientWithAuth: { id: otherId },
      authUser: { id: authId },
      linkedProfileIds: [otherId],
    })
    expect(result.code).toBe(AuthEmailClaimCode.TENANT_CLIENT_EXISTS)
    expect(result.availableForAccount).toBe(false)
    expect(result.availableForGuestBooking).toBe(false)
  })

  it('does not treat the pending row as a tenant conflict', () => {
    const result = decideClientEmailClaim({
      email: 'self@example.com',
      tenantClientWithAuth: { id: pendingId },
      authUser: null,
      linkedProfileIds: [],
      excludeUserId: pendingId,
    })
    expect(result.code).toBe(AuthEmailClaimCode.AVAILABLE)
  })

  it('blocks when auth is already linked to another profile', () => {
    const result = decideClientEmailClaim({
      email: 'staff@example.com',
      tenantClientWithAuth: null,
      authUser: { id: authId },
      linkedProfileIds: [otherId],
      excludeUserId: pendingId,
    })
    expect(result.code).toBe(AuthEmailClaimCode.AUTH_LINKED_ELSEWHERE)
    expect(result.availableForAccount).toBe(false)
    expect(result.availableForGuestBooking).toBe(true)
  })

  it('does not let onboarding reset an orphan auth password', () => {
    const result = decideClientEmailClaim({
      email: 'orphan@example.com',
      tenantClientWithAuth: null,
      authUser: { id: authId },
      linkedProfileIds: [],
      excludeUserId: pendingId,
    })
    expect(result.code).toBe(AuthEmailClaimCode.ORPHAN_CLAIMABLE)
    expect(result.availableForAccount).toBe(false)
    expect(result.availableForGuestBooking).toBe(true)
  })

  it('fails closed for account creation when Auth lookup errors', () => {
    const result = decideClientEmailClaim({
      email: 'lookup@example.com',
      tenantClientWithAuth: null,
      authUser: null,
      authLookupFailed: true,
      linkedProfileIds: [],
    })
    expect(result.code).toBe(AuthEmailClaimCode.AUTH_LOOKUP_FAILED)
    expect(result.availableForAccount).toBe(false)
    expect(result.availableForGuestBooking).toBe(true)
  })
})

describe('publicEmailCheckAvailable', () => {
  it('hides global Auth hits from untrusted account checks', () => {
    const linked = decideClientEmailClaim({
      email: 'staff@example.com',
      tenantClientWithAuth: null,
      authUser: { id: authId },
      linkedProfileIds: [otherId],
    })
    expect(publicEmailCheckAvailable(linked, 'account')).toBe(true)
    expect(publicEmailCheckAvailable(linked, 'booking')).toBe(true)
  })

  it('still blocks same-tenant activated clients on public checks', () => {
    const taken = decideClientEmailClaim({
      email: 'local@example.com',
      tenantClientWithAuth: { id: otherId },
      authUser: { id: authId },
      linkedProfileIds: [otherId],
    })
    expect(publicEmailCheckAvailable(taken, 'account')).toBe(false)
    expect(publicEmailCheckAvailable(taken, 'booking')).toBe(false)
  })
})

describe('pendingContactMismatch', () => {
  it('detects phone swap on an email-matched pending account', () => {
    expect(pendingContactMismatch({
      storedEmail: 'victim@example.com',
      storedPhone: '+41791111111',
      incomingEmail: 'victim@example.com',
      incomingPhone: '+41792222222',
      matchedByEmail: true,
      matchedByPhone: false,
    })).toBe(true)
  })

  it('allows the same phone in a different format', () => {
    expect(pendingContactMismatch({
      storedEmail: 'a@example.com',
      storedPhone: '+41 79 111 11 11',
      incomingEmail: 'a@example.com',
      incomingPhone: '0791111111',
      matchedByEmail: true,
      matchedByPhone: true,
    })).toBe(false)
  })
})

describe('messageForAuthEmailClaimCode', () => {
  it('maps codes to German copy', () => {
    expect(messageForAuthEmailClaimCode(AuthEmailClaimCode.AUTH_LINKED_ELSEWHERE)).toMatch(/anderen Konto/)
    expect(messageForAuthEmailClaimCode(AuthEmailClaimCode.ORPHAN_CLAIMABLE)).toMatch(/Passwort/)
    expect(messageForAuthEmailClaimCode('UNKNOWN')).toBeNull()
  })
})

describe('isSupabaseEmailTakenError', () => {
  it('detects Auth already-registered copy', () => {
    expect(isSupabaseEmailTakenError('User already registered')).toBe(true)
    expect(isSupabaseEmailTakenError('Database error saving new user')).toBe(false)
  })
})

describe('isUniqueAuthUserIdViolation', () => {
  it('detects the auth_user_id unique index', () => {
    expect(isUniqueAuthUserIdViolation({ code: '23505', message: 'duplicate key value violates unique constraint "users_auth_user_id_uidx"' })).toBe(true)
    expect(isUniqueAuthUserIdViolation({ code: '23505', message: 'duplicate key value violates unique constraint "users_email_tenant_unique"' })).toBe(false)
  })
})

function mockSupabase(opts: {
  tenantClient?: { id: string } | null
  authUser?: { id: string } | null
  linkedIds?: string[]
  createUser?: { id?: string; error?: { message: string } }
}) {
  return {
    from: (table: string) => {
      const result = table === 'users' && opts.linkedIds
        ? { data: opts.linkedIds.map(id => ({ id })), error: null }
        : { data: opts.tenantClient ?? null, error: null }
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        not: () => chain,
        neq: () => chain,
        maybeSingle: async () => ({ data: opts.tenantClient ?? null, error: null }),
        then: (resolve: any) => resolve(result),
      }
      return chain
    },
    auth: {
      admin: {
        getUserByEmail: async () => ({
          data: opts.authUser ? { user: opts.authUser } : { user: null },
          error: opts.authUser ? null : { message: 'User not found', status: 404 },
        }),
        createUser: async () => ({
          data: opts.createUser?.id ? { user: { id: opts.createUser.id } } : { user: null },
          error: opts.createUser?.error || null,
        }),
        updateUserById: async () => {
          throw new Error('updateUserById must not be used for email claim')
        },
      },
    },
  } as any
}

describe('claimOrCreateAuthUser', () => {
  const base = {
    email: 'new@example.com',
    password: 'a-strong-password-12',
    tenantId: 'tenant-1',
    excludeUserId: 'pending-user',
  }

  it('creates a new auth user when the email is free', async () => {
    const supabase = mockSupabase({ createUser: { id: 'new-auth' } })
    await expect(claimOrCreateAuthUser({ ...base, supabase })).resolves.toEqual({ authUserId: 'new-auth' })
  })

  it('refuses to set a password on an orphan auth user', async () => {
    const supabase = mockSupabase({
      authUser: { id: 'orphan-auth' },
      linkedIds: [],
    })
    await expect(claimOrCreateAuthUser({ ...base, supabase })).rejects.toMatchObject({
      statusCode: 409,
      data: { code: AuthEmailClaimCode.ORPHAN_CLAIMABLE },
    })
  })

  it('refuses to claim an auth user linked to another profile', async () => {
    const supabase = mockSupabase({
      authUser: { id: 'staff-auth' },
      linkedIds: ['other-user'],
    })
    await expect(claimOrCreateAuthUser({ ...base, supabase })).rejects.toMatchObject({
      statusCode: 409,
      data: { code: AuthEmailClaimCode.AUTH_LINKED_ELSEWHERE },
    })
  })
})
