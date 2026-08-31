import { describe, expect, it } from 'vitest'
import { extractInternalPaths, extractPageImages, normalizeProspectUrl, parseProspectHtml } from '../website-prospect-scrape'
import {
  buildProspectAnalysis,
  scoreProspectFreshness,
  scoreProspectSeo,
  scoreProspectSpeed,
} from '../website-prospect-score'
import { buildProspectRevenueModel, cityRevenueMultiplier } from '../website-prospect-revenue'
import { buildProspectEmailDraft } from '../website-prospect-email'
import { decideProspectArchitecture } from '../website-prospect-architecture'
import { stockQueryForOffer } from '../website-hero-prompts'

const weakHtml = `<!doctype html><html><head>
<title>Home</title>
<meta name="generator" content="Jimdo">
</head><body><h1>Willkommen</h1><p>© 2018 Fahrschule</p></body></html>`

const strongHtml = `<!doctype html><html><head>
<title>Fahrschule Muster Zürich – Fahrstunden Kat. B</title>
<meta name="description" content="Fahrschule in Zürich für Autofahren, Motorrad und Anhänger. Jetzt online buchen, transparente Preise.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:title" content="Fahrschule Muster">
<link rel="canonical" href="https://example.ch/">
<script type="application/ld+json">{"@type":"DrivingSchool"}</script>
</head><body><h1>Fahrschule Muster Zürich</h1><a href="/buchen">Jetzt online buchen</a></body></html>`

describe('normalizeProspectUrl', () => {
  it('rejects private hosts', () => {
    expect(normalizeProspectUrl('http://localhost/admin')).toBeNull()
    expect(normalizeProspectUrl('http://127.0.0.1/')).toBeNull()
    expect(normalizeProspectUrl('https://192.168.1.10')).toBeNull()
  })

  it('adds https and keeps a public host', () => {
    expect(normalizeProspectUrl('www.fahrschule.ch')).toBe('https://www.fahrschule.ch/')
  })
})

describe('extractPageImages', () => {
  it('picks a logo and skips junk icons', () => {
    const html = `
      <img src="/favicon.ico" width="16" height="16">
      <img src="/img/logo.png" alt="Logo fahre-schlau">
      <img src="https://storage.e.jimdo.com/image/car.jpg" alt="Auto">
    `
    const found = extractPageImages(html, 'https://fahre-schlau.ch')
    expect(found.logo).toContain('logo.png')
    expect(found.images.some((u) => u.includes('car.jpg'))).toBe(true)
    expect(found.images.some((u) => u.includes('favicon'))).toBe(false)
  })
})

describe('parseProspectHtml', () => {
  it('flags jimdo, old copyright and missing mobile', () => {
    const scrape = parseProspectHtml(weakHtml, 'https://alt.ch')
    expect(scrape.cms).toBe('Jimdo')
    expect(scrape.copyright_year).toBe(2018)
    expect(scrape.viewport).toBe(false)
    expect(scrape.has_schema).toBe(false)
    expect(scrape.has_booking_cta).toBe(false)
  })

  it('extracts local SEO signals and booking CTA', () => {
    const scrape = parseProspectHtml(strongHtml, 'https://muster.ch')
    expect(scrape.viewport).toBe(true)
    expect(scrape.has_schema).toBe(true)
    expect(scrape.has_booking_cta).toBe(true)
    expect(scrape.services.some((s) => /B|Motorrad|Anhänger/.test(s.name))).toBe(true)
  })
})

describe('prospect scores', () => {
  it('scores a weak page as an opportunity', () => {
    const scrape = parseProspectHtml(weakHtml, 'https://alt.ch')
    const seo = scoreProspectSeo(scrape, 'Zürich', 'Fahrschule')
    const freshness = scoreProspectFreshness(scrape, 2026)
    const analysis = buildProspectAnalysis({
      name: 'Fahrschule Alt',
      seo,
      freshness,
      speed: 28,
      scrape,
    })
    expect(seo).toBeLessThan(40)
    expect(freshness).toBeLessThan(40)
    expect(analysis.recommend_generate).toBe(true)
    expect(analysis.findings.some((f) => f.id === 'cms')).toBe(true)
  })

  it('uses PSI performance as speed score', () => {
    expect(scoreProspectSpeed({ performance: 42, seo: 70, lcp_ms: 5100, source: 'psi' })).toBe(35)
    expect(scoreProspectSpeed({ performance: null, seo: null, lcp_ms: null, source: 'skipped' })).toBeNull()
  })
})

describe('revenue model', () => {
  it('keeps a conservative range and city multiplier', () => {
    expect(cityRevenueMultiplier('Zürich')).toBe(1.15)
    expect(cityRevenueMultiplier('Uznach')).toBe(0.85)
    const model = buildProspectRevenueModel({
      businessType: 'driving_school',
      city: 'Uznach',
      opportunity: 80,
    })
    expect(model.monthly_low_chf).toBeGreaterThan(0)
    expect(model.monthly_high_chf).toBeGreaterThan(model.monthly_low_chf)
    expect(model.assumptions.some((a) => /keine Garantie/i.test(a))).toBe(true)
  })
})

describe('prospect architecture', () => {
  it('stays one-pager when there is only one commercial intent', () => {
    const arch = decideProspectArchitecture({
      businessType: 'coaching',
      services: [{ name: 'Coaching' }],
      city: 'Zürich',
      internalPaths: ['/impressum', '/datenschutz'],
    })
    expect(arch.mode).toBe('one')
    expect(arch.intents).toEqual([])
  })

  it('builds a multipager when the old site already has 3+ content URLs', () => {
    const arch = decideProspectArchitecture({
      businessType: 'driving_school',
      services: [],
      city: 'Pfäffikon',
      internalPaths: ['/auto', '/moto', '/preise', '/kontakt'],
    })
    expect(arch.mode).toBe('multi')
    expect(arch.intents.some((i) => i.type === 'prices')).toBe(true)
    expect(arch.intents.filter((i) => i.type === 'category').length).toBeGreaterThanOrEqual(2)
    expect(arch.intents.every((i) => i.type !== 'location')).toBe(true)
  })

  it('builds a multipager from 2+ distinct services even without many URLs', () => {
    const arch = decideProspectArchitecture({
      businessType: 'driving_school',
      services: [{ name: 'Autofahren Kat. B' }, { name: 'Motorrad' }],
      city: 'Zürich',
      internalPaths: ['/kontakt'],
    })
    expect(arch.mode).toBe('multi')
    expect(arch.intents.map((i) => i.title)).toContain('Autofahren Kat. B')
    expect(arch.intents.map((i) => i.title)).toContain('Preise')
  })

  it('extracts content paths and skips legal pages', () => {
    const html = `
      <a href="/auto">Auto</a>
      <a href="/moto">Moto</a>
      <a href="/impressum">Impressum</a>
      <a href="https://other.ch/foo">extern</a>
    `
    expect(extractInternalPaths(html, 'https://fahre-schlau.ch')).toEqual(['/auto', '/moto'])
  })
})

describe('stock queries', () => {
  it('maps offers to section-specific Unsplash queries', () => {
    expect(stockQueryForOffer('Motorrad', 'driving_school')).toMatch(/motorcycle/)
    expect(stockQueryForOffer('Autofahren Kat. B', 'driving_school')).toMatch(/driving instructor|car/)
    expect(stockQueryForOffer('Anhänger Kat. BE', 'driving_school')).toMatch(/trailer/)
    expect(stockQueryForOffer('VKU', 'driving_school')).toMatch(/theory|classroom/)
  })

  it('falls back to the industry query when the offer is unknown', () => {
    expect(stockQueryForOffer('', 'fitness')).toMatch(/training|gym/)
    expect(stockQueryForOffer('Einzelstunde', 'tutoring')).toMatch(/tutoring|Einzelstunde/)
  })
})

describe('email draft', () => {
  it('includes preview, price and conservative range', () => {
    const revenue = buildProspectRevenueModel({
      businessType: 'driving_school',
      city: 'Zürich',
      opportunity: 70,
    })
    const draft = buildProspectEmailDraft({
      name: 'Fahrschule Test',
      city: 'Zürich',
      existingUrl: 'https://alt.ch',
      previewUrl: 'https://app.simy.ch/s/test?preview=1',
      revenue,
      findings: [{ title: 'Kein LocalBusiness-Schema' }],
    })
    expect(draft.subject).toContain('Fahrschule Test')
    expect(draft.text).toContain('490')
    expect(draft.text).toContain('19')
    expect(draft.text).toContain('Starter')
    expect(draft.text).toContain('49')
    expect(draft.text).toContain('keine Garantie')
    expect(draft.text).toContain('preview=1')
  })
})
