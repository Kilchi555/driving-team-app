import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'

interface UserPaymentSummary {
  user_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: string
  preferred_payment_method: string | null
  has_company_billing: boolean
  has_unpaid_appointments: boolean
  total_unpaid_amount: number
  total_appointments: number
}

interface ApiResponse {
  success: boolean
  data?: UserPaymentSummary[]
  stats?: {
    total_users: number
    users_with_unpaid: number
    users_with_company_billing: number
    total_unpaid_amount: number
  }
  error?: string
}

export default defineEventHandler(async (event): Promise<ApiResponse> => {
  try {
    // ✅ 1. AUTHENTICATION - Verify Bearer token
    const authUser = await getAuthenticatedUser(event)
    if (!authUser?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const userId = authUser.id

    // ✅ 2. RATE LIMITING - Prevent abuse
    const clientIP = getClientIP(event)
    const rateLimitResult = await checkRateLimit(clientIP, 'admin_payments_overview', 30)
    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: `Too many requests. Try again in ${rateLimitResult.retryAfter} seconds`
      })
    }

    // ✅ 3. AUTHORIZATION - Get admin user and check permissions
    const supabaseAdmin = getSupabaseAdmin()
    
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id, role, tenant_id, is_active')
      .eq('auth_user_id', userId)
      .single()

    if (adminError || !adminUser) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied - Admin user not found'
      })
    }

    if (adminUser.role !== 'admin' && adminUser.role !== 'staff') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied - Admin role required'
      })
    }

    if (!adminUser.is_active) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied - User is inactive'
      })
    }

    const tenantId = adminUser.tenant_id

    // ✅ 4. INPUT VALIDATION
    const query = getQuery(event)
    const limit = Math.min(parseInt(query.limit as string) || 1000, 1000)
    const offset = Math.max(parseInt(query.offset as string) || 0, 0)

    logger.debug(`🔍 [get-payments-overview] User ${userId} requesting payments overview for tenant ${tenantId}`)

    // ✅ 5. TENANT ISOLATION - Only fetch data for own tenant
    const { data: usersData, error: usersError } = await supabaseAdmin
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
        is_active
      `)
      .eq('tenant_id', tenantId)
      .eq('role', 'client')
      .eq('is_active', true)
      .order('first_name')

    if (usersError) {
      logger.error('❌ [get-payments-overview] Error loading users:', usersError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load users'
      })
    }

    // Fetch appointments for all users
    const { data: appointmentsData, error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        user_id,
        start_time,
        duration_minutes,
        status,
        created_at
      `)
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: false })

    if (appointmentsError) {
      logger.error('❌ [get-payments-overview] Error loading appointments:', appointmentsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load appointments'
      })
    }

    // Fetch all payments
    const { data: paymentsData, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select(`
        user_id,
        appointment_id,
        payment_status,
        paid_at,
        total_amount_rappen,
        description
      `)
      .eq('tenant_id', tenantId)

    if (paymentsError) {
      logger.error('❌ [get-payments-overview] Error loading payments:', paymentsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load payments'
      })
    }

    // Fetch company billing addresses
    const { data: billingData, error: billingError } = await supabaseAdmin
      .from('company_billing_addresses')
      .select('created_by')
      .eq('tenant_id', tenantId)

    if (billingError) {
      logger.warn('⚠️ [get-payments-overview] Warning loading billing addresses:', billingError)
    }

    // ✅ 6. DATA TRANSFORMATION - Process and aggregate data
    const processedUsers: UserPaymentSummary[] = (usersData || []).map(user => {
      // Find all appointments for this user
      const userAppointments = (appointmentsData || []).filter(appointment => 
        appointment.user_id === user.id
      )
      
      // Find unpaid payments for this user
      const userUnpaidPayments = (paymentsData || []).filter(payment => 
        payment.user_id === user.id && 
        (payment.payment_status === 'pending' || !payment.paid_at)
      )

      // Calculate total unpaid amount
      const totalUnpaidAmount = userUnpaidPayments.reduce((sum, payment) => {
        return sum + ((payment.total_amount_rappen || 0) / 100)
      }, 0)

      // Check company billing
      const hasCompanyBilling = (billingData || []).some(billing => billing.created_by === user.id) || 
                               !!user.default_company_billing_address_id

      return {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferred_payment_method: user.preferred_payment_method,
        has_company_billing: hasCompanyBilling,
        has_unpaid_appointments: userUnpaidPayments.length > 0,
        total_unpaid_amount: totalUnpaidAmount,
        total_appointments: userAppointments.length
      }
    })

    // Apply pagination
    const paginatedUsers = processedUsers.slice(offset, offset + limit)

    // ✅ 7. AUDIT LOGGING - Log the request
    await logAudit({
      tenant_id: tenantId,
      user_id: userId,
      action: 'VIEW_PAYMENTS_OVERVIEW',
      resource_type: 'payments',
      resource_id: null,
      details: {
        users_loaded: processedUsers.length,
        limit,
        offset,
        ip_address: clientIP
      },
      severity: 'info'
    })

    // ✅ 8. RESPONSE - Return aggregated stats
    const stats = {
      total_users: processedUsers.length,
      users_with_unpaid: processedUsers.filter(u => u.has_unpaid_appointments).length,
      users_with_company_billing: processedUsers.filter(u => u.has_company_billing).length,
      total_unpaid_amount: processedUsers.reduce((sum, u) => sum + u.total_unpaid_amount, 0)
    }

    logger.debug(`✅ [get-payments-overview] Successfully loaded ${paginatedUsers.length} users (${processedUsers.length} total)`)

    return {
      success: true,
      data: paginatedUsers,
      stats
    }

  } catch (error: any) {
    logger.error('❌ [get-payments-overview] Error:', error)

    // ✅ 9. ERROR HANDLING - Return appropriate error
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})

