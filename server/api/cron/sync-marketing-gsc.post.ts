import { google } from 'googleapis'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

// Fetches Search Console data and upserts into marketing_gsc_daily.
// Runs daily at 04:00 via Vercel Cron (last 5 days).
// Supports full backfill via body: { startDate: '2025-01-01' } or { days: 90 }.
// GSC API supports up to ~16 months of history.
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

  // ============ LAYER 3: RESOLVE DATE RANGE ============
  // Body options:
  //   { days: 30 }              → last N days (max 500 for backfill)
  //   { startDate: '2025-01-01' } → from that date until 2 days ago
  //   (empty)                   → last 5 days (daily cron default)
  const body = await readBody(event).catch(() => ({}))
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const rangeEnd = new Date()
  rangeEnd.setDate(rangeEnd.getDate() - 2) // GSC data has ~2 day lag

  let rangeStart: Date
  if (body?.startDate) {
    rangeStart = new Date(body.startDate)
  } else {
    const lookbackDays = Math.min(Number(body?.days) || 5, 500)
    rangeStart = new Date()
    rangeStart.setDate(rangeStart.getDate() - lookbackDays)
  }

  // GSC API max history: ~500 days (16 months)
  const maxStart = new Date()
  maxStart.setDate(maxStart.getDate() - 500)
  if (rangeStart < maxStart) rangeStart = maxStart

  logger.info(`sync-marketing-gsc: syncing ${fmt(rangeStart)} → ${fmt(rangeEnd)}`)

  // ============ LAYER 4: FETCH IN MONTHLY CHUNKS ============
  // Large ranges are split into 30-day chunks to stay within rowLimit safely.
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const searchConsole = google.searchconsole({ version: 'v1', auth: oauth2Client })

  const allRows: any[] = []
  let chunkStart = new Date(rangeStart)

  while (chunkStart <= rangeEnd) {
    const chunkEnd = new Date(chunkStart)
    chunkEnd.setDate(chunkEnd.getDate() + 29) // 30-day window
    if (chunkEnd > rangeEnd) chunkEnd.setTime(rangeEnd.getTime())

    try {
      const res = await searchConsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: fmt(chunkStart),
          endDate: fmt(chunkEnd),
          dimensions: ['date', 'query', 'page'],
          rowLimit: 5000,
          type: 'web',
        },
      })
      const rows = res.data.rows ?? []
      allRows.push(...rows)
      logger.info(`sync-marketing-gsc: chunk ${fmt(chunkStart)}→${fmt(chunkEnd)}: ${rows.length} rows`)
    } catch (gscErr: any) {
      const detail = gscErr?.response?.data ?? gscErr?.message ?? String(gscErr)
      logger.error(`sync-marketing-gsc: chunk ${fmt(chunkStart)} error`, detail)
      return { success: false, reason: 'gsc_api_error', chunk: fmt(chunkStart), detail }
    }

    chunkStart.setDate(chunkStart.getDate() + 30)
  }

  logger.info(`sync-marketing-gsc: total fetched ${allRows.length} rows`)

  // ============ LAYER 5: UPSERT INTO SUPABASE ============
  const supabase = getSupabaseAdmin()

  const records = allRows.map((row) => {
    const [date, query, page] = row.keys ?? []
    return {
      tenant_id: process.env.MARKETING_TENANT_ID ?? null,
      date: date ?? fmt(rangeEnd),
      query: query ?? '',
      page: page ?? '/',
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }
  })

  if (records.length > 0) {
    // Upsert in batches of 1000 to avoid payload limits
    const batchSize = 1000
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      const { error } = await supabase
        .from('marketing_gsc_daily')
        .upsert(batch, { onConflict: 'tenant_id,date,query,page' })

      if (error) {
        logger.error('sync-marketing-gsc: upsert error', error)
        throw createError({ statusCode: 500, statusMessage: `DB upsert failed: ${error.message}` })
      }
    }
  }

  logger.info(`sync-marketing-gsc: upserted ${records.length} rows`)
  return {
    success: true,
    rows: records.length,
    range: { from: fmt(rangeStart), to: fmt(rangeEnd) },
  }
})
