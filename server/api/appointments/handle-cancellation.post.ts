// server/api/appointments/handle-cancellation.post.ts
// Handles appointment cancellation with automatic refund processing

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()
    const { 
      appointmentId, 
      deletionReason, 
      lessonPriceRappen, 
      adminFeeRappen,
      // ✅ NEW: Cancellation policy info
      shouldCreditHours,
      chargePercentage,
      originalLessonPrice,
      originalAdminFee
    } = await readBody(event)

    console.log('🗑️ Processing appointment cancellation:', {
      appointmentId,
      deletionReason,
      lessonPriceRappen,
      adminFeeRappen,
      shouldCreditHours,
      chargePercentage,
      originalLessonPrice,
      originalAdminFee
    })

    // Validate input
    if (!appointmentId) {
      throw new Error('Missing appointmentId')
    }

    // 1. Fetch the appointment and its payment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select('user_id, duration_minutes, type, tenant_id')
      .eq('id', appointmentId)
      .single()

    if (aptError) throw new Error(`Appointment not found: ${aptError.message}`)

    // Get payment with tenant_id filter to bypass RLS issues
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('tenant_id', appointment.tenant_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paymentError && paymentError.code !== 'PGRST116') {
      console.error('❌ ERROR fetching payment (not just "not found"):', {
        code: paymentError.code,
        message: paymentError.message,
        details: paymentError.details
      })
      throw new Error(`Error fetching payment: ${paymentError.message}`)
    }
    
    console.log('🔍 Payment query result:', {
      appointmentId,
      paymentFound: !!payment,
      paymentId: payment?.id,
      lessonPrice: payment?.lesson_price_rappen,
      adminFee: payment?.admin_fee_rappen
    })

    // 2. Determine refund amount
    // ✅ NEW: If shouldCreditHours is true, use original prices for full refund
    let refundableAmount: number
    
    if (shouldCreditHours && chargePercentage === 0) {
      // Staff cancellation (no charge) - refund original prices
      const originalLesson = originalLessonPrice || (lessonPriceRappen || 0)
      const originalAdmin = originalAdminFee || (adminFeeRappen || 0)
      refundableAmount = originalLesson + originalAdmin
      console.log('💚 Staff cancellation - refunding full original prices:', {
        originalLesson: (originalLesson / 100).toFixed(2),
        originalAdmin: (originalAdmin / 100).toFixed(2),
        total: (refundableAmount / 100).toFixed(2)
      })
    } else {
      // Regular cancellation - use the passed amounts
      refundableAmount = (lessonPriceRappen || 0) + (adminFeeRappen || 0)
      console.log('💰 Regular cancellation refund calculation:', {
        lessonPrice: ((lessonPriceRappen || 0) / 100).toFixed(2),
        adminFee: ((adminFeeRappen || 0) / 100).toFixed(2),
        totalRefund: (refundableAmount / 100).toFixed(2),
        chargePercentage
      })
    }

    if (!payment) {
      console.log('⚠️ No payment found for appointment - check if shouldCreditHours is true')
      
      // ✅ NEW: If shouldCreditHours is true but no payment found, still create credit!
      // This happens when appointment has no associated payment (e.g., free lessons)
      if (shouldCreditHours && chargePercentage === 0) {
        const refundAmount = (originalLessonPrice || 0) + (originalAdminFee || 0)
        
        if (refundAmount > 0) {
          console.log('💚 No payment but shouldCreditHours=true, creating credit anyway:', {
            refundAmount: (refundAmount / 100).toFixed(2)
          })
          
          // Fetch appointment for user_id
          const { data: apt } = await supabase
            .from('appointments')
            .select('user_id')
            .eq('id', appointmentId)
            .single()
          
          if (apt) {
            // Create credit directly
            const { data: { user: authUser } } = await supabase.auth.getUser()
            const { data: currentUser } = await supabase
              .from('users')
              .select('id')
              .eq('auth_user_id', authUser?.id)
              .single()
            
            if (currentUser) {
              // Load current balance
              const { data: studentCredit } = await supabase
                .from('student_credits')
                .select('id, balance_rappen')
                .eq('user_id', apt.user_id)
                .single()
              
              if (studentCredit) {
                const oldBalance = studentCredit.balance_rappen || 0
                const newBalance = oldBalance + refundAmount
                
                await supabase
                  .from('student_credits')
                  .update({
                    balance_rappen: newBalance,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', studentCredit.id)
                
                await supabase
                  .from('credit_transactions')
                  .insert([{
                    user_id: apt.user_id,
                    transaction_type: 'cancellation',
                    amount_rappen: refundAmount,
                    balance_before_rappen: oldBalance,
                    balance_after_rappen: newBalance,
                    payment_method: 'refund',
                    reference_id: appointmentId,
                    reference_type: 'appointment',
                    created_by: currentUser.id,
                    notes: `Rückerstattung für Terminabsage: ${deletionReason} (CHF ${(refundAmount / 100).toFixed(2)})`
                  }])
                
                console.log('✅ Credit created despite no payment:', {
                  oldBalance: (oldBalance / 100).toFixed(2),
                  newBalance: (newBalance / 100).toFixed(2),
                  refund: (refundAmount / 100).toFixed(2)
                })
                
                // ✅ NEW: Update appointment to mark credit_created as true
                const { error: updateAptError } = await supabase
                  .from('appointments')
                  .update({ credit_created: true })
                  .eq('id', appointmentId)
                
                if (updateAptError) {
                  console.warn('⚠️ Could not update appointment credit_created flag:', updateAptError)
                } else {
                  console.log('✅ Appointment marked as credit_created (no payment case)')
                }
                
                return {
                  success: true,
                  message: 'Appointment cancelled - credit applied to student balance (no payment found)',
                  refundAmount: (refundAmount / 100),
                  action: 'credit_created_no_payment',
                  details: {
                    oldBalance: (oldBalance / 100).toFixed(2),
                    newBalance: (newBalance / 100).toFixed(2),
                    refundAmount: (refundAmount / 100).toFixed(2),
                    deletionReason
                  }
                }
              }
            }
          }
        }
      }
      
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
        // ✅ NEW: If no refund is applicable (chargePercentage = 0), mark payment as completed
        // This ensures the "Jetzt bezahlen" button disappears from customer payments page
        console.log('ℹ️ Free cancellation - updating payment status to completed')
        const { error: updatePaymentError } = await supabase
          .from('payments')
          .update({
            payment_status: 'completed',
            paid_at: new Date().toISOString(),
            notes: `${payment.notes ? payment.notes + ' | ' : ''}Free cancellation: ${deletionReason}`
          })
          .eq('id', payment.id)
        
        if (updatePaymentError) {
          console.warn('⚠️ Could not update payment status:', updatePaymentError)
        } else {
          console.log('✅ Payment marked as completed (free cancellation):', {
            paymentId: payment.id,
            reason: deletionReason
          })
        }
        
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
    // Note: We can't use supabase.auth.getUser() with admin context
    // Instead, we'll use the staff_id from the payment if available
    let currentUserId = payment.staff_id || null
    
    if (!currentUserId) {
      // Fallback: try to get from auth context (if available)
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', authUser.id)
            .single()
          currentUserId = user?.id || null
        }
      } catch (e) {
        console.warn('⚠️ Could not get current user from auth context:', (e as any).message)
      }
    }
    
    if (!currentUserId) {
      console.warn('⚠️ Could not determine current user, using null for created_by')
    }

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
        created_by: currentUserId,
        notes: `Rückerstattung für Terminabsage: ${deletionReason} (CHF ${(refundAmountRappen / 100).toFixed(2)})`
      }])
      .select()
      .single()

    if (transError) throw new Error(`Failed to create credit transaction: ${transError.message}`)

    console.log('✅ Credit transaction created:', transaction.id)

    // ✅ NEW: Update payment record to mark it as refunded
    const refundedAt = new Date().toISOString()
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        payment_status: 'refunded',
        refunded_at: refundedAt,
        notes: `${payment.notes ? payment.notes + ' | ' : ''}Refunded: ${deletionReason} (CHF ${(refundAmountRappen / 100).toFixed(2)})`
      })
      .eq('id', payment.id)
    
    if (updatePaymentError) {
      console.warn('⚠️ Could not update payment refunded status:', updatePaymentError)
    } else {
      console.log('✅ Payment marked as refunded:', {
        paymentId: payment.id,
        refundedAt,
        refundAmount: (refundAmountRappen / 100).toFixed(2)
      })
    }

    // ✅ NEW: Update appointment to mark credit_created as true
    const { error: updateAptError } = await supabase
      .from('appointments')
      .update({ credit_created: true })
      .eq('id', appointmentId)
    
    if (updateAptError) {
      console.warn('⚠️ Could not update appointment credit_created flag:', updateAptError)
    } else {
      console.log('✅ Appointment marked as credit_created')
    }

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

