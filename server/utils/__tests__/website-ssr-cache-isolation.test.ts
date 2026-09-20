import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mintWebsitePreviewToken } from '../website-preview-token'
import {
  WEBSITE_NO_STORE_HEADERS,
  websiteHtmlResponsesShareIsrCache,
  websiteHtmlResponsesSharePublicCdnEntry,
  websitePublicSsrRouteRule,
} from '~/utils/website-ssr-route-policy'

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(async () => null as { tenant_id?: string } | null),
}))

vi.mock('~/server/utils/auth', () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

const root = resolve(process.cwd())

function prospectClient(row: Record<string, unknown> | null) {
  const api: any = {
    select: () => api,
    eq: () => api,
    maybeSingle: async () => ({ data: row, error: null }),
  }
  return {
    from: (table: string) => {
      if (table !== 'website_prospects') throw new Error(`unexpected table ${table}`)
      return api
    },
  }
}

async function expectDenied(fn: () => Promise<unknown>) {
  await expect(fn()).rejects.toMatchObject({ statusCode: 404, statusMessage: 'Website not found' })
}

describe('website SSR/CDN cache isolation (T1–T8)', () => {
  beforeEach(() => {
    mocks.getAuthenticatedUser.mockReset()
    mocks.getAuthenticatedUser.mockResolvedValue(null)
  })

  it('T1 published + no token => allowed', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    const access = await authorizePublicWebsiteAccess({
      supabase: prospectClient(null),
      website: { id: 'site-a', tenant_id: 'tenant-a', is_published: true },
      previewRaw: undefined,
    })
    expect(access).toEqual({ preview: false, prospectId: null })
  })

  it('T2 unpublished + no token => 404 / denied', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        supabase: prospectClient(null),
        website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
        previewRaw: undefined,
      }),
    )
  })

  it('T3 unpublished + valid token => allowed', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    const minted = mintWebsitePreviewToken()
    const access = await authorizePublicWebsiteAccess({
      supabase: prospectClient({
        id: 'prospect-a',
        tenant_id: 'tenant-a',
        website_id: 'site-a',
        preview_token_hash: minted.hash,
        preview_expires_at: minted.expiresAt.toISOString(),
        preview_revoked_at: null,
      }),
      website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
      previewRaw: minted.token,
    })
    expect(access).toEqual({ preview: true, prospectId: 'prospect-a' })
  })

  it('T4 unpublished + expired token => denied', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    const minted = mintWebsitePreviewToken()
    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        supabase: prospectClient({
          id: 'prospect-a',
          tenant_id: 'tenant-a',
          website_id: 'site-a',
          preview_token_hash: minted.hash,
          preview_expires_at: new Date(Date.now() - 60_000).toISOString(),
          preview_revoked_at: null,
        }),
        website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
        previewRaw: minted.token,
      }),
    )
  })

  it('T5 unpublished + revoked token => denied', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    const minted = mintWebsitePreviewToken()
    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        supabase: prospectClient({
          id: 'prospect-a',
          tenant_id: 'tenant-a',
          website_id: 'site-a',
          preview_token_hash: minted.hash,
          preview_expires_at: minted.expiresAt.toISOString(),
          preview_revoked_at: new Date().toISOString(),
        }),
        website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
        previewRaw: minted.token,
      }),
    )
  })

  it('T6 /s/example cannot reuse a response generated for /s/example?preview=TOKEN', () => {
    expect(websitePublicSsrRouteRule.isr).toBe(false)
    expect(websiteHtmlResponsesShareIsrCache('/s/example', '/s/example?preview=TOKEN')).toBe(false)
    expect(websiteHtmlResponsesShareIsrCache('/s/example?preview=TOKEN', '/s/example')).toBe(false)
    expect(websiteHtmlResponsesSharePublicCdnEntry('/s/example', '/s/example?preview=TOKEN')).toBe(false)
    expect(websiteHtmlResponsesSharePublicCdnEntry('/s/example?preview=TOKEN', '/s/example')).toBe(false)
    expect(websiteHtmlResponsesShareIsrCache('/s/example', '/s/example?preview=TOKEN', { isr: 60 })).toBe(
      true,
    )
  })

  it('T7 preview/unpublished HTML headers are private/no-store (supplementary)', () => {
    expect(websitePublicSsrRouteRule.headers).toEqual(WEBSITE_NO_STORE_HEADERS)
    expect(WEBSITE_NO_STORE_HEADERS['Cache-Control']).toBe('private, no-store')
    expect(WEBSITE_NO_STORE_HEADERS['CDN-Cache-Control']).toBe('private, no-store')
    expect(WEBSITE_NO_STORE_HEADERS['Vercel-CDN-Cache-Control']).toBe('private, no-store')
    const middleware = readFileSync(resolve(root, 'server/middleware/04.website-preview-cache.ts'), 'utf8')
    expect(middleware).toContain('WEBSITE_NO_STORE_HEADERS')
    expect(middleware).toContain('shouldApplyWebsitePreviewNoStore')
  })

  it('T8 removing the token cannot obtain unpublished HTML from a cached preview response', async () => {
    const { authorizePublicWebsiteAccess } = await import('../website-preview-access')
    const minted = mintWebsitePreviewToken()
    const allowed = await authorizePublicWebsiteAccess({
      supabase: prospectClient({
        id: 'prospect-a',
        tenant_id: 'tenant-a',
        website_id: 'site-a',
        preview_token_hash: minted.hash,
        preview_expires_at: minted.expiresAt.toISOString(),
        preview_revoked_at: null,
      }),
      website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
      previewRaw: minted.token,
    })
    expect(allowed.preview).toBe(true)

    expect(websiteHtmlResponsesShareIsrCache('/s/example?preview=' + minted.token, '/s/example')).toBe(
      false,
    )

    await expectDenied(() =>
      authorizePublicWebsiteAccess({
        supabase: prospectClient({
          id: 'prospect-a',
          tenant_id: 'tenant-a',
          website_id: 'site-a',
          preview_token_hash: minted.hash,
          preview_expires_at: minted.expiresAt.toISOString(),
          preview_revoked_at: null,
        }),
        website: { id: 'site-a', tenant_id: 'tenant-a', is_published: false },
        previewRaw: undefined,
      }),
    )
  })

  it('published-only SEO surfaces still require is_published', () => {
    const sitemap = readFileSync(resolve(root, 'server/routes/s/[subdomain]/sitemap.xml.ts'), 'utf8')
    const robots = readFileSync(resolve(root, 'server/routes/s/[subdomain]/robots.txt.ts'), 'utf8')
    const seo = readFileSync(resolve(root, 'server/utils/website-seo-context.ts'), 'utf8')
    expect(sitemap).toContain('if (!website?.is_published)')
    expect(robots).toContain('if (!website?.is_published)')
    expect(seo).toContain('if (!website?.is_published) return null')
  })

  it('does not re-introduce ISR or a second HTML cache layer on /s or public website APIs', () => {
    const nuxt = readFileSync(resolve(root, 'nuxt.config.ts'), 'utf8')
    expect(nuxt).not.toMatch(/isr:\s*60/)
    expect(nuxt).toContain("'/s/**': { ...websitePublicSsrRouteRule }")

    const publicHtmlHandlers = [
      'server/api/public/website/[subdomain].get.ts',
      'server/api/public/website/[subdomain]/[slug].get.ts',
      'server/api/public/website/[subdomain]/legal.get.ts',
      'server/api/public/website/[subdomain]/next-slots.get.ts',
      'server/api/public/website/[subdomain]/og.png.get.ts',
    ]
    for (const rel of publicHtmlHandlers) {
      const src = readFileSync(resolve(root, rel), 'utf8')
      expect(src, rel).not.toContain('defineCachedEventHandler')
      expect(src, rel).not.toContain('defineCachedFunction')
      expect(src, rel).toContain('loadAuthorizedPublicWebsite')
    }

    const reviews = readFileSync(
      resolve(root, 'server/api/public/website/[subdomain]/reviews.get.ts'),
      'utf8',
    )
    const authIndex = reviews.indexOf('loadAuthorizedPublicWebsite')
    const cacheIndex = reviews.indexOf('loadReviewsCached(')
    expect(authIndex).toBeGreaterThan(-1)
    expect(cacheIndex).toBeGreaterThan(authIndex)
  })
})
