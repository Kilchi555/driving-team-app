/**
 * Raise QS for «fahrschule zürich» in Fahrschule Zürich / Altstetten only.
 * - New Exact ad group (fresh keyword object)
 * - Pause city PHRASE + duplicate Exact in other ad groups of this campaign
 * - Campaign negatives (competitors / wrong product / far cities)
 * Does not change budget, geo, or campaigns from 2025 or older.
 */

import { logger } from '../../utils/logger'
import { GADS_VERSION, ZH_ALTSTETTEN_ID, gaql, mutate } from './gads-reallocate-auto-zh-west'

export const QS_EXACT_AD_GROUP = 'AG_Exact_ZH'
export const QS_EXACT_LANDING = 'https://drivingteam.ch/auto-fahrschule-zuerich/?utm_content=ag_exact_zh'
const CPC_EXACT_MICROS = '4200000'

const EXACT_KEYWORDS = [
  'fahrschule zürich',
  'auto fahrschule zürich',
  'autofahrschule zürich',
]

const CITY_PHRASE_TO_PAUSE = [
  'fahrschule zürich',
  'fahrlehrer zürich',
  'autofahrschule zürich',
  'auto fahrschule zürich',
  'fahrstunden zürich',
]

/** PHRASE negatives — short tokens stay phrase so «koch» does not overblock. */
const CAMPAIGN_NEGATIVES: Array<{ text: string; matchType: 'PHRASE' | 'BROAD' }> = [
  { text: 'fahrschule koch', matchType: 'PHRASE' },
  { text: 'koch fahrschule', matchType: 'PHRASE' },
  { text: 'koch regensdorf', matchType: 'PHRASE' },
  { text: 'gabi senn', matchType: 'PHRASE' },
  { text: 'gianni sebestin', matchType: 'PHRASE' },
  { text: 'sebestin', matchType: 'PHRASE' },
  { text: 'claudio candinas', matchType: 'PHRASE' },
  { text: 'fahrschule locher', matchType: 'PHRASE' },
  { text: 'fahrschule suli', matchType: 'PHRASE' },
  { text: 'charly fahrschule', matchType: 'PHRASE' },
  { text: 'max drive', matchType: 'PHRASE' },
  { text: 'team humm', matchType: 'PHRASE' },
  { text: 'drivelab', matchType: 'PHRASE' },
  { text: 'letzhgo', matchType: 'PHRASE' },
  { text: 'fahrschule kalberer', matchType: 'PHRASE' },
  { text: 'minet', matchType: 'PHRASE' },
  { text: 'regensdorf', matchType: 'PHRASE' },
  { text: 'wetzikon', matchType: 'PHRASE' },
  { text: 'wallisellen', matchType: 'PHRASE' },
  { text: 'kloten', matchType: 'PHRASE' },
  { text: 'winterthur', matchType: 'PHRASE' },
  { text: 'dübendorf', matchType: 'PHRASE' },
  { text: 'fahrschule lachen', matchType: 'PHRASE' },
  { text: 'motorrad', matchType: 'BROAD' },
  { text: 'roller', matchType: 'BROAD' },
  { text: 'vespa', matchType: 'BROAD' },
  { text: 'mofa', matchType: 'BROAD' },
  { text: 'töffli', matchType: 'BROAD' },
  { text: 'lastwagen', matchType: 'BROAD' },
  { text: 'lkw', matchType: 'BROAD' },
  { text: 'anhänger', matchType: 'BROAD' },
  { text: 'vku', matchType: 'BROAD' },
  { text: 'wab', matchType: 'BROAD' },
  { text: 'czv', matchType: 'BROAD' },
  { text: 'nothelfer', matchType: 'BROAD' },
]

const RSA = {
  headlines: [
    { text: 'Fahrschule Zürich', pinnedField: 'HEADLINE_1' },
    { text: 'Auto Kat. B in Zürich', pinnedField: 'HEADLINE_2' },
    { text: 'Fahrstunde ab CHF 95' },
    { text: 'Standort Altstetten' },
    { text: 'Online Termin buchen' },
    { text: 'Prüfungsgebiet Albisgütli' },
    { text: 'Driving Team Zürich' },
    { text: 'Jetzt Fahrstunde buchen' },
    { text: '85% Erfolgsquote' },
    { text: 'Automatik & Schaltung' },
    { text: 'Klarer Preis, flexibel' },
    { text: 'Hohlstrasse 544' },
  ],
  descriptions: [
    { text: 'Fahrschule Zürich, Kat. B. Standort Altstetten, Prüfung Albisgütli. Jetzt buchen.', pinnedField: 'DESCRIPTION_1' },
    { text: 'Driving Team: Fahrstunde ab CHF 95. Termin in wenigen Klicks online sichern.' },
  ],
  path1: 'Zuerich',
  path2: 'Auto',
}

function norm(s: unknown) {
  return String(s ?? '').toLowerCase().trim()
}

function normalizeMatch(mt: unknown): string {
  const s = String(mt ?? '')
  if (s === '2' || s === 'EXACT') return 'EXACT'
  if (s === '3' || s === 'PHRASE') return 'PHRASE'
  if (s === '4' || s === 'BROAD') return 'BROAD'
  return s
}

export async function applyQsExactFahrschuleZuerich(opts: {
  customerId: string
  headers: Record<string, string>
  dryRun: boolean
}) {
  const { customerId, headers, dryRun } = opts
  const campaignResource = `customers/${customerId}/campaigns/${ZH_ALTSTETTEN_ID}`
  const report: Record<string, any> = {
    campaign_id: ZH_ALTSTETTEN_ID,
    campaign_name: 'Fahrschule Zürich / Altstetten',
    dry_run: dryRun,
    budget_unchanged: true,
  }

  const campRows = await gaql(customerId, headers, `
    SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros
    FROM campaign
    WHERE campaign.id = ${ZH_ALTSTETTEN_ID}
  `)
  if (!campRows.length) {
    return { success: false, reason: 'campaign_not_found', campaign_id: ZH_ALTSTETTEN_ID }
  }
  const camp = campRows[0].campaign
  if (norm(camp?.name).includes('2025') || String(camp?.name ?? '').includes('10/22')) {
    return { success: false, reason: 'refused_old_campaign', name: camp?.name }
  }
  report.current_status = camp?.status
  report.current_budget_chf = Math.round((campRows[0].campaignBudget?.amountMicros ?? 0) / 1e4) / 100

  const agRows = await gaql(customerId, headers, `
    SELECT ad_group.id, ad_group.name, ad_group.resource_name, ad_group.status
    FROM ad_group
    WHERE campaign.id = ${ZH_ALTSTETTEN_ID}
      AND ad_group.status != 'REMOVED'
  `)
  const adGroups = new Map<string, { id: string; resource: string; status: string }>()
  for (const r of agRows) {
    adGroups.set(r.adGroup?.name, {
      id: String(r.adGroup?.id),
      resource: r.adGroup?.resourceName,
      status: String(r.adGroup?.status),
    })
  }
  report.ad_groups = [...adGroups.keys()]

  let exactAg = adGroups.get(QS_EXACT_AD_GROUP)
  if (!exactAg) {
    report.ad_group = { action: dryRun ? 'would_create' : 'creating', name: QS_EXACT_AD_GROUP }
    if (!dryRun) {
      const agRes = await mutate(customerId, headers, 'adGroups', [{
        create: {
          name: QS_EXACT_AD_GROUP,
          campaign: campaignResource,
          status: 'ENABLED',
          type: 'SEARCH_STANDARD',
          cpcBidMicros: CPC_EXACT_MICROS,
        },
      }])
      const rn = agRes.data?.results?.[0]?.resourceName
      if (!agRes.ok || !rn) {
        report.ad_group = { action: 'failed', detail: agRes.data }
        return { success: false, ...report }
      }
      exactAg = { id: rn.split('/').pop()!, resource: rn, status: 'ENABLED' }
      adGroups.set(QS_EXACT_AD_GROUP, exactAg)
      report.ad_group = { action: 'created', resource: rn }
    }
  } else {
    report.ad_group = { action: 'exists', resource: exactAg.resource, status: exactAg.status }
    if (!dryRun && exactAg.status !== 'ENABLED' && exactAg.status !== '2') {
      const en = await mutate(customerId, headers, 'adGroups', [{
        updateMask: 'status',
        update: { resourceName: exactAg.resource, status: 'ENABLED' },
      }])
      report.ad_group.re_enabled = en.ok
    }
  }

  const kwRows = await gaql(customerId, headers, `
    SELECT ad_group.name, ad_group_criterion.resource_name,
           ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
           ad_group_criterion.status
    FROM ad_group_criterion
    WHERE campaign.id = ${ZH_ALTSTETTEN_ID}
      AND ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.negative = false
      AND ad_group_criterion.status != 'REMOVED'
  `)

  const exactSet = new Set(EXACT_KEYWORDS)
  const phraseSet = new Set(CITY_PHRASE_TO_PAUSE)

  const existingOnExactAg = new Set(
    kwRows
      .filter((r) => r.adGroup?.name === QS_EXACT_AD_GROUP)
      .map((r) => `${norm(r.adGroupCriterion?.keyword?.text)}|${normalizeMatch(r.adGroupCriterion?.keyword?.matchType)}`),
  )

  const keywordsToCreate = EXACT_KEYWORDS.filter((text) => !existingOnExactAg.has(`${text}|EXACT`))
  report.keywords = { would_add: keywordsToCreate, skipped: EXACT_KEYWORDS.length - keywordsToCreate.length }
  let exactKeywordsReady = existingOnExactAg.has('fahrschule zürich|EXACT')
  if (!dryRun && exactAg && keywordsToCreate.length) {
    const kwRes = await mutate(customerId, headers, 'adGroupCriteria', keywordsToCreate.map((text) => ({
      create: {
        adGroup: exactAg!.resource,
        status: 'ENABLED',
        keyword: { text, matchType: 'EXACT' },
        cpcBidMicros: CPC_EXACT_MICROS,
      },
    })))
    report.keywords.added = kwRes.ok ? (kwRes.data?.results ?? []).length : 0
    report.keywords.ok = kwRes.ok
    if (!kwRes.ok) report.keywords.detail = kwRes.data
    exactKeywordsReady = exactKeywordsReady || Boolean(kwRes.ok && (kwRes.data?.results ?? []).length)
  }
  if (dryRun) exactKeywordsReady = true

  const toPause = kwRows.filter((r) => {
    if (r.adGroup?.name === QS_EXACT_AD_GROUP) return false
    const text = norm(r.adGroupCriterion?.keyword?.text)
    const match = normalizeMatch(r.adGroupCriterion?.keyword?.matchType)
    const status = String(r.adGroupCriterion?.status ?? '')
    if (status !== 'ENABLED' && status !== '2') return false
    if (match === 'PHRASE' && phraseSet.has(text)) return true
    if (match === 'EXACT' && exactSet.has(text)) return true
    return false
  })
  report.pause_leaks = {
    count: toPause.length,
    items: toPause.map((r) => ({
      ad_group: r.adGroup?.name,
      text: r.adGroupCriterion?.keyword?.text,
      match: r.adGroupCriterion?.keyword?.matchType,
    })),
  }
  if (!dryRun && toPause.length && exactKeywordsReady) {
    const pauseRes = await mutate(customerId, headers, 'adGroupCriteria', toPause.map((r) => ({
      updateMask: 'status',
      update: { resourceName: r.adGroupCriterion.resourceName, status: 'PAUSED' },
    })))
    report.pause_leaks.applied = pauseRes.ok
    if (!pauseRes.ok) report.pause_leaks.detail = pauseRes.data
  }

  const adRows = await gaql(customerId, headers, `
    SELECT ad_group.name, ad_group_ad.resource_name, ad_group_ad.status
    FROM ad_group_ad
    WHERE campaign.id = ${ZH_ALTSTETTEN_ID}
      AND ad_group.name = '${QS_EXACT_AD_GROUP}'
      AND ad_group_ad.status != 'REMOVED'
      AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
  `)
  const hasEnabledAd = adRows.some((r) => {
    const s = String(r.adGroupAd?.status ?? '')
    return s === 'ENABLED' || s === '2'
  })
  report.rsa = { existing: adRows.length, has_enabled: hasEnabledAd }
  if (!dryRun && exactAg && !hasEnabledAd) {
    const adRes = await mutate(customerId, headers, 'adGroupAds', [{
      create: {
        adGroup: exactAg.resource,
        status: 'ENABLED',
        ad: {
          finalUrls: [QS_EXACT_LANDING],
          responsiveSearchAd: RSA,
        },
      },
    }])
    report.rsa.created = adRes.ok
    if (!adRes.ok) {
      logger.warn('[gads-qs-exact-zh] RSA failed', JSON.stringify(adRes.data).slice(0, 400))
      report.rsa.detail = adRes.data
    }
  }

  const existingNegRows = await gaql(customerId, headers, `
    SELECT campaign_criterion.keyword.text, campaign_criterion.keyword.match_type
    FROM campaign_criterion
    WHERE campaign.id = ${ZH_ALTSTETTEN_ID}
      AND campaign_criterion.type = 'KEYWORD'
      AND campaign_criterion.negative = true
  `)
  const existingNeg = new Set(
    existingNegRows.map((r) =>
      `${norm(r.campaignCriterion?.keyword?.text)}|${normalizeMatch(r.campaignCriterion?.keyword?.matchType)}`,
    ),
  )
  const negsToAdd = CAMPAIGN_NEGATIVES.filter((n) => !existingNeg.has(`${n.text}|${n.matchType}`))
  report.negatives = {
    to_add: negsToAdd.map((n) => n.text),
    skipped_existing: CAMPAIGN_NEGATIVES.length - negsToAdd.length,
  }
  if (!dryRun && negsToAdd.length) {
    let added = 0
    for (let i = 0; i < negsToAdd.length; i += 40) {
      const chunk = negsToAdd.slice(i, i + 40)
      const negRes = await mutate(customerId, headers, 'campaignCriteria', chunk.map((kw) => ({
        create: {
          campaign: campaignResource,
          negative: true,
          keyword: { text: kw.text, matchType: kw.matchType },
        },
      })))
      if (negRes.ok) added += (negRes.data?.results ?? []).length
      else {
        logger.warn('[gads-qs-exact-zh] negatives failed', JSON.stringify(negRes.data).slice(0, 400))
        report.negatives.detail = negRes.data
      }
    }
    report.negatives.added = added
  }

  report.success = true
  return report
}
