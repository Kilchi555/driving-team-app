import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getValidAccessToken, resolveGbpLocation, type GbpLocationRow } from '~/server/utils/gbp'

const GBP_PERFORMANCE_BASE = 'https://businessprofileperformance.googleapis.com/v1'

/** Metrics we persist and surface in the admin UI. */
export const GBP_INSIGHT_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'CALL_CLICKS',
  'WEBSITE_CLICKS',
  'BUSINESS_DIRECTION_REQUESTS',
] as const

export type GbpInsightMetric = (typeof GBP_INSIGHT_METRICS)[number]

/** First sync window when no history exists yet (Google keeps ~18 months). */
const INITIAL_LOOKBACK_DAYS = 180
/** Overlap when refilling — Google can revise recent days. */
const REFILL_OVERLAP_DAYS = 2
/** Default UI aggregation window. */
export const GBP_INSIGHTS_DISPLAY_DAYS = 28

function formatDateUTC(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function parseGoogleDate(date: { year?: number; month?: number; day?: number } | undefined): string | null {
  if (!date?.year || !date?.month || !date?.day) return null
  const m = String(date.month).padStart(2, '0')
  const day = String(date.day).padStart(2, '0')
  return `${date.year}-${m}-${day}`
}

async function fetchGbpInsightsRange(
  accessToken: string,
  gbpLocationId: string,
  startDate: Date,
  endDate: Date
): Promise<any> {
  const params = new URLSearchParams()
  for (const m of GBP_INSIGHT_METRICS) params.append('dailyMetrics', m)
  params.set('dailyRange.start_date.year', String(startDate.getUTCFullYear()))
  params.set('dailyRange.start_date.month', String(startDate.getUTCMonth() + 1))
  params.set('dailyRange.start_date.day', String(startDate.getUTCDate()))
  params.set('dailyRange.end_date.year', String(endDate.getUTCFullYear()))
  params.set('dailyRange.end_date.month', String(endDate.getUTCMonth() + 1))
  params.set('dailyRange.end_date.day', String(endDate.getUTCDate()))

  const res = await fetch(
    `${GBP_PERFORMANCE_BASE}/${gbpLocationId}:fetchMultiDailyMetricsTimeSeries?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const text = await res.text()
  let data: any
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`GBP Insights API returned non-JSON (${res.status})`)
  }
  if (!res.ok) {
    throw new Error(data?.error?.message || `GBP Insights API error ${res.status}`)
  }
  return data
}

function flattenInsightRows(
  tenantId: string,
  locationId: string,
  apiPayload: any
): { tenant_id: string; location_id: string; metric_date: string; metric: string; value: number; updated_at: string }[] {
  const now = new Date().toISOString()
  const rows: { tenant_id: string; location_id: string; metric_date: string; metric: string; value: number; updated_at: string }[] = []
  const blocks = apiPayload?.multiDailyMetricTimeSeries ?? []

  for (const block of blocks) {
    for (const series of block.dailyMetricTimeSeries ?? []) {
      const metric = series.dailyMetric as string | undefined
      if (!metric || !(GBP_INSIGHT_METRICS as readonly string[]).includes(metric)) continue
      for (const point of series.timeSeries?.datedValues ?? []) {
        const metricDate = parseGoogleDate(point.date)
        if (!metricDate) continue
        rows.push({
          tenant_id: tenantId,
          location_id: locationId,
          metric_date: metricDate,
          metric,
          value: parseInt(point.value, 10) || 0,
          updated_at: now,
        })
      }
    }
  }
  return rows
}

async function getLastStoredDate(locationId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('gbp_insights_daily')
    .select('metric_date')
    .eq('location_id', locationId)
    .order('metric_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to read GBP insights history: ${error.message}`)
  return data?.metric_date ?? null
}

/**
 * Fetch from Google since last stored day (or initial lookback) and upsert into DB.
 * Returns sync metadata; does not itself return display totals.
 */
export async function syncGbpInsights(
  tenantId: string,
  locationId?: string | null
): Promise<{
  location: GbpLocationRow
  syncedFrom: string
  syncedTo: string
  rowsUpserted: number
  lastSyncedAt: string
}> {
  const loc = await resolveGbpLocation(tenantId, locationId)
  const supabase = getSupabaseAdmin()

  // Legacy connection-only rows are not in gbp_locations — cannot historize.
  const { data: realLoc } = await supabase
    .from('gbp_locations')
    .select('id')
    .eq('id', loc.id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!realLoc) {
    throw new Error('Standort muss in gbp_locations verknüpft sein, bevor Insights gespeichert werden')
  }

  const today = startOfUtcDay()
  const lastStored = await getLastStoredDate(loc.id)

  let start: Date
  if (lastStored) {
    start = addUtcDays(new Date(`${lastStored}T00:00:00.000Z`), -REFILL_OVERLAP_DAYS)
  } else {
    start = addUtcDays(today, -INITIAL_LOOKBACK_DAYS)
  }

  if (start > today) start = today

  const accessToken = await getValidAccessToken(tenantId)
  const apiPayload = await fetchGbpInsightsRange(accessToken, loc.gbp_location_id, start, today)
  const rows = flattenInsightRows(tenantId, loc.id, apiPayload)

  if (rows.length > 0) {
    // Upsert in chunks to stay under payload limits
    const chunkSize = 500
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      const { error } = await supabase
        .from('gbp_insights_daily')
        .upsert(chunk, { onConflict: 'location_id,metric_date,metric' })
      if (error) throw new Error(`Failed to save GBP insights: ${error.message}`)
    }
  }

  const lastSyncedAt = new Date().toISOString()
  return {
    location: loc,
    syncedFrom: formatDateUTC(start),
    syncedTo: formatDateUTC(today),
    rowsUpserted: rows.length,
    lastSyncedAt,
  }
}

export type GbpInsightsSnapshot = {
  locationId: string
  displayDays: number
  displayFrom: string
  displayTo: string
  historyFrom: string | null
  historyTo: string | null
  lastSyncedAt: string | null
  totals: Record<GbpInsightMetric, number>
  synced: {
    from: string
    to: string
    rowsUpserted: number
  }
}

/**
 * Sync (refill) then load aggregated totals for the display window from DB.
 */
export async function getGbpInsightsSnapshot(
  tenantId: string,
  locationId?: string | null,
  displayDays = GBP_INSIGHTS_DISPLAY_DAYS
): Promise<GbpInsightsSnapshot> {
  const sync = await syncGbpInsights(tenantId, locationId)
  const loc = sync.location
  const supabase = getSupabaseAdmin()

  const today = startOfUtcDay()
  const displayFrom = addUtcDays(today, -(displayDays - 1))
  const displayFromStr = formatDateUTC(displayFrom)
  const displayToStr = formatDateUTC(today)

  const { data: rows, error } = await supabase
    .from('gbp_insights_daily')
    .select('metric, value, metric_date, updated_at')
    .eq('tenant_id', tenantId)
    .eq('location_id', loc.id)
    .gte('metric_date', displayFromStr)
    .lte('metric_date', displayToStr)

  if (error) throw new Error(`Failed to load GBP insights: ${error.message}`)

  const totals = Object.fromEntries(GBP_INSIGHT_METRICS.map((m) => [m, 0])) as Record<GbpInsightMetric, number>
  let lastSyncedAt: string | null = sync.lastSyncedAt
  for (const row of rows ?? []) {
    if ((GBP_INSIGHT_METRICS as readonly string[]).includes(row.metric)) {
      totals[row.metric as GbpInsightMetric] += row.value || 0
    }
    if (row.updated_at && (!lastSyncedAt || row.updated_at > lastSyncedAt)) {
      lastSyncedAt = row.updated_at
    }
  }

  const { data: bounds } = await supabase
    .from('gbp_insights_daily')
    .select('metric_date')
    .eq('location_id', loc.id)
    .order('metric_date', { ascending: true })
    .limit(1)

  const { data: boundsEnd } = await supabase
    .from('gbp_insights_daily')
    .select('metric_date')
    .eq('location_id', loc.id)
    .order('metric_date', { ascending: false })
    .limit(1)

  return {
    locationId: loc.id,
    displayDays,
    displayFrom: displayFromStr,
    displayTo: displayToStr,
    historyFrom: bounds?.[0]?.metric_date ?? null,
    historyTo: boundsEnd?.[0]?.metric_date ?? null,
    lastSyncedAt,
    totals,
    synced: {
      from: sync.syncedFrom,
      to: sync.syncedTo,
      rowsUpserted: sync.rowsUpserted,
    },
  }
}
