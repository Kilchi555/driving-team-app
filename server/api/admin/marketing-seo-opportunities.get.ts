import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

// Returns SEO opportunities (position 4-15, high impressions) and CTR bugs (position <5, 0 clicks)
export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user || !['admin', 'super_admin'].includes(user.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const supabase = getSupabaseAdmin()
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceStr = since.toISOString().split('T')[0]

  // SEO Opportunities: position 4-15, impressions >= 20
  const { data: oppRaw } = await supabase.rpc('marketing_seo_opportunities', {
    p_tenant_id: user.tenant_id,
    p_since: sinceStr,
  }).catch(() => ({ data: null }))

  // Fallback: direct query if RPC not available
  const { data: gscRaw } = await supabase
    .from('marketing_gsc_daily')
    .select('query, page, clicks, impressions, ctr, position')
    .eq('tenant_id', user.tenant_id)
    .gte('date', sinceStr)
    .gte('position', 4)
    .lte('position', 15)

  // Aggregate by query+page
  const aggMap = new Map<string, { query: string; page: string; clicks: number; impressions: number; positions: number[]; ctrs: number[] }>()
  for (const r of gscRaw ?? []) {
    const key = r.query + '|||' + r.page
    const existing = aggMap.get(key) ?? { query: r.query, page: r.page, clicks: 0, impressions: 0, positions: [], ctrs: [] }
    aggMap.set(key, {
      ...existing,
      clicks: existing.clicks + (r.clicks ?? 0),
      impressions: existing.impressions + (r.impressions ?? 0),
      positions: [...existing.positions, r.position],
      ctrs: [...existing.ctrs, r.ctr],
    })
  }

  const opportunities = [...aggMap.values()]
    .filter(r => r.impressions >= 20)
    .map(r => ({
      query: r.query,
      page: r.page,
      clicks: r.clicks,
      impressions: r.impressions,
      avg_pos: (r.positions.reduce((s, v) => s + v, 0) / r.positions.length).toFixed(1),
      avg_ctr: ((r.ctrs.reduce((s, v) => s + v, 0) / r.ctrs.length) * 100).toFixed(1),
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15)

  // CTR Bugs: position < 5 but 0 clicks and impressions >= 20
  const { data: ctrRaw } = await supabase
    .from('marketing_gsc_daily')
    .select('query, page, clicks, impressions, ctr, position')
    .eq('tenant_id', user.tenant_id)
    .gte('date', sinceStr)
    .lt('position', 5)

  const ctrMap = new Map<string, typeof aggMap extends Map<string, infer V> ? V : never>()
  for (const r of ctrRaw ?? []) {
    const key = r.query + '|||' + r.page
    const existing = ctrMap.get(key) ?? { query: r.query, page: r.page, clicks: 0, impressions: 0, positions: [], ctrs: [] }
    ctrMap.set(key, {
      ...existing,
      clicks: existing.clicks + (r.clicks ?? 0),
      impressions: existing.impressions + (r.impressions ?? 0),
      positions: [...existing.positions, r.position],
      ctrs: [...existing.ctrs, r.ctr],
    })
  }

  const ctrBugs = [...ctrMap.values()]
    .filter(r => r.impressions >= 20 && r.clicks === 0)
    .map(r => ({
      query: r.query,
      page: r.page,
      clicks: r.clicks,
      impressions: r.impressions,
      avg_pos: (r.positions.reduce((s, v) => s + v, 0) / r.positions.length).toFixed(1),
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 8)

  return { opportunities, ctrBugs }
})
