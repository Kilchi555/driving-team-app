import { describe, expect, it } from 'vitest'
import {
  applyTenantOgTags,
  buildTenantOgHtml,
  buildTenantOgTags,
  shouldServeTenantOgStub,
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
  })
})
