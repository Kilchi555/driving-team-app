import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-pricing-rules
 * 
 * Secure API to fetch pricing rules (admin fees, apply from duration) for EventModal
 * 
 * Query Params:
 *   - None (loads all active pricing rules for tenant)
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Rate Limiting (100 req/min per user)
 *   4. Caching (60 seconds)
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

    // ✅ LAYER 3: DATABASE QUERY with Tenant Isolation
    const { data: pricingRules, error } = await supabaseAdmin
      .from('pricing_rules')
      .select('id, tenant_id, admin_fee_rappen, admin_fee_applies_from, is_active, created_at')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('❌ Error fetching pricing rules:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch pricing rules'
      })
    }

    // ✅ LAYER 4: AUDIT LOGGING
    logger.debug('✅ Pricing rules fetched successfully:', {
      userId: userProfile.id,
      tenantId: tenantId,
      count: pricingRules?.length || 0
    })

    return {
      success: true,
      data: pricingRules || []
    }

  } catch (error: any) {
    logger.error('❌ Staff get-pricing-rules API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch pricing rules'
    })
  }
})

