import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-discounts
 *
 * Secure API to fetch available discounts
 * - default: fixed type (event modal)
 * - ?with_code=1: active discounts that have a promo code (staff Links sheet)
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
    const query = getQuery(event)
    const withCode = query.with_code === '1' || query.with_code === 'true'

    // ✅ LAYER 3: DATABASE QUERY
    let discountsQuery = supabaseAdmin
      .from('discounts')
      .select(withCode
        ? 'id, name, code, discount_type, discount_value, category_filter, first_lesson_only, staff_id, valid_from, valid_until'
        : '*'
      )
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)

    if (withCode) {
      discountsQuery = discountsQuery
        .not('code', 'is', null)
        .neq('code', '')
        .order('name', { ascending: true })
    } else {
      discountsQuery = discountsQuery
        .eq('discount_type', 'fixed')
        .order('discount_value', { ascending: true })
    }

    const { data: discounts, error } = await discountsQuery

    if (error) {
      logger.error('❌ Error fetching discounts:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch discounts'
      })
    }

    let result = discounts || []

    if (withCode) {
      const now = Date.now()
      result = result.filter((d: any) => {
        const code = String(d.code || '').trim()
        if (!code) return false
        // Tenant-wide or assigned to this staff member
        if (d.staff_id && d.staff_id !== userProfile.id) return false
        if (d.valid_from && new Date(d.valid_from).getTime() > now) return false
        if (d.valid_until && new Date(d.valid_until).getTime() < now) return false
        return true
      })
    }

    // ✅ LAYER 4: AUDIT LOGGING
    logger.debug('✅ Discounts fetched:', {
      userId: userProfile.id,
      tenantId,
      withCode,
      count: result.length
    })

    return {
      success: true,
      data: result
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
