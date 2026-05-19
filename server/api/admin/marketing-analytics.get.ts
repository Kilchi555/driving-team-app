import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

// Admin-only endpoint that aggregates marketing data from all 4 platforms
// plus the existing first-party booking_events and booking_redirects tables.
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
  const [ga4Res, gscRes, googleAdsRes, metaAdsRes, bookingEventsRes, bookingRedirectsRes] = await Promise.all([
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
      .limit(200),

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
  ])

  // ============ LAYER 3: AGGREGATE SUMMARY STATS ============
  const googleAdsData = googleAdsRes.data ?? []
  const metaAdsData = metaAdsRes.data ?? []
  const bookingEvents = bookingEventsRes.data ?? []
  const bookingRedirects = bookingRedirectsRes.data ?? []

  const totalGoogleSpend = googleAdsData.reduce((sum, r) => sum + (r.cost_micros ?? 0) / 1_000_000, 0)
  const totalMetaSpend = metaAdsData.reduce((sum, r) => sum + parseFloat(r.spend ?? '0'), 0)
  const totalGoogleClicks = googleAdsData.reduce((sum, r) => sum + (r.clicks ?? 0), 0)
  const totalMetaClicks = metaAdsData.reduce((sum, r) => sum + (r.clicks ?? 0), 0)
  const totalGoogleConversions = googleAdsData.reduce((sum, r) => sum + parseFloat(r.conversions ?? '0'), 0)
  const websiteToBookingClicks = bookingRedirects.length
  const completedBookings = bookingEvents.filter((e) => e.event_type === 'completed').length
  const viewedBookings = bookingEvents.filter((e) => e.event_type === 'viewed').length

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
    },
    ga4: ga4Res.data ?? [],
    gsc: gscRes.data ?? [],
    googleAds: googleAdsData,
    metaAds: metaAdsData,
    bookingFunnel: {
      websiteClicks: websiteToBookingClicks,
      bookingPageViews: viewedBookings,
      completions: completedBookings,
    },
  }
})
