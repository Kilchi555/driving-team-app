import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-tenant
 * 
 * Secure API to fetch tenant info for a specific staff member
 * Used for ExamLocationSelector to determine which locations to show
 * 
 * Query Params:
 *   - staff_id (required): The ID of the staff member to get tenant for
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation (only users in same tenant can query)
 */

export default defineEventHandler(async (event) => {
  try {
    // ✅ LAYER 1: AUTHENTICATION
    const authUser = await getAuthUserFromRequest(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      })
    }

    // ✅ LAYER 2: Get query parameters
    const query = getQuery(event)
    const staffId = query.staff_id as string | undefined
    
    if (!staffId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'staff_id query parameter is required'
      })
    }

    // ✅ LAYER 3: Setup admin client
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // ✅ LAYER 4: Get current user's tenant
    const { data: currentUserProfile, error: currentUserError } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (currentUserError || !currentUserProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    const currentTenantId = currentUserProfile.tenant_id

    // ✅ LAYER 5: Get target staff member's tenant
    // IMPORTANT: Only allow fetching info from staff in the same tenant
    const { data: staffProfile, error: staffError } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('id', staffId)
      .eq('tenant_id', currentTenantId)
      .single()

    if (staffError || !staffProfile) {
      logger.error('❌ Staff member not found or unauthorized:', { staffId, currentTenantId })
      throw createError({
        statusCode: 403,
        statusMessage: 'Staff member not found or unauthorized'
      })
    }

    logger.debug('✅ Staff tenant info fetched:', {
      currentUserId: currentUserProfile,
      staffId,
      tenantId: staffProfile.tenant_id
    })

    return {
      success: true,
      tenant_id: staffProfile.tenant_id
    }

  } catch (error: any) {
    logger.error('❌ Staff get-tenant API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch tenant info'
    })
  }
})
