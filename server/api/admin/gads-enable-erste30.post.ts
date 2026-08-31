/**
 * Promote the first Kat.-B lesson deal (CHF 65 instead of 95) without
 * raising the Altstetten daily budget or pausing Umgebung.
 *
 * - AG_Probe stays ENABLED, RSA sells the price (never the code)
 * - Extra geo-qualified first-lesson keywords
 * - AG_Local + AG_Preis (the groups that actually get clicks) get the
 *   same offer in headlines; landing pages already carry ?code=ERSTE30
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-enable-erste30 \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 *
 *   curl -X POST https://app.simy.ch/api/admin/gads-enable-erste30 \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const CAMPAIGN_ID = '24103567599'
const AG_PROBE = 'AG_Probe'
const OFFER_LANDING = 'https://drivingteam.ch/auto-fahrschule-zuerich-probe/?utm_content=ag_probe'

type Headline = { text: string; pinnedField?: string }
type Description = { text: string; pinnedField?: string }

const PROBE_RSA = {
  path1: 'Erste',
  path2: 'Lektion',
  headlines: [
    { text: 'Erste Fahrstunde Zürich', pinnedField: 'HEADLINE_1' },
    { text: 'Erste Lektion CHF 65', pinnedField: 'HEADLINE_2' },
    { text: 'statt CHF 95.–' },
    { text: 'Nur die 1. Lektion' },
    { text: 'Bahnhof Altstetten' },
    { text: 'Driving Team' },
    { text: 'Online Termin buchen' },
    { text: 'Kat. B Automatik' },
    { text: '45 Minuten' },
    { text: 'Jetzt starten' },
    { text: 'Klarer Preis' },
    { text: 'Sofort buchbar' },
  ] satisfies Headline[],
  descriptions: [
    { text: 'Erste Auto-Lektion 45 Min. für CHF 65 statt 95. Online buchen in Zürich-Altstetten.', pinnedField: 'DESCRIPTION_1' },
    { text: 'Treffpunkt Bahnhof Altstetten. Danach CHF 95.– / 45 Min. Nur Kategorie B.' },
  ] satisfies Description[],
}

const PROBE_KEYWORDS: Array<{ text: string; matchType: 'EXACT' | 'PHRASE'; cpcChf: number }> = [
  { text: 'erste fahrstunde zürich', matchType: 'PHRASE', cpcChf: 3.8 },
  { text: 'erste autofahrstunde zürich', matchType: 'PHRASE', cpcChf: 3.6 },
  { text: 'erste auto fahrstunde zürich', matchType: 'PHRASE', cpcChf: 3.6 },
  { text: 'fahrschule anfänger zürich', matchType: 'PHRASE', cpcChf: 3.5 },
  { text: 'fahrstunden anfänger zürich', matchType: 'PHRASE', cpcChf: 3.5 },
  { text: 'erste fahrstunde altstetten', matchType: 'PHRASE', cpcChf: 3.4 },
  { text: 'probe fahrstunde zürich', matchType: 'PHRASE', cpcChf: 3.2 },
  { text: 'schnupperstunde fahrschule zürich', matchType: 'PHRASE', cpcChf: 3.2 },
  { text: 'fahrschule neu starten zürich', matchType: 'PHRASE', cpcChf: 3.2 },
  { text: 'erste fahrstunde zürich rabatt', matchType: 'PHRASE', cpcChf: 3.4 },
  { text: 'günstige erste fahrstunde zürich', matchType: 'PHRASE', cpcChf: 3.4 },
]

const OFFER_HEADLINES = ['Erste Lektion CHF 65', 'statt CHF 95.–', 'Nur die 1. Lektion']
const TRAFFIC_GROUPS = ['AG_Local', 'AG_Preis']

async function gaql(customerId: string, headers: Record<string, string>, query: string): Promise<any[]> {
  const res = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`,
    { method: 'POST', headers, body: JSON.stringify({ query }) },
  )
  const data = await res.json() as any
  if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 500))
  const rows: any[] = []
  for (const batch of (Array.isArray(data) ? data : [data])) {
    rows.push(...(batch.results ?? []))
  }
  return rows
}

async function mutate(
  customerId: string,
  headers: Record<string, string>,
  resource: string,
  operations: object[],
  partialFailure = true,
): Promise<{ ok: boolean; data: any }> {
  const res = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/${resource}:mutate`,
    { method: 'POST', headers, body: JSON.stringify({ operations, partialFailure }) },
  )
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { data = { raw: text.slice(0, 500) } }
  return { ok: res.ok && !data?.partialFailureError, data }
}

function matchTypeLabel(mt: any): string {
  const s = String(mt ?? '')
  if (s === '2' || s === 'EXACT') return 'EXACT'
  if (s === '3' || s === 'PHRASE') return 'PHRASE'
  if (s === '4' || s === 'BROAD') return 'BROAD'
  return s
}

function headlineTexts(ad: any): string[] {
  return (ad?.ad?.responsiveSearchAd?.headlines ?? []).map((h: any) => String(h.text ?? ''))
}

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as { dry_run?: boolean }
  const dryRun = body?.dry_run !== false

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId
  const report: Record<string, any> = {
    dry_run: dryRun,
    campaign_id: CAMPAIGN_ID,
    offer: 'Erste Lektion CHF 65 statt 95',
    budget: 'unchanged',
  }

  const campRows = await gaql(customerId, headers, `
    SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros
    FROM campaign
    WHERE campaign.id = ${CAMPAIGN_ID}
  `)
  if (!campRows.length) {
    return { ok: false, reason: 'campaign_not_found', campaign_id: CAMPAIGN_ID }
  }
  report.campaign_status = campRows[0].campaign?.status
  report.current_budget_chf = Math.round((campRows[0].campaignBudget?.amountMicros ?? 0) / 1e4) / 100

  const agRows = await gaql(customerId, headers, `
    SELECT ad_group.id, ad_group.name, ad_group.resource_name, ad_group.status
    FROM ad_group
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND ad_group.status != 'REMOVED'
  `)
  const byName = new Map(agRows.map((r) => [String(r.adGroup?.name), r]))
  const probe = byName.get(AG_PROBE)
  if (!probe) {
    return { ok: false, reason: 'ag_probe_missing', hint: 'run gads-auto-zh-variants first' }
  }

  const probeStatus = String(probe.adGroup?.status ?? '')
  const probeEnabled = probeStatus === 'ENABLED' || probeStatus === '2'
  report.ag_probe = { id: String(probe.adGroup?.id), status: probeStatus }
  if (!probeEnabled) {
    if (dryRun) {
      report.ag_probe.action = 'would_enable'
    } else {
      const en = await mutate(customerId, headers, 'adGroups', [{
        updateMask: 'status',
        update: { resourceName: probe.adGroup.resourceName, status: 'ENABLED' },
      }])
      report.ag_probe.action = en.ok ? 'enabled' : 'enable_failed'
      if (!en.ok) report.ag_probe.detail = en.data
    }
  } else {
    report.ag_probe.action = 'already_enabled'
  }

  const kwRows = await gaql(customerId, headers, `
    SELECT ad_group.name, ad_group_criterion.resource_name,
           ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
           ad_group_criterion.status
    FROM ad_group_criterion
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND ad_group.name = '${AG_PROBE}'
      AND ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.negative = false
      AND ad_group_criterion.status != 'REMOVED'
  `)
  report.probe_keywords_now = kwRows.map((r) => ({
    text: r.adGroupCriterion?.keyword?.text,
    match: matchTypeLabel(r.adGroupCriterion?.keyword?.matchType),
    status: r.adGroupCriterion?.status,
  }))

  const existingKw = new Set(
    kwRows.map((r) => {
      const text = String(r.adGroupCriterion?.keyword?.text ?? '').toLowerCase()
      return `${text}|${matchTypeLabel(r.adGroupCriterion?.keyword?.matchType)}`
    }),
  )
  const toAdd = PROBE_KEYWORDS.filter((kw) => !existingKw.has(`${kw.text.toLowerCase()}|${kw.matchType}`))
  report.keywords_add = toAdd.map((k) => k.text)

  if (!dryRun && toAdd.length) {
    const ops = toAdd.map((kw) => ({
      create: {
        adGroup: probe.adGroup.resourceName,
        status: 'ENABLED',
        keyword: { text: kw.text, matchType: kw.matchType },
        cpcBidMicros: String(Math.round(kw.cpcChf * 1_000_000)),
      },
    }))
    const addRes = await mutate(customerId, headers, 'adGroupCriteria', ops)
    report.keywords_added = addRes.ok ? (addRes.data?.results ?? []).length : 0
    report.keywords_ok = addRes.ok
    if (!addRes.ok) report.keywords_detail = addRes.data
  }

  const adRows = await gaql(customerId, headers, `
    SELECT ad_group.name, ad_group.resource_name, ad_group_ad.resource_name,
           ad_group_ad.status, ad_group_ad.ad.final_urls,
           ad_group_ad.ad.responsive_search_ad.headlines,
           ad_group_ad.ad.responsive_search_ad.descriptions
    FROM ad_group_ad
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND ad_group_ad.status != 'REMOVED'
      AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
  `)

  const probeAds = adRows.filter((r) => r.adGroup?.name === AG_PROBE)
  const enabledProbe = probeAds.find((r) => {
    const s = String(r.adGroupAd?.status ?? '')
    return s === 'ENABLED' || s === '2'
  })
  const currentHeadlines = headlineTexts(enabledProbe?.adGroupAd)
  const probeNeedsSwap = !currentHeadlines.includes('Erste Lektion CHF 65')
    || currentHeadlines.some((h) => /ERSTE30|Code /i.test(h))
  report.probe_rsa = {
    current: currentHeadlines,
    needs_swap: probeNeedsSwap,
    landing: OFFER_LANDING,
  }

  if (probeNeedsSwap) {
    if (dryRun) {
      report.probe_rsa.action = 'would_replace'
    } else {
      if (enabledProbe?.adGroupAd?.resourceName) {
        await mutate(customerId, headers, 'adGroupAds', [{ remove: enabledProbe.adGroupAd.resourceName }], false)
      }
      const createRes = await mutate(customerId, headers, 'adGroupAds', [{
        create: {
          adGroup: probe.adGroup.resourceName,
          status: 'ENABLED',
          ad: {
            responsiveSearchAd: {
              headlines: PROBE_RSA.headlines,
              descriptions: PROBE_RSA.descriptions,
              path1: PROBE_RSA.path1,
              path2: PROBE_RSA.path2,
            },
            finalUrls: [OFFER_LANDING],
          },
        },
      }], false)
      report.probe_rsa.action = createRes.ok ? 'replaced' : 'failed'
      if (!createRes.ok) report.probe_rsa.detail = createRes.data
    }
  } else {
    report.probe_rsa.action = 'already_offer_copy'
  }

  report.traffic_rsa = [] as any[]
  for (const name of TRAFFIC_GROUPS) {
    const ag = byName.get(name)
    const enabled = adRows.find((r) => {
      const s = String(r.adGroupAd?.status ?? '')
      return r.adGroup?.name === name && (s === 'ENABLED' || s === '2')
    })
    if (!ag || !enabled) {
      report.traffic_rsa.push({ ad_group: name, action: 'skipped_no_enabled_ad' })
      continue
    }
    const headlines = headlineTexts(enabled.adGroupAd)
    const missing = OFFER_HEADLINES.filter((h) => !headlines.includes(h))
    if (!missing.length) {
      report.traffic_rsa.push({ ad_group: name, action: 'already_has_offer' })
      continue
    }
    const nextHeadlines: Headline[] = [
      ...headlines.slice(0, Math.max(0, 15 - missing.length)).map((text) => ({ text })),
      ...missing.map((text) => ({ text })),
    ].slice(0, 15)
    const descriptions = (enabled.adGroupAd?.ad?.responsiveSearchAd?.descriptions ?? [])
      .map((d: any) => ({ text: String(d.text ?? '') }))
      .filter((d: { text: string }) => d.text)
    const finalUrls = enabled.adGroupAd?.ad?.finalUrls ?? []
    if (dryRun) {
      report.traffic_rsa.push({ ad_group: name, action: 'would_add_offer_headlines', add: missing })
      continue
    }
    if (enabled.adGroupAd?.resourceName) {
      await mutate(customerId, headers, 'adGroupAds', [{ remove: enabled.adGroupAd.resourceName }], false)
    }
    const createRes = await mutate(customerId, headers, 'adGroupAds', [{
      create: {
        adGroup: ag.adGroup.resourceName,
        status: 'ENABLED',
        ad: {
          responsiveSearchAd: {
            headlines: nextHeadlines,
            descriptions: descriptions.length ? descriptions : PROBE_RSA.descriptions,
          },
          finalUrls,
        },
      },
    }], false)
    report.traffic_rsa.push({
      ad_group: name,
      action: createRes.ok ? 'added_offer_headlines' : 'failed',
      add: missing,
      detail: createRes.ok ? undefined : createRes.data,
    })
    if (!createRes.ok) logger.warn('[gads-enable-erste30] traffic rsa failed', name, JSON.stringify(createRes.data).slice(0, 250))
  }

  report.ok = true
  report.next = 'Measure 7 days on AG_Probe + mix-CPA. Do not raise budget until first-lesson bookings appear.'
  return report
})
