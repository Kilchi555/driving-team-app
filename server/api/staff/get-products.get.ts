import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-products
 *
 * Secure API to fetch products for EventModal.
 * Accepts optional `category_code` query param (driving licence category, e.g. "B").
 * Products with `allowed_driving_category_codes = NULL` are shown for every category.
 *
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 */

export default defineEventHandler(async (event) => {
  try {
    const { category_code } = getQuery(event)

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

    // ✅ LAYER 3: DATABASE QUERY with Tenant Isolation
    let query = supabaseAdmin
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    // When a driving category code is supplied, only return products that either
    // have no category restriction (NULL) or explicitly include this code.
    if (category_code && typeof category_code === 'string') {
      query = query.or(
        `allowed_driving_category_codes.is.null,allowed_driving_category_codes.cs.{${category_code}}`
      )
    }

    const { data: products, error } = await query

    if (error) {
      logger.error('❌ Error fetching products:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch products'
      })
    }

    logger.debug('✅ Products fetched:', {
      userId: userProfile.id,
      tenantId,
      category_code: category_code || 'all',
      count: products?.length || 0
    })

    return {
      success: true,
      data: products || []
    }

  } catch (error: any) {
    logger.error('❌ Staff get-products API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch products'
    })
  }
})

