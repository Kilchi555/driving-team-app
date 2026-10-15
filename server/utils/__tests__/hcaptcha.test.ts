import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('hcaptcha', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('skips when secret missing and not required', async () => {
    vi.stubEnv('HCAPTCHA_SECRET_KEY', '')
    const { verifyHCaptcha } = await import('../hcaptcha')
    const res = await verifyHCaptcha(undefined, { requireConfigured: false })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.skipped).toBe(true)
  })

  it('requires token when secret is configured', async () => {
    vi.stubEnv('HCAPTCHA_SECRET_KEY', 'sec')
    const { verifyHCaptcha } = await import('../hcaptcha')
    const res = await verifyHCaptcha('', { requireConfigured: true })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe('missing_token')
  })

  it('accepts provider success', async () => {
    vi.stubEnv('HCAPTCHA_SECRET_KEY', 'sec')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ success: true }),
      })),
    )
    const { verifyHCaptcha } = await import('../hcaptcha')
    const res = await verifyHCaptcha('token-long-enough', { requireConfigured: true })
    expect(res.ok).toBe(true)
  })

  it('tenantRegisterRequiresHcaptcha is opt-in only', async () => {
    vi.stubEnv('HCAPTCHA_SECRET_KEY', 'sec')
    vi.stubEnv('TENANT_REGISTER_REQUIRE_HCAPTCHA', '')
    const { tenantRegisterRequiresHcaptcha } = await import('../hcaptcha')
    expect(tenantRegisterRequiresHcaptcha()).toBe(false)

    vi.resetModules()
    vi.stubEnv('HCAPTCHA_SECRET_KEY', 'sec')
    vi.stubEnv('TENANT_REGISTER_REQUIRE_HCAPTCHA', '1')
    const mod2 = await import('../hcaptcha')
    expect(mod2.tenantRegisterRequiresHcaptcha()).toBe(true)
  })
})
