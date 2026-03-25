import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) throw createError({ statusCode: 500, message: 'Supabase not configured' })

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const query = getQuery(event)
  const days = Number(query.days) || 30

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  // Get all calculator events
  const { data: events } = await supabase
    .from('calculator_events')
    .select('event_type, category, date')
    .gte('date', sinceStr)

  // Aggregate by event type and category
  const stats: Record<string, any> = {
    total_opens: 0,
    total_submissions: 0,
    by_category: {},
  }

  for (const event of events || []) {
    const key = event.category

    if (!stats.by_category[key]) {
      stats.by_category[key] = { opens: 0, submissions: 0 }
    }

    if (event.event_type === 'opened') {
      stats.total_opens++
      stats.by_category[key].opens++
    } else if (event.event_type === 'submitted') {
      stats.total_submissions++
      stats.by_category[key].submissions++
    }
  }

  // Calculate conversion rates
  for (const [category, data] of Object.entries(stats.by_category)) {
    data.conversion_rate = data.opens > 0 ? ((data.submissions / data.opens) * 100).toFixed(1) : 0
  }

  stats.overall_conversion_rate = stats.total_opens > 0 ? ((stats.total_submissions / stats.total_opens) * 100).toFixed(1) : 0

  return stats
})
