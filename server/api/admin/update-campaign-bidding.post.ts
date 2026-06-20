/**
 * TEMPORARY: Switch campaigns to Maximize Clicks with CHF 3.00 CPC cap
 * DELETE AFTER USE
 */
import { defineEventHandler, getHeader, createError } from 'h3'
import { logger } from '~/utils/logger'

const ADS_BASE = 'https://googleads.googleapis.com/v20'

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

  // Get access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  })
  const tokenData = await tokenRes.json() as any
  if (!tokenData.access_token) {
    return { success: false, reason: 'token_error', detail: tokenData }
  }
  const accessToken = tokenData.access_token

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'login-customer-id': customerId,
    'Content-Type': 'application/json',
  }

  // All known campaign IDs (from marketing_google_ads_daily)
  const campaignIds = [
    '23893818404', // Anhänger Fahrschule Aargau
    '23888643015', // Anhänger Fahrschule Lachen
    '23893427204', // Anhänger Fahrschule Zürich
    '23865472770', // Fahrschule Lachen Umgebung
    '23868553846', // Fahrschule Zürich Umgebung
    '23898300631', // Lastwagen Fahrschule Lachen
  ]

  // Also query Google Ads to find any newer campaigns (Motorrad, VKU etc.)
  const queryRes = await fetch(`${ADS_BASE}/customers/${customerId}/googleAds:searchStream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: `SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.status != 'REMOVED'` }),
  })
  const queryText = await queryRes.text()
  let allCampaignIds = [...campaignIds]
  try {
    const queryData = JSON.parse(queryText)
    const rows = Array.isArray(queryData) ? queryData.flatMap((r: any) => r.results || []) : queryData.results || []
    for (const row of rows) {
      const id = String(row.campaign?.id ?? '')
      if (id && !allCampaignIds.includes(id)) {
        allCampaignIds.push(id)
        logger.info(`Found additional campaign: ${id} — ${row.campaign?.name}`)
      }
    }
  } catch { /* ignore parse errors, use known list */ }

  const results: any[] = []

  for (const campaignId of allCampaignIds) {
    const res = await fetch(`${ADS_BASE}/customers/${customerId}/campaigns:mutate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        operations: [{
          update: {
            resourceName: `customers/${customerId}/campaigns/${campaignId}`,
            targetSpend: {
              cpcBidCeilingMicros: 3_000_000, // CHF 3.00 max CPC
            },
          },
          updateMask: 'target_spend',
        }],
      }),
    })

    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { raw: text.slice(0, 300) } }

    results.push({
      campaign_id: campaignId,
      ok: res.ok,
      result: res.ok ? 'updated' : (data?.error?.details ?? data?.error?.message ?? data?.raw ?? 'error'),
    })
  }

  return { success: true, updated: results.filter(r => r.ok).length, results }
})
