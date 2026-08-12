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

/** First sync / backfill window — Google retains ~18 months of daily metrics. */
const INITIAL_LOOKBACK_DAYS = 400
/** Overlap when refilling — Google can revise recent days. */
const REFILL_OVERLAP_DAYS = 2
/** Default UI aggregation window (cards). */
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

function emptyTotals(): Record<GbpInsightMetric, number> {
  return Object.fromEntries(GBP_INSIGHT_METRICS.map((m) => [m, 0])) as Record<GbpInsightMetric, number>
}

function trendPct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 100)
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

async function getFirstStoredDate(locationId: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('gbp_insights_daily')
    .select('metric_date')
    .eq('location_id', locationId)
    .order('metric_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to read GBP insights history: ${error.message}`)
  return data?.metric_date ?? null
}

async function upsertInsightRows(
  rows: { tenant_id: string; location_id: string; metric_date: string; metric: string; value: number; updated_at: string }[]
): Promise<number> {
  if (!rows.length) return 0
  const supabase = getSupabaseAdmin()
  const chunkSize = 500
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const { error } = await supabase
      .from('gbp_insights_daily')
      .upsert(chunk, { onConflict: 'location_id,metric_date,metric' })
    if (error) throw new Error(`Failed to save GBP insights: ${error.message}`)
  }
  return rows.length
}

/**
 * Fetch from Google since last stored day (or initial lookback) and upsert into DB.
 * Also backfills older history when stored range is shorter than INITIAL_LOOKBACK_DAYS.
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
  const desiredStart = addUtcDays(today, -INITIAL_LOOKBACK_DAYS)
  const lastStored = await getLastStoredDate(loc.id)
  const firstStored = await getFirstStoredDate(loc.id)
  const accessToken = await getValidAccessToken(tenantId)

  let rowsUpserted = 0
  let syncedFrom = formatDateUTC(desiredStart)

  // Backfill older gap once (e.g. after raising lookback from 180 → 400 days)
  const needsBackfill = !firstStored || firstStored > formatDateUTC(desiredStart)
  if (needsBackfill) {
    const backfillEnd = firstStored
      ? addUtcDays(new Date(`${firstStored}T00:00:00.000Z`), -1)
      : today
    if (desiredStart <= backfillEnd) {
      const apiPayload = await fetchGbpInsightsRange(accessToken, loc.gbp_location_id, desiredStart, backfillEnd)
      rowsUpserted += await upsertInsightRows(flattenInsightRows(tenantId, loc.id, apiPayload))
      syncedFrom = formatDateUTC(desiredStart)
    }
  }

  // Incremental refill of recent days
  let recentStart: Date
  if (lastStored) {
    recentStart = addUtcDays(new Date(`${lastStored}T00:00:00.000Z`), -REFILL_OVERLAP_DAYS)
  } else {
    recentStart = desiredStart
  }
  if (recentStart > today) recentStart = today

  // Skip duplicate full-range fetch when we just backfilled through today (no prior history)
  const skipRecent = !lastStored && needsBackfill && !firstStored
  if (!skipRecent) {
    const apiPayload = await fetchGbpInsightsRange(accessToken, loc.gbp_location_id, recentStart, today)
    rowsUpserted += await upsertInsightRows(flattenInsightRows(tenantId, loc.id, apiPayload))
    if (!needsBackfill || recentStart < new Date(`${syncedFrom}T00:00:00.000Z`)) {
      syncedFrom = formatDateUTC(recentStart)
    }
  }

  const lastSyncedAt = new Date().toISOString()
  return {
    location: loc,
    syncedFrom,
    syncedTo: formatDateUTC(today),
    rowsUpserted,
    lastSyncedAt,
  }
}

export type GbpActivityCounts = {
  posts: number
  photos: number
  reviewReplies: number
}

export type GbpInsightPeriodTotals = {
  days: number
  from: string
  to: string
  totals: Record<GbpInsightMetric, number>
  /** Same-length window immediately before `from`. */
  previousTotals: Record<GbpInsightMetric, number>
  /** Combined Maps impressions trend vs previous window. */
  impressionsTrendPct: number | null
  websiteTrendPct: number | null
  callsTrendPct: number | null
  directionsTrendPct: number | null
  activity: GbpActivityCounts
  previousActivity: GbpActivityCounts
  postsTrendPct: number | null
  photosTrendPct: number | null
  reviewRepliesTrendPct: number | null
}

export type GbpInsightMonthBucket = {
  /** YYYY-MM */
  month: string
  label: string
  impressions: number
  websiteClicks: number
  callClicks: number
  directionRequests: number
  posts: number
  photos: number
  reviewReplies: number
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
  period3m: GbpInsightPeriodTotals
  period12m: GbpInsightPeriodTotals
  /** Monthly buckets for the last 12 calendar months (oldest → newest). */
  monthly: GbpInsightMonthBucket[]
  synced: {
    from: string
    to: string
    rowsUpserted: number
  }
}

function sumImpressions(t: Record<GbpInsightMetric, number>): number {
  return (t.BUSINESS_IMPRESSIONS_MOBILE_MAPS || 0) + (t.BUSINESS_IMPRESSIONS_DESKTOP_MAPS || 0)
}

function emptyActivity(): GbpActivityCounts {
  return { posts: 0, photos: 0, reviewReplies: 0 }
}

function dayBoundsIso(fromYmd: string, toYmd: string): { fromTs: string; toTs: string } {
  return {
    fromTs: `${fromYmd}T00:00:00.000Z`,
    toTs: `${toYmd}T23:59:59.999Z`,
  }
}

async function countActivityInRange(
  tenantId: string,
  locationId: string,
  fromYmd: string,
  toYmd: string
): Promise<GbpActivityCounts> {
  const supabase = getSupabaseAdmin()
  const { fromTs, toTs } = dayBoundsIso(fromYmd, toYmd)

  const [postsRes, photosRes, reviewsRes] = await Promise.all([
    supabase
      .from('gbp_scheduled_posts')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId)
      .eq('status', 'published')
      .gte('published_at', fromTs)
      .lte('published_at', toTs),
    supabase
      .from('gbp_media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId)
      .gte('last_published_at', fromTs)
      .lte('last_published_at', toTs),
    supabase
      .from('gbp_review_actions')
      .select('published_at, updated_at')
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId)
      .eq('status', 'published'),
  ])

  const reviewReplies = (reviewsRes.data ?? []).filter((row) => {
    const ts = row.published_at || row.updated_at
    return !!ts && ts >= fromTs && ts <= toTs
  }).length

  return {
    posts: postsRes.count ?? 0,
    photos: photosRes.count ?? 0,
    reviewReplies,
  }
}

async function loadMonthlyActivity(
  tenantId: string,
  locationId: string,
  fromYmd: string,
  toYmd: string
): Promise<Map<string, GbpActivityCounts>> {
  const supabase = getSupabaseAdmin()
  const { fromTs, toTs } = dayBoundsIso(fromYmd, toYmd)
  const map = new Map<string, GbpActivityCounts>()

  const ensure = (month: string) => {
    if (!map.has(month)) map.set(month, emptyActivity())
    return map.get(month)!
  }

  const [posts, photos, reviews] = await Promise.all([
    supabase
      .from('gbp_scheduled_posts')
      .select('published_at')
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId)
      .eq('status', 'published')
      .gte('published_at', fromTs)
      .lte('published_at', toTs),
    supabase
      .from('gbp_media_assets')
      .select('last_published_at')
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId)
      .not('last_published_at', 'is', null)
      .gte('last_published_at', fromTs)
      .lte('last_published_at', toTs),
    supabase
      .from('gbp_review_actions')
      .select('published_at, updated_at')
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId)
      .eq('status', 'published')
      .gte('updated_at', fromTs)
      .lte('updated_at', toTs),
  ])

  for (const row of posts.data ?? []) {
    if (!row.published_at) continue
    ensure(String(row.published_at).slice(0, 7)).posts++
  }
  for (const row of photos.data ?? []) {
    if (!row.last_published_at) continue
    ensure(String(row.last_published_at).slice(0, 7)).photos++
  }
  for (const row of reviews.data ?? []) {
    const ts = row.published_at || row.updated_at
    if (!ts) continue
    if (ts < fromTs || ts > toTs) continue
    ensure(String(ts).slice(0, 7)).reviewReplies++
  }

  return map
}

function buildPeriod(
  days: number,
  today: Date,
  byDate: Map<string, Record<GbpInsightMetric, number>>,
  activity: GbpActivityCounts,
  previousActivity: GbpActivityCounts
): GbpInsightPeriodTotals {
  const to = today
  const from = addUtcDays(today, -(days - 1))
  const prevTo = addUtcDays(from, -1)
  const prevFrom = addUtcDays(prevTo, -(days - 1))

  const totals = emptyTotals()
  const previousTotals = emptyTotals()

  for (const [date, vals] of byDate) {
    const d = new Date(`${date}T00:00:00.000Z`)
    if (d >= from && d <= to) {
      for (const m of GBP_INSIGHT_METRICS) totals[m] += vals[m] || 0
    } else if (d >= prevFrom && d <= prevTo) {
      for (const m of GBP_INSIGHT_METRICS) previousTotals[m] += vals[m] || 0
    }
  }

  return {
    days,
    from: formatDateUTC(from),
    to: formatDateUTC(to),
    totals,
    previousTotals,
    impressionsTrendPct: trendPct(sumImpressions(totals), sumImpressions(previousTotals)),
    websiteTrendPct: trendPct(totals.WEBSITE_CLICKS, previousTotals.WEBSITE_CLICKS),
    callsTrendPct: trendPct(totals.CALL_CLICKS, previousTotals.CALL_CLICKS),
    directionsTrendPct: trendPct(totals.BUSINESS_DIRECTION_REQUESTS, previousTotals.BUSINESS_DIRECTION_REQUESTS),
    activity,
    previousActivity,
    postsTrendPct: trendPct(activity.posts, previousActivity.posts),
    photosTrendPct: trendPct(activity.photos, previousActivity.photos),
    reviewRepliesTrendPct: trendPct(activity.reviewReplies, previousActivity.reviewReplies),
  }
}

function buildMonthlySeries(
  today: Date,
  byDate: Map<string, Record<GbpInsightMetric, number>>,
  activityByMonth: Map<string, GbpActivityCounts>
): GbpInsightMonthBucket[] {
  const buckets: GbpInsightMonthBucket[] = []
  for (let i = 11; i >= 0; i--) {
    const anchor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1))
    const y = anchor.getUTCFullYear()
    const m = anchor.getUTCMonth() + 1
    const key = `${y}-${String(m).padStart(2, '0')}`
    const label = anchor.toLocaleDateString('de-CH', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    const act = activityByMonth.get(key) || emptyActivity()
    buckets.push({
      month: key,
      label,
      impressions: 0,
      websiteClicks: 0,
      callClicks: 0,
      directionRequests: 0,
      posts: act.posts,
      photos: act.photos,
      reviewReplies: act.reviewReplies,
    })
  }

  const index = new Map(buckets.map((b, i) => [b.month, i]))
  for (const [date, vals] of byDate) {
    const month = date.slice(0, 7)
    const idx = index.get(month)
    if (idx == null) continue
    buckets[idx].impressions += (vals.BUSINESS_IMPRESSIONS_MOBILE_MAPS || 0) + (vals.BUSINESS_IMPRESSIONS_DESKTOP_MAPS || 0)
    buckets[idx].websiteClicks += vals.WEBSITE_CLICKS || 0
    buckets[idx].callClicks += vals.CALL_CLICKS || 0
    buckets[idx].directionRequests += vals.BUSINESS_DIRECTION_REQUESTS || 0
  }
  return buckets
}

/**
 * Sync (refill) then load aggregated totals + 3m/12m Verlauf from DB.
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

  // Load enough history for 12m + prior 12m comparison (~24m), capped by what we store (~13m)
  const historyLoadFrom = formatDateUTC(addUtcDays(today, -(INITIAL_LOOKBACK_DAYS + 5)))

  const { data: rows, error } = await supabase
    .from('gbp_insights_daily')
    .select('metric, value, metric_date, updated_at')
    .eq('tenant_id', tenantId)
    .eq('location_id', loc.id)
    .gte('metric_date', historyLoadFrom)
    .lte('metric_date', displayToStr)
    .order('metric_date', { ascending: true })

  if (error) throw new Error(`Failed to load GBP insights: ${error.message}`)

  const byDate = new Map<string, Record<GbpInsightMetric, number>>()
  const totals = emptyTotals()
  let lastSyncedAt: string | null = sync.lastSyncedAt

  for (const row of rows ?? []) {
    if (!(GBP_INSIGHT_METRICS as readonly string[]).includes(row.metric)) continue
    const metric = row.metric as GbpInsightMetric
    const val = row.value || 0

    if (!byDate.has(row.metric_date)) byDate.set(row.metric_date, emptyTotals())
    byDate.get(row.metric_date)![metric] += val

    if (row.metric_date >= displayFromStr && row.metric_date <= displayToStr) {
      totals[metric] += val
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

  const from3 = formatDateUTC(addUtcDays(today, -89))
  const to3 = formatDateUTC(today)
  const prevTo3 = formatDateUTC(addUtcDays(today, -90))
  const prevFrom3 = formatDateUTC(addUtcDays(today, -179))

  const from12 = formatDateUTC(addUtcDays(today, -364))
  const to12 = formatDateUTC(today)
  const prevTo12 = formatDateUTC(addUtcDays(today, -365))
  const prevFrom12 = formatDateUTC(addUtcDays(today, -729))

  const monthlyFrom = formatDateUTC(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1)))

  const [
    activity3,
    prevActivity3,
    activity12,
    prevActivity12,
    activityByMonth,
  ] = await Promise.all([
    countActivityInRange(tenantId, loc.id, from3, to3),
    countActivityInRange(tenantId, loc.id, prevFrom3, prevTo3),
    countActivityInRange(tenantId, loc.id, from12, to12),
    countActivityInRange(tenantId, loc.id, prevFrom12, prevTo12),
    loadMonthlyActivity(tenantId, loc.id, monthlyFrom, to12),
  ])

  return {
    locationId: loc.id,
    displayDays,
    displayFrom: displayFromStr,
    displayTo: displayToStr,
    historyFrom: bounds?.[0]?.metric_date ?? null,
    historyTo: boundsEnd?.[0]?.metric_date ?? null,
    lastSyncedAt,
    totals,
    period3m: buildPeriod(90, today, byDate, activity3, prevActivity3),
    period12m: buildPeriod(365, today, byDate, activity12, prevActivity12),
    monthly: buildMonthlySeries(today, byDate, activityByMonth),
    synced: {
      from: sync.syncedFrom,
      to: sync.syncedTo,
      rowsUpserted: sync.rowsUpserted,
    },
  }
}
