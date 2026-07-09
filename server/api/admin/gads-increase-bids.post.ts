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

  // 1. Fetch all active keywords with their current CPCs
  const kwResponse = await customer.query(`
    SELECT
      ad_group_criterion.resource_name,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.cpc_bid_micros,
      ad_group_criterion.status,
      campaign.name,
      ad_group.name
    FROM ad_group_criterion
    WHERE
      ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.status = 'ENABLED'
      AND campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
  `)

  const allKeywords = kwResponse as any[]

  const rules = PRESETS[preset]
  const maxCapMicros = Math.round(maxCapChf * 1_000_000)
  const minMicros = Math.round(MIN_CPC_CHF * 1_000_000)

  // 2. Build plan
  const plan: Array<{
    resourceName: string
    keyword: string
    campaignName: string
    currentCpcChf: number
    newCpcChf: number
    increasePct: number
    capped: boolean
  }> = []

  for (const kw of allKeywords) {
    const campaignName: string = kw.campaign?.name ?? ''
    const currentMicros: number = kw.ad_group_criterion?.cpc_bid_micros ?? 0
    const resourceName: string = kw.ad_group_criterion?.resource_name ?? ''

    if (currentMicros < minMicros) continue // skip keywords using ad group default bid

    const matchingRule = rules.find(r =>
      campaignName.toLowerCase().includes(r.campaign_name_contains.toLowerCase()),
    )
    if (!matchingRule) continue

    const newMicros = Math.min(
      Math.round(currentMicros * (1 + matchingRule.increase_pct / 100)),
      maxCapMicros,
    )

    if (newMicros === currentMicros) continue // already at cap

    plan.push({
      resourceName,
      keyword: kw.ad_group_criterion?.keyword?.text ?? '',
      campaignName,
      currentCpcChf: currentMicros / 1_000_000,
      newCpcChf: newMicros / 1_000_000,
      increasePct: matchingRule.increase_pct,
      capped: newMicros === maxCapMicros,
    })
  }

  if (dryRun) {
    const summary = rules.map(r => ({
      campaign: r.campaign_name_contains,
      increase: `+${r.increase_pct}%`,
      keywords_affected: plan.filter(p => p.campaignName.includes(r.campaign_name_contains)).length,
    }))

    return {
      dry_run: true,
      preset,
      max_cap_chf: maxCapChf,
      summary,
      changes: plan.map(p => ({
        keyword: p.keyword,
        campaign: p.campaignName,
        current_cpc: `CHF ${p.currentCpcChf.toFixed(2)}`,
        new_cpc: `CHF ${p.newCpcChf.toFixed(2)}`,
        increase: `+${p.increasePct}%`,
        capped: p.capped,
      })),
      total: plan.length,
    }
  }

  // 3. Apply in batches of 50
  const updated: string[] = []
  const errors: string[] = []
  const BATCH_SIZE = 50

  for (let i = 0; i < plan.length; i += BATCH_SIZE) {
    const batch = plan.slice(i, i + BATCH_SIZE)
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
        updated.push(
          `"${p.keyword}" [${p.campaignName}]: CHF ${p.currentCpcChf.toFixed(2)} → CHF ${p.newCpcChf.toFixed(2)}${p.capped ? ' (capped)' : ''}`,
        )
      }
    }
    catch (err: any) {
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err?.message ?? String(err)}`)
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
