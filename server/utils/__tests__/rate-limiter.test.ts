import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => null,
}))

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('fails closed for login when store is unavailable and returns retryAfter', async () => {
    const { checkRateLimit, __resetRateLimitCacheForTests } = await import('../rate-limiter')
    __resetRateLimitCacheForTests()
    const result = await checkRateLimit('10.0.0.1', 'login', 10, 60_000)
    expect(result.allowed).toBe(false)
    expect(result.storeUnavailable).toBe(true)
    expect(result.retryAfter).toBeGreaterThanOrEqual(1)
  })

  it('accepts legacy (key, max, windowMs) calls without throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { checkRateLimit, __resetRateLimitCacheForTests } = await import('../rate-limiter')
    __resetRateLimitCacheForTests()
    // @ts-expect-error intentional legacy signature
    const result = await checkRateLimit('legacy-key', 5, 60_000)
    // legacy_unscoped is not fail-closed → memory allow
    expect(result.allowed).toBe(true)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
