import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'
import {
  validateAppointmentData,
  validateUUID,
  sanitizeString,
  throwIfInvalid,
  throwValidationError
} from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      mode, 
      eventId, 
      appointmentData, 
      totalAmountRappenForPayment, 
      paymentMethodForPayment,
      creditUsedRappen = 0, // ✅ NEW: Credit used from frontend
      // ✅ NEW: Price breakdown components from frontend
      basePriceRappen = 0,
      adminFeeRappen = 0,
      productsPriceRappen = 0,
      discountAmountRappen = 0,
      // ✅ NEW: Company billing address ID for invoice payments
      companyBillingAddressId = null
    } = body

    // ✅ DEBUG: Log company billing address ID
    if (paymentMethodForPayment === 'invoice') {
      logger.debug('🏢 API received companyBillingAddressId:', companyBillingAddressId)
    }

    if (!appointmentData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Appointment data is required'
      })
    }

    if (mode === 'edit' && !eventId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Event ID is required for edit mode'
      })
    }

    // Validate event ID format
    if (eventId && !validateUUID(eventId)) {
      throwValidationError({ eventId: 'Ungültiges Event ID Format' })
    }

    // Validate appointment data (basic checks)
    const validation = validateAppointmentData(appointmentData)
    throwIfInvalid(validation)

    // Extra security: Validate category against database (if type/category is present)
    // This ensures that newly added or removed categories are properly handled
    // Falls back to basic validator if API is unavailable
    if (appointmentData.type) {
      try {
        const authHeader = getHeader(event, 'authorization')
        const token = authHeader?.replace('Bearer ', '')
        
        if (token) {
          logger.debug('🔍 Validating category against database:', appointmentData.type)
          
          const categoryValidationResult = await $fetch('/api/validate/category', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`
            },
            body: {
              categoryCode: appointmentData.type,
              tenantId: appointmentData.tenant_id
            }
          }) as any

          if (!categoryValidationResult?.valid) {
            logger.warn('❌ Category validation failed via API:', categoryValidationResult?.error)
            throwValidationError({ type: categoryValidationResult?.error || 'Fahrkategorie ungültig' })
          }

          logger.debug('✅ Category validated successfully against DB:', appointmentData.type)
        } else {
          logger.debug('ℹ️ No auth token provided, skipping database category validation')
        }
      } catch (categoryError: any) {
        logger.warn('⚠️ Category validation API call failed, using fallback validator:', categoryError.message)
        // Fall through - the basic validator will catch invalid categories using hardcoded list
      }
    }

    // Sanitize string fields to prevent XSS
    if (appointmentData.title) {
      appointmentData.title = sanitizeString(appointmentData.title, 255)
    }
    if (appointmentData.description) {
      appointmentData.description = sanitizeString(appointmentData.description, 1000)
    }
    if (appointmentData.custom_location_name) {
      appointmentData.custom_location_name = sanitizeString(appointmentData.custom_location_name, 255)
    }
    if (appointmentData.custom_location_address) {
      appointmentData.custom_location_address = sanitizeString(appointmentData.custom_location_address, 500)
    }

    // ✅ Validate location_id - reject temporary location IDs
    if (appointmentData.location_id) {
      if (typeof appointmentData.location_id === 'string' && appointmentData.location_id.startsWith('temp_')) {
        // Temporary location ID - set to null instead of saving invalid UUID
        logger.warn('⚠️ Temporary location ID detected, setting to null:', appointmentData.location_id)
        appointmentData.location_id = null
        
        // Store custom location info if available
        if (!appointmentData.custom_location_name && !appointmentData.custom_location_address) {
          logger.warn('⚠️ No custom location data available for temporary location')
        }
      } else if (!validateUUID(appointmentData.location_id)) {
        // Invalid UUID format
        throwValidationError({ location_id: 'Ungültiges Location ID Format' })
      }
    }

    const supabase = getSupabaseAdmin()

    logger.debug('📋 Saving appointment via API:', { mode, eventId, appointmentData })

    let result
    if (mode === 'edit' && eventId) {
      // Update existing appointment
      const { data, error: updateError } = await supabase
        .from('appointments')
        .update(appointmentData)
        .eq('id', eventId)
        .select()
        .single()

      if (updateError) {
        logger.error('❌ Error updating appointment:', updateError)
        throw createError({
          statusCode: 500,
          statusMessage: `Fehler beim Aktualisieren des Termins: ${updateError.message}`
        })
      }
      result = data
      logger.debug('✅ Appointment updated:', result.id)
      
      // ============ UPDATE PAYMENT FOR EDITED APPOINTMENT ============
      // ✅ If this is a lesson/exam/theory appointment, update the existing payment
      const isChargeableEventType = ['lesson', 'exam', 'theory'].includes(appointmentData.event_type_code || 'lesson')
      
      if (isChargeableEventType && (totalAmountRappenForPayment !== undefined || productsPriceRappen !== undefined || discountAmountRappen !== undefined)) {
        try {
          // Check if payment exists
          const { data: existingPayment } = await supabase
            .from('payments')
            .select('id, payment_status, total_amount_rappen')
            .eq('appointment_id', eventId)
            .maybeSingle()
          
          if (existingPayment) {
            // Calculate new amounts
            let finalTotalAmount = totalAmountRappenForPayment ?? 0
            let finalBasePrice = basePriceRappen || 0
            
            if (!finalBasePrice || finalBasePrice <= 0) {
              const durationMins = appointmentData.duration_minutes || 45
              const pricePerMin = 2.11
              finalBasePrice = Math.round(durationMins * pricePerMin * 100)
            }
            
            if (finalTotalAmount === undefined || finalTotalAmount === null) {
              finalTotalAmount = Math.max(0, finalBasePrice + (adminFeeRappen || 0) + (productsPriceRappen || 0) - (discountAmountRappen || 0))
            }
            
            finalTotalAmount = Math.max(0, finalTotalAmount)
            const remainingAmountRappen = Math.max(0, finalTotalAmount - (creditUsedRappen || 0))
            
            logger.debug('💳 Updating payment for edited appointment:', {
              paymentId: existingPayment.id,
              appointmentId: eventId,
              oldTotal: (existingPayment.total_amount_rappen / 100).toFixed(2),
              newTotal: (remainingAmountRappen / 100).toFixed(2),
              creditUsed: ((creditUsedRappen || 0) / 100).toFixed(2)
            })
            
            const paymentUpdateData: any = {
              lesson_price_rappen: finalBasePrice,
              admin_fee_rappen: adminFeeRappen || 0,
              products_price_rappen: productsPriceRappen || 0,
              discount_amount_rappen: discountAmountRappen || 0,
              voucher_discount_rappen: 0, // Will be set if discount is from voucher
              total_amount_rappen: remainingAmountRappen,
              credit_used_rappen: creditUsedRappen || 0,
              updated_at: new Date().toISOString()
            }
            
            // ✅ Update payment_status based on remaining amount
            // WICHTIG: NIEMALS 'completed' auf 'pending' zurücksetzen! 
            // Bereits bezahlte Termine bleiben bezahlt (Preis wird angepasst, aber nicht der Status)
            if (existingPayment.payment_status === 'pending') {
              // Nur bei 'pending' den Status basierend auf remainingAmount ändern
              paymentUpdateData.payment_status = remainingAmountRappen === 0 ? 'completed' : 'pending'
              
              // Set paid_at nur bei neuen completed payments
              if (remainingAmountRappen === 0) {
                paymentUpdateData.paid_at = new Date().toISOString()
              }
            } else if (existingPayment.payment_status === 'completed') {
              // Bei bereits bezahlten Payments: Status BEIBEHALTEN!
              // Der Preis wird angepasst, aber der Status bleibt 'completed'
              paymentUpdateData.payment_status = 'completed'
              logger.debug('✅ Preserving completed payment status')
            }
            
            const { error: updatePaymentError } = await supabase
              .from('payments')
              .update(paymentUpdateData)
              .eq('id', existingPayment.id)
            
            if (updatePaymentError) {
              logger.warn('⚠️ Failed to update payment (non-critical):', updatePaymentError)
            } else {
              logger.debug('✅ Payment updated for edited appointment')
            }
          } else {
            logger.debug('ℹ️ No existing payment found for edited appointment, skipping payment update')
          }
        } catch (paymentErr: any) {
          logger.warn('⚠️ Payment update exception (non-critical):', paymentErr.message)
        }
      }
    } else {
      // Create new appointment
      const { data, error: insertError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single()

      if (insertError) {
        logger.error('❌ Error creating appointment:', insertError)
        throw createError({
          statusCode: 500,
          statusMessage: `Fehler beim Erstellen des Termins: ${insertError.message}`
        })
      }
      result = data
      logger.debug('✅ Appointment created:', result.id)
      
      // ============ BLOCK OVERLAPPING AVAILABILITY SLOTS ============
      // Mark all overlapping slots as unavailable (is_available = false) when appointment is created
      // This ensures the public booking page doesn't show conflicting slots
      try {
        logger.debug('🔒 Marking overlapping availability slots as unavailable...')
        
        const appointmentEnd = new Date(result.end_time)
        
        // Find all overlapping slots for this staff member
        const { data: overlappingSlots, error: overlapError } = await supabase
          .from('availability_slots')
          .select('id')
          .eq('tenant_id', result.tenant_id)
          .eq('staff_id', result.staff_id)
          .lt('start_time', appointmentEnd.toISOString())
          .gt('end_time', result.start_time)
        
        if (!overlapError && overlappingSlots && overlappingSlots.length > 0) {
          const slotIds = overlappingSlots.map(s => s.id)
          logger.debug(`📌 Found ${slotIds.length} overlapping slots to mark as unavailable`)
          
          const { error: updateError } = await supabase
            .from('availability_slots')
            .update({
              is_available: false,
              updated_at: new Date().toISOString()
            })
            .in('id', slotIds)
          
          if (updateError) {
            logger.warn('⚠️ Failed to mark overlapping slots as unavailable:', updateError.message)
            // Non-critical: appointment is already created
          } else {
            logger.debug(`✅ Marked ${slotIds.length} slots as unavailable for this appointment`)
          }
        } else {
          logger.debug('ℹ️ No overlapping slots found to update')
        }
      } catch (slotError: any) {
        logger.warn('⚠️ Error updating availability slots (non-critical):', slotError.message)
        // Non-critical: appointment is already created successfully
      }
      
      // ============ CREATE PAYMENT FOR NEW APPOINTMENT ============
      // ✅ FIX: ALWAYS create payment for lesson/exam/theory appointments (even if amount is 0!)
      const isChargeableEventType = ['lesson', 'exam', 'theory'].includes(appointmentData.event_type_code || 'lesson')
      
      if (isChargeableEventType) {
        try {
          // ✅ Calculate amount from appointment if not provided or if it's explicitly 0 (after discounts)
          let finalTotalAmount = totalAmountRappenForPayment ?? 0
          let finalBasePrice = basePriceRappen || 0
          
          // Fallback calculation if base price not provided
          if (!finalBasePrice || finalBasePrice <= 0) {
            const durationMins = appointmentData.duration_minutes || 45
            const pricePerMin = 2.11 // Default CHF 2.11/min
            finalBasePrice = Math.round(durationMins * pricePerMin * 100)
          }
          
          // Recalculate total if not explicitly provided
          if (finalTotalAmount === undefined || finalTotalAmount === null) {
            finalTotalAmount = Math.max(0, finalBasePrice + (adminFeeRappen || 0) + (productsPriceRappen || 0) - (discountAmountRappen || 0))
          }
          
          // ✅ Ensure amount is never negative
          finalTotalAmount = Math.max(0, finalTotalAmount)
          
          logger.debug('💳 Creating payment for new appointment:', {
            appointmentId: result.id,
            userId: result.user_id,
            basePrice: (finalBasePrice / 100).toFixed(2),
            adminFee: ((adminFeeRappen || 0) / 100).toFixed(2),
            products: ((productsPriceRappen || 0) / 100).toFixed(2),
            discount: ((discountAmountRappen || 0) / 100).toFixed(2),
            totalAmount: (finalTotalAmount / 100).toFixed(2),
            creditUsed: ((creditUsedRappen || 0) / 100).toFixed(2)
          })
          
          // ✅ Calculate the remaining amount after credit is deducted
          const remainingAmountRappen = Math.max(0, finalTotalAmount - (creditUsedRappen || 0))
          
          const paymentData = {
            appointment_id: result.id,
            user_id: result.user_id,
            staff_id: appointmentData.staff_id,  // ✅ ADD: Store staff_id for payment tracking
            tenant_id: appointmentData.tenant_id,
            lesson_price_rappen: finalBasePrice,
            admin_fee_rappen: adminFeeRappen || 0,
            products_price_rappen: productsPriceRappen || 0,
            discount_amount_rappen: discountAmountRappen || 0,
            voucher_discount_rappen: 0, // Will be set if discount is from voucher
            // ✅ FIX: total_amount_rappen is the REMAINING amount after credit is deducted
            total_amount_rappen: remainingAmountRappen,
            payment_method: paymentMethodForPayment || 'wallee',
            // ✅ CRITICAL FIX: Check REMAINING amount (after credit), not finalTotalAmount!
            payment_status: remainingAmountRappen === 0 ? 'completed' : 'pending',
            // ✅ FIX: Set paid_at ONLY if remaining amount is 0 (nothing left to pay)
            ...(remainingAmountRappen === 0 ? { paid_at: new Date().toISOString() } : {}),
            // ✅ NEW: Store credit used in payment record
            credit_used_rappen: creditUsedRappen || 0,
            // ✅ NEW: Company billing address ID for invoice payments
            ...(companyBillingAddressId ? { company_billing_address_id: companyBillingAddressId } : {}),
            description: appointmentData.title || `Fahrlektion ${appointmentData.type}`,
            created_at: new Date().toISOString()
          }
          
          const { data: paymentResult, error: paymentError } = await supabase
            .from('payments')
            .insert(paymentData)
            .select()
            .single()
          
          if (paymentError) {
            logger.warn('⚠️ Failed to create payment (non-critical):', paymentError)
            // Don't throw - appointment creation succeeded, payment creation is secondary
          } else {
            logger.debug('✅ Payment created for appointment:', paymentResult.id)
            result.payment_id = paymentResult.id
          }
        } catch (paymentErr: any) {
          logger.warn('⚠️ Payment creation exception (non-critical):', paymentErr.message)
          // Don't throw - appointment is already created
        }
      }
    }

    // ✅ OPTIMIZATION: Send appointment confirmation email asynchronously (non-blocking)
    if (mode === 'create') {
      // Fire and forget - don't await, don't block the response
      Promise.resolve().then(async () => {
        try {
          logger.debug('📧 Sending appointment confirmation email (async)...')
          const confirmationResponse = await $fetch('/api/reminders/send-appointment-confirmation', {
            method: 'POST',
            body: {
              appointmentId: result.id,
              userId: appointmentData.user_id,
              tenantId: appointmentData.tenant_id
            }
          })
          logger.debug('✅ Appointment confirmation email sent:', confirmationResponse)
        } catch (confirmationErr: any) {
          logger.warn('⚠️ Failed to send appointment confirmation email (non-critical, async):', confirmationErr.message)
        }
      }).catch((err: any) => {
        logger.warn('⚠️ Error in async email sending:', err.message)
      })
    }

    // ✅ NEW: Queue staff for availability recalculation
    // If appointment was created or staff_id changed, queue for recalc
    if (result && result.staff_id && appointmentData.tenant_id) {
      try {
        logger.debug(`📋 Queueing staff ${result.staff_id} for availability recalc after appointment ${mode}`)
        
        await supabase
          .from('availability_recalc_queue')
          .upsert(
            {
              staff_id: result.staff_id,
              tenant_id: appointmentData.tenant_id,
              trigger: 'appointment',
              queued_at: new Date().toISOString(),
              processed: false
            },
            { onConflict: 'staff_id,tenant_id' }
          )
        
        logger.debug(`✅ Staff queued for recalculation after appointment ${mode}`)
      } catch (queueError: any) {
        logger.warn(`⚠️ Failed to queue staff for recalc (non-critical):`, queueError.message)
        // Non-critical: availability will be recalculated at next cron
      }
    }

    return {
      success: true,
      data: result
    }
  } catch (error: any) {
    logger.error('❌ Appointment save error:', error)
    throw error
  }
})

