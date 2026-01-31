import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/examiners/list
 * 
 * Secure API to fetch examiners for the current tenant
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

    // ✅ 2. GET ALL EXAMINERS for this tenant
    const { data: examiners, error } = await supabase
      .from('examiners')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('last_name', { ascending: true })

    if (error) {
      logger.error('❌ Error fetching examiners:', error)
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch examiners'
      })
    }

    logger.debug('✅ Examiners fetched:', {
      userId: user.id,
      tenantId: tenantId,
      count: examiners?.length || 0
    })

    return {
      success: true,
      data: examiners || []
    }

  } catch (error: any) {
    logger.error('❌ Error in list-examiners API:', error.message)
    
    if (error.statusCode) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to fetch examiners'
    })
  }
})
