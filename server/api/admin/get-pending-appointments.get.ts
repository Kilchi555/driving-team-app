import { defineEventHandler, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('❌ Supabase credentials not configured for get-pending-appointments API')
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

    // Get user's profile to determine tenant_id and role
    const { data: userProfile, error: userProfileError } = await serviceSupabase
      .from('users')
      .select('tenant_id, role, id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userProfileError || !userProfile) {
      logger.warn(`⚠️ User profile not found for auth_user_id: ${authUser.id}`)
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    // Check permissions - only staff and admins can view pending appointments
    if (!['staff', 'admin', 'tenant_admin', 'super_admin'].includes(userProfile.role)) {
      logger.warn(`🚫 User ${authUser.id} with role ${userProfile.role} attempted to access pending appointments.`)
      throw createError({ statusCode: 403, statusMessage: 'Forbidden: Insufficient permissions' })
    }

    const tenantId = userProfile.tenant_id
    const userId = userProfile.id
    const userRole = userProfile.role

    logger.debug(`🔍 Fetching pending appointments for user ${userId} with role ${userRole} in tenant ${tenantId}`)

    // Helper function to get current time as string
    const toLocalTimeString = (date: Date): string => {
      return date.toISOString().replace('Z', '+00:00')
    }

    const now = toLocalTimeString(new Date())

    // Query 1: Completed appointments without evaluation
    let appointmentsQuery = serviceSupabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        user_id,
        status,
        event_type_code,
        type,
        created_by,
        tenant_id,
        users!appointments_user_id_fkey (
          id,
          first_name,
          last_name,
          category
        ),
        created_by_user:created_by (
          id,
          first_name,
          last_name
        ),
        notes (
          id,
          evaluation_criteria_id,
          criteria_rating
        ),
        exam_results (
          id,
          passed
        ),
        payments (
          id,
          payment_method,
          payment_status,
          total_amount_rappen,
          metadata
        )
      `)
      .eq('tenant_id', tenantId)
      .lt('start_time', now)
      .in('status', ['completed', 'confirmed', 'scheduled'])
      .is('deleted_at', null)
      .in('event_type_code', ['lesson', 'exam', 'theory'])
      .order('start_time', { ascending: true })

    // Filter by staff_id if the user is a staff member
    if (userRole === 'staff') {
      appointmentsQuery = appointmentsQuery.eq('staff_id', userId)
    }

    const { data: appointmentsData, error: appointmentsError } = await appointmentsQuery

    if (appointmentsError) {
      logger.error('❌ Error fetching appointments:', appointmentsError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch appointments' })
    }

    logger.debug(`✅ Fetched ${appointmentsData?.length || 0} appointments`)

    // Filter pending appointments (those without evaluation or exam result)
    const pendingAppointments = (appointmentsData || []).filter((appointment: any) => {
      // Check if it has ANY criteria evaluation
      // A valid evaluation requires BOTH evaluation_criteria_id AND criteria_rating to be set
      const hasCriteriaEvaluation = appointment.notes && 
        appointment.notes.some((note: any) => 
          note.evaluation_criteria_id !== null && 
          note.evaluation_criteria_id !== undefined &&
          note.criteria_rating !== null && 
          note.criteria_rating !== undefined
        )

      // Check if it has exam result
      const hasExamResult = appointment.exam_results && 
        appointment.exam_results.length > 0

      // It's pending if it has NEITHER a valid evaluation NOR an exam result
      return !hasCriteriaEvaluation && !hasExamResult
    }).map((appointment: any) => ({
      id: appointment.id,
      title: appointment.title,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      user_id: appointment.user_id,
      status: appointment.status,
      type: appointment.type,
      event_type_code: appointment.event_type_code || appointment.type || 'lesson',
      created_by: appointment.created_by,
      users: appointment.users || {
        first_name: 'Unknown',
        last_name: 'Unknown',
        category: null
      },
      created_by_user: appointment.created_by_user || {
        first_name: 'Unknown',
        last_name: 'Unknown'
      },
      notes: (appointment.notes || []).filter((note: any) => note.evaluation_criteria_id !== null),
      payments: appointment.payments || []
    }))

    // Query 2: Unconfirmed appointments (for staff/admin only)
    let unconfirmedAppointments: any[] = []

    if (userRole === 'staff' || userRole === 'admin' || userRole === 'tenant_admin' || userRole === 'super_admin') {
      let unconfirmedQuery = serviceSupabase
        .from('appointments')
        .select(`
          id,
          title,
          start_time,
          end_time,
          user_id,
          status,
          event_type_code,
          type,
          created_by,
          tenant_id,
          confirmation_token,
          users!appointments_user_id_fkey (
            id,
            first_name,
            last_name,
            category
          ),
          created_by_user:created_by (
            id,
            first_name,
            last_name
          ),
          payments (
            id,
            payment_method,
            payment_status,
            total_amount_rappen,
            metadata
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'pending_confirmation')
        .not('confirmation_token', 'is', null)
        .is('deleted_at', null)
        .in('event_type_code', ['lesson', 'exam', 'theory'])
        // ✅ FIXED: Zeige ALLE unbestätigten Termine (egal wie weit in der Vergangenheit oder Zukunft)
        // Keine zeitliche Einschränkung - wir filtern später in der Composable
        .order('start_time', { ascending: false }) // Neueste zuerst

      // Filter by staff_id if the user is a staff member
      if (userRole === 'staff') {
        unconfirmedQuery = unconfirmedQuery.eq('staff_id', userId)
      }

      const { data: unconfirmedData, error: unconfirmedError } = await unconfirmedQuery

      if (unconfirmedError) {
        logger.warn(`⚠️ Error fetching unconfirmed appointments: ${unconfirmedError.message}`)
      } else {
        // ✅ NEU: Filtere nur unbezahlte Termine (kein Payment oder payment_status !== 'completed')
        unconfirmedAppointments = (unconfirmedData || [])
          .filter((apt: any) => {
            // Zeige nur Termine, die nicht bezahlt wurden
            // Ein Termin gilt als unbezahlt wenn:
            // 1. Es kein Payment gibt, ODER
            // 2. Es ein Payment gibt, aber nicht completed
            const hasPayment = apt.payments && apt.payments.length > 0
            const hasCompletedPayment = hasPayment && apt.payments.some((p: any) => p.payment_status === 'completed')
            const isUnpaid = !hasPayment || !hasCompletedPayment
            
            logger.debug(`🔍 Unconfirmed appointment ${apt.id}: hasPayment=${hasPayment}, hasCompleted=${hasCompletedPayment}, isUnpaid=${isUnpaid}, payments=${apt.payments?.map((p: any) => p.payment_status).join(',')}`)
            return isUnpaid
          })
          .map((appointment: any) => ({
            id: appointment.id,
            title: appointment.title,
            start_time: appointment.start_time,
            end_time: appointment.end_time,
            user_id: appointment.user_id,
            status: appointment.status,
            type: appointment.type,
            event_type_code: appointment.event_type_code || appointment.type || 'lesson',
            created_by: appointment.created_by,
            confirmation_token: appointment.confirmation_token,
            users: appointment.users || {
              first_name: 'Unknown',
              last_name: 'Unknown',
              category: null
            },
            created_by_user: appointment.created_by_user || {
              first_name: 'Unknown',
              last_name: 'Unknown'
            },
            payments: appointment.payments || []
          }))

        logger.debug(`✅ Fetched ${unconfirmedAppointments.length} unconfirmed appointments (all time, only unpaid)`)
      }
    }

    // Query 3: Appointments with billing issues (for staff/admin only)
    let appointmentsWithoutPayment: any[] = []

    if (userRole === 'staff' || userRole === 'admin' || userRole === 'tenant_admin' || userRole === 'super_admin') {
      let billableQuery = serviceSupabase
        .from('appointments')
        .select(`
          id,
          title,
          start_time,
          end_time,
          user_id,
          status,
          event_type_code,
          type,
          created_by,
          tenant_id,
          users!appointments_user_id_fkey (
            id,
            first_name,
            last_name,
            category
          ),
          created_by_user:created_by (
            id,
            first_name,
            last_name
          ),
          payments (
            id,
            payment_method,
            payment_status,
            total_amount_rappen,
            company_billing_address_id
          )
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .in('event_type_code', ['lesson', 'exam', 'theory'])

      // Filter by staff_id if the user is a staff member
      if (userRole === 'staff') {
        billableQuery = billableQuery.eq('staff_id', userId)
      }

      const { data: billableData, error: billableError } = await billableQuery

      if (billableError) {
        logger.warn(`⚠️ Error fetching billable appointments: ${billableError.message}`)
      } else {
        appointmentsWithoutPayment = (billableData || [])
          .filter((apt: any) => {
            const hasOnBillPayment = apt.payments?.some((p: any) => p.payment_method === 'on_bill')
            const hasPendingOnBillPayment = apt.payments?.some((p: any) => 
              p.payment_method === 'on_bill' && p.payment_status === 'pending'
            )
            const noCompletedPayment = !apt.payments?.some((p: any) => 
              p.payment_status === 'completed' || p.payment_status === 'authorized'
            )

            return hasPendingOnBillPayment && noCompletedPayment && !apt.payments?.[0]?.company_billing_address_id
          })
          .map((apt: any) => ({
            id: apt.id,
            title: apt.title,
            start_time: apt.start_time,
            end_time: apt.end_time,
            user_id: apt.user_id,
            status: apt.status,
            type: apt.type,
            event_type_code: apt.event_type_code || apt.type || 'lesson',
            created_by: apt.created_by,
            users: apt.users || {
              first_name: 'Unknown',
              last_name: 'Unknown',
              category: null
            },
            created_by_user: apt.created_by_user || {
              first_name: 'Unknown',
              last_name: 'Unknown'
            },
            notes: [],
            payments: apt.payments || []
          }))

        logger.debug(`✅ Fetched ${appointmentsWithoutPayment.length} appointments without proper billing`)
      }
    }

    logger.info(`✅ Successfully fetched pending appointments for user ${userId}`)

    return {
      success: true,
      data: {
        pending: pendingAppointments,
        unconfirmed: unconfirmedAppointments,
        withoutPayment: appointmentsWithoutPayment
      }
    }

  } catch (error: any) {
    logger.error('❌ Error in get-pending-appointments API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

