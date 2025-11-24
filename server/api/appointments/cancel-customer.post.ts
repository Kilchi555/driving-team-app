// server/api/appointments/cancel-customer.post.ts
import { getSupabase, getSupabaseAdmin } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'

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

    console.log('✅ Authenticated user:', user.id, user.email)

    // Get user profile from database (use admin client to bypass RLS)
    const supabaseAdmin = getSupabaseAdmin()
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role, email')
      .eq('auth_user_id', user.id)
      .single()

    console.log('🔍 User profile query result:', { userProfile, profileError })

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

    console.log('🗑️ Customer cancelling appointment:', appointmentId)
    console.log('👤 User:', userProfile.id)
    console.log('📋 Reason ID:', cancellationReasonId)

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

    // 3. Calculate hours until appointment (using Zurich timezone)
    const appointmentTime = new Date(appointment.start_time)
    
    // Convert to Zurich timezone for accurate hour calculation
    const appointmentZurich = new Date(appointmentTime.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))
    const nowZurich = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))
    
    const hoursUntilAppointment = (appointmentZurich.getTime() - nowZurich.getTime()) / (1000 * 60 * 60)
    
    console.log('🕐 Backend hours until appointment (Zurich TZ):', hoursUntilAppointment.toFixed(2), {
      appointment: appointment.start_time,
      now: now.toISOString()
    })

    // 4. Determine charge percentage
    let chargePercentage = 100 // Default
    let creditHours = false

    if (hoursUntilAppointment >= 24) {
      // More than 24h before appointment
      console.log('✅ Free cancellation (>= 24h)')
      chargePercentage = 0
      creditHours = true
    } else {
      // Less than 24h before appointment
      // Will charge 100% unless medical certificate is approved
      console.log('⚠️ Charged cancellation (< 24h)')
      chargePercentage = 100
      creditHours = true
    }

    // 5. Prepare update data
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
      console.log('📄 Medical certificate required - status set to pending')
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

    console.log('✅ Appointment cancelled successfully')

    // 7. Handle payment if exists
    const payment = Array.isArray(appointment.payments) 
      ? appointment.payments[0] 
      : appointment.payments

    if (payment && hoursUntilAppointment >= 24) {
      // Cancel payment if more than 24h before appointment
      if (payment.payment_status === 'authorized') {
        // TODO: Void Wallee authorization
        console.log('⚠️ TODO: Void Wallee authorization:', payment.wallee_transaction_id)
      }

      if (payment.payment_status === 'pending' || payment.payment_status === 'authorized') {
        await supabaseAdmin
          .from('payments')
          .update({
            payment_status: 'cancelled',
            updated_at: toLocalTimeString(now)
          })
          .eq('id', payment.id)
        
        console.log('✅ Payment cancelled')
      }
    }

    // 8. TODO: Send notification
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

