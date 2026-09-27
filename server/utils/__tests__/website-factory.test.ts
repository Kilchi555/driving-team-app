import { describe, expect, it, beforeEach } from 'vitest'
import { assertPublicHttpUrl, isBlockedAddress, safeFetchPublic, UnsafeUrlError } from '../ssrf-guard'
import { extractBusinessFromHtml } from '../website-factory-extract'
import { mapGooglePeriods, placeNameFromMapsUrl } from '../website-factory-google'
import { normalizeFactoryProfile } from '../website-factory-profile'
import { discoverWebsiteFactory, resetFactoryRateLimit } from '../website-factory-discover'
import { authorizePublicWebsiteRead, hashPreviewToken } from '../website-preview-access'

const publicLookup = async () => ['93.184.216.34']
const privateLookup = async () => ['127.0.0.1']

function htmlPage() {
  return `<!doctype html><html><head>
    <title>Fahrschule Beispiel</title>
    <meta name="description" content="Fahrschule in Zürich">
    <link rel="canonical" href="https://fahrschule-beispiel.example/">
    <script type="application/ld+json">{
      "@context": "https://schema.org",
      "@type": "DrivingSchool",
      "name": "Fahrschule Beispiel",
      "description": "Autofahren lernen",
      "telephone": "+41 44 111 22 33",
      "email": "hallo@beispiel.example",
      "logo": "https://cdn.beispiel.example/logo.png",
      "image": "https://cdn.beispiel.example/hero.png",
      "address": { "@type": "PostalAddress", "streetAddress": "Bahnhofstrasse 1", "addressLocality": "Zürich", "postalCode": "8001" },
      "sameAs": ["https://www.instagram.com/beispiel"],
      "makesOffer": { "@type": "Service", "name": "Autofahren Kat. B", "description": "Fahrlektionen" },
      "openingHoursSpecification": { "@type": "OpeningHoursSpecification", "dayOfWeek": "Monday", "opens": "09:00", "closes": "17:00" }
    }</script>
  </head><body></body></html>`
}

type Row = Record<string, unknown>

function memoryDb() {
  const tables: Record<string, Row[]> = { tenants: [], website_tenants: [], website_pages: [], users: [] }
  const calls: string[] = []
  function from(table: string) {
    const state: { op?: string; row?: Row; id?: string; slug?: string; subdomain?: string; websiteId?: string } = {}
    const q = {
      select() { return q },
      eq(col: string, value: string) {
        if (col === 'id') state.id = value
        if (col === 'slug') state.slug = value
        if (col === 'subdomain') state.subdomain = value
        if (col === 'website_id') state.websiteId = value
        return q
      },
      insert(row: Row) { state.op = 'insert'; state.row = row; calls.push(`insert:${table}`); return q },
      update(row: Row) { state.op = 'update'; state.row = row; calls.push(`update:${table}`); return q },
      delete() { state.op = 'delete'; calls.push(`delete:${table}`); return q },
      maybeSingle: () => Promise.resolve(finish()),
      single: () => Promise.resolve(finish()),
      then(resolve: (value: { data: Row | null; error: { message?: string } | null }) => void, reject: (reason: unknown) => void) {
        return Promise.resolve(finish()).then(resolve, reject)
      },
    }
    function finish() {
      const rows = tables[table] || (tables[table] = [])
      if (state.op === 'insert') {
        const row = { ...state.row, id: state.row.id || `${table}-${rows.length + 1}` }
        rows.push(row)
        return { data: row, error: null }
      }
      if (state.op === 'update') {
        const row = rows.find((item) => item.id === state.id)
        if (row) Object.assign(row, state.row)
        return { data: row || null, error: row ? null : { message: 'missing' } }
      }
      if (state.op === 'delete') {
        const before = rows.length
        tables[table] = rows.filter((item) => item.id !== state.id && item.website_id !== state.websiteId && item.tenant_id !== state.id)
        return { data: null, error: null, removed: before - tables[table].length }
      }
      const found = rows.find((item) => item.slug === state.slug || item.subdomain === state.subdomain || item.id === state.id) || null
      return { data: found, error: null }
    }
    return q
  }
  return {
    tables,
    calls,
    from,
    rpc: async () => ({ data: 'SM-TEST-1', error: null }),
  }
}

describe('website factory SSRF', () => {
  it('rejects localhost, loopback, private, link-local, metadata and bad protocols', async () => {
    await expect(assertPublicHttpUrl('http://localhost/admin', { lookup: publicLookup })).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicHttpUrl('http://127.0.0.1/', { lookup: publicLookup })).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicHttpUrl('http://169.254.169.254/latest', { lookup: publicLookup })).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicHttpUrl('http://[::1]/', { lookup: publicLookup })).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicHttpUrl('file:///etc/passwd', { lookup: publicLookup })).rejects.toBeInstanceOf(UnsafeUrlError)
    await expect(assertPublicHttpUrl('http://public.example/', { lookup: privateLookup })).rejects.toBeInstanceOf(UnsafeUrlError)
    expect(isBlockedAddress('10.1.1.1')).toBe(true)
    expect(isBlockedAddress('192.168.1.1')).toBe(true)
    expect(isBlockedAddress('fe80::1')).toBe(true)
  })

  it('rejects redirects to private hosts, too many redirects, and oversized bodies', async () => {
    await expect(safeFetchPublic('https://public.example/start', {
      lookup: async (host) => host === 'secret.internal' ? ['10.0.0.8'] : ['93.184.216.34'],
      request: async () => ({
        status: 302,
        headers: { location: 'http://10.1.2.3/meta' },
        body: '',
      }),
    })).rejects.toBeInstanceOf(UnsafeUrlError)

    let hops = 0
    await expect(safeFetchPublic('https://public.example/loop', {
      lookup: publicLookup,
      maxRedirects: 3,
      request: async () => {
        hops += 1
        return { status: 302, headers: { location: `https://public.example/${hops}` }, body: '' }
      },
    })).rejects.toThrow(/redirect/i)

    await expect(safeFetchPublic('https://public.example/big', {
      lookup: publicLookup,
      maxBytes: 20,
      request: async () => ({ status: 200, headers: { 'content-type': 'text/html' }, body: 'x'.repeat(50) }),
    })).rejects.toThrow(/large/i)
  })
})

describe('website factory extraction and profile', () => {
  it('extracts JSON-LD without inventing missing facts', () => {
    const extracted = extractBusinessFromHtml(htmlPage(), 'https://fahrschule-beispiel.example/')
    expect(extracted.businessName).toBe('Fahrschule Beispiel')
    expect(extracted.city).toBe('Zürich')
    expect(extracted.phone).toContain('44')
    expect(extracted.email).toBe('hallo@beispiel.example')
    expect(extracted.services.map((service) => service.name)).toEqual(['Autofahren Kat. B'])
    expect(extracted.logoUrl).toContain('https://')
    expect(JSON.stringify(extracted)).not.toContain('team')
  })

  it('asks only for fields a partial page does not contain', () => {
    const extracted = extractBusinessFromHtml('<title>Atelier Nord</title><meta name="description" content="Atelier in Bern">', 'https://atelier.example/')
    const normalized = normalizeFactoryProfile({ website: extracted, suppliedWebsiteUrl: 'https://atelier.example/' })
    expect(normalized.missing).toEqual(expect.arrayContaining(['offer', 'contact']))
    expect(normalized.profile.city).toBeNull()
    expect(normalized.suggestions.city).toBe('Bern')
    expect(normalized.profile.phone).toBeNull()
    expect(normalized.profile.email).toBeNull()
    expect(normalized.profile.services).toEqual([])
    expect(normalized.profile.openingHours).toBeNull()
  })

  it('prefers Google for NAP and the website for services', () => {
    const website = extractBusinessFromHtml(htmlPage(), 'https://fahrschule-beispiel.example/')
    const normalized = normalizeFactoryProfile({
      suppliedWebsiteUrl: 'https://fahrschule-beispiel.example/',
      website,
      google: {
        placeId: 'ChIJexampleplaceidvalue123',
        name: 'Fahrschule Beispiel GmbH',
        address: 'Googleweg 2',
        city: 'Bern',
        postalCode: '3000',
        phone: '+41 31 000 00 00',
        website: 'https://fahrschule-beispiel.example/',
        mapsUrl: 'https://maps.google.com/?cid=1',
        types: ['driving_school'],
        description: null,
        rating: 4.8,
        openingHours: [{ day: 1, opens: '08:00', closes: '12:00' }],
        official: true,
      },
    })
    expect(normalized.missing).toEqual([])
    expect(normalized.profile.businessName).toBe('Fahrschule Beispiel GmbH')
    expect(normalized.profile.city).toBe('Bern')
    expect(normalized.profile.phone).toBe('+41 31 000 00 00')
    expect(normalized.profile.services[0].name).toBe('Autofahren Kat. B')
    expect(normalized.conflicts).toEqual(expect.arrayContaining(['businessName', 'city', 'phone', 'openingHours']))
    expect(normalized.profile.openingHours?.schedule[1]).toEqual({ start: '08:00', end: '12:00' })
  })

  it('reads a place name from a Maps URL without scraping HTML', () => {
    expect(placeNameFromMapsUrl('https://www.google.com/maps/place/Fahrschule+Beispiel/@47.3,8.5,15z')).toBe('Fahrschule Beispiel')
    expect(mapGooglePeriods([{ open: { day: 1, time: '0900' }, close: { day: 1, time: '1700' } }])).toEqual([
      { day: 1, opens: '09:00', closes: '17:00' },
    ])
  })
})

describe('website factory generation', () => {
  beforeEach(() => resetFactoryRateLimit())

  function allowLimit() {
    return async () => ({ allowed: true, remaining: 5, limit: 6, reset: 1000, retryAfter: 1 })
  }

  it('creates an unpublished website-only preview and no billing, user, or claim', async () => {
    const db = memoryDb()
    const website = extractBusinessFromHtml(htmlPage(), 'https://fahrschule-beispiel.example/')
    const result = await discoverWebsiteFactory(
      { ip: '203.0.113.10', websiteUrl: 'https://fahrschule-beispiel.example/' },
      {
        supabase: db,
        baseUrl: 'https://app.simy.ch',
        checkRateLimit: allowLimit() as unknown as typeof import('../rate-limiter').checkRateLimit,
        fetchWebsite: async () => website,
      },
    )
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.previewUrl).toContain('https://app.simy.ch/s/')
    expect(result.previewUrl).toContain('preview_token=')
    expect(result).not.toHaveProperty('tenantId')
    const tenant = db.tables.tenants[0]
    const site = db.tables.website_tenants[0]
    const page = db.tables.website_pages[0]
    expect(tenant.website_only).toBe(true)
    expect(tenant.is_trial).toBe(false)
    expect(tenant.subscription_plan).toBeNull()
    expect(tenant.trial_ends_at).toBeNull()
    expect(tenant.website_setup_paid_at).toBeNull()
    expect(tenant.website_hosting_plan).toBeNull()
    expect(JSON.stringify(tenant)).not.toMatch(/stripe|claim|wallee/i)
    expect(site.is_published).toBe(false)
    expect(page.is_published).toBe(false)
    expect(page.blocks.blocks.some((block: { type: string }) => block.type === 'hero')).toBe(true)
    expect(JSON.stringify(page.blocks)).not.toContain('07:00')
    expect(db.tables.users).toEqual([])
    expect(db.calls.some((call) => call.startsWith('insert:users'))).toBe(false)

    const token = new URL(result.previewUrl).searchParams.get('preview_token') || ''
    expect(site.preview_token_hash).toBe(hashPreviewToken(token))
    expect(site.preview_token_hash).not.toBe(token)
    const published = { id: site.id, is_published: false }
    expect((await authorizePublicWebsiteRead(db, published, {}, true)).ok).toBe(false)
    expect((await authorizePublicWebsiteRead(db, published, { preview: '1' }, true)).ok).toBe(false)
    expect((await authorizePublicWebsiteRead(db, published, { preview_token: 'b'.repeat(43) }, true)).ok).toBe(false)
    expect((await authorizePublicWebsiteRead(db, published, { preview_token: token }, true)).ok).toBe(true)
    site.preview_token_expires_at = new Date(Date.now() - 1000).toISOString()
    expect((await authorizePublicWebsiteRead(db, published, { preview_token: token }, true)).ok).toBe(false)
    const other = { id: 'other-website', is_published: false }
    expect((await authorizePublicWebsiteRead(db, other, { preview_token: token }, true)).ok).toBe(false)
  })

  it('generates from manual input through the same profile', async () => {
    const db = memoryDb()
    const result = await discoverWebsiteFactory(
      {
        ip: '203.0.113.11',
        manual: { businessName: 'Atelier Nord', offer: 'Keramik', city: 'Basel', email: 'hi@atelier.example' },
      },
      { supabase: db, baseUrl: 'https://app.simy.ch', checkRateLimit: allowLimit() as unknown as typeof import('../rate-limiter').checkRateLimit },
    )
    expect(result.success).toBe(true)
    expect(db.tables.tenants[0].business_type).toBe('generic')
    expect(db.tables.tenants[0].is_trial).toBe(false)
    const services = db.tables.website_pages[0].blocks.blocks.find((block: { type: string }) => block.type === 'services')
    expect(services.content.services[0].name).toBe('Keramik')
  })

  it('rate limits repeated anonymous discovery', async () => {
    const db = memoryDb()
    const deps = { supabase: db, baseUrl: 'https://app.simy.ch', checkRateLimit: allowLimit() as unknown as typeof import('../rate-limiter').checkRateLimit }
    for (let i = 0; i < 6; i++) {
      const result = await discoverWebsiteFactory({ ip: '203.0.113.12', manual: { businessName: 'A', offer: 'B', city: 'C', phone: '+410000000' } }, deps)
      expect(result.success).toBe(true)
    }
    const blocked = await discoverWebsiteFactory({ ip: '203.0.113.12', manual: { businessName: 'A', offer: 'B', city: 'C', phone: '+410000000' } }, deps)
    expect(blocked).toMatchObject({ success: false, status: 429 })
  })

  it('does not insert a tenant when required facts are missing', async () => {
    const db = memoryDb()
    const result = await discoverWebsiteFactory(
      { ip: '203.0.113.13', websiteUrl: 'https://atelier.example/' },
      {
        supabase: db,
        baseUrl: 'https://app.simy.ch',
        checkRateLimit: allowLimit() as unknown as typeof import('../rate-limiter').checkRateLimit,
        fetchWebsite: async () => extractBusinessFromHtml('<title>Atelier Nord</title>', 'https://atelier.example/'),
      },
    )
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.missing?.length).toBeGreaterThan(0)
    expect(db.tables.tenants).toEqual([])
  })
})
