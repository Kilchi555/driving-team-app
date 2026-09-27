import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { assertPublicHttpUrl, safeFetchPublic, UnsafeUrlError, type DnsLookup } from '~/server/utils/ssrf-guard'
import { decideProspectArchitecture } from '~/server/utils/website-prospect-architecture'
import { buildProspectEmailDraft } from '~/server/utils/website-prospect-email'
import { fetchProspectPagespeed } from '~/server/utils/website-prospect-pagespeed'
import { generateWebsiteProspectSite } from '~/server/utils/website-prospect-generate'
import { buildProspectRevenueModel } from '~/server/utils/website-prospect-revenue'
import {
  buildProspectAnalysis,
  scoreProspectFreshness,
  scoreProspectOpportunity,
  scoreProspectSeo,
  scoreProspectSpeed,
} from '~/server/utils/website-prospect-score'
import {
  extractCityFromAddressLine,
  hostnameFromUrl,
  parseProspectHtml,
} from '~/server/utils/website-prospect-scrape'
import type {
  ProspectAnalysis,
  ProspectIntent,
  ProspectPagespeed,
  ProspectPlace,
  ProspectRedirect,
  ProspectScrape,
} from '~/server/utils/website-prospect-types'

export const PROSPECT_CRON_CITIES = [
  'Zürich',
  'Bern',
  'Basel',
  'Luzern',
  'St. Gallen',
  'Winterthur',
] as const

export const MAX_NEW = 8
export const MAX_PLACE_DETAILS = 8
export const MAX_PAGESPEED = 4
export const OPPORTUNITY_MIN = 55

export const PLACE_DETAILS_FIELDS =
  'place_id,name,formatted_address,address_components,formatted_phone_number,website,types,url,rating,user_ratings_total'

const SOCIAL_HOSTS = [
  'facebook.com',
  'fb.com',
  'instagram.com',
  'tiktok.com',
  'linktr.ee',
  'wa.me',
  'whatsapp.com',
]

const DRIVING_NOUN = 'Fahrschule'

export function googleMapsKey(): string {
  return String(process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '').trim()
}

export function cronCityForDate(date = new Date()): string {
  const year = date.getUTCFullYear()
  const start = Date.UTC(year, 0, 0)
  const day = Math.floor((Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - start) / 86_400_000)
  const index = ((day % PROSPECT_CRON_CITIES.length) + PROSPECT_CRON_CITIES.length) % PROSPECT_CRON_CITIES.length
  return PROSPECT_CRON_CITIES[index]
}

export function isSocialOnlyUrl(raw: string | null | undefined): boolean {
  if (!raw) return false
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, '')
    return SOCIAL_HOSTS.some((item) => host === item || host.endsWith(`.${item}`))
  } catch {
    return false
  }
}

export function qualifyProspect(input: {
  opportunity: number
  findings: Array<{ id?: string; title?: string }>
  noHomepage: boolean
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []
  if (input.noHomepage) reasons.push('keine Homepage')
  for (const finding of input.findings) {
    const title = String(finding.title || '').trim()
    if (title && !reasons.includes(title)) reasons.push(title)
  }
  const weakness = input.noHomepage || input.findings.length > 0
  return {
    ok: weakness && input.opportunity >= OPPORTUNITY_MIN,
    reasons: reasons.slice(0, 4),
  }
}

function fold(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '')
}

export function buildProspectRedirects(
  paths: string[] | null | undefined,
  intents: ProspectIntent[],
): ProspectRedirect[] {
  const content = (paths || []).filter(
    (path) => path && path !== '/' && !/impressum|datenschutz|privacy|agb|cookie|login/i.test(path),
  )
  const used = new Set<string>()
  const redirects: ProspectRedirect[] = []
  for (const from of content) {
    const segment = fold(from.split('/').filter(Boolean).pop() || '')
    if (!segment) continue
    const intent = intents.find((item) => {
      if (!item.slug || used.has(item.slug)) return false
      const title = fold(item.title)
      const slug = fold(item.slug)
      return title.includes(segment) || segment.includes(title) || slug.includes(segment) || segment.includes(slug)
    })
    if (!intent?.slug) continue
    used.add(intent.slug)
    redirects.push({ from, to: `/${intent.slug}` })
  }
  return redirects
}

export type CronPlaceHit = { place_id: string; name: string }

export type CronPlaceDetails = {
  place_id: string
  name: string
  address?: string | null
  phone?: string | null
  website?: string | null
  types?: string[]
  maps_url?: string | null
  rating?: number | null
  user_ratings_total?: number | null
  city?: string | null
  postal_code?: string | null
}

type AddressComponent = { long_name?: string; types?: string[] }

export function parsePlacesTextSearch(data: {
  status?: string
  results?: Array<{ place_id?: string; name?: string }>
}): CronPlaceHit[] {
  if (data?.status !== 'OK') return []
  const hits: CronPlaceHit[] = []
  for (const row of data.results || []) {
    const place_id = String(row?.place_id || '').trim()
    const name = String(row?.name || '').trim()
    if (place_id && name) hits.push({ place_id, name })
  }
  return hits
}

export function parsePlaceDetails(data: {
  status?: string
  result?: {
    place_id?: string
    name?: string
    formatted_address?: string
    formatted_phone_number?: string
    website?: string
    types?: string[]
    url?: string
    rating?: number
    user_ratings_total?: number
    address_components?: AddressComponent[]
    reviews?: unknown
    opening_hours?: unknown
    photos?: unknown
  }
}): CronPlaceDetails | null {
  if (data?.status && data.status !== 'OK') return null
  const row = data?.result
  const place_id = String(row?.place_id || '').trim()
  const name = String(row?.name || '').trim()
  if (!place_id || !name) return null
  const comps = row?.address_components || []
  const locality = comps.find((item) => item.types?.includes('locality'))?.long_name || null
  const postal = comps.find((item) => item.types?.includes('postal_code'))?.long_name || null
  const fromAddress = extractCityFromAddressLine(row?.formatted_address)
  return {
    place_id,
    name,
    address: row?.formatted_address || null,
    phone: row?.formatted_phone_number || null,
    website: row?.website || null,
    types: row?.types || [],
    maps_url: row?.url || null,
    rating: row?.rating ?? null,
    user_ratings_total: row?.user_ratings_total ?? null,
    city: locality || fromAddress.city,
    postal_code: postal || fromAddress.postal_code,
  }
}

export type ProspectDiscoveryDeps = {
  now?: Date
  lookup?: DnsLookup
  searchPlaces: (query: string) => Promise<CronPlaceHit[]>
  placeDetails: (placeId: string) => Promise<CronPlaceDetails | null>
  knownPlaceIds: (ids: string[]) => Promise<string[]>
  fetchPublicHtml: (url: string) => Promise<{ html: string; finalUrl: string }>
  pagespeed: (url: string) => Promise<ProspectPagespeed>
  saveProspect: (row: Record<string, unknown>) => Promise<{ id: string }>
  generateSite: (id: string) => Promise<{ status?: string | null; email_sent_at?: string | null }>
}

export type DiscoverySummary = {
  city: string
  searched: number
  details: number
  created: number
  skippedDuplicate: number
  skippedWeak: number
  unsafeUrls: number
  pagespeed: number
  errors: number
  emailsSent: 0
  generated: Array<{ id: string; place_id: string; status: string }>
}

function emptyPagespeed(): ProspectPagespeed {
  return { performance: null, seo: null, lcp_ms: null, source: 'skipped' }
}

function isDuplicateError(err: unknown) {
  const row = err as { code?: string; message?: string }
  return row?.code === '23505' || /duplicate|unique/i.test(String(row?.message || ''))
}

async function loadPublicSite(
  website: string,
  deps: ProspectDiscoveryDeps,
): Promise<{ scrape: ProspectScrape | null; unsafe: boolean; failed: boolean }> {
  try {
    await assertPublicHttpUrl(website, { lookup: deps.lookup })
  } catch (err) {
    if (err instanceof UnsafeUrlError) return { scrape: null, unsafe: true, failed: false }
    return { scrape: null, unsafe: false, failed: true }
  }
  try {
    const fetched = await deps.fetchPublicHtml(website)
    return {
      scrape: parseProspectHtml(fetched.html, fetched.finalUrl || website),
      unsafe: false,
      failed: false,
    }
  } catch {
    return { scrape: null, unsafe: false, failed: true }
  }
}

function placeRecord(details: CronPlaceDetails, website: string | null): ProspectPlace {
  return {
    place_id: details.place_id,
    name: details.name,
    address: details.address || null,
    phone: details.phone || null,
    website,
    rating: details.rating ?? null,
    user_ratings_total: details.user_ratings_total ?? null,
    maps_url: details.maps_url || null,
    types: details.types || [],
    reviews: [],
    opening_hours: [],
    photos: [],
    city: details.city || null,
    postal_code: details.postal_code || null,
  }
}

export async function runWebsiteProspectDiscovery(deps: ProspectDiscoveryDeps): Promise<DiscoverySummary> {
  const city = cronCityForDate(deps.now)
  const hits = await deps.searchPlaces(`Fahrschule ${city}`)
  const known = new Set(await deps.knownPlaceIds(hits.map((hit) => hit.place_id).filter(Boolean)))
  const summary: DiscoverySummary = {
    city,
    searched: hits.length,
    details: 0,
    created: 0,
    skippedDuplicate: 0,
    skippedWeak: 0,
    unsafeUrls: 0,
    pagespeed: 0,
    errors: 0,
    emailsSent: 0,
    generated: [],
  }

  for (const hit of hits) {
    if (summary.created >= MAX_NEW) break
    if (!hit.place_id) continue
    if (known.has(hit.place_id)) {
      summary.skippedDuplicate += 1
      continue
    }
    if (summary.details >= MAX_PLACE_DETAILS) break
    known.add(hit.place_id)
    summary.details += 1

    let details: CronPlaceDetails | null
    try {
      details = await deps.placeDetails(hit.place_id)
    } catch {
      summary.errors += 1
      continue
    }
    if (!details?.place_id || !details.name) continue

    const website = String(details.website || '').trim()
    const social = isSocialOnlyUrl(website)
    const noRealSite = !website || social
    let scrape: ProspectScrape | null = null
    if (!noRealSite) {
      const loaded = await loadPublicSite(website, deps)
      if (loaded.unsafe) summary.unsafeUrls += 1
      if (loaded.failed) {
        summary.errors += 1
        continue
      }
      if (loaded.unsafe) {
        scrape = null
      } else {
        scrape = loaded.scrape
      }
    }

    const noHomepage = noRealSite || !scrape
    let pagespeed = emptyPagespeed()
    if (scrape?.final_url && summary.pagespeed < MAX_PAGESPEED) {
      summary.pagespeed += 1
      try {
        pagespeed = await deps.pagespeed(scrape.final_url)
      } catch {
        pagespeed = { performance: null, seo: null, lcp_ms: null, source: 'error', error: 'pagespeed failed' }
      }
    }

    const seo = scoreProspectSeo(scrape, details.city || city, DRIVING_NOUN)
    const freshness = scoreProspectFreshness(scrape)
    const speed = scoreProspectSpeed(pagespeed)
    const scored = scoreProspectOpportunity({ seo, freshness, speed, scrape })
    const qualified = qualifyProspect({
      opportunity: scored.opportunity,
      findings: scored.findings,
      noHomepage,
    })
    if (!qualified.ok) {
      summary.skippedWeak += 1
      continue
    }

    const services = scrape?.services || []
    const internalPaths = scrape?.internal_paths || []
    const hasPrice = false
    const architecture = decideProspectArchitecture({
      businessType: 'driving_school',
      services,
      city: details.city || city,
      internalPaths,
      strict: true,
      hasPrice,
    })
    const redirects = buildProspectRedirects(internalPaths, architecture.intents)
    const analysis: ProspectAnalysis = buildProspectAnalysis({
      name: details.name,
      seo,
      freshness,
      speed,
      scrape,
    })
    if (noHomepage) {
      analysis.findings = [
        {
          id: 'homepage',
          severity: 'high',
          title: 'Keine Homepage',
          detail: 'Places hat keine eigene Website. Social-Profile zählen nicht als Homepage.',
        },
        ...analysis.findings,
      ].slice(0, 8)
    }
    analysis.architecture = architecture
    analysis.selection_reasons = qualified.reasons
    analysis.redirects = redirects
    analysis.recommend_generate = true

    const existingUrl = scrape?.final_url || null
    const revenue = buildProspectRevenueModel({
      businessType: 'driving_school',
      city: details.city || city,
      opportunity: scored.opportunity,
    })
    const emailDraft = buildProspectEmailDraft({
      name: details.name,
      city: details.city || city,
      existingUrl,
      previewUrl: null,
      revenue,
      findings: analysis.findings,
    })
    const now = new Date().toISOString()
    const row = {
      name: details.name,
      business_type: 'driving_school',
      existing_url: existingUrl,
      hostname: hostnameFromUrl(existingUrl),
      email: scrape?.emails?.[0] || null,
      phone: details.phone || scrape?.phones?.[0] || null,
      address: details.address || null,
      city: details.city || city,
      postal_code: details.postal_code || null,
      country: 'CH',
      place_id: details.place_id,
      source: 'places_cron',
      status: 'scored',
      speed_score: speed,
      seo_score: seo,
      freshness_score: freshness,
      opportunity_score: scored.opportunity,
      pagespeed,
      scrape,
      analysis,
      revenue_model: revenue,
      email_draft: emailDraft,
      place: placeRecord(details, existingUrl),
      scraped_at: scrape ? now : null,
      preview_token: null,
      updated_at: now,
    }

    try {
      const saved = await deps.saveProspect(row)
      const site = await deps.generateSite(saved.id)
      summary.created += 1
      summary.generated.push({
        id: saved.id,
        place_id: details.place_id,
        status: site.status || 'review',
      })
    } catch (err) {
      if (isDuplicateError(err)) summary.skippedDuplicate += 1
      else summary.errors += 1
    }
  }

  return summary
}

async function placesGet(path: 'textsearch' | 'details', params: Record<string, string>, key: string) {
  const url = new URL(`https://maps.googleapis.com/maps/api/place/${path}/json`)
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value)
  url.searchParams.set('language', 'de')
  url.searchParams.set('key', key)
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function runCronWebsiteProspectDiscovery(): Promise<
  DiscoverySummary | { ok: true; skipped: 'no_google_key'; emailsSent: 0 }
> {
  const key = googleMapsKey()
  if (!key) return { ok: true, skipped: 'no_google_key', emailsSent: 0 }

  const supabase = getSupabaseAdmin()
  return runWebsiteProspectDiscovery({
    searchPlaces: async (query) => {
      const data = await placesGet('textsearch', { query, region: 'ch' }, key)
      return data ? parsePlacesTextSearch(data) : []
    },
    placeDetails: async (placeId) => {
      const data = await placesGet('details', { place_id: placeId, fields: PLACE_DETAILS_FIELDS }, key)
      return data ? parsePlaceDetails(data) : null
    },
    knownPlaceIds: async (ids) => {
      if (!ids.length) return []
      const { data } = await supabase.from('website_prospects').select('place_id').in('place_id', ids)
      return (data || []).map((row: { place_id?: string | null }) => String(row.place_id || '')).filter(Boolean)
    },
    fetchPublicHtml: async (url) => {
      const fetched = await safeFetchPublic(url)
      return { html: fetched.body, finalUrl: fetched.finalUrl }
    },
    pagespeed: (url) => fetchProspectPagespeed(url),
    saveProspect: async (row) => {
      const { data, error } = await supabase.from('website_prospects').insert(row).select('id').single()
      if (error || !data?.id) throw error || new Error('prospect insert failed')
      return { id: data.id }
    },
    generateSite: async (id) => {
      const updated = await generateWebsiteProspectSite(id)
      return { status: updated.status, email_sent_at: updated.email_sent_at }
    },
  })
}
