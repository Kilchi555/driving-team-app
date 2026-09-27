import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { decideProspectArchitecture } from '../website-prospect-architecture'
import { buildProspectEmailDraft } from '../website-prospect-email'
import { buildProspectRevenueModel } from '../website-prospect-revenue'
import {
  PLACE_DETAILS_FIELDS,
  PROSPECT_CRON_CITIES,
  buildProspectRedirects,
  cronCityForDate,
  parsePlaceDetails,
  qualifyProspect,
  runCronWebsiteProspectDiscovery,
  runWebsiteProspectDiscovery,
  type CronPlaceDetails,
  type ProspectDiscoveryDeps,
} from '../website-prospect-discover'

const PUBLIC_LOOKUP = async () => ['1.1.1.1']

function threePathHtml() {
  return `<!doctype html><html><head><title>Fahrschule Beispiel</title></head><body>
    <nav>
      <a href="/autofahren">Autofahren Kat. B</a>
      <a href="/motorrad">Motorrad</a>
      <a href="/anhaenger">Anhänger Kat. BE</a>
    </nav>
  </body></html>`
}

function strongHtml() {
  const words = Array.from({ length: 90 }, () => 'Fahrstunde').join(' ')
  return `<!doctype html><html><head>
    <title>Fahrschule Stark in Zürich</title>
    <meta name="description" content="Fahrschule Stark in Zürich bietet Fahrstunden mit klarer Anmeldung und lokaler Suche für neue Schülerinnen und Schüler.">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta property="og:title" content="Fahrschule Stark">
    <link rel="canonical" href="https://stark.example/">
    <script type="application/ld+json">{"@type":"LocalBusiness"}</script>
  </head><body>
    <h1>Fahrschule Stark Zürich</h1>
    <p>jetzt buchen</p>
    <p>copyright 2026 ${words}</p>
  </body></html>`
}

function harness(partial: Partial<ProspectDiscoveryDeps> = {}) {
  const saved: Array<Record<string, unknown>> = []
  const fetched: string[] = []
  const pagespeedUrls: string[] = []
  const deps: ProspectDiscoveryDeps = {
    now: new Date('2026-01-01T12:00:00.000Z'),
    lookup: PUBLIC_LOOKUP,
    searchPlaces: async () => [],
    placeDetails: async () => null,
    knownPlaceIds: async () => [],
    fetchPublicHtml: async (url) => {
      fetched.push(url)
      throw new Error(`unexpected fetch ${url}`)
    },
    pagespeed: async (url) => {
      pagespeedUrls.push(url)
      return { performance: 90, seo: 90, lcp_ms: 1200, source: 'psi' }
    },
    saveProspect: async (row) => {
      saved.push(row)
      return { id: `prospect-${saved.length}` }
    },
    generateSite: async () => ({ status: 'review', email_sent_at: null }),
    ...partial,
  }
  return { deps, saved, fetched, pagespeedUrls }
}

describe('prospect discovery cron', () => {
  afterEach(() => {
    delete process.env.GOOGLE_MAPS_API_KEY
    delete process.env.VITE_GOOGLE_MAPS_API_KEY
  })

  it('rotates one Swiss city per day', () => {
    expect(cronCityForDate(new Date('2026-01-01T12:00:00.000Z'))).toBe(PROSPECT_CRON_CITIES[1])
    expect(cronCityForDate(new Date('2026-01-02T12:00:00.000Z'))).toBe(PROSPECT_CRON_CITIES[2])
    expect(PROSPECT_CRON_CITIES).toEqual([
      'Zürich',
      'Bern',
      'Basel',
      'Luzern',
      'St. Gallen',
      'Winterthur',
    ])
  })

  it('keeps Places details off reviews, hours and photos', () => {
    expect(PLACE_DETAILS_FIELDS).not.toMatch(/review|opening_hours|photo/i)
    const parsed = parsePlaceDetails({
      status: 'OK',
      result: {
        place_id: 'place-1',
        name: 'Fahrschule Nord',
        formatted_address: '8001 Zürich',
        reviews: [{ text: 'super secret review' }],
        opening_hours: { weekday_text: ['Montag: 09:00–18:00'] },
        photos: [{ photo_reference: 'secret-ref' }],
      },
    })
    expect(parsed?.name).toBe('Fahrschule Nord')
    expect(parsed).not.toHaveProperty('reviews')
    expect(parsed).not.toHaveProperty('opening_hours')
    expect(JSON.stringify(parsed)).not.toMatch(/super secret|09:00|secret-ref/)
  })

  it('requires a weakness and opportunity of at least 55', () => {
    expect(qualifyProspect({ opportunity: 80, findings: [], noHomepage: false }).ok).toBe(false)
    expect(qualifyProspect({ opportunity: 40, findings: [{ title: 'Langsam' }], noHomepage: false }).ok).toBe(false)
    expect(qualifyProspect({ opportunity: 60, findings: [{ title: 'Langsam' }], noHomepage: false }).ok).toBe(true)
    expect(qualifyProspect({ opportunity: 75, findings: [], noHomepage: true }).reasons).toContain('keine Homepage')
  })

  it('saves a one-pager when Places has no website', async () => {
    const { deps, saved, fetched } = harness({
      searchPlaces: async (query) => {
        expect(query).toBe('Fahrschule Bern')
        return [{ place_id: 'place-none', name: 'Fahrschule Ohne' }]
      },
      placeDetails: async () => ({
        place_id: 'place-none',
        name: 'Fahrschule Ohne',
        city: 'Bern',
        website: null,
      }),
    })
    const summary = await runWebsiteProspectDiscovery(deps)
    expect(fetched).toEqual([])
    expect(saved).toHaveLength(1)
    const row = saved[0]
    const analysis = row.analysis as {
      architecture: { mode: string; intents: unknown[] }
      selection_reasons: string[]
      redirects: unknown[]
    }
    expect(row.existing_url).toBeNull()
    expect(row.source).toBe('places_cron')
    expect(row.preview_token).toBeNull()
    expect(analysis.architecture.mode).toBe('one')
    expect(analysis.architecture.intents).toEqual([])
    expect(analysis.selection_reasons).toContain('keine Homepage')
    expect(analysis.redirects).toEqual([])
    expect((row.place as { reviews: unknown[]; opening_hours: unknown[] }).reviews).toEqual([])
    expect((row.place as { opening_hours: unknown[] }).opening_hours).toEqual([])
    expect(String((row.email_draft as { text: string }).text)).toContain('keine Homepage')
    expect(String((row.email_draft as { text: string }).text)).toContain(
      'Dieser Entwurf wurde noch nicht an den Kunden gesendet.',
    )
    expect(summary.created).toBe(1)
    expect(summary.emailsSent).toBe(0)
    expect(summary.generated).toEqual([{ id: 'prospect-1', place_id: 'place-none', status: 'review' }])
  })

  it('copies three old paths into three pages and a redirect map without a prices page', async () => {
    const { deps, saved } = harness({
      searchPlaces: async () => [{ place_id: 'place-multi', name: 'Fahrschule Multi' }],
      placeDetails: async () => ({
        place_id: 'place-multi',
        name: 'Fahrschule Multi',
        city: 'Bern',
        website: 'https://beispiel-fahrschule.ch/',
      }),
      fetchPublicHtml: async () => ({
        html: threePathHtml(),
        finalUrl: 'https://beispiel-fahrschule.ch/',
      }),
    })
    await runWebsiteProspectDiscovery(deps)
    expect(saved).toHaveLength(1)
    const analysis = saved[0].analysis as {
      architecture: { mode: string; intents: Array<{ title: string; type: string; slug?: string }> }
      redirects: Array<{ from: string; to: string }>
    }
    expect(analysis.architecture.mode).toBe('multi')
    expect(analysis.architecture.intents).toHaveLength(3)
    expect(analysis.architecture.intents.some((intent) => intent.type === 'prices' || intent.title === 'Preise')).toBe(
      false,
    )
    expect(analysis.redirects).toHaveLength(3)
    expect(analysis.redirects.map((item) => item.from).sort()).toEqual([
      '/anhaenger',
      '/autofahren',
      '/motorrad',
    ])
    expect(analysis.redirects.every((item) => item.to.startsWith('/') && !/preis/i.test(item.to))).toBe(true)
  })

  it('does not save a strong site under the opportunity threshold', async () => {
    const { deps, saved, fetched } = harness({
      searchPlaces: async () => [{ place_id: 'place-strong', name: 'Fahrschule Stark' }],
      placeDetails: async () => ({
        place_id: 'place-strong',
        name: 'Fahrschule Stark',
        city: 'Zürich',
        website: 'https://stark.example/',
      }),
      fetchPublicHtml: async (url) => {
        fetched.push(url)
        return { html: strongHtml(), finalUrl: 'https://stark.example/' }
      },
    })
    const summary = await runWebsiteProspectDiscovery(deps)
    expect(fetched).toEqual(['https://stark.example/'])
    expect(saved).toEqual([])
    expect(summary.created).toBe(0)
    expect(summary.skippedWeak).toBe(1)
    expect(summary.emailsSent).toBe(0)
  })

  it('skips a duplicate place_id in the same run', async () => {
    const { deps, saved } = harness({
      searchPlaces: async () => [
        { place_id: 'place-dup', name: 'Fahrschule Dup' },
        { place_id: 'place-dup', name: 'Fahrschule Dup' },
      ],
      placeDetails: async () => ({
        place_id: 'place-dup',
        name: 'Fahrschule Dup',
        website: null,
        city: 'Bern',
      }),
    })
    const summary = await runWebsiteProspectDiscovery(deps)
    expect(saved).toHaveLength(1)
    expect(summary.skippedDuplicate).toBe(1)
    expect(summary.created).toBe(1)
  })

  it('does not send mail', async () => {
    const generateSite = vi.fn(async () => ({ status: 'review', email_sent_at: null }))
    const { deps } = harness({
      searchPlaces: async () => [{ place_id: 'place-mail', name: 'Fahrschule Mail' }],
      placeDetails: async () => ({
        place_id: 'place-mail',
        name: 'Fahrschule Mail',
        website: null,
      }),
      generateSite,
    })
    const summary = await runWebsiteProspectDiscovery(deps)
    expect(generateSite).toHaveBeenCalledTimes(1)
    expect(summary.emailsSent).toBe(0)
    expect(summary.generated[0]?.status).toBe('review')
    const src = readFileSync(resolve(process.cwd(), 'server/utils/website-prospect-discover.ts'), 'utf8')
    const route = readFileSync(resolve(process.cwd(), 'server/api/cron/discover-website-prospects.get.ts'), 'utf8')
    expect(src).not.toMatch(/sendMail|resend|nodemailer|twilio/i)
    expect(route).toContain('assertCronRequest(event)')
    expect(route).toContain('emailsSent: 0')
    const handler = route.slice(route.indexOf('export default defineEventHandler'))
    expect(handler.indexOf('assertCronRequest(event)')).toBeGreaterThanOrEqual(0)
    expect(handler.indexOf('assertCronRequest(event)')).toBeLessThan(handler.indexOf('runCronWebsiteProspectDiscovery()'))
  })

  it('rejects a private website before any fetch and still stores a one-pager', async () => {
    const { deps, fetched, saved } = harness({
      searchPlaces: async () => [{ place_id: 'place-local', name: 'Fahrschule Local' }],
      placeDetails: async () => ({
        place_id: 'place-local',
        name: 'Fahrschule Local',
        website: 'http://127.0.0.1/secret',
        city: 'Bern',
      }),
    })
    await runWebsiteProspectDiscovery(deps)
    expect(fetched).toEqual([])
    expect(saved).toHaveLength(1)
    expect(saved[0].existing_url).toBeNull()
    expect(JSON.stringify(saved[0].place)).not.toContain('127.0.0.1')
    const analysis = saved[0].analysis as { architecture: { mode: string; intents: unknown[] } }
    expect(analysis.architecture.mode).toBe('one')
    expect(analysis.architecture.intents).toEqual([])
  })

  it('caps PageSpeed calls', async () => {
    const places: CronPlaceDetails[] = Array.from({ length: 5 }, (_, index) => ({
      place_id: `place-speed-${index}`,
      name: `Fahrschule ${index}`,
      website: `https://speed-${index}.example/`,
      city: 'Bern',
    }))
    const { deps, pagespeedUrls, saved } = harness({
      searchPlaces: async () => places.map((place) => ({ place_id: place.place_id, name: place.name })),
      placeDetails: async (placeId) => places.find((place) => place.place_id === placeId) || null,
      fetchPublicHtml: async (url) => ({
        html: '<html><title>Fahrschule</title><a href="/auto">Autofahren</a></html>',
        finalUrl: url,
      }),
      pagespeed: async (url) => {
        pagespeedUrls.push(url)
        return { performance: 20, seo: 20, lcp_ms: 5000, source: 'psi' }
      },
    })
    const summary = await runWebsiteProspectDiscovery(deps)
    expect(saved.length).toBe(5)
    expect(pagespeedUrls).toHaveLength(4)
    expect(summary.pagespeed).toBe(4)
  })

  it('skips the run when the Google key is missing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    delete process.env.GOOGLE_MAPS_API_KEY
    delete process.env.VITE_GOOGLE_MAPS_API_KEY
    const summary = await runCronWebsiteProspectDiscovery()
    expect(summary).toEqual({ ok: true, skipped: 'no_google_key', emailsSent: 0 })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('does not invent driving-school pages in strict mode', () => {
    const arch = decideProspectArchitecture({
      businessType: 'driving_school',
      services: [],
      city: 'Bern',
      internalPaths: ['/auto', '/moto', '/anhaenger'],
      strict: true,
    })
    expect(arch.mode).toBe('one')
    expect(arch.intents).toEqual([])
    const redirects = buildProspectRedirects(['/auto', '/moto'], arch.intents)
    expect(redirects).toEqual([])
  })

  it('keeps cron shells off trial, Stripe and customer users', () => {
    const src = readFileSync(resolve(process.cwd(), 'server/utils/website-prospect-generate.ts'), 'utf8')
    expect(src).toContain('is_trial: cronShell ? false : true')
    expect(src).toContain('subscription_plan: cronShell ? null : \'trial\'')
    expect(src).toContain('website_hosting_plan: null')
    expect(src).not.toMatch(/createUser|auth\.admin/)
    const revenue = buildProspectRevenueModel({ businessType: 'driving_school', city: 'Bern', opportunity: 70 })
    const draft = buildProspectEmailDraft({
      name: 'Fahrschule Ohne',
      city: 'Bern',
      existingUrl: null,
      previewUrl: null,
      revenue,
      findings: [],
    })
    expect(draft.text).toContain('keine Homepage')
    expect(draft.text).toContain('Dieser Entwurf wurde noch nicht an den Kunden gesendet.')
    expect(draft.text).toContain('keine Garantie')
  })
})
