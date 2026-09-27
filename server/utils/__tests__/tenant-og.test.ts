import { describe, expect, it } from 'vitest'
import {
  applyTenantOgTags,
  assertCrawlerStubCacheSafe,
  buildTenantOgHtml,
  buildTenantOgTags,
  isCrawlerStubCacheSafe,
  isSharedCdnCacheable,
  shouldServeTenantOgStub,
  TENANT_OG_CRAWLER_STUB_CACHE_CONTROL,
  TENANT_OG_PNG_CACHE_CONTROL,
  tenantOgCrawlerStubHeaders,
  tenantOgImagePath,
} from '../tenant-og'

const acme = {
  name: 'Fahrschule Acme',
  slug: 'acme-fahrschule',
  brand_name: 'Acme',
  brand_tagline: 'Sicher ankommen',
  meta_description: 'Fahrstunden in Winterthur online buchen.',
  business_type: 'driving_school',
  invoice_city: 'Winterthur',
  primary_color: '#123456',
}

describe('buildTenantOgTags', () => {
  it('uses tenant brand, not Driving Team', () => {
    const tags = buildTenantOgTags(acme, {
      origin: 'https://app.simy.ch',
      canonicalUrl: 'https://app.simy.ch/acme-fahrschule',
    })
    expect(tags.siteName).toBe('Acme')
    expect(tags.title).toContain('Acme')
    expect(tags.title).toContain('Sicher ankommen')
    expect(tags.description).toContain('Winterthur')
    expect(tags.image).toBe('https://app.simy.ch/api/public/tenant/acme-fahrschule/og.png')
    expect(tags.url).toBe('https://app.simy.ch/acme-fahrschule')
    expect(JSON.stringify(tags)).not.toContain('Driving Team')
  })

  it('falls back to industry book-action when no tagline is set', () => {
    const tags = buildTenantOgTags(
      { name: 'Coach Lisa', slug: 'coach-lisa', business_type: 'mental_coach' },
      { origin: 'https://app.simy.ch', canonicalUrl: 'https://app.simy.ch/coach-lisa' },
    )
    expect(tags.title).toBe('Coach Lisa – Sitzung buchen')
    expect(tags.siteName).toBe('Coach Lisa')
  })

  it('keeps tenant A and tenant B branding isolated', () => {
    const hakuco = buildTenantOgTags(
      { name: 'Hakuco', slug: 'hakuco', brand_name: 'Hakuco', business_type: 'dog_training' },
      { origin: 'https://app.simy.ch', canonicalUrl: 'https://app.simy.ch/hakuco' },
    )
    const gemperli = buildTenantOgTags(
      {
        name: 'Fahrschule Gemperli',
        slug: 'fahrschule-gemperli',
        brand_name: 'Fahrschule Gemperli',
        business_type: 'driving_school',
      },
      { origin: 'https://app.simy.ch', canonicalUrl: 'https://app.simy.ch/fahrschule-gemperli' },
    )
    expect(hakuco.siteName).toBe('Hakuco')
    expect(hakuco.title).toContain('Training buchen')
    expect(hakuco.image).toBe('https://app.simy.ch/api/public/tenant/hakuco/og.png')
    expect(hakuco.image).not.toContain('fahrschule-gemperli')
    expect(gemperli.siteName).toBe('Fahrschule Gemperli')
    expect(gemperli.image).toBe('https://app.simy.ch/api/public/tenant/fahrschule-gemperli/og.png')
    expect(gemperli.image).not.toContain('/hakuco/')
    expect(JSON.stringify(hakuco)).not.toContain('Gemperli')
    expect(JSON.stringify(gemperli)).not.toContain('Hakuco')
  })
})

describe('applyTenantOgTags', () => {
  it('replaces hardcoded Driving Team tags in the SPA shell', () => {
    const shell = `<!DOCTYPE html><html><head>
<title>Driving Team</title>
<meta property="og:title" content="Driving Team - Fahrstunden Online Buchen">
<meta property="og:description" content="Buche deine Fahrstunden online. Auto, Motorrad, Taxi, Lastwagen, Bus & Motorboot Ausbildung in Zürich, Lachen und St.Gallen.">
<meta property="og:site_name" content="Driving Team">
<meta property="og:image" content="https://app.simy.ch/simy-logo.png">
<meta name="twitter:title" content="Driving Team - Fahrstunden Online Buchen">
</head><body></body></html>`

    const tags = buildTenantOgTags(acme, {
      origin: 'https://app.simy.ch',
      canonicalUrl: 'https://app.simy.ch/acme-fahrschule',
    })
    const html = applyTenantOgTags(shell, tags)
    expect(html).toContain('content="Acme – Sicher ankommen"')
    expect(html).toContain('content="Acme"')
    expect(html).toContain('/api/public/tenant/acme-fahrschule/og.png')
    expect(html).not.toContain('Driving Team - Fahrstunden Online Buchen')
    expect(html).not.toContain('simy-logo.png')
  })
})

describe('buildTenantOgHtml', () => {
  it('emits a crawler document with absolute image URL', () => {
    const html = buildTenantOgHtml(
      buildTenantOgTags(acme, {
        origin: 'https://app.simy.ch',
        canonicalUrl: 'https://app.simy.ch/acme-fahrschule',
      }),
    )
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('property="og:image"')
    expect(html).toContain('https://app.simy.ch/api/public/tenant/acme-fahrschule/og.png')
  })
})

describe('shouldServeTenantOgStub', () => {
  const ua = 'WhatsApp/2.25.8.76'
  it('serves stubs for tenant app URLs to preview crawlers', () => {
    expect(shouldServeTenantOgStub({ method: 'GET', pathname: '/acme-fahrschule', userAgent: ua })).toBe(true)
    expect(
      shouldServeTenantOgStub({
        method: 'GET',
        pathname: '/booking/availability/acme-fahrschule',
        userAgent: ua,
      }),
    ).toBe(true)
  })

  it('leaves website SSR and browsers alone', () => {
    expect(shouldServeTenantOgStub({ method: 'GET', pathname: '/s/acme', userAgent: ua })).toBe(false)
    expect(
      shouldServeTenantOgStub({
        method: 'GET',
        pathname: '/acme-fahrschule',
        userAgent: 'Mozilla/5.0',
      }),
    ).toBe(false)
    expect(
      shouldServeTenantOgStub({
        method: 'GET',
        pathname: '/acme-fahrschule',
        userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 WhatsApp/2.25.8.76',
      }),
    ).toBe(false)
    expect(
      shouldServeTenantOgStub({
        method: 'GET',
        pathname: '/api/tenants/branding',
        userAgent: ua,
      }),
    ).toBe(false)
    expect(
      shouldServeTenantOgStub({
        method: 'GET',
        pathname: '/login/acme-fahrschule',
        userAgent: 'Mozilla/5.0',
      }),
    ).toBe(false)
    expect(
      shouldServeTenantOgStub({
        method: 'GET',
        pathname: '/booking/availability/acme-fahrschule',
        userAgent: 'Mozilla/5.0',
      }),
    ).toBe(false)
  })
})

describe('crawler stub cache policy', () => {
  const previousPublicPolicy = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'

  it('F: crawler stub Cache-Control is private, no-store and not CDN-shared', () => {
    expect(TENANT_OG_CRAWLER_STUB_CACHE_CONTROL).toBe('private, no-store')
    expect(isCrawlerStubCacheSafe(TENANT_OG_CRAWLER_STUB_CACHE_CONTROL)).toBe(true)
    expect(isSharedCdnCacheable(TENANT_OG_CRAWLER_STUB_CACHE_CONTROL)).toBe(false)
    expect(assertCrawlerStubCacheSafe(TENANT_OG_CRAWLER_STUB_CACHE_CONTROL)).toBe('private, no-store')

    const headers = tenantOgCrawlerStubHeaders()
    expect(headers['Cache-Control']).toBe('private, no-store')
    expect(headers['CDN-Cache-Control']).toBe('private, no-store')
    expect(headers['Vercel-CDN-Cache-Control']).toBe('private, no-store')
    expect(headers['Content-Type']).toBe('text/html; charset=utf-8')
  })

  it('rejects the previous public CDN policy that could poison browsers', () => {
    expect(isSharedCdnCacheable(previousPublicPolicy)).toBe(true)
    expect(isCrawlerStubCacheSafe(previousPublicPolicy)).toBe(false)
    expect(() => assertCrawlerStubCacheSafe(previousPublicPolicy)).toThrow(/CDN-cacheable/)
  })

  it('G: a URL-only shared cache cannot store the crawler stub', () => {
    const store = new Map<string, string>()
    const put = (url: string, body: string, cacheControl: string) => {
      if (isSharedCdnCacheable(cacheControl)) store.set(url, body)
    }

    const stub = buildTenantOgHtml(
      buildTenantOgTags(acme, {
        origin: 'https://app.simy.ch',
        canonicalUrl: 'https://app.simy.ch/acme-fahrschule',
      }),
    )
    put('/acme-fahrschule', stub, TENANT_OG_CRAWLER_STUB_CACHE_CONTROL)
    expect(store.has('/acme-fahrschule')).toBe(false)

    put('/acme-fahrschule', stub, previousPublicPolicy)
    expect(store.get('/acme-fahrschule')).toContain('content="Acme"')
  })

  it('H: PNG stays independently CDN-cacheable because the slug is in the URL', () => {
    expect(tenantOgImagePath('hakuco')).toBe('/api/public/tenant/hakuco/og.png')
    expect(tenantOgImagePath('fahrschule-gemperli')).toBe(
      '/api/public/tenant/fahrschule-gemperli/og.png',
    )
    expect(isSharedCdnCacheable(TENANT_OG_PNG_CACHE_CONTROL)).toBe(true)
    expect(TENANT_OG_PNG_CACHE_CONTROL).toContain('public')
    expect(isCrawlerStubCacheSafe(TENANT_OG_PNG_CACHE_CONTROL)).toBe(false)
  })
})
