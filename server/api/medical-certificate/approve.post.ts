// server/api/medical-certificate/approve.post.ts
import { getSupabaseAdmin } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentId, notes, createCredit = true } = body

    if (!appointmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'appointmentId is required'
      })
    }

    // Get current user (admin)
    const currentUser = event.context.user
    if (!currentUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const supabase = getSupabaseAdmin()
    const now = new Date()

    logger.debug('✅ Approving medical certificate for appointment:', appointmentId)

    // 1. Get appointment with payment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        payments (
          id,
          total_amount_rappen,
          payment_status,
          payment_method,
          paid_at,
          wallee_transaction_id
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Appointment not found'
      })
    }

    if (appointment.medical_certificate_status !== 'uploaded') {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid status: ${appointment.medical_certificate_status}. Must be 'uploaded'.`
      })
    }

    // 2. Update appointment
    const { error: updateAppointmentError } = await supabase
      .from('appointments')
      .update({
        medical_certificate_status: 'approved',
        medical_certificate_reviewed_by: currentUser.id,
        medical_certificate_reviewed_at: toLocalTimeString(now),
        medical_certificate_notes: notes || null,
        cancellation_charge_percentage: 0,  // ✅ Set to 0%
        cancellation_credit_hours: true
      })
      .eq('id', appointmentId)

    if (updateAppointmentError) {
      console.error('❌ Error updating appointment:', updateAppointmentError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to update appointment: ${updateAppointmentError.message}`
      })
    }

    logger.debug('✅ Appointment updated - charge set to 0%')

    // 3. Handle payment
    const payment = Array.isArray(appointment.payments) 
      ? appointment.payments[0] 
      : appointment.payments

    let paymentAction = 'none'

    if (payment) {
      logger.debug('💰 Processing payment:', payment.id, 'Status:', payment.payment_status)

      if (payment.payment_status === 'completed' && payment.paid_at) {
        // Payment was completed - create credit
        if (createCredit) {
          logger.debug('💳 Creating credit for paid payment...')
          
          const { error: creditError } = await supabase
            .from('user_credits')
            .insert({
              user_id: appointment.user_id,
              tenant_id: appointment.tenant_id,
              amount_rappen: payment.total_amount_rappen,
              reason: `Arztzeugnis genehmigt - Termin vom ${new Date(appointment.start_time).toLocaleDateString('de-CH')}`,
              created_at: toLocalTimeString(now),
              expires_at: null // No expiration
            })

          if (creditError) {
            console.error('⚠️ Error creating credit:', creditError)
          } else {
            logger.debug('✅ Credit created')
            paymentAction = 'credit_created'
            
            // Mark appointment as credit created
            await supabase
              .from('appointments')
              .update({ credit_created: true })
              .eq('id', appointmentId)
          }
        }

        // Optional: Create Wallee refund instead
        // if (payment.wallee_transaction_id) {
        //   await walleeRefund(payment.wallee_transaction_id, payment.total_amount_rappen)
        //   paymentAction = 'refunded'
        // }

      } else if (payment.payment_status === 'pending' || payment.payment_status === 'authorized') {
        // Payment not completed yet - cancel it
        logger.debug('❌ Cancelling pending/authorized payment...')
        
        const { error: paymentUpdateError } = await supabase
          .from('payments')
          .update({
            payment_status: 'cancelled',
            updated_at: toLocalTimeString(now)
          })
          .eq('id', payment.id)

        if (paymentUpdateError) {
          console.error('⚠️ Error cancelling payment:', paymentUpdateError)
        } else {
          logger.debug('✅ Payment cancelled')
          paymentAction = 'cancelled'
        }

        // If authorized, void the authorization
        if (payment.payment_status === 'authorized' && payment.wallee_transaction_id) {
          // TODO: Call Wallee void API
          logger.debug('⚠️ TODO: Void Wallee authorization for:', payment.wallee_transaction_id)
        }
      }
    }

    // 4. TODO: Send notification to customer
    // await sendEmailNotification({
    //   to: customer.email,
    //   subject: 'Arztzeugnis genehmigt',
    //   template: 'medical_certificate_approved',
    //   data: {
    //     customerName: customer.first_name,
    //     appointmentDate: appointment.start_time,
    //     creditAmount: payment?.total_amount_rappen / 100
    //   }
    // })

    logger.debug('✅ Medical certificate approved successfully')

    return {
      success: true,
      message: 'Arztzeugnis genehmigt',
      paymentAction,
      creditAmount: payment?.total_amount_rappen || 0
    }

  } catch (error: any) {
    console.error('❌ Medical certificate approval error:', error)
    throw error
  }
})

