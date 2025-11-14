// server/api/payments/reset-failed.post.ts
// Reset failed payment and resend confirmation email

import { getSupabaseAdmin } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentId } = body

    if (!appointmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'appointmentId is required'
      })
    }

    const supabase = getSupabaseAdmin()

    // 1. Find payment for this appointment
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('appointment_id', appointmentId)
      .single()

    if (findError || !payment) {
      console.error('❌ Payment find error:', findError)
      throw createError({
        statusCode: 404,
        statusMessage: 'No payment found for this appointment'
      })
    }

    console.log('✅ Found payment:', payment.id, 'with status:', payment.payment_status)

    // 2. Reset payment status to pending
    const { error: paymentError } = await supabase
      .from('payments')
      .update({
        payment_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id)

    if (paymentError) {
      console.error('❌ Payment update error:', paymentError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update payment status'
      })
    }

    console.log('✅ Payment status reset to pending')

    // 3. Reset appointment status to pending_confirmation
    const { error: appointmentError } = await supabase
      .from('appointments')
      .update({
        status: 'pending_confirmation',
        is_paid: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (appointmentError) {
      console.error('❌ Appointment update error:', appointmentError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update appointment status'
      })
    }

    console.log('✅ Appointment status reset to pending_confirmation')

    // 4. Send confirmation email via API
    try {
      await $fetch('/api/appointments/resend-confirmation', {
        method: 'POST',
        body: {
          appointmentId
        }
      })
      console.log('✅ Confirmation email sent')
    } catch (emailError) {
      console.warn('⚠️ Failed to send confirmation email:', emailError)
      // Don't throw - payment reset is still successful
    }

    return {
      success: true,
      message: 'Payment reset successfully and confirmation email sent'
    }

  } catch (error: any) {
    console.error('❌ Error resetting failed payment:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to reset payment'
    })
  }
})

