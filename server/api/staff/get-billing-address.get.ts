import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-billing-address
 * 
 * Secure API to fetch user billing address for PriceDisplay
 * 
 * Query Params:
 *   - user_id (required): User ID
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
    const userId = query.user_id as string | undefined

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'user_id is required'
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

    // ✅ LAYER 4: DATABASE QUERY - Get user data as billing address
    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, phone, street, street_nr, zip, city, company_name')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        logger.debug('ℹ️ No billing address found for user:', userId)
        return {
          success: true,
          data: null
        }
      }
      logger.error('❌ Error fetching billing address:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch billing address'
      })
    }

    // ✅ LAYER 5: Map to billing address format
    const billingAddress = {
      company_name: userData.company_name || '',
      contact_person: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
      email: userData.email || '',
      phone: userData.phone || '',
      street: userData.street || '',
      street_number: userData.street_nr || '',
      zip: userData.zip || '',
      city: userData.city || ''
    }

    // ✅ LAYER 6: AUDIT LOGGING
    logger.debug('✅ Billing address fetched:', {
      userId: userProfile.id,
      tenantId,
      targetUserId: userId
    })

    return {
      success: true,
      data: billingAddress
    }

  } catch (error: any) {
    logger.error('❌ Staff get-billing-address API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch billing address'
    })
  }
})

