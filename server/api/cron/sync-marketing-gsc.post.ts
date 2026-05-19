import { google } from 'googleapis'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

// Fetches the top 100 Search Console queries for the last 3 days and upserts
// into marketing_gsc_daily. Runs daily at 04:00 via Vercel Cron.
// Note: Search Console data has a ~2-day delay, so yesterday's data may be incomplete.
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
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL

  if (!clientEmail || !privateKey || !siteUrl) {
    logger.warn('sync-marketing-gsc: missing credentials, skipping')
    return { success: false, reason: 'missing_credentials' }
  }

  logger.info('sync-marketing-gsc: starting sync for last 3 days')

  // ============ LAYER 3: FETCH FROM SEARCH CONSOLE ============
  const auth = new google.auth.JWT(clientEmail, undefined, privateKey, [
    'https://www.googleapis.com/auth/webmasters.readonly',
  ])

  const searchConsole = google.searchconsole({ version: 'v1', auth })

  // Build date range: 5 days ago to 2 days ago (GSC has ~2-day delay)
  const endDate = new Date()
  endDate.setDate(endDate.getDate() - 2)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 5)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const { data } = await searchConsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions: ['date', 'query', 'page'],
      rowLimit: 100,
      type: 'web',
    },
  })

  const apiRows = data.rows ?? []
  logger.info(`sync-marketing-gsc: fetched ${apiRows.length} rows from Search Console`)

  // ============ LAYER 4: UPSERT INTO SUPABASE ============
  const supabase = getSupabaseAdmin()

  const records = apiRows.map((row) => {
    const [date, query, page] = row.keys ?? []
    return {
      date: date ?? fmt(endDate),
      query: query ?? '',
      page: page ?? '/',
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }
  })

  if (records.length > 0) {
    const { error } = await supabase
      .from('marketing_gsc_daily')
      .upsert(records, { onConflict: 'date,query,page' })

    if (error) {
      logger.error('sync-marketing-gsc: upsert error', error)
      throw createError({ statusCode: 500, statusMessage: `DB upsert failed: ${error.message}` })
    }
  }

  logger.info(`sync-marketing-gsc: upserted ${records.length} rows`)
  return { success: true, rows: records.length }
})
