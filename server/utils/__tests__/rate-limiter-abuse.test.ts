import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('rate-limiter abuse protection', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('fails closed for tenant_register when Supabase is not configured', async () => {
    vi.stubEnv('SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const { checkRateLimit, __resetRateLimitCacheForTests } = await import('../rate-limiter')
    __resetRateLimitCacheForTests()
    const result = await checkRateLimit('203.0.113.10', 'tenant_register', 3, 3600_000)
    expect(result.allowed).toBe(false)
    expect(result.storeUnavailable).toBe(true)
    expect(result.retryAfter).toBeGreaterThanOrEqual(1)
  })

  it('uses atomic RPC and denies over-limit without relying on process memory', async () => {
    let calls = 0
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({
        rpc: async () => {
          calls += 1
          const allowed = calls <= 2
          return {
            data: [{ allowed, request_count: calls, retry_after_seconds: 3600 }],
            error: null,
          }
        },
        from: vi.fn(),
      }),
    }))

    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

    const { checkRateLimit, __resetRateLimitCacheForTests } = await import('../rate-limiter')
    __resetRateLimitCacheForTests()

    const a = await checkRateLimit('198.51.100.1', 'tenant_register', 2, 3600_000)
    const b = await checkRateLimit('198.51.100.1', 'tenant_register', 2, 3600_000)
    const c = await checkRateLimit('198.51.100.1', 'tenant_register', 2, 3600_000)

    expect(a.allowed).toBe(true)
    expect(b.allowed).toBe(true)
    expect(c.allowed).toBe(false)
    expect(calls).toBe(3)
  })

  it('fails closed when atomic RPC is missing for abuse ops (no racy fallback)', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({
        rpc: async () => ({ data: null, error: { message: 'function missing' } }),
        from: vi.fn(),
      }),
    }))

    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

    const { checkRateLimit, __resetRateLimitCacheForTests } = await import('../rate-limiter')
    __resetRateLimitCacheForTests()

    const result = await checkRateLimit('198.51.100.9', 'tenant_register', 3, 3600_000)
    expect(result.allowed).toBe(false)
    expect(result.storeUnavailable).toBe(true)
  })

  it('fails closed when RPC returns empty for create_admin', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({
        rpc: async () => ({ data: [], error: null }),
        from: vi.fn(),
      }),
    }))

    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

    const { checkRateLimit, __resetRateLimitCacheForTests } = await import('../rate-limiter')
    __resetRateLimitCacheForTests()

    const result = await checkRateLimit('198.51.100.2', 'create_admin', 5, 3600_000)
    expect(result.allowed).toBe(false)
    expect(result.storeUnavailable).toBe(true)
  })

  it('reproduces former CHECK mismatch: unsupported op names must not silently allow', async () => {
    // Historical bug: inserts with tenant_register failed CHECK and were ignored while
    // count stayed 0. Fail-closed + required RPC prevents that class of bypass.
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({
        rpc: async () => ({ data: null, error: { message: 'CHECK constraint' } }),
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  order: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          }),
          insert: async () => ({ error: { message: 'CHECK constraint' } }),
        }),
      }),
    }))

    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

    const { checkRateLimit, __resetRateLimitCacheForTests } = await import('../rate-limiter')
    __resetRateLimitCacheForTests()
    const result = await checkRateLimit('198.51.100.44', 'tenant_register', 3, 3600_000)
    expect(result.allowed).toBe(false)
  })

  it('allows login via awaited insert-then-count when atomic RPC is not migrated', async () => {
    let inserted = false
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({
        rpc: async () => ({ data: null, error: { message: 'function missing' } }),
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  order: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          }),
          insert: async () => {
            inserted = true
            return { error: null }
          },
        }),
      }),
    }))

    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

    const { checkRateLimit, __resetRateLimitCacheForTests } = await import('../rate-limiter')
    __resetRateLimitCacheForTests()

    const result = await checkRateLimit('198.51.100.77', 'login', 10, 60_000)
    expect(result.allowed).toBe(true)
    expect(result.storeUnavailable).toBeUndefined()
    expect(inserted).toBe(true)
  })
})
