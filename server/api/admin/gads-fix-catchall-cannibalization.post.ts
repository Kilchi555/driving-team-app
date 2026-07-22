/**
 * Fixes internal cannibalization of the generic catch-all broad keywords
 * "fahrschule" and "fahrschule in der nähe" in the Zürich + Lachen campaigns.
 *
 * BACKGROUND (July 2026 analysis):
 * These two keywords were duplicated across 6-7 ad groups per campaign,
 * all competing in the SAME auction for the SAME query. That doesn't add
 * reach — it just dilutes Quality Score (mismatched ad group ↔ query intent)
 * and fragments performance data. A prior fix paused ALL duplicates, which
 * risks re-creating the "too few impressions" problem seen during the
 * May–June EXACT-match experiment (8-12x fewer impressions/day), since these
 * two keywords drove ~75% of total campaign impression volume.
 *
 * FIX: keep exactly ONE instance of each keyword active per campaign — the
 * best-performing ad group by Quality Score / conversions — and leave the
 * rest paused. This removes cannibalization while preserving reach.
 *
 * Also adds newly-discovered negative keywords found in the search terms
 * report (WAB-Kurs, Schleuderkurs, Nothelferkurs, named competitors) that
 * were not covered by the initial negative list.
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/gads-fix-catchall-cannibalization \
 *     -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'

const FAHRSCHULE_ZUERICH_CAMPAIGN_ID = '23868553846'
const FAHRSCHULE_LACHEN_CAMPAIGN_ID = '23865472770'

// Best-performing ad group per campaign to keep the catch-all keywords active in
// (highest Quality Score / has a real conversion — see analysis).
const KEEP_ACTIVE_AD_GROUP: Record<string, string> = {
  [FAHRSCHULE_ZUERICH_CAMPAIGN_ID]: 'Fahrschule Altstetten',
  [FAHRSCHULE_LACHEN_CAMPAIGN_ID]: 'Fahrschule Lachen',
}

// Newly discovered junk categories from the search terms report that weren't
// covered by the initial negative list.
const EXTRA_NEGATIVES: Record<string, string[]> = {
  [FAHRSCHULE_ZUERICH_CAMPAIGN_ID]: [
    'wab kurs',
    'schleuderkurs',
    'nothelferkurs',
    'markus krieg fahrschule',
    'kalberer fahrschule',
    'kohler fahrschule',
    'daniels fahrschule',
    'mario fahrschule',
    'antonio marino',
    'nadias fahrschule',
    'fahrschule gisler',
  ],
  [FAHRSCHULE_LACHEN_CAMPAIGN_ID]: [
    'wab kurs',
    'schleuderkurs',
    'nothelferkurs',
    'markus krieg fahrschule',
    'kalberer fahrschule',
    'kohler fahrschule',
    'daniels fahrschule',
    'mario fahrschule',
    'antonio marino',
    'nadias fahrschule',
    'fahrschule gisler',
  ],
}

async function reenableBestAdGroupInstance(
  customerId: string,
  headers: Record<string, string>,
  campaignId: string,
  dryRun: boolean,
): Promise<{ reenabled: Array<{ ad_group: string; keyword: string }>; kept_paused: number }> {
  const keepAdGroup = KEEP_ACTIVE_AD_GROUP[campaignId]
  const searchUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const query = `
    SELECT ad_group.name, ad_group_criterion.resource_name, ad_group_criterion.keyword.text,
           ad_group_criterion.status
    FROM ad_group_criterion
    WHERE ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.status = 'PAUSED'
      AND ad_group_criterion.keyword.match_type = 'BROAD'
      AND campaign.id = ${campaignId}
      AND ad_group_criterion.keyword.text IN ('fahrschule', 'fahrschule in der nähe')
  `
  const res = await fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const data = await res.json() as any[]
  const rows: any[] = []
  for (const batch of (Array.isArray(data) ? data : [])) {
    rows.push(...(batch.results ?? []))
  }

  const toReenable = rows.filter(r => r.adGroup?.name === keepAdGroup)
  const keptPaused = rows.length - toReenable.length

  if (dryRun || toReenable.length === 0) {
    return {
      reenabled: toReenable.map(r => ({ ad_group: r.adGroup?.name, keyword: r.adGroupCriterion?.keyword?.text })),
      kept_paused: keptPaused,
    }
  }

  const mutateUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/adGroupCriteria:mutate`
  const operations = toReenable.map(r => ({
    update: { resourceName: r.adGroupCriterion.resourceName, status: 'ENABLED' },
    updateMask: 'status',
  }))

  await fetch(mutateUrl, { method: 'POST', headers, body: JSON.stringify({ operations, partialFailure: true }) })

  return {
    reenabled: toReenable.map(r => ({ ad_group: r.adGroup?.name, keyword: r.adGroupCriterion?.keyword?.text })),
    kept_paused: keptPaused,
  }
}

async function addExtraNegatives(
  customerId: string,
  headers: Record<string, string>,
  campaignId: string,
  negatives: string[],
  dryRun: boolean,
): Promise<{ added: number; skipped: number }> {
  const searchUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const existingQuery = `
    SELECT campaign_criterion.keyword.text
    FROM campaign_criterion
    WHERE campaign_criterion.type = 'KEYWORD'
      AND campaign_criterion.negative = true
      AND campaign.id = ${campaignId}
  `
  const existingRes = await fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query: existingQuery }) })
  const existingData = await existingRes.json() as any[]
  const existing = new Set<string>()
  for (const batch of (Array.isArray(existingData) ? existingData : [])) {
    for (const row of (batch.results ?? [])) {
      existing.add((row.campaignCriterion?.keyword?.text ?? '').toLowerCase())
    }
  }

  const toAdd = negatives.filter(n => !existing.has(n.toLowerCase()))
  if (dryRun || toAdd.length === 0) {
    return { added: toAdd.length, skipped: negatives.length - toAdd.length }
  }

  const mutateUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/campaignCriteria:mutate`
  const campaignResource = `customers/${customerId}/campaigns/${campaignId}`
  const operations = toAdd.map(text => ({
    create: { campaign: campaignResource, negative: true, keyword: { text, matchType: 'BROAD' } },
  }))

  const res = await fetch(mutateUrl, { method: 'POST', headers, body: JSON.stringify({ operations, partialFailure: true }) })
  const data = await res.json() as any
  if (!res.ok) {
    logger.warn('[gads-fix-catchall] Negative keyword error:', JSON.stringify(data).slice(0, 400))
    return { added: 0, skipped: negatives.length }
  }

  return { added: (data.results ?? []).length, skipped: negatives.length - toAdd.length }
}

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as any
  const dryRun: boolean = body?.dry_run !== false

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId

  const results: Record<string, unknown> = {
    reenable_zuerich: await reenableBestAdGroupInstance(customerId, headers, FAHRSCHULE_ZUERICH_CAMPAIGN_ID, dryRun),
    reenable_lachen: await reenableBestAdGroupInstance(customerId, headers, FAHRSCHULE_LACHEN_CAMPAIGN_ID, dryRun),
    extra_negatives_zuerich: await addExtraNegatives(
      customerId, headers, FAHRSCHULE_ZUERICH_CAMPAIGN_ID, EXTRA_NEGATIVES[FAHRSCHULE_ZUERICH_CAMPAIGN_ID], dryRun,
    ),
    extra_negatives_lachen: await addExtraNegatives(
      customerId, headers, FAHRSCHULE_LACHEN_CAMPAIGN_ID, EXTRA_NEGATIVES[FAHRSCHULE_LACHEN_CAMPAIGN_ID], dryRun,
    ),
  }

  logger.info(`[gads-fix-catchall-cannibalization] Completed (dry_run=${dryRun})`)

  return {
    ok: true,
    dry_run: dryRun,
    message: dryRun
      ? 'Dry run complete. Set dry_run: false to apply.'
      : 'Re-enabled catch-all keywords in best ad group only + added extra negatives.',
    results,
  }
})
