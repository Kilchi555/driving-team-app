import { defineEventHandler, createError } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-tenant-info
 * 
 * Secure API to fetch tenant info for current user
 * Used for SMS/Email sender name
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Only returns own tenant info
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

    // ✅ LAYER 3: Get tenant info
    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('id, name, twilio_from_sender, email_from_name, email_from_address')
      .eq('id', tenantId)
      .single()

    if (error) {
      logger.error('❌ Error fetching tenant info:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch tenant info'
      })
    }

    // ✅ LAYER 4: AUDIT LOGGING
    logger.debug('✅ Tenant info fetched:', {
      userId: userProfile.id,
      tenantId
    })

    return {
      success: true,
      data: tenant
    }

  } catch (error: any) {
    logger.error('❌ Staff get-tenant-info API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch tenant info'
    })
  }
})

