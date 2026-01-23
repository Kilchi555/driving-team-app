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
    logger.warn('🚫 Rate limit exceeded for get-pending-confirmations from IP:', ipAddress)
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
    })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('❌ Supabase credentials not configured for get-pending-confirmations API')
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
      logger.warn(`🚫 User ${authUser.id} with role ${userProfile.role} attempted to access pending confirmations.`)
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Only customers can access this endpoint' })
    }

    // ============ FETCH 1: Pending confirmation appointments with staff data ============
    const { data: confirmationsData, error: confirmationsError } = await serviceSupabase
      .from('appointments')
      .select(`
        id,
        user_id,
        tenant_id,
        title,
        start_time,
        end_time,
        duration_minutes,
        status,
        confirmation_token,
        type,
        event_type_code,
        staff:users!appointments_staff_id_fkey (
          id,
          first_name,
          last_name
        )
      `)
      .eq('user_id', userProfile.id)
      .eq('status', 'pending_confirmation')
      .eq('tenant_id', userProfile.tenant_id)
      .not('confirmation_token', 'is', null)
      .order('start_time', { ascending: true })

    if (confirmationsError) {
      logger.error('❌ Error fetching pending confirmations:', confirmationsError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch pending confirmations' })
    }

    if (!confirmationsData || confirmationsData.length === 0) {
      logger.info(`✅ No pending confirmations for customer ${userProfile.id}`)
      return { success: true, data: [] }
    }

    // ============ FETCH 2: Payment data for each appointment ============
    const appointmentIds = confirmationsData.map((apt: any) => apt.id)
    let paymentsMap = new Map()
    
    const { data: paymentsData, error: paymentsError } = await serviceSupabase
      .from('payments')
      .select(`
        id,
        appointment_id,
        total_amount_rappen,
        lesson_price_rappen,
        admin_fee_rappen,
        products_price_rappen,
        discount_amount_rappen,
        payment_method,
        payment_status,
        credit_used_rappen
      `)
      .in('appointment_id', appointmentIds)

    if (paymentsError) {
      logger.warn('⚠️ Error loading payments for confirmations:', paymentsError)
    } else if (paymentsData) {
      paymentsData.forEach((payment: any) => {
        // ✅ FIX: All *_rappen fields are ALREADY in Rappen - no conversion needed!
        // The database stores Rappen as INTEGER, Supabase returns them as-is
        paymentsMap.set(payment.appointment_id, payment)
      })
    }

    // ============ FETCH 3: Categories data ============
    const categoryCodes = [...new Set(confirmationsData.map((apt: any) => apt.type).filter(Boolean))]
    let categoriesMap = new Map()
    
    if (categoryCodes.length > 0) {
      const { data: categoriesData, error: categoriesError } = await serviceSupabase
        .from('categories')
        .select('id, code, name, is_active')
        .eq('tenant_id', userProfile.tenant_id)
        .in('code', categoryCodes)
        .eq('is_active', true)

      if (categoriesError) {
        logger.warn('⚠️ Error loading categories:', categoriesError)
      } else if (categoriesData) {
        categoriesData.forEach(cat => {
          categoriesMap.set(cat.code, cat)
        })
      }
    }

    // ============ FETCH 4: Payments loaded ============
    // (payment_items table no longer used)

    // ============ MERGE ALL DATA ============
    const enrichedConfirmations = confirmationsData.map((apt: any) => {
      const payment = paymentsMap.get(apt.id)
      const category = apt.type ? categoriesMap.get(apt.type) : null

      return {
        ...apt,
        payment: payment || null,
        categories: category || null
      }
    })

    logger.info(`✅ Fetched ${enrichedConfirmations.length} pending confirmations with full data for customer ${userProfile.id}`)
    return { success: true, data: enrichedConfirmations }

  } catch (error: any) {
    logger.error('❌ Error in get-pending-confirmations API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

