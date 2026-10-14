import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/server/utils/email', () => ({
  sendEmail: vi.fn(async () => ({ messageId: 'msg_test' })),
}))

vi.mock('~/server/utils/registration-token', () => ({
  generateRegistrationToken: vi.fn((tenantId: string) => `reg-token-for-${tenantId}`),
  isRegistrationTokenSecretConfigured: vi.fn(() => true),
}))

describe('registration-email-verification', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('normalizes emails consistently', async () => {
    const { normalizeRegistrationEmail } = await import('../registration-email-verification')
    expect(normalizeRegistrationEmail('  Foo.Bar@Example.COM ')).toBe('foo.bar@example.com')
  })

  it('hashes tokens without exposing the raw value', async () => {
    const { hashRegistrationEmailToken, mintRegistrationEmailToken } = await import(
      '../registration-email-verification'
    )
    const raw = mintRegistrationEmailToken()
    const hash = hashRegistrationEmailToken(raw)
    expect(hash).toHaveLength(64)
    expect(hash).not.toContain(raw)
  })

  it('isWithinRegistrationTokenReissueWindow fails closed on missing/malformed timestamps', async () => {
    const { isWithinRegistrationTokenReissueWindow } = await import(
      '../registration-email-verification'
    )
    const now = Date.parse('2026-10-14T12:00:00.000Z')
    expect(isWithinRegistrationTokenReissueWindow(null, now)).toBe(false)
    expect(isWithinRegistrationTokenReissueWindow(undefined, now)).toBe(false)
    expect(isWithinRegistrationTokenReissueWindow('', now)).toBe(false)
    expect(isWithinRegistrationTokenReissueWindow('not-a-date', now)).toBe(false)
    expect(isWithinRegistrationTokenReissueWindow('2026-10-14T11:59:59.000Z', now)).toBe(false)
    expect(isWithinRegistrationTokenReissueWindow('2026-10-14T12:00:01.000Z', now)).toBe(true)
  })

  it('reissues within expires_at, rejects after expiry, and does not extend the absolute window', async () => {
    const {
      consumeRegistrationEmailToken,
      hashRegistrationEmailToken,
      mintRegistrationEmailToken,
    } = await import('../registration-email-verification')

    const raw = mintRegistrationEmailToken()
    const hash = hashRegistrationEmailToken(raw)
    const fixedExpiresAt = new Date(Date.now() + 60_000).toISOString()

    const tokenRow = {
      id: 'tok-1',
      tenant_id: '11111111-1111-1111-1111-111111111111',
      email_normalized: 'owner@example.com',
      expires_at: fixedExpiresAt,
      used_at: null as string | null,
    }

    const tenant = {
      id: tokenRow.tenant_id,
      name: 'Acme',
      slug: 'acme',
      contact_email: 'owner@example.com',
      email_verified_at: null as string | null,
      registration_status: 'pending_email_verification',
      is_active: false,
    }

    let adminExists = false
    const supabase = {
      rpc: vi.fn(async () => ({ data: null, error: { message: 'function missing' } })),
      from: vi.fn((table: string) => {
        if (table === 'tenant_registration_email_tokens') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { ...tokenRow, token_hash: hash }, error: null }),
              }),
            }),
            update: () => ({
              eq: () => ({
                is: () => ({
                  select: () => ({
                    maybeSingle: async () => {
                      if (tokenRow.used_at) return { data: null, error: null }
                      tokenRow.used_at = new Date().toISOString()
                      return { data: { id: tokenRow.id }, error: null }
                    },
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'tenants') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: tenant, error: null }),
              }),
            }),
            update: () => ({
              eq: async () => {
                tenant.is_active = true
                tenant.email_verified_at = new Date().toISOString()
                tenant.registration_status = 'email_verified'
                return { error: null }
              },
            }),
          }
        }
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({
                      data: adminExists ? { id: 'admin-1' } : null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    const first = await consumeRegistrationEmailToken(supabase, raw)
    expect(first.ok).toBe(true)
    if (first.ok) {
      expect(first.registrationToken).toBe(`reg-token-for-${tokenRow.tenant_id}`)
    }

    // Within absolute window: refresh re-issues (expires_at unchanged).
    const refresh = await consumeRegistrationEmailToken(supabase, raw)
    expect(refresh.ok).toBe(true)
    expect(tokenRow.expires_at).toBe(fixedExpiresAt)

    // Repeated replay still uses the same absolute expires_at (not extended).
    const refresh2 = await consumeRegistrationEmailToken(supabase, raw)
    expect(refresh2.ok).toBe(true)
    expect(tokenRow.expires_at).toBe(fixedExpiresAt)

    // After absolute deadline: reject even though used_at is recent and no admin.
    tokenRow.expires_at = new Date(Date.now() - 1000).toISOString()
    const afterExpiry = await consumeRegistrationEmailToken(supabase, raw)
    expect(afterExpiry.ok).toBe(false)
    if (!afterExpiry.ok) expect(afterExpiry.reason).toBe('expired')

    // Restore window; after admin exists, replay stays rejected.
    tokenRow.expires_at = fixedExpiresAt
    adminExists = true
    const replay = await consumeRegistrationEmailToken(supabase, raw)
    expect(replay.ok).toBe(false)
    if (!replay.ok) expect(replay.reason).toBe('used')
  })

  it('rejects email mismatch after contact_email change', async () => {
    const {
      consumeRegistrationEmailToken,
      hashRegistrationEmailToken,
      mintRegistrationEmailToken,
    } = await import('../registration-email-verification')

    const raw = mintRegistrationEmailToken()
    const hash = hashRegistrationEmailToken(raw)

    const supabase = {
      rpc: vi.fn(async () => ({ data: null, error: { message: 'function missing' } })),
      from: vi.fn((table: string) => {
        if (table === 'tenant_registration_email_tokens') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'tok-2',
                    tenant_id: '22222222-2222-2222-2222-222222222222',
                    email_normalized: 'old@example.com',
                    expires_at: new Date(Date.now() + 60_000).toISOString(),
                    used_at: null,
                    token_hash: hash,
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: '22222222-2222-2222-2222-222222222222',
                  name: 'Acme',
                  slug: 'acme',
                  contact_email: 'new@example.com',
                  email_verified_at: null,
                  registration_status: 'pending_email_verification',
                  is_active: false,
                },
                error: null,
              }),
            }),
          }),
        }
      }),
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    const result = await consumeRegistrationEmailToken(supabase, raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('email_mismatch')
  })

  it('tenantAllowsPrivilegedOnboarding requires active + verified', async () => {
    const { tenantAllowsPrivilegedOnboarding } = await import('../registration-email-verification')
    expect(
      tenantAllowsPrivilegedOnboarding({
        is_active: false,
        email_verified_at: null,
        registration_status: 'pending_email_verification',
      }),
    ).toBe(false)
    expect(
      tenantAllowsPrivilegedOnboarding({
        is_active: true,
        email_verified_at: '2026-10-14T00:00:00Z',
        registration_status: 'email_verified',
      }),
    ).toBe(true)
  })

  it('refuses consume when registration token secret is not configured', async () => {
    const tokenMod = await import('~/server/utils/registration-token')
    vi.mocked(tokenMod.isRegistrationTokenSecretConfigured).mockReturnValueOnce(false)

    const { consumeRegistrationEmailToken } = await import('../registration-email-verification')
    const supabase = {
      rpc: vi.fn(async () => {
        throw new Error('should not call rpc')
      }),
      from: vi.fn(),
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    const result = await consumeRegistrationEmailToken(supabase, 'a'.repeat(40))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})
