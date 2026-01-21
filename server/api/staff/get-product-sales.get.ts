import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-product-sales
 * 
 * Secure API to fetch product sales for PriceDisplay
 * 
 * Query Params:
 *   - discount_id (optional): Filter by discount ID
 *   - appointment_id (optional): Filter by appointment ID
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
    const discountId = query.discount_id as string | undefined
    const appointmentId = query.appointment_id as string | undefined

    // Validate UUIDs if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (discountId && !uuidRegex.test(discountId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid discount ID format'
      })
    }
    if (appointmentId && !uuidRegex.test(appointmentId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid appointment ID format'
      })
    }

    // ✅ LAYER 4: DATABASE QUERY with filters
    let queryBuilder = supabaseAdmin
      .from('product_sales')
      .select(`
        id,
        product_id,
        quantity,
        unit_price_rappen,
        total_price_rappen,
        discount_sale_id,
        appointment_id,
        products (id, name, price_rappen)
      `)
      .eq('tenant_id', tenantId)

    if (discountId) {
      // Find discount_sale first
      const { data: discountSale } = await supabaseAdmin
        .from('discount_sales')
        .select('id')
        .eq('discount_id', discountId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (discountSale) {
        queryBuilder = queryBuilder.eq('discount_sale_id', discountSale.id)
      } else {
        // No matching discount_sale found
        return {
          success: true,
          data: []
        }
      }
    }

    if (appointmentId) {
      queryBuilder = queryBuilder.eq('appointment_id', appointmentId)
    }

    const { data: productSales, error } = await queryBuilder

    if (error) {
      logger.error('❌ Error fetching product sales:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch product sales'
      })
    }

    // ✅ LAYER 5: AUDIT LOGGING
    logger.debug('✅ Product sales fetched:', {
      userId: userProfile.id,
      tenantId,
      count: productSales?.length || 0,
      discountId,
      appointmentId
    })

    return {
      success: true,
      data: productSales || []
    }

  } catch (error: any) {
    logger.error('❌ Staff get-product-sales API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch product sales'
    })
  }
})

