import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getHeader } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { createAvailabilitySlotManager } from '~/server/utils/availability-slot-manager'
import {
  validateAppointmentData,
  validateUUID,
  sanitizeString,
  throwIfInvalid,
  throwValidationError
} from '~/server/utils/validators'
import { mapSupabaseError } from '~/server/utils/supabase-error'
import { getFallbackRule } from '~/utils/fallbackPricingRules'
import { logFallbackUsed } from '~/server/utils/log-fallback'
import { recordAndSendCapiEvent, sha256Hex } from '~/server/utils/meta-capi'

export default defineEventHandler(async (event) => {
  try {
    // ============ AUTHENTICATION & AUTHORIZATION ============
    // Only staff, admin, and super_admin may create or edit appointments.
    const callerProfile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'superadmin'])

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
      companyBillingAddressId = null,
      // ✅ NEW: Cash already paid flag (staff marks as paid on create)
      cashAlreadyPaid = false
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

    // ============ PRICE SANITY CHECKS ============
    // Prevent rogue staff from submitting obviously manipulated price values.
    // Full server-side price recalculation would require a pricing-table lookup
    // (done separately); these guards catch the most blatant manipulation attempts.
    if (typeof totalAmountRappenForPayment === 'number' && totalAmountRappenForPayment < 0) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid price: total amount cannot be negative' })
    }
    if (typeof discountAmountRappen === 'number' && discountAmountRappen < 0) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid price: discount cannot be negative' })
    }
    if (typeof creditUsedRappen === 'number' && creditUsedRappen < 0) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid price: credit used cannot be negative' })
    }
    // Guard: discount cannot exceed the total before discount
    if (
      typeof discountAmountRappen === 'number' &&
      typeof basePriceRappen === 'number' &&
      basePriceRappen > 0 &&
      discountAmountRappen > basePriceRappen + (adminFeeRappen || 0) + (productsPriceRappen || 0)
    ) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid price: discount exceeds total price' })
    }

    // ============ TENANT ISOLATION ============
    // Ensure the appointment belongs to the caller's own tenant.
    // super_admin is exempt (can act cross-tenant for support tasks).
    if (!['super_admin', 'superadmin'].includes(callerProfile.role)) {
      const appointmentTenantId = appointmentData.tenant_id
      if (appointmentTenantId && appointmentTenantId !== callerProfile.tenant_id) {
        logger.warn('⚠️ [save] Tenant mismatch — caller tried to write to foreign tenant', {
          callerTenant: callerProfile.tenant_id,
          appointmentTenant: appointmentTenantId
        })
        throw createError({ statusCode: 403, statusMessage: 'Access denied: tenant mismatch' })
      }
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
    if (appointmentData.location_id === '') {
      // ✅ NEW: Empty string → set to null (allows custom locations)
      logger.debug('📍 Empty location_id detected, setting to null for custom location')
      appointmentData.location_id = null
    } else if (appointmentData.location_id) {
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
    // Declared here so it's accessible both inside the create branch and after the if/else block
    let paymentPromise: Promise<void> | null = null
    let capiPromise: Promise<void> | null = null

    if (mode === 'edit' && eventId) {
      // Update existing appointment
      const { data: oldAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('start_time, end_time, staff_id, tenant_id, duration_minutes')
        .eq('id', eventId)
        .single()

      if (fetchError || !oldAppointment) {
        logger.error('❌ Error fetching old appointment for edit:', fetchError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Could not fetch appointment for editing'
        })
      }

      // ✅ Was the duration increased on an appointment that already had money collected against
      // it? Used further below (payment-update block) to correctly create an outstanding balance
      // ("partial" payment) for the extra time instead of silently inflating a `completed` payment.
      const isDurationIncrease =
        typeof appointmentData.duration_minutes === 'number' &&
        typeof oldAppointment.duration_minutes === 'number' &&
        appointmentData.duration_minutes > oldAppointment.duration_minutes

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
            .select('id, payment_status, total_amount_rappen, amount_paid_rappen, metadata')
            .eq('appointment_id', eventId)
            .maybeSingle()
          
          if (existingPayment) {
            // Calculate new amounts
            let finalTotalAmount = totalAmountRappenForPayment ?? 0
            let finalBasePrice = basePriceRappen || 0
            
            if (!finalBasePrice || finalBasePrice <= 0) {
              const durationMins = appointmentData.duration_minutes || 45
              const fallbackRule = getFallbackRule(appointmentData.type || 'B')
              const pricePerMin = fallbackRule?.price_per_minute_chf || (95 / 45)
              finalBasePrice = Math.round(durationMins * pricePerMin * 100)
              logFallbackUsed({
                source: 'pricing',
                message: `Kein Preis vom Client übermittelt beim Bearbeiten von Termin ${eventId} – Fallback-Preis für Kategorie "${appointmentData.type}" verwendet.`,
                tenantId: callerProfile.tenant_id,
                details: { category_code: appointmentData.type, appointmentId: eventId }
              })
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
              voucher_discount_rappen: 0,
              total_amount_rappen: finalTotalAmount,
              payment_method: (creditUsedRappen && creditUsedRappen >= finalTotalAmount) ? 'credit' : undefined,
              credit_used_rappen: creditUsedRappen || 0,
              // Keep payment user_id/staff_id in sync with the appointment
              ...(appointmentData.user_id ? { user_id: appointmentData.user_id } : {}),
              ...(appointmentData.staff_id ? { staff_id: appointmentData.staff_id } : {}),
              updated_at: new Date().toISOString()
            }
            
            // ✅ Was money already collected against the OLD (shorter) duration, and is the
            // duration now being increased? Then the extra time is a genuinely NEW charge - we
            // must NOT silently bump total_amount_rappen while keeping payment_status='completed'
            // (that would falsely claim the extra time was paid for). Instead: keep track of what
            // was actually collected via amount_paid_rappen and mark the remainder as 'partial'
            // (same mechanism already used elsewhere in the app for partial/outstanding payments),
            // so it shows up as an open balance for staff to collect (e.g. EnhancedStudentModal,
            // invoices) rather than disappearing into a silently-inflated "completed" payment.
            const wasAlreadyPaidOrPartial = ['completed', 'authorized', 'partial'].includes(existingPayment.payment_status)
            
            if (isDurationIncrease && wasAlreadyPaidOrPartial) {
              // ⚠️ Konvention im ganzen Codebase (siehe EnhancedStudentModal.vue, process-bulk-payment.post.ts):
              // amount_paid_rappen = tatsächlich via Bar/Online eingezogener Betrag, EXKLUSIVE Guthaben.
              // credit_used_rappen wird separat geführt und vom Bruttototal abgezogen, um den
              // "netto geschuldeten" Betrag zu erhalten. total_amount_rappen ist immer brutto (vor Guthaben).
              const creditUsedForThisPayment = creditUsedRappen || 0
              const previousNetDueRappen = Math.max(0, (existingPayment.total_amount_rappen || 0) - creditUsedForThisPayment)

              const previouslyPaidRappen = (typeof existingPayment.amount_paid_rappen === 'number' && existingPayment.amount_paid_rappen > 0)
                ? existingPayment.amount_paid_rappen
                : previousNetDueRappen // 'completed'/'authorized' ohne amount_paid_rappen-Tracking → altes Netto-Total galt als vollständig eingezogen

              const newNetDueRappen = Math.max(0, finalTotalAmount - creditUsedForThisPayment)
              const outstandingRappen = Math.max(0, newNetDueRappen - previouslyPaidRappen)

              paymentUpdateData.amount_paid_rappen = Math.min(previouslyPaidRappen, newNetDueRappen)
              paymentUpdateData.payment_status = outstandingRappen === 0 ? 'completed' : 'partial'
              paymentUpdateData.metadata = {
                ...(existingPayment.metadata || {}),
                duration_extension: {
                  old_duration_minutes: oldAppointment.duration_minutes,
                  new_duration_minutes: appointmentData.duration_minutes,
                  previous_total_rappen: existingPayment.total_amount_rappen,
                  previously_collected_rappen: previouslyPaidRappen,
                  outstanding_rappen: outstandingRappen,
                  extended_at: new Date().toISOString(),
                  extended_by: callerProfile.id
                }
              }
              
              logger.warn('💳 Duration increased on already-paid appointment - marking remainder as outstanding (partial) instead of silently inflating a completed payment', {
                appointmentId: eventId,
                oldDuration: oldAppointment.duration_minutes,
                newDuration: appointmentData.duration_minutes,
                previouslyPaidRappen,
                newTotalRappen: finalTotalAmount,
                outstandingRappen
              })
            } else if (existingPayment.payment_status === 'pending') {
              // Nur bei 'pending' den Status basierend auf remainingAmount ändern
              paymentUpdateData.payment_status = remainingAmountRappen === 0 ? 'completed' : 'pending'
              
              // Set paid_at nur bei neuen completed payments
              if (remainingAmountRappen === 0) {
                paymentUpdateData.paid_at = new Date().toISOString()
              }
            } else if (existingPayment.payment_status === 'completed') {
              // Bei bereits bezahlten Payments (Dauer unverändert oder verkürzt): Status BEIBEHALTEN!
              // Der Preis wird angepasst, aber der Status bleibt 'completed'
              paymentUpdateData.payment_status = 'completed'
              logger.debug('✅ Preserving completed payment status')
            } else if (existingPayment.payment_status === 'partial') {
              // Dauer unverändert/verkürzt bei einer bereits als 'partial' markierten Zahlung:
              // amount_paid_rappen bleibt wie es war, Status wird anhand des neuen Netto-Totals
              // (Brutto minus Guthaben) neu bestimmt - amount_paid_rappen ist exklusive Guthaben.
              const collectedSoFarRappen = existingPayment.amount_paid_rappen || 0
              const netDueRappen = finalTotalAmount - (creditUsedRappen || 0)
              paymentUpdateData.payment_status = (netDueRappen - collectedSoFarRappen) <= 0 ? 'completed' : 'partial'
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
      // Create new appointment — always force confirmed status
      if (!appointmentData.status || ['scheduled', 'pending_confirmation', 'booked'].includes(appointmentData.status)) {
        appointmentData.status = 'confirmed'
      }
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
      if (isChargeableEventType) {
        let finalTotalAmount = totalAmountRappenForPayment ?? 0
        let finalBasePrice = basePriceRappen || 0
        
        if (!finalBasePrice || finalBasePrice <= 0) {
          const durationMins = appointmentData.duration_minutes || 45
          const fallbackRule = getFallbackRule(appointmentData.type || 'B')
          const pricePerMin = fallbackRule?.price_per_minute_chf || (95 / 45)
          finalBasePrice = Math.round(durationMins * pricePerMin * 100)
          logFallbackUsed({
            source: 'pricing',
            message: `Kein Preis vom Client übermittelt beim Erstellen eines Termins – Fallback-Preis für Kategorie "${appointmentData.type}" verwendet.`,
            tenantId: callerProfile.tenant_id,
            details: { category_code: appointmentData.type }
          })
        }
        
        if (finalTotalAmount === undefined || finalTotalAmount === null) {
          finalTotalAmount = Math.max(0, finalBasePrice + (adminFeeRappen || 0) + (productsPriceRappen || 0) - (discountAmountRappen || 0))
        }
        
        finalTotalAmount = Math.max(0, Math.round(finalTotalAmount))
        const remainingAmountRappen = Math.max(0, finalTotalAmount - (creditUsedRappen || 0))

        // ── Meta CAPI: report the booking as a Purchase, mirroring the online
        // self-service flows (create-appointment / guest-book) which fire at the
        // moment of booking commitment regardless of payment method/timing. No
        // fbclid/fbc/fbp here — staff-entered clients have no ad-click history —
        // and deliberately no client_ip/user_agent, since those would be the
        // staff member's browser, not the customer's (would pollute Meta's
        // device-matching graph). Only hashed email/phone are sent.
        capiPromise = (async () => {
          try {
            if (!result.user_id) return
            const { data: capiUser } = await supabase
              .from('users')
              .select('email, phone')
              .eq('id', result.user_id)
              .maybeSingle()

            const hashedEmail = capiUser?.email ? await sha256Hex(capiUser.email.trim().toLowerCase()) : null
            const normalizedPhone = (capiUser?.phone ?? '').replace(/\s+/g, '').replace(/^00/, '+')
            const hashedPhone = normalizedPhone.startsWith('+') ? await sha256Hex(normalizedPhone) : null
            if (!hashedEmail && !hashedPhone) return

            await recordAndSendCapiEvent({
              appointment_id: result.id,
              tenant_id: appointmentData.tenant_id,
              event_name: 'Purchase',
              conversion_value_chf: finalTotalAmount / 100,
              conversion_date_time: new Date(),
              hashed_email: hashedEmail,
              hashed_phone: hashedPhone,
            })
          } catch (capiErr: any) {
            logger.warn('⚠️ Meta CAPI upload failed for admin-created appointment (non-critical):', capiErr?.message ?? capiErr)
          }
        })()

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
          total_amount_rappen: finalTotalAmount,
          payment_method: (creditUsedRappen && creditUsedRappen >= finalTotalAmount) ? 'credit' : (paymentMethodForPayment || 'wallee'),
          payment_status: (remainingAmountRappen === 0 || (cashAlreadyPaid && paymentMethodForPayment === 'cash')) ? 'completed' : 'pending',
          ...(remainingAmountRappen === 0 || (cashAlreadyPaid && paymentMethodForPayment === 'cash') ? { paid_at: new Date().toISOString() } : {}),
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

              // ✅ AFFILIATE REWARD HOOK – fire when payment is immediately completed (e.g. cash or full credit)
              if (paymentResult.payment_status === 'completed' && result.user_id) {
                $fetch('/api/affiliate/process-reward', {
                  method: 'POST',
                  headers: { 'x-internal-secret': process.env.CRON_SECRET || '' },
                  body: {
                    appointment_id: result.id,
                    user_id: result.user_id,
                    tenant_id: appointmentData.tenant_id,
                    driving_category: appointmentData.type ?? null,
                  }
                }).catch((err: any) =>
                  logger.warn('⚠️ Affiliate reward hook failed (non-fatal):', err?.message)
                )
              }
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
        // 1b. Meta CAPI Purchase report (fire-and-forget, non-critical)
        capiPromise,
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
                trigger: 'appointment'
              }
            })
            logger.debug('✅ Queued recalculation')
          } catch (queueError: any) {
            logger.warn('⚠️ Queue recalc error (non-critical):', queueError.message)
          }
        })()
      ].filter(Boolean))
    }

    // ============ RESOURCE BOOKING SYNC ============
    // After saving appointment, sync vehicle_bookings and room_bookings atomically.
    // Runs for both create and edit modes.
    const appointmentId = result.id
    const vehicle_id = appointmentData.vehicle_id ?? null
    const room_id = appointmentData.room_id ?? null
    const resourceStart = appointmentData.start_time
    const resourceEnd = appointmentData.end_time
    const tenantId = appointmentData.tenant_id

    // Resource cost breakdown sent from EventModal
    const resourceSurcharges: { label: string; rappen: number }[] = body.resourceSurcharges || []

    if (appointmentId && (vehicle_id !== undefined || room_id !== undefined)) {
      try {
        // ── Vehicle bookings ──────────────────────────────────────────────
        // Server-side conflict re-check (prevent race conditions)
        if (vehicle_id) {
          const { data: vConflicts } = await supabase
            .from('vehicle_bookings')
            .select('id')
            .eq('vehicle_id', vehicle_id)
            .neq('status', 'cancelled')
            .lt('start_time', resourceEnd)
            .gt('end_time', resourceStart)
            .neq('appointment_id', appointmentId)
            .limit(1)

          const { data: vrConflicts } = await supabase
            .from('vehicle_rentals')
            .select('id')
            .eq('vehicle_id', vehicle_id)
            .neq('status', 'cancelled')
            .lt('start_time', resourceEnd)
            .gt('end_time', resourceStart)
            .limit(1)

          const hasConflict = (vConflicts?.length ?? 0) > 0 || (vrConflicts?.length ?? 0) > 0
          if (hasConflict && !body.force_resource_override) {
            // Non-blocking warning — staff can override by sending force_resource_override: true
            logger.warn('⚠️ Vehicle conflict detected on save (not blocking — staff override required):', vehicle_id)
          }
        }

        // Delete old vehicle_booking for this appointment, then insert new
        await supabase.from('vehicle_bookings')
          .delete()
          .eq('appointment_id', appointmentId)
          .eq('purpose', 'lesson')

        if (vehicle_id) {
          const vehicleCost = resourceSurcharges.find((s: any) => s.type === 'vehicle')?.rappen ?? 0
          const { error: vehicleBookingError } = await supabase.from('vehicle_bookings').insert({
            vehicle_id,
            appointment_id: appointmentId,
            tenant_id: tenantId,
            start_time: resourceStart,
            end_time: resourceEnd,
            purpose: 'lesson',
            status: 'confirmed',
            cost_rappen: vehicleCost,
            booked_by: callerProfile.id,
          })
          if (vehicleBookingError) {
            logger.warn('⚠️ Failed to insert vehicle_booking:', vehicleBookingError.message)
          }
        }

        // ── Room bookings ─────────────────────────────────────────────────
        // Server-side conflict re-check (rooms are auto-assigned client-side
        // from a live availability snapshot, but re-verify here too — mirrors
        // the vehicle conflict check above — to close the race window).
        if (room_id) {
          const { data: rConflicts } = await supabase
            .from('room_bookings')
            .select('id')
            .eq('room_id', room_id)
            .neq('status', 'cancelled')
            .lt('start_time', resourceEnd)
            .gt('end_time', resourceStart)
            .neq('appointment_id', appointmentId)
            .limit(1)

          if ((rConflicts?.length ?? 0) > 0 && !body.force_resource_override) {
            logger.warn('⚠️ Room conflict detected on save (not blocking — staff override required):', room_id)
          }
        }

        await supabase.from('room_bookings')
          .delete()
          .eq('appointment_id', appointmentId)
          .eq('purpose', 'lesson')

        if (room_id) {
          const roomCost = resourceSurcharges.find((s: any) => s.type === 'room')?.rappen ?? 0
          const { error: roomBookingError } = await supabase.from('room_bookings').insert({
            room_id,
            appointment_id: appointmentId,
            tenant_id: tenantId,
            start_time: resourceStart,
            end_time: resourceEnd,
            purpose: 'lesson',
            status: 'confirmed',
            room_cost_rappen: roomCost,
            booked_by: callerProfile.id,
          })
          if (roomBookingError) {
            logger.warn('⚠️ Failed to insert room_booking:', roomBookingError.message)
          }
        }

        logger.debug('✅ Resource bookings synced for appointment:', appointmentId)
      } catch (resourceErr: any) {
        logger.warn('⚠️ Resource booking sync failed (non-critical):', resourceErr.message)
      }
    }

    // Fire-and-forget: email + queue recalc for edits (non-blocking)
    if (mode === 'create') {
      // Wait for payment to be created BEFORE sending confirmation email
      if (paymentPromise) {
        paymentPromise.then(async () => {
          try {
            await $fetch('/api/reminders/send-appointment-confirmation', {
              method: 'POST',
              body: { appointmentId: result.id, userId: appointmentData.user_id, tenantId: appointmentData.tenant_id }
            })
          } catch (err: any) {
            logger.warn('⚠️ Confirmation email failed (async):', err.message)
          }
        }).catch((err: any) => {
          logger.warn('⚠️ Failed to wait for payment before sending email:', err.message)
          // Fallback: send email anyway
          $fetch('/api/reminders/send-appointment-confirmation', {
            method: 'POST',
            body: { appointmentId: result.id, userId: appointmentData.user_id, tenantId: appointmentData.tenant_id }
          }).catch((emailErr: any) => {
            logger.warn('⚠️ Confirmation email fallback failed:', emailErr.message)
          })
        })
      } else {
        // No payment needed, send email immediately
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
    }

    return {
      success: true,
      data: result
    }
  } catch (error: any) {
    logger.error('❌ Appointment save error:', error)
    throw mapSupabaseError(error)
  }
})

