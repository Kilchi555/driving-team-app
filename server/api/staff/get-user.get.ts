import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-user
 * 
 * Secure API to fetch user/staff details
 * 
 * Query Params:
 *   - id (required): User ID
 *   - fields (optional): Comma-separated fields to fetch
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation (only same tenant users)
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
    const userId = query.id as string | undefined
    const fieldsParam = query.fields as string | undefined

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User ID is required'
      })
    }

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid user ID format'
      })
    }

    // ✅ LAYER 4: Build select query
    const defaultFields = 'id, first_name, last_name, email, phone, role, tenant_id'
    const selectFields = fieldsParam || defaultFields

    // ✅ LAYER 5: DATABASE QUERY with Tenant Isolation
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(selectFields)
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw createError({
          statusCode: 404,
          statusMessage: 'User not found'
        })
      }
      logger.error('❌ Error fetching user:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch user'
      })
    }

    // ✅ LAYER 6: AUDIT LOGGING
    logger.debug('✅ User fetched:', {
      userId: userProfile.id,
      tenantId,
      targetUserId: userId
    })

    return {
      success: true,
      data: user
    }

  } catch (error: any) {
    logger.error('❌ Staff get-user API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch user'
    })
  }
})

