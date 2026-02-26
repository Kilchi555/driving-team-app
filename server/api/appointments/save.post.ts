import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'
import { createAvailabilitySlotManager } from '~/server/utils/availability-slot-manager'
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
    // ✅ OPTIMIZATION: Skip remote validation on create mode - basic validator is enough
    if (appointmentData.type && mode === 'edit') {
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
      const { data: oldAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('start_time, end_time, staff_id, tenant_id')
        .eq('id', eventId)
        .single()

      if (fetchError || !oldAppointment) {
        logger.error('❌ Error fetching old appointment for edit:', fetchError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Could not fetch appointment for editing'
        })
      }

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

      // ✅ NEW: Manage availability slots for edited appointment
      try {
        const slotManager = createAvailabilitySlotManager(supabase)
        
        // Check if time changed (use oldAppointment for comparison since result might not have all fields)
        const timeChanged = oldAppointment.start_time !== appointmentData.start_time || 
                           oldAppointment.end_time !== appointmentData.end_time
        
        if (timeChanged) {
          logger.debug('⏰ Appointment time changed - updating slots:', {
            oldTime: `${oldAppointment.start_time} - ${oldAppointment.end_time}`,
            newTime: `${appointmentData.start_time} - ${appointmentData.end_time}`
          })
          
          // Release slots from OLD time
          const releaseResult = await slotManager.releaseSlots(
            oldAppointment.staff_id,
            oldAppointment.start_time,
            oldAppointment.end_time,
            oldAppointment.tenant_id
          )
          if (releaseResult.success) {
            logger.debug(`✅ Released ${releaseResult.releasedCount} slots from old time`)
          }
          
          // Invalidate slots for NEW time
          const invalidateResult = await slotManager.invalidateSlots(
            oldAppointment.staff_id,
            appointmentData.start_time,
            appointmentData.end_time,
            oldAppointment.tenant_id
          )
          if (invalidateResult.success) {
            logger.debug(`✅ Invalidated ${invalidateResult.invalidatedCount} slots for new time`)
          }
        } else {
          logger.debug('ℹ️ Appointment time unchanged - no slot updates needed')
        }
      } catch (slotError: any) {
        logger.warn('⚠️ Failed to update slots during edit (non-critical):', slotError.message)
        // Non-critical: will be recalculated at next cron
      }

      // ✅ IMPORTANT: Queue recalculation to regenerate ALL slots for the day
      // This ensures:
      // 1. Old time slot is freed up and marked available
      // 2. New time slot is marked unavailable
      // 3. Any previously missing slots in freed time ranges are generated
      try {
        logger.debug('📋 Queuing availability recalculation after appointment edit...')
        await $fetch('/api/availability/queue-recalc', {
          method: 'POST',
          body: {
            staff_id: oldAppointment.staff_id,
            tenant_id: oldAppointment.tenant_id,
            trigger: 'appointment_edit'
          }
        })
        logger.debug('✅ Queued recalculation after appointment edit')
      } catch (queueError: any) {
        logger.warn('⚠️ Failed to queue recalculation (non-critical):', queueError.message)
      }
      
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
            
            finalTotalAmount = Math.max(0, Math.round(finalTotalAmount))
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
      
      // ============ ALL POST-CREATE OPERATIONS IN PARALLEL ============
      // Payment + Slot blocking + Queue recalc all run at the same time
      const isChargeableEventType = ['lesson', 'exam', 'theory'].includes(appointmentData.event_type_code || 'lesson')
      
      // Prepare payment data synchronously (no DB calls needed)
      let paymentPromise: Promise<void> | null = null
      if (isChargeableEventType) {
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
        
        finalTotalAmount = Math.max(0, Math.round(finalTotalAmount))
        const remainingAmountRappen = Math.max(0, finalTotalAmount - (creditUsedRappen || 0))
        
        const paymentData = {
          appointment_id: result.id,
          user_id: result.user_id,
          staff_id: appointmentData.staff_id,
          tenant_id: appointmentData.tenant_id,
          lesson_price_rappen: finalBasePrice,
          admin_fee_rappen: adminFeeRappen || 0,
          products_price_rappen: productsPriceRappen || 0,
          discount_amount_rappen: discountAmountRappen || 0,
          voucher_discount_rappen: 0,
          total_amount_rappen: remainingAmountRappen,
          payment_method: paymentMethodForPayment || 'wallee',
          payment_status: remainingAmountRappen === 0 ? 'completed' : 'pending',
          ...(remainingAmountRappen === 0 ? { paid_at: new Date().toISOString() } : {}),
          credit_used_rappen: creditUsedRappen || 0,
          ...(companyBillingAddressId ? { company_billing_address_id: companyBillingAddressId } : {}),
          description: appointmentData.title || `Fahrlektion ${appointmentData.type}`,
          metadata: { category: appointmentData.type || null },
          created_at: new Date().toISOString()
        }
        
        paymentPromise = (async () => {
          try {
            const { data: paymentResult, error: paymentError } = await supabase
              .from('payments')
              .insert(paymentData)
              .select()
              .single()
            
            if (paymentError) {
              logger.warn('⚠️ Failed to create payment:', paymentError)
            } else {
              logger.debug('✅ Payment created:', paymentResult.id)
              result.payment_id = paymentResult.id
            }
          } catch (paymentErr: any) {
            logger.warn('⚠️ Payment creation exception:', paymentErr.message)
          }
        })()
      }
      
      // Run ALL post-create operations in parallel
      await Promise.all([
        // 1. Create payment (critical - but non-blocking for response)
        paymentPromise,
        // 2. Mark overlapping availability slots
        (async () => {
          try {
            const appointmentEnd = new Date(result.end_time)
            const { data: overlappingSlots, error: overlapError } = await supabase
              .from('availability_slots')
              .select('id')
              .eq('tenant_id', result.tenant_id)
              .eq('staff_id', result.staff_id)
              .lt('start_time', appointmentEnd.toISOString())
              .gt('end_time', result.start_time)
            
            if (!overlapError && overlappingSlots && overlappingSlots.length > 0) {
              const slotIds = overlappingSlots.map(s => s.id)
              await supabase
                .from('availability_slots')
                .update({ is_available: false, updated_at: new Date().toISOString() })
                .in('id', slotIds)
              logger.debug(`✅ Marked ${slotIds.length} slots as unavailable`)
            }
          } catch (slotError: any) {
            logger.warn('⚠️ Slot update error (non-critical):', slotError.message)
          }
        })(),
        // 3. Queue availability recalculation (single call, not duplicated)
        (async () => {
          try {
            await $fetch('/api/availability/queue-recalc', {
              method: 'POST',
              body: {
                staff_id: result.staff_id,
                tenant_id: result.tenant_id,
                trigger: 'appointment_created'
              }
            })
            logger.debug('✅ Queued recalculation')
          } catch (queueError: any) {
            logger.warn('⚠️ Queue recalc error (non-critical):', queueError.message)
          }
        })()
      ].filter(Boolean))
    }

    // Fire-and-forget: email + queue recalc for edits (non-blocking)
    if (mode === 'create') {
      Promise.resolve().then(async () => {
        try {
          await $fetch('/api/reminders/send-appointment-confirmation', {
            method: 'POST',
            body: { appointmentId: result.id, userId: appointmentData.user_id, tenantId: appointmentData.tenant_id }
          })
        } catch (err: any) {
          logger.warn('⚠️ Confirmation email failed (async):', err.message)
        }
      })
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

