import { defineEventHandler, createError } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-discounts
 * 
 * Secure API to fetch available discounts (fixed type)
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

    // ✅ LAYER 3: DATABASE QUERY - Only fixed discounts
    const { data: discounts, error } = await supabaseAdmin
      .from('discounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('discount_type', 'fixed')
      .order('discount_value', { ascending: true })

    if (error) {
      logger.error('❌ Error fetching discounts:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch discounts'
      })
    }

    // ✅ LAYER 4: AUDIT LOGGING
    logger.debug('✅ Discounts fetched:', {
      userId: userProfile.id,
      tenantId,
      count: discounts?.length || 0
    })

    return {
      success: true,
      data: discounts || []
    }

  } catch (error: any) {
    logger.error('❌ Staff get-discounts API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch discounts'
    })
  }
})

