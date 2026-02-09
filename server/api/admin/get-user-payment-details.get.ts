import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // ✅ 1. AUTHENTICATION
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const userId = authUser.id

    // ✅ 2. RATE LIMITING
    const clientIP = getClientIP(event)
    const rateLimitResult = await checkRateLimit(clientIP, 'admin_user_details', 30)
    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `Too many requests. Try again in ${rateLimitResult.retryAfter} seconds`
      })
    }

    // ✅ 3. AUTHORIZATION
    const supabaseAdmin = getSupabaseAdmin()
    
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, role, tenant_id, is_active')
      .eq('auth_user_id', userId)
      .single()

    if (adminError || !adminUser) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    if (adminUser.role !== 'admin' && adminUser.role !== 'staff') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Admin role required'
      })
    }

    const tenantId = adminUser.tenant_id

    // ✅ 4. INPUT VALIDATION
    const query = getQuery(event)
    const targetUserId = query.id as string
    
    if (!targetUserId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing user ID parameter'
      })
    }

    // ✅ 5. LOAD USER DETAILS
    const { data: userDetails, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        preferred_payment_method,
        default_company_billing_address_id,
        is_active,
        tenant_id
      `)
      .eq('id', targetUserId)
      .eq('tenant_id', tenantId)
      .single()

    if (userError || !userDetails) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // ✅ 6. LOAD STUDENT CREDITS
    const { data: studentCredit } = await supabaseAdmin
      .from('student_credits')
      .select('id, balance_rappen, updated_at')
      .eq('user_id', targetUserId)
      .single()

    // ✅ 7. LOAD APPOINTMENTS
    const { data: appointments, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        status,
        type,
        deleted_at,
        event_type_code,
        staff_id
      `)
      .eq('user_id', targetUserId)
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: false })

    if (appointmentsError) {
      logger.warn('Warning loading appointments:', appointmentsError)
    }

    // ✅ 8. LOAD STAFF INFO
    const appointmentIds = (appointments || []).map(a => a.id)
    const staffIds = (appointments || []).map(a => a.staff_id).filter(Boolean)
    
    let staffMap = new Map<string, any>()
    if (staffIds.length > 0) {
      const { data: staffData } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name')
        .in('id', staffIds)
      
      if (staffData) {
        staffData.forEach(staff => {
          staffMap.set(staff.id, staff)
        })
      }
    }

    // ✅ 9. LOAD PAYMENTS
    let payments: any[] = []
    if (appointmentIds.length > 0) {
      const { data: paymentsData } = await supabaseAdmin
        .from('payments')
        .select('*')
        .in('appointment_id', appointmentIds)
      
      payments = paymentsData || []
    }

    // ✅ 10. LOAD PRODUCTS & DISCOUNTS
    let products: any[] = []
    let discounts: any[] = []
    
    if (appointmentIds.length > 0) {
      const { data: productsData } = await supabaseAdmin
        .from('product_sales')
        .select(`
          id,
          appointment_id,
          quantity,
          unit_price_rappen,
          total_price_rappen,
          product_id,
          products (
            id,
            name,
            description
          )
        `)
        .in('appointment_id', appointmentIds)
      
      products = productsData || []

      const { data: discountsData } = await supabaseAdmin
        .from('discount_sales')
        .select(`
          id,
          appointment_id,
          amount_rappen,
          discount_type,
          reason
        `)
        .in('appointment_id', appointmentIds)
      
      discounts = discountsData || []
    }

    // ✅ 11. LOAD EVENT TYPES
    const { data: eventTypes } = await supabaseAdmin
      .from('event_types')
      .select('*')
      .eq('tenant_id', tenantId)

    // ✅ 12. LOAD COMPANY BILLING ADDRESS
    let companyBillingAddress: any = null
    logger.debug(`🔍 DEBUG: User default_company_billing_address_id = ${userDetails.default_company_billing_address_id}`)
    
    // Try to find billing address by user_id first, then by default_company_billing_address_id
    if (userDetails.default_company_billing_address_id) {
      // Try direct ID match first
      const { data: billingData, error: billingError } = await supabaseAdmin
        .from('company_billing_addresses')
        .select(`
          id,
          company_name,
          contact_person,
          email,
          phone,
          street,
          street_number,
          zip,
          city,
          country,
          vat_number,
          company_register_number
        `)
        .eq('id', userDetails.default_company_billing_address_id)
        .eq('tenant_id', tenantId)
        .single()
      
      if (!billingError && billingData) {
        logger.debug(`✅ Billing address loaded by ID:`, billingData)
        companyBillingAddress = billingData
      }
    }
    
    // If not found by ID, try to find by user_id
    if (!companyBillingAddress) {
      const { data: billingDataByUser, error: billingErrorByUser } = await supabaseAdmin
        .from('company_billing_addresses')
        .select(`
          id,
          company_name,
          contact_person,
          email,
          phone,
          street,
          street_number,
          zip,
          city,
          country,
          vat_number,
          company_register_number
        `)
        .eq('user_id', targetUserId)
        .eq('tenant_id', tenantId)
        .single()
      
      if (!billingErrorByUser && billingDataByUser) {
        logger.debug(`✅ Billing address loaded by user_id:`, billingDataByUser)
        companyBillingAddress = billingDataByUser
      } else if (billingErrorByUser) {
        logger.debug(`ℹ️ No billing address found for user ${targetUserId}`)
      }
    }

    // ✅ AUDIT LOGGING
    await logAudit({
      user_id: userId,
      action: 'admin_view_user_payment_details',
      resource_type: 'user',
      resource_id: targetUserId,
      status: 'success',
      ip_address: clientIP,
    })

    logger.debug(`✅ Loaded payment details for user ${targetUserId}`)

    return {
      success: true,
      user: userDetails,
      studentCredit,
      appointments,
      staffMap: Object.fromEntries(staffMap),
      payments,
      products,
      discounts,
      eventTypes,
      companyBillingAddress
    }

  } catch (error: any) {
    logger.error('Error in get-user-payment-details API:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch user details'
    })
  }
})
