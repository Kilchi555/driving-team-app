/**
 * Read-only: list all campaigns (any status, including PAUSED/REMOVED) with
 * their current status, budget and bidding strategy. Used to diagnose
 * campaigns that silently stopped spending (e.g. "disappeared" from the
 * daily performance reports because they were paused/removed on the Google
 * Ads side, not because of a tracking bug).
 *
 * USAGE:
 *   curl https://app.simy.ch/api/admin/gads-campaign-status \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { resolveGadsAuth, buildGadsCustomer } from '~/server/utils/gads-auth'

export default defineEventHandler(async (event) => {
  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const customer = buildGadsCustomer(gads)

  const response = await customer.query(`
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.serving_status,
      campaign_budget.amount_micros,
      campaign.bidding_strategy_type
    FROM campaign
    ORDER BY campaign.name
  `)

  const campaigns = (response as any[]).map(row => ({
    id: row.campaign?.id ?? '',
    name: row.campaign?.name ?? '',
    status: row.campaign?.status ?? '',
    serving_status: row.campaign?.serving_status ?? '',
    daily_budget_chf: row.campaign_budget?.amount_micros ? Number(row.campaign_budget.amount_micros) / 1_000_000 : null,
    bidding_strategy_type: row.campaign?.bidding_strategy_type ?? '',
  }))

  return { total: campaigns.length, campaigns }
})
