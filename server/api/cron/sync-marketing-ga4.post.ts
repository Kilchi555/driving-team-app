import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTenantIdByGa4Property } from '~/server/utils/marketing-tenant'
import { logger } from '~/utils/logger'
import { readBody } from 'h3'

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

  // Optional body params for manual backfills: { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
  let body: { startDate?: string; endDate?: string } = {}
  try { body = await readBody(event) ?? {} } catch { body = {} }

  // Use explicit ISO dates as default — GA4 relative strings ('7daysAgo') can return
  // empty results when the cron fires with no POST body and the API treats the range
  // as ambiguous. Explicit dates are always reliable.
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const startDate = body.startDate ?? fmt(sevenDaysAgo)
  const endDate   = body.endDate   ?? fmt(yesterday)

  logger.info(`sync-marketing-ga4: starting sync from ${startDate} to ${endDate}`)

  // ============ LAYER 3: FETCH FROM GA4 ============
  const analyticsClient = new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  })

  let response: Awaited<ReturnType<typeof analyticsClient.runReport>>[0]
  try {
    ;[response] = await analyticsClient.runReport({
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
      dateRanges: [{ startDate, endDate }],
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: true }],
      limit: 5000,
    })
  } catch (apiErr: any) {
    const detail = apiErr?.message ?? String(apiErr)
    logger.error('sync-marketing-ga4: GA4 API error', detail)
    throw createError({ statusCode: 502, statusMessage: `GA4 API error: ${detail}` })
  }

  const rows = response.rows ?? []
  logger.info(`sync-marketing-ga4: fetched ${rows.length} rows from GA4`)

  // ============ LAYER 4: UPSERT INTO SUPABASE ============
  const supabase = getSupabaseAdmin()
  const tenantId = await getTenantIdByGa4Property(propertyId)

  const records = rows.map((row) => {
    const [date, channel, pagePath] = (row.dimensionValues ?? []).map((d) => d.value ?? '')
    const [sessions, users, newUsers, pageViews, engagementRate, conversions] = (row.metricValues ?? []).map((m) => m.value ?? '0')

    // GA4 date format: YYYYMMDD → YYYY-MM-DD
    const dateFormatted = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`

    return {
      tenant_id: tenantId,
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
      .upsert(records, { onConflict: 'tenant_id,date,channel,page_path' })

    if (error) {
      logger.error('sync-marketing-ga4: upsert error', error)
      throw createError({ statusCode: 500, statusMessage: `DB upsert failed: ${error.message}` })
    }
  }

  logger.info(`sync-marketing-ga4: upserted ${records.length} rows`)
  return { success: true, rows: records.length }
})
