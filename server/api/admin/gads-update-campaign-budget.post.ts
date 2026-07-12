/**
 * Update the daily budget of one or more Google Ads campaigns.
 *
 * Background: The VKU Kurs Lachen campaign has a 73% Rank Lost IS, meaning
 * it loses 73% of auctions due to insufficient bid / budget. This endpoint
 * lets you increase (or decrease) budgets without going into the Google Ads UI.
 *
 * USAGE (dry run — see current budgets):
 *   curl -X POST http://localhost:3000/api/admin/gads-update-campaign-budget \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": true, "preset": "increase_vku" }'
 *
 * USAGE (apply preset — increase VKU by +50%):
 *   curl -X POST http://localhost:3000/api/admin/gads-update-campaign-budget \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{ "dry_run": false, "preset": "increase_vku" }'
 *
 * USAGE (custom campaigns):
 *   curl -X POST http://localhost:3000/api/admin/gads-update-campaign-budget \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{
 *       "dry_run": false,
 *       "updates": [
 *         { "campaign_id": "23956180976", "daily_budget_chf": 30 }
 *       ]
 *     }'
 */

import { defineEventHandler, readBody } from 'h3'
import { logger } from '~/utils/logger'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'

// Campaign IDs with names for reference
const VKU_CAMPAIGN_ID = '23956180976'
const ANHAENGER_LACHEN_CAMPAIGN_ID = '23888643015'

export default defineEventHandler(async (event) => {
  // ── Auth + Credentials (tenant-aware) ────────────────────────────────────────
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const body = await readBody(event).catch(() => ({})) as any
  const dryRun: boolean = body?.dry_run !== false
  const preset: string = body?.preset ?? ''

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId

  // ── Fetch current budgets for all active campaigns ────────────────────────────
  const searchUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`
  const query = `
    SELECT campaign.id, campaign.name, campaign.status,
           campaign_budget.id, campaign_budget.resource_name,
           campaign_budget.amount_micros, campaign_budget.explicitly_shared
    FROM campaign
    WHERE campaign.status = 'ENABLED'
      AND campaign.advertising_channel_type = 'SEARCH'
  `
  const searchRes = await fetch(searchUrl, { method: 'POST', headers, body: JSON.stringify({ query }) })
  const searchData = await searchRes.json() as any[]

  const currentBudgets: Record<string, { budget_resource_name: string; current_chf: number; campaign_name: string; explicitly_shared: boolean }> = {}

  for (const batch of (Array.isArray(searchData) ? searchData : [])) {
    for (const row of (batch.results ?? [])) {
      const campId = String(row.campaign?.id ?? '')
      currentBudgets[campId] = {
        budget_resource_name: row.campaignBudget?.resourceName ?? '',
        current_chf: Math.round((row.campaignBudget?.amountMicros ?? 0) / 10_000) / 100,
        campaign_name: row.campaign?.name ?? campId,
        explicitly_shared: row.campaignBudget?.explicitlyShared ?? false,
      }
    }
  }

  // ── Resolve which campaigns to update ─────────────────────────────────────────
  let updates: Array<{ campaign_id: string; daily_budget_chf: number }> = []

  if (preset === 'increase_vku') {
    // Increase VKU by +50% (from ~CHF 20/day to ~CHF 30/day)
    const current = currentBudgets[VKU_CAMPAIGN_ID]?.current_chf ?? 20
    updates = [{ campaign_id: VKU_CAMPAIGN_ID, daily_budget_chf: Math.ceil(current * 1.5) }]
  } else if (preset === 'rebalance') {
    // Recommended rebalance: VKU +50%, Anhänger Lachen -30%
    const vkuCurrent = currentBudgets[VKU_CAMPAIGN_ID]?.current_chf ?? 20
    const anhLachenCurrent = currentBudgets[ANHAENGER_LACHEN_CAMPAIGN_ID]?.current_chf ?? 15
    updates = [
      { campaign_id: VKU_CAMPAIGN_ID, daily_budget_chf: Math.ceil(vkuCurrent * 1.5) },
      { campaign_id: ANHAENGER_LACHEN_CAMPAIGN_ID, daily_budget_chf: Math.max(5, Math.floor(anhLachenCurrent * 0.7)) },
    ]
  } else if (Array.isArray(body?.updates) && body.updates.length > 0) {
    updates = body.updates
  } else {
    // Just return current state if no action specified
    return {
      ok: true,
      dry_run: true,
      current_budgets: Object.entries(currentBudgets).map(([id, b]) => ({
        campaign_id: id,
        campaign_name: b.campaign_name,
        current_daily_budget_chf: b.current_chf,
        budget_resource_name: b.budget_resource_name,
      })),
      available_presets: ['increase_vku', 'rebalance'],
      hint: 'Pass preset or updates array to apply changes.',
    }
  }

  // Validate and enrich updates
  const plan = updates.map(u => {
    const current = currentBudgets[u.campaign_id]
    return {
      campaign_id: u.campaign_id,
      campaign_name: current?.campaign_name ?? u.campaign_id,
      budget_resource_name: current?.budget_resource_name ?? null,
      current_chf: current?.current_chf ?? null,
      new_chf: u.daily_budget_chf,
      delta_chf: current ? u.daily_budget_chf - current.current_chf : null,
      new_micros: Math.round(u.daily_budget_chf * 1_000_000),
      explicitly_shared: current?.explicitly_shared ?? false,
    }
  }).filter(p => p.budget_resource_name)

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      plan,
      missing_campaigns: updates.filter(u => !currentBudgets[u.campaign_id]).map(u => u.campaign_id),
    }
  }

  if (plan.length === 0) {
    return { ok: false, reason: 'No valid campaigns found for the requested updates.' }
  }

  // ── Apply budget updates ───────────────────────────────────────────────────────
  const results: any[] = []
  const errors: any[] = []

  for (const p of plan) {
    if (!p.budget_resource_name) continue

    // Shared budgets cannot be changed here (they may be shared across campaigns)
    if (p.explicitly_shared) {
      results.push({ campaign: p.campaign_name, skipped: true, reason: 'explicitly_shared budget — edit in Google Ads UI' })
      continue
    }

    const mutateUrl = `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/campaignBudgets:mutate`
    const res = await fetch(mutateUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        operations: [{
          updateMask: 'amountMicros',
          update: {
            resourceName: p.budget_resource_name,
            amountMicros: p.new_micros,
          },
        }],
      }),
    })
    const data = await res.json() as any

    if (!res.ok) {
      errors.push({ campaign: p.campaign_name, error: data })
      logger.warn(`[gads-budget] Failed to update ${p.campaign_name}:`, JSON.stringify(data).slice(0, 400))
    } else {
      logger.info(`[gads-budget] Updated ${p.campaign_name}: CHF ${p.current_chf} → CHF ${p.new_chf}`)
      results.push({
        campaign: p.campaign_name,
        campaign_id: p.campaign_id,
        from_chf: p.current_chf,
        to_chf: p.new_chf,
        delta_chf: p.delta_chf,
        updated: true,
      })
    }
  }

  return {
    ok: errors.length === 0,
    dry_run: false,
    updated: results.filter(r => r.updated).length,
    results,
    errors: errors.length > 0 ? errors : undefined,
  }
})
