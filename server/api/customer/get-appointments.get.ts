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
    logger.warn('🚫 Rate limit exceeded for get-appointments from IP:', ipAddress)
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
    })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('❌ Supabase credentials not configured for get-appointments API')
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

    // Get user's profile to determine if customer
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
      logger.warn(`🚫 User ${authUser.id} with role ${userProfile.role} attempted to access customer appointments.`)
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Only customers can access this endpoint' })
    }

    // Fetch appointments with all related data using service role (bypasses RLS)
    const { data: appointmentsData, error: appointmentsError } = await serviceSupabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        status,
        location_id,
        type,
        event_type_code,
        user_id,
        staff_id,
        tenant_id,
        confirmation_token,
        staff:users!staff_id (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        notes (
          id,
          staff_rating,
          staff_note,
          evaluation_criteria_id,
          criteria_rating,
          criteria_note,
          created_at,
          tenant_id
        ),
        exam_results (
          id,
          passed,
          exam_date,
          examiner_behavior_rating,
          examiner_behavior_notes
        )
      `)
      .eq('user_id', userProfile.id)
      .is('deleted_at', null)
      .order('start_time', { ascending: false })

    if (appointmentsError) {
      logger.error('❌ Error fetching appointments:', appointmentsError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch appointments' })
    }

    // ✅ Load payments for all appointments
    const appointmentIds = (appointmentsData || []).map(a => a.id)
    let paymentsMap: Record<string, any> = {}
    
    if (appointmentIds.length > 0) {
      const { data: paymentsData, error: paymentsError } = await serviceSupabase
        .from('payments')
        .select(`
          id,
          appointment_id,
          lesson_price_rappen,
          admin_fee_rappen,
          products_price_rappen,
          discount_amount_rappen,
          total_amount_rappen,
          credit_used_rappen,
          payment_status,
          payment_method,
          paid_at
        `)
        .in('appointment_id', appointmentIds)
      
      if (paymentsError) {
        logger.warn('⚠️ Error fetching payments for appointments:', paymentsError)
      } else if (paymentsData) {
        // Create a map of appointment_id -> payment
        paymentsMap = paymentsData.reduce((acc, payment) => {
          acc[payment.appointment_id] = payment
          return acc
        }, {} as Record<string, any>)
      }
    }

    // ✅ Filter notes to only include those for the user's tenant
    const appointmentsWithFilteredNotes = (appointmentsData || []).map(appointment => ({
      ...appointment,
      notes: (appointment.notes || []).filter((note: any) => 
        note.tenant_id === userProfile.tenant_id || note.tenant_id === null
      )
    }))

    // ✅ Merge payments into appointments
    const appointmentsWithPayments = (appointmentsWithFilteredNotes || []).map(appointment => ({
      ...appointment,
      payment: paymentsMap[appointment.id] || null
    }))

    logger.info(`✅ Fetched ${appointmentsWithPayments.length} appointments for customer ${userProfile.id}`)
    return { success: true, data: appointmentsWithPayments }

  } catch (error: any) {
    logger.error('❌ Error in get-appointments API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

