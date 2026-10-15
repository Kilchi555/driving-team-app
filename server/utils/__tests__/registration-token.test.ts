import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const VALID_SECRET = 'a'.repeat(32)
const OTHER_SECRET = 'b'.repeat(32)
const TENANT_A = '11111111-1111-1111-1111-111111111111'
const TENANT_B = '22222222-2222-2222-2222-222222222222'

describe('registration-token secret fail-closed', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('rejects missing secret (no insecure fallback)', async () => {
    delete process.env.NUXT_REGISTRATION_TOKEN_SECRET
    const mod = await import('../registration-token')
    expect(mod.isRegistrationTokenSecretConfigured()).toBe(false)
    expect(() => mod.generateRegistrationToken(TENANT_A)).toThrow(/NUXT_REGISTRATION_TOKEN_SECRET/)
    expect(mod.verifyRegistrationToken('anything', TENANT_A)).toBe(false)
  })

  it('rejects empty / whitespace secret', async () => {
    vi.stubEnv('NUXT_REGISTRATION_TOKEN_SECRET', '   ')
    const mod = await import('../registration-token')
    expect(mod.isRegistrationTokenSecretConfigured()).toBe(false)
    expect(() => mod.generateRegistrationToken(TENANT_A)).toThrow()
    expect(mod.verifyRegistrationToken('x', TENANT_A)).toBe(false)
  })

  it('rejects too-short secret as invalid', async () => {
    vi.stubEnv('NUXT_REGISTRATION_TOKEN_SECRET', 'short-secret')
    const mod = await import('../registration-token')
    expect(mod.isRegistrationTokenSecretConfigured()).toBe(false)
    expect(() => mod.generateRegistrationToken(TENANT_A)).toThrow(/too short|not configured/)
  })

  it('mints and verifies with a valid secret', async () => {
    vi.stubEnv('NUXT_REGISTRATION_TOKEN_SECRET', VALID_SECRET)
    const mod = await import('../registration-token')
    expect(mod.isRegistrationTokenSecretConfigured()).toBe(true)
    const token = mod.generateRegistrationToken(TENANT_A)
    expect(token.length).toBeGreaterThan(20)
    expect(mod.verifyRegistrationToken(token, TENANT_A)).toBe(true)
  })

  it('rejects cross-tenant token misuse', async () => {
    vi.stubEnv('NUXT_REGISTRATION_TOKEN_SECRET', VALID_SECRET)
    const mod = await import('../registration-token')
    const token = mod.generateRegistrationToken(TENANT_A)
    expect(mod.verifyRegistrationToken(token, TENANT_B)).toBe(false)
  })

  it('does not verify tokens signed with a different secret', async () => {
    vi.stubEnv('NUXT_REGISTRATION_TOKEN_SECRET', VALID_SECRET)
    const mod = await import('../registration-token')
    const token = mod.generateRegistrationToken(TENANT_A)

    vi.resetModules()
    vi.stubEnv('NUXT_REGISTRATION_TOKEN_SECRET', OTHER_SECRET)
    const mod2 = await import('../registration-token')
    expect(mod2.verifyRegistrationToken(token, TENANT_A)).toBe(false)
  })

  it('never embeds the secret in errors or tokens', async () => {
    vi.stubEnv('NUXT_REGISTRATION_TOKEN_SECRET', VALID_SECRET)
    const mod = await import('../registration-token')
    const token = mod.generateRegistrationToken(TENANT_A)
    expect(token).not.toContain(VALID_SECRET)

    vi.resetModules()
    delete process.env.NUXT_REGISTRATION_TOKEN_SECRET
    const mod2 = await import('../registration-token')
    try {
      mod2.generateRegistrationToken(TENANT_A)
      expect.unreachable('should throw')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      expect(msg).not.toContain(VALID_SECRET)
      expect(msg.toLowerCase()).not.toContain('insecure-dev-secret')
    }
  })
})
