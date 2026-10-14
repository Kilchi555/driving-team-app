import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/server/utils/email', () => ({
  sendEmail: vi.fn(async () => ({ messageId: 'msg_test' })),
}))

vi.mock('~/server/utils/registration-token', () => ({
  generateRegistrationToken: vi.fn(() => 'reg-token-abc'),
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

  it('rejects replayed / expired / mismatched tokens', async () => {
    const {
      consumeRegistrationEmailToken,
      hashRegistrationEmailToken,
      mintRegistrationEmailToken,
    } = await import('../registration-email-verification')

    const raw = mintRegistrationEmailToken()
    const hash = hashRegistrationEmailToken(raw)

    const tokenRow = {
      id: 'tok-1',
      tenant_id: '11111111-1111-1111-1111-111111111111',
      email_normalized: 'owner@example.com',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      used_at: null as string | null,
    }

    const tenant = {
      id: tokenRow.tenant_id,
      name: 'Acme',
      slug: 'acme',
      contact_email: 'owner@example.com',
      email_verified_at: null,
      registration_status: 'pending_email_verification',
      is_active: false,
    }

    const supabase = {
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
        throw new Error(`unexpected table ${table}`)
      }),
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    const first = await consumeRegistrationEmailToken(supabase, raw)
    expect(first.ok).toBe(true)
    if (first.ok) {
      expect(first.registrationToken).toBe('reg-token-abc')
      expect(first.email).toBe('owner@example.com')
    }

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
})
