import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { createError, defineEventHandler, getHeader, readBody } from 'h3'
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
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import {
  composeStaffPaymentFromOffer,
  quoteStaffAppointmentOffer,
  staffOfferIdentityFromAppointment,
} from '~/server/utils/quote-staff-appointment'
import { quoteStaffResourceSurcharge } from '~/server/utils/quote-staff-resource-surcharge'
import { assertStaffCanApplyManualDiscount } from '~/server/utils/staff-manual-discount'
import { attachProposalAttributionToStaffAppointment } from '~/server/utils/proposal-booking-conversion'
import { becameBindingConfirmed } from '~/server/utils/binding-booking'
import { hashCustomerIdentifiers, reportBindingAppointmentConversionSafely } from '~/server/utils/binding-booking-conversion'
import { enqueueStaffAvailabilityRecalc } from '~/server/utils/queue-availability-recalc'
import { applyCreditToPayment } from '~/server/utils/apply-credit-to-payment'

function mapStaffPaymentMethod(raw: unknown): string | null {
  if (raw == null || raw === '') return null
  const key = String(raw).trim().toLowerCase()
  const mapping: Record<string, string> = {
    wallee: 'wallee',
    online: 'wallee',
    twint: 'wallee',
    card: 'wallee',
    'credit-card': 'wallee',
    cash: 'cash',
    bar: 'cash',
    invoice: 'invoice',
    rechnung: 'invoice',
  }
  if (mapping[key]) return mapping[key]
  if (['wallee', 'cash', 'invoice', 'credit'].includes(key)) return key
  return 'wallee'
}

function bodyHasOwn(body: unknown, key: string): boolean {
  return !!body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, key)
}

function asPlainObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

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
      paymentMethodForPayment,
      creditUsedRappen = 0,
      // Overlays are composed onto the server offer price. Client base/total
      // amounts are intentionally not read — they are not authoritative.
      adminFeeRappen = 0,
      productsPriceRappen = 0,
      discountAmountRappen = 0,
      isManualDiscount = false,
      // ✅ NEW: Cash already paid flag (staff marks as paid on create)
      cashAlreadyPaid = false
    } = body

    // C1 metadata: omitted ≠ explicit null. Defaults would collapse that.
    const invoiceAddressProvided = bodyHasOwn(body, 'invoiceAddress')
    const paymentNotesProvided = bodyHasOwn(body, 'paymentNotes')
    const companyBillingAddressIdProvided = bodyHasOwn(body, 'companyBillingAddressId')
    const invoiceAddress = invoiceAddressProvided ? body.invoiceAddress : undefined
    const paymentNotes = paymentNotesProvided ? body.paymentNotes : undefined
    const companyBillingAddressId = companyBillingAddressIdProvided ? body.companyBillingAddressId : undefined

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

    // Overlay sanity only. Offer/lesson price is resolved server-side below.
    if (typeof discountAmountRappen === 'number' && discountAmountRappen < 0) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid price: discount cannot be negative' })
    }
    if (typeof creditUsedRappen === 'number' && creditUsedRappen < 0) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid price: credit used cannot be negative' })
    }

    await assertStaffCanApplyManualDiscount({
      tenantId: callerProfile.tenant_id,
      role: callerProfile.role,
      isManualDiscount: Boolean(isManualDiscount && discountAmountRappen > 0)
    })

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
    // ✅ Exam location (Prüfungsort) — independent from custom_location_*
    if (appointmentData.exam_location_name) {
      appointmentData.exam_location_name = sanitizeString(appointmentData.exam_location_name, 255)
    }
    if (appointmentData.exam_location_address) {
      appointmentData.exam_location_address = sanitizeString(appointmentData.exam_location_address, 500)
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

    const quoteTenantId = ['super_admin', 'superadmin'].includes(callerProfile.role)
      ? (appointmentData.tenant_id || callerProfile.tenant_id)
      : callerProfile.tenant_id

    const staffQuote = await quoteStaffAppointmentOffer(
      supabase,
      staffOfferIdentityFromAppointment({
        tenantId: quoteTenantId,
        eventTypeCode: appointmentData.event_type_code,
        categoryCode: appointmentData.type,
        durationMinutes: appointmentData.duration_minutes,
        startTime: appointmentData.start_time,
      }),
    )

    const staffResource = await quoteStaffResourceSurcharge(supabase, {
      tenantId: quoteTenantId,
      vehicleId: appointmentData.vehicle_id,
      roomId: appointmentData.room_id,
      durationMinutes: appointmentData.duration_minutes,
    })

    const requestedCreditRappen = Math.max(0, Math.round(Number(creditUsedRappen) || 0))
    const staffPayment = composeStaffPaymentFromOffer(staffQuote, {
      adminFeeRappen,
      productsPriceRappen,
      resourceSurchargeRappen: staffResource.totalRappen,
      discountAmountRappen,
      creditUsedRappen: 0,
    })

    if (staffPayment.discountAmountRappen > staffPayment.lessonPriceRappen + staffPayment.adminFeeRappen + staffPayment.productsPriceRappen + staffPayment.resourceSurchargeRappen) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid price: discount exceeds total price' })
    }

    logger.debug('📋 Saving appointment via API:', { mode, eventId, appointmentData })

    let result
    // Declared here so it's accessible both inside the create branch and after the if/else block
    let paymentPromise: Promise<void> | null = null
    let conversionPromise: Promise<void> | null = null
    let creditUsedOut = 0
    let remainingOut = staffPayment.totalAmountRappen
    let paymentStatusOut: string | null = null

    if (mode === 'edit' && eventId) {
      // Update existing appointment
      const { data: oldAppointment, error: fetchError } = await supabase
        .from('appointments')
        .select('start_time, end_time, staff_id, tenant_id, duration_minutes, status, user_id, event_type_code, type, gclid, gbraid, wbraid, fbclid, fbc, fbp')
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
        const isEventTypeFk =
          updateError.code === '23503' &&
          String(updateError.message || '').includes('event_type')
        throw createError({
          statusCode: isEventTypeFk ? 400 : 500,
          statusMessage: isEventTypeFk
            ? 'Ungültige Terminart für diesen Mandanten. Bitte Terminart neu wählen und erneut speichern.'
            : `Fehler beim Aktualisieren des Termins: ${updateError.message}`
        })
      }
      result = data
      logger.debug('✅ Appointment updated:', result.id)

      if (becameBindingConfirmed(oldAppointment.status, result.status) && result.user_id && result.tenant_id) {
        conversionPromise = (async () => {
          try {
            const { data: student } = await supabase
              .from('users')
              .select('email, phone')
              .eq('id', result.user_id)
              .maybeSingle()
            const hashed = await hashCustomerIdentifiers({ email: student?.email, phone: student?.phone })
            const conversionValueChf = staffPayment.totalAmountRappen > 0
              ? staffPayment.totalAmountRappen / 100
              : 0
            await reportBindingAppointmentConversionSafely({
              supabase,
              appointmentId: result.id,
              userId: result.user_id,
              tenantId: result.tenant_id,
              status: result.status,
              previousStatus: oldAppointment.status,
              eventTypeCode: result.event_type_code || appointmentData.event_type_code,
              categoryCode: result.type || appointmentData.type,
              gclid: result.gclid ?? oldAppointment.gclid,
              gbraid: result.gbraid ?? oldAppointment.gbraid,
              wbraid: result.wbraid ?? oldAppointment.wbraid,
              fbclid: result.fbclid ?? oldAppointment.fbclid,
              fbc: result.fbc ?? oldAppointment.fbc,
              fbp: result.fbp ?? oldAppointment.fbp,
              conversionValueChf,
              hashedEmail: hashed.hashedEmail,
              hashedPhone: hashed.hashedPhone,
            })
          } catch (err: any) {
            logger.warn('⚠️ Binding booking conversion failed on appointment confirm (non-critical):', err?.message ?? err)
          }
        })()
      }

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
        await enqueueStaffAvailabilityRecalc({
          staff_id: oldAppointment.staff_id,
          tenant_id: oldAppointment.tenant_id,
          trigger: 'appointment_edit',
        })
        logger.debug('✅ Queued recalculation after appointment edit')
      } catch (queueError: any) {
        logger.warn('⚠️ Failed to queue recalculation (non-critical):', queueError.message)
      }
      
      // ============ UPDATE PAYMENT FOR EDITED APPOINTMENT ============
      // Paid offers only. Lesson/total come from the server quote, not the client.
      if (staffQuote.kind === 'paid') {
        try {
          // Check if payment exists
          const { data: existingPayment } = await supabase
            .from('payments')
            .select('id, payment_status, total_amount_rappen, amount_paid_rappen, metadata, credit_used_rappen')
            .eq('appointment_id', eventId)
            .maybeSingle()
          
          if (existingPayment) {
            const finalBasePrice = staffPayment.lessonPriceRappen
            const finalTotalAmount = staffPayment.totalAmountRappen
            const existingCreditUsed = Math.max(0, existingPayment.credit_used_rappen || 0)
            const remainingAmountRappen = Math.max(0, finalTotalAmount - existingCreditUsed)
            creditUsedOut = existingCreditUsed
            remainingOut = remainingAmountRappen
            
            logger.debug('💳 Updating payment for edited appointment:', {
              paymentId: existingPayment.id,
              appointmentId: eventId,
              oldTotal: (existingPayment.total_amount_rappen / 100).toFixed(2),
              newTotal: (finalTotalAmount / 100).toFixed(2),
              creditUsed: (existingCreditUsed / 100).toFixed(2)
            })
            
            const mappedPaymentMethod = mapStaffPaymentMethod(paymentMethodForPayment)
            const invoiceSnapshot = asPlainObject(invoiceAddress)
            const paymentUpdateData: any = {
              lesson_price_rappen: finalBasePrice,
              admin_fee_rappen: staffPayment.adminFeeRappen,
              products_price_rappen: staffPayment.productsPriceRappen,
              discount_amount_rappen: staffPayment.discountAmountRappen,
              voucher_discount_rappen: 0,
              total_amount_rappen: finalTotalAmount,
              // Keep payment user_id/staff_id in sync with the appointment
              ...(appointmentData.user_id ? { user_id: appointmentData.user_id } : {}),
              ...(appointmentData.staff_id ? { staff_id: appointmentData.staff_id } : {}),
              ...(mappedPaymentMethod ? { payment_method: mappedPaymentMethod } : {}),
              ...(appointmentData.title
                ? { description: `Payment for appointment: ${sanitizeString(appointmentData.title, 255)}` }
                : {}),
              updated_at: new Date().toISOString()
            }

            // Invoice snapshots are method-gated. Non-invoice must clear, not omit.
            if (mappedPaymentMethod && mappedPaymentMethod !== 'invoice') {
              paymentUpdateData.invoice_address = null
            } else if (mappedPaymentMethod === 'invoice') {
              if (invoiceSnapshot) {
                paymentUpdateData.invoice_address = invoiceSnapshot
              } else if (invoiceAddressProvided) {
                paymentUpdateData.invoice_address = null
              }
            }

            if (paymentNotesProvided) {
              paymentUpdateData.notes = typeof paymentNotes === 'string' && paymentNotes.trim()
                ? sanitizeString(paymentNotes, 500)
                : null
            }

            if (companyBillingAddressIdProvided) {
              if (companyBillingAddressId == null || companyBillingAddressId === '') {
                paymentUpdateData.company_billing_address_id = null
              } else {
                const billingId = String(companyBillingAddressId).trim()
                paymentUpdateData.company_billing_address_id = validateUUID(billingId).valid
                  ? billingId
                  : null
              }
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
              const creditUsedForThisPayment = existingCreditUsed
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
              const netDueRappen = finalTotalAmount - existingCreditUsed
              paymentUpdateData.payment_status = (netDueRappen - collectedSoFarRappen) <= 0 ? 'completed' : 'partial'
            }

            paymentStatusOut = paymentUpdateData.payment_status || existingPayment.payment_status
            
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

      if (conversionPromise) {
        await conversionPromise
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
        const isEventTypeFk =
          insertError.code === '23503' &&
          String(insertError.message || '').includes('event_type')
        throw createError({
          statusCode: isEventTypeFk ? 400 : 500,
          statusMessage: isEventTypeFk
            ? 'Ungültige Terminart für diesen Mandanten. Bitte Terminart neu wählen und erneut speichern.'
            : `Fehler beim Erstellen des Termins: ${insertError.message}`
        })
      }
      result = data
      logger.debug('✅ Appointment created:', result.id)
      
      // ============ ALL POST-CREATE OPERATIONS IN PARALLEL ============
      // Payment + Slot blocking + Queue recalc all run at the same time
      // DB-driven (event_types.require_payment) so a tenant's own custom
      // chargeable event types get a payment row too, not just lesson/exam/theory.
      // Paid offers only. Lesson/total come from the server quote, not the client.
      if (staffQuote.kind === 'paid') {
        const finalBasePrice = staffPayment.lessonPriceRappen
        const finalTotalAmount = staffPayment.totalAmountRappen
        const markCashPaid = cashAlreadyPaid && paymentMethodForPayment === 'cash'

        const terms = await getTenantTerminology(supabase, appointmentData.tenant_id)
        const appointmentLabel = terms.appointment || 'Termin'
        // Always insert pending so apply_credit_to_payment can run before any cash completion.
        const paymentData = {
          appointment_id: result.id,
          user_id: result.user_id,
          staff_id: appointmentData.staff_id,
          tenant_id: appointmentData.tenant_id,
          lesson_price_rappen: finalBasePrice,
          admin_fee_rappen: staffPayment.adminFeeRappen,
          products_price_rappen: staffPayment.productsPriceRappen,
          discount_amount_rappen: staffPayment.discountAmountRappen,
          voucher_discount_rappen: 0,
          total_amount_rappen: finalTotalAmount,
          payment_method: paymentMethodForPayment || 'wallee',
          payment_status: 'pending',
          credit_used_rappen: 0,
          ...(companyBillingAddressId ? { company_billing_address_id: companyBillingAddressId } : {}),
          description: appointmentData.title || `${appointmentLabel} ${appointmentData.type}`,
          metadata: { category: appointmentData.type || null },
          created_at: new Date().toISOString()
        }
        creditUsedOut = 0
        remainingOut = finalTotalAmount
        paymentStatusOut = 'pending'
        
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
              let creditApplyFailed = false

              if (requestedCreditRappen > 0) {
                try {
                  const applied = await applyCreditToPayment(supabase, {
                    paymentId: paymentResult.id,
                    tenantId: appointmentData.tenant_id,
                    requestedRappen: requestedCreditRappen,
                    actorUserId: callerProfile.id,
                  })
                  creditUsedOut = applied.credit_used_rappen
                  remainingOut = applied.remaining_amount_rappen
                  paymentStatusOut = applied.payment_status
                  result.credit_used_rappen = applied.credit_used_rappen
                  result.remaining_amount_rappen = applied.remaining_amount_rappen
                  result.payment_status = applied.payment_status
                } catch (creditErr: any) {
                  logger.warn('⚠️ Credit apply failed after payment create (appointment kept, payment pending):', creditErr?.message)
                  result.credit_apply_error = creditErr?.message || 'credit_apply_failed'
                  creditUsedOut = 0
                  remainingOut = finalTotalAmount
                  paymentStatusOut = 'pending'
                  creditApplyFailed = true
                }
              } else {
                result.credit_used_rappen = 0
                result.remaining_amount_rappen = finalTotalAmount
                result.payment_status = 'pending'
              }

              // Mark remaining cash collected only after actual credit apply (never after RPC failure).
              if (!creditApplyFailed && markCashPaid && remainingOut > 0) {
                const paidAt = new Date().toISOString()
                const { error: completeError } = await supabase
                  .from('payments')
                  .update({
                    payment_status: 'completed',
                    paid_at: paidAt,
                  })
                  .eq('id', paymentResult.id)
                if (completeError) {
                  logger.warn('⚠️ Failed to mark remaining cash as paid:', completeError)
                } else {
                  paymentStatusOut = 'completed'
                  result.payment_status = 'completed'
                }
              }

              // ✅ AFFILIATE REWARD HOOK – fire when payment is immediately completed (e.g. cash or full credit)
              if ((paymentStatusOut === 'completed' || paymentResult.payment_status === 'completed') && result.user_id) {
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
        conversionPromise,
        (async () => {
          try {
            if (!result.user_id || !result.tenant_id) return
            const conversionValueChf = staffPayment.totalAmountRappen > 0
              ? staffPayment.totalAmountRappen / 100
              : 0
            await attachProposalAttributionToStaffAppointment({
              tenantId: result.tenant_id,
              appointmentId: result.id,
              userId: result.user_id,
              conversionValueChf,
            })
            const { data: stamped } = await supabase
              .from('appointments')
              .select('gclid, gbraid, wbraid, fbclid, fbc, fbp, event_type_code, type, status')
              .eq('id', result.id)
              .maybeSingle()
            const { data: student } = await supabase
              .from('users')
              .select('email, phone')
              .eq('id', result.user_id)
              .maybeSingle()
            const hashed = await hashCustomerIdentifiers({ email: student?.email, phone: student?.phone })
            await reportBindingAppointmentConversionSafely({
              supabase,
              appointmentId: result.id,
              userId: result.user_id,
              tenantId: result.tenant_id,
              status: stamped?.status || result.status || 'confirmed',
              previousStatus: null,
              eventTypeCode: stamped?.event_type_code || appointmentData.event_type_code,
              categoryCode: stamped?.type || appointmentData.type,
              gclid: stamped?.gclid,
              gbraid: stamped?.gbraid,
              wbraid: stamped?.wbraid,
              fbclid: stamped?.fbclid,
              fbc: stamped?.fbc,
              fbp: stamped?.fbp,
              conversionValueChf,
              hashedEmail: hashed.hashedEmail,
              hashedPhone: hashed.hashedPhone,
            })
          } catch (adsErr: any) {
            logger.warn('⚠️ Binding booking conversion failed for staff appointment (non-critical):', adsErr?.message ?? adsErr)
          }
        })(),
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
            await enqueueStaffAvailabilityRecalc({
              staff_id: result.staff_id,
              tenant_id: result.tenant_id,
              trigger: 'appointment',
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
          const { error: vehicleBookingError } = await supabase.from('vehicle_bookings').insert({
            vehicle_id,
            appointment_id: appointmentId,
            tenant_id: tenantId,
            start_time: resourceStart,
            end_time: resourceEnd,
            purpose: 'lesson',
            status: 'confirmed',
            cost_rappen: staffResource.vehicleRappen,
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
          const { error: roomBookingError } = await supabase.from('room_bookings').insert({
            room_id,
            appointment_id: appointmentId,
            tenant_id: tenantId,
            start_time: resourceStart,
            end_time: resourceEnd,
            purpose: 'lesson',
            status: 'confirmed',
            room_cost_rappen: staffResource.roomRappen,
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

    // Direct dispatch on create (no nested HTTP). Payment already awaited above.
    if (mode === 'create' && appointmentData.user_id && appointmentData.tenant_id) {
      try {
        const { dispatchAppointmentConfirmation } = await import(
          '~/server/utils/dispatch-appointment-confirmation'
        )
        await dispatchAppointmentConfirmation({
          appointmentId: result.id,
          userId: appointmentData.user_id,
          tenantId: appointmentData.tenant_id,
        })
      } catch (err: any) {
        logger.warn('⚠️ Confirmation email failed (non-critical):', err?.message)
      }
    }

    return {
      success: true,
      data: {
        ...result,
        credit_used_rappen: creditUsedOut,
        remaining_amount_rappen: remainingOut,
        payment_status: paymentStatusOut,
      }
    }
  } catch (error: any) {
    logger.error('❌ Appointment save error:', error)
    throw mapSupabaseError(error)
  }
})

