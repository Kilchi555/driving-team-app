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

import { resolveGadsAuth, buildGadsCustomer } from '~/server/utils/gads-auth'

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
  // ── Auth + Credentials (tenant-aware) ────────────────────────────────────────
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event)
  const dryRun: boolean = body?.dry_run !== false
  const preset: string = body?.preset ?? 'rank_fix'
  const maxCapChf: number = body?.max_cap_chf ?? ABSOLUTE_MAX_CPC_CHF
  const debug: boolean = body?.debug === true

  if (!PRESETS[preset]) {
    return { ok: false, reason: `Unknown preset. Use: ${Object.keys(PRESETS).join(', ')}` }
  }

  const customer = buildGadsCustomer(gads)

  // 1. Fetch campaigns with Target Impression Share settings + portfolio strategy info
  const campaignResponse = await customer.query(`
    SELECT
      campaign.resource_name,
      campaign.name,
      campaign.bidding_strategy_type,
      campaign.bidding_strategy,
      campaign.target_impression_share.cpc_bid_ceiling_micros,
      campaign.target_impression_share.location,
      campaign.target_impression_share.location_fraction_micros
    FROM campaign
    WHERE campaign.status = 'ENABLED'
  `)

  const rules = PRESETS[preset]
  const absoluteMaxMicros = Math.round(maxCapChf * 1_000_000)

  // 2. Build plan — filter to Target Impression Share campaigns (type 9) and increase CPC ceiling
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
    const biddingStrategyType = camp.campaign?.bidding_strategy_type
    // Only process Target Impression Share campaigns (enum value 9 in the API response)
    if (biddingStrategyType !== 9 && biddingStrategyType !== 'TARGET_IMPRESSION_SHARE') continue

    const campaignName: string = camp.campaign?.name ?? ''
    const currentCeilingMicros: number = camp.campaign?.target_impression_share?.cpc_bid_ceiling_micros ?? 0
    const currentShareFraction: number = camp.campaign?.target_impression_share?.location_fraction_micros ?? 0
    const resourceName: string = camp.campaign?.resource_name ?? ''

    const matchingRule = rules.find(r =>
      campaignName.toLowerCase().includes(r.campaign_name_contains.toLowerCase()),
    )
    if (!matchingRule) continue

    // If ceiling = 0 (not set / uncapped), set an initial ceiling based on the increase %
    // If ceiling > 0, increase it by the configured %
    const DEFAULT_CEILING_CHF: Record<string, number> = {
      'Anhänger Fahrschule Zürich': 5.0,
      'Fahrschule Zürich Umgebung': 4.5,
      'Fahrschule Lachen Umgebung': 4.0,
    }
    let newCeilingChf: number
    if (currentCeilingMicros === 0) {
      // Set initial ceiling from defaults
      const rule = rules.find(r => campaignName.toLowerCase().includes(r.campaign_name_contains.toLowerCase()))
      const defaultCeiling = Object.entries(DEFAULT_CEILING_CHF).find(([k]) =>
        campaignName.toLowerCase().includes(k.toLowerCase()),
      )?.[1] ?? 4.0
      newCeilingChf = Math.min(defaultCeiling, absoluteMaxMicros / 1_000_000)
    }
    else {
      newCeilingChf = Math.min(
        (currentCeilingMicros / 1_000_000) * (1 + matchingRule.increase_pct / 100),
        absoluteMaxMicros / 1_000_000,
      )
    }

    plan.push({
      resourceName,
      campaignName,
      currentCeilingChf: currentCeilingMicros / 1_000_000,
      newCeilingChf,
      currentSharePct: Math.round(currentShareFraction / 10_000),
      increasePct: matchingRule.increase_pct,
      capped: newCeilingChf * 1_000_000 >= absoluteMaxMicros,
    })
  }

  if (debug) {
    return {
      debug: true,
      raw: (campaignResponse as any[]).filter(c =>
        PRESETS[preset].some(r => (c.campaign?.name ?? '').toLowerCase().includes(r.campaign_name_contains.toLowerCase())),
      ).map(c => ({
        name: c.campaign?.name,
        bidding_strategy_type: c.campaign?.bidding_strategy_type,
        bidding_strategy_portfolio: c.campaign?.bidding_strategy,
        ceiling_chf: (c.campaign?.target_impression_share?.cpc_bid_ceiling_micros ?? 0) / 1_000_000,
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

  // 3. Apply — update campaign CPC ceiling via google-ads-api library
  const updated: string[] = []
  const errors: string[] = []

  for (const p of plan) {
    try {
      const result = await customer.mutateResources([{
        entity: 'campaign',
        operation: 'update',
        resource: {
          resource_name: p.resourceName,
          target_impression_share: {
            // ANYWHERE_ON_PAGE = 2
            location: 2,
            // 80% impression share target
            location_fraction_micros: 800_000,
            cpc_bid_ceiling_micros: Math.round(p.newCeilingChf * 1_000_000),
          },
        },
        update_mask: {
          paths: [
            'target_impression_share.cpc_bid_ceiling_micros',
            'target_impression_share.location',
            'target_impression_share.location_fraction_micros',
          ],
        },
      }])
      updated.push(
        `${p.campaignName}: CPC ceiling CHF ${p.currentCeilingChf.toFixed(2)} → CHF ${p.newCeilingChf.toFixed(2)}, TIS target set to 80%`,
      )
    }
    catch (err: any) {
      const errMsg = err?.message ?? err?.errors?.[0]?.message ?? JSON.stringify(err)
      errors.push(`${p.campaignName}: ${errMsg}`)
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
