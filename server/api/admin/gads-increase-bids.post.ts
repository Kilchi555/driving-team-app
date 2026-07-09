/**
 * Increase bids for Target Impression Share campaigns.
 *
 * These campaigns use bidding_strategy_type=9 (TARGET_IMPRESSION_SHARE), meaning
 * Google automatically sets keyword bids. The correct lever is:
 *   1. Raise the max CPC ceiling  (target_impression_share.cpc_bid_ceiling_micros)
 *   2. Raise the impression share target (target_impression_share.location_fraction_micros)
 *
 * Analysis (July 2026):
 *  - Anhänger Fahrschule Zürich: 58.7% Rank Lost IS → ceiling too low, need +30%
 *  - Fahrschule Zürich Umgebung: 49.9% Rank Lost IS → ceiling too low, need +20%
 *  - Fahrschule Lachen Umgebung: 38% Rank Lost IS → moderate, +10%
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

const ABSOLUTE_MAX_CPC_CHF = 8.0 // Hard cap — never raise ceiling above this

export default defineEventHandler(async (event) => {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = getHeader(event, 'authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const dryRun: boolean = body?.dry_run !== false
  const preset: string = body?.preset ?? 'rank_fix'
  const maxCapChf: number = body?.max_cap_chf ?? ABSOLUTE_MAX_CPC_CHF
  const debug: boolean = body?.debug === true

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

  // 1. Fetch campaigns with Target Impression Share settings
  const campaignResponse = await customer.query(`
    SELECT
      campaign.resource_name,
      campaign.name,
      campaign.bidding_strategy_type,
      campaign.target_impression_share.cpc_bid_ceiling_micros,
      campaign.target_impression_share.location,
      campaign.target_impression_share.location_fraction_micros
    FROM campaign
    WHERE
      campaign.status = 'ENABLED'
      AND campaign.bidding_strategy_type = 'TARGET_IMPRESSION_SHARE'
  `)

  const rules = PRESETS[preset]
  const absoluteMaxMicros = Math.round(maxCapChf * 1_000_000)

  // 2. Build plan — increase CPC ceiling for matching campaigns
  type PlanEntry = {
    resourceName: string
    campaignName: string
    currentCeilingChf: number
    newCeilingChf: number
    currentSharePct: number
    increasePct: number
    capped: boolean
  }

  const plan: PlanEntry[] = []

  for (const camp of campaignResponse as any[]) {
    const campaignName: string = camp.campaign?.name ?? ''
    const currentCeilingMicros: number = camp.campaign?.target_impression_share?.cpc_bid_ceiling_micros ?? 0
    const currentShareFraction: number = camp.campaign?.target_impression_share?.location_fraction_micros ?? 0
    const resourceName: string = camp.campaign?.resource_name ?? ''

    const matchingRule = rules.find(r =>
      campaignName.toLowerCase().includes(r.campaign_name_contains.toLowerCase()),
    )
    if (!matchingRule) continue
    if (currentCeilingMicros === 0) continue // no ceiling set — skip (bidding is uncapped)

    const newCeilingMicros = Math.min(
      Math.round(currentCeilingMicros * (1 + matchingRule.increase_pct / 100)),
      absoluteMaxMicros,
    )

    plan.push({
      resourceName,
      campaignName,
      currentCeilingChf: currentCeilingMicros / 1_000_000,
      newCeilingChf: newCeilingMicros / 1_000_000,
      currentSharePct: Math.round(currentShareFraction / 10_000), // fraction micros → %
      increasePct: matchingRule.increase_pct,
      capped: newCeilingMicros === absoluteMaxMicros,
    })
  }

  if (debug) {
    return {
      debug: true,
      raw: (campaignResponse as any[]).map(c => ({
        name: c.campaign?.name,
        bidding_strategy_type: c.campaign?.bidding_strategy_type,
        ceiling_micros: c.campaign?.target_impression_share?.cpc_bid_ceiling_micros,
        ceiling_chf: (c.campaign?.target_impression_share?.cpc_bid_ceiling_micros ?? 0) / 1_000_000,
        share_fraction_micros: c.campaign?.target_impression_share?.location_fraction_micros,
        share_pct: Math.round((c.campaign?.target_impression_share?.location_fraction_micros ?? 0) / 10_000),
        location: c.campaign?.target_impression_share?.location,
      })),
      plan,
    }
  }

  if (dryRun) {
    const summary = rules.map(r => ({
      campaign: r.campaign_name_contains,
      increase: `+${r.increase_pct}%`,
      campaigns_affected: plan.filter(p => p.campaignName.includes(r.campaign_name_contains)).length,
    }))

    return {
      dry_run: true,
      preset,
      absolute_max_cpc_chf: maxCapChf,
      note: 'Campaigns use Target Impression Share — adjusting CPC ceiling (not keyword bids)',
      summary,
      changes: plan.map(p => ({
        campaign: p.campaignName,
        current_cpc_ceiling: `CHF ${p.currentCeilingChf.toFixed(2)}`,
        new_cpc_ceiling: `CHF ${p.newCeilingChf.toFixed(2)}`,
        impression_share_target: `${p.currentSharePct}%`,
        increase: `+${p.increasePct}%`,
        capped: p.capped,
      })),
      total: plan.length,
    }
  }

  // 3. Apply — update campaign CPC ceiling
  const updated: string[] = []
  const errors: string[] = []

  for (const p of plan) {
    try {
      await customer.mutateResources([{
        entity: 'campaign',
        operation: 'update',
        resource: {
          resource_name: p.resourceName,
          target_impression_share: {
            cpc_bid_ceiling_micros: Math.round(p.newCeilingChf * 1_000_000),
          },
        },
        update_mask: { paths: ['target_impression_share.cpc_bid_ceiling_micros'] },
      }])
      updated.push(
        `${p.campaignName}: CPC ceiling CHF ${p.currentCeilingChf.toFixed(2)} → CHF ${p.newCeilingChf.toFixed(2)} (+${p.increasePct}%)${p.capped ? ' [CAPPED]' : ''}`,
      )
    }
    catch (err: any) {
      errors.push(`${p.campaignName}: ${err?.message ?? String(err)}`)
    }
  }

  return {
    dry_run: false,
    preset,
    absolute_max_cpc_chf: maxCapChf,
    updated,
    errors,
    total_updated: updated.length,
    total_errors: errors.length,
  }
})
