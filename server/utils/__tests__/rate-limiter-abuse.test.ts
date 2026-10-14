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

  it('awaits insert and blocks after max attempts (insert-then-count fallback)', async () => {
    type RateRow = { created_at: string; status: string; operation: string }
    const rows: RateRow[] = []
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              order: vi.fn(async () => ({
                data: rows.map((r) => ({ created_at: r.created_at, status: r.status })),
                error: null,
              })),
              limit: vi.fn(async () => ({
                data: rows
                  .slice()
                  .reverse()
                  .map((r) => ({ created_at: r.created_at, status: r.status })),
                error: null,
              })),
            })),
          })),
        })),
      })),
      insert: vi.fn(async (payload: RateRow & Record<string, unknown>) => {
        rows.push({
          created_at: new Date().toISOString(),
          status: String(payload.status),
          operation: String(payload.operation),
        })
        return { error: null }
      }),
    }))

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({
        from,
        rpc: vi.fn(async () => ({ data: null, error: { message: 'function missing' } })),
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
    // Third deny may be served from process cache after two persisted allows.
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(rows.every((r) => r.operation === 'tenant_register')).toBe(true)
  })

  it('fails closed when insert persistence errors for abuse ops', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  order: async () => ({ data: [], error: null }),
                  limit: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          }),
          insert: async () => ({ error: { message: 'CHECK constraint' } }),
        }),
        rpc: async () => ({ data: null, error: { message: 'missing' } }),
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

  it('uses atomic RPC result when available', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: () => ({
        rpc: async () => ({
          data: [{ allowed: false, request_count: 4, retry_after_seconds: 120 }],
          error: null,
        }),
        from: vi.fn(),
      }),
    }))

    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

    const { checkRateLimit, __resetRateLimitCacheForTests } = await import('../rate-limiter')
    __resetRateLimitCacheForTests()

    const result = await checkRateLimit('198.51.100.2', 'tenant_register', 3, 3600_000)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBe(120)
  })
})
