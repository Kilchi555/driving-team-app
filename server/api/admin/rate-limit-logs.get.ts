import { defineEventHandler, getQuery, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  try {
    // ✅ SECURITY: Only super_admin can access rate limit logs (contains IP addresses)
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

    // Get query parameters
    const query = getQuery(event)
    const operation = query.operation as string || ''
    const status = query.status as string || ''
    const timeRange = query.timeRange as string || '24h'
    const page = parseInt(query.page as string) || 1
    const pageSize = parseInt(query.pageSize as string) || 50

    // Reuse the already-authenticated admin client
    const supabase = adminClient

    // Calculate time range start
    const now = new Date()
    let startDate = new Date()

    switch (timeRange) {
      case '1h':
        startDate.setHours(now.getHours() - 1)
        break
      case '24h':
        startDate.setDate(now.getDate() - 1)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      default:
        startDate.setDate(now.getDate() - 1)
    }

    // Build query
    let dbQuery = supabase
      .from('rate_limit_logs')
      .select('*', { count: 'exact' })
      .gte('created_at', startDate.toISOString())

    // Apply filters
    if (operation) {
      dbQuery = dbQuery.eq('operation', operation)
    }

    if (status) {
      dbQuery = dbQuery.eq('status', status)
    }

    // Order and paginate
    const { data, error, count } = await dbQuery
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (error) {
      console.error('Database query error:', error)
      throw createError({
        statusCode: 400,
        statusMessage: 'Failed to fetch rate limit logs'
      })
    }

    return {
      success: true,
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  } catch (error: any) {
    console.error('Rate limit logs error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch rate limit logs'
    })
  }
})





