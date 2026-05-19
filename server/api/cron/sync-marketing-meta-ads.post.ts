import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

// Fetches the last 3 days of Meta Ads campaign performance via Graph API and upserts
// into marketing_meta_ads_daily. Runs daily at 04:20 via Vercel Cron.
export default defineEventHandler(async (event) => {
  // ============ LAYER 1: CRON AUTH ============
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // ============ LAYER 2: ENV CHECK ============
  const accessToken = process.env.META_ACCESS_TOKEN
  const adAccountId = process.env.META_AD_ACCOUNT_ID

  if (!accessToken || !adAccountId) {
    logger.warn('sync-marketing-meta-ads: missing credentials, skipping')
    return { success: false, reason: 'missing_credentials' }
  }

  logger.info('sync-marketing-meta-ads: starting sync for last 3 days')

  // ============ LAYER 3: FETCH FROM META GRAPH API ============
  const endDate = new Date()
  endDate.setDate(endDate.getDate() - 1)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 3)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const fields = [
    'campaign_id',
    'campaign_name',
    'spend',
    'impressions',
    'clicks',
    'reach',
    'actions',
    'date_start',
  ].join(',')

  const url = new URL(`https://graph.facebook.com/v19.0/${adAccountId}/insights`)
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('fields', fields)
  url.searchParams.set('level', 'campaign')
  url.searchParams.set('time_range', JSON.stringify({ since: fmt(startDate), until: fmt(endDate) }))
  url.searchParams.set('time_increment', '1')
  url.searchParams.set('limit', '200')

  const response = await fetch(url.toString())

  if (!response.ok) {
    const errorText = await response.text()
    logger.error('sync-marketing-meta-ads: Meta API error', errorText)
    throw createError({ statusCode: 502, statusMessage: `Meta API error: ${response.status}` })
  }

  const json = await response.json() as { data?: any[] }
  const apiData = json.data ?? []
  logger.info(`sync-marketing-meta-ads: fetched ${apiData.length} rows from Meta`)

  // ============ LAYER 4: UPSERT INTO SUPABASE ============
  const supabase = getSupabaseAdmin()

  const records = apiData.map((row: any) => ({
    date: row.date_start,
    campaign_id: String(row.campaign_id),
    campaign_name: row.campaign_name ?? '',
    spend: parseFloat(row.spend ?? '0'),
    impressions: parseInt(row.impressions ?? '0'),
    clicks: parseInt(row.clicks ?? '0'),
    reach: parseInt(row.reach ?? '0'),
    actions: row.actions ?? [],
  }))

  if (records.length > 0) {
    const { error } = await supabase
      .from('marketing_meta_ads_daily')
      .upsert(records, { onConflict: 'date,campaign_id' })

    if (error) {
      logger.error('sync-marketing-meta-ads: upsert error', error)
      throw createError({ statusCode: 500, statusMessage: `DB upsert failed: ${error.message}` })
    }
  }

  logger.info(`sync-marketing-meta-ads: upserted ${records.length} rows`)
  return { success: true, rows: records.length }
})
