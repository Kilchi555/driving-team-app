import { google } from 'googleapis'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

// Fetches the top 100 Search Console queries for the last 3 days and upserts
// into marketing_gsc_daily. Runs daily at 04:00 via Vercel Cron.
// Auth: uses OAuth2 refresh token (GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN).
export default defineEventHandler(async (event) => {
  // ============ LAYER 1: CRON AUTH ============
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // ============ LAYER 2: ENV CHECK ============
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL

  if (!clientId || !clientSecret || !refreshToken || !siteUrl) {
    logger.warn('sync-marketing-gsc: missing credentials, skipping')
    return { success: false, reason: 'missing_credentials', present: { clientId: !!clientId, clientSecret: !!clientSecret, refreshToken: !!refreshToken, siteUrl: !!siteUrl } }
  }

  // Optional body: { days: 30 } to backfill more history
  const body = await readBody(event).catch(() => ({}))
  const lookbackDays = Math.min(Number(body?.days) || 5, 90)

  logger.info(`sync-marketing-gsc: starting sync for last ${lookbackDays} days`)

  // ============ LAYER 3: FETCH FROM SEARCH CONSOLE ============
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const searchConsole = google.searchconsole({ version: 'v1', auth: oauth2Client })

  const endDate = new Date()
  endDate.setDate(endDate.getDate() - 2)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - lookbackDays)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  let apiRows: any[] = []
  try {
    const res = await searchConsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ['date', 'query', 'page'],
        rowLimit: 1000,
        type: 'web',
      },
    })
    apiRows = res.data.rows ?? []
  } catch (gscErr: any) {
    const detail = gscErr?.response?.data ?? gscErr?.message ?? String(gscErr)
    logger.error('sync-marketing-gsc: Google API error', detail)
    return { success: false, reason: 'gsc_api_error', detail }
  }

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
