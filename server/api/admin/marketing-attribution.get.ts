import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

// Returns full booking attribution: which source/page/keyword led to bookings
// Links booking_redirects (website clicks) → booking_events (simy.ch completions)
// Also adds approximate keyword hints from GSC for organic traffic
export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const query = getQuery(event)
  const days = Math.min(parseInt(String(query.days ?? '30')), 90)

  const supabase = getSupabaseAdmin()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString()
  const sinceDateStr = since.toISOString().split('T')[0]

  // ── 1. Attribution via booking_redirects → booking_events ───────────────
  const { data: attrRaw } = await supabase
    .from('booking_redirects')
    .select(`
      session_id, utm_source, utm_medium, utm_campaign, referrer_page, created_at
    `)
    .eq('tenant_id', user.tenant_id)
    .gte('created_at', sinceStr)

  const { data: eventsRaw } = await supabase
    .from('booking_events')
    .select('session_id, event_type, created_at')
    .eq('tenant_id', user.tenant_id)
    .gte('created_at', sinceStr)

  // ── 2. Top keywords per page from GSC (last 30 days) ────────────────────
  const { data: gscRaw } = await supabase
    .from('marketing_gsc_daily')
    .select('query, page, clicks, impressions, position')
    .eq('tenant_id', user.tenant_id)
    .gte('date', sinceDateStr)
    .gte('clicks', 1)
    .order('clicks', { ascending: false })
    .limit(500)

  // Build page → top keywords map from GSC
  const pageKeywords = new Map<string, { query: string; clicks: number }[]>()
  for (const r of gscRaw ?? []) {
    const path = new URL(r.page).pathname.replace(/\/$/, '') || '/'
    const existing = pageKeywords.get(path) ?? []
    const found = existing.find(k => k.query === r.query)
    if (found) { found.clicks += r.clicks } else { existing.push({ query: r.query, clicks: r.clicks }) }
    pageKeywords.set(path, existing)
  }
  // Sort and trim to top 3 per page
  for (const [page, kws] of pageKeywords) {
    pageKeywords.set(page, kws.sort((a, b) => b.clicks - a.clicks).slice(0, 3))
  }

  // ── 3. Build session event map ───────────────────────────────────────────
  const sessionEvents = new Map<string, Set<string>>()
  for (const e of eventsRaw ?? []) {
    if (!sessionEvents.has(e.session_id)) sessionEvents.set(e.session_id, new Set())
    sessionEvents.get(e.session_id)!.add(e.event_type)
  }

  // ── 4. Aggregate by source + referrer_page ───────────────────────────────
  type Row = {
    source: string
    medium: string
    campaign: string | null
    page: string
    clicks: number
    opened: number
    abandoned: number
    completed: number
    topKeywords: string[]
  }
  const aggMap = new Map<string, Row>()

  for (const r of attrRaw ?? []) {
    const source = r.utm_source ?? 'organic/direct'
    const medium = r.utm_medium ?? '—'
    const campaign = r.utm_campaign ?? null
    const page = r.referrer_page ?? '(kein Referrer)'
    const key = `${source}|||${medium}|||${campaign}|||${page}`

    const events = sessionEvents.get(r.session_id)
    const existing = aggMap.get(key) ?? { source, medium, campaign, page, clicks: 0, opened: 0, abandoned: 0, completed: 0, topKeywords: [] }

    aggMap.set(key, {
      ...existing,
      clicks: existing.clicks + 1,
      opened: events?.has('viewed') ? existing.opened + 1 : existing.opened,
      abandoned: events?.has('abandoned') ? existing.abandoned + 1 : existing.abandoned,
      completed: events?.has('completed') ? existing.completed + 1 : existing.completed,
    })
  }

  // Add keyword hints for organic traffic
  for (const [key, row] of aggMap) {
    if (row.source === 'organic/direct') {
      const normalizedPage = row.page.replace(/\/$/, '') || '/'
      row.topKeywords = (pageKeywords.get(normalizedPage) ?? []).map(k => k.query)
    }
  }

  const rows = [...aggMap.values()].sort((a, b) => b.completed - a.completed || b.clicks - a.clicks)

  // ── 5. Summary ───────────────────────────────────────────────────────────
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0)
  const totalOpened = rows.reduce((s, r) => s + r.opened, 0)
  const totalAbandoned = rows.reduce((s, r) => s + r.abandoned, 0)
  const totalCompleted = rows.reduce((s, r) => s + r.completed, 0)

  // Sources summary (Google Ads vs Organic vs Others)
  const sourcesSummary = new Map<string, { clicks: number; completed: number }>()
  for (const r of rows) {
    const label = r.medium === 'cpc' ? `${r.source} (CPC)` : r.source === 'organic/direct' ? 'Organisch / Direkt' : r.source
    const e = sourcesSummary.get(label) ?? { clicks: 0, completed: 0 }
    sourcesSummary.set(label, { clicks: e.clicks + r.clicks, completed: e.completed + r.completed })
  }

  return {
    days,
    funnel: { totalClicks, totalOpened, totalAbandoned, totalCompleted },
    bySourceAndPage: rows.slice(0, 30),
    sourcesSummary: [...sourcesSummary.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.completed - a.completed || b.clicks - a.clicks),
    note: 'Keyword-Attribution nur für Paid Search (UTM) verfügbar. Für Organic zeigen wir die wahrscheinlichsten Keywords aus GSC basierend auf der Einstiegsseite.',
  }
})
