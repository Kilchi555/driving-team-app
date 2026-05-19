import { GoogleAdsApi } from 'google-ads-api'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

// Fetches the last 3 days of Google Ads campaign performance and upserts
// into marketing_google_ads_daily. Runs daily at 04:10 via Vercel Cron.
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

  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    logger.warn('sync-marketing-google-ads: missing credentials, skipping')
    return { success: false, reason: 'missing_credentials' }
  }

  logger.info('sync-marketing-google-ads: starting sync for last 3 days')

  // ============ LAYER 3: FETCH FROM GOOGLE ADS ============
  const client = new GoogleAdsApi({
    client_id: clientId,
    client_secret: clientSecret,
    developer_token: developerToken,
  })

  const customer = client.Customer({
    customer_id: customerId,
    refresh_token: refreshToken,
  })

  let data: any[] = []
  try {
    const result = await customer.query(`
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
    `)
    data = result as any[]
  } catch (adsErr: any) {
    const detail = adsErr?.errors ?? adsErr?.message ?? String(adsErr)
    logger.error('sync-marketing-google-ads: API error', detail)
    return { success: false, reason: 'ads_api_error', detail }
  }

  logger.info(`sync-marketing-google-ads: fetched ${data.length} rows from Google Ads`)

  // ============ LAYER 4: UPSERT INTO SUPABASE ============
  const supabase = getSupabaseAdmin()

  const records = (data as any[]).map((row: any) => ({
    date: row.segments.date,
    campaign_id: String(row.campaign.id),
    campaign_name: row.campaign.name ?? '',
    cost_micros: row.metrics.cost_micros ?? 0,
    clicks: row.metrics.clicks ?? 0,
    impressions: row.metrics.impressions ?? 0,
    conversions: row.metrics.conversions ?? 0,
    cpc_micros: row.metrics.average_cpc ?? 0,
  }))

  if (records.length > 0) {
    const { error } = await supabase
      .from('marketing_google_ads_daily')
      .upsert(records, { onConflict: 'date,campaign_id' })

    if (error) {
      logger.error('sync-marketing-google-ads: upsert error', error)
      throw createError({ statusCode: 500, statusMessage: `DB upsert failed: ${error.message}` })
    }
  }

  logger.info(`sync-marketing-google-ads: upserted ${records.length} rows`)
  return { success: true, rows: records.length }
})
