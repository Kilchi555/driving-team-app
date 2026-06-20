/**
 * TEMPORARY: Switch campaigns to Maximize Clicks with CHF 3.00 CPC cap
 * DELETE AFTER USE
 */
import { defineEventHandler, getHeader, createError } from 'h3'

const ADS_API = 'https://googleads.googleapis.com/v23'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    return { success: false, reason: 'missing_credentials' }
  }

  // Get OAuth access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const tokenData = await tokenRes.json() as any
  if (!tokenData.access_token) {
    return { success: false, reason: 'token_error', detail: tokenData }
  }

  const headers = {
    'Authorization': `Bearer ${tokenData.access_token}`,
    'developer-token': developerToken,
    'login-customer-id': customerId,
    'Content-Type': 'application/json',
  }

  // ── Step 1: Query all active campaigns with their current bidding strategy ──
  const searchRes = await fetch(`${ADS_API}/customers/${customerId}/googleAds:search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: `SELECT campaign.id, campaign.name, campaign.status, campaign.bidding_strategy_type, campaign.bidding_strategy, campaign.advertising_channel_type FROM campaign WHERE campaign.status != 'REMOVED'`,
    }),
  })
  const searchData = await searchRes.json() as any
  if (!searchRes.ok) {
    return { success: false, reason: 'query_failed', detail: searchData }
  }

  const campaignRows: any[] = searchData.results || []
  const results: any[] = []

  for (const row of campaignRows) {
    const campaignId = String(row.campaign.id)
    const campaignName = row.campaign.name
    const currentStrategy = row.campaign.biddingStrategyType
    const portfolioStrategy = row.campaign.biddingStrategy // resource name if portfolio

    // Skip Performance Max campaigns — they don't support Maximize Clicks
    if (row.campaign.advertisingChannelType === 'PERFORMANCE_MAX') {
      results.push({ campaign_id: campaignId, campaign_name: campaignName, was_strategy: currentStrategy, ok: true, result: 'skipped_pmax' })
      continue
    }

    // Build the update: switch to targetSpend (Maximize Clicks) with CHF 3.00 cap
    // Use camelCase field names in body, snake_case in updateMask
    const updateBody: any = {
      resourceName: `customers/${customerId}/campaigns/${campaignId}`,
      targetSpend: {
        cpcBidCeilingMicros: 3000000,
      },
    }

    // When using a portfolio bidding strategy resource, must clear it
    let updateMask = 'target_spend.cpc_bid_ceiling_micros'
    if (portfolioStrategy) {
      // Detach from portfolio strategy first
      updateBody.biddingStrategyType = 'TARGET_SPEND'
      updateMask = 'bidding_strategy_type,target_spend.cpc_bid_ceiling_micros'
    }

    const mutateRes = await fetch(`${ADS_API}/customers/${customerId}/campaigns:mutate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        operations: [{ update: updateBody, updateMask }],
      }),
    })

    const mutateData = await mutateRes.json() as any
    results.push({
      campaign_id: campaignId,
      campaign_name: campaignName,
      was_strategy: currentStrategy,
      had_portfolio: !!portfolioStrategy,
      ok: mutateRes.ok,
      status: mutateRes.status,
      error: mutateRes.ok ? null : mutateData,
    })
  }

  return {
    success: true,
    total: results.length,
    updated: results.filter(r => r.ok).length,
    results,
  }
})
