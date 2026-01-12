import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'

/**
 * GET /api/admin/get-product-sales
 * 
 * Secure API for fetching product sales data
 * 
 * Security Layers:
 * ✅ Layer 1: Authentication (user must be logged in)
 * ✅ Layer 2: Authorization (admin/staff only)
 * ✅ Layer 3: Rate Limiting (120 req/min per user)
 * ✅ Layer 4: Tenant Isolation (can only see own tenant)
 * ✅ Layer 5: Input Validation (query params validated)
 * ✅ Layer 6: Pagination (limit 100)
 * ✅ Layer 7: Audit Logging (all access logged)
 */

interface ProductSale {
  id: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  product_count: number
  product_names: string
  total_amount_rappen: number
  status: string
  created_at: string
  sale_type: 'direct' | 'anonymous' | 'shop'
}

interface TenantInfo {
  id: string
  name: string
  slug: string
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError || !userProfile) {
      logger.warn('⚠️ User profile not found:', authUser.id)
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    // ============ LAYER 2: AUTHORIZATION ============
    const allowedRoles = ['admin', 'staff']
    if (!allowedRoles.includes(userProfile.role)) {
      logger.warn('⚠️ Unauthorized access attempt:', {
        userId: userProfile.id,
        role: userProfile.role,
        requiredRoles: allowedRoles
      })
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden: Admin/Staff access required'
      })
    }

    const tenantId = userProfile.tenant_id
    const userId = userProfile.id

    // ============ LAYER 3: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      userId,
      'get_product_sales',
      120, // 120 requests per minute
      60 * 1000
    )

    if (!rateLimitResult.allowed) {
      logger.warn('⚠️ Rate limit exceeded:', {
        userId,
        operation: 'get_product_sales'
      })
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests. Please try again later.'
      })
    }

    // ============ LAYER 5: INPUT VALIDATION ============
    const query = getQuery(event)
    const limit = Math.min(parseInt(query.limit as string) || 100, 1000) // Max 1000
    const offset = Math.max(parseInt(query.offset as string) || 0, 0)

    if (isNaN(limit) || isNaN(offset) || limit < 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid pagination parameters'
      })
    }

    logger.debug('📊 Fetching product sales:', {
      tenantId,
      userId,
      limit,
      offset
    })

    // ============ LAYER 4: TENANT ISOLATION + DATA LOADING ============
    
    // 0. Load tenant info
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, name, slug')
      .eq('id', tenantId)
      .single()

    if (tenantError) {
      logger.error('❌ Error fetching tenant:', tenantError)
      throw tenantError
    }

    const tenantInfo: TenantInfo = {
      id: tenantData.id,
      name: tenantData.name,
      slug: tenantData.slug
    }
    
    // 1. Load all payments for this tenant with products
    const { data: paymentsData, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select(`
        id,
        user_id,
        staff_id,
        total_amount_rappen,
        payment_status,
        payment_method,
        created_at,
        updated_at,
        description,
        metadata
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (paymentsError) {
      logger.error('❌ Error fetching payments:', paymentsError)
      throw paymentsError
    }

    // 2. Load customer info for payments with user_id
    const directSalesWithUsers = paymentsData?.filter(sale => sale.user_id) || []
    const directUserIds = [
      ...new Set(
        directSalesWithUsers.map(sale => sale.user_id).filter(Boolean) || []
      )
    ]

    let directUsersData: any[] = []
    if (directUserIds.length > 0) {
      const { data, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .in('id', directUserIds)
        .eq('tenant_id', tenantId) // ✅ Tenant isolation for users too

      if (usersError) {
        logger.error('❌ Error fetching user data:', usersError)
        throw usersError
      }
      directUsersData = data || []
    }

    // 3. Load product items for all payments
    const paymentIds = paymentsData?.map(sale => sale.id) || []
    let itemsData: any[] = []
    if (paymentIds.length > 0) {
      const { data, error: itemsError } = await supabaseAdmin
        .from('payment_items')
        .select('payment_id, item_name, quantity, unit_price_rappen, total_price_rappen')
        .in('payment_id', paymentIds)
        .eq('item_type', 'product')

      if (itemsError) {
        logger.error('❌ Error fetching payment items:', itemsError)
        throw itemsError
      }
      itemsData = data || []
    }

    // 4. Load shop sales from invited_customers
    const { data: shopSalesData, error: shopSalesError } = await supabaseAdmin
      .from('invited_customers')
      .select('*')
      .not('metadata->products', 'is', null) // Only customers with products
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (shopSalesError) {
      logger.error('❌ Error fetching shop sales:', shopSalesError)
      throw shopSalesError
    }

    // ============ LAYER 6: TRANSFORM DATA ============
    
    const usersMap = new Map(directUsersData.map(user => [user.id, user]))
    const itemsMap = new Map()

    itemsData?.forEach((item: any) => {
      if (!itemsMap.has(item.payment_id)) {
        itemsMap.set(item.payment_id, [])
      }
      itemsMap.get(item.payment_id).push(item)
    })

    const results: ProductSale[] = []

    // Process direct sales (with customers)
    directSalesWithUsers.forEach(sale => {
      const user = usersMap.get(sale.user_id)
      const items = itemsMap.get(sale.id) || []

      results.push({
        id: sale.id,
        customer_name: user
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
          : 'Unbekannt',
        customer_email: user?.email,
        customer_phone: user?.phone,
        product_count: items.length,
        product_names: items.length > 0
          ? items.map((item: any) => item.item_name).filter(Boolean).join(', ')
          : 'Keine Produkte',
        total_amount_rappen: sale.total_amount_rappen || 0,
        status: sale.payment_status || 'pending',
        created_at: sale.created_at || new Date().toISOString(),
        sale_type: 'direct'
      })
    })

    // Process anonymous sales (without customers)
    const anonymousSales = paymentsData?.filter(sale => !sale.user_id) || []
    anonymousSales.forEach(sale => {
      const items = itemsMap.get(sale.id) || []
      const metadata = sale.metadata || {}

      results.push({
        id: sale.id,
        customer_name: metadata.customer_name || 'Anonymer Kunde',
        customer_email: metadata.customer_email,
        customer_phone: metadata.customer_phone,
        product_count: items.length,
        product_names: items.length > 0
          ? items.map((item: any) => item.item_name).filter(Boolean).join(', ')
          : 'Keine Produkte',
        total_amount_rappen: sale.total_amount_rappen || 0,
        status: sale.payment_status || 'completed',
        created_at: sale.created_at || new Date().toISOString(),
        sale_type: 'anonymous'
      })
    })

    // Process shop sales (from invited_customers)
    shopSalesData?.forEach(customer => {
      const products = customer.metadata?.products || []
      if (products.length > 0) {
        const totalAmount = products.reduce((sum: number, product: any) => sum + (product.total_price_rappen || 0), 0)
        
        results.push({
          id: customer.id,
          customer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
          customer_email: customer.email,
          customer_phone: customer.phone,
          product_count: products.length,
          product_names: products.map((product: any) => product.product_name).filter(Boolean).join(', '),
          total_amount_rappen: totalAmount,
          status: 'completed', // Shop sales are completed by default
          created_at: customer.created_at,
          sale_type: 'shop'
        })
      }
    })

    // Sort all sales by date (newest first)
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // ============ LAYER 7: AUDIT LOGGING ============
    await logAudit({
      user_id: userId,
      action: 'get_product_sales',
      resource_type: 'product_sales',
      resource_id: tenantId,
      status: 'success',
      details: {
        result_count: results.length,
        direct_sales: results.filter(s => s.sale_type === 'direct').length,
        anonymous_sales: results.filter(s => s.sale_type === 'anonymous').length,
        shop_sales: results.filter(s => s.sale_type === 'shop').length,
        limit,
        offset,
        duration_ms: Date.now() - startTime
      }
    })

    logger.debug('✅ Product sales fetched successfully:', {
      tenantId,
      count: results.length,
      direct: results.filter(s => s.sale_type === 'direct').length,
      anonymous: results.filter(s => s.sale_type === 'anonymous').length,
      shop: results.filter(s => s.sale_type === 'shop').length,
      durationMs: Date.now() - startTime
    })

    return {
      success: true,
      data: results,
      tenant: tenantInfo,
      pagination: {
        limit,
        offset,
        total: results.length
      }
    }
  } catch (error: any) {
    logger.error('❌ Error in get-product-sales API:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})

