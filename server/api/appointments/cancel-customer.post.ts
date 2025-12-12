// server/api/appointments/cancel-customer.post.ts
import { getSupabase, getSupabaseAdmin } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentId, cancellationReasonId } = body

    if (!appointmentId || !cancellationReasonId) {
      throw createError({
        statusCode: 400,
        message: 'appointmentId and cancellationReasonId are required'
      })
    }

    // Get current user from Authorization header
    const supabase = getSupabase()
    const authHeader = getHeader(event, 'authorization')
    
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        message: 'Authentication required'
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      throw createError({
        statusCode: 401,
        message: 'Invalid token'
      })
    }

    logger.debug('✅ Authenticated user:', user.id, user.email)

    // Get user profile from database (use admin client to bypass RLS)
    const supabaseAdmin = getSupabaseAdmin()
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role, email')
      .eq('auth_user_id', user.id)
      .single()

    logger.debug('🔍 User profile query result:', { userProfile, profileError })

    if (profileError) {
      console.error('❌ Profile error:', profileError)
      throw createError({
        statusCode: 500,
        message: `Database error: ${profileError.message}`
      })
    }

    if (!userProfile) {
      console.error('❌ No profile found for auth_user_id:', user.id)
      throw createError({
        statusCode: 403,
        message: `User profile not found. Please contact support. (auth_user_id: ${user.id})`
      })
    }

    const now = new Date()

    logger.debug('🗑️ Customer cancelling appointment:', appointmentId)
    logger.debug('👤 User:', userProfile.id)
    logger.debug('📋 Reason ID:', cancellationReasonId)

    // 1. Get appointment with payment
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        payments (id, payment_status, total_amount_rappen, wallee_transaction_id)
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      throw createError({
        statusCode: 404,
        message: 'Appointment not found'
      })
    }

    // Verify user owns this appointment
    if (appointment.user_id !== userProfile.id) {
      throw createError({
        statusCode: 403,
        message: 'You can only cancel your own appointments'
      })
    }

    // 2. Get cancellation reason
    const { data: reason, error: reasonError } = await supabaseAdmin
      .from('cancellation_reasons')
      .select('*')
      .eq('id', cancellationReasonId)
      .single()

    if (reasonError || !reason) {
      throw createError({
        statusCode: 404,
        message: 'Cancellation reason not found'
      })
    }

    // 3. Get tenant's cancellation policy to determine free cancellation threshold
    const { data: cancellationPolicy, error: policyError } = await supabaseAdmin
      .from('cancellation_policies')
      .select(`
        *,
        rules:cancellation_rules(*)
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .limit(1)
      .single()

    let hoursBeforeCancellationFree = 24 // Default fallback
    
    if (!policyError && cancellationPolicy?.rules && Array.isArray(cancellationPolicy.rules)) {
      // Find the rule that determines free cancellation (typically the first rule)
      // Rules are ordered by hours_before_appointment descending
      const freeRule = cancellationPolicy.rules.find((rule: any) => rule.charge_percentage === 0)
      if (freeRule) {
        hoursBeforeCancellationFree = freeRule.hours_before_appointment
        logger.debug('📋 Loaded free cancellation threshold from policy:', hoursBeforeCancellationFree, 'hours')
      } else if (cancellationPolicy.rules.length > 0) {
        // Fallback: use the rule with the highest hours threshold
        hoursBeforeCancellationFree = Math.max(...cancellationPolicy.rules.map((r: any) => r.hours_before_appointment))
        logger.debug('📋 Using maximum hours threshold from policy:', hoursBeforeCancellationFree, 'hours')
      }
    } else if (policyError) {
      logger.warn('⚠️ Could not fetch cancellation policy, using default 24 hours:', policyError.message)
    }

    // 4. Calculate hours until appointment (using Zurich timezone)
    const appointmentTime = new Date(appointment.start_time)
    
    // Convert to Zurich timezone for accurate hour calculation
    const appointmentZurich = new Date(appointmentTime.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))
    const nowZurich = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))
    
    const hoursUntilAppointment = (appointmentZurich.getTime() - nowZurich.getTime()) / (1000 * 60 * 60)
    
    logger.debug('🕐 Backend hours until appointment (Zurich TZ):', hoursUntilAppointment.toFixed(2), {
      appointment: appointment.start_time,
      now: now.toISOString(),
      hoursBeforeCancellationFree
    })

    // 5. Determine charge percentage based on policy
    let chargePercentage = 100 // Default
    let creditHours = false

    if (hoursUntilAppointment >= hoursBeforeCancellationFree) {
      // More than threshold hours before appointment - free cancellation
      logger.debug(`✅ Free cancellation (>= ${hoursBeforeCancellationFree}h)`)
      chargePercentage = 0
      creditHours = true
    } else {
      // Less than threshold hours before appointment - charged cancellation
      logger.debug(`⚠️ Charged cancellation (< ${hoursBeforeCancellationFree}h)`)
      chargePercentage = 100
      creditHours = true
    }
    const updateData: any = {
      status: 'cancelled',
      deleted_at: toLocalTimeString(now),
      deletion_reason: `Kunde hat abgesagt: ${reason.name_de}`,
      cancellation_reason_id: cancellationReasonId,
      cancellation_type: 'student',
      deleted_by: userProfile.id,
      cancellation_charge_percentage: chargePercentage,
      cancellation_credit_hours: creditHours,
      updated_at: toLocalTimeString(now)
    }

    // Set medical certificate status if required
    if (reason.requires_proof) {
      updateData.medical_certificate_status = 'pending'
      updateData.original_charge_percentage = chargePercentage
      logger.debug('📄 Medical certificate required - status set to pending')
    }

    // 6. Update appointment
    const { error: updateError } = await supabaseAdmin
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)

    if (updateError) {
      console.error('❌ Error updating appointment:', updateError)
      throw createError({
        statusCode: 500,
        message: `Failed to cancel appointment: ${updateError.message}`
      })
    }

    logger.debug('✅ Appointment cancelled successfully')

    // 8. Handle payment if exists
    const payment = Array.isArray(appointment.payments) 
      ? appointment.payments[0] 
      : appointment.payments

    if (payment && hoursUntilAppointment >= hoursBeforeCancellationFree) {
      // Cancel payment if more than threshold hours before appointment
      if (payment.payment_status === 'authorized') {
        // TODO: Void Wallee authorization
        logger.debug('⚠️ TODO: Void Wallee authorization:', payment.wallee_transaction_id)
      }

      if (payment.payment_status === 'pending' || payment.payment_status === 'authorized') {
        await supabaseAdmin
          .from('payments')
          .update({
            payment_status: 'cancelled',
            updated_at: toLocalTimeString(now)
          })
          .eq('id', payment.id)
        
        logger.debug('✅ Payment cancelled')
      }
    }
    // await sendEmailNotification({
    //   to: user.email,
    //   subject: 'Termin abgesagt',
    //   template: 'appointment_cancelled',
    //   data: { appointment, reason }
    // })

    return {
      success: true,
      message: 'Termin erfolgreich abgesagt',
      requiresMedicalCertificate: reason.requires_proof || false,
      chargePercentage
    }

  } catch (error: any) {
    console.error('❌ Customer cancellation error:', error)
    throw error
  }
})

