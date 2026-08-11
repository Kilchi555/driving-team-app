import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTenantIdByGa4Property } from '~/server/utils/marketing-tenant'
import { logger } from '~/utils/logger'
import { readBody } from 'h3'

// Fetches GA4 data (sessions, users, conversions by channel + page)
// and upserts into marketing_ga4_daily. Runs daily at 04:00 via Vercel Cron.
// Default: last 7 days. Backfill via body: { startDate, endDate }.
// Paginates with offset — a single 5000-row page under-counted busy properties.
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
  let body: { startDate?: string; endDate?: string; days?: number } = {}
  try {
    body = (await readBody(event)) ?? {}
  } catch {
    body = {}
  }

  // Use explicit ISO dates as default — GA4 relative strings ('7daysAgo') can return
  // empty results when the cron fires with no POST body and the API treats the range
  // as ambiguous. Explicit dates are always reliable.
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const lookback = Math.min(Math.max(Number(body.days) || 7, 1), 90)
  const defaultStart = new Date()
  defaultStart.setDate(defaultStart.getDate() - lookback)

  const startDate = body.startDate ?? fmt(defaultStart)
  const endDate = body.endDate ?? fmt(yesterday)

  logger.info(`sync-marketing-ga4: starting sync from ${startDate} to ${endDate}`)

  // ============ LAYER 3: FETCH FROM GA4 (paginated) ============
  const analyticsClient = new BetaAnalyticsDataClient({
    credentials: { client_email: clientEmail, private_key: privateKey },
  })

  const property = propertyId.startsWith('properties/')
    ? propertyId
    : `properties/${propertyId}`

  const PAGE_SIZE = 10_000
  const allRows: any[] = []
  let offset = 0
  let pages = 0

  try {
    for (;;) {
      const [response] = await analyticsClient.runReport({
        property,
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
        limit: PAGE_SIZE,
        offset,
      })

      const rows = response.rows ?? []
      allRows.push(...rows)
      pages += 1

      if (rows.length < PAGE_SIZE) break
      offset += rows.length
      // Safety cap (~1M rows)
      if (offset >= 1_000_000) {
        logger.warn(`sync-marketing-ga4: hit safety cap at offset=${offset}`)
        break
      }
    }
  } catch (apiErr: any) {
    const detail = apiErr?.message ?? String(apiErr)
    logger.error('sync-marketing-ga4: GA4 API error', detail)
    throw createError({ statusCode: 502, statusMessage: `GA4 API error: ${detail}` })
  }

  logger.info(`sync-marketing-ga4: fetched ${allRows.length} rows from GA4 (${pages} pages)`)

  // ============ LAYER 4: UPSERT INTO SUPABASE ============
  const supabase = getSupabaseAdmin()
  const tenantId = await getTenantIdByGa4Property(propertyId)
  if (!tenantId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'sync-marketing-ga4: could not resolve tenant_id for GA4 property',
    })
  }

  const records = allRows.map((row) => {
    const [date, channel, pagePath] = (row.dimensionValues ?? []).map((d) => d.value ?? '')
    const [sessions, users, newUsers, pageViews, engagementRate, conversions] = (
      row.metricValues ?? []
    ).map((m) => m.value ?? '0')

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
    const batchSize = 1000
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const { error } = await supabase
        .from('marketing_ga4_daily')
        .upsert(batch, { onConflict: 'tenant_id,date,channel,page_path' })

      if (error) {
        logger.error('sync-marketing-ga4: upsert error', error)
        throw createError({ statusCode: 500, statusMessage: `DB upsert failed: ${error.message}` })
      }
    }
  }

  logger.info(`sync-marketing-ga4: upserted ${records.length} rows`)
  return {
    success: true,
    rows: records.length,
    pages,
    range: { from: startDate, to: endDate },
  }
})
