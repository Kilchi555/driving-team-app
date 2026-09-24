import { describe, expect, it } from 'vitest'
import { runWebsiteQualityChecks } from '../website-quality'

function landing(overrides: Record<string, unknown> = {}) {
  return {
    seo: { title: 'Fahrschule Zürich', description: 'Buchen Sie Fahrstunden in Zürich.', keywords: 'fahrschule' },
    brand: { name: 'Fahrschule Test', primary: '#000', secondary: '#fff', accent: '#f00', logo_url: null, hero_image_url: '/hero.jpg' },
    bookingUrl: 'https://app.simy.ch/b/test',
    siteUrl: 'https://app.simy.ch/s/test',
    schema: { '@graph': [{ '@type': 'LocalBusiness' }] },
    blocks: [
      { type: 'hero', content: { headline: 'Fahrschule Zürich', subheadline: 'Bio' } },
      { type: 'services', content: { items: [{ name: 'Kat. B' }] } },
      { type: 'cta', content: { cta_text: 'Jetzt buchen', headline: 'Termin sichern' } },
      { type: 'contact', content: { email: 'info@test.ch', phone: '+41 44 000 00 00', city: 'Zürich' } },
      { type: 'slots', content: {} },
    ],
    ...overrides,
  }
}

describe('website quality engine', () => {
  it('passes a complete landing payload with only legal warnings', () => {
    const result = runWebsiteQualityChecks({
      homepageBlocks: landing(),
      pages: [{ slug: 'index', is_home: true }],
      businessType: 'driving_school',
    })
    expect(result.passed).toBe(true)
    expect(result.blockingIssues).toEqual([])
    expect(result.warnings.some((item) => item.check_id === 'LEGAL_IMPRESSUM_MISSING')).toBe(true)
    expect(result.checks.find((item) => item.check_id === 'SEO_TITLE_MISSING')?.passed).toBe(true)
    expect(result.checks.every((item) => item.severity !== undefined && item.check_id && item.category)).toBe(true)
  })

  it('blocks an empty homepage using the existing content rule', () => {
    const result = runWebsiteQualityChecks({ homepageBlocks: null })
    expect(result.passed).toBe(false)
    expect(result.blockingIssues.map((item) => item.check_id)).toEqual([
      'STRUCT_HOMEPAGE_MISSING',
      'STRUCT_HOMEPAGE_EMPTY',
    ])
  })

  it('does not invent a numeric SEO score', () => {
    const result = runWebsiteQualityChecks({ homepageBlocks: landing() })
    expect(JSON.stringify(result)).not.toMatch(/87|score.:/)
    expect(result.checks.every((item) => item.passed === true || item.passed === false)).toBe(true)
  })

  it('warns on missing CTA, contact, and conversion paths without blocking', () => {
    const result = runWebsiteQualityChecks({
      homepageBlocks: landing({
        bookingUrl: '',
        blocks: [
          { type: 'hero', content: { headline: 'Hallo' } },
          { type: 'services', content: { items: [{ name: 'Kat. B' }] } },
        ],
      }),
    })
    expect(result.passed).toBe(true)
    expect(result.warnings.map((item) => item.check_id)).toEqual(expect.arrayContaining([
      'CONTENT_CTA_MISSING',
      'CONTENT_CONTACT_MISSING',
      'CONV_BOOKING_PATH_MISSING',
    ]))
  })

  it('keeps driving-school extras as warnings so other industries are not forced', () => {
    const result = runWebsiteQualityChecks({
      homepageBlocks: landing({
        blocks: [
          { type: 'hero', content: { headline: 'Praxis' } },
          { type: 'services', content: { items: [{ name: 'Beratung' }] } },
          { type: 'cta', content: { cta_text: 'Kontakt' } },
          { type: 'contact', content: { email: 'a@b.ch' } },
        ],
      }),
      businessType: 'therapy',
    })
    expect(result.checks.some((item) => item.check_id === 'CONV_DRIVING_SCHOOL_OFFER')).toBe(false)
    expect(result.passed).toBe(true)
  })

  it('treats an invalid payload as warning, not a new publish blocker', () => {
    const result = runWebsiteQualityChecks({ homepageBlocks: { note: 'legacy' } })
    expect(result.passed).toBe(true)
    expect(result.warnings.some((item) => item.check_id === 'STRUCT_INVALID_PAYLOAD')).toBe(true)
  })
})
