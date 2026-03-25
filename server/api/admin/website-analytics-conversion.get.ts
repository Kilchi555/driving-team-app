import { defineEventHandler, createError, getQuery } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase not configured',
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const daysParam = getQuery(event).days || '7'
  const days = parseInt(daysParam as string, 10)

  // Get date range
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  // 1. Total Page Views by Day
  const { data: pageViewsByDay } = await supabase
    .from('page_analytics')
    .select('date, views')
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('date', { ascending: true })

  // 2. Top Pages
  const { data: topPages } = await supabase
    .from('page_analytics')
    .select('page, views')
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('views', { ascending: false })
    .limit(10)

  // 3. Calculator Stats
  const { data: calculatorEvents } = await supabase
    .from('calculator_events')
    .select('event_type, category, date')
    .gte('date', startDateStr)
    .lte('date', endDateStr)

  const calculatorOpens = calculatorEvents?.filter((e) => e.event_type === 'opened').length || 0
  const calculatorSubmissions = calculatorEvents?.filter((e) => e.event_type === 'submitted').length || 0
  const calcOpensByCategory = calculatorEvents?.reduce((acc: any, e) => {
    if (e.event_type === 'opened') {
      acc[e.category] = (acc[e.category] || 0) + 1
    }
    return acc
  }, {}) || {}

  // 4. Leads
  const { data: leads } = await supabase
    .from('price_calculation_leads')
    .select('category, created_at')
    .gte('created_at', startDateStr + 'T00:00:00')
    .lte('created_at', endDateStr + 'T23:59:59')

  const leadsByCategory = leads?.reduce((acc: any, lead) => {
    acc[lead.category] = (acc[lead.category] || 0) + 1
    return acc
  }, {}) || {}

  // 5. Conversion Funnel (Sessions with activity)
  const { data: funnelData } = await supabase.rpc('get_conversion_funnel', {
    start_date: startDateStr,
    end_date: endDateStr,
  }).catch(() => ({ data: [] }))

  // Aggregate page views by day
  const viewsByDay: any = {}
  pageViewsByDay?.forEach((row: any) => {
    viewsByDay[row.date] = (viewsByDay[row.date] || 0) + row.views
  })

  return {
    period: { startDate: startDateStr, endDate: endDateStr, days },
    summary: {
      totalPageViews: Object.values(viewsByDay).reduce((sum: number, val: any) => sum + val, 0),
      calculatorOpens,
      calculatorSubmissions,
      totalLeads: leads?.length || 0,
      avgLeadsPerSession: funnelData ? (leads?.length || 0) / (funnelData.length || 1) : 0,
    },
    dailyTrend: Object.entries(viewsByDay).map(([date, views]) => ({
      date,
      views,
    })),
    topPages: topPages?.slice(0, 10) || [],
    calculatorMetrics: {
      totalOpens: calculatorOpens,
      totalSubmissions: calculatorSubmissions,
      conversionRate: calculatorOpens > 0 ? ((calculatorSubmissions / calculatorOpens) * 100).toFixed(2) : 0,
      byCategory: calcOpensByCategory,
    },
    leads: {
      total: leads?.length || 0,
      byCategory: leadsByCategory,
    },
    funnelSessions: funnelData || [],
  }
})
