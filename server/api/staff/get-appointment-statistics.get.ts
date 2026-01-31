import { defineEventHandler, getQuery, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-appointment-statistics
 * 
 * Secure API to get appointment status statistics
 * 
 * Query Params (optional):
 *   - status_filter: string (comma-separated statuses to filter)
 *   - date_from: string (ISO date)
 *   - date_to: string (ISO date)
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Input Validation
 */

export default defineEventHandler(async (event) => {
  try {
    // ✅ 1. AUTHENTIFIZIERUNG
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    // Get user from users table to get tenant_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !user) {
      throw createError({ statusCode: 401, message: 'User not found' })
    }

    const tenantId = user.tenant_id

    // ✅ 2. GET QUERY PARAMETERS
    const query = getQuery(event)
    const statusFilter = query.status_filter ? String(query.status_filter).split(',').map(s => s.trim()) : undefined
    const dateFrom = query.date_from ? String(query.date_from) : undefined
    const dateTo = query.date_to ? String(query.date_to) : undefined

    // ✅ 3. BUILD QUERY
    let queryBuilder = supabase
      .from('appointments')
      .select('status')
      .eq('tenant_id', tenantId)

    if (statusFilter && statusFilter.length > 0) {
      queryBuilder = queryBuilder.in('status', statusFilter)
    }

    if (dateFrom) {
      queryBuilder = queryBuilder.gte('start_time', dateFrom)
    }

    if (dateTo) {
      queryBuilder = queryBuilder.lte('start_time', dateTo)
    }

    const { data: appointments, error } = await queryBuilder

    if (error) {
      logger.error('❌ Error fetching statistics:', error)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch statistics'
      })
    }

    // ✅ 4. CALCULATE STATISTICS
    const stats: Record<string, number> = {}
    let total = 0

    if (appointments && appointments.length > 0) {
      appointments.forEach((apt: any) => {
        stats[apt.status] = (stats[apt.status] || 0) + 1
        total++
      })
    }

    logger.debug('✅ Appointment statistics fetched:', {
      userId: user.id,
      tenantId,
      total,
      breakdown: stats
    })

    return {
      success: true,
      data: {
        total,
        breakdown: stats,
        timestamp: new Date().toISOString()
      }
    }

  } catch (error: any) {
    logger.error('❌ Error in get-appointment-statistics API:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch statistics'
    })
  }
})
