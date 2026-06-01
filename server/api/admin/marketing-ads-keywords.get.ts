import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

/**
 * Google Ads Keyword Performance
 *
 * Shows keyword-level cost, clicks, impressions from marketing_google_ads_keywords_daily
 * and cross-references with users who came via that keyword (acquisition_term match).
 */
export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const query = getQuery(event)
  const days = Math.min(parseInt(String(query.days ?? '30')), 90)
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceDateStr = since.toISOString().split('T')[0]

  const supabase = getSupabaseAdmin()

  // ── 1. Keyword performance from Google Ads sync ───────────────────────────
  const { data: keywordRows } = await supabase
    .from('marketing_google_ads_keywords_daily')
    .select('keyword, campaign_name, match_type, cost_micros, clicks, impressions, conversions')
    .eq('tenant_id', user.tenant_id)
    .gte('date', sinceDateStr)

  // ── 2. Users acquired via each keyword (utm_term) with their revenue ────
  const { data: userRows } = await supabase
    .from('users')
    .select(`
      acquisition_term,
      acquisition_campaign,
      payments (total_amount_rappen, payment_status)
    `)
    .eq('tenant_id', user.tenant_id)
    .eq('role', 'student')
    .not('acquisition_term', 'is', null)

  // ── 3. Phone clicks per keyword from booking_redirects ───────────────────
  const { data: phoneRows } = await supabase
    .from('booking_redirects')
    .select('utm_term, utm_campaign')
    .eq('tenant_id', user.tenant_id)
    .eq('category', 'phone_call')
    .eq('utm_medium', 'cpc')
    .gte('created_at', since.toISOString())
    .not('utm_term', 'is', null)

  // ── 4. Contact form submissions per keyword ──────────────────────────────
  const { data: formRows } = await supabase
    .from('booking_redirects')
    .select('utm_term, utm_campaign')
    .eq('tenant_id', user.tenant_id)
    .eq('category', 'contact_form')
    .eq('utm_medium', 'cpc')
    .gte('created_at', since.toISOString())
    .not('utm_term', 'is', null)

  // ── 5. Build phone + form counts per keyword ─────────────────────────────
  const phoneByKeyword = new Map<string, number>()
  for (const r of phoneRows ?? []) {
    const k = (r.utm_term ?? '').toLowerCase()
    phoneByKeyword.set(k, (phoneByKeyword.get(k) ?? 0) + 1)
  }
  const formByKeyword = new Map<string, number>()
  for (const r of formRows ?? []) {
    const k = (r.utm_term ?? '').toLowerCase()
    formByKeyword.set(k, (formByKeyword.get(k) ?? 0) + 1)
  }

  // ── 6. Aggregate keyword performance from Ads sync ───────────────────────
  type KwSummary = {
    keyword: string
    campaign: string
    match_type: string
    cost_chf: number
    clicks: number
    impressions: number
    conversions: number
    // First-party
    online_bookings: number
    revenue_chf: number
    phone_clicks: number
    form_submissions: number
    total_conversions: number
    cost_per_booking_chf: number
    cost_per_phone_chf: number
    cpc_chf: number
  }

  const kwMap = new Map<string, KwSummary>()
  for (const r of keywordRows ?? []) {
    const key = `${r.keyword}|||${r.campaign_name}`
    const ex = kwMap.get(key)
    if (ex) {
      ex.cost_chf += r.cost_micros / 1_000_000
      ex.clicks += r.clicks
      ex.impressions += r.impressions
      ex.conversions += Number(r.conversions)
    } else {
      kwMap.set(key, {
        keyword: r.keyword,
        campaign: r.campaign_name ?? '',
        match_type: r.match_type ?? '',
        cost_chf: r.cost_micros / 1_000_000,
        clicks: r.clicks,
        impressions: r.impressions,
        conversions: Number(r.conversions),
        online_bookings: 0,
        revenue_chf: 0,
        phone_clicks: 0,
        form_submissions: 0,
        total_conversions: 0,
        cost_per_booking_chf: 0,
        cost_per_phone_chf: 0,
        cpc_chf: 0,
      })
    }
  }

  // ── 7. Join: online bookings revenue ────────────────────────────────────
  for (const u of userRows ?? []) {
    const term = u.acquisition_term?.toLowerCase()
    if (!term) continue
    const payments: any[] = (u as any).payments ?? []
    const userRevenue = payments.reduce((s: number, p: any) => s + (p.total_amount_rappen ?? 0), 0) / 100
    for (const kw of kwMap.values()) {
      if (kw.keyword.toLowerCase() === term) {
        kw.online_bookings++
        kw.revenue_chf += userRevenue
        break
      }
    }
  }

  // ── 8. Join: phone clicks + form submissions ─────────────────────────────
  for (const kw of kwMap.values()) {
    const k = kw.keyword.toLowerCase()
    kw.phone_clicks = phoneByKeyword.get(k) ?? 0
    kw.form_submissions = formByKeyword.get(k) ?? 0
    kw.total_conversions = kw.online_bookings + kw.phone_clicks + kw.form_submissions
  }

  // ── 9. Finalize ──────────────────────────────────────────────────────────
  const keywords = [...kwMap.values()]
    .map(kw => ({
      ...kw,
      cost_chf: Math.round(kw.cost_chf * 100) / 100,
      revenue_chf: Math.round(kw.revenue_chf * 100) / 100,
      cpc_chf: kw.clicks > 0 ? Math.round((kw.cost_chf / kw.clicks) * 100) / 100 : 0,
      cost_per_booking_chf: kw.online_bookings > 0 ? Math.round((kw.cost_chf / kw.online_bookings) * 100) / 100 : 0,
      cost_per_phone_chf: kw.phone_clicks > 0 ? Math.round((kw.cost_chf / kw.phone_clicks) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.total_conversions - a.total_conversions || b.clicks - a.clicks)

  const totalCost = keywords.reduce((s, k) => s + k.cost_chf, 0)
  const totalRevenue = keywords.reduce((s, k) => s + k.revenue_chf, 0)
  const totalBookings = keywords.reduce((s, k) => s + k.online_bookings, 0)
  const totalPhoneClicks = keywords.reduce((s, k) => s + k.phone_clicks, 0)
  const totalFormSubmissions = keywords.reduce((s, k) => s + k.form_submissions, 0)

  // Also compute campaign-level summary (keywords without utm_term get grouped at campaign level)
  const campaignSummary = new Map<string, { cost_chf: number; bookings: number; phone_clicks: number; forms: number; revenue_chf: number }>()
  for (const kw of keywords) {
    const ex = campaignSummary.get(kw.campaign) ?? { cost_chf: 0, bookings: 0, phone_clicks: 0, forms: 0, revenue_chf: 0 }
    ex.cost_chf += kw.cost_chf
    ex.bookings += kw.online_bookings
    ex.phone_clicks += kw.phone_clicks
    ex.forms += kw.form_submissions
    ex.revenue_chf += kw.revenue_chf
    campaignSummary.set(kw.campaign, ex)
  }

  return {
    days,
    keywords,
    campaigns: [...campaignSummary.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.cost_chf - a.cost_chf),
    summary: {
      total_keywords: keywords.length,
      total_cost_chf: Math.round(totalCost * 100) / 100,
      total_revenue_chf: Math.round(totalRevenue * 100) / 100,
      total_online_bookings: totalBookings,
      total_phone_clicks: totalPhoneClicks,
      total_form_submissions: totalFormSubmissions,
      total_conversions: totalBookings + totalPhoneClicks + totalFormSubmissions,
      cost_per_booking_chf: totalBookings > 0 ? Math.round((totalCost / totalBookings) * 100) / 100 : 0,
      cost_per_conversion_chf: (totalBookings + totalPhoneClicks + totalFormSubmissions) > 0
        ? Math.round((totalCost / (totalBookings + totalPhoneClicks + totalFormSubmissions)) * 100) / 100
        : 0,
    },
    note: 'Umsatz = direkt messbar via Online-Buchungen (utm_term → Kunden). Tel-Klicks + Kontaktformulare = gemessen, Umsatz daraus = nicht direkt messbar.',
  }
})
