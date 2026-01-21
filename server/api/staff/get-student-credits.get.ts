import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-student-credits
 * 
 * Secure API to fetch student credit balance
 * 
 * Query Params:
 *   - user_id (required): Student user ID
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Creates credit record if not exists
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

    if (!userProfile.is_active) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User account is inactive'
      })
    }

    const tenantId = userProfile.tenant_id

    // ✅ LAYER 3: INPUT VALIDATION
    const query = getQuery(event)
    const userId = query.user_id as string | undefined

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

    // ✅ LAYER 4: DATABASE QUERY with Tenant Isolation
    const { data: credit, error } = await supabaseAdmin
      .from('student_credits')
      .select('id, balance_rappen, user_id, tenant_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) {
      logger.error('❌ Error fetching student credits:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch student credits'
      })
    }

    // ✅ LAYER 5: Create credit record if not exists
    if (!credit) {
      const { data: newCredit, error: createError } = await supabaseAdmin
        .from('student_credits')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          balance_rappen: 0
        })
        .select()
        .single()

      if (createError) {
        logger.error('❌ Error creating student credit:', createError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to create student credit'
        })
      }

      logger.debug('✅ Student credit created:', {
        userId: userProfile.id,
        tenantId: tenantId,
        studentUserId: userId,
        initialBalance: 0
      })

      return {
        success: true,
        data: newCredit
      }
    }

    // ✅ LAYER 6: AUDIT LOGGING
    logger.debug('✅ Student credits fetched:', {
      userId: userProfile.id,
      tenantId: tenantId,
      studentUserId: userId,
      balance: credit.balance_rappen
    })

    return {
      success: true,
      data: credit
    }

  } catch (error: any) {
    logger.error('❌ Staff get-student-credits API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch student credits'
    })
  }
})

