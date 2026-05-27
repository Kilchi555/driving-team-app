import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

/**
 * Tenant-Admin Marketing Overview
 *
 * Aggregiert alle relevanten Marketing- und Conversion-Daten in einer einzigen
 * Antwort: GSC (Search Console), GA4, Google Ads, Meta Ads, First-Party Booking
 * Events, Bookings (mit Attribution) und automatisch generierte Quick-Wins.
 *
 * Query params:
 *   - days:      Zeitfenster in Tagen (7, 30, 90). Default 30.
 *   - tenant_id: Optional, Filter auf einen Tenant. Default: alle Tenants.
 */
export default defineEventHandler(async (event) => {
  const start = Date.now()
  try {
    const q = getQuery(event)
    const days = Math.min(Math.max(parseInt(String(q.days ?? '30'), 10) || 30, 1), 365)
    const tenantId = q.tenant_id ? String(q.tenant_id) : null

    const supabase = getSupabaseAdmin()

    const now = new Date()
    const since = new Date(now)
    since.setDate(now.getDate() - days)
    const sinceISO = since.toISOString()
    const sinceDate = sinceISO.split('T')[0]

    // Vorperiode für Wachstumsvergleich
    const prevSince = new Date(now)
    prevSince.setDate(now.getDate() - days * 2)
    const prevSinceDate = prevSince.toISOString().split('T')[0]
    const prevUntilDate = sinceDate

    // ============ 1. PARALLELER DATENFETCH ============
    const [
      gscRes,
      ga4Res,
      googleAdsRes,
      metaAdsRes,
      bookingEventsRes,
      bookingRedirectsRes,
      appointmentsRes,
      prevAppointmentsRes,
      conversionUploadsRes,
      tenantsRes,
    ] = await Promise.all([
      supabase
        .from('marketing_gsc_daily')
        .select('date, query, page, clicks, impressions, ctr, position')
        .gte('date', sinceDate)
        .order('clicks', { ascending: false })
        .limit(1500),

      supabase
        .from('marketing_ga4_daily')
        .select('date, channel, page_path, sessions, users, new_users, page_views, engagement_rate, conversions')
        .gte('date', sinceDate)
        .order('date', { ascending: false })
        .limit(2000),

      supabase
        .from('marketing_google_ads_daily')
        .select('date, campaign_id, campaign_name, cost_micros, clicks, impressions, conversions, cpc_micros')
        .gte('date', sinceDate)
        .order('date', { ascending: false })
        .limit(1000),

      supabase
        .from('marketing_meta_ads_daily')
        .select('date, campaign_id, campaign_name, spend, impressions, clicks, reach')
        .gte('date', sinceDate)
        .order('date', { ascending: false })
        .limit(1000),

      supabase
        .from('booking_events')
        .select('created_at, event_type, page, referrer, session_id')
        .gte('created_at', sinceISO)
        .limit(20000),

      supabase
        .from('booking_redirects')
        .select('created_at, category, referrer_page, utm_source, utm_medium, utm_campaign, session_id')
        .gte('created_at', sinceISO)
        .limit(20000),

      (() => {
        let qb = supabase
          .from('appointments')
          .select(
            'id, status, type, source, start_time, created_at, tenant_id, staff_id, gclid, marketing_session_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term'
          )
          .gte('created_at', sinceISO)
          .limit(5000)
        if (tenantId) qb = qb.eq('tenant_id', tenantId)
        return qb
      })(),

      (() => {
        let qb = supabase
          .from('appointments')
          .select('id, status, source, created_at, tenant_id')
          .gte('created_at', prevSince.toISOString())
          .lt('created_at', sinceISO)
          .limit(5000)
        if (tenantId) qb = qb.eq('tenant_id', tenantId)
        return qb
      })(),

      supabase
        .from('google_ads_conversion_uploads')
        .select('id, appointment_id, gclid, status, created_at, response_received_at')
        .gte('created_at', sinceISO)
        .limit(2000),

      supabase.from('tenants').select('id, name, slug').limit(50),
    ])

    const gsc = gscRes.data ?? []
    const ga4 = ga4Res.data ?? []
    const googleAds = googleAdsRes.data ?? []
    const metaAds = metaAdsRes.data ?? []
    const bookingEvents = bookingEventsRes.data ?? []
    const bookingRedirects = bookingRedirectsRes.data ?? []
    const appointments = appointmentsRes.data ?? []
    const prevAppointments = prevAppointmentsRes.data ?? []
    const conversionUploads = conversionUploadsRes.data ?? []
    const tenants = tenantsRes.data ?? []

    // ============ 2. SUMMARY KPIs ============
    const totalImpressionsGSC = gsc.reduce((s, r: any) => s + (r.impressions ?? 0), 0)
    const totalClicksGSC = gsc.reduce((s, r: any) => s + (r.clicks ?? 0), 0)
    const avgPositionGSC =
      gsc.length > 0
        ? gsc.reduce((s, r: any) => s + (r.position ?? 0) * (r.impressions ?? 0), 0) /
          Math.max(totalImpressionsGSC, 1)
        : 0

    const totalSessionsGA4 = ga4.reduce((s, r: any) => s + (r.sessions ?? 0), 0)
    const totalUsersGA4 = ga4.reduce((s, r: any) => s + (r.users ?? 0), 0)
    const totalPageViewsGA4 = ga4.reduce((s, r: any) => s + (r.page_views ?? 0), 0)

    const totalGoogleSpend = googleAds.reduce((s, r: any) => s + (r.cost_micros ?? 0) / 1_000_000, 0)
    const totalGoogleClicks = googleAds.reduce((s, r: any) => s + (r.clicks ?? 0), 0)
    const totalGoogleImpressions = googleAds.reduce((s, r: any) => s + (r.impressions ?? 0), 0)

    const totalMetaSpend = metaAds.reduce((s, r: any) => s + parseFloat(String(r.spend ?? '0')), 0)
    const totalMetaClicks = metaAds.reduce((s, r: any) => s + (r.clicks ?? 0), 0)
    const totalMetaImpressions = metaAds.reduce((s, r: any) => s + (r.impressions ?? 0), 0)

    const bookedStatuses = ['confirmed', 'completed']
    const bookings = appointments.filter((a: any) => bookedStatuses.includes(a.status))
    const onlineBookings = bookings.filter((a: any) => (a.source ?? 'online') === 'online')
    const cancelled = appointments.filter((a: any) => a.status === 'cancelled')
    const prevBookings = prevAppointments.filter((a: any) => bookedStatuses.includes(a.status))

    const completedEvents = bookingEvents.filter((e: any) => e.event_type === 'completed').length
    const viewedEvents = bookingEvents.filter((e: any) => e.event_type === 'viewed').length
    const startedEvents = bookingEvents.filter((e: any) => e.event_type === 'started').length
    const abandonedEvents = bookingEvents.filter((e: any) => e.event_type === 'abandoned').length

    const bookingGrowthPct =
      prevBookings.length > 0
        ? Math.round(((bookings.length - prevBookings.length) / prevBookings.length) * 1000) / 10
        : 0

    const totalAdSpend = totalGoogleSpend + totalMetaSpend
    const paidBookings = bookings.filter((a: any) => !!a.gclid || a.utm_medium === 'cpc').length
    const costPerBooking = paidBookings > 0 ? totalAdSpend / paidBookings : 0
    const overallCPA = bookings.length > 0 ? totalAdSpend / bookings.length : 0

    const conversionRate = totalSessionsGA4 > 0 ? (bookings.length / totalSessionsGA4) * 100 : 0
    const bookingFunnelRate = viewedEvents > 0 ? (completedEvents / viewedEvents) * 100 : 0

    const successfulUploads = conversionUploads.filter((u: any) => u.status === 'success').length
    const failedUploads = conversionUploads.filter((u: any) => u.status === 'failed').length

    // ============ 3. CUSTOMER ORIGIN (Attribution Channels) ============
    type ChannelBucket = { sessions: number; bookings: number; spend: number; clicks: number; impressions: number }
    const channels: Record<string, ChannelBucket> = {
      'Google Ads': { sessions: 0, bookings: 0, spend: totalGoogleSpend, clicks: totalGoogleClicks, impressions: totalGoogleImpressions },
      'Meta Ads': { sessions: 0, bookings: 0, spend: totalMetaSpend, clicks: totalMetaClicks, impressions: totalMetaImpressions },
      'Google Organic': { sessions: 0, bookings: 0, spend: 0, clicks: totalClicksGSC, impressions: totalImpressionsGSC },
      'Direct': { sessions: 0, bookings: 0, spend: 0, clicks: 0, impressions: 0 },
      'Referral': { sessions: 0, bookings: 0, spend: 0, clicks: 0, impressions: 0 },
      'Other': { sessions: 0, bookings: 0, spend: 0, clicks: 0, impressions: 0 },
    }

    for (const ga of ga4 as any[]) {
      const ch = String(ga.channel ?? '').toLowerCase()
      const sessions = ga.sessions ?? 0
      if (ch.includes('paid') && ch.includes('google')) channels['Google Ads'].sessions += sessions
      else if (ch.includes('paid') && (ch.includes('social') || ch.includes('meta') || ch.includes('facebook')))
        channels['Meta Ads'].sessions += sessions
      else if (ch.includes('organic') && ch.includes('search')) channels['Google Organic'].sessions += sessions
      else if (ch.includes('direct')) channels['Direct'].sessions += sessions
      else if (ch.includes('referral')) channels['Referral'].sessions += sessions
      else channels['Other'].sessions += sessions
    }

    for (const a of bookings as any[]) {
      const src = (a.utm_source ?? '').toLowerCase()
      const med = (a.utm_medium ?? '').toLowerCase()
      if (a.gclid || (src === 'google' && med === 'cpc')) channels['Google Ads'].bookings++
      else if (src === 'facebook' || src === 'instagram' || med === 'paid_social') channels['Meta Ads'].bookings++
      else if (src === 'google' || med === 'organic') channels['Google Organic'].bookings++
      else if (!a.utm_source && !a.gclid && !a.marketing_session_id) channels['Direct'].bookings++
      else if (med === 'referral' || (src && src !== 'google' && src !== 'facebook' && src !== 'instagram'))
        channels['Referral'].bookings++
      else channels['Other'].bookings++
    }

    // ============ 4. FUNNEL ============
    const funnel = {
      impressions: totalImpressionsGSC + totalGoogleImpressions + totalMetaImpressions,
      sessions: totalSessionsGA4 || bookingRedirects.length,
      bookingPageViews: viewedEvents,
      bookingStarted: startedEvents,
      bookingCompleted: completedEvents || bookings.length,
      conversionRate: Math.round(conversionRate * 100) / 100,
      bookingFunnelRate: Math.round(bookingFunnelRate * 100) / 100,
    }

    // ============ 5. DAILY TREND ============
    type DayRow = { date: string; sessions: number; clicks: number; bookings: number; spend: number; impressions: number }
    const dayMap = new Map<string, DayRow>()
    const ensureDay = (d: string): DayRow => {
      if (!dayMap.has(d)) dayMap.set(d, { date: d, sessions: 0, clicks: 0, bookings: 0, spend: 0, impressions: 0 })
      return dayMap.get(d)!
    }
    for (let i = 0; i < days; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      ensureDay(d.toISOString().split('T')[0])
    }
    for (const r of ga4 as any[]) ensureDay(r.date).sessions += r.sessions ?? 0
    for (const r of gsc as any[]) ensureDay(r.date).clicks += r.clicks ?? 0
    for (const r of gsc as any[]) ensureDay(r.date).impressions += r.impressions ?? 0
    for (const r of googleAds as any[]) {
      const d = ensureDay(r.date)
      d.clicks += r.clicks ?? 0
      d.impressions += r.impressions ?? 0
      d.spend += (r.cost_micros ?? 0) / 1_000_000
    }
    for (const r of metaAds as any[]) {
      const d = ensureDay(r.date)
      d.clicks += r.clicks ?? 0
      d.impressions += r.impressions ?? 0
      d.spend += parseFloat(String(r.spend ?? '0'))
    }
    for (const a of bookings as any[]) {
      const d = (a.created_at as string).split('T')[0]
      ensureDay(d).bookings += 1
    }
    const trend = Array.from(dayMap.values()).sort((a, b) => (a.date < b.date ? -1 : 1))

    // ============ 6. TOP GSC QUERIES & PAGES ============
    const queryAgg = new Map<string, { clicks: number; impressions: number; positionSum: number; positionN: number }>()
    for (const r of gsc as any[]) {
      const k = r.query ?? '(unknown)'
      const v = queryAgg.get(k) ?? { clicks: 0, impressions: 0, positionSum: 0, positionN: 0 }
      v.clicks += r.clicks ?? 0
      v.impressions += r.impressions ?? 0
      if (r.position) {
        v.positionSum += (r.position ?? 0) * (r.impressions ?? 1)
        v.positionN += r.impressions ?? 1
      }
      queryAgg.set(k, v)
    }
    const topQueries = Array.from(queryAgg.entries())
      .map(([query, v]) => ({
        query,
        clicks: v.clicks,
        impressions: v.impressions,
        ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
        position: v.positionN > 0 ? v.positionSum / v.positionN : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 20)

    const pageAgg = new Map<string, { clicks: number; impressions: number; positionSum: number; positionN: number }>()
    for (const r of gsc as any[]) {
      const k = r.page ?? '(unknown)'
      const v = pageAgg.get(k) ?? { clicks: 0, impressions: 0, positionSum: 0, positionN: 0 }
      v.clicks += r.clicks ?? 0
      v.impressions += r.impressions ?? 0
      if (r.position) {
        v.positionSum += (r.position ?? 0) * (r.impressions ?? 1)
        v.positionN += r.impressions ?? 1
      }
      pageAgg.set(k, v)
    }
    const topPages = Array.from(pageAgg.entries())
      .map(([page, v]) => ({
        page,
        clicks: v.clicks,
        impressions: v.impressions,
        ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
        position: v.positionN > 0 ? v.positionSum / v.positionN : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 15)

    // ============ 7. GA4 TOP PAGES (Visits) ============
    const ga4PageAgg = new Map<string, { sessions: number; pageViews: number }>()
    for (const r of ga4 as any[]) {
      const k = r.page_path || '(unknown)'
      const v = ga4PageAgg.get(k) ?? { sessions: 0, pageViews: 0 }
      v.sessions += r.sessions ?? 0
      v.pageViews += r.page_views ?? 0
      ga4PageAgg.set(k, v)
    }
    const topGa4Pages = Array.from(ga4PageAgg.entries())
      .map(([page, v]) => ({ page, sessions: v.sessions, pageViews: v.pageViews }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 15)

    // ============ 8. GOOGLE ADS CAMPAIGN PERFORMANCE ============
    const adsCampAgg = new Map<string, { campaign_name: string; cost: number; clicks: number; impressions: number; conversions: number }>()
    for (const r of googleAds as any[]) {
      const k = r.campaign_id ?? '(unknown)'
      const v = adsCampAgg.get(k) ?? { campaign_name: r.campaign_name ?? '–', cost: 0, clicks: 0, impressions: 0, conversions: 0 }
      v.cost += (r.cost_micros ?? 0) / 1_000_000
      v.clicks += r.clicks ?? 0
      v.impressions += r.impressions ?? 0
      v.conversions += parseFloat(String(r.conversions ?? '0'))
      v.campaign_name = r.campaign_name ?? v.campaign_name
      adsCampAgg.set(k, v)
    }
    const adsCampaigns = Array.from(adsCampAgg.entries())
      .map(([id, v]) => ({
        campaign_id: id,
        campaign_name: v.campaign_name,
        cost: Math.round(v.cost * 100) / 100,
        clicks: v.clicks,
        impressions: v.impressions,
        conversions: Math.round(v.conversions * 10) / 10,
        ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0,
        cpc: v.clicks > 0 ? v.cost / v.clicks : 0,
        cpa: v.conversions > 0 ? v.cost / v.conversions : 0,
      }))
      .sort((a, b) => b.cost - a.cost)

    // ============ 9. QUICK WINS (algorithmische Empfehlungen) ============
    const quickWins: Array<{ severity: 'high' | 'medium' | 'low'; category: string; title: string; detail: string; metric?: string; action?: string }> = []

    // 9.1: GSC Queries auf Position 4-15 mit hohen Impressions → leicht zu verbessern
    const lowHangingFruit = topQueries
      .filter((q) => q.position >= 4 && q.position <= 15 && q.impressions >= 50)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5)
    for (const q of lowHangingFruit) {
      quickWins.push({
        severity: 'high',
        category: 'SEO',
        title: `Push "${q.query}" auf Seite 1`,
        detail: `Position ${q.position.toFixed(1)}, ${q.impressions} Impressions, CTR ${q.ctr.toFixed(2)}%. Optimiere Title/Meta + interne Links auf der Landing-Page.`,
        metric: `${q.impressions} imp / ${q.clicks} clicks`,
        action: 'On-page-SEO Push',
      })
    }

    // 9.2: Hohe Impressions, niedrige CTR → Title/Meta-Description-Optimierung
    const lowCTR = topQueries
      .filter((q) => q.impressions >= 200 && q.ctr < 2 && q.position <= 10)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 3)
    for (const q of lowCTR) {
      quickWins.push({
        severity: 'medium',
        category: 'CTR',
        title: `Verbessere Meta-Description für "${q.query}"`,
        detail: `${q.impressions} Impressions, aber nur ${q.ctr.toFixed(2)}% CTR auf Pos. ${q.position.toFixed(1)}. Mehr Klick-Magnete im Title.`,
        metric: `CTR ${q.ctr.toFixed(2)}%`,
        action: 'Title/Meta refinement',
      })
    }

    // 9.3: Google-Ads Kampagne mit niedriger CTR → Ad-Copy
    for (const c of adsCampaigns) {
      if (c.impressions >= 200 && c.ctr < 2) {
        quickWins.push({
          severity: 'medium',
          category: 'Google Ads',
          title: `Niedrige CTR (${c.ctr.toFixed(2)}%) bei "${c.campaign_name}"`,
          detail: `${c.impressions} Impressions, nur ${c.clicks} Klicks. Headlines & Description Lines überarbeiten.`,
          metric: `${c.clicks}/${c.impressions} clicks`,
          action: 'Neue Anzeigen-Variante testen',
        })
      }
    }

    // 9.4: Google-Ads-Kampagne mit hohem CPA
    for (const c of adsCampaigns) {
      if (c.conversions > 0 && c.cpa > 30) {
        quickWins.push({
          severity: 'high',
          category: 'Budget',
          title: `Hoher CPA bei "${c.campaign_name}" (CHF ${c.cpa.toFixed(2)})`,
          detail: `${c.conversions} Conversions zu CHF ${c.cost.toFixed(2)} Kosten. Negative Keywords / Match-Types prüfen.`,
          metric: `CPA CHF ${c.cpa.toFixed(2)}`,
          action: 'Negative Keywords + Targeting',
        })
      }
    }

    // 9.5: Booking-Funnel Drop-off
    if (viewedEvents > 30 && bookingFunnelRate < 30) {
      quickWins.push({
        severity: 'high',
        category: 'Conversion',
        title: 'Booking-Page Drop-off zu hoch',
        detail: `Nur ${bookingFunnelRate.toFixed(1)}% der Booking-Page-Besucher schliessen ab (${completedEvents}/${viewedEvents}). UX/Friction-Audit nötig.`,
        metric: `${bookingFunnelRate.toFixed(1)}% Funnel-Rate`,
        action: 'Booking-Flow Friction-Audit',
      })
    }

    // 9.6: Server-Side Conversion-Uploads fehlerhaft
    if (failedUploads > 0) {
      quickWins.push({
        severity: 'high',
        category: 'Tracking',
        title: `${failedUploads} Google-Ads Conversion-Uploads fehlgeschlagen`,
        detail: 'Reale Bookings wurden nicht ans Google Ads gemeldet → Bid-Optimization arbeitet mit unvollständigen Daten.',
        metric: `${failedUploads} Fehler / ${successfulUploads} erfolgreich`,
        action: 'Logs in google_ads_conversion_uploads prüfen',
      })
    }

    // 9.7: Hoher Anteil Direct-Bookings ohne Attribution
    const directBookings = channels['Direct'].bookings
    if (bookings.length > 20 && directBookings / Math.max(bookings.length, 1) > 0.5) {
      quickWins.push({
        severity: 'medium',
        category: 'Attribution',
        title: `${directBookings} Bookings ohne Attribution-Daten`,
        detail: 'Mehr als die Hälfte der Bookings hat keine UTM/gclid. Cross-Domain-Forwarding prüfen, ggf. UTM-Tagging in Posts/Newsletter erweitern.',
        metric: `${Math.round((directBookings / bookings.length) * 100)}% direkt`,
        action: 'UTM-Coverage erweitern',
      })
    }

    // 9.8: Bookings vs. Vorperiode
    if (prevBookings.length >= 5 && bookings.length < prevBookings.length * 0.85) {
      quickWins.push({
        severity: 'high',
        category: 'Trend',
        title: `Bookings sinken um ${Math.abs(bookingGrowthPct).toFixed(1)}%`,
        detail: `${bookings.length} statt ${prevBookings.length} im Vergleichszeitraum. Ursachenanalyse: Saisonalität? Wettbewerber? Ranking-Verluste?`,
        metric: `${bookingGrowthPct.toFixed(1)}% vs. Vorperiode`,
        action: 'Root-Cause-Analyse',
      })
    }

    // 9.9: Abandoned Bookings (Funnel-Ausstieg nach Start)
    if (abandonedEvents > 5 && startedEvents > 0) {
      const abandonRate = (abandonedEvents / Math.max(startedEvents + completedEvents, 1)) * 100
      if (abandonRate > 30) {
        quickWins.push({
          severity: 'medium',
          category: 'Conversion',
          title: `${abandonedEvents} abgebrochene Buchungen`,
          detail: `${abandonRate.toFixed(1)}% der Booking-Starts werden abgebrochen. Field-Validation / Required-Fields / Preis-Transparenz prüfen.`,
          metric: `${abandonRate.toFixed(1)}% Abandon-Rate`,
          action: 'Form-Analytics & A/B-Test',
        })
      }
    }

    // 9.10: Bookings ohne gclid trotz utm_medium=cpc → Tracking-Verlust
    const cpcWithoutGclid = bookings.filter((a: any) => a.utm_medium === 'cpc' && !a.gclid).length
    if (cpcWithoutGclid > 2) {
      quickWins.push({
        severity: 'medium',
        category: 'Tracking',
        title: `${cpcWithoutGclid} Paid-Bookings ohne gclid`,
        detail: 'Ad-Click-IDs gehen verloren. URL-Auto-Tagging in Google Ads aktivieren oder Cross-Domain-Forwarding prüfen.',
        metric: `${cpcWithoutGclid} verloren`,
        action: 'Auto-Tagging verifizieren',
      })
    }

    // ============ 10. RESPONSE ============
    const took = Date.now() - start

    return {
      ok: true,
      took_ms: took,
      window: {
        days,
        since: sinceDate,
        until: now.toISOString().split('T')[0],
        prev_since: prevSinceDate,
        prev_until: prevUntilDate,
      },
      tenants,
      summary: {
        // Bookings
        bookings: bookings.length,
        onlineBookings: onlineBookings.length,
        cancelledBookings: cancelled.length,
        prevBookings: prevBookings.length,
        bookingGrowthPct,
        paidBookings,
        directBookings,
        // Traffic
        sessions: totalSessionsGA4,
        users: totalUsersGA4,
        pageViews: totalPageViewsGA4,
        // SEO
        gscImpressions: totalImpressionsGSC,
        gscClicks: totalClicksGSC,
        gscAvgPosition: Math.round(avgPositionGSC * 100) / 100,
        gscCtr: totalImpressionsGSC > 0 ? Math.round((totalClicksGSC / totalImpressionsGSC) * 10000) / 100 : 0,
        // Ads
        googleSpend: Math.round(totalGoogleSpend * 100) / 100,
        googleClicks: totalGoogleClicks,
        googleImpressions: totalGoogleImpressions,
        metaSpend: Math.round(totalMetaSpend * 100) / 100,
        metaClicks: totalMetaClicks,
        metaImpressions: totalMetaImpressions,
        totalAdSpend: Math.round(totalAdSpend * 100) / 100,
        // Conversion
        conversionRate: Math.round(conversionRate * 100) / 100,
        costPerBooking: Math.round(costPerBooking * 100) / 100,
        overallCPA: Math.round(overallCPA * 100) / 100,
        // Funnel events
        bookingPageViewed: viewedEvents,
        bookingStarted: startedEvents,
        bookingCompleted: completedEvents,
        bookingAbandoned: abandonedEvents,
        bookingFunnelRate: Math.round(bookingFunnelRate * 100) / 100,
        // Conversion tracking
        conversionUploadsSuccess: successfulUploads,
        conversionUploadsFailed: failedUploads,
      },
      channels: Object.entries(channels).map(([name, v]) => ({
        name,
        sessions: v.sessions,
        bookings: v.bookings,
        spend: Math.round(v.spend * 100) / 100,
        clicks: v.clicks,
        impressions: v.impressions,
      })),
      funnel,
      trend,
      topQueries,
      topPages,
      topGa4Pages,
      adsCampaigns,
      quickWins: quickWins.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 }
        return order[a.severity] - order[b.severity]
      }),
    }
  } catch (err: any) {
    logger.error('marketing-overview error', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Fehler beim Laden der Marketing-Übersicht',
      data: { message: err?.message ?? String(err) },
    })
  }
})
