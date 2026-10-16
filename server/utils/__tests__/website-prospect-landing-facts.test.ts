import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  prospectServicesFromScrape,
  prospectTenantBusinessType,
  prospectTestimonialsFromPlace,
  prospectUspsFromSources,
  prospectVerifiedContentFlags,
  resolveProspectBusinessType,
} from '../website-prospect-landing-facts'
import {
  authorizePublicWebsiteRead,
  ensureWebsitePreviewToken,
  hashPreviewToken,
  issueWebsitePreviewToken,
  previewUrlForPath,
  readPreviewToken,
} from '../website-preview-access'

function memorySupabase() {
  const rows = new Map<string, Record<string, unknown>>()
  return {
    rows,
    from(table: string) {
      return {
        select() {
          return {
            eq(_col: string, id: string) {
              return {
                maybeSingle: async () => ({
                  data: rows.get(`${table}:${id}`) || null,
                  error: null,
                }),
              }
            },
          }
        },
        update(patch: Record<string, unknown>) {
          return {
            eq: async (_col: string, id: string) => {
              const key = `${table}:${id}`
              rows.set(key, { ...(rows.get(key) || {}), ...patch })
              return { error: null }
            },
          }
        },
      }
    },
  }
}

describe('prospect landing factual integrity', () => {
  it('keeps missing business category unknown instead of inventing driving_school', () => {
    expect(resolveProspectBusinessType(null)).toBeNull()
    expect(resolveProspectBusinessType('')).toBeNull()
    expect(resolveProspectBusinessType('  ')).toBeNull()
    expect(prospectTenantBusinessType(null)).toBe('generic')
    expect(prospectTenantBusinessType('')).toBe('generic')
    expect(prospectTenantBusinessType('driving_school')).toBe('driving_school')
    expect(prospectTenantBusinessType('music_school')).toBe('music_school')
  })

  it('does not invent unsupported services or marketing USPs', () => {
    expect(prospectServicesFromScrape(null)).toEqual([])
    expect(prospectServicesFromScrape({ services: [] })).toEqual([])
    expect(prospectServicesFromScrape({ services: [{ name: '  ' }] })).toEqual([])
    expect(prospectUspsFromSources({})).toEqual([])
    expect(prospectUspsFromSources({ rating: null, city: null })).toEqual([])
    expect(prospectUspsFromSources({ rating: 0, city: '' })).toEqual([])
    const text = JSON.stringify({
      services: prospectServicesFromScrape(null),
      usps: prospectUspsFromSources({}),
    })
    expect(text).not.toContain('Autofahren')
    expect(text).not.toContain('Motorrad')
    expect(text).not.toContain('Transparente Preise')
    expect(text).not.toContain('Persönliche Betreuung')
  })

  it('preserves verified source facts through mapping', () => {
    const services = prospectServicesFromScrape({
      services: [
        { name: 'VKU', description: 'Verkehrskunde' },
        { name: 'Kat. B', description: '' },
      ],
    })
    expect(services).toEqual([
      { id: 'svc-1', name: 'VKU', description: 'Verkehrskunde' },
      { id: 'svc-2', name: 'Kat. B', description: '' },
    ])
    expect(prospectUspsFromSources({ rating: 4.8, city: 'Bern' })).toEqual([
      '4.8★ auf Google',
      'Lokal in Bern',
    ])
    const reviews = prospectTestimonialsFromPlace({
      reviews: [{ author: 'Alex', text: 'Sehr gut', rating: 5 }],
    })
    expect(reviews).toEqual([
      { id: 'rev-1', author: 'Alex', text: 'Sehr gut', rating: 5 },
    ])
  })

  it('leaves conflicting or incomplete review ratings unresolved (no default 5★)', () => {
    const reviews = prospectTestimonialsFromPlace({
      reviews: [
        { author: 'Sam', text: 'Ok', rating: null },
        { author: '', text: 'Ohne Autor', rating: undefined },
        { text: '' },
      ],
    })
    expect(reviews).toEqual([
      { id: 'rev-1', author: 'Sam', text: 'Ok' },
      { id: 'rev-2', author: 'Google', text: 'Ohne Autor' },
    ])
    expect(reviews.every((r) => r.rating === undefined)).toBe(true)
  })

  it('preserves user-supplied / prospect-level fields over empty scrape inventiveness', () => {
    // Empty scrape must not invent services; caller still keeps prospect.name/city as-is.
    const services = prospectServicesFromScrape({ services: null })
    expect(services).toEqual([])
    const usps = prospectUspsFromSources({ city: 'Winterthur', rating: null })
    expect(usps).toEqual(['Lokal in Winterthur'])
    expect(prospectVerifiedContentFlags()).toEqual({
      verified_hours_only: true,
      verified_prices_only: true,
    })
  })

  it('generate path no longer hard-codes fabricated driving-school fillers', () => {
    const source = readFileSync(resolve(process.cwd(), 'server/utils/website-prospect-generate.ts'), 'utf8')
    expect(source).not.toContain("name: 'Autofahren Kat. B'")
    expect(source).not.toContain("name: 'Motorrad'")
    expect(source).not.toContain("'Transparente Preise'")
    expect(source).not.toContain("'Persönliche Betreuung'")
    expect(source).not.toContain("|| 'driving_school'")
    expect(source).toContain('ensureWebsitePreviewToken')
    expect(source).toContain('previewUrlForPath')
    expect(source).toContain('prospectServicesFromScrape')
    expect(source).toContain('removeProspectUploadedPaths')
  })
})

describe('prospect preview token mint lifecycle', () => {
  it('tokenized prospect preview URL passes the canonical gate; bare path and bad tokens fail', async () => {
    const db = memorySupabase()
    const websiteId = 'website-prospect-1'
    const issued = await issueWebsitePreviewToken(db, websiteId)
    expect(issued).toBeTruthy()
    const previewUrl = previewUrlForPath('https://app.simy.ch', '/s/fahrschule-demo', issued!.token)
    expect(previewUrl).toContain('/s/fahrschule-demo')
    expect(previewUrl).toContain('preview_token=')
    expect(previewUrl).not.toMatch(/\/s\/fahrschule-demo$/)

    const token = readPreviewToken(Object.fromEntries(new URL(previewUrl).searchParams))
    expect(token).toBe(issued!.token)

    const draft = { id: websiteId, is_published: false }
    expect((await authorizePublicWebsiteRead(db, draft, {}, true)).ok).toBe(false)
    expect((await authorizePublicWebsiteRead(db, draft, { preview: '1' }, true)).ok).toBe(false)
    expect((await authorizePublicWebsiteRead(db, draft, { preview_token: 'short' }, true)).ok).toBe(false)
    expect((await authorizePublicWebsiteRead(db, draft, { preview_token: token }, true))).toMatchObject({
      ok: true,
      draft: true,
    })

    const published = { id: websiteId, is_published: true }
    expect((await authorizePublicWebsiteRead(db, published, {}, true))).toMatchObject({
      ok: true,
      draft: false,
    })
  })

  it('rejects expired tokens and does not fall back to a usable bare URL on mint failure', async () => {
    const db = memorySupabase()
    const issued = await issueWebsitePreviewToken(db, 'website-x')
    expect(issued).toBeTruthy()
    const stored = db.rows.get('website_tenants:website-x')
    db.rows.set('website_tenants:website-x', {
      ...stored,
      preview_token_expires_at: new Date(Date.now() - 1000).toISOString(),
    })
    const draft = { id: 'website-x', is_published: false }
    expect((await authorizePublicWebsiteRead(db, draft, { preview_token: issued!.token }, true)).ok).toBe(false)

    const failingDb = {
      from() {
        return {
          update() {
            return {
              eq: async () => ({ error: { message: 'write failed' } }),
            }
          },
        }
      },
    }
    const failed = await issueWebsitePreviewToken(failingDb, 'website-y')
    expect(failed).toBeNull()
    // Prospect generate must throw rather than store siteUrl without token.
    expect(failed).not.toEqual(expect.objectContaining({ token: expect.any(String) }))
  })

  it('deliberate issueWebsitePreviewToken rotation invalidates the previous raw token', async () => {
    const db = memorySupabase()
    const first = await issueWebsitePreviewToken(db, 'website-rotate')
    const second = await issueWebsitePreviewToken(db, 'website-rotate')
    expect(first?.token).toBeTruthy()
    expect(second?.token).toBeTruthy()
    expect(first!.token).not.toBe(second!.token)
    const stored = db.rows.get('website_tenants:website-rotate')
    expect(stored?.preview_token_hash).toBe(hashPreviewToken(second!.token))
    expect(stored?.preview_token_hash).not.toBe(hashPreviewToken(first!.token))

    const draft = { id: 'website-rotate', is_published: false }
    expect((await authorizePublicWebsiteRead(db, draft, { preview_token: first!.token }, true)).ok).toBe(false)
    expect((await authorizePublicWebsiteRead(db, draft, { preview_token: second!.token }, true)).ok).toBe(true)
  })

  it('ensureWebsitePreviewToken reuses a still-valid token from the preview URL', async () => {
    const db = memorySupabase()
    const first = await issueWebsitePreviewToken(db, 'website-stable')
    const url = previewUrlForPath('https://app.simy.ch', '/s/demo', first!.token)
    const ensured = await ensureWebsitePreviewToken(db, 'website-stable', {
      existingPreviewUrl: url,
    })
    expect(ensured?.reused).toBe(true)
    expect(ensured?.token).toBe(first!.token)
    const forced = await ensureWebsitePreviewToken(db, 'website-stable', {
      existingPreviewUrl: url,
      forceRotate: true,
    })
    expect(forced?.reused).toBe(false)
    expect(forced?.token).not.toBe(first!.token)
  })
})
