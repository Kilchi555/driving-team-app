// server/api/appointments/adjust-duration.post.ts
// Handles appointment duration adjustments with automatic payment reconciliation

import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabase()
    const { appointmentId, newDurationMinutes, oldDurationMinutes, pricePerMinute } = await readBody(event)

    logger.debug('⏱️ Adjusting appointment duration:', {
      appointmentId,
      oldDurationMinutes,
      newDurationMinutes,
      pricePerMinute
    })

    // Validate input
    if (!appointmentId || newDurationMinutes === undefined || oldDurationMinutes === undefined || pricePerMinute === undefined) {
      throw new Error('Missing required fields')
    }

    // 1. Fetch the appointment and its payment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select('id, user_id, staff_id, start_time, duration_minutes, status, tenant_id, lesson_price_rappen')
      .eq('id', appointmentId)
      .single()

    if (aptError) throw new Error(`Appointment not found: ${aptError.message}`)

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paymentError && paymentError.code !== 'PGRST116') {
      throw new Error(`Error fetching payment: ${paymentError.message}`)
    }

    if (!payment) {
      logger.debug('⚠️ No payment found for appointment - this is OK, just update the appointment duration locally')
      return { 
        success: true, 
        message: 'No payment found - duration change noted but no payment reconciliation needed',
        priceDifference: 0,
        action: 'no_payment'
      }
    }

    // 2. Calculate price difference
    const oldPrice = oldDurationMinutes * pricePerMinute
    const newPrice = newDurationMinutes * pricePerMinute
    const priceDifference = newPrice - oldPrice
    const priceDifferenceRappen = Math.round(priceDifference * 100)

    logger.debug('💰 Price calculation:', {
      oldPrice,
      newPrice,
      priceDifference,
      priceDifferenceRappen,
      paymentStatus: payment.payment_status
    })

    // 3. Handle based on payment status
    if (payment.payment_status === 'completed' || payment.payment_status === 'authorized') {
      logger.debug('✅ Payment already processed:', payment.payment_status)

      if (priceDifference > 0) {
        // Price increased - create second payment for difference
        logger.debug('📈 Price increased - creating additional payment for difference')
        return await handlePriceIncrease(
          supabase,
          appointmentId,
          payment,
          priceDifferenceRappen,
          newDurationMinutes,
          oldDurationMinutes
        )
      } else if (priceDifference < 0) {
        // Price decreased - credit to student balance
        logger.debug('📉 Price decreased - crediting student balance')
        return await handlePriceDecrease(
          supabase,
          appointmentId,
          payment,
          Math.abs(priceDifferenceRappen),
          newDurationMinutes,
          oldDurationMinutes
        )
      } else {
        logger.debug('➡️ No price change')
        return { success: true, message: 'No price difference', priceDifference: 0 }
      }
    } else {
      // Payment not yet completed - just update existing payment
      logger.debug('🔄 Payment not yet completed - updating existing payment')
      return await updatePendingPayment(
        supabase,
        appointmentId,
        payment,
        newPrice,
        newDurationMinutes,
        oldDurationMinutes
      )
    }
  } catch (error: any) {
    console.error('❌ Error adjusting appointment duration:', error)
    return { success: false, error: error.message }
  }
})

// Handle price increase - create second payment
async function handlePriceIncrease(
  supabase: any,
  appointmentId: string,
  originalPayment: any,
  differencerappen: number,
  newDuration: number,
  oldDuration: number
) {
  try {
    // Create second payment for the difference
    const secondPaymentData = {
      appointment_id: appointmentId,
      user_id: originalPayment.user_id,
      tenant_id: originalPayment.tenant_id,
      payment_method: originalPayment.payment_method,
      payment_status: 'pending',
      lesson_price_rappen: differencerappen,
      admin_fee_rappen: 0,
      products_price_rappen: 0,
      discount_amount_rappen: 0,
      credit_used_rappen: 0,
      total_amount_rappen: differencerappen,
      notes: `Differenzberechnung für Dauer-Änderung: ${oldDuration}min → ${newDuration}min (CHF ${(differencerappen / 100).toFixed(2)})`
    }

    const { data: secondPayment, error: createError } = await supabase
      .from('payments')
      .insert([secondPaymentData])
      .select()
      .single()

    if (createError) throw new Error(`Failed to create second payment: ${createError.message}`)

    logger.debug('✅ Second payment created:', secondPayment.id)

    return {
      success: true,
      message: 'Price increased - additional payment created',
      priceDifference: differencerappen / 100,
      action: 'additional_payment',
      paymentId: secondPayment.id,
      details: {
        originalPaymentId: (originalPayment as any).id,
        additionalPaymentId: secondPayment.id,
        amount: (differencerappen / 100).toFixed(2),
        durationChange: `${oldDuration}min → ${newDuration}min`
      }
    }
  } catch (error: any) {
    console.error('❌ Error in handlePriceIncrease:', error)
    throw error
  }
}

// Handle price decrease - credit to student balance
async function handlePriceDecrease(
  supabase: any,
  appointmentId: string,
  payment: any,
  refundRappen: number,
  newDuration: number,
  oldDuration: number
) {
  try {
    // Get current user for created_by
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    const { data: currentUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authUser?.id)
      .single()

    if (!currentUser) throw new Error('Current user not found')

    // Load current student credit balance
    const { data: studentCredit, error: creditError } = await supabase
      .from('student_credits')
      .select('id, balance_rappen')
      .eq('user_id', payment.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (creditError && creditError.code !== 'PGRST116') {
      throw new Error(`Failed to load student credit: ${creditError.message}`)
    }
    
    // If no student credit exists, create one
    if (!studentCredit) {
      const { data: newCredit, error: createError } = await supabase
        .from('student_credits')
        .insert([{
          user_id: payment.user_id,
          balance_rappen: 0,
          tenant_id: payment.tenant_id
        }])
        .select('id, balance_rappen')
        .single()
      
      if (createError) throw new Error(`Failed to create student credit: ${createError.message}`)
      
      logger.debug('✅ Created new student credit record:', newCredit.id)
      
      // Use the newly created record
      const oldBalance = 0
      const newBalance = refundRappen
      
      // Update it immediately with the refund
      const { error: updateError } = await supabase
        .from('student_credits')
        .update({
          balance_rappen: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', newCredit.id)
      
      if (updateError) throw new Error(`Failed to update new student credit: ${updateError.message}`)
      
      // Create transaction and return
      const { data: transaction, error: transError } = await supabase
        .from('credit_transactions')
        .insert([{
          user_id: payment.user_id,
          transaction_type: 'refund',
          amount_rappen: refundRappen,
          balance_before_rappen: oldBalance,
          balance_after_rappen: newBalance,
          payment_method: 'refund',
          reference_id: appointmentId,
          reference_type: 'appointment',
          created_by: currentUser.id,
          notes: `Guthaben für Dauer-Reduktion: ${oldDuration}min → ${newDuration}min (CHF ${(refundRappen / 100).toFixed(2)})`
        }])
        .select()
        .single()
      
      if (transError) throw new Error(`Failed to create credit transaction: ${transError.message}`)
      
      return {
        success: true,
        message: 'Price decreased - credit applied to student balance',
        priceDifference: -(refundRappen / 100),
        action: 'credit_applied',
        transactionId: transaction.id,
        details: {
          refundAmount: (refundRappen / 100).toFixed(2),
          durationChange: `${oldDuration}min → ${newDuration}min`,
          oldBalance: (oldBalance / 100).toFixed(2),
          newBalance: (newBalance / 100).toFixed(2)
        }
      }
    }

    const oldBalance = studentCredit.balance_rappen || 0
    const newBalance = oldBalance + refundRappen

    // Update student credit balance
    const { error: updateError } = await supabase
      .from('student_credits')
      .update({
        balance_rappen: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentCredit.id)

    if (updateError) throw new Error(`Failed to update student credit: ${updateError.message}`)

    logger.debug('✅ Student credit balance updated:', {
      oldBalance: (oldBalance / 100).toFixed(2),
      refund: (refundRappen / 100).toFixed(2),
      newBalance: (newBalance / 100).toFixed(2)
    })

    // Create credit transaction record
    const { data: transaction, error: transError } = await supabase
      .from('credit_transactions')
      .insert([{
        user_id: payment.user_id,
        transaction_type: 'refund',
        amount_rappen: refundRappen,
        balance_before_rappen: oldBalance,
        balance_after_rappen: newBalance,
        payment_method: 'refund',
        reference_id: appointmentId,
        reference_type: 'appointment',
        created_by: currentUser.id,
        notes: `Guthaben für Dauer-Reduktion: ${oldDuration}min → ${newDuration}min (CHF ${(refundRappen / 100).toFixed(2)})`
      }])
      .select()
      .single()

    if (transError) throw new Error(`Failed to create credit transaction: ${transError.message}`)

    logger.debug('✅ Credit transaction created:', transaction.id)

    return {
      success: true,
      message: 'Price decreased - credit applied to student balance',
      priceDifference: -(refundRappen / 100),
      action: 'credit_applied',
      transactionId: transaction.id,
      details: {
        refundAmount: (refundRappen / 100).toFixed(2),
        durationChange: `${oldDuration}min → ${newDuration}min`,
        oldBalance: (oldBalance / 100).toFixed(2),
        newBalance: (newBalance / 100).toFixed(2)
      }
    }
  } catch (error: any) {
    console.error('❌ Error in handlePriceDecrease:', error)
    throw error
  }
}

// Update existing pending payment
async function updatePendingPayment(
  supabase: any,
  appointmentId: string,
  payment: any,
  newPrice: number,
  newDuration: number,
  oldDuration: number
) {
  try {
    const newPriceRappen = Math.round(newPrice * 100)
    const oldPriceRappen = payment.lesson_price_rappen || 0

    // Calculate new total (products and admin fee stay the same)
    const newTotalRappen = newPriceRappen + (payment.admin_fee_rappen || 0) + (payment.products_price_rappen || 0) - (payment.discount_amount_rappen || 0)

    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        lesson_price_rappen: newPriceRappen,
        total_amount_rappen: Math.max(0, newTotalRappen),
        updated_at: new Date().toISOString(),
        notes: `Dauer angepasst: ${oldDuration}min → ${newDuration}min`
      })
      .eq('id', payment.id)
      .select()
      .single()

    if (updateError) throw new Error(`Failed to update payment: ${updateError.message}`)

    logger.debug('✅ Pending payment updated:', {
      oldPrice: (oldPriceRappen / 100).toFixed(2),
      newPrice: (newPriceRappen / 100).toFixed(2),
      oldTotal: (payment.total_amount_rappen / 100).toFixed(2),
      newTotal: (newTotalRappen / 100).toFixed(2)
    })

    return {
      success: true,
      message: 'Pending payment updated with new price',
      priceDifference: (newPriceRappen - oldPriceRappen) / 100,
      action: 'payment_updated',
      paymentId: updatedPayment.id,
      details: {
        oldPrice: (oldPriceRappen / 100).toFixed(2),
        newPrice: (newPriceRappen / 100).toFixed(2),
        durationChange: `${oldDuration}min → ${newDuration}min`
      }
    }
  } catch (error: any) {
    console.error('❌ Error in updatePendingPayment:', error)
    throw error
  }
}

