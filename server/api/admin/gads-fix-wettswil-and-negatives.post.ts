/**
 * Three fixes found while analyzing live post-rollout data (22 July 2026):
 *
 * 1. PAUSE "führerschein machen zürich" (PHRASE) — single biggest keyword
 *    spend across both Zürich+Lachen campaigns (80.62 CHF / 30d), 0 conversions.
 *    Early-research intent ("wie mache ich den Führerschein"), not booking intent.
 *
 * 2. "Fahrschule Wettswil" ad group has 9 keywords, all EXACT/PHRASE match on
 *    hyper-local town names (Wettswil, Bonstetten, Stallikon, Knonaueramt) —
 *    0 impressions in 30 days. Same "exact match kills volume" problem as the
 *    earlier May–June experiment, just localized to one ad group. Every OTHER
 *    working location ad group (Altstetten, Schlieren, Dietikon, etc.) uses
 *    BROAD match for its core location keyword — this one was missed. Adds
 *    BROAD equivalents alongside the existing EXACT/PHRASE keywords (kept, no
 *    harm, near-zero cost since they don't get impressions anyway).
 *
 * 3. New negative keywords found in the last-7-days search terms report that
 *    aren't covered by the existing negative lists yet.
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-fix-wettswil-and-negatives \
 *     -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const FAHRSCHULE_ZUERICH_CAMPAIGN_ID = '23868553846'
const FAHRSCHULE_LACHEN_CAMPAIGN_ID = '23865472770'

const NEW_BROAD_KEYWORDS_WETTSWIL = [
  'fahrschule wettswil',
  'fahrschule bonstetten',
  'fahrschule stallikon',
  'fahrschule knonaueramt',
]

const NEW_NEGATIVES: Record<string, string[]> = {
  [FAHRSCHULE_ZUERICH_CAMPAIGN_ID]: [
    'wheelie kurs',
    'rollerkurs',
    'kategorie a1',
    'mikulic fahrschule zürich',
    'paul hefti fahrschule',
    'lernfahrausweis online beantragen',
    'führerschein schweiz',
  ],
  [FAHRSCHULE_LACHEN_CAMPAIGN_ID]: [
    'wheelie kurs',
    'rollerkurs',
    'kategorie a1',
    'mikulic fahrschule zürich',
    'paul hefti fahrschule',
    'lernfahrausweis online beantragen',
    'führerschein schweiz',
  ],
}

async function runQuery(customerId: string, headers: Record<string, string>, query: string) {
  const url = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const data = await res.json() as any
  if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 500))
  const rows: any[] = []
  for (const batch of (Array.isArray(data) ? data : [])) {
    rows.push(...(batch.results ?? []))
  }
  return rows
}

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as any
  const dryRun: boolean = body?.dry_run !== false

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId
  const mutateUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroupCriteria:mutate`
  const campaignMutateUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/campaignCriteria:mutate`

  // ── 1. Find and pause "führerschein machen zürich" PHRASE ────────────────
  const fuehrerscheinRows = await runQuery(customerId, headers, `
    SELECT ad_group_criterion.resource_name, ad_group.name, ad_group_criterion.status
    FROM ad_group_criterion
    WHERE campaign.id = ${FAHRSCHULE_ZUERICH_CAMPAIGN_ID}
      AND ad_group_criterion.keyword.text = 'führerschein machen zürich'
      AND ad_group_criterion.keyword.match_type = 'PHRASE'
      AND ad_group_criterion.status != 'REMOVED'
  `)

  // ── 2. Find Wettswil ad group resource name ───────────────────────────────
  const wettswilAdGroupRows = await runQuery(customerId, headers, `
    SELECT ad_group.resource_name, ad_group_criterion.keyword.text
    FROM ad_group_criterion
    WHERE ad_group.name = 'Fahrschule Wettswil'
      AND ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.status != 'REMOVED'
  `)
  const wettswilAdGroupResource = wettswilAdGroupRows[0]?.adGroup?.resourceName
  const existingWettswilTexts = new Set(
    wettswilAdGroupRows.map((r: any) => (r.adGroupCriterion?.keyword?.text ?? '').toLowerCase()),
  )
  const broadToAdd = NEW_BROAD_KEYWORDS_WETTSWIL.filter(k => !existingWettswilTexts.has(k.toLowerCase()))

  // ── 3. Find which new negatives already exist per campaign ───────────────
  const existingNegatives: Record<string, Set<string>> = {}
  for (const campaignId of [FAHRSCHULE_ZUERICH_CAMPAIGN_ID, FAHRSCHULE_LACHEN_CAMPAIGN_ID]) {
    const rows = await runQuery(customerId, headers, `
      SELECT campaign_criterion.keyword.text
      FROM campaign_criterion
      WHERE campaign_criterion.type = 'KEYWORD'
        AND campaign_criterion.negative = true
        AND campaign.id = ${campaignId}
    `)
    existingNegatives[campaignId] = new Set(rows.map((r: any) => (r.campaignCriterion?.keyword?.text ?? '').toLowerCase()))
  }
  const negativesToAdd: Record<string, string[]> = {}
  for (const [campaignId, list] of Object.entries(NEW_NEGATIVES)) {
    negativesToAdd[campaignId] = list.filter(n => !existingNegatives[campaignId].has(n.toLowerCase()))
  }

  const plan = {
    pause_fuehrerschein_zuerich: fuehrerscheinRows.map((r: any) => ({
      ad_group: r.adGroup?.name,
      resource_name: r.adGroupCriterion?.resourceName,
      current_status: r.adGroupCriterion?.status,
    })),
    add_broad_wettswil: {
      ad_group_resource: wettswilAdGroupResource,
      keywords_to_add: broadToAdd,
    },
    add_negatives_zuerich: negativesToAdd[FAHRSCHULE_ZUERICH_CAMPAIGN_ID],
    add_negatives_lachen: negativesToAdd[FAHRSCHULE_LACHEN_CAMPAIGN_ID],
  }

  if (dryRun) {
    return { ok: true, dry_run: true, plan }
  }

  const results: Record<string, unknown> = {}

  // Apply 1: pause keyword
  if (plan.pause_fuehrerschein_zuerich.length > 0) {
    const ops = plan.pause_fuehrerschein_zuerich.map(p => ({
      update: { resourceName: p.resource_name, status: 'PAUSED' },
      updateMask: 'status',
    }))
    const res = await fetch(mutateUrl, { method: 'POST', headers, body: JSON.stringify({ operations: ops, partialFailure: true }) })
    const data = await res.json() as any
    results.pause_fuehrerschein_zuerich = res.ok ? { paused: ops.length } : { error: data }
    if (!res.ok) logger.warn('[gads-fix-wettswil] pause error:', JSON.stringify(data).slice(0, 400))
  } else {
    results.pause_fuehrerschein_zuerich = { paused: 0, reason: 'not found or already paused' }
  }

  // Apply 2: add broad keywords to Wettswil
  if (wettswilAdGroupResource && broadToAdd.length > 0) {
    const ops = broadToAdd.map(text => ({
      create: { adGroup: wettswilAdGroupResource, type: 'KEYWORD', status: 'ENABLED', keyword: { text, matchType: 'BROAD' } },
    }))
    const res = await fetch(mutateUrl, { method: 'POST', headers, body: JSON.stringify({ operations: ops, partialFailure: true }) })
    const data = await res.json() as any
    results.add_broad_wettswil = res.ok ? { added: (data.results ?? []).length } : { error: data }
    if (!res.ok) logger.warn('[gads-fix-wettswil] add broad error:', JSON.stringify(data).slice(0, 400))
  } else {
    results.add_broad_wettswil = { added: 0, reason: 'ad group not found or nothing to add' }
  }

  // Apply 3: add negatives per campaign
  for (const campaignId of [FAHRSCHULE_ZUERICH_CAMPAIGN_ID, FAHRSCHULE_LACHEN_CAMPAIGN_ID]) {
    const toAdd = negativesToAdd[campaignId]
    if (toAdd.length === 0) {
      results[`negatives_${campaignId}`] = { added: 0 }
      continue
    }
    const campaignResource = `customers/${customerId}/campaigns/${campaignId}`
    const ops = toAdd.map(text => ({
      create: { campaign: campaignResource, negative: true, keyword: { text, matchType: 'BROAD' } },
    }))
    const res = await fetch(campaignMutateUrl, { method: 'POST', headers, body: JSON.stringify({ operations: ops, partialFailure: true }) })
    const data = await res.json() as any
    results[`negatives_${campaignId}`] = res.ok ? { added: (data.results ?? []).length } : { error: data }
    if (!res.ok) logger.warn('[gads-fix-wettswil] negatives error:', JSON.stringify(data).slice(0, 400))
  }

  logger.info(`[gads-fix-wettswil-and-negatives] Completed (dry_run=${dryRun})`)

  return { ok: true, dry_run: false, plan, results }
})
