// server/api/appointments/handle-cancellation.post.ts
// Handles appointment cancellation with automatic refund processing

import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabase()
    const { appointmentId, deletionReason, lessonPriceRappen, adminFeeRappen } = await readBody(event)

    console.log('🗑️ Processing appointment cancellation:', {
      appointmentId,
      deletionReason,
      lessonPriceRappen,
      adminFeeRappen
    })

    // Validate input
    if (!appointmentId) {
      throw new Error('Missing appointmentId')
    }

    // 1. Fetch the appointment and its payment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select('user_id, duration_minutes, type')
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

    // 2. Determine refund amount
    // Refund only lesson price + admin fee (NOT products - those stay with the booking)
    const refundableAmount = (lessonPriceRappen || 0) + (adminFeeRappen || 0)

    console.log('💰 Refund calculation:', {
      lessonPrice: ((lessonPriceRappen || 0) / 100).toFixed(2),
      adminFee: ((adminFeeRappen || 0) / 100).toFixed(2),
      totalRefund: (refundableAmount / 100).toFixed(2),
      paymentStatus: payment?.payment_status
    })

    if (!payment) {
      console.log('⚠️ No payment found for appointment')
      return { success: false, message: 'No payment found for this appointment' }
    }

    // 3. Check if payment was completed/authorized
    if (payment.payment_status === 'completed' || payment.payment_status === 'authorized') {
      console.log('✅ Payment was completed - processing refund')

      if (refundableAmount > 0) {
        return await processRefund(
          supabase,
          appointmentId,
          appointment.user_id,
          payment,
          refundableAmount,
          deletionReason
        )
      } else {
        console.log('ℹ️ No refundable amount')
        return {
          success: true,
          message: 'Appointment cancelled - no refund applicable',
          refundAmount: 0,
          action: 'cancelled_no_refund'
        }
      }
    } else {
      console.log('ℹ️ Payment was not completed - no refund needed')
      return {
        success: true,
        message: 'Appointment cancelled - payment was not completed',
        refundAmount: 0,
        action: 'cancelled_no_refund'
      }
    }
  } catch (error: any) {
    console.error('❌ Error processing appointment cancellation:', error)
    return { success: false, error: error.message }
  }
})

// Process refund to student credit
async function processRefund(
  supabase: any,
  appointmentId: string,
  userId: string,
  payment: any,
  refundAmountRappen: number,
  deletionReason: string
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
      .eq('user_id', userId)
      .single()

    if (creditError) throw new Error(`Failed to load student credit: ${creditError.message}`)

    const oldBalance = studentCredit.balance_rappen || 0
    const newBalance = oldBalance + refundAmountRappen

    // Update student credit balance
    const { error: updateError } = await supabase
      .from('student_credits')
      .update({
        balance_rappen: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentCredit.id)

    if (updateError) throw new Error(`Failed to update student credit: ${updateError.message}`)

    console.log('✅ Student credit balance updated:', {
      oldBalance: (oldBalance / 100).toFixed(2),
      refund: (refundAmountRappen / 100).toFixed(2),
      newBalance: (newBalance / 100).toFixed(2)
    })

    // Create credit transaction record
    const { data: transaction, error: transError } = await supabase
      .from('credit_transactions')
      .insert([{
        user_id: userId,
        transaction_type: 'cancellation',
        amount_rappen: refundAmountRappen,
        balance_before_rappen: oldBalance,
        balance_after_rappen: newBalance,
        payment_method: 'refund',
        reference_id: appointmentId,
        reference_type: 'appointment',
        created_by: currentUser.id,
        notes: `Rückerstattung für Terminabsage: ${deletionReason} (CHF ${(refundAmountRappen / 100).toFixed(2)})`
      }])
      .select()
      .single()

    if (transError) throw new Error(`Failed to create credit transaction: ${transError.message}`)

    console.log('✅ Credit transaction created:', transaction.id)

    return {
      success: true,
      message: 'Appointment cancelled - refund applied to student balance',
      refundAmount: (refundAmountRappen / 100),
      action: 'refund_processed',
      transactionId: transaction.id,
      details: {
        refundAmount: (refundAmountRappen / 100).toFixed(2),
        deletionReason,
        oldBalance: (oldBalance / 100).toFixed(2),
        newBalance: (newBalance / 100).toFixed(2)
      }
    }
  } catch (error: any) {
    console.error('❌ Error in processRefund:', error)
    throw error
  }
}

