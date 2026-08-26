import { getTerminologyDefaults } from '~/composables/useTerminology'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { buildProspectEmailDraft } from '~/server/utils/website-prospect-email'
import { fetchProspectPagespeed } from '~/server/utils/website-prospect-pagespeed'
import { resolveProspectPlace } from '~/server/utils/website-prospect-place'
import { buildProspectRevenueModel } from '~/server/utils/website-prospect-revenue'
import {
  fetchProspectHtml,
  hostnameFromUrl,
  inferBusinessType,
  normalizeProspectUrl,
  parseProspectHtml,
} from '~/server/utils/website-prospect-scrape'
import { decideProspectArchitecture } from '~/server/utils/website-prospect-architecture'
import {
  buildProspectAnalysis,
  scoreProspectFreshness,
  scoreProspectOpportunity,
  scoreProspectSeo,
  scoreProspectSpeed,
} from '~/server/utils/website-prospect-score'
import type { WebsiteProspectRow } from '~/server/utils/website-prospect-types'

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

function emptyScrape() {
  return parseProspectHtml('', '')
}

async function findMatchedTenant(
  supabase: SupabaseAdmin,
  hostname: string | null,
  name: string,
) {
  if (hostname) {
    const { data } = await supabase
      .from('tenants')
      .select('id, name, slug, website_url, website_only')
      .ilike('website_url', `%${hostname}%`)
      .limit(3)
    if (data?.[0]) return data[0]
  }
  const { data } = await supabase
    .from('tenants')
    .select('id, name, slug, website_url, website_only')
    .ilike('name', name.slice(0, 48))
    .limit(3)
  return data?.[0] || null
}

async function findExistingProspect(
  supabase: SupabaseAdmin,
  opts: { hostname: string | null; placeId: string | null },
) {
  if (opts.placeId) {
    const { data } = await supabase
      .from('website_prospects')
      .select('*')
      .eq('place_id', opts.placeId)
      .maybeSingle()
    if (data) return data
  }
  if (opts.hostname) {
    const { data } = await supabase
      .from('website_prospects')
      .select('*')
      .eq('hostname', opts.hostname)
      .maybeSingle()
    if (data) return data
  }
  return null
}

export async function analyzeWebsiteProspect(input: {
  url?: string | null
  name?: string | null
  city?: string | null
  businessType?: string | null
}) {
  const supabase = getSupabaseAdmin()
  const url = input.url ? normalizeProspectUrl(input.url) : null
  if (!url && !String(input.name || '').trim()) {
    throw createError({ statusCode: 400, statusMessage: 'URL oder Firmenname nötig' })
  }

  let scrape = emptyScrape()
  let scrapedAt: string | null = null
  if (url) {
    try {
      const fetched = await fetchProspectHtml(url)
      scrape = parseProspectHtml(fetched.html, fetched.finalUrl)
      scrapedAt = new Date().toISOString()
    } catch (err: any) {
      scrape = {
        ...emptyScrape(),
        final_url: url,
      }
      scrape.cms = `fetch_failed:${err?.message || 'error'}`
    }
  }

  const guessedName =
    String(input.name || '').trim() ||
    String(scrape.h1 || '').trim() ||
    String(scrape.title || '').split(/[|\-–—]/)[0].trim() ||
    hostnameFromUrl(url || scrape.final_url) ||
    'Unbekannt'

  const [place, pagespeed] = await Promise.all([
    resolveProspectPlace({
      name: guessedName,
      city: input.city,
      url: url || scrape.final_url,
    }),
    url ? fetchProspectPagespeed(url) : Promise.resolve({
      performance: null,
      seo: null,
      lcp_ms: null,
      source: 'skipped' as const,
    }),
  ])

  const city = input.city || place?.city || null
  const name = place?.name || guessedName
  const existingUrl = place?.website || scrape.final_url || url
  const hostname = hostnameFromUrl(existingUrl)
  const blob = [scrape.title, scrape.description, scrape.h1, name, place?.types?.join(' ')].join(' ')
  const businessType =
    String(input.businessType || '').trim() || inferBusinessType(blob, place?.types || [])
  const noun = getTerminologyDefaults(businessType).businessNoun
  const seo = scoreProspectSeo(url ? scrape : null, city, noun)
  const freshness = scoreProspectFreshness(url ? scrape : null)
  const speed = scoreProspectSpeed(pagespeed)
  const architecture = decideProspectArchitecture({
    businessType,
    services: scrape.services,
    city,
    internalPaths: scrape.internal_paths,
  })
  const analysis = buildProspectAnalysis({ name, seo, freshness, speed, scrape: url ? scrape : null })
  analysis.architecture = architecture
  analysis.summary +=
    architecture.mode === 'multi'
      ? ` Architektur: Multipager (${architecture.intents.map((i) => i.title).join(', ')}).`
      : ' Architektur: One-Pager.'
  const opportunity = scoreProspectOpportunity({
    seo,
    freshness,
    speed,
    scrape: url ? scrape : null,
  }).opportunity
  const revenue = buildProspectRevenueModel({
    businessType,
    city,
    opportunity,
  })
  const emailDraft = buildProspectEmailDraft({
    name,
    city,
    existingUrl,
    previewUrl: null,
    revenue,
    findings: analysis.findings,
  })

  const matched = await findMatchedTenant(supabase, hostname, name)
  const existing = await findExistingProspect(supabase, {
    hostname,
    placeId: place?.place_id || null,
  })

  const payload = {
    name,
    business_type: businessType,
    existing_url: existingUrl || null,
    hostname,
    email: scrape.emails[0] || null,
    phone: place?.phone || scrape.phones[0] || null,
    address: place?.address || null,
    city,
    postal_code: place?.postal_code || null,
    place_id: place?.place_id || null,
    source: 'manual' as const,
    status: existing?.tenant_id ? existing.status : 'scored',
    speed_score: speed,
    seo_score: seo,
    freshness_score: freshness,
    opportunity_score: opportunity,
    pagespeed,
    scrape: url ? scrape : null,
    analysis,
    revenue_model: revenue,
    email_draft: existing?.preview_url
      ? buildProspectEmailDraft({
          name,
          city,
          existingUrl,
          previewUrl: existing.preview_url,
          revenue,
          findings: analysis.findings,
        })
      : emailDraft,
    place,
    scraped_at: scrapedAt,
    matched_tenant_id: matched?.id || null,
    updated_at: new Date().toISOString(),
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('website_prospects')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return data as WebsiteProspectRow
  }

  const { data, error } = await supabase
    .from('website_prospects')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data as WebsiteProspectRow
}
