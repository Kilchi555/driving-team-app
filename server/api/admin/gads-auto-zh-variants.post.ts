/**
 * Auto Zürich Welle-1 variants: 4 ad-group hypotheses on Altstetten campaign.
 *
 * AG_Local  → /auto-fahrschule-zuerich/?utm_content=ag_local
 * AG_Probe  → /auto-fahrschule-zuerich-probe/?utm_content=ag_probe
 * AG_Preis  → /auto-fahrschule-zuerich-preis/?utm_content=ag_preis
 * AG_Quartier → control URL + quartier KWs (?utm_content=ag_quartier)
 *
 * Also pauses "Fahrschule Zürich Umgebung" so budget can focus on the test.
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-auto-zh-variants \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 *
 *   curl -X POST https://app.simy.ch/api/admin/gads-auto-zh-variants \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false, "daily_budget_chf": 50, "pause_umgebung": true }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const CAMPAIGN_ID = '24103567599'
const CAMPAIGN_NAME = 'Fahrschule Zürich / Altstetten'
const UMGEBUNG_CAMPAIGN_ID = '23868553846'
const UMGEBUNG_NAME = 'Fahrschule Zürich Umgebung'

const BASE = 'https://drivingteam.ch'

type MatchType = 'EXACT' | 'PHRASE'
type Kw = { text: string; matchType: MatchType; cpcChf: number }

type Variant = {
  name: string
  landing: string
  path1: string
  path2: string
  cpcBidChf: number
  keywords: Kw[]
  headlines: Array<{ text: string; pinnedField?: string }>
  descriptions: Array<{ text: string; pinnedField?: string }>
}

const VARIANTS: Variant[] = [
  {
    name: 'AG_Local',
    landing: `${BASE}/auto-fahrschule-zuerich/?utm_content=ag_local`,
    path1: 'Altstetten',
    path2: 'Local',
    cpcBidChf: 3.5,
    keywords: [
      { text: 'fahrschule altstetten', matchType: 'EXACT', cpcChf: 3.8 },
      { text: 'fahrschule altstetten', matchType: 'PHRASE', cpcChf: 3.5 },
      { text: 'fahrlehrer altstetten', matchType: 'PHRASE', cpcChf: 3.2 },
      { text: 'fahrstunden altstetten', matchType: 'PHRASE', cpcChf: 3.2 },
      { text: 'fahrschule zürich altstetten', matchType: 'EXACT', cpcChf: 3.8 },
      { text: 'fahrschule zürich altstetten', matchType: 'PHRASE', cpcChf: 3.5 },
      { text: 'autofahrschule altstetten', matchType: 'PHRASE', cpcChf: 3.5 },
      { text: 'fahrschule bahnhof altstetten', matchType: 'PHRASE', cpcChf: 3.5 },
      { text: 'fahrschule 8048', matchType: 'PHRASE', cpcChf: 3.2 },
      { text: 'fahrschule zürich west', matchType: 'PHRASE', cpcChf: 3.3 },
    ],
    headlines: [
      { text: 'Fahrschule Altstetten', pinnedField: 'HEADLINE_1' },
      { text: 'Standort Bahnhof', pinnedField: 'HEADLINE_2' },
      { text: 'Driving Team Zürich' },
      { text: 'Online Termin buchen' },
      { text: 'Prüfungsgebiet Albisgütli' },
      { text: 'Fahrstunde ab CHF 95' },
      { text: 'Kat. B Auto' },
      { text: 'Jetzt buchen' },
      { text: '8048 Zürich' },
      { text: '85% Erfolgsquote' },
      { text: 'Hohlstrasse Nähe' },
      { text: 'Flexibel & klar' },
    ],
    descriptions: [
      { text: 'Fahrschule am Bahnhof Altstetten — klarer Preis, online buchbar.', pinnedField: 'DESCRIPTION_1' },
      { text: 'Driving Team Zürich West. Albisgütli-Prüfung gezielt vorbereiten.' },
    ],
  },
  {
    name: 'AG_Probe',
    landing: `${BASE}/auto-fahrschule-zuerich-probe/?utm_content=ag_probe`,
    path1: 'Erste',
    path2: 'Stunde',
    cpcBidChf: 3.4,
    keywords: [
      { text: 'erste fahrstunde zürich', matchType: 'PHRASE', cpcChf: 3.5 },
      { text: 'erste fahrstunde', matchType: 'PHRASE', cpcChf: 3.0 },
      { text: 'fahrschule anfänger zürich', matchType: 'PHRASE', cpcChf: 3.2 },
      { text: 'autofahrschule anfänger', matchType: 'PHRASE', cpcChf: 3.0 },
      { text: 'fahrschule neu starten zürich', matchType: 'PHRASE', cpcChf: 3.0 },
      { text: 'erste autofahrstunde zürich', matchType: 'PHRASE', cpcChf: 3.4 },
      { text: 'fahrschule einsteigen zürich', matchType: 'PHRASE', cpcChf: 3.0 },
      { text: 'erste fahrstunde zürich rabatt', matchType: 'PHRASE', cpcChf: 3.3 },
    ],
    headlines: [
      { text: 'Erste Fahrstunde Zürich', pinnedField: 'HEADLINE_1' },
      { text: 'CHF 30.– Rabatt', pinnedField: 'HEADLINE_2' },
      { text: 'Code ERSTE30' },
      { text: 'Driving Team' },
      { text: 'Bahnhof Altstetten' },
      { text: 'Online Termin buchen' },
      { text: 'Kat. B Auto' },
      { text: 'Statt CHF 95 nur 65' },
      { text: 'Nur 1. Lektion' },
      { text: 'Jetzt starten' },
      { text: 'Klarer Preis' },
      { text: 'Sofort buchbar' },
    ],
    descriptions: [
      { text: 'Erste Kat.-B-Lektion: CHF 30.– Rabatt mit Code ERSTE30. Online buchen.', pinnedField: 'DESCRIPTION_1' },
      { text: 'Treffpunkt Bahnhof Altstetten. Driving Team — nur für die erste Fahrstunde.' },
    ],
  },
  {
    name: 'AG_Preis',
    landing: `${BASE}/auto-fahrschule-zuerich-preis/?utm_content=ag_preis`,
    path1: 'Preis',
    path2: 'CHF95',
    cpcBidChf: 3.4,
    keywords: [
      { text: 'fahrschule zürich preis', matchType: 'PHRASE', cpcChf: 3.5 },
      { text: 'fahrschule zürich kosten', matchType: 'PHRASE', cpcChf: 3.5 },
      { text: 'fahrstunden zürich preis', matchType: 'PHRASE', cpcChf: 3.4 },
      { text: 'fahrstunden kosten zürich', matchType: 'PHRASE', cpcChf: 3.4 },
      { text: 'autofahrschule preis zürich', matchType: 'PHRASE', cpcChf: 3.3 },
      { text: 'was kostet fahrschule zürich', matchType: 'PHRASE', cpcChf: 3.5 },
      { text: 'fahrstunde preis zürich', matchType: 'EXACT', cpcChf: 3.6 },
      { text: 'fahrschule günstig zürich', matchType: 'PHRASE', cpcChf: 3.2 },
    ],
    headlines: [
      { text: 'Ab CHF 95.– / Lektion', pinnedField: 'HEADLINE_1' },
      { text: 'Fahrschule Zürich', pinnedField: 'HEADLINE_2' },
      { text: 'Klarer Preis' },
      { text: 'Online Termin buchen' },
      { text: 'Driving Team' },
      { text: 'Kat. B Auto' },
      { text: 'Altstetten' },
      { text: 'Keine Überraschungen' },
      { text: 'Jetzt buchen' },
      { text: '45 Min. Fahrstunde' },
      { text: 'Transparent & fair' },
      { text: 'Sofort buchbar' },
    ],
    descriptions: [
      { text: 'Fahrstunde ab CHF 95.– in Zürich. Klarer Preis, online buchbar.', pinnedField: 'DESCRIPTION_1' },
      { text: 'Standort Altstetten. Driving Team — Termin in 2 Minuten sichern.' },
    ],
  },
  {
    name: 'AG_Quartier',
    landing: `${BASE}/auto-fahrschule-zuerich/?utm_content=ag_quartier`,
    path1: 'Zuerich-West',
    path2: 'Quartier',
    cpcBidChf: 3.2,
    keywords: [
      { text: 'fahrschule schlieren', matchType: 'EXACT', cpcChf: 3.5 },
      { text: 'fahrschule schlieren', matchType: 'PHRASE', cpcChf: 3.2 },
      { text: 'fahrlehrer schlieren', matchType: 'PHRASE', cpcChf: 3.0 },
      { text: 'fahrschule albisrieden', matchType: 'PHRASE', cpcChf: 3.2 },
      { text: 'fahrschule höngg', matchType: 'PHRASE', cpcChf: 3.2 },
      { text: 'fahrschule hoengg', matchType: 'PHRASE', cpcChf: 3.0 },
      { text: 'fahrschule urdorf', matchType: 'PHRASE', cpcChf: 3.2 },
      { text: 'fahrschule hardbrücke', matchType: 'PHRASE', cpcChf: 3.0 },
      { text: 'fahrschule grünau', matchType: 'PHRASE', cpcChf: 2.8 },
      { text: 'fahrschule dietikon', matchType: 'PHRASE', cpcChf: 3.0 },
    ],
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
      { text: 'Nähe zu dir' },
      { text: 'Flexible Zeiten' },
    ],
    descriptions: [
      { text: 'Fahrstunden für Schlieren, Höngg, Albisrieden, Urdorf — Treffpunkt Altstetten.', pinnedField: 'DESCRIPTION_1' },
      { text: 'Ab CHF 95 / 45 Min. Online buchen. Driving Team Zürich West.' },
    ],
  },
]

/** Legacy AGs that would cannibalize the test matrix */
const LEGACY_AG_PAUSE = [
  'Fahrschule Zürich',
  'Fahrschule Altstetten',
  'Quartiere 10km',
]

const SHARED_NEGATIVES = [
  'motorrad', 'roller', 'vespa', 'mofa', 'töffli', 'lkw', 'lastwagen', 'czv',
  'anhänger', 'boot', 'theorie app', 'theorieprüfung app',
  'koch', 'fahrschule koch', 'locher', 'drivelab', 'letzhgo', 'max drive',
  'wetzikon', 'regensdorf', 'winterthur', 'lachen',
]

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
  const dailyBudgetChf = Math.min(100, Math.max(25, Number(body?.daily_budget_chf) || 50))
  const pauseUmgebung = body?.pause_umgebung !== false

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId
  const campaignResource = `customers/${customerId}/campaigns/${CAMPAIGN_ID}`
  const report: Record<string, any> = {
    campaign_id: CAMPAIGN_ID,
    campaign_name: CAMPAIGN_NAME,
    dry_run: dryRun,
    variants: VARIANTS.map((v) => ({ name: v.name, landing: v.landing, kw: v.keywords.length })),
  }

  // ── Verify Altstetten campaign ─────────────────────────────────────────────
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

  // ── Pause Zürich Umgebung ──────────────────────────────────────────────────
  report.umgebung = { campaign_id: UMGEBUNG_CAMPAIGN_ID, name: UMGEBUNG_NAME, pause: pauseUmgebung }
  if (pauseUmgebung) {
    const umgRows = await gaql(customerId, headers, `
      SELECT campaign.id, campaign.name, campaign.status
      FROM campaign WHERE campaign.id = ${UMGEBUNG_CAMPAIGN_ID}
    `)
    const umg = umgRows[0]?.campaign
    report.umgebung.current_status = umg?.status
    if (!dryRun && umg && String(umg.status) !== 'PAUSED' && String(umg.status) !== '3') {
      const pauseRes = await mutate(customerId, headers, 'campaigns', [{
        updateMask: 'status',
        update: {
          resourceName: `customers/${customerId}/campaigns/${UMGEBUNG_CAMPAIGN_ID}`,
          status: 'PAUSED',
        },
      }])
      report.umgebung.applied = pauseRes.ok
      report.umgebung.detail = pauseRes.ok ? 'paused' : pauseRes.data
    } else if (dryRun) {
      report.umgebung.action = 'would_pause'
    } else {
      report.umgebung.action = 'already_paused_or_missing'
    }
  }

  // ── Load existing ad groups ────────────────────────────────────────────────
  const agRows = await gaql(customerId, headers, `
    SELECT ad_group.id, ad_group.name, ad_group.resource_name, ad_group.status
    FROM ad_group
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND ad_group.status != 'REMOVED'
  `)
  const adGroupsByName = new Map<string, { id: string; resource: string; status: string }>()
  for (const r of agRows) {
    adGroupsByName.set(r.adGroup?.name, {
      id: String(r.adGroup?.id),
      resource: r.adGroup?.resourceName,
      status: String(r.adGroup?.status),
    })
  }

  // Pause legacy AGs (cannibalization)
  report.legacy_pause = [] as any[]
  for (const name of LEGACY_AG_PAUSE) {
    const ag = adGroupsByName.get(name)
    if (!ag) continue
    const alreadyPaused = ag.status === 'PAUSED' || ag.status === '3'
    if (dryRun) {
      report.legacy_pause.push({ name, action: alreadyPaused ? 'already_paused' : 'would_pause' })
      continue
    }
    if (alreadyPaused) {
      report.legacy_pause.push({ name, action: 'already_paused' })
      continue
    }
    const res = await mutate(customerId, headers, 'adGroups', [{
      updateMask: 'status',
      update: { resourceName: ag.resource, status: 'PAUSED' },
    }])
    report.legacy_pause.push({ name, action: res.ok ? 'paused' : 'failed', detail: res.ok ? undefined : res.data })
  }

  // Ensure variant ad groups exist
  report.ad_groups = [] as any[]
  for (const variant of VARIANTS) {
    let ag = adGroupsByName.get(variant.name)
    if (!ag) {
      if (dryRun) {
        report.ad_groups.push({ name: variant.name, action: 'would_create' })
        continue
      }
      const agRes = await mutate(customerId, headers, 'adGroups', [{
        create: {
          name: variant.name,
          campaign: campaignResource,
          status: 'ENABLED',
          type: 'SEARCH_STANDARD',
          cpcBidMicros: Math.round(variant.cpcBidChf * 1_000_000),
        },
      }])
      const rn = agRes.data?.results?.[0]?.resourceName
      if (agRes.ok && rn) {
        ag = { id: rn.split('/').pop()!, resource: rn, status: 'ENABLED' }
        adGroupsByName.set(variant.name, ag)
        report.ad_groups.push({ name: variant.name, action: 'created', resource: rn })
      } else {
        report.ad_groups.push({ name: variant.name, action: 'create_failed', detail: agRes.data })
        continue
      }
    } else if (!dryRun && (ag.status === 'PAUSED' || ag.status === '3')) {
      await mutate(customerId, headers, 'adGroups', [{
        updateMask: 'status',
        update: { resourceName: ag.resource, status: 'ENABLED' },
      }])
      report.ad_groups.push({ name: variant.name, action: 're_enabled' })
    } else {
      report.ad_groups.push({ name: variant.name, action: 'exists', id: ag.id })
    }
  }

  // Existing keywords for dedupe
  const allKwRows = await gaql(customerId, headers, `
    SELECT ad_group.name, ad_group_criterion.keyword.text,
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

  report.keywords = [] as any[]
  if (!dryRun) {
    for (const variant of VARIANTS) {
      const ag = adGroupsByName.get(variant.name)
      if (!ag) {
        report.keywords.push({ ad_group: variant.name, added: 0, reason: 'missing' })
        continue
      }
      const toCreate = variant.keywords.filter(
        (kw) => !existingKwKeys.has(`${variant.name}|${kw.text.toLowerCase()}|${kw.matchType}`),
      )
      if (!toCreate.length) {
        report.keywords.push({ ad_group: variant.name, added: 0, skipped: variant.keywords.length })
        continue
      }
      const ops = toCreate.map((kw) => ({
        create: {
          adGroup: ag.resource,
          status: 'ENABLED',
          keyword: { text: kw.text, matchType: kw.matchType },
          cpcBidMicros: String(Math.round(kw.cpcChf * 1_000_000)),
        },
      }))
      const res = await mutate(customerId, headers, 'adGroupCriteria', ops)
      report.keywords.push({
        ad_group: variant.name,
        added: res.ok ? (res.data?.results ?? []).length : 0,
        ok: res.ok,
        detail: res.ok ? undefined : res.data,
      })
    }
  } else {
    for (const variant of VARIANTS) {
      const toCreate = variant.keywords.filter(
        (kw) => !existingKwKeys.has(`${variant.name}|${kw.text.toLowerCase()}|${kw.matchType}`),
      )
      report.keywords.push({ ad_group: variant.name, would_add: toCreate.length, sample: toCreate.slice(0, 5) })
    }
  }

  // RSAs: replace existing variant ads, create if missing
  const adRows = await gaql(customerId, headers, `
    SELECT ad_group.id, ad_group.name, ad_group_ad.resource_name, ad_group_ad.status
    FROM ad_group_ad
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND ad_group_ad.status != 'REMOVED'
      AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
  `)
  report.rsa = [] as any[]

  if (!dryRun) {
    for (const variant of VARIANTS) {
      const ag = adGroupsByName.get(variant.name)
      if (!ag) {
        report.rsa.push({ ad_group: variant.name, action: 'skipped_no_ag' })
        continue
      }
      const existing = adRows.filter((r) => r.adGroup?.name === variant.name)
      for (const row of existing) {
        if (row.adGroupAd?.resourceName) {
          await mutate(customerId, headers, 'adGroupAds', [{ remove: row.adGroupAd.resourceName }], false)
        }
      }
      const createRes = await mutate(customerId, headers, 'adGroupAds', [{
        create: {
          adGroup: ag.resource,
          status: 'ENABLED',
          ad: {
            responsiveSearchAd: {
              headlines: variant.headlines,
              descriptions: variant.descriptions,
              path1: variant.path1,
              path2: variant.path2,
            },
            finalUrls: [variant.landing],
          },
        },
      }], false)
      report.rsa.push({
        ad_group: variant.name,
        action: createRes.ok ? 'upserted' : 'failed',
        landing: variant.landing,
        detail: createRes.ok ? undefined : createRes.data,
      })
    }
  } else {
    for (const variant of VARIANTS) {
      report.rsa.push({ ad_group: variant.name, action: 'would_upsert', landing: variant.landing })
    }
  }

  // Shared campaign negatives
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
  const negsToAdd = SHARED_NEGATIVES.filter((n) => !existingNeg.has(n.toLowerCase()))
  report.negatives = { to_add: negsToAdd.length }
  if (!dryRun && negsToAdd.length) {
    const negOps = negsToAdd.map((text) => ({
      create: {
        campaign: campaignResource,
        negative: true,
        keyword: { text, matchType: 'BROAD' },
      },
    }))
    let added = 0
    for (let i = 0; i < negOps.length; i += 50) {
      const chunk = negOps.slice(i, i + 50)
      const negRes = await mutate(customerId, headers, 'campaignCriteria', chunk)
      if (negRes.ok) added += (negRes.data?.results ?? []).length
      else logger.warn('[gads-auto-zh-variants] negatives failed', JSON.stringify(negRes.data).slice(0, 250))
    }
    report.negatives.added = added
  }

  // Budget
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

  // Ensure campaign enabled
  if (!dryRun && String(camp.campaign?.status) !== 'ENABLED' && String(camp.campaign?.status) !== '2') {
    const en = await mutate(customerId, headers, 'campaigns', [{
      updateMask: 'status',
      update: { resourceName: campaignResource, status: 'ENABLED' },
    }])
    report.campaign_enable = en.ok
  }

  report.success = true
  report.next = {
    measure_endpoint: '/api/admin/gads-auto-zh-variants-report',
    run_days: 14,
    winner_rule: 'best CPA on inquiry+booking (not CTR)',
  }
  return report
})
