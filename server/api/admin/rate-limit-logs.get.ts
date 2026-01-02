import { defineEventHandler, getQuery } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event)
    const operation = query.operation as string || ''
    const status = query.status as string || ''
    const timeRange = query.timeRange as string || '24h'
    const page = parseInt(query.page as string) || 1
    const pageSize = parseInt(query.pageSize as string) || 50

    // Get Supabase client
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

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

