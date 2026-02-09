import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { logger } from '~/utils/logger'

interface UserPaymentSummary {
  user_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: string
  preferred_payment_method: string | null
  has_company_billing: boolean
  payment_status: 'invoiced' | 'open' | 'pending' | 'completed' | null
  pending_payment_count: number
  total_unpaid_amount: number
  total_appointments: number
  oldest_appointment_date: string | null // For sorting
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
    // Include ALL clients (active and inactive, with any onboarding status)
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
        is_active,
        onboarding_status
      `)
      .eq('tenant_id', tenantId)
      .eq('role', 'client')
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
      
      // Find all payments for this user
      const userPayments = (paymentsData || []).filter(payment => 
        payment.user_id === user.id
      )

      // Find appointments with pending/failed payments (unbezahlte Termine)
      const unpaidPaymentIds = userPayments
        .filter(p => p.payment_status === 'pending' || p.payment_status === 'failed')
        .map(p => p.appointment_id)
      
      const unpaidAppointments = userAppointments.filter(apt => 
        unpaidPaymentIds.includes(apt.id)
      )
      
      // Find the oldest UNPAID appointment date (for sorting)
      const oldestUnpaidAppointment = unpaidAppointments.length > 0
        ? unpaidAppointments.reduce((oldest, current) => {
            const oldestTime = new Date(oldest.start_time).getTime()
            const currentTime = new Date(current.start_time).getTime()
            return currentTime < oldestTime ? current : oldest
          })
        : null
      
      // Fallback: Find the oldest appointment date (any status)
      const oldestAppointment = userAppointments.length > 0
        ? userAppointments.reduce((oldest, current) => {
            const oldestTime = new Date(oldest.start_time).getTime()
            const currentTime = new Date(current.start_time).getTime()
            return currentTime < oldestTime ? current : oldest
          })
        : null

      // Count different payment statuses
      const invoicedCount = userPayments.filter(p => p.payment_status === 'invoiced').length
      const completedCount = userPayments.filter(p => p.payment_status === 'completed').length
      const paidCount = userPayments.filter(p => p.payment_status === 'paid').length
      const cancelledCount = userPayments.filter(p => 
        p.payment_status === 'canceled' || p.payment_status === 'cancelled' || p.payment_status === 'refunded'
      ).length
      const pendingFailedCount = userPayments.filter(p => 
        p.payment_status === 'pending' || p.payment_status === 'failed'
      ).length

      logger.debug(`🔍 Payment status counts for user ${user.id}:`, {
        invoiced: invoicedCount,
        completed: completedCount,
        paid: paidCount,
        cancelled: cancelledCount,
        pendingFailed: pendingFailedCount,
        total: userPayments.length,
        statuses: userPayments.map(p => p.payment_status)
      })

      // Calculate total unpaid amount (only pending/failed are truly unpaid)
      const totalUnpaidAmount = userPayments
        .filter(p => p.payment_status === 'pending' || p.payment_status === 'failed')
        .reduce((sum, payment) => {
          return sum + ((payment.total_amount_rappen || 0) / 100)
        }, 0)

      // Determine payment status:
      // Priority: completed > paid > invoiced > cancelled > open > null
      // - If ANY payment is 'pending' or 'failed' → 'open' with count
      // - If ANY payment is 'completed' or 'paid' → 'completed'
      // - If ALL payments are 'invoiced' → 'invoiced'
      // - If ALL payments are 'cancelled/refunded' → 'completed' (behandle als bezahlt)
      // - If NO payments → null
      let paymentStatus: 'invoiced' | 'open' | 'pending' | 'completed' | null = null
      let pendingCount = 0

      if (userPayments.length === 0) {
        paymentStatus = null
      } else if (pendingFailedCount > 0) {
        // There are pending or failed payments - highest priority
        paymentStatus = 'open'
        pendingCount = pendingFailedCount
      } else if (completedCount > 0 || paidCount > 0) {
        // There are completed or paid payments
        paymentStatus = 'completed'
        pendingCount = 0
      } else if (invoicedCount > 0) {
        // All are invoiced
        paymentStatus = 'invoiced'
        pendingCount = 0
      } else if (cancelledCount > 0) {
        // All are cancelled/refunded - treat as paid
        paymentStatus = 'completed'
        pendingCount = 0
      }

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
        payment_status: paymentStatus,
        pending_payment_count: pendingCount,
        total_unpaid_amount: totalUnpaidAmount,
        total_appointments: userAppointments.length,
        // ✅ Use oldest UNPAID appointment for sorting, fallback to oldest appointment
        oldest_appointment_date: oldestUnpaidAppointment?.start_time || oldestAppointment?.start_time || null
      }
    })

    // ✅ Sort by oldest appointment (ascending - oldest first)
    const sortedUsers = processedUsers.sort((a, b) => {
      // Users with appointments come first, sorted by oldest appointment
      if (a.oldest_appointment_date && b.oldest_appointment_date) {
        const aTime = new Date(a.oldest_appointment_date).getTime()
        const bTime = new Date(b.oldest_appointment_date).getTime()
        return aTime - bTime // Ascending: oldest first
      }
      // Users without appointments go to end
      if (a.oldest_appointment_date) return -1
      if (b.oldest_appointment_date) return 1
      return 0
    })

    // Apply pagination
    const paginatedUsers = sortedUsers.slice(offset, offset + limit)

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
      total_users: sortedUsers.length,
      users_with_invoiced: sortedUsers.filter(u => u.payment_status === 'invoiced').length,
      users_with_open_payments: sortedUsers.filter(u => u.payment_status === 'open').length,
      users_with_company_billing: sortedUsers.filter(u => u.has_company_billing).length,
      total_unpaid_amount: sortedUsers.reduce((sum, u) => sum + u.total_unpaid_amount, 0)
    }

    logger.debug(`✅ [get-payments-overview] Successfully loaded ${paginatedUsers.length} users (${sortedUsers.length} total), sorted by oldest appointment`)

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

