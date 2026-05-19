import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

// Fetches the last 7 days of Google Ads campaign performance via REST API
// and upserts into marketing_google_ads_daily. Runs daily at 04:10 via Vercel Cron.
export default defineEventHandler(async (event) => {
  // ============ LAYER 1: CRON AUTH ============
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // ============ LAYER 2: ENV CHECK ============
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID
  const managerCustomerId = '9509957201'

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    logger.warn('sync-marketing-google-ads: missing credentials, skipping')
    return { success: false, reason: 'missing_credentials' }
  }

  logger.info('sync-marketing-google-ads: starting sync')

  try {
    // ============ LAYER 3: GET ACCESS TOKEN ============
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
    const accessToken = tokenData.access_token

    // ============ LAYER 4: QUERY GOOGLE ADS REST API ============
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        segments.date,
        metrics.cost_micros,
        metrics.clicks,
        metrics.impressions,
        metrics.conversions,
        metrics.average_cpc
      FROM campaign
      WHERE segments.date DURING LAST_7_DAYS
        AND campaign.status != 'REMOVED'
      ORDER BY segments.date DESC
    `

    const adsRes = await fetch(
      `https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'login-customer-id': managerCustomerId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      }
    )

    const adsRawText = await adsRes.text()
    let adsData: any
    try {
      adsData = JSON.parse(adsRawText)
    } catch {
      return { success: false, reason: 'ads_api_non_json', status: adsRes.status, body: adsRawText.substring(0, 500) }
    }

    if (!adsRes.ok) {
      logger.error('sync-marketing-google-ads: API error', adsData)
      return { success: false, reason: 'ads_api_error', status: adsRes.status, detail: adsData }
    }

    const apiRows: any[] = adsData.results ?? []
    logger.info(`sync-marketing-google-ads: fetched ${apiRows.length} rows`)

    // ============ LAYER 5: UPSERT INTO SUPABASE ============
    const supabase = getSupabaseAdmin()

    const records = apiRows.map((row: any) => ({
      date: row.segments?.date ?? '',
      campaign_id: String(row.campaign?.id ?? ''),
      campaign_name: row.campaign?.name ?? '',
      cost_micros: row.metrics?.costMicros ?? 0,
      clicks: row.metrics?.clicks ?? 0,
      impressions: row.metrics?.impressions ?? 0,
      conversions: row.metrics?.conversions ?? 0,
      cpc_micros: row.metrics?.averageCpc ?? 0,
    })).filter(r => r.date && r.campaign_id)

    if (records.length > 0) {
      const { error } = await supabase
        .from('marketing_google_ads_daily')
        .upsert(records, { onConflict: 'date,campaign_id' })

      if (error) {
        logger.error('sync-marketing-google-ads: upsert error', error)
        return { success: false, reason: 'db_upsert_error', detail: error.message }
      }
    }

    logger.info(`sync-marketing-google-ads: upserted ${records.length} rows`)
    return { success: true, rows: records.length }
  } catch (err: any) {
    const detail = err?.message ?? String(err)
    logger.error('sync-marketing-google-ads: unexpected error', detail)
    return { success: false, reason: 'unexpected_error', detail }
  }
})
