import { defineEventHandler, getQuery, getHeader, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

const EMPTY_RESPONSE = {
  period: { startDate: '', endDate: '', days: 7 },
  summary: { totalPageViews: 0, calculatorOpens: 0, calculatorSubmissions: 0, totalLeads: 0, avgLeadsPerSession: 0 },
  dailyTrend: [],
  topPages: [],
  calculatorMetrics: { totalOpens: 0, totalSubmissions: 0, conversionRate: 0, byCategory: {} },
  leads: { total: 0, byCategory: {} },
  bookingRedirects: { total: 0, byCategory: {} },
  bookingEvents: { viewed: 0, completed: 0, abandoned: 0 },
  funnelSessions: [],
}

export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Return empty data if Supabase not configured (local dev)
  if (!supabaseUrl || !supabaseServiceKey) {
    return EMPTY_RESPONSE
  }

  // ✅ SECURITY: Only super_admin can access analytics across all tenants
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const token = authHeader.substring(7)
  const adminClient = getSupabaseAdmin()
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token)

  if (authError || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { data: userData } = await adminClient
    .from('users')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (userData?.role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Only super_admin can access this endpoint' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const daysParam = getQuery(event).days || '7'
  const days = parseInt(daysParam as string, 10)

  try {

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

  // 4. Leads
  const { data: leads } = await supabase
    .from('price_calculation_leads')
    .select('category, created_at')
    .gte('created_at', startDateStr + 'T00:00:00')
    .lte('created_at', endDateStr + 'T23:59:59')

  // 5. Conversion Funnel
  const { data: funnelData } = await supabase.rpc('get_conversion_funnel', {
    start_date: startDateStr,
    end_date: endDateStr,
  })

  // 6. Booking Redirects
  const { data: bookingRedirects } = await supabase
    .from('booking_redirects')
    .select('category, date')
    .gte('date', startDateStr)
    .lte('date', endDateStr)

  // 7. Booking Events
  const { data: bookingEvents } = await supabase
    .from('booking_events')
    .select('event_type, date')
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

  const leadsByCategory = leads?.reduce((acc: any, lead) => {
    acc[lead.category] = (acc[lead.category] || 0) + 1
    return acc
  }, {}) || {}

  const bookingRedirectsByCategory = bookingRedirects?.reduce((acc: any, redirect) => {
    acc[redirect.category] = (acc[redirect.category] || 0) + 1
    return acc
  }, {}) || {}

  const bookingViewed = bookingEvents?.filter((e) => e.event_type === 'viewed').length || 0
  const bookingCompleted = bookingEvents?.filter((e) => e.event_type === 'completed').length || 0
  const bookingAbandoned = bookingEvents?.filter((e) => e.event_type === 'abandoned').length || 0

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
    bookingRedirects: {
      total: bookingRedirects?.length || 0,
      byCategory: bookingRedirectsByCategory,
    },
    bookingEvents: {
      viewed: bookingViewed,
      completed: bookingCompleted,
      abandoned: bookingAbandoned,
    },
    funnelSessions: funnelData || [],
  }
  } catch (err) {
    console.error('[website-analytics-conversion] Error:', err)
    return EMPTY_RESPONSE
  }
})
