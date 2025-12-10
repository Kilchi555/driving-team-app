// server/api/appointments/update-duration-with-adjustment.post.ts
// Update appointment duration and automatically handle price adjustments with credit transactions

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

interface UpdateDurationRequest {
  appointmentId: string
  newDurationMinutes: number
  reason?: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<UpdateDurationRequest>(event)
    const { appointmentId, newDurationMinutes, reason } = body

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

    logger.debug('AppointmentUpdate', 'Updating appointment duration:', {
      appointmentId,
      newDurationMinutes
    })

    // 1. Load appointment to check if it was already paid
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, user_id, staff_id, duration_minutes, status, lesson_price_rappen, original_price_rappen, tenant_id')
      .eq('id', appointmentId)
      .single()

    if (fetchError || !appointment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Appointment not found'
      })
    }

    const oldDuration = appointment.duration_minutes

    // Check if duration actually changed
    if (oldDuration === newDurationMinutes) {
      logger.debug('AppointmentUpdate', 'Duration unchanged - nothing to do')
      return {
        success: true,
        message: 'Duration unchanged',
        adjustment: null
      }
    }

    logger.debug('AppointmentUpdate', 'Current appointment:', {
      duration: oldDuration,
      status: appointment.status,
      hasOriginalPrice: !!appointment.original_price_rappen
    })

    // 2. Get pricing rule to calculate price per minute
    const { data: pricing, error: pricingError } = await supabase
      .from('pricing_rules')
      .select('price_per_minute_rappen')
      .eq('tenant_id', appointment.tenant_id)
      .eq('category_code', 'B') // Assuming B category, adjust if needed
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (pricingError && pricingError.code !== 'PGRST116') {
      logger.warn('AppointmentUpdate', 'Error fetching pricing:', pricingError)
    }

    const pricePerMinute = (pricing?.price_per_minute_rappen || appointment.lesson_price_rappen / oldDuration) / 100

    // 3. Calculate price difference
    const oldPrice = oldDuration * pricePerMinute
    const newPrice = newDurationMinutes * pricePerMinute
    const priceDifference = newPrice - oldPrice
    const priceDifferenceRappen = Math.round(priceDifference * 100)

    logger.debug('AppointmentUpdate', 'Price calculation:', {
      oldPrice,
      newPrice,
      priceDifference,
      priceDifferenceRappen,
      paymentStatus: appointment.status
    })

    // 4. Check if payment exists
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, payment_status, user_id, tenant_id, admin_fee_rappen, discount_amount_rappen, products_price_rappen')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paymentError && paymentError.code !== 'PGRST116') {
      logger.warn('AppointmentUpdate', 'Error fetching payment:', paymentError)
    }

    let adjustmentResult = null

    // 5. Handle based on payment status
    if (payment && (payment.payment_status === 'completed' || payment.payment_status === 'authorized')) {
      logger.debug('AppointmentUpdate', 'Payment already processed - creating adjustment')

      if (priceDifferenceRappen > 0) {
        // ✅ Duration increased - create SECOND payment
        logger.debug('AppointmentUpdate', 'Duration increased - creating second payment:', priceDifferenceRappen)
        adjustmentResult = await handlePriceIncrease(
          supabase,
          appointmentId,
          payment,
          priceDifferenceRappen,
          newDurationMinutes,
          oldDuration
        )
      } else if (priceDifferenceRappen < 0) {
        // ✅ Duration decreased - apply credit
        logger.debug('AppointmentUpdate', 'Duration decreased - applying credit:', Math.abs(priceDifferenceRappen))
        adjustmentResult = await handlePriceDecrease(
          supabase,
          appointmentId,
          appointment,
          Math.abs(priceDifferenceRappen),
          newDurationMinutes,
          oldDuration
        )
      }
    } else if (payment) {
      // Payment exists but not completed - just update it
      logger.debug('AppointmentUpdate', 'Payment pending - updating payment amount')
      
      const newPriceRappen = Math.round(newPrice * 100)
      const newTotalRappen = newPriceRappen + (payment.admin_fee_rappen || 0) + (payment.products_price_rappen || 0) - (payment.discount_amount_rappen || 0)

      const { error: updateError } = await supabase
        .from('payments')
        .update({
          lesson_price_rappen: newPriceRappen,
          total_amount_rappen: Math.max(0, newTotalRappen),
          updated_at: new Date().toISOString(),
          notes: `Dauer angepasst: ${oldDuration}min → ${newDurationMinutes}min`
        })
        .eq('id', payment.id)

      if (updateError) {
        logger.error('AppointmentUpdate', 'Failed to update payment:', updateError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to update payment'
        })
      }

      logger.debug('AppointmentUpdate', 'Payment updated successfully')
    } else {
      logger.debug('AppointmentUpdate', 'No payment found - just update appointment duration')
    }

    // 6. Update appointment duration
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        duration_minutes: newDurationMinutes,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    if (updateError) {
      logger.error('AppointmentUpdate', 'Failed to update appointment:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update appointment duration'
      })
    }

    logger.debug('AppointmentUpdate', 'Appointment duration updated successfully')

    return {
      success: true,
      message: 'Appointment duration updated successfully',
      oldDuration,
      newDuration: newDurationMinutes,
      adjustment: adjustmentResult ? {
        type: adjustmentResult.type,
        amount: adjustmentResult.amount,
        appliedToCredits: adjustmentResult.appliedToCredits,
        secondPaymentId: adjustmentResult.secondPaymentId,
        transactionId: adjustmentResult.transactionId,
        requiresPayment: adjustmentResult.requiresPayment
      } : null
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
    const secondPaymentData = {
      appointment_id: appointmentId,
      user_id: payment.user_id,
      tenant_id: payment.tenant_id,
      payment_method: 'pending_adjustment',
      payment_status: 'pending',
      lesson_price_rappen: differencerappen,
      admin_fee_rappen: 0,
      products_price_rappen: 0,
      discount_amount_rappen: 0,
      credit_used_rappen: 0,
      total_amount_rappen: differencerappen,
      description: `Additional payment for extended lesson duration (${oldDuration}min → ${newDuration}min)`,
      notes: `Differenzberechnung für Dauer-Änderung: ${oldDuration}min → ${newDuration}min (CHF ${(differencerappen / 100).toFixed(2)})`
    }

    const { data: secondPayment, error: createError } = await supabase
      .from('payments')
      .insert(secondPaymentData)
      .select()
      .single()

    if (createError) throw new Error(`Failed to create second payment: ${createError.message}`)

    logger.debug('AppointmentUpdate', 'Second payment created:', secondPayment.id)

    return {
      type: 'duration_increase',
      amount: (differencerappen / 100),
      appliedToCredits: false,
      secondPaymentId: secondPayment.id,
      transactionId: null,
      requiresPayment: true
    }
  } catch (error: any) {
    logger.error('AppointmentUpdate', 'Error in handlePriceIncrease:', error)
    throw error
  }
}

// ✅ Handle price decrease - credit to student balance
async function handlePriceDecrease(
  supabase: any,
  appointmentId: string,
  appointment: any,
  refundRappen: number,
  newDuration: number,
  oldDuration: number
) {
  try {
    // Get current user for created_by
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    let currentUserId = appointment.staff_id // Default to staff who made the change
    
    if (authUser?.id) {
      const { data: currentUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .single()

      if (currentUser) {
        currentUserId = currentUser.id
      }
    }

    // Load current student credit balance
    const { data: studentCredit, error: creditError } = await supabase
      .from('student_credits')
      .select('id, balance_rappen')
      .eq('user_id', appointment.user_id)
      .eq('tenant_id', appointment.tenant_id)
      .limit(1)
      .maybeSingle()

    if (creditError && creditError.code !== 'PGRST116') {
      throw new Error(`Failed to load student credit: ${creditError.message}`)
    }

    let oldBalance = 0
    let studentCreditId = null

    // If no student credit exists, create one
    if (!studentCredit) {
      const { data: newCredit, error: createError } = await supabase
        .from('student_credits')
        .insert([{
          user_id: appointment.user_id,
          balance_rappen: refundRappen,
          tenant_id: appointment.tenant_id
        }])
        .select('id, balance_rappen')
        .single()
      
      if (createError) throw new Error(`Failed to create student credit: ${createError.message}`)
      
      logger.debug('AppointmentUpdate', 'Created new student credit record:', newCredit.id)
      
      oldBalance = 0
      studentCreditId = newCredit.id
    } else {
      oldBalance = studentCredit.balance_rappen || 0
      studentCreditId = studentCredit.id

      // Update existing credit balance
      const newBalance = oldBalance + refundRappen
      const { error: updateError } = await supabase
        .from('student_credits')
        .update({
          balance_rappen: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', studentCreditId)

      if (updateError) throw new Error(`Failed to update student credit: ${updateError.message}`)

      logger.debug('AppointmentUpdate', 'Student credit balance updated:', {
        oldBalance: (oldBalance / 100).toFixed(2),
        refund: (refundRappen / 100).toFixed(2),
        newBalance: (newBalance / 100).toFixed(2)
      })

      oldBalance = oldBalance // Update for transaction record
    }

    const newBalance = oldBalance + refundRappen

    // ✅ Create credit transaction with appointment reference
    const { data: transaction, error: transError } = await supabase
      .from('credit_transactions')
      .insert([{
        user_id: appointment.user_id,
        transaction_type: 'duration_adjustment',
        amount_rappen: refundRappen,
        balance_before_rappen: oldBalance,
        balance_after_rappen: newBalance,
        reference_id: appointmentId,
        reference_type: 'appointment',
        created_by: currentUserId,
        notes: `Guthaben für Dauer-Reduktion: ${oldDuration}min → ${newDuration}min (CHF ${(refundRappen / 100).toFixed(2)})`
      }])
      .select()
      .single()

    if (transError) throw new Error(`Failed to create credit transaction: ${transError.message}`)

    logger.debug('AppointmentUpdate', 'Credit transaction created:', transaction.id)

    return {
      type: 'duration_decrease',
      amount: (refundRappen / 100),
      appliedToCredits: true,
      secondPaymentId: null,
      transactionId: transaction.id,
      requiresPayment: false
    }
  } catch (error: any) {
    logger.error('AppointmentUpdate', 'Error in handlePriceDecrease:', error)
    throw error
  }
}
