import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

// Fetches the last 3 days of GA4 data (sessions, users, conversions by channel + page)
// and upserts into marketing_ga4_daily. Runs daily at 04:00 via Vercel Cron.
export default defineEventHandler(async (event) => {
  // ============ LAYER 1: CRON AUTH ============
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // ============ LAYER 2: ENV CHECK ============
  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID

  if (!clientEmail || !privateKey || !propertyId) {
    logger.warn('sync-marketing-ga4: missing credentials, skipping')
    return { success: false, reason: 'missing_credentials' }
  }

  logger.info('sync-marketing-ga4: starting sync for last 3 days')

  // ============ LAYER 3: FETCH FROM GA4 ============
  const analyticsClient = new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  })

  const [response] = await analyticsClient.runReport({
    property: propertyId,
    dimensions: [
      { name: 'date' },
      { name: 'sessionDefaultChannelGrouping' },
      { name: 'pagePath' },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'engagementRate' },
      { name: 'conversions' },
    ],
    dateRanges: [{ startDate: '3daysAgo', endDate: 'yesterday' }],
    orderBys: [{ dimension: { dimensionName: 'date' }, desc: true }],
    limit: 5000,
  })

  const rows = response.rows ?? []
  logger.info(`sync-marketing-ga4: fetched ${rows.length} rows from GA4`)

  // ============ LAYER 4: UPSERT INTO SUPABASE ============
  const supabase = getSupabaseAdmin()

  const records = rows.map((row) => {
    const [date, channel, pagePath] = (row.dimensionValues ?? []).map((d) => d.value ?? '')
    const [sessions, users, newUsers, pageViews, engagementRate, conversions] = (row.metricValues ?? []).map((m) => m.value ?? '0')

    // GA4 date format: YYYYMMDD → YYYY-MM-DD
    const dateFormatted = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`

    return {
      date: dateFormatted,
      channel: channel || 'unknown',
      page_path: pagePath || '/',
      sessions: parseInt(sessions),
      users: parseInt(users),
      new_users: parseInt(newUsers),
      page_views: parseInt(pageViews),
      engagement_rate: parseFloat(engagementRate),
      conversions: parseInt(conversions),
    }
  })

  if (records.length > 0) {
    const { error } = await supabase
      .from('marketing_ga4_daily')
      .upsert(records, { onConflict: 'date,channel,page_path' })

    if (error) {
      logger.error('sync-marketing-ga4: upsert error', error)
      throw createError({ statusCode: 500, statusMessage: `DB upsert failed: ${error.message}` })
    }
  }

  logger.info(`sync-marketing-ga4: upserted ${records.length} rows`)
  return { success: true, rows: records.length }
})
