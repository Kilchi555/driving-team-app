// server/api/appointments/handle-cancellation.post.ts
// INTERNAL ONLY: Handles appointment cancellation with automatic refund processing
// ⚠️ SECURITY: Only called from cancel-customer.post.ts or cancel-staff.post.ts
// ⚠️ SECURITY: These callers must verify auth + authorization + tenant before calling

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { logAudit } from '~/server/utils/audit'
import { createAvailabilitySlotManager } from '~/server/utils/availability-slot-manager'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()
    const slotManager = createAvailabilitySlotManager(supabase)
    
    const { 
      appointmentId, 
      cancellationReasonId,
      deletionReason, 
      lessonPriceRappen, 
      adminFeeRappen,
      shouldCreditHours,
      chargePercentage,
      originalLessonPrice,
      originalAdminFee,
      staffId, // ✅ NEW: For audit logging
      cancelledBy // ✅ NEW: 'customer' or 'staff'
    } = await readBody(event)

    // ⚠️ SECURITY: Verify this is called from authorized callers only
    // In production, should verify caller context

    logger.debug('🗑️ Processing appointment cancellation:', {
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
      .select('user_id, duration_minutes, type, tenant_id, status, staff_id, start_time, end_time')
      .eq('id', appointmentId)
      .single()

    if (aptError) throw new Error(`Appointment not found: ${aptError.message}`)

    // ✅ CRITICAL: Mark appointment as cancelled immediately
    // This must happen before any refund logic, so status is set correctly
    await markAppointmentCancelled(supabase, appointmentId, deletionReason, appointment.tenant_id)

    // ✅ NEW: Release all overlapping availability slots immediately
    // This makes slots available again for other bookings
    try {
      logger.debug('🔓 Releasing availability slots for cancelled appointment...')
      const releaseResult = await slotManager.releaseSlots(
        appointment.staff_id,
        appointment.start_time,
        appointment.end_time,
        appointment.tenant_id
      )
      if (releaseResult.success) {
        logger.debug(`✅ Released ${releaseResult.releasedCount} availability slots`)
      }
    } catch (slotError: any) {
      logger.warn('⚠️ Failed to release slots (non-critical):', slotError.message)
      // Non-critical: appointment is already cancelled, slots will be regenerated at next cron
    }

    // ✅ NEW: Queue availability recalculation to regenerate slots for freed time
    try {
      logger.debug('📋 Queuing availability recalculation after appointment cancellation...')
      await $fetch('/api/availability/queue-recalc', {
        method: 'POST',
        body: {
          staff_id: appointment.staff_id,
          tenant_id: appointment.tenant_id,
          trigger: 'appointment_cancelled'
        }
      })
      logger.debug('✅ Queued recalculation after appointment cancellation')
    } catch (queueError: any) {
      logger.warn('⚠️ Failed to queue recalculation (non-critical):', queueError.message)
    }

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
    
    logger.debug('🔍 Payment query result:', {
      appointmentId,
      paymentFound: !!payment,
      paymentId: payment?.id,
      lessonPrice: payment?.lesson_price_rappen,
      adminFee: payment?.admin_fee_rappen
    })

    // 2. Determine refund amount
    // ✅ NEW: If shouldCreditHours is true, use original prices for full refund
    // ✅ IMPORTANT: Exclude non-refundable products from refund!
    let refundableAmount: number
    let refundableProductsAmount = 0
    
    // Check if payment has products and if any are non-refundable
    if (payment && payment.metadata?.products && Array.isArray(payment.metadata.products)) {
      logger.debug('🛍️ Checking products for refundability:', {
        productsCount: payment.metadata.products.length
      })
      
      // Load product details to check is_refundable flag
      const productIds = payment.metadata.products.map((p: any) => p.id)
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, is_refundable, price_rappen')
        .in('id', productIds)
      
      if (!productsError && products) {
        // Calculate refundable products only
        for (const product of products) {
          const productMetadata = payment.metadata.products.find((p: any) => p.id === product.id)
          if (productMetadata) {
            if (product.is_refundable === false) {
              logger.debug('❌ Non-refundable product:', {
                id: product.id,
                price: (product.price_rappen / 100).toFixed(2)
              })
              // Don't add to refund
            } else {
              logger.debug('✅ Refundable product:', {
                id: product.id,
                price: (productMetadata.price_rappen / 100).toFixed(2)
              })
              refundableProductsAmount += (productMetadata.price_rappen || 0)
            }
          }
        }
      }
    }
    
    // ✅ Get voucher discount (refundable) from payment
    const voucherDiscountAmount = payment?.voucher_discount_rappen || 0
    
    if (shouldCreditHours && chargePercentage === 0) {
      // Staff cancellation (no charge) - refund original prices + refundable products + voucher discount
      const originalLesson = originalLessonPrice || (lessonPriceRappen || 0)
      const originalAdmin = originalAdminFee || (adminFeeRappen || 0)
      refundableAmount = originalLesson + originalAdmin + refundableProductsAmount + voucherDiscountAmount
      logger.debug('💚 Staff cancellation - refunding full original prices + refundable products + voucher discount:', {
        originalLesson: (originalLesson / 100).toFixed(2),
        originalAdmin: (originalAdmin / 100).toFixed(2),
        refundableProducts: (refundableProductsAmount / 100).toFixed(2),
        voucherDiscount: (voucherDiscountAmount / 100).toFixed(2),
        total: (refundableAmount / 100).toFixed(2)
      })
    } else {
      // Regular cancellation - use the passed amounts + refundable products + voucher discount
      refundableAmount = (lessonPriceRappen || 0) + (adminFeeRappen || 0) + refundableProductsAmount + voucherDiscountAmount
      logger.debug('💰 Regular cancellation refund calculation:', {
        lessonPrice: ((lessonPriceRappen || 0) / 100).toFixed(2),
        adminFee: ((adminFeeRappen || 0) / 100).toFixed(2),
        refundableProducts: (refundableProductsAmount / 100).toFixed(2),
        voucherDiscount: (voucherDiscountAmount / 100).toFixed(2),
        totalRefund: (refundableAmount / 100).toFixed(2),
        chargePercentage
      })
    }

    if (!payment) {
      logger.debug('⚠️ No payment found for appointment')
      
      // ✅ UPDATED LOGIC: When appointment is unpaid (no payment found)
      // - Staff cancellation (chargePercentage = 0): Do nothing, just delete
      // - Client cancellation (chargePercentage = 100): Payment stays pending for next appointment
      
      if (chargePercentage === 0 && shouldCreditHours) {
        // Staff cancellation without charge - no need to create credit or do anything
        logger.debug('✅ Staff cancellation with no charge on unpaid appointment - no action needed')
        
        return {
          success: true,
          message: 'Appointment cancelled - no payment to process (staff cancellation)',
          action: 'no_payment_staff_cancel',
          details: {
            deletionReason
          }
        }
      } else if (chargePercentage > 0) {
        // Client cancellation with charge on unpaid appointment
        // Payment will remain pending and be charged with next appointment
        logger.debug('✅ Client cancellation with charge on unpaid appointment - payment stays pending', {
          chargePercentage,
          chargeAmount: Math.round((lessonPriceRappen + adminFeeRappen) * chargePercentage / 100)
        })
        return {
          success: true,
          message: 'Appointment cancelled - pending charge will be applied to next payment',
          action: 'pending_charge_no_payment',
          details: {
            chargePercentage,
            chargeAmountRappen: Math.round((lessonPriceRappen + adminFeeRappen) * chargePercentage / 100),
            deletionReason
          }
        }
      }
      
      return { success: true, message: 'No payment found for this appointment' }
    }

    // 3. Check if payment was completed/authorized
    if (payment.payment_status === 'completed' || payment.payment_status === 'authorized') {
      logger.debug('✅ Payment was completed - processing refund')

      if (refundableAmount > 0) {
        const refundResult = await processRefund(
          supabase,
          appointmentId,
          appointment.user_id,
          payment,
          refundableAmount,
          deletionReason
        )
        
        return refundResult
      } else {
        // ✅ FREE CANCELLATION: Update payment status based on current status
        // completed → refunded (money was returned)
        // authorized/pending → cancelled (never paid)
        logger.debug('ℹ️ Free cancellation - updating payment status')
        
        // ✅ NEW: If credit was used, refund it back to student credit
        let creditRefundNeeded = false
        if (payment.credit_used_rappen > 0) {
          creditRefundNeeded = true
          logger.debug('💳 Credit was used for this payment - will refund:', {
            creditUsed: (payment.credit_used_rappen / 100).toFixed(2),
            userId: appointment.user_id
          })
          
          // Load current student credit balance
          const { data: studentCredit, error: creditError } = await supabase
            .from('student_credits')
            .select('id, balance_rappen')
            .eq('user_id', appointment.user_id)
            .single()
          
          if (!creditError && studentCredit) {
            const oldBalance = studentCredit.balance_rappen || 0
            const newBalance = oldBalance + payment.credit_used_rappen
            
            // Refund the credit
            const { error: updateCreditError } = await supabase
              .from('student_credits')
              .update({
                balance_rappen: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq('id', studentCredit.id)
            
            if (updateCreditError) {
              console.warn('⚠️ Could not refund credit to student balance:', updateCreditError)
            } else {
              logger.debug('✅ Credit refunded to student balance:', {
                oldBalance: (oldBalance / 100).toFixed(2),
                refund: (payment.credit_used_rappen / 100).toFixed(2),
                newBalance: (newBalance / 100).toFixed(2)
              })
            }
          }
        }
        
        const newStatus = payment.payment_status === 'completed' ? 'refunded' : 'cancelled'
        const { error: updatePaymentError } = await supabase
          .from('payments')
          .update({
            payment_status: newStatus,
            credit_used_rappen: 0, // ✅ NEW: Clear credit used since it's being refunded
            notes: `${payment.notes ? payment.notes + ' | ' : ''}Free cancellation: ${deletionReason}${creditRefundNeeded ? ' (credit refunded)' : ''}`
          })
          .eq('id', payment.id)
        
        if (updatePaymentError) {
          console.warn('⚠️ Could not update payment status:', updatePaymentError)
        } else {
          logger.debug('✅ Payment status updated:', {
            paymentId: payment.id,
            oldStatus: payment.payment_status,
            newStatus: newStatus,
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
      logger.debug('ℹ️ Payment was not completed (pending/pending_approval)')
      
      // ✅ Case 1: FREE CANCELLATION (refundableAmount === 0 AND chargePercentage === 0)
      if (refundableAmount === 0 && chargePercentage === 0) {
        logger.debug('ℹ️ Free cancellation - updating payment status to cancelled')
        
        // ✅ NEW: If credit was used, refund it back to student credit
        let creditRefundNeeded = false
        if (payment.credit_used_rappen > 0) {
          creditRefundNeeded = true
          logger.debug('💳 Credit was used for this payment - will refund:', {
            creditUsed: (payment.credit_used_rappen / 100).toFixed(2),
            userId: appointment.user_id
          })
          
          // Load current student credit balance
          const { data: studentCredit, error: creditError } = await supabase
            .from('student_credits')
            .select('id, balance_rappen')
            .eq('user_id', appointment.user_id)
            .single()
          
          if (!creditError && studentCredit) {
            const oldBalance = studentCredit.balance_rappen || 0
            const newBalance = oldBalance + payment.credit_used_rappen
            
            // Refund the credit
            const { error: updateCreditError } = await supabase
              .from('student_credits')
              .update({
                balance_rappen: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq('id', studentCredit.id)
            
            if (updateCreditError) {
              console.warn('⚠️ Could not refund credit to student balance:', updateCreditError)
            } else {
              logger.debug('✅ Credit refunded to student balance:', {
                oldBalance: (oldBalance / 100).toFixed(2),
                refund: (payment.credit_used_rappen / 100).toFixed(2),
                newBalance: (newBalance / 100).toFixed(2)
              })
            }
          }
        }
        
        const { error: updatePaymentError } = await supabase
          .from('payments')
          .update({
            payment_status: 'cancelled',
            credit_used_rappen: 0, // ✅ NEW: Clear credit used since it's being refunded
            notes: `${payment.notes ? payment.notes + ' | ' : ''}Free cancellation: ${deletionReason}${creditRefundNeeded ? ' (credit refunded)' : ''}`
          })
          .eq('id', payment.id)
        
        if (updatePaymentError) {
          console.warn('⚠️ Could not update payment status:', updatePaymentError)
        } else {
          logger.debug('✅ Payment marked as cancelled (free cancellation):', {
            paymentId: payment.id,
            reason: deletionReason
          })
        }
      } else if (chargePercentage > 0) {
        // ✅ Case 2: PAID CANCELLATION on UNPAID appointment (chargePercentage > 0, refundableAmount > 0)
        logger.debug('🔴 Paid cancellation on unpaid appointment - updating total_amount_rappen with charge fee')
        
        // Calculate the new charge amount (what customer now owes)
        const chargeAmountRappen = Math.round(refundableAmount * chargePercentage / 100)
        
        logger.debug('💰 Calculating new charge amount:', {
          originalTotal: (refundableAmount / 100).toFixed(2),
          chargePercentage,
          chargeAmount: (chargeAmountRappen / 100).toFixed(2)
        })
        
        // Update payment: set status to 'cancelled', update total_amount_rappen to the charge, and store charge info in metadata
        const { error: updatePaymentError } = await supabase
          .from('payments')
          .update({
            payment_status: 'cancelled', // ✅ KEY FIX: Set payment_status to 'cancelled'
            total_amount_rappen: chargeAmountRappen,
            lesson_price_rappen: Math.round(lessonPriceRappen * chargePercentage / 100),
            admin_fee_rappen: Math.round(adminFeeRappen * chargePercentage / 100),
            products_price_rappen: 0, // Products are cancelled
            discount_amount_rappen: 0, // Discounts are not applied to charges
            notes: `${payment.notes ? payment.notes + ' | ' : ''}Cancellation with ${chargePercentage}% charge: ${deletionReason}`,
            metadata: { // ✅ NEW: Store charge details in metadata
              ...payment.metadata, // Preserve existing metadata
              cancellation_charge_percentage: chargePercentage,
              cancellation_charge_amount_rappen: chargeAmountRappen,
              cancellation_reason: deletionReason
            }
          })
          .eq('id', payment.id)
        
        if (updatePaymentError) {
          console.warn('⚠️ Could not update payment with charge:', updatePaymentError)
          throw new Error(`Failed to update payment: ${updatePaymentError.message}`)
        } else {
          logger.debug('✅ Payment updated with cancellation charge:', {
            paymentId: payment.id,
            oldTotal: (payment.total_amount_rappen / 100).toFixed(2),
            newTotal: (chargeAmountRappen / 100).toFixed(2),
            chargePercentage
          })
        }
      }
      
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

// Mark appointment as cancelled in the database
async function markAppointmentCancelled(
  supabase: any,
  appointmentId: string,
  deletionReason: string,
  tenantId: string  // ✅ Add tenant_id parameter
) {
  try {
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        deleted_at: new Date().toISOString(),
        deletion_reason: deletionReason
      })
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)  // ✅ Use the passed tenantId
    
    if (updateError) {
      console.warn('⚠️ Could not mark appointment as cancelled:', updateError)
    } else {
      logger.debug('✅ Appointment marked as cancelled:', {
        appointmentId,
        deletionReason
      })
    }
  } catch (error: any) {
    console.warn('⚠️ Error marking appointment as cancelled:', error)
  }
}

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

    logger.debug('✅ Student credit balance updated:', {
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

    logger.debug('✅ Credit transaction created:', transaction.id)

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
      logger.debug('✅ Payment marked as refunded:', {
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
      logger.debug('✅ Appointment marked as credit_created')
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

