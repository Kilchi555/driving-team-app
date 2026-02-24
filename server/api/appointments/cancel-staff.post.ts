// server/api/appointments/cancel-staff.post.ts
// SECURED: Staff appointment cancellation with full auth + authorization
import { getSupabase, getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateUUID } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined
  let userProfile: any = null
  
  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required'
      })
    }

    const token = authHeader.slice(7)
    const supabase = getSupabase(token)
    
    // Get authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authUser?.id) {
      throw createError({
        statusCode: 401,
        message: 'Invalid or expired token'
      })
    }

    authenticatedUserId = authUser.id

    // ============ LAYER 2: FETCH USER PROFILE + TENANT ============
    const supabaseAdmin = getSupabaseAdmin()
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authenticatedUserId)
      .single()

    if (userError || !userData) {
      await logAudit({
        auth_user_id: authenticatedUserId,
        action: 'cancel_appointment_staff',
        resource_type: 'appointment',
        status: 'failed',
        error_message: 'User profile not found',
        ip_address: ipAddress
      })
      
      throw createError({
        statusCode: 401,
        message: 'User not found'
      })
    }

    userProfile = userData
    tenantId = userData.tenant_id

    // ============ LAYER 3: AUTHORIZATION - Check if staff/admin ============
    const isStaff = ['staff', 'admin', 'tenant_admin'].includes(userData.role)
    if (!isStaff) {
      await logAudit({
        user_id: userData.id,
        auth_user_id: authenticatedUserId,
        action: 'cancel_appointment_staff',
        resource_type: 'appointment',
        status: 'failed',
        error_message: `Unauthorized: User role '${userData.role}' is not allowed to cancel appointments as staff`,
        ip_address: ipAddress,
        tenant_id: tenantId
      })
      
      throw createError({
        statusCode: 403,
        message: 'Only staff members can cancel appointments'
      })
    }

    // ============ LAYER 4: RATE LIMITING ============
    const { allowed, retryAfter } = await checkRateLimit(
      ipAddress,
      'cancel_staff'
    )

    if (!allowed) {
      await logAudit({
        user_id: userData.id,
        auth_user_id: authenticatedUserId,
        action: 'cancel_appointment_staff',
        resource_type: 'appointment',
        status: 'failed',
        error_message: `Rate limit exceeded (retry after ${retryAfter}s)`,
        ip_address: ipAddress,
        tenant_id: tenantId
      })
      
      throw createError({
        statusCode: 429,
        message: `Too many requests. Try again in ${retryAfter} seconds`
      })
    }

    // ============ LAYER 5: INPUT VALIDATION ============
    const body = await readBody(event)
    const {
      appointmentId,
      cancellationReasonId,
      deletionReason,
      lessonPriceRappen = 0,
      adminFeeRappen = 0,
      chargePercentage = 0,
      shouldCreditHours = true
    } = body

    if (!appointmentId || !validateUUID(appointmentId)) {
      throw createError({
        statusCode: 400,
        message: 'Valid appointmentId required'
      })
    }

    if (!cancellationReasonId || !validateUUID(cancellationReasonId)) {
      throw createError({
        statusCode: 400,
        message: 'Valid cancellationReasonId required'
      })
    }

    logger.debug('🗑️ Staff cancellation requested:', {
      appointmentId: appointmentId.substring(0, 8),
      staffId: userData.id.substring(0, 8),
      chargePercentage,
      shouldCreditHours
    })

    // ============ LAYER 6: FETCH APPOINTMENT + VERIFY TENANT ============
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('id, user_id, staff_id, start_time, duration_minutes, type, event_type_code, tenant_id, status')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId) // ← CRITICAL: Tenant isolation
      .single()

    if (appointmentError || !appointment) {
      await logAudit({
        user_id: userData.id,
        auth_user_id: authenticatedUserId,
        action: 'cancel_appointment_staff',
        resource_type: 'appointment',
        resource_id: appointmentId,
        status: 'failed',
        error_message: 'Appointment not found or does not belong to this tenant',
        ip_address: ipAddress,
        tenant_id: tenantId
      })
      
      throw createError({
        statusCode: 404,
        message: 'Appointment not found'
      })
    }

    // ============ LAYER 7: FETCH PAYMENT DATA ============
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('tenant_id', tenantId) // ← CRITICAL: Tenant isolation
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paymentError && paymentError.code !== 'PGRST116') {
      throw createError({
        statusCode: 500,
        message: 'Error fetching payment data'
      })
    }

    logger.debug('💳 Payment data for cancellation:', {
      paymentExists: !!payment,
      paymentStatus: payment?.payment_status || 'none',
      totalAmount: payment ? (payment.total_amount_rappen / 100).toFixed(2) : '0.00'
    })

    // ============ LAYER 8: PROCESS CANCELLATION ============
    // Call handle-cancellation.post.ts with all necessary data
    const cancellationResult = await $fetch('/api/appointments/handle-cancellation', {
      method: 'POST',
      body: {
        appointmentId,
        cancellationReasonId,
        deletionReason,
        lessonPriceRappen: payment?.lesson_price_rappen || lessonPriceRappen,
        adminFeeRappen: payment?.admin_fee_rappen || adminFeeRappen,
        shouldCreditHours,
        chargePercentage,
        staffId: userData.id,
        cancelledBy: 'staff' // ← Identify as staff cancellation
      }
    })

    // ============ LAYER 9: AUDIT LOGGING ============
    await logAudit({
      user_id: userData.id,
      auth_user_id: authenticatedUserId,
      action: 'cancel_appointment_staff',
      resource_type: 'appointment',
      resource_id: appointmentId,
      status: 'success',
      ip_address: ipAddress,
      tenant_id: tenantId,
      details: {
        studentId: appointment.user_id,
        chargePercentage,
        deletionReason,
        cancellationResult: cancellationResult?.action
      }
    })

    // ============ LAYER 10: SEND CANCELLATION EMAIL TO CUSTOMER ============
    try {
      logger.debug('📧 Sending cancellation email to customer...')
      
      // Get customer data
      const { data: customer, error: customerError } = await supabaseAdmin
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', appointment.user_id)
        .single()

      if (customer && customer.email) {
        // Get tenant data
        const { data: tenant, error: tenantError } = await supabaseAdmin
          .from('tenants')
          .select('name, slug')
          .eq('id', tenantId)
          .single()

        // Format appointment time
        const startTime = new Date(appointment.start_time)
        const appointmentDateTime = startTime.toLocaleString('de-CH', {
          timeZone: 'Europe/Zurich',
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })

        // ✅ Prepare payment and refund details for email
        const wasPaid = payment?.payment_status === 'completed'
        const refundAmount = cancellationResult?.creditGrantedRappen 
          ? `CHF ${(cancellationResult.creditGrantedRappen / 100).toFixed(2)}`
          : null
        const chargeAmount = chargePercentage > 0 
          ? `CHF ${((payment?.total_amount_rappen || 0) * chargePercentage / 100 / 100).toFixed(2)}`
          : null

        // Send cancellation email
        await $fetch('/api/email/send-appointment-notification', {
          method: 'POST',
          body: {
            email: customer.email,
            studentName: `${customer.first_name} ${customer.last_name}`,
            appointmentTime: appointmentDateTime,
            type: 'cancelled',
            cancellationReason: deletionReason,
            tenantName: tenant?.name,
            tenantId,
            tenantSlug: tenant?.slug,
            // ✅ NEW: Payment & refund details
            wasPaid,
            chargePercentage,
            refundAmount,
            chargeAmount
          }
        })

        logger.debug('✅ Cancellation email sent to customer:', customer.email)
      } else {
        logger.debug('⏭️ No customer email found, skipping cancellation notification')
      }
    } catch (emailError: any) {
      logger.warn('⚠️ Failed to send cancellation email (non-critical):', emailError.message)
      // Don't fail the whole cancellation if email fails
    }

    const duration = Date.now() - startTime
    logger.debug(`✅ Staff cancellation completed in ${duration}ms`, {
      appointmentId: appointmentId.substring(0, 8),
      result: cancellationResult?.action
    })

    // ✅ NEW: Queue staff for availability recalculation
    if (appointment.staff_id && tenantId) {
      try {
        logger.debug(`📋 Queueing staff ${appointment.staff_id} for recalc after appointment cancellation`)
        
        await $fetch('/api/availability/queue-recalc', {
          method: 'POST',
          body: {
            staff_id: appointment.staff_id,
            tenant_id: tenantId,
            trigger: 'appointment'
          }
        })
        
        logger.debug(`✅ Staff queued for recalculation after appointment cancellation`)
      } catch (queueError: any) {
        logger.warn(`⚠️ Failed to queue staff for recalc (non-critical):`, queueError.message)
      }
    }

    return {
      success: true,
      message: 'Appointment cancelled by staff',
      data: cancellationResult
    }

  } catch (error: any) {
    const duration = Date.now() - startTime
    
    logger.error(`❌ Staff cancellation failed in ${duration}ms:`, error.message)
    
    // Log failed attempt
    if (userProfile?.id) {
      await logAudit({
        user_id: userProfile.id,
        auth_user_id: authenticatedUserId,
        action: 'cancel_appointment_staff',
        resource_type: 'appointment',
        status: 'failed',
        error_message: error.message,
        ip_address: ipAddress,
        tenant_id: tenantId
      })
    }

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to cancel appointment'
    })
  }
})

