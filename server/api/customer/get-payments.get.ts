import { defineEventHandler, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'

export default defineEventHandler(async (event) => {
  // Get client IP for rate limiting
  const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 
                    getHeader(event, 'x-real-ip') || 
                    event.node.req.socket.remoteAddress || 
                    'unknown'
  
  // Apply rate limiting: 30 requests per minute per IP
  const rateLimit = await checkRateLimit(ipAddress, 'register', 30, 60 * 1000)
  if (!rateLimit.allowed) {
    logger.warn('🚫 Rate limit exceeded for get-payments from IP:', ipAddress)
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
    })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('❌ Supabase credentials not configured for get-payments API')
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error'
    })
  }

  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Get authenticated user
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // Get user's profile
    const { data: userProfile, error: userProfileError } = await serviceSupabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userProfileError || !userProfile) {
      logger.warn(`⚠️ User profile not found for auth_user_id: ${authUser.id}`)
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    // Only customers (role: 'client') can use this endpoint
    if (userProfile.role !== 'client') {
      logger.warn(`🚫 User ${authUser.id} with role ${userProfile.role} attempted to access customer payments.`)
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Only customers can access this endpoint' })
    }

    // Fetch payments with all related data including staff info
    const { data: paymentsData, error: paymentsError } = await serviceSupabase
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
      .eq('tenant_id', userProfile.tenant_id)
      .order('created_at', { ascending: false })

    if (paymentsError) {
      logger.error('❌ Error fetching payments:', paymentsError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch payments' })
    }

    logger.info(`✅ Fetched ${paymentsData?.length || 0} payments for customer ${userProfile.id}`)
    return { success: true, data: paymentsData || [] }

  } catch (error: any) {
    logger.error('❌ Error in get-payments API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

