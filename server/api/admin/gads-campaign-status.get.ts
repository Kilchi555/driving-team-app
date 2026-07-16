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
 *
 * USAGE (detail for one campaign — ad groups, keyword count, final URLs, dates):
 *   curl "https://app.simy.ch/api/admin/gads-campaign-status?campaign_id=123" \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { getQuery } from 'h3'
import { resolveGadsAuth, buildGadsCustomer } from '~/server/utils/gads-auth'

export default defineEventHandler(async (event) => {
  try {
    const gads = await resolveGadsAuth(event)
    if (!gads.ok) return gads

    const customer = buildGadsCustomer(gads)
    const { campaign_id } = getQuery(event)

    if (campaign_id && typeof campaign_id === 'string') {
      const [campaignRows, adGroupRows, keywordRows] = await Promise.all([
        customer.query(`
          SELECT campaign.id, campaign.name, campaign.status, campaign.start_date, campaign.end_date,
                 campaign.advertising_channel_type
          FROM campaign
          WHERE campaign.id = ${campaign_id}
        `),
        customer.query(`
          SELECT ad_group.id, ad_group.name, ad_group.status
          FROM ad_group
          WHERE campaign.id = ${campaign_id}
        `),
        customer.query(`
          SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.status
          FROM ad_group_criterion
          WHERE campaign.id = ${campaign_id} AND ad_group_criterion.type = 'KEYWORD'
        `).catch(() => []),
      ])

      return {
        campaign: (campaignRows as any[])[0] ?? null,
        ad_groups: (adGroupRows as any[]).map(r => ({
          id: r.ad_group?.id,
          name: r.ad_group?.name,
          status: r.ad_group?.status,
        })),
        keyword_count: (keywordRows as any[]).length,
        sample_keywords: (keywordRows as any[]).slice(0, 20).map(r => ({
          text: r.ad_group_criterion?.keyword?.text,
          match_type: r.ad_group_criterion?.keyword?.match_type,
          status: r.ad_group_criterion?.status,
        })),
      }
    }

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
  }
  catch (err: any) {
    return {
      ok: false,
      error: err?.message ?? String(err),
      details: err?.errors ?? err?.response?.data ?? null,
    }
  }
})
