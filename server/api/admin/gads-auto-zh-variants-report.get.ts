/**
 * 14-day Auto Zürich variant scorecard: cost/clicks/conv by ad group + landing,
 * joined with booking_proposals that carry utm_content=ag_*.
 *
 * USAGE:
 *   curl "https://app.simy.ch/api/admin/gads-auto-zh-variants-report?days=14" \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */

import { defineEventHandler, getHeader, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { resolveGadsAuth, getGadsAccessToken, buildGadsHeaders } from '~/server/utils/gads-auth'

const GADS_VERSION = 'v23'
const CAMPAIGN_ID = '24103567599'

const AG_TO_UTM: Record<string, string> = {
  AG_Local: 'ag_local',
  AG_Probe: 'ag_probe',
  AG_Preis: 'ag_preis',
  AG_Quartier: 'ag_quartier',
}

async function gaql(customerId: string, headers: Record<string, string>, query: string): Promise<any[]> {
  const res = await fetch(
    `https://googleads.googleapis.com/${GADS_VERSION}/customers/${customerId}/googleAds:searchStream`,
    { method: 'POST', headers, body: JSON.stringify({ query }) },
  )
  const data = await res.json() as any
  if (!res.ok) throw new Error(JSON.stringify(data).slice(0, 400))
  const rows: any[] = []
  for (const batch of (Array.isArray(data) ? data : [data])) {
    rows.push(...(batch.results ?? []))
  }
  return rows
}

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    // Also allow via resolveGadsAuth (same cron secret pattern used elsewhere)
    const gadsProbe = await resolveGadsAuth(event)
    if (!gadsProbe.ok) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
  }

  const q = getQuery(event)
  const days = Math.min(60, Math.max(7, Number(q.days) || 14))

  const gads = await resolveGadsAuth(event)
  if (!gads.ok) return gads

  const accessToken = await getGadsAccessToken(gads)
  const headers = buildGadsHeaders(gads, accessToken)
  const customerId = gads.customerId

  const end = new Date()
  const start = new Date()
  start.setUTCDate(end.getUTCDate() - days)
  const startStr = start.toISOString().slice(0, 10).replace(/-/g, '')
  const endStr = end.toISOString().slice(0, 10).replace(/-/g, '')

  const adsRows = await gaql(customerId, headers, `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      metrics.conversions_value
    FROM ad_group
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND ad_group.status != 'REMOVED'
      AND segments.date BETWEEN '${startStr}' AND '${endStr}'
  `)

  // Aggregate by ad group (searchStream may return daily rows)
  const byAg = new Map<string, {
    ad_group: string
    status: string
    cost_chf: number
    clicks: number
    impressions: number
    conversions: number
    conv_value: number
  }>()

  for (const r of adsRows) {
    const name = String(r.adGroup?.name ?? 'unknown')
    const ex = byAg.get(name) ?? {
      ad_group: name,
      status: String(r.adGroup?.status ?? ''),
      cost_chf: 0,
      clicks: 0,
      impressions: 0,
      conversions: 0,
      conv_value: 0,
    }
    ex.cost_chf += Number(r.metrics?.costMicros ?? 0) / 1e6
    ex.clicks += Number(r.metrics?.clicks ?? 0)
    ex.impressions += Number(r.metrics?.impressions ?? 0)
    ex.conversions += Number(r.metrics?.conversions ?? 0)
    ex.conv_value += Number(r.metrics?.conversionsValue ?? 0)
    byAg.set(name, ex)
  }

  const supabase = getSupabaseAdmin()
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: proposals } = await supabase
    .from('booking_proposals')
    .select('id, created_at, category_code, status, outcome_type, utm_content, utm_campaign, gclid, email')
    .gte('created_at', sinceIso)
    .or(
      Object.values(AG_TO_UTM).map((u) => `utm_content.eq.${u}`).join(',')
      + ',utm_content.ilike.ag_%',
    )

  const propsByUtm = new Map<string, { count: number; with_gclid: number; booking_confirmed: number }>()
  for (const p of proposals ?? []) {
    const key = String(p.utm_content || 'unknown')
    const ex = propsByUtm.get(key) ?? { count: 0, with_gclid: 0, booking_confirmed: 0 }
    ex.count++
    if (p.gclid) ex.with_gclid++
    if (p.outcome_type === 'booking_confirmed') ex.booking_confirmed++
    propsByUtm.set(key, ex)
  }

  const scorecard = [...byAg.values()]
    .filter((r) => r.ad_group.startsWith('AG_') || ['Fahrschule Altstetten', 'Quartiere 10km', 'Fahrschule Zürich'].includes(r.ad_group))
    .map((r) => {
      const utm = AG_TO_UTM[r.ad_group]
      const props = utm ? propsByUtm.get(utm) : undefined
      const adsConv = r.conversions
      const propConv = (props?.count ?? 0)
      const totalProxy = adsConv + propConv
      const cpa = totalProxy > 0 ? r.cost_chf / totalProxy : null
      return {
        ...r,
        cost_chf: Math.round(r.cost_chf * 100) / 100,
        utm_content: utm ?? null,
        proposals: props?.count ?? 0,
        proposals_with_gclid: props?.with_gclid ?? 0,
        booking_confirmed: props?.booking_confirmed ?? 0,
        cpa_proxy_chf: cpa != null ? Math.round(cpa) : null,
        ready_for_decision: r.clicks >= 50 || days >= 14,
      }
    })
    .sort((a, b) => b.cost_chf - a.cost_chf)

  const winner = [...scorecard]
    .filter((r) => r.ad_group.startsWith('AG_') && (r.conversions > 0 || r.proposals > 0))
    .sort((a, b) => (a.cpa_proxy_chf ?? 99999) - (b.cpa_proxy_chf ?? 99999))[0] ?? null

  return {
    success: true,
    window_days: days,
    campaign_id: CAMPAIGN_ID,
    scorecard,
    proposals_by_utm: Object.fromEntries(propsByUtm),
    recommendation: winner
      ? {
          scale: winner.ad_group,
          pause: scorecard
            .filter((r) => r.ad_group.startsWith('AG_') && r.ad_group !== winner.ad_group && r.clicks >= 40 && (r.conversions + r.proposals) === 0)
            .map((r) => r.ad_group),
          note: 'Winner = best CPA proxy (Ads conv + proposals). Scale +20–40% budget after 14d or 50 clicks/AG.',
        }
      : {
          scale: null,
          pause: [],
          note: 'Noch zu wenig Signal — Test weiterlaufen lassen (Ziel: 14 Tage oder ~50 Clicks/AG).',
        },
  }
})
