import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getBrandingCache: vi.fn(),
  getSupabaseAdmin: vi.fn(),
}))

vi.mock('~/server/utils/branding-cache', () => ({
  getBrandingCache: mocks.getBrandingCache,
}))

vi.mock('~/server/utils/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}))

function tenantsClient(rows: Record<string, Record<string, unknown> | null>) {
  const eqs: Array<{ col: string; val: unknown }> = []
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((col: string, val: unknown) => {
      eqs.push({ col, val })
      return builder
    }),
    maybeSingle: vi.fn(async () => {
      const slug = String(eqs.find((e) => e.col === 'slug')?.val || '')
      const active = eqs.find((e) => e.col === 'is_active')?.val
      expect(active).toBe(true)
      const data = rows[slug] ?? null
      return { data, error: null }
    }),
  }
  return {
    eqs,
    from: vi.fn((table: string) => {
      expect(table).toBe('tenants')
      return builder
    }),
  }
}

describe('loadTenantOgSource slug isolation', () => {
  beforeEach(() => {
    mocks.getBrandingCache.mockReset()
    mocks.getSupabaseAdmin.mockReset()
    mocks.getBrandingCache.mockReturnValue(null)
  })

  async function load() {
    const mod = await import('../tenant-og')
    mod.resetTenantOgSourceCache()
    return mod.loadTenantOgSource
  }

  it('looks up only the requested slug and active tenants', async () => {
    const client = tenantsClient({
      hakuco: { name: 'Hakuco', slug: 'hakuco', brand_name: 'Hakuco' },
      'fahrschule-gemperli': { name: 'Fahrschule Gemperli', slug: 'fahrschule-gemperli' },
    })
    mocks.getSupabaseAdmin.mockReturnValue(client)
    const loadTenantOgSource = await load()
    const source = await loadTenantOgSource('hakuco')
    expect(source?.slug).toBe('hakuco')
    expect(source?.name).toBe('Hakuco')
    expect(client.eqs.filter((e) => e.col === 'slug').map((e) => e.val)).toEqual(['hakuco'])
    expect(source?.name).not.toBe('Fahrschule Gemperli')
  })

  it('returns null for unknown tenants instead of a platform fallback tenant', async () => {
    const client = tenantsClient({})
    mocks.getSupabaseAdmin.mockReturnValue(client)
    const loadTenantOgSource = await load()
    await expect(loadTenantOgSource('unknown-school')).resolves.toBeNull()
  })

  it('rejects branding-cache rows whose slug does not match the lookup key', async () => {
    mocks.getBrandingCache.mockImplementation((key: string) => {
      if (key === 'slug:hakuco') {
        return { name: 'Fahrschule Gemperli', slug: 'fahrschule-gemperli', brand_name: 'Gemperli' }
      }
      return null
    })
    const client = tenantsClient({
      hakuco: { name: 'Hakuco', slug: 'hakuco', brand_name: 'Hakuco' },
    })
    mocks.getSupabaseAdmin.mockReturnValue(client)
    const loadTenantOgSource = await load()
    const source = await loadTenantOgSource('hakuco')
    expect(source?.slug).toBe('hakuco')
    expect(source?.name).toBe('Hakuco')
    expect(source?.name).not.toContain('Gemperli')
  })
})
