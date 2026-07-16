// server/api/appointments/handle-cancellation.post.ts
// INTERNAL ONLY: Handles appointment cancellation with automatic refund processing
// ⚠️ SECURITY: Protected by X-Internal-Secret header — never call from client-side code.
// Callers (cancel-staff.post.ts) must verify auth + authorization + tenant first.

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { logAudit } from '~/server/utils/audit'
import { createAvailabilitySlotManager } from '~/server/utils/availability-slot-manager'
import { uploadConversionAdjustment } from '~/server/utils/google-ads-conversion'
import { sendCapiRefundEvent, sha256Hex } from '~/server/utils/meta-capi'
import { processWalleeRefund } from '~/server/utils/wallee-refund'
import { mapSupabaseError } from '~/server/utils/supabase-error'
import { cancelResourceBookingsForAppointment } from '~/server/utils/resource-bookings'

export default defineEventHandler(async (event) => {
  // ── INTERNAL-ONLY GUARD ────────────────────────────────────────────────
  // This route must never be called directly from a browser or external client.
  // Only server-side $fetch calls (cancel-staff, cancel-customer) may reach it,
  // and they must supply the pre-shared secret set in NUXT_INTERNAL_CANCELLATION_SECRET.
  // Guard is intentionally OUTSIDE the try/catch so a 403 propagates as HTTP 403,
  // not silently as { success: false }.
  const config = useRuntimeConfig()
  const expectedSecret = (config.internalCancellationSecret as string | undefined)?.trim()
  const providedSecret = getHeader(event, 'x-internal-secret')?.trim()

  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  // ─────────────────────────────────────────────────────────────────────────

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
      cancelledBy, // ✅ NEW: 'customer' or 'staff'
      refundDestination // ✅ NEW: 'wallet' (default) | 'wallee' — where to send the refund
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
      .select('user_id, duration_minutes, type, tenant_id, status, staff_id, start_time, end_time, fbc, fbp')
      .eq('id', appointmentId)
      .single()

    if (aptError) throw new Error(`Appointment not found: ${aptError.message}`)

    await markAppointmentCancelled(supabase, appointmentId, {
      deletionReason,
      tenantId: appointment.tenant_id,
      cancellationReasonId,
      cancellationType: cancelledBy === 'staff' ? 'staff' : 'student',
      chargePercentage: chargePercentage || 0,
      shouldCreditHours: shouldCreditHours || false
    })

    // ====== GOOGLE ADS CONVERSION ADJUSTMENT (fire-and-forget) ======
    // If this booking was previously uploaded to Google Ads as a conversion AND
    // the cancellation reduces or removes revenue, send a conversion adjustment
    // so Smart Bidding learns from actual outcomes only.
    //   chargePercentage === 0   → RETRACT (full cancellation, no revenue)
    //   0 < chargePercentage < 100 → RESTATEMENT to the kept portion
    //   chargePercentage === 100  → no adjustment (we keep all revenue)
    if ((chargePercentage ?? 0) < 100) {
      ;(async () => {
        try {
          const { data: prevUpload } = await supabase
            .from('google_ads_conversion_uploads')
            .select('id, conversion_date_time, conversion_value_chf, upload_status')
            .eq('appointment_id', appointmentId)
            .eq('upload_status', 'success')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!prevUpload) {
            // Nothing was uploaded — no adjustment needed.
            return
          }

          const originalValue = Number(prevUpload.conversion_value_chf ?? 0)
          const adjustmentType: 'RETRACT' | 'RESTATEMENT' =
            (chargePercentage ?? 0) === 0 ? 'RETRACT' : 'RESTATEMENT'

          const result = await uploadConversionAdjustment({
            appointment_id: appointmentId,
            original_conversion_date_time: prevUpload.conversion_date_time,
            adjustment_type: adjustmentType,
            adjustment_date_time: new Date(),
            new_conversion_value_chf:
              adjustmentType === 'RESTATEMENT'
                ? Number((originalValue * (chargePercentage ?? 0) / 100).toFixed(2))
                : undefined,
          })

          if (result.uploaded) {
            await supabase
              .from('google_ads_conversion_uploads')
              .update({
                upload_status: 'adjusted_retracted',
                error_message: `Adjustment: ${adjustmentType} via cancellation (${chargePercentage}% charge)`,
              })
              .eq('id', prevUpload.id)
            logger.info(`google-ads-conversion: ${adjustmentType} sent for appointment ${appointmentId}`)
          } else {
            logger.warn(`google-ads-conversion: ${adjustmentType} failed for appointment ${appointmentId} — ${result.reason}`)
          }
        } catch (err: any) {
          logger.warn('⚠️ Google Ads adjustment failed (non-critical):', err?.message ?? err)
        }
      })()
    }

    // ====== META CAPI REFUND EVENT (fire-and-forget) ======
    // Sends a RefundOrder event to Meta so the algorithm learns from actual
    // revenue — especially useful when chargePercentage = 0 (full refund).
    // Only fires if there was a previous successful CAPI upload for this appointment.
    if ((chargePercentage ?? 0) < 100) {
      ;(async () => {
        try {
          const { data: prevCapi } = await supabase
            .from('meta_capi_uploads')
            .select('id, conversion_value_chf')
            .eq('appointment_id', appointmentId)
            .eq('event_name', 'Purchase')
            .eq('upload_status', 'success')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!prevCapi) return

          // Fetch user email/phone for better CAPI matching
          const { data: user } = await supabase
            .from('users')
            .select('email, phone')
            .eq('id', appointment.user_id)
            .maybeSingle()

          const normalizedEmail = (user?.email ?? '').trim().toLowerCase()
          const normalizedPhone = (user?.phone ?? '').replace(/\s+/g, '').replace(/^00/, '+')
          const hashedEmail = normalizedEmail ? await sha256Hex(normalizedEmail) : null
          const hashedPhone = normalizedPhone.startsWith('+') ? await sha256Hex(normalizedPhone) : null

          const originalValue = Number(prevCapi.conversion_value_chf ?? 0)
          const refundValue = (chargePercentage ?? 0) === 0
            ? originalValue
            : Number((originalValue * (1 - (chargePercentage ?? 0) / 100)).toFixed(2))

          await sendCapiRefundEvent({
            appointment_id: appointmentId,
            tenant_id: appointment.tenant_id,
            fbc: appointment.fbc ?? null,
            fbp: appointment.fbp ?? null,
            hashed_email: hashedEmail,
            hashed_phone: hashedPhone,
            refund_value_chf: refundValue,
          })
        } catch (err: any) {
          logger.warn('⚠️ Meta CAPI RefundOrder failed (non-critical):', err?.message ?? err)
        }
      })()
    }

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
          trigger: 'appointment'
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
    
    // Discount amount must always be subtracted: lesson_price_rappen and admin_fee_rappen
    // are gross prices (before discount), so crediting them without subtracting the discount
    // would give the student more back than they actually paid.
    const discountAmount = payment?.discount_amount_rappen || 0

    if (shouldCreditHours && chargePercentage === 0) {
      // Staff cancellation (no charge) - refund original prices + refundable products + voucher discount
      const originalLesson = originalLessonPrice || (lessonPriceRappen || 0)
      const originalAdmin = originalAdminFee || (adminFeeRappen || 0)
      refundableAmount = originalLesson + originalAdmin + refundableProductsAmount + voucherDiscountAmount - discountAmount
      logger.debug('💚 Staff cancellation - refunding full original prices + refundable products + voucher discount - discounts:', {
        originalLesson: (originalLesson / 100).toFixed(2),
        originalAdmin: (originalAdmin / 100).toFixed(2),
        refundableProducts: (refundableProductsAmount / 100).toFixed(2),
        voucherDiscount: (voucherDiscountAmount / 100).toFixed(2),
        discount: (discountAmount / 100).toFixed(2),
        total: (refundableAmount / 100).toFixed(2)
      })
    } else {
      // Regular cancellation - use the passed amounts + refundable products + voucher discount
      refundableAmount = (lessonPriceRappen || 0) + (adminFeeRappen || 0) + refundableProductsAmount + voucherDiscountAmount - discountAmount
      logger.debug('💰 Regular cancellation refund calculation:', {
        lessonPrice: ((lessonPriceRappen || 0) / 100).toFixed(2),
        adminFee: ((adminFeeRappen || 0) / 100).toFixed(2),
        refundableProducts: (refundableProductsAmount / 100).toFixed(2),
        voucherDiscount: (voucherDiscountAmount / 100).toFixed(2),
        discount: (discountAmount / 100).toFixed(2),
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
      logger.debug('✅ Payment was completed - evaluating refund based on chargePercentage:', chargePercentage)

      // chargePercentage = 100 → we keep the money, no refund
      if (chargePercentage === 100) {
        logger.debug('💰 100% charge - retaining payment, no refund')
        const { error: updatePaymentError } = await supabase
          .from('payments')
          .update({
            notes: `${payment.notes ? payment.notes + ' | ' : ''}Storniert mit 100% Verrechnung: ${deletionReason}`
          })
          .eq('id', payment.id)

        if (updatePaymentError) {
          console.warn('⚠️ Could not update payment notes:', updatePaymentError)
        }

        return {
          success: true,
          message: 'Appointment cancelled - payment retained (100% charge)',
          action: 'cancelled_payment_retained'
        }
      }

      // chargePercentage = 0 → full refund
      // chargePercentage between 0–100 → partial refund (customer gets back the non-charged portion)
      const actualRefundAmount = chargePercentage === 0
        ? refundableAmount
        : Math.round(refundableAmount * (1 - chargePercentage / 100))

      logger.debug('💸 Refund amount calculated:', {
        refundableAmount: (refundableAmount / 100).toFixed(2),
        chargePercentage,
        actualRefundAmount: (actualRefundAmount / 100).toFixed(2)
      })

      if (actualRefundAmount > 0) {
        const refundResult = await processRefund(
          supabase,
          appointmentId,
          appointment.user_id,
          payment,
          actualRefundAmount,
          deletionReason,
          appointment.tenant_id,
          refundDestination || 'wallet'
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
            .eq('tenant_id', appointment.tenant_id)
            .maybeSingle()
          
          if (creditError) {
            logger.error('❌ Could not load student_credits for refund:', creditError)
          } else if (studentCredit) {
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
              logger.error('❌ Could not refund credit to student balance:', updateCreditError)
            } else {
              logger.debug('✅ Credit refunded to student balance:', {
                oldBalance: (oldBalance / 100).toFixed(2),
                refund: (payment.credit_used_rappen / 100).toFixed(2),
                newBalance: (newBalance / 100).toFixed(2)
              })

              await supabase.from('credit_transactions').insert([{
                user_id: appointment.user_id,
                tenant_id: appointment.tenant_id,
                transaction_type: 'cancellation_credit_refund',
                amount_rappen: payment.credit_used_rappen,
                balance_before_rappen: oldBalance,
                balance_after_rappen: newBalance,
                payment_method: 'credit_refund',
                reference_id: payment.id,
                reference_type: 'payment',
                notes: `Guthaben-Rückerstattung bei kostenloser Stornierung (CHF ${(payment.credit_used_rappen / 100).toFixed(2)})`
              }])
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
          logger.error('❌ Could not update payment status:', updatePaymentError)
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
      
      // ✅ Case 1: FREE CANCELLATION (chargePercentage === 0)
      if (chargePercentage === 0) {
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
            .eq('tenant_id', appointment.tenant_id)
            .maybeSingle()
          
          if (creditError) {
            logger.error('❌ Could not load student_credits for refund:', creditError)
          } else if (studentCredit) {
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
              logger.error('❌ Could not refund credit to student balance:', updateCreditError)
            } else {
              logger.debug('✅ Credit refunded to student balance:', {
                oldBalance: (oldBalance / 100).toFixed(2),
                refund: (payment.credit_used_rappen / 100).toFixed(2),
                newBalance: (newBalance / 100).toFixed(2)
              })

              await supabase.from('credit_transactions').insert([{
                user_id: appointment.user_id,
                tenant_id: appointment.tenant_id,
                transaction_type: 'cancellation_credit_refund',
                amount_rappen: payment.credit_used_rappen,
                balance_before_rappen: oldBalance,
                balance_after_rappen: newBalance,
                payment_method: 'credit_refund',
                reference_id: payment.id,
                reference_type: 'payment',
                notes: `Guthaben-Rückerstattung bei kostenloser Stornierung (CHF ${(payment.credit_used_rappen / 100).toFixed(2)})`
              }])
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
          logger.error('❌ Could not update payment status:', updatePaymentError)
        } else {
          logger.debug('✅ Payment marked as cancelled (free cancellation):', {
            paymentId: payment.id,
            reason: deletionReason
          })
        }
      } else if (chargePercentage > 0) {
        // Case 2: PAID CANCELLATION on UNPAID appointment
        // Payment stays pending (still needs to be collected), only add cancellation metadata
        const chargeAmountRappen = Math.round(refundableAmount * chargePercentage / 100)
        
        logger.debug('🔴 Paid cancellation on unpaid appointment - payment stays pending:', {
          chargePercentage,
          chargeAmount: (chargeAmountRappen / 100).toFixed(2)
        })
        
        const { error: updatePaymentError } = await supabase
          .from('payments')
          .update({
            notes: `${payment.notes ? payment.notes + ' | ' : ''}Cancellation with ${chargePercentage}% charge: ${deletionReason}`,
            metadata: {
              ...payment.metadata,
              cancellation_charge_percentage: chargePercentage,
              cancellation_charge_amount_rappen: chargeAmountRappen,
              cancellation_reason: deletionReason
            }
          })
          .eq('id', payment.id)
        
        if (updatePaymentError) {
          console.warn('⚠️ Could not update payment metadata:', updatePaymentError)
        } else {
          logger.debug('✅ Payment metadata updated with cancellation charge:', {
            paymentId: payment.id,
            paymentStatus: payment.payment_status,
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

async function markAppointmentCancelled(
  supabase: any,
  appointmentId: string,
  opts: {
    deletionReason: string
    tenantId: string
    cancellationReasonId?: string
    cancellationType?: string
    chargePercentage?: number
    shouldCreditHours?: boolean
  }
) {
  try {
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        deleted_at: new Date().toISOString(),
        deletion_reason: opts.deletionReason,
        cancellation_reason_id: opts.cancellationReasonId || null,
        cancellation_type: opts.cancellationType || null,
        cancellation_charge_percentage: opts.chargePercentage ?? 0,
        cancellation_credit_hours: opts.shouldCreditHours ?? false
      })
      .eq('id', appointmentId)
      .eq('tenant_id', opts.tenantId)
    
    if (updateError) {
      console.warn('⚠️ Could not mark appointment as cancelled:', updateError)
    } else {
      logger.debug('✅ Appointment marked as cancelled:', {
        appointmentId,
        chargePercentage: opts.chargePercentage,
        cancellationType: opts.cancellationType
      })
    }
  } catch (error: any) {
    console.warn('⚠️ Error marking appointment as cancelled:', error)
  }

  // ✅ Fahrzeug- und Raumreservationen für diesen Termin ebenfalls freigeben,
  // damit die Ressource für andere Termine im selben Zeitfenster wieder
  // verfügbar ist (Verfügbarkeitsprüfungen filtern auf status != 'cancelled').
  await cancelResourceBookingsForAppointment(supabase, appointmentId, opts.tenantId)
}

// Process refund to student credit OR back via Wallee
async function processRefund(
  supabase: any,
  appointmentId: string,
  userId: string,
  payment: any,
  refundAmountRappen: number,
  deletionReason: string,
  tenantId?: string,
  refundDestination: 'wallet' | 'wallee' = 'wallet'
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

    // ── Wallee refund branch ───────────────────────────────────────────────
    if (refundDestination === 'wallee') {
      logger.debug('💳 [processRefund] Refunding via Wallee (customer chose direct refund)')

      const walleeResult = await processWalleeRefund({
        payment: {
          id: payment.id,
          wallee_transaction_id: payment.wallee_transaction_id,
          total_amount_rappen: payment.total_amount_rappen,
          credit_used_rappen: payment.credit_used_rappen || 0,
          payment_status: payment.payment_status,
          tenant_id: tenantId || payment.tenant_id,
        },
        requestedAmountRappen: refundAmountRappen,
        tenantId: tenantId || payment.tenant_id,
        idempotencyKey: `appointment-cancel-${appointmentId}`,
        reason: deletionReason,
      })

      if (!walleeResult.success) {
        // Wallee refund failed — fall back to wallet credit so customer is not left empty-handed
        logger.warn('⚠️ [processRefund] Wallee refund failed, falling back to wallet credit:', walleeResult.error)
        // Fall through to wallet credit logic below
      } else {
        // Wallee refund succeeded — update payment, create credit transaction record for audit
        const refundedAt = new Date().toISOString()

        await supabase
          .from('payments')
          .update({
            payment_status: 'refunded',
            refunded_at: refundedAt,
            wallee_refund_id: walleeResult.refundId || null,
            notes: `${payment.notes ? payment.notes + ' | ' : ''}Wallee-Rückerstattung: ${deletionReason} (CHF ${walleeResult.refundedAmountChf.toFixed(2)}, refundId: ${walleeResult.refundId})`,
          })
          .eq('id', payment.id)

        await supabase
          .from('appointments')
          .update({ credit_created: true })
          .eq('id', appointmentId)

        // Create audit record (no balance change, just a record)
        await supabase.from('credit_transactions').insert([{
          user_id: userId,
          tenant_id: tenantId || payment.tenant_id || null,
          transaction_type: 'cancellation',
          amount_rappen: walleeResult.refundedAmountRappen,
          balance_before_rappen: null,
          balance_after_rappen: null,
          payment_method: 'wallee_refund',
          reference_id: appointmentId,
          reference_type: 'appointment',
          created_by: currentUserId,
          notes: `Wallee-Rückerstattung bei Terminabsage: ${deletionReason} (CHF ${walleeResult.refundedAmountChf.toFixed(2)}, refundId: ${walleeResult.refundId})`,
        }])

        return {
          success: true,
          message: `Termin abgesagt – CHF ${walleeResult.refundedAmountChf.toFixed(2)} werden auf Ihr Zahlungsmittel zurückerstattet (3–5 Werktage).`,
          refundAmount: walleeResult.refundedAmountChf,
          action: 'wallee_refund_processed',
          refundId: walleeResult.refundId,
          refundDestination: 'wallee',
          details: {
            refundAmountChf: walleeResult.refundedAmountChf.toFixed(2),
            deletionReason,
          },
        }
      }
    }

    // ── Wallet credit branch (default) ─────────────────────────────────────
    // Load current student credit balance
    const resolvedTenantId = tenantId || payment.tenant_id
    let { data: studentCredit, error: creditError } = await supabase
      .from('student_credits')
      .select('id, balance_rappen')
      .eq('user_id', userId)
      .eq('tenant_id', resolvedTenantId)
      .maybeSingle()

    if (creditError) throw new Error(`Failed to load student credit: ${creditError.message}`)

    if (!studentCredit) {
      const { data: newCredit, error: createErr } = await supabase
        .from('student_credits')
        .insert([{ user_id: userId, balance_rappen: 0, tenant_id: resolvedTenantId }])
        .select('id, balance_rappen')
        .single()
      if (createErr) throw new Error(`Failed to create student credit: ${createErr.message}`)
      studentCredit = newCredit
    }

    if (!studentCredit) throw new Error('Could not find or create student_credits record')

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
        tenant_id: tenantId || payment.tenant_id || null,
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
      message: 'Termin abgesagt – Rückerstattung wurde Ihrem Guthaben gutgeschrieben.',
      refundAmount: (refundAmountRappen / 100),
      action: 'refund_processed',
      refundDestination: 'wallet',
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
    throw mapSupabaseError(error)
  }
}

