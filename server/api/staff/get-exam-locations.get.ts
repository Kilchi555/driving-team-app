import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-exam-locations
 * 
 * Secure API to fetch exam locations for staff
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
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

    // ✅ 2. GET ALL EXAM LOCATIONS for this tenant
    const { data: allExamLocations, error } = await supabase
      .from('locations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('location_type', 'exam')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      logger.error('❌ Error fetching exam locations:', error)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch exam locations'
      })
    }

    logger.debug('✅ Exam locations fetched:', {
      userId: user.id,
      tenantId: tenantId,
      count: allExamLocations?.length || 0
    })

    return {
      success: true,
      data: allExamLocations || []
    }

  } catch (error: any) {
    logger.error('❌ Error in get-exam-locations API:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch exam locations'
    })
  }
})
