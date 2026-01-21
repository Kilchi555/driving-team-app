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

    // ✅ Load notes SEPARATELY to avoid RLS issues with JOINs
    const appointmentIds = (appointmentsData || []).map(a => a.id)
    let notesMap: Record<string, any[]> = {}
    
    if (appointmentIds.length > 0) {
      logger.debug('📝 Searching notes for appointment IDs:', appointmentIds.slice(0, 5), '... (total:', appointmentIds.length, ')')
      
      const { data: notesData, error: notesError } = await serviceSupabase
        .from('notes')
        .select(`
          id,
          appointment_id,
          staff_rating,
          staff_note,
          evaluation_criteria_id,
          criteria_rating,
          criteria_note,
          created_at,
          tenant_id
        `)
        .in('appointment_id', appointmentIds)
      
      logger.debug('📝 Notes query result:', { 
        notesDataCount: notesData?.length || 0, 
        notesError: notesError?.message,
        sampleNotes: notesData?.slice(0, 3)?.map(n => ({
          id: n.id,
          apt_id: n.appointment_id,
          criteria_id: n.evaluation_criteria_id,
          rating: n.criteria_rating,
          tenant_id: n.tenant_id
        }))
      })
      
      if (notesError) {
        logger.warn('⚠️ Error fetching notes:', notesError)
      } else if (notesData) {
        // Filter notes by tenant_id (keep only notes for this tenant or with NULL tenant_id)
        const filteredNotes = notesData.filter((note: any) => 
          note.tenant_id === userProfile.tenant_id || note.tenant_id === null
        )
        
        logger.debug('📝 Notes after tenant filter:', {
          before: notesData.length,
          after: filteredNotes.length,
          userTenantId: userProfile.tenant_id,
          noteTenantIds: [...new Set(notesData.map((n: any) => n.tenant_id))]
        })
        
        // Group notes by appointment_id
        notesMap = filteredNotes.reduce((acc, note) => {
          if (!acc[note.appointment_id]) {
            acc[note.appointment_id] = []
          }
          acc[note.appointment_id].push(note)
          return acc
        }, {} as Record<string, any[]>)
        logger.debug('✅ Loaded', filteredNotes.length, 'notes for', Object.keys(notesMap).length, 'appointments')
      }
    }

    // ✅ Merge notes into appointments
    const appointmentsWithNotes = (appointmentsData || []).map(appointment => ({
      ...appointment,
      notes: notesMap[appointment.id] || []
    }))

    // ✅ Load payments for all appointments
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

    // ✅ Load payments for all appointments
    const appointmentsWithPayments = (appointmentsWithNotes || []).map(appointment => ({
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

