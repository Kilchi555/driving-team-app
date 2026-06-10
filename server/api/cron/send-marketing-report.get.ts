// server/api/cron/send-marketing-report.get.ts
// ============================================================
// Weekly combined marketing performance report.
//
// Schedule: every Monday at 07:30 UTC (after weekly-marketing-review at 07:00)
// Recipient: tenant.contact_email (or MARKETING_REPORT_EMAIL env override)
//
// Covers (last 7 days + 12-week trend):
//   - Business: bookings + revenue + Last-Click attribution (Google Ads / Meta / Organic)
//   - Paid: Google Ads CPA, Meta Ads CPA, Blended CPA
//   - Organic: GSC clicks, impressions, CTR, avg position, top/falling queries
//   - Website: GA4 sessions, conversions, CVR by channel
//   - Actions: top recommendations from weekly-marketing-review
//
// Test mode: GET /api/cron/send-marketing-report?test_tenant_id=<UUID>
// ============================================================

import { getSupabaseAdmin } from '~/utils/supabase'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { getHeader, getQuery } from 'h3'

// ── Helpers ──────────────────────────────────────────────────────────────────

function chf(rappen: number): string {
  return `CHF ${(rappen / 100).toFixed(0)}`
}

function chfExact(rappen: number): string {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

function pct(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${(value / total * 100).toFixed(1)}%`
}

function fmt(n: number): string {
  return n.toLocaleString('de-CH')
}

function delta(current: number, previous: number): { text: string; color: string } {
  if (previous === 0) return { text: '–', color: '#6b7280' }
  const pct = ((current - previous) / previous * 100)
  const sign = pct >= 0 ? '▲' : '▼'
  const color = pct >= 0 ? '#16a34a' : '#dc2626'
  return { text: `${sign} ${Math.abs(pct).toFixed(0)}%`, color }
}

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d)
  mon.setDate(diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

function addWeeks(d: Date, weeks: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + weeks * 7)
  return r
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function weekLabel(monday: Date): string {
  return monday.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' })
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

// ── Attribution helper ────────────────────────────────────────────────────────

function getChannel(apt: any): 'google_ads' | 'meta_ads' | 'other_paid' | 'organic' | 'direct' {
  if (apt.gclid) return 'google_ads'
  if (apt.fbclid) return 'meta_ads'
  if (apt.utm_medium && ['cpc', 'paid', 'paidsearch', 'ppc'].includes(apt.utm_medium.toLowerCase())) return 'other_paid'
  if (apt.utm_source || apt.utm_medium || apt.utm_campaign) return 'organic'
  return 'direct'
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const query = getQuery(event)
  const testTenantId = typeof query.test_tenant_id === 'string' ? query.test_tenant_id : null

  // Get tenants with marketing credentials
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, slug, name, contact_email')
    .not('ga4_property_id', 'is', null)

  if (!tenants?.length) return { success: false, reason: 'no_tenants' }

  const results: any[] = []

  for (const tenant of tenants) {
    if (testTenantId && tenant.id !== testTenantId) continue

    try {
      const result = await sendReport(supabase, tenant)
      results.push({ tenant: tenant.slug, ...result })
    } catch (err: any) {
      logger.error(`❌ send-marketing-report failed for ${tenant.slug}: ${err.message}`)
      results.push({ tenant: tenant.slug, error: err.message })
    }
  }

  return { success: true, results }
})

// ── Report generation ─────────────────────────────────────────────────────────

async function sendReport(supabase: any, tenant: { id: string; slug: string; name: string; contact_email: string }) {
  const now = new Date()
  const thisMonday = getMonday(now)
  const lastMonday = addWeeks(thisMonday, -1)
  const weekStart = dateStr(lastMonday)
  const weekEnd = dateStr(thisMonday)

  // 12-week window
  const twelveWeeksAgo = addWeeks(thisMonday, -12)
  const twelveWeeksAgoStr = dateStr(twelveWeeksAgo)

  // ── 1. Fetch all data in parallel ─────────────────────────────────────────
  const [
    appointmentsRes,
    paymentsRes,
    ga4Res,
    gscCurrentRes,
    gscPrevRes,
    googleAdsRes,
    metaAdsRes,
    weeklyReviewsRes,
  ] = await Promise.all([
    // This week's appointments (with attribution)
    supabase
      .from('appointments')
      .select('id, type, status, gclid, fbclid, utm_source, utm_medium, utm_campaign, created_at')
      .eq('tenant_id', tenant.id)
      .gte('created_at', weekStart)
      .lt('created_at', weekEnd)
      .is('deleted_at', null),

    // This week's completed payments
    supabase
      .from('payments')
      .select('total_amount_rappen, lesson_price_rappen, admin_fee_rappen, appointment_id, payment_status')
      .eq('tenant_id', tenant.id)
      .eq('payment_status', 'completed')
      .gte('created_at', weekStart)
      .lt('created_at', weekEnd),

    // GA4: last 7 days by channel
    supabase
      .from('marketing_ga4_daily')
      .select('date, channel, sessions, conversions, bounce_rate')
      .eq('tenant_id', tenant.id)
      .gte('date', weekStart)
      .lt('date', weekEnd),

    // GSC: this week (top queries, aggregate)
    supabase
      .from('marketing_gsc_daily')
      .select('query, clicks, impressions, position')
      .eq('tenant_id', tenant.id)
      .gte('date', weekStart)
      .lt('date', weekEnd),

    // GSC: prev week (for comparison)
    supabase
      .from('marketing_gsc_daily')
      .select('query, clicks, impressions, position')
      .eq('tenant_id', tenant.id)
      .gte('date', dateStr(addWeeks(lastMonday, -1)))
      .lt('date', weekStart),

    // Google Ads: last 7 days
    supabase
      .from('marketing_google_ads_daily')
      .select('campaign_name, cost_micros, clicks, impressions, conversions')
      .eq('tenant_id', tenant.id)
      .gte('date', weekStart)
      .lt('date', weekEnd),

    // Meta Ads: last 7 days
    supabase
      .from('marketing_meta_ads_daily')
      .select('campaign_name, spend, clicks, impressions, reach, actions')
      .eq('tenant_id', tenant.id)
      .gte('date', weekStart)
      .lt('date', weekEnd),

    // Last 12 weekly reviews for trend
    supabase
      .from('marketing_weekly_reviews')
      .select('week_number, year, metrics, top_actions, generated_at')
      .eq('tenant_id', tenant.id)
      .gte('generated_at', twelveWeeksAgoStr)
      .order('generated_at', { ascending: false })
      .limit(12),
  ])

  const appointments: any[] = appointmentsRes.data ?? []
  const payments: any[] = paymentsRes.data ?? []
  const ga4: any[] = ga4Res.data ?? []
  const gscCurrent: any[] = gscCurrentRes.data ?? []
  const gscPrev: any[] = gscPrevRes.data ?? []
  const googleAds: any[] = googleAdsRes.data ?? []
  const metaAds: any[] = metaAdsRes.data ?? []
  const weeklyReviews: any[] = weeklyReviewsRes.data ?? []

  // ── 2. Compute booking metrics ────────────────────────────────────────────

  const activeApts = appointments.filter(a => a.status !== 'cancelled')
  const cancelledApts = appointments.filter(a => a.status === 'cancelled')
  const totalBookings = activeApts.length
  const cancellations = cancelledApts.length

  // Category breakdown (B / Motorrad / Anhänger / LKW / Kurs)
  const B_CATS = new Set(['B', 'B Schaltung', 'B Automatik'])
  const MOTO_CATS = new Set(['A', 'A1', 'A35kW'])
  const LKW_CATS = new Set(['C', 'C1', 'CE', 'C1E', 'D', 'D1'])
  const ANHAENGER_CATS = new Set(['BE', 'C1E-only', 'DE'])

  const catCounts: Record<string, number> = { auto: 0, moto: 0, anhaenger: 0, lkw: 0, boot: 0, other: 0 }
  for (const apt of activeApts) {
    if (B_CATS.has(apt.type)) catCounts.auto++
    else if (MOTO_CATS.has(apt.type)) catCounts.moto++
    else if (ANHAENGER_CATS.has(apt.type)) catCounts.anhaenger++
    else if (LKW_CATS.has(apt.type)) catCounts.lkw++
    else if (['Boot', 'Motorboot'].includes(apt.type)) catCounts.boot++
    else catCounts.other++
  }

  // Attribution breakdown (Last-Click)
  const attrCounts: Record<string, number> = {
    google_ads: 0, meta_ads: 0, other_paid: 0, organic: 0, direct: 0
  }
  for (const apt of activeApts) {
    attrCounts[getChannel(apt)]++
  }

  // Revenue
  const totalRevenuRappen = payments.reduce((s, p) => s + (p.total_amount_rappen ?? (p.lesson_price_rappen ?? 0) + (p.admin_fee_rappen ?? 0)), 0)

  // ── 3. Compute paid ads metrics ───────────────────────────────────────────

  const googleSpendCHF = googleAds.reduce((s, r) => s + (r.cost_micros ?? 0) / 1_000_000, 0)
  const googleClicks = googleAds.reduce((s, r) => s + (r.clicks ?? 0), 0)
  const googleConversions = googleAds.reduce((s, r) => s + (r.conversions ?? 0), 0)
  const googleCpa = googleConversions > 0 ? googleSpendCHF / googleConversions : null
  const googleCpc = googleClicks > 0 ? googleSpendCHF / googleClicks : null

  const metaSpendCHF = metaAds.reduce((s, r) => s + Number(r.spend ?? 0), 0)
  const metaClicks = metaAds.reduce((s, r) => s + (r.clicks ?? 0), 0)
  const metaImpressions = metaAds.reduce((s, r) => s + (r.impressions ?? 0), 0)
  const metaConversions = metaAds.reduce((s, r) => {
    const acts: any[] = r.actions ?? []
    const purchases = acts.find((a: any) => a.action_type === 'purchase' || a.action_type === 'omni_purchase')
    return s + (purchases ? Number(purchases.value ?? 0) : 0)
  }, 0)
  const metaCpa = metaConversions > 0 ? metaSpendCHF / metaConversions : null
  const metaCpc = metaClicks > 0 ? metaSpendCHF / metaClicks : null
  const metaCtr = metaImpressions > 0 ? metaClicks / metaImpressions * 100 : 0

  const totalSpendCHF = googleSpendCHF + metaSpendCHF
  const paidBookings = attrCounts.google_ads + attrCounts.meta_ads
  const blendedCpa = paidBookings > 0 ? totalSpendCHF / paidBookings : null

  // ── 4. GSC metrics ────────────────────────────────────────────────────────

  const gscAgg = (rows: any[]) => {
    const map = new Map<string, { clicks: number; impressions: number; positions: number[] }>()
    for (const r of rows) {
      const e = map.get(r.query) ?? { clicks: 0, impressions: 0, positions: [] }
      map.set(r.query, { clicks: e.clicks + (r.clicks ?? 0), impressions: e.impressions + (r.impressions ?? 0), positions: [...e.positions, r.position] })
    }
    return map
  }

  const gscCurrentMap = gscAgg(gscCurrent)
  const gscPrevMap = gscAgg(gscPrev)

  const gscTotalClicks = [...gscCurrentMap.values()].reduce((s, v) => s + v.clicks, 0)
  const gscTotalImpressions = [...gscCurrentMap.values()].reduce((s, v) => s + v.impressions, 0)
  const gscCtr = gscTotalImpressions > 0 ? gscTotalClicks / gscTotalImpressions * 100 : 0
  const allPositions = [...gscCurrentMap.values()].flatMap(v => v.positions)
  const gscAvgPos = allPositions.length > 0 ? allPositions.reduce((s, p) => s + p, 0) / allPositions.length : 0

  const gscPrevClicks = [...gscPrevMap.values()].reduce((s, v) => s + v.clicks, 0)

  // Top rising queries (biggest click increase vs prev week)
  const risingQueries = [...gscCurrentMap.entries()]
    .map(([q, curr]) => {
      const prev = gscPrevMap.get(q) ?? { clicks: 0, impressions: 0, positions: [] }
      return { q, clicks: curr.clicks, prevClicks: prev.clicks, diff: curr.clicks - prev.clicks, impressions: curr.impressions, avgPos: curr.positions.reduce((s, p) => s + p, 0) / Math.max(1, curr.positions.length) }
    })
    .filter(r => r.impressions >= 10)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 3)

  // Top falling queries
  const fallingQueries = [...gscCurrentMap.entries()]
    .map(([q, curr]) => {
      const prev = gscPrevMap.get(q) ?? { clicks: 0, impressions: 0, positions: [] }
      return { q, clicks: curr.clicks, prevClicks: prev.clicks, diff: curr.clicks - prev.clicks, impressions: curr.impressions }
    })
    .filter(r => r.diff < -3 && r.impressions >= 10)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 3)

  // ── 5. GA4 metrics ────────────────────────────────────────────────────────

  const MARKETING_CHANNELS = ['Organic Search', 'Paid Search', 'Referral', 'Organic Social', 'Email', 'Affiliates']
  const ga4Marketing = ga4.filter(r => MARKETING_CHANNELS.includes(r.channel))
  const ga4All = ga4

  const totalSessions = ga4Marketing.reduce((s, r) => s + (r.sessions ?? 0), 0)
  const totalConversions = ga4Marketing.reduce((s, r) => s + (r.conversions ?? 0), 0)
  const cvr = totalSessions > 0 ? totalConversions / totalSessions * 100 : 0

  const channelMap = new Map<string, { sessions: number; conversions: number }>()
  for (const r of ga4All) {
    const ch = r.channel ?? 'Unbekannt'
    const e = channelMap.get(ch) ?? { sessions: 0, conversions: 0 }
    channelMap.set(ch, { sessions: e.sessions + (r.sessions ?? 0), conversions: e.conversions + (r.conversions ?? 0) })
  }

  const topChannels = [...channelMap.entries()]
    .sort((a, b) => b[1].sessions - a[1].sessions)
    .slice(0, 5)

  // ── 6. 12-week trend ──────────────────────────────────────────────────────

  // Also fetch 12 weeks of booking data for trend
  const { data: aptTrend } = await supabase
    .from('appointments')
    .select('created_at, gclid, fbclid, utm_source, utm_medium, status')
    .eq('tenant_id', tenant.id)
    .gte('created_at', twelveWeeksAgoStr)
    .is('deleted_at', null)

  const weeks: Array<{ label: string; monday: Date; bookings: number; paidBookings: number; googleSpend: number; metaSpend: number; sessions: number; gscClicks: number }> = []

  for (let i = 11; i >= 0; i--) {
    const mon = addWeeks(thisMonday, -(i + 1))
    const sun = addWeeks(mon, 1)
    const monStr = dateStr(mon)
    const sunStr = dateStr(sun)

    const weekApts = (aptTrend ?? []).filter((a: any) => a.created_at >= monStr && a.created_at < sunStr && a.status !== 'cancelled')
    const weekPaidApts = weekApts.filter((a: any) => a.gclid || a.fbclid)
    const weekReview = weeklyReviews.find((r: any) => {
      const rDate = new Date(r.generated_at)
      return Math.abs(rDate.getTime() - mon.getTime()) < 8 * 24 * 60 * 60 * 1000
    })

    weeks.push({
      label: weekLabel(mon),
      monday: mon,
      bookings: weekApts.length,
      paidBookings: weekPaidApts.length,
      googleSpend: weekReview?.metrics?.googleSpendCHF ?? 0,
      metaSpend: weekReview?.metrics?.metaSpendCHF ?? 0,
      sessions: weekReview?.metrics?.totalSessions ?? 0,
      gscClicks: 0,
    })
  }

  // Latest review actions
  const latestReview = weeklyReviews[0]
  const topActions: string[] = latestReview?.top_actions ?? []

  // ── 7. Build email ────────────────────────────────────────────────────────

  const reportDate = now.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const weekRange = `${weekLabel(lastMonday)} – ${weekLabel(addWeeks(thisMonday, 0))}`

  // Booking attribution rows
  const attrRows = [
    { label: '🔵 Google Ads', key: 'google_ads', color: '#1a73e8', cpa: googleCpa ? chf(googleCpa * 100) : '–' },
    { label: '🟣 Meta Ads', key: 'meta_ads', color: '#1877f2', cpa: metaCpa ? chf(metaCpa * 100) : '–' },
    { label: '🟢 Organic / Direct', key: 'organic', color: '#16a34a', cpa: '–' },
    { label: '⚪ Direct / Unbekannt', key: 'direct', color: '#6b7280', cpa: '–' },
  ]

  const bookingAttrHtml = attrRows.map(row => {
    const count = attrCounts[row.key] ?? 0
    const share = totalBookings > 0 ? Math.round(count / totalBookings * 100) : 0
    return `<tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:8px 12px;font-size:13px;color:${row.color};font-weight:600">${row.label}</td>
      <td style="padding:8px 12px;font-size:14px;font-weight:700;text-align:center;color:#111827">${count}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:center;color:#6b7280">${share}%</td>
      <td style="padding:8px 12px;font-size:13px;text-align:right;color:#374151">${row.cpa}</td>
    </tr>`
  }).join('')

  // Category breakdown
  const catOrder = [
    { key: 'auto', icon: '🚗', label: 'Auto (Kat. B)' },
    { key: 'moto', icon: '🏍️', label: 'Motorrad (A/A1)' },
    { key: 'anhaenger', icon: '🚛', label: 'Anhänger (BE)' },
    { key: 'lkw', icon: '🚚', label: 'Lastwagen (C/CE)' },
    { key: 'boot', icon: '🚤', label: 'Motorboot' },
    { key: 'other', icon: '📋', label: 'Kurse / Sonstige' },
  ]

  const catHtml = catOrder
    .filter(c => catCounts[c.key] > 0)
    .map(c => `<tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:8px 12px;font-size:13px;color:#374151">${c.icon} ${c.label}</td>
      <td style="padding:8px 12px;font-size:14px;font-weight:700;text-align:center;color:#111827">${catCounts[c.key]}</td>
      <td style="padding:8px 12px;font-size:12px;color:#6b7280;text-align:center">${pct(catCounts[c.key], totalBookings)}</td>
    </tr>`).join('')

  // 12-week trend table
  const trendHeaderCells = weeks.map(w => `<th style="padding:4px 6px;font-size:10px;color:#9ca3af;white-space:nowrap;text-align:center">${w.label}</th>`).join('')
  const maxBookings = Math.max(...weeks.map(w => w.bookings), 1)
  const bookingCells = weeks.map(w => {
    const intensity = Math.round(w.bookings / maxBookings * 255)
    const bg = w.bookings === 0 ? '#f9fafb' : `rgba(37,99,235,${(w.bookings / maxBookings * 0.7 + 0.1).toFixed(2)})`
    const color = w.bookings / maxBookings > 0.5 ? '#fff' : '#1e3a8a'
    return `<td style="padding:6px 4px;text-align:center;background:${bg};color:${color};font-weight:700;font-size:13px;border-radius:4px">${w.bookings}</td>`
  }).join('')
  const spendCells = weeks.map(w => {
    const totalW = w.googleSpend + w.metaSpend
    return `<td style="padding:4px;text-align:center;font-size:11px;color:#6b7280">${totalW > 0 ? `${chf(totalW * 100)}` : '–'}</td>`
  }).join('')
  const sessionCells = weeks.map(w => {
    return `<td style="padding:4px;text-align:center;font-size:11px;color:#6b7280">${w.sessions > 0 ? fmt(w.sessions) : '–'}</td>`
  }).join('')

  // GSC query rows
  const risingHtml = risingQueries.length > 0
    ? risingQueries.map(q => `<tr style="border-bottom:1px solid #f0fdf4">
        <td style="padding:6px 10px;font-size:12px;color:#111827;max-width:220px;overflow:hidden;text-overflow:ellipsis">${q.q}</td>
        <td style="padding:6px 8px;font-size:12px;text-align:center;color:#16a34a;font-weight:600">▲ ${q.clicks}</td>
        <td style="padding:6px 8px;font-size:12px;text-align:center;color:#6b7280">${q.avgPos.toFixed(1)}</td>
      </tr>`).join('')
    : '<tr><td colspan="3" style="padding:12px;text-align:center;font-size:12px;color:#9ca3af">Keine Daten</td></tr>'

  const fallingHtml = fallingQueries.length > 0
    ? fallingQueries.map(q => `<tr style="border-bottom:1px solid #fef2f2">
        <td style="padding:6px 10px;font-size:12px;color:#111827;max-width:220px;overflow:hidden;text-overflow:ellipsis">${q.q}</td>
        <td style="padding:6px 8px;font-size:12px;text-align:center;color:#dc2626;font-weight:600">▼ ${Math.abs(q.diff)}</td>
        <td style="padding:6px 8px;font-size:12px;text-align:center;color:#6b7280">${q.clicks}</td>
      </tr>`).join('')
    : '<tr><td colspan="3" style="padding:12px;text-align:center;font-size:12px;color:#9ca3af">Keine Verluste</td></tr>'

  // GA4 channel rows
  const channelRows = topChannels.map(([ch, data]) => {
    const chCvr = data.sessions > 0 ? data.conversions / data.sessions * 100 : 0
    return `<tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:7px 10px;font-size:12px;color:#374151">${ch}</td>
      <td style="padding:7px 8px;font-size:13px;font-weight:600;text-align:center;color:#111827">${fmt(data.sessions)}</td>
      <td style="padding:7px 8px;font-size:12px;text-align:center;color:#6b7280">${data.conversions}</td>
      <td style="padding:7px 8px;font-size:12px;text-align:center;color:${chCvr >= 10 ? '#16a34a' : chCvr >= 5 ? '#d97706' : '#dc2626'};font-weight:600">${chCvr.toFixed(1)}%</td>
    </tr>`
  }).join('')

  // Top actions
  const actionsHtml = topActions.length > 0
    ? topActions.slice(0, 5).map((action, i) => `
      <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f3f4f6">
        <div style="width:22px;height:22px;border-radius:50%;background:#dbeafe;color:#1e40af;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;line-height:22px;text-align:center">${i + 1}</div>
        <p style="margin:0;font-size:12px;color:#374151;line-height:1.5">${action}</p>
      </div>`).join('')
    : '<p style="font-size:12px;color:#9ca3af;margin:0">Keine Empfehlungen verfügbar</p>'

  const clicksDelta = delta(gscTotalClicks, gscPrevClicks)

  const emailBody = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e3a8a);border-radius:14px 14px 0 0;padding:28px 32px 24px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em">Wöchentlicher Marketing Report</p>
        <h1 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#fff">${tenant.name ?? 'Driving Team'}</h1>
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6)">Woche ${getISOWeek(lastMonday)}/${lastMonday.getFullYear()} · ${weekRange}</p>
      </div>
      <div style="text-align:right">
        <div style="font-size:28px;font-weight:900;color:#fff">${totalBookings}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.5);text-transform:uppercase">Buchungen</div>
      </div>
    </div>
  </td></tr>

  <!-- KPI Bar -->
  <tr><td style="background:#fff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:16px 12px;text-align:center;border-right:1px solid #f3f4f6">
          <div style="font-size:20px;font-weight:800;color:#111827">${totalBookings}</div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;margin-top:2px">Buchungen</div>
          <div style="font-size:10px;color:${cancellations > 2 ? '#dc2626' : '#6b7280'};margin-top:1px">${cancellations} Storno</div>
        </td>
        <td style="padding:16px 12px;text-align:center;border-right:1px solid #f3f4f6">
          <div style="font-size:20px;font-weight:800;color:#16a34a">${totalRevenuRappen > 0 ? chf(totalRevenuRappen) : '–'}</div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;margin-top:2px">Umsatz</div>
          <div style="font-size:10px;color:#6b7280;margin-top:1px">${payments.length} Zahlungen</div>
        </td>
        <td style="padding:16px 12px;text-align:center;border-right:1px solid #f3f4f6">
          <div style="font-size:20px;font-weight:800;color:#1e40af">${totalSpendCHF > 0 ? chf(totalSpendCHF * 100) : '–'}</div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;margin-top:2px">Ads Spend</div>
          <div style="font-size:10px;color:#6b7280;margin-top:1px">Google + Meta</div>
        </td>
        <td style="padding:16px 12px;text-align:center;border-right:1px solid #f3f4f6">
          <div style="font-size:20px;font-weight:800;color:${blendedCpa && blendedCpa < 300 ? '#16a34a' : '#d97706'}">${blendedCpa ? chf(blendedCpa * 100) : '–'}</div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;margin-top:2px">Blended CPA</div>
          <div style="font-size:10px;color:#6b7280;margin-top:1px">Spend ÷ Paid</div>
        </td>
        <td style="padding:16px 12px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:#7c3aed">${fmt(totalSessions)}</div>
          <div style="font-size:10px;color:#9ca3af;text-transform:uppercase;margin-top:2px">Sessions</div>
          <div style="font-size:10px;color:${cvr >= 10 ? '#16a34a' : '#d97706'};margin-top:1px">CVR ${cvr.toFixed(1)}%</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- 12-Week Trend -->
  <tr><td style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:20px 24px">
    <h2 style="margin:0 0 14px;font-size:14px;font-weight:700;color:#111827">📈 12-Wochen Buchungstrend</h2>
    <div style="overflow-x:auto">
      <table cellpadding="0" cellspacing="2" style="width:100%;min-width:500px;border-collapse:separate;border-spacing:2px">
        <thead>
          <tr>
            <th style="padding:4px 8px;font-size:10px;color:#9ca3af;text-align:left;white-space:nowrap">Woche</th>
            ${trendHeaderCells}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:4px 8px;font-size:10px;color:#6b7280;white-space:nowrap">Buchungen</td>
            ${bookingCells}
          </tr>
          <tr>
            <td style="padding:4px 8px;font-size:10px;color:#6b7280;white-space:nowrap">Ads Spend</td>
            ${spendCells}
          </tr>
          <tr>
            <td style="padding:4px 8px;font-size:10px;color:#6b7280;white-space:nowrap">Sessions</td>
            ${sessionCells}
          </tr>
        </tbody>
      </table>
    </div>
  </td></tr>

  <!-- Attribution + Categories -->
  <tr><td style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:0">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <!-- Attribution -->
        <td style="width:55%;padding:20px 24px;vertical-align:top;border-right:1px solid #f3f4f6">
          <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111827">🎯 Buchungs-Attribution (Last-Click)</h2>
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:6px 10px;font-size:10px;color:#9ca3af;text-align:left;text-transform:uppercase">Kanal</th>
                <th style="padding:6px 8px;font-size:10px;color:#9ca3af;text-align:center;text-transform:uppercase">Buchungen</th>
                <th style="padding:6px 8px;font-size:10px;color:#9ca3af;text-align:center;text-transform:uppercase">Anteil</th>
                <th style="padding:6px 8px;font-size:10px;color:#9ca3af;text-align:right;text-transform:uppercase">CPA</th>
              </tr>
            </thead>
            <tbody>${bookingAttrHtml}</tbody>
          </table>
          ${blendedCpa ? `<div style="margin-top:10px;padding:8px 10px;background:#eff6ff;border-radius:6px;font-size:12px;color:#1e40af">
            <strong>Blended CPA: ${chf(blendedCpa * 100)}</strong> — CHF ${totalSpendCHF.toFixed(0)} Spend ÷ ${paidBookings} bezahlte Buchungen
          </div>` : ''}
        </td>
        <!-- Categories -->
        <td style="width:45%;padding:20px 24px;vertical-align:top">
          <h2 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#111827">📋 Kategorien</h2>
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:6px 10px;font-size:10px;color:#9ca3af;text-align:left;text-transform:uppercase">Kategorie</th>
                <th style="padding:6px 8px;font-size:10px;color:#9ca3af;text-align:center;text-transform:uppercase">#</th>
                <th style="padding:6px 8px;font-size:10px;color:#9ca3af;text-align:center;text-transform:uppercase">%</th>
              </tr>
            </thead>
            <tbody>${catHtml || '<tr><td colspan="3" style="padding:12px;text-align:center;font-size:12px;color:#9ca3af">Keine Buchungen</td></tr>'}</tbody>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Paid Ads: Google + Meta -->
  <tr><td style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:0">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <!-- Google Ads -->
        <td style="width:50%;padding:20px 24px;vertical-align:top;border-right:1px solid #f3f4f6">
          <h2 style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827">🔵 Google Ads</h2>
          <p style="margin:0 0 12px;font-size:11px;color:#9ca3af">Letzte 7 Tage</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${kpiRow('Spend', googleSpendCHF > 0 ? `CHF ${googleSpendCHF.toFixed(0)}` : '–')}
            ${kpiRow('Klicks', fmt(googleClicks))}
            ${kpiRow('CPC', googleCpc ? `CHF ${googleCpc.toFixed(2)}` : '–')}
            ${kpiRow('Conversions', String(Math.round(googleConversions)))}
            ${kpiRow('CPA (Google)', googleCpa ? `CHF ${googleCpa.toFixed(0)}` : '–', googleCpa && googleCpa < 200 ? '#16a34a' : '#d97706')}
          </table>
        </td>
        <!-- Meta Ads -->
        <td style="width:50%;padding:20px 24px;vertical-align:top">
          <h2 style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827">🟣 Meta Ads</h2>
          <p style="margin:0 0 12px;font-size:11px;color:#9ca3af">Letzte 7 Tage</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${kpiRow('Spend', metaSpendCHF > 0 ? `CHF ${metaSpendCHF.toFixed(0)}` : '–')}
            ${kpiRow('Impressionen', fmt(metaImpressions))}
            ${kpiRow('CTR', `${metaCtr.toFixed(2)}%`)}
            ${kpiRow('CPC', metaCpc ? `CHF ${metaCpc.toFixed(2)}` : '–')}
            ${kpiRow('CPA (Meta)', metaCpa ? `CHF ${metaCpa.toFixed(0)}` : '–', metaCpa && metaCpa < 200 ? '#16a34a' : '#d97706')}
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- SEO + GA4 -->
  <tr><td style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:0">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <!-- GSC -->
        <td style="width:55%;padding:20px 24px;vertical-align:top;border-right:1px solid #f3f4f6">
          <h2 style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827">🟢 SEO (Google Search Console)</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px">
            ${kpiRow('Klicks', `${fmt(gscTotalClicks)} <span style="font-size:10px;color:${clicksDelta.color}">${clicksDelta.text}</span>`)}
            ${kpiRow('Impressionen', fmt(gscTotalImpressions))}
            ${kpiRow('Ø CTR', `${gscCtr.toFixed(1)}%`, gscCtr >= 5 ? '#16a34a' : '#d97706')}
            ${kpiRow('Ø Position', gscAvgPos.toFixed(1), gscAvgPos <= 5 ? '#16a34a' : gscAvgPos <= 10 ? '#d97706' : '#dc2626')}
          </table>

          <div style="margin-bottom:10px">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase">▲ Steigende Queries</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead><tr style="background:#f0fdf4">
                <th style="padding:4px 8px;font-size:10px;color:#6b7280;text-align:left">Query</th>
                <th style="padding:4px 8px;font-size:10px;color:#6b7280;text-align:center">Klicks</th>
                <th style="padding:4px 8px;font-size:10px;color:#6b7280;text-align:center">Pos.</th>
              </tr></thead>
              <tbody>${risingHtml}</tbody>
            </table>
          </div>

          <div>
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase">▼ Fallende Queries</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead><tr style="background:#fef2f2">
                <th style="padding:4px 8px;font-size:10px;color:#6b7280;text-align:left">Query</th>
                <th style="padding:4px 8px;font-size:10px;color:#6b7280;text-align:center">Differenz</th>
                <th style="padding:4px 8px;font-size:10px;color:#6b7280;text-align:center">Klicks</th>
              </tr></thead>
              <tbody>${fallingHtml}</tbody>
            </table>
          </div>
        </td>

        <!-- GA4 Channels -->
        <td style="width:45%;padding:20px 24px;vertical-align:top">
          <h2 style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827">📊 GA4 Kanäle</h2>
          <p style="margin:0 0 12px;font-size:11px;color:#9ca3af">Sessions · Conversions · CVR</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead><tr style="background:#f9fafb">
              <th style="padding:6px 8px;font-size:10px;color:#9ca3af;text-align:left;text-transform:uppercase">Kanal</th>
              <th style="padding:6px 6px;font-size:10px;color:#9ca3af;text-align:center;text-transform:uppercase">Sessions</th>
              <th style="padding:6px 6px;font-size:10px;color:#9ca3af;text-align:center;text-transform:uppercase">Conv.</th>
              <th style="padding:6px 6px;font-size:10px;color:#9ca3af;text-align:center;text-transform:uppercase">CVR</th>
            </tr></thead>
            <tbody>${channelRows || '<tr><td colspan="4" style="padding:12px;text-align:center;font-size:12px;color:#9ca3af">Keine Daten</td></tr>'}</tbody>
          </table>
          <div style="margin-top:12px;padding:8px 10px;background:#f5f3ff;border-radius:6px">
            <p style="margin:0;font-size:12px;color:#7c3aed;font-weight:600">Gesamt CVR: ${cvr.toFixed(1)}%</p>
            <p style="margin:2px 0 0;font-size:11px;color:#a78bfa">${fmt(totalSessions)} Sessions → ${totalConversions} Conversions</p>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Top Actions -->
  ${topActions.length > 0 ? `<tr><td style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:20px 24px">
    <h2 style="margin:0 0 14px;font-size:14px;font-weight:700;color:#111827">⚡ Top 5 Massnahmen diese Woche</h2>
    ${actionsHtml}
  </td></tr>` : ''}

  <!-- Footer -->
  <tr><td style="background:#f8fafc;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:16px 24px;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af">
      ${tenant.name ?? 'Driving Team'} · KW ${getISOWeek(lastMonday)}/${lastMonday.getFullYear()} · Automatisch generiert am ${reportDate} · 
      <a href="https://app.simy.ch/admin/marketing" style="color:#2563eb;text-decoration:none">Marketing Dashboard →</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  // ── 8. Send ────────────────────────────────────────────────────────────────
  const recipient = process.env.MARKETING_REPORT_EMAIL ?? tenant.contact_email
  if (!recipient) {
    logger.warn(`⚠️ No recipient for marketing report (tenant ${tenant.slug})`)
    return { skipped: true, reason: 'no_recipient' }
  }

  await sendEmail({
    to: recipient,
    subject: `📊 Marketing Report KW${getISOWeek(lastMonday)} · ${totalBookings} Buchungen · ${totalSpendCHF > 0 ? `${chf(totalSpendCHF * 100)} Spend` : 'kein Spend'} · CVR ${cvr.toFixed(1)}%`,
    html: emailBody,
  })

  logger.debug(`✅ send-marketing-report: sent to ${recipient} (${tenant.slug}, ${totalBookings} bookings, ${chf(totalSpendCHF * 100)} spend)`)

  return {
    sent: true,
    recipient,
    bookings: totalBookings,
    spendCHF: totalSpendCHF.toFixed(0),
    cvr: cvr.toFixed(1),
  }
}

// ── Shared table row helper ───────────────────────────────────────────────────

function kpiRow(label: string, value: string, valueColor = '#111827'): string {
  return `<tr style="border-bottom:1px solid #f9fafb">
    <td style="padding:6px 0;font-size:12px;color:#6b7280">${label}</td>
    <td style="padding:6px 0;font-size:13px;font-weight:700;color:${valueColor};text-align:right">${value}</td>
  </tr>`
}
