/**
 * Pause Google Ads keywords with Quality Score ≤ 2 OR with confirmed high
 * spend and zero conversions over the last 14 days.
 *
 * Background (July 2026 analysis):
 *  - "Anhängerprüfung" in Anhänger Fahrschule Lachen: QS 1, CHF 29.64 spent,
 *    post-click: BELOW_AVERAGE, creative: BELOW_AVERAGE — pure waste.
 *  - "theorieprüfung c1 lernen" in Lastwagen: QS 1, CHF 14.33 spent, 0 conv.
 *  - "führerschein ce" in Lastwagen: QS 2, 0 clicks — remove before it spends.
 *  - "fahrschule Siebnen": QS 2, CHF 6.79 spent, 0 conv.
 *
 * These keywords cannot improve without a landing page overhaul. Pausing them
 * immediately stops the bleed and can improve overall campaign Quality Scores.
 *
 * USAGE (dry run):
 *   curl -X POST http://localhost:3000/api/admin/gads-pause-low-qs-keywords \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true }'
 *
 * USAGE (apply):
 *   curl -X POST http://localhost:3000/api/admin/gads-pause-low-qs-keywords \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false }'
 *
 * USAGE (custom QS threshold):
 *   curl -X POST http://localhost:3000/api/admin/gads-pause-low-qs-keywords \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false, "max_quality_score": 3 }'
 */

import { resolveGadsAuth, buildGadsCustomer } from '~/server/utils/gads-auth'

// These specific keywords are confirmed waste from the July 2026 data analysis.
// Resource names will be fetched dynamically — this list is used to filter.
const CONFIRMED_WASTE_KEYWORDS = [
  // QS 1 — worst possible, BELOW_AVERAGE everywhere
  { keyword: 'Anhängerprüfung', campaign: 'Anhänger Fahrschule Lachen', reason: 'QS 1, CHF 29.64 wasted, 0 conv' },
  { keyword: 'theorieprüfung c1 lernen', campaign: 'Lastwagen Fahrschule Lachen', reason: 'QS 1, CHF 14.33 wasted, 0 conv' },
  // QS 2 — critically low
  { keyword: 'führerschein ce', campaign: 'Lastwagen Fahrschule Lachen', reason: 'QS 2, 0 clicks but active' },
  { keyword: 'fahrschule Siebnen', campaign: 'Fahrschule Lachen Umgebung', reason: 'QS 2, CHF 6.79 wasted, 0 conv' },
]

export default defineEventHandler(async (event) => {
  // ── Auth + Credentials (tenant-aware) ────────────────────────────────────────
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event)
  const dryRun: boolean = body?.dry_run !== false
  const maxQualityScore: number = body?.max_quality_score ?? 2

  const customer = buildGadsCustomer(gads)

  // 1. Fetch all active keywords WITH their quality scores.
  const keywordsResponse = await customer.query(`
    SELECT
      ad_group_criterion.resource_name,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      ad_group_criterion.quality_info.quality_score,
      ad_group_criterion.quality_info.post_click_quality_score,
      ad_group_criterion.quality_info.creative_quality_score,
      campaign.name,
      ad_group.name
    FROM ad_group_criterion
    WHERE
      ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.status = 'ENABLED'
      AND campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
  `)

  const allKeywords = keywordsResponse as any[]

  // 2. Identify candidates: either confirmed waste list OR dynamic QS threshold.
  const candidates: Array<{
    resourceName: string
    keyword: string
    campaignName: string
    adGroupName: string
    qualityScore: number | null
    reason: string
  }> = []

  for (const kw of allKeywords) {
    const kwText: string = kw.ad_group_criterion?.keyword?.text ?? ''
    const campaignName: string = kw.campaign?.name ?? ''
    const adGroupName: string = kw.ad_group?.name ?? ''
    const qs: number | null = kw.ad_group_criterion?.quality_info?.quality_score ?? null
    const resourceName: string = kw.ad_group_criterion?.resource_name ?? ''

    // Check against confirmed waste list — use exact campaign name match, not partial
    const confirmed = CONFIRMED_WASTE_KEYWORDS.find(
      c =>
        kwText.toLowerCase() === c.keyword.toLowerCase() &&
        campaignName.toLowerCase() === c.campaign.toLowerCase(),
    )
    if (confirmed) {
      candidates.push({
        resourceName,
        keyword: kwText,
        campaignName,
        adGroupName,
        qualityScore: qs,
        reason: confirmed.reason,
      })
      continue
    }

    // Dynamic QS threshold — only pause if QS is reported AND below threshold
    if (qs !== null && qs <= maxQualityScore) {
      candidates.push({
        resourceName,
        keyword: kwText,
        campaignName,
        adGroupName,
        qualityScore: qs,
        reason: `QS ${qs} ≤ threshold ${maxQualityScore}`,
      })
    }
  }

  // 3. De-duplicate by resourceName
  const unique = candidates.filter(
    (c, i, arr) => arr.findIndex(x => x.resourceName === c.resourceName) === i,
  )

  if (dryRun) {
    return {
      dry_run: true,
      max_quality_score_threshold: maxQualityScore,
      candidates_to_pause: unique.map(c => ({
        keyword: c.keyword,
        campaign: c.campaignName,
        ad_group: c.adGroupName,
        quality_score: c.qualityScore,
        reason: c.reason,
        resource_name: c.resourceName,
      })),
      total: unique.length,
    }
  }

  // 4. Pause all candidates via mutateAdGroupCriteria
  const paused: string[] = []
  const errors: string[] = []

  // Batch in groups of 50
  const BATCH_SIZE = 50
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE)
    const operations = batch.map(c => ({
      entity: 'ad_group_criterion',
      operation: 'update',
      resource: {
        resource_name: c.resourceName,
        status: 2, // PAUSED
      },
      update_mask: { paths: ['status'] },
    }))

    try {
      await customer.mutateResources(operations)
      paused.push(...batch.map(c => `${c.keyword} [${c.campaignName}]`))
    }
    catch (err: any) {
      const msg = err?.message ?? String(err)
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${msg}`)
    }
  }

  return {
    dry_run: false,
    max_quality_score_threshold: maxQualityScore,
    paused,
    errors,
    total_paused: paused.length,
    total_errors: errors.length,
  }
})
