// server/utils/handle-appointment-update.ts
// Central logic for handling appointment updates with payment adjustments

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export interface AppointmentUpdateData {
  appointmentId: string
  oldDuration: number
  newDuration: number
  staffId: string
  tenantId: string
}

/**
 * Handle appointment duration update with automatic price adjustments
 * - If payment is paid: use adjust-duration endpoint for credit/charge logic
 * - If payment is pending: update payment directly
 * - If no payment: just update appointment
 */
export async function handleAppointmentDurationUpdate(data: AppointmentUpdateData) {
  const { appointmentId, oldDuration, newDuration, staffId, tenantId } = data

  logger.debug('AppointmentUpdate', 'Handling duration update:', {
    appointmentId,
    oldDuration,
    newDuration
  })

  // No change needed
  if (oldDuration === newDuration) {
    logger.debug('AppointmentUpdate', 'Duration unchanged, skipping')
    return { success: true, message: 'No duration change' }
  }

  try {
    const supabase = getSupabaseAdmin()

    // 1. Get the appointment and its payment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select('id, payment_id, lesson_price_rappen, original_price_rappen, status')
      .eq('id', appointmentId)
      .single()

    if (aptError || !appointment) {
      throw new Error(`Appointment not found: ${aptError?.message}`)
    }

    // 2. Get payment if exists
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, payment_status, lesson_price_rappen, total_amount_rappen, admin_fee_rappen')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paymentError && paymentError.code !== 'PGRST116') {
      throw new Error(`Failed to get payment: ${paymentError.message}`)
    }

    // 3. If payment is completed/authorized: use adjustment endpoint
    if (payment && (payment.payment_status === 'completed' || payment.payment_status === 'authorized')) {
      logger.debug('AppointmentUpdate', 'Payment is paid, using adjustment endpoint')

      // Calculate the price difference
      // Assuming price per minute can be derived from existing prices
      const oldPrice = appointment.original_price_rappen || payment.lesson_price_rappen || 0
      const pricePerMinute = oldPrice > 0 ? oldPrice / oldDuration : 0

      const newPrice = Math.round(pricePerMinute * newDuration)
      const priceDifference = newPrice - oldPrice

      // Use the update-duration-with-adjustment endpoint
      // This will handle credit updates automatically
      logger.debug('AppointmentUpdate', 'Calling adjustment endpoint with price diff:', {
        oldPrice: oldPrice / 100,
        newPrice: newPrice / 100,
        difference: priceDifference / 100
      })

      // Return data for caller to invoke the adjustment endpoint
      return {
        success: true,
        action: 'use_adjustment_endpoint',
        appointmentId,
        oldDuration,
        newDuration,
        priceDiff: priceDifference
      }
    }

    // 4. If payment is pending: update payment directly
    if (payment && payment.payment_status === 'pending') {
      logger.debug('AppointmentUpdate', 'Payment is pending, updating directly')

      // Calculate new price
      const oldPrice = payment.lesson_price_rappen || 0
      const pricePerMinute = oldPrice > 0 ? oldPrice / oldDuration : 0
      const newPrice = Math.round(pricePerMinute * newDuration)
      const newTotal = newPrice + (payment.admin_fee_rappen || 0)

      const { error: updateError } = await supabase
        .from('payments')
        .update({
          lesson_price_rappen: newPrice,
          total_amount_rappen: Math.max(0, newTotal),
          updated_at: new Date().toISOString(),
          notes: `Duration adjusted: ${oldDuration}min → ${newDuration}min`
        })
        .eq('id', payment.id)

      if (updateError) {
        throw new Error(`Failed to update payment: ${updateError.message}`)
      }

      logger.debug('AppointmentUpdate', 'Payment updated successfully')
    }

    // 5. Update appointment duration
    const { error: updateAptError } = await supabase
      .from('appointments')
      .update({
        duration_minutes: newDuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (updateAptError) {
      throw new Error(`Failed to update appointment: ${updateAptError.message}`)
    }

    logger.debug('AppointmentUpdate', 'Appointment duration updated successfully')

    return {
      success: true,
      action: payment ? (payment.payment_status === 'pending' ? 'updated_payment' : 'use_adjustment_endpoint') : 'updated_only_appointment',
      appointmentId,
      oldDuration,
      newDuration
    }
  } catch (error: any) {
    logger.error('AppointmentUpdate', 'Error handling duration update:', error)
    return {
      success: false,
      error: error.message,
      appointmentId
    }
  }
}

/**
 * Get payment status for appointment
 */
export async function getAppointmentPaymentStatus(appointmentId: string) {
  try {
    const supabase = getSupabaseAdmin()

    const { data: payment, error } = await supabase
      .from('payments')
      .select('id, payment_status, total_amount_rappen')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return payment
  } catch (error: any) {
    logger.error('AppointmentUpdate', 'Failed to get payment status:', error)
    return null
  }
}

