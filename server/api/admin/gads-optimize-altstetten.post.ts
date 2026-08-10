/**
 * One-shot: Altstetten + 10km conversion playbook.
 *
 * 1. Geo 12 → 10 km Presence around Altstetten
 * 2. Pause city PHRASE keywords (fahrschule zürich etc.) that burn QS-3 budget
 * 3. Add competitor + wrong-product negatives
 * 4. Add local Exact/Phrase keywords (+ optional Quartiere ad group)
 * 5. Refresh RSAs with local intent headlines
 * 6. Set daily budget to CHF 35
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-optimize-altstetten \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 *
 *   curl -X POST https://app.simy.ch/api/admin/gads-optimize-altstetten \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false, "daily_budget_chf": 35 }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const CAMPAIGN_ID = '24103567599'
const CAMPAIGN_NAME = 'Fahrschule Zürich / Altstetten'
const LANDING_PAGE = 'https://drivingteam.ch/auto-fahrschule-zuerich/'

// Altstetten Bahnhof
const GEO = {
  latitudeInMicroDegrees: 47_389_700,
  longitudeInMicroDegrees: 8_488_300,
  radiusKm: 10,
}

const CITY_PHRASE_TO_PAUSE = [
  'fahrschule zürich',
  'fahrlehrer zürich',
  'autofahrschule zürich',
  'auto fahrschule zürich',
  'fahrstunden zürich',
]

const NEGATIVES = [
  // Competitors from live search terms
  'koch',
  'koch fahrschule',
  'fahrschule koch',
  'gabi senn',
  'gianni sebestin',
  'sebestin',
  'claudio candinas',
  'candinas',
  'sami pacolli',
  'pacolli',
  'de cristofaro',
  'locher',
  'fahrschule locher',
  'halide',
  'charly fahrschule',
  'fahrschule suli',
  'massimo fahrschule',
  'fahrmittesta',
  'minet',
  'kalberer',
  'max drive',
  'team humm',
  'drivelab',
  'letzhgo',
  'florin',
  'freedriver',
  'cambus',
  // Wrong product / geo
  'roller',
  'rollerkurs',
  'roller kurs',
  'vespa',
  'töffli',
  'mofa',
  'motorrad',
  'a1 grundkurs',
  'transportschule',
  'wetzikon',
  'wallisellen',
  'regensdorf',
  'fahrschule regensdorf',
  'www zh ch',
]

const LOCAL_KEYWORDS: Array<{ text: string; matchType: 'EXACT' | 'PHRASE'; cpcChf: number }> = [
  { text: 'fahrschule altstetten', matchType: 'EXACT', cpcChf: 3.8 },
  { text: 'fahrschule altstetten', matchType: 'PHRASE', cpcChf: 3.5 },
  { text: 'fahrlehrer altstetten', matchType: 'EXACT', cpcChf: 3.5 },
  { text: 'fahrlehrer altstetten', matchType: 'PHRASE', cpcChf: 3.2 },
  { text: 'fahrstunden altstetten', matchType: 'EXACT', cpcChf: 3.5 },
  { text: 'fahrstunden altstetten', matchType: 'PHRASE', cpcChf: 3.2 },
  { text: 'fahrschule zürich altstetten', matchType: 'EXACT', cpcChf: 3.8 },
  { text: 'fahrschule zürich altstetten', matchType: 'PHRASE', cpcChf: 3.5 },
  { text: 'autofahrschule altstetten', matchType: 'PHRASE', cpcChf: 3.5 },
  { text: 'fahrschule 8048', matchType: 'PHRASE', cpcChf: 3.2 },
  { text: 'fahrschule bahnhof altstetten', matchType: 'PHRASE', cpcChf: 3.5 },
  { text: 'auto fahrschule altstetten', matchType: 'PHRASE', cpcChf: 3.5 },
]

const QUARTIER_KEYWORDS: Array<{ text: string; matchType: 'EXACT' | 'PHRASE'; cpcChf: number }> = [
  { text: 'fahrschule schlieren', matchType: 'EXACT', cpcChf: 3.5 },
  { text: 'fahrschule schlieren', matchType: 'PHRASE', cpcChf: 3.2 },
  { text: 'fahrlehrer schlieren', matchType: 'PHRASE', cpcChf: 3.0 },
  { text: 'fahrschule albisrieden', matchType: 'PHRASE', cpcChf: 3.2 },
  { text: 'fahrschule höngg', matchType: 'PHRASE', cpcChf: 3.2 },
  { text: 'fahrschule hoengg', matchType: 'PHRASE', cpcChf: 3.0 },
  { text: 'fahrschule urdorf', matchType: 'PHRASE', cpcChf: 3.2 },
  { text: 'fahrschule hardbrücke', matchType: 'PHRASE', cpcChf: 3.0 },
  { text: 'fahrschule zürich west', matchType: 'PHRASE', cpcChf: 3.2 },
  { text: 'fahrschule grünau', matchType: 'PHRASE', cpcChf: 2.8 },
]

const CREATIVES: Record<string, {
  headlines: Array<{ text: string; pinnedField?: string }>
  descriptions: Array<{ text: string; pinnedField?: string }>
  path1: string
  path2: string
}> = {
  'Fahrschule Zürich': {
    headlines: [
      { text: 'Fahrschule Zürich West', pinnedField: 'HEADLINE_1' },
      { text: 'Standort Altstetten', pinnedField: 'HEADLINE_2' },
      { text: 'Fahrstunde ab CHF 95' },
      { text: 'Bahnhof Altstetten' },
      { text: 'Online Termin buchen' },
      { text: 'Prüfungsgebiet Albisgütli' },
      { text: 'Kat. B Auto' },
      { text: 'Hohlstrasse 544' },
      { text: 'Driving Team Zürich' },
      { text: 'Jetzt buchen' },
      { text: '85% Erfolgsquote' },
      { text: 'Automatik & Schaltung' },
    ],
    descriptions: [
      { text: 'Fahrschule am Bahnhof Altstetten — klarer Preis ab CHF 95, online buchbar.', pinnedField: 'DESCRIPTION_1' },
      { text: 'Wir üben im Prüfungsgebiet Albisgütli. Termin in 2 Minuten sichern.' },
    ],
    path1: 'Altstetten',
    path2: 'Buchen',
  },
  'Fahrschule Altstetten': {
    headlines: [
      { text: 'Fahrschule Altstetten', pinnedField: 'HEADLINE_1' },
      { text: 'Direkt am Bahnhof', pinnedField: 'HEADLINE_2' },
      { text: 'Fahrstunde ab CHF 95' },
      { text: 'Online Termin buchen' },
      { text: 'Prüfungsgebiet Albisgütli' },
      { text: 'Driving Team Zürich' },
      { text: 'Hohlstrasse 544' },
      { text: 'Jetzt buchen' },
      { text: 'Kat. B — Auto' },
      { text: '8048 Zürich' },
      { text: 'Flexibel & klar' },
      { text: '85% Erfolgsquote' },
    ],
    descriptions: [
      { text: 'Fahrschule Altstetten: Treffpunkt Bahnhof, Fahrstunde ab CHF 95, online buchbar.', pinnedField: 'DESCRIPTION_1' },
      { text: 'Driving Team — Standort Altstetten. Albisgütli-Prüfung gezielt vorbereiten.' },
    ],
    path1: 'Altstetten',
    path2: '8048',
  },
  'Quartiere 10km': {
    headlines: [
      { text: 'Fahrschule Zürich West', pinnedField: 'HEADLINE_1' },
      { text: 'Schlieren · Höngg · Urdorf', pinnedField: 'HEADLINE_2' },
      { text: 'Treffpunkt Altstetten' },
      { text: 'Fahrstunde ab CHF 95' },
      { text: 'Online Termin buchen' },
      { text: 'Albisrieden & Hardbrücke' },
      { text: 'Driving Team' },
      { text: 'Jetzt buchen' },
      { text: 'Prüfungsgebiet Albisgütli' },
      { text: 'Kat. B Auto' },
      { text: 'Flexible Treffpunkte' },
      { text: 'Klarer Preis' },
    ],
    descriptions: [
      { text: 'Fahrstunden für Schlieren, Höngg, Albisrieden, Urdorf — Treffpunkt Altstetten.', pinnedField: 'DESCRIPTION_1' },
      { text: 'Ab CHF 95 / 45 Min. Online buchen. Driving Team Zürich West.' },
    ],
    path1: 'Zuerich-West',
    path2: 'Buchen',
  },
}

async function gaql(customerId: string, headers: Record<string, string>, query: string): Promise<any[]> {
  const res = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`,
    { method: 'POST', headers, body: JSON.stringify({ query }) },
  )
  const data = await res.json() as any
  if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 400))
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
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ operations, partialFailure }),
    },
  )
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { data = { raw: text.slice(0, 500) } }
  return { ok: res.ok && !data?.partialFailureError, data }
}

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as any
  const dryRun = body?.dry_run !== false
  const dailyBudgetChf = Math.min(80, Math.max(20, Number(body?.daily_budget_chf) || 35))

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId
  const campaignResource = `customers/${customerId}/campaigns/${CAMPAIGN_ID}`
  const report: Record<string, any> = { campaign_id: CAMPAIGN_ID, campaign_name: CAMPAIGN_NAME, dry_run: dryRun }

  // ── 0. Verify campaign exists ──────────────────────────────────────────────
  const campRows = await gaql(customerId, headers, `
    SELECT campaign.id, campaign.name, campaign.status,
           campaign_budget.resource_name, campaign_budget.amount_micros
    FROM campaign
    WHERE campaign.id = ${CAMPAIGN_ID}
  `)
  if (!campRows.length) {
    return { success: false, reason: 'campaign_not_found', campaign_id: CAMPAIGN_ID }
  }
  const camp = campRows[0]
  report.current_status = camp.campaign?.status
  report.current_budget_chf = Math.round((camp.campaignBudget?.amountMicros ?? 0) / 1e4) / 100

  // ── 1. Geo: replace proximity with 10 km ───────────────────────────────────
  const geoRows = await gaql(customerId, headers, `
    SELECT campaign_criterion.resource_name, campaign_criterion.proximity.radius,
           campaign_criterion.proximity.radius_units
    FROM campaign_criterion
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND campaign_criterion.type = 'PROXIMITY'
      AND campaign_criterion.negative = false
  `)
  report.geo = {
    existing: geoRows.map((r) => ({
      resource: r.campaignCriterion?.resourceName,
      radius: r.campaignCriterion?.proximity?.radius,
      units: r.campaignCriterion?.proximity?.radiusUnits,
    })),
    target_km: GEO.radiusKm,
  }

  if (!dryRun) {
    const geoOps: object[] = []
    for (const row of geoRows) {
      if (row.campaignCriterion?.resourceName) {
        geoOps.push({ remove: row.campaignCriterion.resourceName })
      }
    }
    geoOps.push({
      create: {
        campaign: campaignResource,
        proximity: {
          geoPoint: {
            latitudeInMicroDegrees: GEO.latitudeInMicroDegrees,
            longitudeInMicroDegrees: GEO.longitudeInMicroDegrees,
          },
          radius: GEO.radiusKm,
          radiusUnits: 'KILOMETERS',
        },
      },
    })
    const geoRes = await mutate(customerId, headers, 'campaignCriteria', geoOps)
    report.geo.applied = geoRes.ok
    report.geo.detail = geoRes.ok ? 'replaced_with_10km' : geoRes.data
    if (!geoRes.ok) logger.warn('[gads-optimize-altstetten] geo failed', JSON.stringify(geoRes.data).slice(0, 300))
  }

  // ── 2. Pause city PHRASE keywords ──────────────────────────────────────────
  const kwRows = await gaql(customerId, headers, `
    SELECT ad_group_criterion.resource_name, ad_group_criterion.keyword.text,
           ad_group_criterion.keyword.match_type, ad_group_criterion.status,
           ad_group.name
    FROM ad_group_criterion
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.negative = false
      AND ad_group_criterion.status = 'ENABLED'
  `)
  const pauseSet = new Set(CITY_PHRASE_TO_PAUSE)
  const toPause = kwRows.filter((r) => {
    const text = String(r.adGroupCriterion?.keyword?.text ?? '').toLowerCase()
    const match = String(r.adGroupCriterion?.keyword?.matchType ?? '')
    return pauseSet.has(text) && match === 'PHRASE'
  })
  report.pause_city_phrase = {
    count: toPause.length,
    keywords: toPause.map((r) => ({
      text: r.adGroupCriterion?.keyword?.text,
      ad_group: r.adGroup?.name,
    })),
  }
  if (!dryRun && toPause.length) {
    const pauseOps = toPause.map((r) => ({
      updateMask: 'status',
      update: {
        resourceName: r.adGroupCriterion.resourceName,
        status: 'PAUSED',
      },
    }))
    const pauseRes = await mutate(customerId, headers, 'adGroupCriteria', pauseOps)
    report.pause_city_phrase.applied = pauseRes.ok
    report.pause_city_phrase.detail = pauseRes.ok ? `paused_${toPause.length}` : pauseRes.data
  }

  // ── 3. Negatives ───────────────────────────────────────────────────────────
  const existingNegRows = await gaql(customerId, headers, `
    SELECT campaign_criterion.keyword.text
    FROM campaign_criterion
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND campaign_criterion.type = 'KEYWORD'
      AND campaign_criterion.negative = true
  `)
  const existingNeg = new Set(
    existingNegRows.map((r) => String(r.campaignCriterion?.keyword?.text ?? '').toLowerCase()),
  )
  const negsToAdd = NEGATIVES.filter((n) => !existingNeg.has(n.toLowerCase()))
  report.negatives = { to_add: negsToAdd.length, skipped_existing: NEGATIVES.length - negsToAdd.length, sample: negsToAdd.slice(0, 15) }
  if (!dryRun && negsToAdd.length) {
    const negOps = negsToAdd.map((text) => ({
      create: {
        campaign: campaignResource,
        negative: true,
        keyword: { text, matchType: 'BROAD' },
      },
    }))
    // Batch in chunks of 50
    let added = 0
    for (let i = 0; i < negOps.length; i += 50) {
      const chunk = negOps.slice(i, i + 50)
      const negRes = await mutate(customerId, headers, 'campaignCriteria', chunk)
      if (negRes.ok) added += (negRes.data?.results ?? []).length
      else logger.warn('[gads-optimize-altstetten] negatives chunk failed', JSON.stringify(negRes.data).slice(0, 300))
    }
    report.negatives.added = added
  }

  // ── 4. Ensure ad groups + local keywords ───────────────────────────────────
  const agRows = await gaql(customerId, headers, `
    SELECT ad_group.id, ad_group.name, ad_group.resource_name, ad_group.status
    FROM ad_group
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND ad_group.status != 'REMOVED'
  `)
  const adGroupsByName = new Map<string, { id: string; resource: string }>()
  for (const r of agRows) {
    adGroupsByName.set(r.adGroup?.name, {
      id: String(r.adGroup?.id),
      resource: r.adGroup?.resourceName,
    })
  }
  report.ad_groups = [...adGroupsByName.keys()]

  // Create Quartiere ad group if missing
  if (!adGroupsByName.has('Quartiere 10km')) {
    report.quartier_ad_group = { action: dryRun ? 'would_create' : 'creating' }
    if (!dryRun) {
      const agRes = await mutate(customerId, headers, 'adGroups', [{
        create: {
          name: 'Quartiere 10km',
          campaign: campaignResource,
          status: 'ENABLED',
          type: 'SEARCH_STANDARD',
          cpcBidMicros: 3_200_000,
        },
      }])
      const rn = agRes.data?.results?.[0]?.resourceName
      if (agRes.ok && rn) {
        adGroupsByName.set('Quartiere 10km', { id: rn.split('/').pop()!, resource: rn })
        report.quartier_ad_group = { action: 'created', resource: rn }
      } else {
        report.quartier_ad_group = { action: 'failed', detail: agRes.data }
      }
    }
  }

  // Existing positive keywords for dedupe
  const allKwRows = await gaql(customerId, headers, `
    SELECT ad_group.id, ad_group.name, ad_group_criterion.keyword.text,
           ad_group_criterion.keyword.match_type, ad_group_criterion.status
    FROM ad_group_criterion
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.negative = false
      AND ad_group_criterion.status != 'REMOVED'
  `)
  const existingKwKeys = new Set(
    allKwRows.map((r) => {
      const ag = r.adGroup?.name
      const text = String(r.adGroupCriterion?.keyword?.text ?? '').toLowerCase()
      const mt = String(r.adGroupCriterion?.keyword?.matchType ?? '')
      return `${ag}|${text}|${mt}`
    }),
  )

  async function addKeywordsToAdGroup(
    adGroupName: string,
    keywords: Array<{ text: string; matchType: 'EXACT' | 'PHRASE'; cpcChf: number }>,
  ) {
    const ag = adGroupsByName.get(adGroupName)
    if (!ag) return { ad_group: adGroupName, added: 0, skipped: keywords.length, reason: 'ad_group_missing' }
    const toCreate = keywords.filter((kw) => !existingKwKeys.has(`${adGroupName}|${kw.text.toLowerCase()}|${kw.matchType}`))
    if (dryRun) return { ad_group: adGroupName, would_add: toCreate.length, sample: toCreate.slice(0, 8) }
    if (!toCreate.length) return { ad_group: adGroupName, added: 0, skipped: keywords.length }

    const ops = toCreate.map((kw) => ({
      create: {
        adGroup: ag.resource,
        status: 'ENABLED',
        keyword: { text: kw.text, matchType: kw.matchType },
        cpcBidMicros: String(Math.round(kw.cpcChf * 1_000_000)),
      },
    }))
    const res = await mutate(customerId, headers, 'adGroupCriteria', ops)
    return {
      ad_group: adGroupName,
      added: res.ok ? (res.data?.results ?? []).length : 0,
      ok: res.ok,
      detail: res.ok ? undefined : res.data,
    }
  }

  report.keywords = {
    altstetten: await addKeywordsToAdGroup('Fahrschule Altstetten', LOCAL_KEYWORDS),
    quartiere: await addKeywordsToAdGroup('Quartiere 10km', QUARTIER_KEYWORDS),
  }

  // Lower CPC on remaining Exact city keywords in "Fahrschule Zürich" ad group
  const exactBidRows = await gaql(customerId, headers, `
    SELECT ad_group_criterion.resource_name, ad_group_criterion.keyword.text,
           ad_group_criterion.keyword.match_type, ad_group_criterion.cpc_bid_micros
    FROM ad_group_criterion
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND ad_group.name = 'Fahrschule Zürich'
      AND ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.negative = false
      AND ad_group_criterion.status = 'ENABLED'
      AND ad_group_criterion.keyword.match_type = 'EXACT'
  `)
  const toCap = exactBidRows.filter((r) =>
    pauseSet.has(String(r.adGroupCriterion?.keyword?.text ?? '').toLowerCase()),
  )
  report.city_exact_bid_cap = { count: toCap.length, target_cpc_chf: 2.5 }
  if (!dryRun && toCap.length) {
    const bidOps = toCap.map((r) => ({
      updateMask: 'cpcBidMicros',
      update: {
        resourceName: r.adGroupCriterion.resourceName,
        cpcBidMicros: '2500000',
      },
    }))
    const bidRes = await mutate(customerId, headers, 'adGroupCriteria', bidOps)
    report.city_exact_bid_cap.applied = bidRes.ok
  }

  // ── 5. RSA refresh (+ create for Quartiere) ────────────────────────────────
  const adRows = await gaql(customerId, headers, `
    SELECT ad_group.id, ad_group.name, ad_group_ad.resource_name,
           ad_group_ad.ad.responsive_search_ad.headlines
    FROM ad_group_ad
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND ad_group_ad.status != 'REMOVED'
      AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
  `)
  report.rsa = { existing: adRows.map((r) => r.adGroup?.name), updates: [] as any[] }

  if (!dryRun) {
    for (const row of adRows) {
      const name = row.adGroup?.name as string
      const creative = CREATIVES[name]
      if (!creative || !row.adGroupAd?.resourceName) continue
      const agResource = `customers/${customerId}/adGroups/${row.adGroup.id}`

      await mutate(customerId, headers, 'adGroupAds', [{ remove: row.adGroupAd.resourceName }], false)
      const createRes = await mutate(customerId, headers, 'adGroupAds', [{
        create: {
          adGroup: agResource,
          status: 'ENABLED',
          ad: {
            responsiveSearchAd: {
              headlines: creative.headlines,
              descriptions: creative.descriptions,
              path1: creative.path1,
              path2: creative.path2,
            },
            finalUrls: [LANDING_PAGE],
          },
        },
      }], false)
      report.rsa.updates.push({ ad_group: name, ok: createRes.ok, detail: createRes.ok ? 'replaced' : createRes.data })
    }

    // Create RSA for Quartiere if ad group exists and has no RSA yet
    const quartierAg = adGroupsByName.get('Quartiere 10km')
    const hasQuartierAd = adRows.some((r) => r.adGroup?.name === 'Quartiere 10km')
    if (quartierAg && !hasQuartierAd && CREATIVES['Quartiere 10km']) {
      const creative = CREATIVES['Quartiere 10km']
      const createRes = await mutate(customerId, headers, 'adGroupAds', [{
        create: {
          adGroup: quartierAg.resource,
          status: 'ENABLED',
          ad: {
            responsiveSearchAd: {
              headlines: creative.headlines,
              descriptions: creative.descriptions,
              path1: creative.path1,
              path2: creative.path2,
            },
            finalUrls: [LANDING_PAGE],
          },
        },
      }], false)
      report.rsa.updates.push({ ad_group: 'Quartiere 10km', ok: createRes.ok, detail: createRes.ok ? 'created' : createRes.data })
    }
  }

  // ── 6. Budget → CHF 35 ─────────────────────────────────────────────────────
  const budgetResource = camp.campaignBudget?.resourceName
  report.budget = { from: report.current_budget_chf, to: dailyBudgetChf }
  if (!dryRun && budgetResource) {
    const budgetRes = await mutate(customerId, headers, 'campaignBudgets', [{
      updateMask: 'amountMicros',
      update: {
        resourceName: budgetResource,
        amountMicros: Math.round(dailyBudgetChf * 1_000_000),
      },
    }])
    report.budget.applied = budgetRes.ok
    report.budget.detail = budgetRes.ok ? undefined : budgetRes.data
  }

  report.success = true
  return report
})
