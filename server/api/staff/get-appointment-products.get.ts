import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-appointment-products
 * 
 * Secure API to fetch products sold in an appointment
 * Used in PriceDisplay component for showing product details
 * 
 * Query Params:
 *   - appointmentId: Appointment ID (required)
 * 
 * Returns:
 *   - Array of products with pricing and details
 * 
 * Security Layers:
 *   1. Authentication (HTTP-Only Cookie)
 *   2. Tenant Isolation
 *   3. Ownership Check (user must be staff for this appointment)
 */

export default defineEventHandler(async (event) => {
  try {
    // ✅ LAYER 1: AUTHENTICATION
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
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
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    const tenantId = userProfile.tenant_id
    const userId = userProfile.id

    // ✅ LAYER 3: INPUT VALIDATION
    const query = getQuery(event)
    const appointmentId = query.appointmentId as string | undefined

    if (!appointmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Appointment ID is required'
      })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(appointmentId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid appointment ID format'
      })
    }

    // ✅ LAYER 4: Verify appointment exists and user has access
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('id, staff_id, tenant_id')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .single()

    if (appointmentError || !appointment) {
      logger.warn(`⚠️ Appointment not found or access denied: ${appointmentId}`)
      throw createError({
        statusCode: 404,
        statusMessage: 'Appointment not found'
      })
    }

    // ✅ LAYER 5: Permission check - only staff assigned to this appointment or admin
    const isAdmin = ['admin', 'tenant_admin', 'super_admin'].includes(userProfile.role)
    const isStaffForAppointment = appointment.staff_id === userId
    
    if (!isAdmin && !isStaffForAppointment) {
      logger.warn(`🚫 User ${userId} attempted to access appointment ${appointmentId} they don't own`)
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    // ✅ LAYER 6: Fetch product_sales for this appointment directly
    let productSalesData = null

    const { data: sales, error: error1 } = await supabaseAdmin
      .from('product_sales')
      .select(`
        id,
        quantity,
        unit_price_rappen,
        total_price_rappen,
        product_id
      `)
      .eq('appointment_id', appointmentId)
      .eq('tenant_id', tenantId)

    if (error1) {
      // A real query error — log it, but don't fail the whole request since
      // "no products" is a valid, common state for an appointment.
      logger.warn('⚠️ Error fetching product_sales:', error1)
    } else if (Array.isArray(sales) && sales.length > 0) {
      productSalesData = sales
      logger.debug('✅ Fetched product_sales:', sales.length)
    } else {
      // No error and no rows — this appointment simply has no products sold.
      logger.debug('ℹ️ No product_sales found for appointment (normal):', appointmentId)
    }

    let products: any[] = []

    // ✅ Map product_sales to products
    if (Array.isArray(productSalesData) && productSalesData.length > 0) {
      // Get all product IDs
      const productIds = productSalesData
        .map((p: any) => p.product_id)
        .filter((id: string | null) => id !== null && id !== undefined) as string[]
      
      logger.debug('📦 Found product IDs:', productIds)
      
      // Fetch all products at once
      let productsMap: Record<string, any> = {}
      if (productIds.length > 0) {
        const { data: productsData, error: prodError } = await supabaseAdmin
          .from('products')
          .select('id, name, description')
          .in('id', productIds)
        
        if (prodError) {
          logger.warn('⚠️ Error fetching products:', prodError)
        } else if (Array.isArray(productsData)) {
          productsMap = productsData.reduce((map: Record<string, any>, prod: any) => {
            map[prod.id] = prod
            return map
          }, {})
          logger.debug('✅ Fetched product details:', productsMap)
        }
      }
      
      // Map to final products array
      products = productSalesData.map((p: any) => {
        const productDetail = p.product_id ? productsMap[p.product_id] : null
        return {
          id: p.id,
          name: productDetail?.name || 'Produkt',
          description: productDetail?.description || '',
          quantity: p.quantity || 1,
          price_rappen: typeof p.unit_price_rappen === 'number' ? p.unit_price_rappen : 0,
          total_price_rappen: typeof p.total_price_rappen === 'number' ? p.total_price_rappen : 0,
          price: undefined
        }
      })
      logger.debug('✅ Found products via product_sales table:', products.length, products)
    }

    logger.debug('✅ Appointment products retrieved:', {
      appointmentId,
      productCount: products.length
    })

    return {
      success: true,
      data: products
    }

  } catch (error: any) {
    logger.error('❌ Staff get-appointment-products API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch appointment products'
    })
  }
})
