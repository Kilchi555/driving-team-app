// server/api/appointments/update-duration-with-adjustment.post.ts
// Update appointment duration and automatically handle price adjustments with credit transactions
// Called from EventModal when duration changes on a PAID appointment

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

interface UpdateDurationRequest {
  appointmentId: string
  newDurationMinutes: number
  oldDurationMinutes?: number
  pricePerMinute?: number
  reason?: string
}

// ✅ Runde auf nächsten 50 Rappen auf (wie bei anderen Payments)
function roundToNearestFiftyRappen(rappen: number): number {
  const remainder = rappen % 100
  if (remainder === 0) return rappen
  if (remainder < 50) return rappen - remainder      // Abrunden bei < 50 Rappen
  else return rappen + (100 - remainder)             // Aufrunden bei >= 50 Rappen
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<UpdateDurationRequest>(event)
    const { appointmentId, newDurationMinutes, reason } = body

    logger.debug('AppointmentUpdate', 'Starting duration adjustment:', {
      appointmentId,
      newDurationMinutes
    })

    // Validation
    if (!appointmentId || !newDurationMinutes) {
      throw createError({
        statusCode: 400,
        statusMessage: 'appointmentId and newDurationMinutes are required'
      })
    }

    if (newDurationMinutes <= 0 || newDurationMinutes > 600) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid duration: must be between 1 and 600 minutes'
      })
    }

    const supabase = getSupabaseAdmin()

    // 1. Load appointment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select('id, user_id, staff_id, duration_minutes, tenant_id')
      .eq('id', appointmentId)
      .single()

    if (aptError || !appointment) {
      logger.error('AppointmentUpdate', 'Failed to load appointment:', aptError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Appointment not found'
      })
    }

    const oldDuration = appointment.duration_minutes

    // 2. Load payment to check status
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, payment_status, lesson_price_rappen, user_id, tenant_id')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paymentError && paymentError.code !== 'PGRST116') {
      logger.warn('AppointmentUpdate', 'Error loading payment:', paymentError)
    }

    if (!payment || (payment.payment_status !== 'completed' && payment.payment_status !== 'authorized')) {
      logger.debug('AppointmentUpdate', 'No paid payment found - skipping credit adjustment')
      return {
        success: true,
        message: 'Duration will be updated, no payment adjustment needed',
        adjustment: null
      }
    }

    logger.debug('AppointmentUpdate', 'Paid payment found - processing adjustment', {
      paymentStatus: payment.payment_status,
      oldPrice: (payment.lesson_price_rappen / 100).toFixed(2)
    })

    // 3. Calculate price difference
    // The payment.lesson_price_rappen is NOW the new price (updated by PriceDisplay)
    // But it was calculated for newDuration minutes
    // We need the price per minute from the pricing rules
    
    const pricePerMinuteRappen = Math.round(payment.lesson_price_rappen / newDurationMinutes)
    
    logger.debug('AppointmentUpdate', 'Price per minute from current payment:', {
      pricePerMinuteRappen,
      pricePerMinuteCHF: (pricePerMinuteRappen / 100).toFixed(4),
      calculatedFrom: `${payment.lesson_price_rappen} / ${newDurationMinutes} = ${pricePerMinuteRappen}`
    })
    
    // Calculate OLD price using the same price per minute
    const oldPriceRappen = oldDuration * pricePerMinuteRappen
    const newPriceRappen = payment.lesson_price_rappen
    const priceDifferenceRappen = newPriceRappen - oldPriceRappen
    
    // ✅ Runde den Preisunterschied auf 50 Rappen (wie bei anderen Payments)
    const roundedPriceDifferenceRappen = roundToNearestFiftyRappen(priceDifferenceRappen)

    logger.debug('AppointmentUpdate', 'Price calculation:', {
      oldDuration,
      newDuration: newDurationMinutes,
      pricePerMinute: (pricePerMinuteRappen / 100).toFixed(4),
      oldPrice: (oldPriceRappen / 100).toFixed(2),
      newPrice: (newPriceRappen / 100).toFixed(2),
      difference: (priceDifferenceRappen / 100).toFixed(2),
      differenceRounded: (roundedPriceDifferenceRappen / 100).toFixed(2)
    })

    let adjustmentResult = null

    if (roundedPriceDifferenceRappen > 0) {
      // Duration increased - create second payment
      logger.debug('AppointmentUpdate', 'Duration increased - creating second payment', {
        priceDifferenceRappen: roundedPriceDifferenceRappen,
        priceDifferenceCHF: (roundedPriceDifferenceRappen / 100).toFixed(2)
      })
      adjustmentResult = await handlePriceIncrease(supabase, appointmentId, payment, roundedPriceDifferenceRappen, newDurationMinutes, oldDuration)
    } else if (roundedPriceDifferenceRappen < 0) {
      // Duration decreased - apply credit
      logger.debug('AppointmentUpdate', 'Duration decreased - applying credit')
      adjustmentResult = await handlePriceDecrease(supabase, appointmentId, appointment, Math.abs(roundedPriceDifferenceRappen), newDurationMinutes, oldDuration)
    } else {
      logger.debug('AppointmentUpdate', 'No price difference')
    }

    // 4. Update appointment duration
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        duration_minutes: newDurationMinutes,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (updateError) {
      logger.error('AppointmentUpdate', 'Failed to update appointment duration:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update appointment duration'
      })
    }

    logger.debug('AppointmentUpdate', 'Appointment duration updated successfully')

    return {
      success: true,
      message: 'Appointment duration updated with adjustment',
      oldDuration,
      newDuration: newDurationMinutes,
      adjustment: adjustmentResult
    }
  } catch (error: any) {
    logger.error('AppointmentUpdate', 'Error updating appointment duration:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})

// ✅ Handle price increase - create second payment
async function handlePriceIncrease(
  supabase: any,
  appointmentId: string,
  payment: any,
  differencerappen: number,
  newDuration: number,
  oldDuration: number
) {
  try {
    logger.debug('AppointmentUpdate', 'Creating second payment for price increase', {
      differencerappen,
      differenceCHF: (differencerappen / 100).toFixed(2),
      newDuration,
      oldDuration
    })

    const { data: secondPayment, error: createError } = await supabase
      .from('payments')
      .insert({
        appointment_id: appointmentId,
        user_id: payment.user_id,
        tenant_id: payment.tenant_id,
        payment_method: 'pending_adjustment',
        payment_status: 'pending',
        lesson_price_rappen: differencerappen,
        admin_fee_rappen: 0,
        products_price_rappen: 0,
        discount_amount_rappen: 0,
        total_amount_rappen: differencerappen,
        currency: 'CHF',
        description: `Zusätzliche Zahlung für Dauer-Erhöhung: ${oldDuration}min → ${newDuration}min`,
        notes: `Zusätzliche Zahlung für Dauer-Erhöhung: ${oldDuration}min → ${newDuration}min (CHF ${(differencerappen / 100).toFixed(2)})`
      })
      .select()
      .single()

    if (createError) {
      logger.error('AppointmentUpdate', 'Failed to create second payment:', createError)
      throw createError
    }

    logger.debug('AppointmentUpdate', 'Second payment created successfully:', {
      paymentId: secondPayment.id,
      amount: (secondPayment.total_amount_rappen / 100).toFixed(2)
    })

    return {
      type: 'duration_increase',
      amount: (differencerappen / 100),
      appliedToCredits: false,
      secondPaymentId: secondPayment.id,
      requiresPayment: true
    }
  } catch (error: any) {
    logger.error('AppointmentUpdate', 'Error in handlePriceIncrease:', error)
    throw error
  }
}

// ✅ Handle price decrease - apply credit
async function handlePriceDecrease(
  supabase: any,
  appointmentId: string,
  appointment: any,
  refundRappen: number,
  newDuration: number,
  oldDuration: number
) {
  try {
    logger.debug('AppointmentUpdate', 'Applying credit for price decrease:', (refundRappen / 100).toFixed(2))

    // Get or create student credit
    const { data: studentCredit, error: creditError } = await supabase
      .from('student_credits')
      .select('id, balance_rappen')
      .eq('user_id', appointment.user_id)
      .eq('tenant_id', appointment.tenant_id)
      .maybeSingle()

    let oldBalance = 0
    let creditId = studentCredit?.id

    if (!studentCredit) {
      logger.debug('AppointmentUpdate', 'Creating new student credit record')

      const { data: newCredit, error: createError } = await supabase
        .from('student_credits')
        .insert({
          user_id: appointment.user_id,
          tenant_id: appointment.tenant_id,
          balance_rappen: refundRappen
        })
        .select('id, balance_rappen')
        .single()

      if (createError) {
        logger.error('AppointmentUpdate', 'Failed to create student credit:', createError)
        throw createError
      }

      creditId = newCredit.id
      oldBalance = 0
    } else {
      oldBalance = studentCredit.balance_rappen || 0

      // Update existing credit
      const newBalance = oldBalance + refundRappen

      const { error: updateError } = await supabase
        .from('student_credits')
        .update({
          balance_rappen: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', creditId)

      if (updateError) {
        logger.error('AppointmentUpdate', 'Failed to update student credit:', updateError)
        throw updateError
      }

      logger.debug('AppointmentUpdate', 'Student credit updated:', {
        oldBalance: (oldBalance / 100).toFixed(2),
        newBalance: (newBalance / 100).toFixed(2)
      })
    }

    const newBalance = oldBalance + refundRappen

    // ✅ Create credit transaction with appointment reference
    const { data: transaction, error: transError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: appointment.user_id,
        transaction_type: 'duration_adjustment',
        amount_rappen: refundRappen,
        balance_before_rappen: oldBalance,
        balance_after_rappen: newBalance,
        reference_id: appointmentId,
        reference_type: 'appointment',
        notes: `Guthaben für Dauer-Reduktion: ${oldDuration}min → ${newDuration}min (CHF ${(refundRappen / 100).toFixed(2)})`
      })
      .select('id')
      .single()

    if (transError) {
      logger.error('AppointmentUpdate', 'Failed to create credit transaction:', transError)
      throw transError
    }

    logger.debug('AppointmentUpdate', 'Credit transaction created:', {
      transactionId: transaction.id,
      amount: (refundRappen / 100).toFixed(2),
      appointmentId
    })

    return {
      type: 'duration_decrease',
      amount: (refundRappen / 100),
      appliedToCredits: true,
      transactionId: transaction.id,
      requiresPayment: false
    }
  } catch (error: any) {
    logger.error('AppointmentUpdate', 'Error in handlePriceDecrease:', error)
    throw error
  }
}
