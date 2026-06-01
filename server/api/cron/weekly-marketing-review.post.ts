import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

// Runs every Monday at 07:00 via Vercel Cron.
// Analyzes the past 7 days of GA4, GSC, Google Ads data and generates
// a prioritized Top-5 action list + low-hanging fruits per tenant.
export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const since = new Date()
  since.setDate(since.getDate() - 7)
  const sinceStr = since.toISOString().split('T')[0]

  // Get all tenants with marketing credentials
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, slug')
    .not('ga4_property_id', 'is', null)

  if (!tenants?.length) return { success: false, reason: 'no_tenants' }

  const results: any[] = []

  for (const tenant of tenants) {
    try {
      const review = await generateReview(supabase, tenant.id, sinceStr)
      results.push({ tenant: tenant.slug, ...review })
    } catch (err: any) {
      logger.error(`weekly-review: failed for ${tenant.slug}: ${err.message}`)
      results.push({ tenant: tenant.slug, error: err.message })
    }
  }

  return { success: true, results }
})

async function generateReview(supabase: any, tenantId: string, since: string) {
  const now = new Date()
  const weekNumber = getISOWeek(now)
  const year = now.getFullYear()

  // ── Fetch data in parallel ──────────────────────────────────────────────
  const [ga4Res, gscOppRes, gscCtrRes, adsRes] = await Promise.all([
    // GA4: sessions + conversions by channel last 7 days
    supabase
      .from('marketing_ga4_daily')
      .select('date, channel, sessions, conversions')
      .eq('tenant_id', tenantId)
      .gte('date', since),

    // GSC: keywords on position 4-15 (SEO opportunities)
    supabase
      .from('marketing_gsc_daily')
      .select('query, page, clicks, impressions, position')
      .eq('tenant_id', tenantId)
      .gte('date', since)
      .gte('position', 4)
      .lte('position', 15),

    // GSC: position < 5 but low clicks (CTR bugs)
    supabase
      .from('marketing_gsc_daily')
      .select('query, page, clicks, impressions, position')
      .eq('tenant_id', tenantId)
      .gte('date', since)
      .lt('position', 5),

    // Google Ads
    supabase
      .from('marketing_google_ads_daily')
      .select('campaign_name, cost_micros, clicks, impressions, conversions')
      .eq('tenant_id', tenantId)
      .gte('date', since),
  ])

  const ga4 = ga4Res.data ?? []
  const gscOpp = gscOppRes.data ?? []
  const gscCtr = gscCtrRes.data ?? []
  const ads = adsRes.data ?? []

  // ── Compute metrics ──────────────────────────────────────────────────────
  // Only count known marketing channels — exclude "Unassigned" (existing students via app)
  // and "Direct" (ambiguous: mix of new visitors and existing students typing URL directly)
  const MARKETING_CHANNELS = ['Organic Search', 'Paid Search', 'Referral', 'Organic Social', 'Email', 'Affiliates']
  const marketingGa4 = ga4.filter((r: any) => MARKETING_CHANNELS.includes(r.channel))

  const totalSessions = marketingGa4.reduce((s: number, r: any) => s + (r.sessions ?? 0), 0)
  const totalConversions = marketingGa4.reduce((s: number, r: any) => s + (r.conversions ?? 0), 0)
  const cvr = totalSessions > 0 ? (totalConversions / totalSessions * 100).toFixed(1) : '0'

  // Channel breakdown (all channels for reference, but CVR only on marketing channels)
  const channelMap = new Map<string, { sessions: number; conversions: number }>()
  for (const r of ga4) {
    const ch = r.channel ?? 'Unbekannt'
    const e = channelMap.get(ch) ?? { sessions: 0, conversions: 0 }
    channelMap.set(ch, { sessions: e.sessions + (r.sessions ?? 0), conversions: e.conversions + (r.conversions ?? 0) })
  }
  const paidSearch = channelMap.get('Paid Search') ?? { sessions: 0, conversions: 0 }
  const paidCvr = paidSearch.sessions > 0 ? (paidSearch.conversions / paidSearch.sessions * 100).toFixed(1) : '0'

  // Ads spend
  const totalSpendCHF = ads.reduce((s: number, r: any) => s + (r.cost_micros ?? 0) / 1_000_000, 0)
  const totalAdClicks = ads.reduce((s: number, r: any) => s + (r.clicks ?? 0), 0)
  const cpc = totalAdClicks > 0 ? (totalSpendCHF / totalAdClicks).toFixed(2) : null

  // SEO opportunities (aggregate by query, position 4-15)
  const oppMap = new Map<string, { impressions: number; clicks: number; positions: number[] }>()
  for (const r of gscOpp) {
    const e = oppMap.get(r.query) ?? { impressions: 0, clicks: 0, positions: [] }
    oppMap.set(r.query, { impressions: e.impressions + (r.impressions ?? 0), clicks: e.clicks + (r.clicks ?? 0), positions: [...e.positions, r.position] })
  }
  const topOpps = [...oppMap.entries()]
    .map(([q, v]) => ({ q, impressions: v.impressions, avgPos: v.positions.reduce((s, p) => s + p, 0) / v.positions.length }))
    .filter(o => o.impressions >= 15)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 3)

  // CTR bugs (aggregate by query, position < 5, 0 clicks)
  const ctrMap = new Map<string, { impressions: number; clicks: number }>()
  for (const r of gscCtr) {
    const e = ctrMap.get(r.query) ?? { impressions: 0, clicks: 0 }
    ctrMap.set(r.query, { impressions: e.impressions + (r.impressions ?? 0), clicks: e.clicks + (r.clicks ?? 0) })
  }
  const topCtrBugs = [...ctrMap.entries()]
    .filter(([, v]) => v.clicks === 0 && v.impressions >= 15)
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .slice(0, 2)

  // ── Generate recommendations ─────────────────────────────────────────────
  const actions: string[] = []
  const fruits: string[] = []

  // 1. CVR check
  if (parseFloat(cvr) < 8) {
    actions.push(`CVR diese Woche: ${cvr}% (Ziel: >10%). Buchungs-Button Sichtbarkeit prüfen und Landing Pages optimieren.`)
  }

  // 2. Paid Search opportunity
  if (paidSearch.sessions < 20 && parseFloat(paidCvr) >= 15) {
    actions.push(`Paid Search hat ${paidCvr}% CVR aber nur ${paidSearch.sessions} Sessions – Ads-Budget schrittweise erhöhen (CHF 50–100 mehr/Woche testen).`)
  }

  // 3. Top SEO opportunity
  if (topOpps.length > 0) {
    const top = topOpps[0]
    actions.push(`SEO-Priorität: "${top.q}" steht auf Ø Position ${top.avgPos.toFixed(1)} mit ${top.impressions} Impressionen – interner Link und Title optimieren um Top-3 zu erreichen.`)
  }
  if (topOpps.length > 1) {
    const second = topOpps[1]
    actions.push(`SEO-Chance: "${second.q}" (Pos. ${second.avgPos.toFixed(1)}, ${second.impressions} Impr.) – Meta-Description überarbeiten für höhere CTR.`)
  }

  // 4. CTR bugs
  if (topCtrBugs.length > 0) {
    const [q, v] = topCtrBugs[0]
    actions.push(`CTR-Bug: "${q}" erscheint ${v.impressions}x auf Seite 1 aber 0 Klicks – Title-Tag und Meta-Description sofort korrigieren.`)
  }

  // Low hanging fruits
  if (totalSpendCHF > 0 && totalAdClicks === 0) {
    fruits.push(`Google Ads aktiv (CHF ${totalSpendCHF.toFixed(0)} ausgegeben) aber keine Klicks – Kampagnen-Status und Gebote prüfen.`)
  } else if (cpc && parseFloat(cpc) > 8) {
    fruits.push(`CPC diese Woche: CHF ${cpc} – negative Keywords hinzufügen um Budget effizienter einzusetzen.`)
  }

  if (topCtrBugs.length > 1) {
    const [q2, v2] = topCtrBugs[1]
    fruits.push(`"${q2}" auf Pos. <5 aber 0 von ${v2.impressions} Klicks – Quick-Win: Title mit USP ("ab CHF 95") ergänzen.`)
  }

  fruits.push(`Wöchentliche Cron Jobs prüfen: GA4, Google Ads und GSC Sync laufen automatisch täglich um 04:00 Uhr.`)

  if (paidSearch.sessions > 0 && parseFloat(paidCvr) > 15) {
    fruits.push(`Paid Search konvertiert diese Woche mit ${paidCvr}% – Retargeting-Liste erstellen für Website-Besucher ohne Buchung.`)
  }

  // Summary
  const summary = `Diese Woche: ${totalSessions} Marketing-Sessions (ohne Unassigned/Direct), ${totalConversions} Conversions (CVR ${cvr}%), CHF ${totalSpendCHF.toFixed(0)} Ads-Spend. ${topOpps.length} SEO-Chancen in Position 4–15 identifiziert.`

  // ── Save to DB ────────────────────────────────────────────────────────────
  const { error } = await supabase
    .from('marketing_weekly_reviews')
    .upsert({
      tenant_id: tenantId,
      week_number: weekNumber,
      year,
      generated_at: new Date().toISOString(),
      summary,
      top_actions: actions.slice(0, 5),
      low_hanging_fruits: fruits.slice(0, 5),
      metrics: { totalSessions, totalConversions, cvr, totalSpendCHF: Math.round(totalSpendCHF * 100) / 100 },
    }, { onConflict: 'tenant_id,year,week_number' })

  if (error) throw new Error(error.message)
  return { weekNumber, year, summary, actions: actions.length, fruits: fruits.length }
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
