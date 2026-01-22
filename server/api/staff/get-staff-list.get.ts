import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-staff-list
 * 
 * Secure API to fetch all staff members for the current tenant
 * 
 * Query Params:
 *   - active_only (optional): If 'true', only return active staff (default: true)
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
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

    // ✅ LAYER 2: Get user profile and tenant
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role, is_active')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    const tenantId = userProfile.tenant_id

    // ✅ LAYER 3: INPUT VALIDATION
    const query = getQuery(event)
    const activeOnly = query.active_only !== 'false' // Default to true

    // ✅ LAYER 4: DATABASE QUERY with Tenant Isolation
    let queryBuilder = supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, role, tenant_id, is_active')
      .eq('role', 'staff')
      .eq('tenant_id', tenantId)
      .order('first_name')

    if (activeOnly) {
      queryBuilder = queryBuilder.eq('is_active', true)
    }

    const { data: staffList, error } = await queryBuilder

    if (error) {
      logger.error('❌ Error fetching staff list:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch staff list'
      })
    }

    // ✅ LAYER 5: AUDIT LOGGING
    logger.debug('✅ Staff list fetched:', {
      userId: userProfile.id,
      tenantId,
      count: staffList?.length || 0
    })

    return {
      success: true,
      data: staffList || []
    }

  } catch (error: any) {
    logger.error('❌ Staff get-staff-list API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch staff list'
    })
  }
})

