import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getEffectiveCreditBalanceRappen } from '~/server/utils/effective-credit-balance'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined
  let auditDetails: any = {}

  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      await logAudit({
        action: 'customer_get_payment_page_data',
        status: 'failed',
        error_message: 'Authentication required',
        ip_address: ipAddress
      })
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAdmin = getSupabaseAdmin()

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      await logAudit({
        action: 'customer_get_payment_page_data',
        status: 'failed',
        error_message: 'Invalid or expired token',
        ip_address: ipAddress
      })
      throw createError({ statusCode: 401, statusMessage: 'Invalid or expired token' })
    }

    authenticatedUserId = user.id
    auditDetails.authenticated_user_id = authenticatedUserId

    // ============ LAYER 2: RATE LIMITING ============
    const canProceed = await checkRateLimit(
      authenticatedUserId,
      'customer_get_payment_page_data',
      30, // max 30 per minute
      60000
    )
    if (!canProceed) {
      await logAudit({
        user_id: authenticatedUserId,
        action: 'customer_get_payment_page_data',
        status: 'failed',
        error_message: 'Rate limit exceeded',
        ip_address: ipAddress,
        details: auditDetails
      })
      throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please try again later.' })
    }

    // ============ LAYER 4: AUTHORIZATION ============
    // Get requesting user's profile (to check role and tenant)
    const { data: requestingUser, error: reqUserError } = await supabaseAdmin
      .from('users')
      .select('id, role, tenant_id, auth_user_id, first_name, last_name, email, preferred_payment_method')
      .eq('auth_user_id', authenticatedUserId)
      .single()

    if (reqUserError || !requestingUser) {
      logger.error('Requesting user profile not found:', reqUserError)
      await logAudit({
        user_id: authenticatedUserId,
        action: 'customer_get_payment_page_data',
        status: 'failed',
        error_message: 'User profile not found',
        ip_address: ipAddress,
        details: auditDetails
      })
      throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
    }

    tenantId = requestingUser.tenant_id
    auditDetails.tenant_id = tenantId

    // Kunden-Fahrstundenkonto + Affiliate-Partner (Guthaben/Auszahlung im gleichen Panel)
    const allowedRoles = ['client', 'affiliate'] as const
    if (!allowedRoles.includes(requestingUser.role as (typeof allowedRoles)[number])) {
      logger.warn(`Unauthorized role attempting payment page data: ${requestingUser.role}`)
      await logAudit({
        user_id: authenticatedUserId,
        action: 'customer_get_payment_page_data',
        status: 'failed',
        error_message: 'Insufficient permissions - only client or affiliate allowed',
        ip_address: ipAddress,
        details: auditDetails
      })
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Only customers or affiliates can access this endpoint' })
    }

    const isAffiliateWalletOnly = requestingUser.role === 'affiliate'

    logger.debug(`📄 Loading payment page data`, {
      user_id: requestingUser.id,
      auth_user_id: authenticatedUserId,
      tenant_id: tenantId,
      role: requestingUser.role
    })

    // ============ LAYER 3: INPUT VALIDATION (implicit - no query params) ============

    // Fetch user's preferred payment method (already have it from user profile)
    const preferredPaymentMethod = requestingUser.preferred_payment_method || 'wallee'

    // ============ FETCH 1: Student Credit Balance (inkl. Legacy-/Journal-Fallback) ============
    const studentBalance = await getEffectiveCreditBalanceRappen(
      supabaseAdmin,
      requestingUser.id,
      tenantId
    )

    // ============ FETCH 2: Payments (nur Fahrschüler-Kontext; Affiliates: leer) ============
    let paymentsData: any[] | null = []
    if (!isAffiliateWalletOnly) {
      const res = await supabaseAdmin
        .from('payments')
        .select(`
        id,
        created_at,
        updated_at,
        appointment_id,
        user_id,
        staff_id,
        lesson_price_rappen,
        admin_fee_rappen,
        products_price_rappen,
        discount_amount_rappen,
        total_amount_rappen,
        payment_method,
        payment_status,
        paid_at,
        description,
        metadata,
        tenant_id,
        automatic_payment_consent,
        automatic_payment_consent_at,
        scheduled_payment_date,
        scheduled_authorization_date,
        payment_method_id,
        automatic_payment_processed,
        automatic_payment_processed_at,
        credit_used_rappen,
        credit_transaction_id,
        wallee_transaction_id,
        refunded_at,
        appointments (
          id,
          start_time,
          end_time,
          duration_minutes,
          status,
          confirmation_token,
          staff_id,
          deleted_at,
          cancellation_type,
          cancellation_charge_percentage,
          medical_certificate_status,
          medical_certificate_url,
          staff:users!staff_id (
            id,
            first_name,
            last_name
          )
        )
      `)
        .eq('tenant_id', tenantId)
        .eq('user_id', requestingUser.id)  // ✅ CRITICAL: Only customer's own payments!
        .order('created_at', { ascending: false })

      if (res.error) {
        logger.error('Error fetching payments:', res.error)
        await logAudit({
          user_id: requestingUser.id,
          auth_user_id: authenticatedUserId,
          action: 'customer_get_payment_page_data',
          status: 'failed',
          error_message: `Failed to fetch payments: ${res.error.message}`,
          ip_address: ipAddress,
          tenant_id: tenantId,
          details: auditDetails
        })
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch payments' })
      }
      paymentsData = res.data
    }

    // ============ LAYER 5: AUDIT LOGGING ============
    await logAudit({
      user_id: requestingUser.id,  // Use users.id, not auth.uid()
      auth_user_id: authenticatedUserId,
      action: 'customer_get_payment_page_data',
      resource_type: 'customer_data',
      resource_id: requestingUser.id,
      status: 'success',
      ip_address: ipAddress,
      tenant_id: tenantId,
      details: {
        ...auditDetails,
        payments_count: paymentsData?.length || 0,
        duration_ms: Date.now() - startTime
      }
    })

    // ============ LAYER 6: DATA AGGREGATION & SUMMARY STATS ============
    const payments = paymentsData || []
    
    // Calculate summary stats
    const stats = {
      total_payments: payments.length,
      pending_payments: payments.filter(p => p.payment_status === 'pending').length,
      paid_payments: payments.filter(p => p.payment_status === 'paid').length,
      failed_payments: payments.filter(p => p.payment_status === 'failed').length,
      pending_amount_rappen: payments
        .filter(p => p.payment_status === 'pending')
        .reduce((sum, p) => sum + (p.total_amount_rappen || 0), 0),
      paid_amount_rappen: payments
        .filter(p => p.payment_status === 'paid')
        .reduce((sum, p) => sum + (p.total_amount_rappen || 0), 0),
      total_amount_rappen: payments.reduce((sum, p) => sum + (p.total_amount_rappen || 0), 0)
    }

    logger.info(`✅ Fetched payment page data for user ${requestingUser.id}: ${stats.total_payments} payments (affiliate_wallet_only=${isAffiliateWalletOnly})`)

    return {
      success: true,
      data: {
        user: {
          id: requestingUser.id,
          first_name: requestingUser.first_name,
          last_name: requestingUser.last_name,
          email: requestingUser.email,
          preferred_payment_method: preferredPaymentMethod
        },
        student_balance_rappen: studentBalance,
        payments: payments,
        stats: stats
      }
    }

  } catch (error: any) {
    logger.error('Error in customer/get-payment-page-data API:', error)
    const errorMessage = error.statusMessage || error.message || 'Internal server error'
    const statusCode = error.statusCode || 500

    await logAudit({
      user_id: authenticatedUserId,
      action: 'customer_get_payment_page_data',
      status: 'error',
      error_message: errorMessage,
      ip_address: ipAddress,
      details: auditDetails
    })

    throw createError({ statusCode, statusMessage: errorMessage })
  }
})

