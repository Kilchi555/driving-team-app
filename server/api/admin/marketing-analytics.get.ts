import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

// Admin-only endpoint that aggregates marketing data from all 4 platforms
// plus first-party booking data (appointments + payments with UTM attribution).
export default defineEventHandler(async (event) => {
  // ============ LAYER 1: AUTH (admin only) ============
  const user = await getAuthenticatedUser(event)
  if (!user || user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const query = getQuery(event)
  const days = Math.min(parseInt(String(query.days ?? '30')), 90)

  const supabase = getSupabaseAdmin()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  // ============ LAYER 2: PARALLEL DATA FETCH ============
  const [
    ga4Res, gscRes, googleAdsRes, metaAdsRes,
    bookingEventsRes, bookingRedirectsRes,
    appointmentsRes, keywordsRes
  ] = await Promise.all([
    // GA4: daily totals grouped by date and channel
    supabase
      .from('marketing_ga4_daily')
      .select('date, channel, sessions, users, new_users, conversions, engagement_rate')
      .gte('date', sinceStr)
      .order('date', { ascending: false })
      .limit(500),

    // Search Console: top queries
    supabase
      .from('marketing_gsc_daily')
      .select('date, query, page, clicks, impressions, ctr, position')
      .gte('date', sinceStr)
      .order('clicks', { ascending: false })
      .limit(100),

    // Google Ads: campaign totals
    supabase
      .from('marketing_google_ads_daily')
      .select('date, campaign_id, campaign_name, cost_micros, clicks, impressions, conversions')
      .gte('date', sinceStr)
      .order('date', { ascending: false })
      .limit(500),

    // Meta Ads: campaign totals
    supabase
      .from('marketing_meta_ads_daily')
      .select('date, campaign_id, campaign_name, spend, impressions, clicks, reach, actions')
      .gte('date', sinceStr)
      .order('date', { ascending: false })
      .limit(200),

    // First-party: actual booking completions from the app
    supabase
      .from('booking_events')
      .select('created_at, event_type')
      .gte('created_at', since.toISOString())
      .in('event_type', ['viewed', 'completed', 'abandoned']),

    // First-party: clicks from website to booking app
    supabase
      .from('booking_redirects')
      .select('created_at')
      .gte('created_at', since.toISOString()),

    // First-party attribution: appointments with UTM / gclid data
    supabase
      .from('appointments')
      .select('id, created_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid')
      .gte('created_at', since.toISOString())
      .not('status', 'eq', 'deleted'),

    // Google Ads keyword performance
    supabase
      .from('marketing_google_ads_keywords_daily')
      .select('date, campaign_id, campaign_name, ad_group_name, keyword_text, match_type, cost_micros, clicks, impressions, conversions')
      .gte('date', sinceStr)
      .order('cost_micros', { ascending: false })
      .limit(300),
  ])

  // ============ LAYER 3: AGGREGATE SUMMARY STATS ============
  const googleAdsData = googleAdsRes.data ?? []
  const metaAdsData = metaAdsRes.data ?? []
  const bookingEvents = bookingEventsRes.data ?? []
  const bookingRedirects = bookingRedirectsRes.data ?? []
  const appointments = appointmentsRes.data ?? []
  const keywordsData = keywordsRes.data ?? []

  const totalGoogleSpend = googleAdsData.reduce((sum, r) => sum + (r.cost_micros ?? 0) / 1_000_000, 0)
  const totalMetaSpend = metaAdsData.reduce((sum, r) => sum + parseFloat(r.spend ?? '0'), 0)
  const totalGoogleClicks = googleAdsData.reduce((sum, r) => sum + (r.clicks ?? 0), 0)
  const totalMetaClicks = metaAdsData.reduce((sum, r) => sum + (r.clicks ?? 0), 0)
  const totalGoogleConversions = googleAdsData.reduce((sum, r) => sum + parseFloat(r.conversions ?? '0'), 0)
  const websiteToBookingClicks = bookingRedirects.length
  const completedBookings = bookingEvents.filter((e) => e.event_type === 'completed').length
  const viewedBookings = bookingEvents.filter((e) => e.event_type === 'viewed').length

  // ── First-party attribution ───────────────────────────────────────────────
  // Appointments that came from Google (gclid present OR utm_source is google/cpc/paidsearch)
  const googleSources = new Set(['google', 'google ads', 'cpc', 'paid search', 'paidsearch'])
  const googleApts = appointments.filter(
    (a) => a.gclid || googleSources.has((a.utm_source ?? '').toLowerCase())
  )
  const metaApts = appointments.filter(
    (a) => ['facebook', 'instagram', 'meta', 'fb'].includes((a.utm_source ?? '').toLowerCase())
  )

  // Fetch payments for attributed appointments in parallel
  const googleAptIds = googleApts.map((a) => a.id)
  const allAttributedIds = appointments
    .filter((a) => a.utm_source || a.gclid)
    .map((a) => a.id)

  const revenueMap: Record<string, number> = {}
  if (allAttributedIds.length > 0) {
    const { data: payments } = await supabase
      .from('payments')
      .select('appointment_id, total_amount_rappen')
      .in('appointment_id', allAttributedIds)
      .eq('payment_status', 'completed')
    for (const p of payments ?? []) {
      if (p.appointment_id) revenueMap[p.appointment_id] = (revenueMap[p.appointment_id] ?? 0) + p.total_amount_rappen
    }
  }

  const googleRevenue = googleApts.reduce((sum, a) => sum + (revenueMap[a.id] ?? 0), 0) / 100
  const metaRevenue = metaApts.reduce((sum, a) => sum + (revenueMap[a.id] ?? 0), 0) / 100

  // ── Per-campaign attribution (Google) ────────────────────────────────────
  // Normalize campaign name for matching: lowercase, strip special chars/years
  const normCampaign = (s: string) =>
    (s ?? '').toLowerCase().replace(/[^a-z0-9äöüß]/g, ' ').replace(/\s+/g, ' ').trim()

  // Aggregate Google Ads spend by campaign (normalized name)
  const googleAdsById: Record<string, { campaign_id: string; campaign_name: string; cost_micros: number; clicks: number; impressions: number; conversions: number }> = {}
  for (const r of googleAdsData) {
    if (!googleAdsById[r.campaign_id]) {
      googleAdsById[r.campaign_id] = { campaign_id: r.campaign_id, campaign_name: r.campaign_name, cost_micros: 0, clicks: 0, impressions: 0, conversions: 0 }
    }
    googleAdsById[r.campaign_id].cost_micros += r.cost_micros
    googleAdsById[r.campaign_id].clicks += r.clicks
    googleAdsById[r.campaign_id].impressions += r.impressions
    googleAdsById[r.campaign_id].conversions += parseFloat(r.conversions ?? '0')
  }

  // Match appointments to campaigns:
  // 1. Exact match on campaign_id (utm_campaign = numeric ID, set via {campaignid} ValueTrack)
  // 2. Fallback: normalized name match (utm_campaign = human-readable name via custom param)
  const aptByCampaignId: Record<string, { count: number; revenue_rappen: number }> = {}
  const aptByCampaignName: Record<string, { count: number; revenue_rappen: number }> = {}
  for (const a of googleApts) {
    const rawCampaign = a.utm_campaign ?? ''
    // Numeric → campaign_id match
    const idKey = rawCampaign.trim()
    if (!aptByCampaignId[idKey]) aptByCampaignId[idKey] = { count: 0, revenue_rappen: 0 }
    aptByCampaignId[idKey].count++
    aptByCampaignId[idKey].revenue_rappen += revenueMap[a.id] ?? 0
    // Name fallback
    const nameKey = normCampaign(rawCampaign)
    if (!aptByCampaignName[nameKey]) aptByCampaignName[nameKey] = { count: 0, revenue_rappen: 0 }
    aptByCampaignName[nameKey].count++
    aptByCampaignName[nameKey].revenue_rappen += revenueMap[a.id] ?? 0
  }

  const googleCampaignsEnriched = Object.values(googleAdsById).map((c) => {
    // Try campaign_id match first, then name match
    const attrById = aptByCampaignId[c.campaign_id] ?? { count: 0, revenue_rappen: 0 }
    const attrByName = aptByCampaignName[normCampaign(c.campaign_name)] ?? { count: 0, revenue_rappen: 0 }
    const attr = attrById.count > 0 ? attrById : attrByName
    const spend = c.cost_micros / 1_000_000
    const revenue = attr.revenue_rappen / 100
    return {
      campaign_id: c.campaign_id,
      campaign_name: c.campaign_name,
      spend_chf: spend,
      clicks: c.clicks,
      impressions: c.impressions,
      google_conversions: c.conversions,
      real_bookings: attr.count,
      real_revenue_chf: revenue,
      cpa_google: c.conversions > 0 ? spend / c.conversions : null,
      cpa_real: attr.count > 0 ? spend / attr.count : null,
      roas: spend > 0 && revenue > 0 ? revenue / spend : null,
    }
  }).sort((a, b) => b.spend_chf - a.spend_chf)

  // ── Keyword aggregation ───────────────────────────────────────────────────
  const kwMap: Record<string, { keyword_text: string; match_type: string; campaign_name: string; cost_micros: number; clicks: number; impressions: number; conversions: number }> = {}
  for (const r of keywordsData) {
    const key = `${r.keyword_text}|${r.match_type}|${r.campaign_id}`
    if (!kwMap[key]) {
      kwMap[key] = { keyword_text: r.keyword_text, match_type: r.match_type, campaign_name: r.campaign_name, cost_micros: 0, clicks: 0, impressions: 0, conversions: 0 }
    }
    kwMap[key].cost_micros += r.cost_micros
    kwMap[key].clicks += r.clicks
    kwMap[key].impressions += r.impressions
    kwMap[key].conversions += parseFloat(r.conversions ?? '0')
  }
  const keywordsAggregated = Object.values(kwMap)
    .map((k) => ({
      ...k,
      spend_chf: k.cost_micros / 1_000_000,
      cpc_chf: k.clicks > 0 ? k.cost_micros / 1_000_000 / k.clicks : null,
      ctr: k.impressions > 0 ? (k.clicks / k.impressions) * 100 : 0,
    }))
    .sort((a, b) => b.cost_micros - a.cost_micros)
    .slice(0, 50)

  // ── Attribution summary by source ─────────────────────────────────────────
  const bySource: Record<string, { bookings: number; revenue_rappen: number }> = {}
  for (const a of appointments) {
    const src = (a.utm_source ?? (a.gclid ? 'google' : 'direct')).toLowerCase()
    if (!bySource[src]) bySource[src] = { bookings: 0, revenue_rappen: 0 }
    bySource[src].bookings++
    bySource[src].revenue_rappen += revenueMap[a.id] ?? 0
  }

  return {
    days,
    summary: {
      totalSpend: Math.round((totalGoogleSpend + totalMetaSpend) * 100) / 100,
      googleSpend: Math.round(totalGoogleSpend * 100) / 100,
      metaSpend: Math.round(totalMetaSpend * 100) / 100,
      totalAdClicks: totalGoogleClicks + totalMetaClicks,
      googleConversions: Math.round(totalGoogleConversions),
      websiteToBookingClicks,
      completedBookings,
      viewedBookings,
      bookingCompletionRate: viewedBookings > 0
        ? Math.round((completedBookings / viewedBookings) * 1000) / 10
        : 0,
      // First-party attribution
      googleRealBookings: googleApts.length,
      googleRealRevenue: Math.round(googleRevenue * 100) / 100,
      googleCPA: googleApts.length > 0 ? Math.round((totalGoogleSpend / googleApts.length) * 100) / 100 : null,
      googleROAS: totalGoogleSpend > 0 && googleRevenue > 0 ? Math.round((googleRevenue / totalGoogleSpend) * 100) / 100 : null,
      metaRealBookings: metaApts.length,
      metaRealRevenue: Math.round(metaRevenue * 100) / 100,
      metaCPA: metaApts.length > 0 ? Math.round((totalMetaSpend / metaApts.length) * 100) / 100 : null,
    },
    ga4: ga4Res.data ?? [],
    gsc: gscRes.data ?? [],
    googleAds: googleAdsData,
    googleAdsCampaigns: googleCampaignsEnriched,
    metaAds: metaAdsData,
    keywords: keywordsAggregated,
    attributionBySource: Object.entries(bySource).map(([source, v]) => ({
      source,
      bookings: v.bookings,
      revenue_chf: Math.round(v.revenue_rappen / 100 * 100) / 100,
    })).sort((a, b) => b.bookings - a.bookings),
    bookingFunnel: {
      websiteClicks: websiteToBookingClicks,
      bookingPageViews: viewedBookings,
      completions: completedBookings,
    },
  }
})
