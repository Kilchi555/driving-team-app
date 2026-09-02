// GET /api/admin/calculator-stats
// Platform marketing calculator aggregates — super_admin only.

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireSuperAdmin } from '~/server/utils/admin-f01-access'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const supabase = getSupabaseAdmin()
  const query = getQuery(event)
  const days = Number(query.days) || 30

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('calculator_events')
    .select('event_type, category, date')
    .gte('date', sinceStr)

  const stats: Record<string, any> = {
    total_opens: 0,
    total_submissions: 0,
    by_category: {},
  }

  for (const row of events || []) {
    const key = row.category

    if (!stats.by_category[key]) {
      stats.by_category[key] = { opens: 0, submissions: 0 }
    }

    if (row.event_type === 'opened') {
      stats.total_opens++
      stats.by_category[key].opens++
    } else if (row.event_type === 'submitted') {
      stats.total_submissions++
      stats.by_category[key].submissions++
    }
  }

  for (const [, data] of Object.entries(stats.by_category) as [string, any][]) {
    data.conversion_rate = data.opens > 0 ? ((data.submissions / data.opens) * 100).toFixed(1) : 0
  }

  stats.overall_conversion_rate =
    stats.total_opens > 0
      ? ((stats.total_submissions / stats.total_opens) * 100).toFixed(1)
      : 0

  return stats
})
