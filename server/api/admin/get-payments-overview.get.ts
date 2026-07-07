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
    const includeDeleted = query.include_deleted === 'true'

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

    // Fetch all payments — join appointment start_time directly to avoid the 1000-row limit
    // on a separate appointments query (there can be 2000+ appointments)
    const { data: paymentsData, error: paymentsError } = await supabaseAdmin
      .from('payments')
      .select(`
        user_id,
        appointment_id,
        payment_status,
        paid_at,
        total_amount_rappen,
        description,
        appointments(id, start_time, status, deleted_at)
      `)
      .eq('tenant_id', tenantId)

    if (paymentsError) {
      logger.error('❌ [get-payments-overview] Error loading payments:', paymentsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load payments'
      })
    }

    // Build a lookup: appointment_id → start_time from the joined data
    const appointmentStartTime: Record<string, string> = {}
    for (const p of paymentsData || []) {
      const apt = (p as any).appointments
      if (apt?.id && apt?.start_time) {
        appointmentStartTime[apt.id] = apt.start_time
      }
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
      // Find all payments for this user
      const userPayments = (paymentsData || []).filter(payment => 
        payment.user_id === user.id
      )

      // Find open payments and their appointment start_times (from joined data)
      // Exclude payments linked to soft-deleted appointments (unless include_deleted is set)
      const openPayments = userPayments.filter(p => {
        const apt = (p as any).appointments
        if (!includeDeleted && apt?.deleted_at) return false
        return (
          p.payment_status === 'pending' ||
          p.payment_status === 'failed' ||
          p.payment_status === 'invoiced' ||
          p.payment_status === 'invoice'
        )
      })

      // Find oldest open appointment date using the joined appointment data
      let oldestOpenDate: string | null = null
      for (const p of openPayments) {
        const startTime = p.appointment_id ? appointmentStartTime[p.appointment_id] : null
        if (startTime) {
          if (!oldestOpenDate || new Date(startTime) < new Date(oldestOpenDate)) {
            oldestOpenDate = startTime
          }
        }
      }

      // Total appointments = unique appointment IDs in payments for this user
      const uniqueAppointmentIds = new Set(
        userPayments.filter(p => p.appointment_id).map(p => p.appointment_id)
      )
      const totalAppointmentsCount = uniqueAppointmentIds.size

      // Count different payment statuses
      // Note: 'invoice' (without 'd') is a legacy status that means the same as 'invoiced'
      const invoicedCount = userPayments.filter(p => (p.payment_status === 'invoiced' || p.payment_status === 'invoice') && (includeDeleted || !(p as any).appointments?.deleted_at)).length
      const completedCount = userPayments.filter(p => p.payment_status === 'completed').length
      const paidCount = userPayments.filter(p => p.payment_status === 'paid').length
      const cancelledCount = userPayments.filter(p => 
        p.payment_status === 'canceled' || p.payment_status === 'cancelled' || p.payment_status === 'refunded'
      ).length
      const pendingFailedCount = userPayments.filter(p => 
        (p.payment_status === 'pending' || p.payment_status === 'failed') && (includeDeleted || !(p as any).appointments?.deleted_at)
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

      // Calculate total unpaid amount: pending/failed (not yet paid) + invoiced (billed but not received)
      // Exclude payments linked to soft-deleted appointments (unless include_deleted is set)
      const totalUnpaidAmount = userPayments
        .filter(p => {
          const apt = (p as any).appointments
          if (!includeDeleted && apt?.deleted_at) return false
          return (
            p.payment_status === 'pending' ||
            p.payment_status === 'failed' ||
            p.payment_status === 'invoiced' ||
            p.payment_status === 'invoice'
          )
        })
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
        total_appointments: totalAppointmentsCount,
        // Oldest open appointment date — computed from joined payment→appointment data (no row limit issue)
        oldest_appointment_date: oldestOpenDate
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

