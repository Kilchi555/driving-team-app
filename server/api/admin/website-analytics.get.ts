import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
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

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) throw createError({ statusCode: 500, message: 'Supabase not configured' })

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const query = getQuery(event)
  const days = Number(query.days) || 30

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().split('T')[0]

  // Top pages
  const { data: topPages } = await supabase
    .from('page_analytics')
    .select('page, views')
    .gte('date', sinceStr)
    .order('views', { ascending: false })

  // Aggregate top pages
  const pageMap: Record<string, number> = {}
  for (const row of topPages || []) {
    pageMap[row.page] = (pageMap[row.page] || 0) + row.views
  }
  const topPagesSorted = Object.entries(pageMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([page, views]) => ({ page, views }))

  // Traffic sources
  const { data: sourceData } = await supabase
    .from('page_analytics')
    .select('referrer_type, views')
    .gte('date', sinceStr)

  const sourceMap: Record<string, number> = {}
  for (const row of sourceData || []) {
    sourceMap[row.referrer_type] = (sourceMap[row.referrer_type] || 0) + row.views
  }

  // Device breakdown
  const { data: deviceData } = await supabase
    .from('page_analytics')
    .select('device_type, views')
    .gte('date', sinceStr)

  const deviceMap: Record<string, number> = {}
  for (const row of deviceData || []) {
    deviceMap[row.device_type] = (deviceMap[row.device_type] || 0) + row.views
  }

  // Daily trend (last 30 days)
  const { data: dailyData } = await supabase
    .from('page_analytics')
    .select('date, views')
    .gte('date', sinceStr)
    .order('date', { ascending: true })

  const dailyMap: Record<string, number> = {}
  for (const row of dailyData || []) {
    dailyMap[row.date] = (dailyMap[row.date] || 0) + row.views
  }
  const daily = Object.entries(dailyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, views]) => ({ date, views }))

  // Total views
  const totalViews = Object.values(pageMap).reduce((a, b) => a + b, 0)

  return {
    totalViews,
    topPages: topPagesSorted,
    sources: sourceMap,
    devices: deviceMap,
    daily,
  }
})
