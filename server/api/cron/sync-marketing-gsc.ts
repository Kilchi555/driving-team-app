import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getTenantIdByGscSite } from '~/server/utils/marketing-tenant'
import { assertCronRequest } from '~/server/utils/cron-auth'
import { logger } from '~/utils/logger'

export const maxDuration = 120

type GscSearchAnalyticsRow = {
  keys?: string[]
  clicks?: number
  impressions?: number
  ctr?: number
  position?: number
}

async function getGscAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
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
  const tokenData = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string }
  if (!tokenData.access_token) {
    throw Object.assign(new Error('gsc_token_error'), { detail: tokenData })
  }
  return tokenData.access_token
}

async function queryGscSearchAnalytics(opts: {
  accessToken: string
  siteUrl: string
  startDate: string
  endDate: string
  startRow: number
  rowLimit: number
}): Promise<GscSearchAnalyticsRow[]> {
  // Search Console Search Analytics (Webmasters API v3) — same endpoint googleapis searchconsole used.
  const url =
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(opts.siteUrl)}/searchAnalytics/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startDate: opts.startDate,
      endDate: opts.endDate,
      dimensions: ['date', 'query', 'page'],
      rowLimit: opts.rowLimit,
      startRow: opts.startRow,
      type: 'web',
    }),
  })
  const rawText = await res.text()
  let data: { rows?: GscSearchAnalyticsRow[]; error?: unknown }
  try {
    data = JSON.parse(rawText) as { rows?: GscSearchAnalyticsRow[]; error?: unknown }
  } catch {
    throw Object.assign(new Error('gsc_api_non_json'), {
      response: { data: { status: res.status, body: rawText.substring(0, 500) } },
    })
  }
  if (!res.ok) {
    throw Object.assign(new Error('gsc_api_error'), {
      response: { data: data.error ?? data },
      message: typeof data.error === 'object' ? JSON.stringify(data.error) : rawText.substring(0, 500),
    })
  }
  return data.rows ?? []
}

// Fetches Search Console data and upserts into marketing_gsc_daily.
// Runs daily at 04:00 via Vercel Cron (last 5 days).
// Supports full backfill via body: { startDate: '2025-01-01' } or { days: 90 }.
// GSC API supports up to ~16 months of history.
// Auth: uses OAuth2 refresh token (GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN).
//
// Pagination: date+query+page easily exceeds a single page. We:
//   1) use 7-day chunks (not 30)
//   2) paginate with startRow up to GSC max rowLimit (25000)
export default defineEventHandler(async (event) => {
  assertCronRequest(event)

  // ============ LAYER 2: ENV CHECK ============
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL

  if (!clientId || !clientSecret || !refreshToken || !siteUrl) {
    logger.warn('sync-marketing-gsc: missing credentials, skipping')
    return {
      success: false,
      reason: 'missing_credentials',
      present: {
        clientId: !!clientId,
        clientSecret: !!clientSecret,
        refreshToken: !!refreshToken,
        siteUrl: !!siteUrl,
      },
    }
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

  // ============ LAYER 4: FETCH WITH PAGINATION ============
  let accessToken: string
  try {
    accessToken = await getGscAccessToken(clientId, clientSecret, refreshToken)
  } catch (tokenErr: any) {
    const detail = tokenErr?.detail ?? tokenErr?.message ?? String(tokenErr)
    logger.error('sync-marketing-gsc: token error', detail)
    return { success: false, reason: 'token_error', detail }
  }

  const PAGE_SIZE = 25_000 // GSC Search Analytics max
  const CHUNK_DAYS = 7
  const allRows: GscSearchAnalyticsRow[] = []
  let chunkStart = new Date(rangeStart)
  let pagesFetched = 0
  let truncatedChunks = 0

  while (chunkStart <= rangeEnd) {
    const chunkEnd = new Date(chunkStart)
    chunkEnd.setDate(chunkEnd.getDate() + (CHUNK_DAYS - 1))
    if (chunkEnd > rangeEnd) chunkEnd.setTime(rangeEnd.getTime())

    const chunkLabel = `${fmt(chunkStart)}→${fmt(chunkEnd)}`
    let startRow = 0
    let chunkRows = 0

    try {
      // Paginate until a short page — never stop at the first 5k/25k page.
      for (;;) {
        const rows = await queryGscSearchAnalytics({
          accessToken,
          siteUrl,
          startDate: fmt(chunkStart),
          endDate: fmt(chunkEnd),
          startRow,
          rowLimit: PAGE_SIZE,
        })
        allRows.push(...rows)
        chunkRows += rows.length
        pagesFetched += 1

        if (rows.length < PAGE_SIZE) break
        startRow += rows.length
        // Safety: avoid infinite loop if API keeps returning full pages
        if (startRow >= 250_000) {
          truncatedChunks += 1
          logger.warn(`sync-marketing-gsc: chunk ${chunkLabel} hit safety cap at startRow=${startRow}`)
          break
        }
      }
      logger.info(`sync-marketing-gsc: chunk ${chunkLabel}: ${chunkRows} rows`)
    } catch (gscErr: any) {
      const detail = gscErr?.response?.data ?? gscErr?.message ?? String(gscErr)
      logger.error(`sync-marketing-gsc: chunk ${fmt(chunkStart)} error`, detail)
      return { success: false, reason: 'gsc_api_error', chunk: fmt(chunkStart), detail }
    }

    chunkStart.setDate(chunkStart.getDate() + CHUNK_DAYS)
  }

  logger.info(`sync-marketing-gsc: total fetched ${allRows.length} rows (${pagesFetched} pages)`)

  // ============ LAYER 5: UPSERT INTO SUPABASE ============
  const supabase = getSupabaseAdmin()
  const tenantId = await getTenantIdByGscSite(siteUrl)
  if (!tenantId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'sync-marketing-gsc: could not resolve tenant_id for GSC site',
    })
  }

  const records = allRows.map((row) => {
    const [date, query, page] = row.keys ?? []
    return {
      tenant_id: tenantId,
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
    pages: pagesFetched,
    truncatedChunks,
    range: { from: fmt(rangeStart), to: fmt(rangeEnd) },
  }
})
