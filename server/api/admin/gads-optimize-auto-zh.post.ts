/**
 * Auto Zürich Ads repair (Aug 2026 deep dive):
 * - Keep «Fahrschule Zürich Umgebung» paused (CPA ~991)
 * - Expand campaign negatives on «Fahrschule Zürich / Altstetten»
 * - Add Exact core-intent keywords on AG_Local → /auto-fahrschule-zuerich/
 * - Pause ultra-broad Probe KW «erste fahrstunde» (no geo)
 * - Optionally bump Altstetten daily budget
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-optimize-auto-zh \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 *
 *   curl -X POST https://app.simy.ch/api/admin/gads-optimize-auto-zh \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false, "daily_budget_chf": 55 }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const ALTSTETTEN_ID = '24103567599'
const UMGEBUNG_ID = '23868553846'
const AG_LOCAL = 'AG_Local'
const AG_PROBE = 'AG_Probe'

/** Search-term waste (30d) + wrong-product / competitor blockers */
const AUTO_ZH_NEGATIVES = [
  // Geo leak / competitors from live search terms
  'regensdorf',
  'fahrschule regensdorf',
  'koch',
  'fahrschule koch',
  'koch fahrschule',
  'gianni sebestin',
  'sebestin',
  'gabi senn',
  'fahrmittesta',
  'fahrschule fahrmittesta',
  'assr',
  'assr regensdorf',
  'blink',
  'blink ag',
  'max drive',
  'team humm',
  'drivelab',
  'letzhgo',
  'wallisellen',
  'wetzikon',
  'winterthur',
  'uster',
  'lachen',
  // Wrong product
  'motorrad',
  'töff',
  'toeff',
  'roller',
  'vespa',
  'mofa',
  'vku',
  'pgs',
  'anhänger',
  'anhaenger',
  'lastwagen',
  'lkw',
  'czv',
  'wab',
  'boot',
  'taxi',
  'bus fahrschule',
  'theorie app',
  'theorieprüfung app',
  'strassenverkehrsamt',
]

const CORE_EXACT_KEYWORDS: Array<{ text: string; cpcChf: number }> = [
  { text: 'fahrschule zürich', cpcChf: 4.2 },
  { text: 'fahrstunden zürich', cpcChf: 4.0 },
  { text: 'autofahrschule zürich', cpcChf: 4.0 },
  { text: 'auto fahrschule zürich', cpcChf: 4.0 },
  { text: 'fahrschule zürich west', cpcChf: 3.8 },
  { text: 'fahrstunden buchen zürich', cpcChf: 4.2 },
  { text: 'auto fahrstunden zürich', cpcChf: 4.0 },
]

const PAUSE_KEYWORDS: Array<{ adGroup: string; text: string; matchType: 'EXACT' | 'PHRASE' | 'BROAD' }> = [
  { adGroup: AG_PROBE, text: 'erste fahrstunde', matchType: 'PHRASE' },
]

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

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as any
  const dryRun = body?.dry_run !== false
  const dailyBudgetChf = body?.daily_budget_chf != null
    ? Math.min(80, Math.max(30, Number(body.daily_budget_chf)))
    : null
  const keepUmgebungPaused = body?.keep_umgebung_paused !== false

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId
  const campaignResource = `customers/${customerId}/campaigns/${ALTSTETTEN_ID}`
  const report: Record<string, any> = {
    dry_run: dryRun,
    campaign_id: ALTSTETTEN_ID,
    campaign_name: 'Fahrschule Zürich / Altstetten',
  }

  // ── 1. Umgebung stay paused ────────────────────────────────────────────────
  const umgRows = await gaql(customerId, headers, `
    SELECT campaign.id, campaign.name, campaign.status
    FROM campaign WHERE campaign.id = ${UMGEBUNG_ID}
  `)
  const umg = umgRows[0]?.campaign
  const umgStatus = String(umg?.status ?? '')
  const umgPaused = umgStatus === 'PAUSED' || umgStatus === '3'
  report.umgebung = { status: umgStatus, paused: umgPaused }
  if (keepUmgebungPaused && !umgPaused) {
    if (dryRun) {
      report.umgebung.action = 'would_pause'
    } else {
      const pauseRes = await mutate(customerId, headers, 'campaigns', [{
        updateMask: 'status',
        update: {
          resourceName: `customers/${customerId}/campaigns/${UMGEBUNG_ID}`,
          status: 'PAUSED',
        },
      }])
      report.umgebung.action = pauseRes.ok ? 'paused' : 'pause_failed'
      report.umgebung.detail = pauseRes.ok ? undefined : pauseRes.data
    }
  }

  // ── 2. Negatives on Altstetten ─────────────────────────────────────────────
  const existingNegRows = await gaql(customerId, headers, `
    SELECT campaign_criterion.keyword.text
    FROM campaign_criterion
    WHERE campaign.id = ${ALTSTETTEN_ID}
      AND campaign_criterion.type = 'KEYWORD'
      AND campaign_criterion.negative = true
  `)
  const existingNeg = new Set(
    existingNegRows.map((r) => String(r.campaignCriterion?.keyword?.text ?? '').toLowerCase()),
  )
  const negsToAdd = AUTO_ZH_NEGATIVES.filter((n) => !existingNeg.has(n.toLowerCase()))
  report.negatives = { existing: existingNeg.size, to_add: negsToAdd.length, sample: negsToAdd.slice(0, 15) }

  if (!dryRun && negsToAdd.length) {
    let added = 0
    const ops = negsToAdd.map((text) => ({
      create: {
        campaign: campaignResource,
        negative: true,
        keyword: { text, matchType: 'BROAD' },
      },
    }))
    for (let i = 0; i < ops.length; i += 50) {
      const chunk = ops.slice(i, i + 50)
      const negRes = await mutate(customerId, headers, 'campaignCriteria', chunk)
      if (negRes.ok) added += (negRes.data?.results ?? []).length
      else logger.warn('[gads-optimize-auto-zh] negatives failed', JSON.stringify(negRes.data).slice(0, 300))
    }
    report.negatives.added = added
  }

  // ── 3. Resolve AG_Local ────────────────────────────────────────────────────
  const agRows = await gaql(customerId, headers, `
    SELECT ad_group.id, ad_group.name, ad_group.resource_name, ad_group.status
    FROM ad_group
    WHERE campaign.id = ${ALTSTETTEN_ID}
      AND ad_group.status != 'REMOVED'
  `)
  const byName = new Map(agRows.map((r) => [r.adGroup?.name as string, r]))
  const localAg = byName.get(AG_LOCAL)
  if (!localAg) {
    report.keywords = { error: 'AG_Local missing — run gads-auto-zh-variants first' }
    return { ok: false, ...report }
  }

  // ── 4. Add Exact core keywords on AG_Local ─────────────────────────────────
  const kwRows = await gaql(customerId, headers, `
    SELECT ad_group.name, ad_group_criterion.resource_name,
           ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
           ad_group_criterion.status
    FROM ad_group_criterion
    WHERE campaign.id = ${ALTSTETTEN_ID}
      AND ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.negative = false
      AND ad_group_criterion.status != 'REMOVED'
  `)

  const existingKw = new Set(
    kwRows.map((r) => {
      const ag = r.adGroup?.name
      const text = String(r.adGroupCriterion?.keyword?.text ?? '').toLowerCase()
      const mt = matchTypeLabel(r.adGroupCriterion?.keyword?.matchType)
      return `${ag}|${text}|${mt}`
    }),
  )

  const toCreate = CORE_EXACT_KEYWORDS.filter(
    (kw) => !existingKw.has(`${AG_LOCAL}|${kw.text.toLowerCase()}|EXACT`),
  )
  report.core_exact = { would_add: toCreate.map((k) => k.text) }

  if (!dryRun && toCreate.length) {
    const createOps = toCreate.map((kw) => ({
      create: {
        adGroup: localAg.adGroup.resourceName,
        status: 'ENABLED',
        keyword: { text: kw.text, matchType: 'EXACT' },
        cpcBidMicros: String(Math.round(kw.cpcChf * 1_000_000)),
      },
    }))
    const createRes = await mutate(customerId, headers, 'adGroupCriteria', createOps)
    report.core_exact.added = createRes.ok ? (createRes.data?.results ?? []).length : 0
    report.core_exact.ok = createRes.ok
    if (!createRes.ok) report.core_exact.detail = createRes.data
  }

  // Re-enable Exact city KWs if previously paused on AG_Local
  const reenable: string[] = []
  for (const kw of CORE_EXACT_KEYWORDS) {
    const row = kwRows.find((r) =>
      r.adGroup?.name === AG_LOCAL
      && String(r.adGroupCriterion?.keyword?.text ?? '').toLowerCase() === kw.text.toLowerCase()
      && matchTypeLabel(r.adGroupCriterion?.keyword?.matchType) === 'EXACT'
      && (String(r.adGroupCriterion?.status) === 'PAUSED' || String(r.adGroupCriterion?.status) === '3'),
    )
    if (!row?.adGroupCriterion?.resourceName) continue
    reenable.push(kw.text)
    if (!dryRun) {
      await mutate(customerId, headers, 'adGroupCriteria', [{
        updateMask: 'status',
        update: { resourceName: row.adGroupCriterion.resourceName, status: 'ENABLED' },
      }])
    }
  }
  report.core_exact.re_enabled = reenable

  // ── 5. Pause ultra-broad Probe keywords ────────────────────────────────────
  report.pause_keywords = [] as any[]
  for (const target of PAUSE_KEYWORDS) {
    const hits = kwRows.filter((r) =>
      r.adGroup?.name === target.adGroup
      && String(r.adGroupCriterion?.keyword?.text ?? '').toLowerCase() === target.text.toLowerCase()
      && matchTypeLabel(r.adGroupCriterion?.keyword?.matchType) === target.matchType
      && String(r.adGroupCriterion?.status) !== 'PAUSED'
      && String(r.adGroupCriterion?.status) !== '3',
    )
    for (const hit of hits) {
      const rn = hit.adGroupCriterion?.resourceName
      if (!rn) continue
      if (dryRun) {
        report.pause_keywords.push({ text: target.text, action: 'would_pause' })
        continue
      }
      const pauseRes = await mutate(customerId, headers, 'adGroupCriteria', [{
        updateMask: 'status',
        update: { resourceName: rn, status: 'PAUSED' },
      }])
      report.pause_keywords.push({
        text: target.text,
        action: pauseRes.ok ? 'paused' : 'failed',
        detail: pauseRes.ok ? undefined : pauseRes.data,
      })
    }
  }

  // ── 6. Budget (optional) ───────────────────────────────────────────────────
  const campRows = await gaql(customerId, headers, `
    SELECT campaign.status, campaign_budget.resource_name, campaign_budget.amount_micros
    FROM campaign WHERE campaign.id = ${ALTSTETTEN_ID}
  `)
  const camp = campRows[0]
  const currentBudget = Math.round((camp?.campaignBudget?.amountMicros ?? 0) / 1e4) / 100
  report.budget = { current_chf: currentBudget }
  if (dailyBudgetChf != null) {
    report.budget.target_chf = dailyBudgetChf
    if (!dryRun && camp?.campaignBudget?.resourceName && dailyBudgetChf !== currentBudget) {
      const budgetRes = await mutate(customerId, headers, 'campaignBudgets', [{
        updateMask: 'amountMicros',
        update: {
          resourceName: camp.campaignBudget.resourceName,
          amountMicros: Math.round(dailyBudgetChf * 1_000_000),
        },
      }])
      report.budget.applied = budgetRes.ok
      report.budget.detail = budgetRes.ok ? undefined : budgetRes.data
    } else if (dryRun) {
      report.budget.action = dailyBudgetChf === currentBudget ? 'unchanged' : 'would_update'
    }
  }

  // Ensure Altstetten campaign enabled
  const campStatus = String(camp?.campaign?.status ?? '')
  if (campStatus !== 'ENABLED' && campStatus !== '2') {
    if (dryRun) report.campaign_enable = 'would_enable'
    else {
      const en = await mutate(customerId, headers, 'campaigns', [{
        updateMask: 'status',
        update: { resourceName: campaignResource, status: 'ENABLED' },
      }])
      report.campaign_enable = en.ok
    }
  } else {
    report.campaign_enable = 'already_enabled'
  }

  logger.info(`[gads-optimize-auto-zh] done dry_run=${dryRun}`)
  return {
    ok: true,
    message: dryRun
      ? 'Dry run complete. Set dry_run: false to apply.'
      : 'Auto Zürich ads optimized.',
    ...report,
    landing_urls_expected: {
      AG_Local: 'https://drivingteam.ch/auto-fahrschule-zuerich/?utm_content=ag_local',
      AG_Probe: 'https://drivingteam.ch/auto-fahrschule-zuerich-probe/?utm_content=ag_probe',
      AG_Preis: 'https://drivingteam.ch/auto-fahrschule-zuerich-preis/?utm_content=ag_preis',
      AG_Quartier: 'https://drivingteam.ch/auto-fahrschule-zuerich/?utm_content=ag_quartier',
    },
  }
})
