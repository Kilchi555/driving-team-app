/**
 * Increase CPC bids by a percentage for specific campaigns.
 *
 * Analysis (July 2026):
 *  - Anhänger Fahrschule Zürich: 58.7% Rank Lost IS → bids too low, need +30%
 *  - Fahrschule Zürich Umgebung: 49.9% Rank Lost IS → bids too low, need +20%
 *  - Fahrschule Lachen Umgebung: 38% Rank Lost IS → moderate, +10% optional
 *
 * Only increases keywords BELOW a max cap (default CHF 6.00) to avoid runaway bids.
 *
 * USAGE (dry run — shows what would change):
 *   curl -X POST https://app.simy.ch/api/admin/gads-increase-bids \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true, "preset": "rank_fix" }'
 *
 * USAGE (apply):
 *   curl -X POST https://app.simy.ch/api/admin/gads-increase-bids \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false, "preset": "rank_fix" }'
 *
 * Presets:
 *   "rank_fix"    — Anhänger ZH +30%, FS Zürich +20%, FS Lachen +10%
 *   "anhaenger"   — only Anhänger ZH +30%
 *   "zuerich"     — only FS Zürich +20%
 */

import { GoogleAdsApi } from 'google-ads-api'

const PRESETS: Record<string, Array<{ campaign_name_contains: string; increase_pct: number }>> = {
  rank_fix: [
    { campaign_name_contains: 'Anhänger Fahrschule Zürich', increase_pct: 30 },
    { campaign_name_contains: 'Fahrschule Zürich Umgebung', increase_pct: 20 },
    { campaign_name_contains: 'Fahrschule Lachen Umgebung', increase_pct: 10 },
  ],
  anhaenger: [
    { campaign_name_contains: 'Anhänger Fahrschule Zürich', increase_pct: 30 },
  ],
  zuerich: [
    { campaign_name_contains: 'Fahrschule Zürich Umgebung', increase_pct: 20 },
  ],
}

const MAX_CPC_CAP_CHF = 6.0 // Never bid above this, even after increase
const MIN_CPC_CHF = 0.5     // Skip keywords with no bid set (use ad group default)

export default defineEventHandler(async (event) => {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = getHeader(event, 'authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const dryRun: boolean = body?.dry_run !== false
  const preset: string = body?.preset ?? 'rank_fix'
  const maxCapChf: number = body?.max_cap_chf ?? MAX_CPC_CAP_CHF

  if (!PRESETS[preset]) {
    return { ok: false, reason: `Unknown preset. Use: ${Object.keys(PRESETS).join(', ')}` }
  }

  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID

  if (!customerId || !developerToken || !clientId || !clientSecret || !refreshToken) {
    throw createError({ statusCode: 500, statusMessage: 'Missing Google Ads environment variables' })
  }

  const client = new GoogleAdsApi({
    client_id: clientId,
    client_secret: clientSecret,
    developer_token: developerToken,
  })

  const customer = client.Customer({
    customer_id: customerId,
    refresh_token: refreshToken,
    login_customer_id: loginCustomerId || undefined,
  })

  // 1a. Fetch ad groups (for ad-group-level default CPC bids)
  const adGroupResponse = await customer.query(`
    SELECT
      ad_group.resource_name,
      ad_group.name,
      ad_group.cpc_bid_micros,
      campaign.name
    FROM ad_group
    WHERE
      ad_group.status = 'ENABLED'
      AND campaign.status = 'ENABLED'
  `)

  // 1b. Fetch individual keyword bids (keyword-level overrides)
  const kwResponse = await customer.query(`
    SELECT
      ad_group_criterion.resource_name,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.cpc_bid_micros,
      campaign.name,
      ad_group.name
    FROM ad_group_criterion
    WHERE
      ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.status = 'ENABLED'
      AND campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
  `)

  const rules = PRESETS[preset]
  const maxCapMicros = Math.round(maxCapChf * 1_000_000)
  const minMicros = Math.round(MIN_CPC_CHF * 1_000_000)

  // 2. Build plan — prefer keyword-level bids, fall back to ad group bid
  const adGroupBidMap = new Map<string, number>()
  for (const ag of adGroupResponse as any[]) {
    adGroupBidMap.set(ag.ad_group?.resource_name ?? '', ag.ad_group?.cpc_bid_micros ?? 0)
  }

  type PlanEntry = {
    type: 'keyword' | 'ad_group'
    resourceName: string
    label: string
    campaignName: string
    currentCpcChf: number
    newCpcChf: number
    increasePct: number
    capped: boolean
  }

  const plan: PlanEntry[] = []

  // Track which ad groups already have keyword-level overrides
  const adGroupsWithKwBids = new Set<string>()

  for (const kw of kwResponse as any[]) {
    const campaignName: string = kw.campaign?.name ?? ''
    const kwMicros: number = kw.ad_group_criterion?.cpc_bid_micros ?? 0
    const resourceName: string = kw.ad_group_criterion?.resource_name ?? ''

    const matchingRule = rules.find(r =>
      campaignName.toLowerCase().includes(r.campaign_name_contains.toLowerCase()),
    )
    if (!matchingRule) continue

    if (kwMicros >= minMicros) {
      // Keyword has its own bid — update it
      const newMicros = Math.min(
        Math.round(kwMicros * (1 + matchingRule.increase_pct / 100)),
        maxCapMicros,
      )
      if (newMicros !== kwMicros) {
        plan.push({
          type: 'keyword',
          resourceName,
          label: `[KW] "${kw.ad_group_criterion?.keyword?.text}" in ${kw.ad_group?.name}`,
          campaignName,
          currentCpcChf: kwMicros / 1_000_000,
          newCpcChf: newMicros / 1_000_000,
          increasePct: matchingRule.increase_pct,
          capped: newMicros === maxCapMicros,
        })
      }
    }
    // Track the ad group so we know it might have keywords
    adGroupsWithKwBids.add(resourceName.split('/ad_group_criteria/')[0] ?? '')
  }

  // Also update ad group default bids for matching campaigns
  for (const ag of adGroupResponse as any[]) {
    const campaignName: string = ag.campaign?.name ?? ''
    const agMicros: number = ag.ad_group?.cpc_bid_micros ?? 0
    const resourceName: string = ag.ad_group?.resource_name ?? ''

    const matchingRule = rules.find(r =>
      campaignName.toLowerCase().includes(r.campaign_name_contains.toLowerCase()),
    )
    if (!matchingRule) continue
    if (agMicros < minMicros) continue

    const newMicros = Math.min(
      Math.round(agMicros * (1 + matchingRule.increase_pct / 100)),
      maxCapMicros,
    )
    if (newMicros !== agMicros) {
      plan.push({
        type: 'ad_group',
        resourceName,
        label: `[AdGroup] "${ag.ad_group?.name}" default CPC`,
        campaignName,
        currentCpcChf: agMicros / 1_000_000,
        newCpcChf: newMicros / 1_000_000,
        increasePct: matchingRule.increase_pct,
        capped: newMicros === maxCapMicros,
      })
    }
  }

  if (dryRun) {
    const summary = rules.map(r => ({
      campaign: r.campaign_name_contains,
      increase: `+${r.increase_pct}%`,
      keywords_affected: plan.filter(p => p.campaignName.includes(r.campaign_name_contains) && p.type === 'keyword').length,
      ad_groups_affected: plan.filter(p => p.campaignName.includes(r.campaign_name_contains) && p.type === 'ad_group').length,
    }))

    return {
      dry_run: true,
      preset,
      max_cap_chf: maxCapChf,
      summary,
      changes: plan.map(p => ({
        what: p.label,
        campaign: p.campaignName,
        current_cpc: `CHF ${p.currentCpcChf.toFixed(2)}`,
        new_cpc: `CHF ${p.newCpcChf.toFixed(2)}`,
        increase: `+${p.increasePct}%`,
        capped: p.capped,
      })),
      total: plan.length,
    }
  }

  // 3. Apply — separate mutations for keywords vs ad groups
  const updated: string[] = []
  const errors: string[] = []
  const BATCH_SIZE = 50

  const kwUpdates = plan.filter(p => p.type === 'keyword')
  const agUpdates = plan.filter(p => p.type === 'ad_group')

  // 3a. Keyword-level updates
  for (let i = 0; i < kwUpdates.length; i += BATCH_SIZE) {
    const batch = kwUpdates.slice(i, i + BATCH_SIZE)
    const operations = batch.map(p => ({
      entity: 'ad_group_criterion',
      operation: 'update',
      resource: {
        resource_name: p.resourceName,
        cpc_bid_micros: Math.round(p.newCpcChf * 1_000_000),
      },
      update_mask: { paths: ['cpc_bid_micros'] },
    }))
    try {
      await customer.mutateResources(operations)
      for (const p of batch) {
        updated.push(`${p.label} [${p.campaignName}]: CHF ${p.currentCpcChf.toFixed(2)} → CHF ${p.newCpcChf.toFixed(2)}${p.capped ? ' (capped)' : ''}`)
      }
    }
    catch (err: any) {
      errors.push(`KW batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err?.message ?? String(err)}`)
    }
  }

  // 3b. Ad group default CPC updates
  for (let i = 0; i < agUpdates.length; i += BATCH_SIZE) {
    const batch = agUpdates.slice(i, i + BATCH_SIZE)
    const operations = batch.map(p => ({
      entity: 'ad_group',
      operation: 'update',
      resource: {
        resource_name: p.resourceName,
        cpc_bid_micros: Math.round(p.newCpcChf * 1_000_000),
      },
      update_mask: { paths: ['cpc_bid_micros'] },
    }))
    try {
      await customer.mutateResources(operations)
      for (const p of batch) {
        updated.push(`${p.label} [${p.campaignName}]: CHF ${p.currentCpcChf.toFixed(2)} → CHF ${p.newCpcChf.toFixed(2)}${p.capped ? ' (capped)' : ''}`)
      }
    }
    catch (err: any) {
      errors.push(`AdGroup batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err?.message ?? String(err)}`)
    }
  }

  return {
    dry_run: false,
    preset,
    max_cap_chf: maxCapChf,
    updated,
    errors,
    total_updated: updated.length,
    total_errors: errors.length,
  }
})
