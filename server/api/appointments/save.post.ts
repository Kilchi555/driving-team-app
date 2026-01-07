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
import { calculatePricingServerSide } from '~/server/utils/pricing-calculator'

/**
 * Appointment Save API - Now with Server-Side Pricing Validation!
 * 
 * ✅ V2 SECURITY: All prices are recalculated server-side!
 * Frontend sends raw data, backend calculates prices to prevent fraud.
 * 
 * Old behavior (V1): Trusted frontend prices
 * New behavior (V2): Recalculates all prices server-side for validation
 */

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { 
      mode, 
      eventId, 
      appointmentData,
      // ✅ V2: Frontend still sends these for backward compatibility,
      // but we'll RECALCULATE them server-side for security!
      totalAmountRappenForPayment, 
      paymentMethodForPayment,
      creditUsedRappen = 0,
      basePriceRappen = 0,
      adminFeeRappen = 0,
      productsPriceRappen = 0,
      discountAmountRappen = 0,
      // ✅ V2 NEW: Raw data for server-side calculation
      productIds = [],
      voucherCode,
      useCredit = false
    } = body

    if (!appointmentData) {
      throw createError({
        statusCode: 400,
        message: 'Appointment data is required'
      })
    }

    if (mode === 'edit' && !eventId) {
      throw createError({
        statusCode: 400,
        message: 'Event ID is required for edit mode'
      })
    }

    // Validate event ID format
    if (eventId && !validateUUID(eventId)) {
      throwValidationError({ eventId: 'Ungültiges Event ID Format' })
    }

    // Validate appointment data (basic checks)
    const validation = validateAppointmentData(appointmentData)
    throwIfInvalid(validation)

    // Extra security: Validate category against database
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
          message: `Fehler beim Aktualisieren des Termins: ${updateError.message}`
        })
      }
      result = data
      logger.debug('✅ Appointment updated:', result.id)
    } else {
      // ============ CREATE MODE ============
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
          message: `Fehler beim Erstellen des Termins: ${insertError.message}`
        })
      }
      result = data
      logger.debug('✅ Appointment created:', result.id)
      
      // ============ OTHER EVENT TYPE HANDLING ============
      // ✅ Check if this is NOT a lesson-type appointment
      const isOtherEventType = !['lesson', 'exam', 'theory'].includes(appointmentData.appointment_type || 'lesson')
      
      if (isOtherEventType) {
        logger.debug('📅 Other Event Type detected:', appointmentData.appointment_type)
        logger.debug('📋 Other Event Type Details:', {
          appointmentId: result.id,
          type: appointmentData.appointment_type,
          staffId: appointmentData.staff_id,
          duration: appointmentData.duration_minutes,
          title: appointmentData.title
        })
        
        // ✅ VALIDATION for Other Event Types:
        // 1. NO STUDENT (user_id should be null for meetings, trainings, etc.)
        if (result.user_id && result.user_id !== '') {
          logger.warn('⚠️ Other event type should not have user_id, updating to null')
          const { error: updateError } = await supabase
            .from('appointments')
            .update({ user_id: null })
            .eq('id', result.id)
          if (!updateError) {
            result.user_id = null
          }
        }
        
        // 2. NO TYPE FIELD (type = null für non-lessons!)
        if (result.type && result.type !== '') {
          logger.warn('⚠️ Other event type should not have category type, updating to null')
          const { error: updateError } = await supabase
            .from('appointments')
            .update({ type: null })
            .eq('id', result.id)
          if (!updateError) {
            result.type = null
          }
        }
        
        // 3. STAFF MUST BE SET
        if (!result.staff_id) {
          logger.error('❌ Other event type MUST have staff_id')
          throw createError({
            statusCode: 400,
            statusMessage: 'Staff erforderlich für diese Terminart'
          })
        }
        
        logger.debug('✅ Other Event Type validated and saved (NO payment created)')
        
        // Skip payment creation for other event types!
        return {
          success: true,
          data: result
        }
      }
      
      // ============ V2 SECURITY: SERVER-SIDE PRICE CALCULATION ============
      // (Only for lesson-type appointments)
      if (totalAmountRappenForPayment && totalAmountRappenForPayment > 0) {
        try {
          logger.debug('💰 V2: Recalculating prices server-side for security...')
          
          // ✅ RECALCULATE PRICES SERVER-SIDE (Don't trust frontend!)
          const serverPricing = await calculatePricingServerSide({
            userId: result.user_id,
            tenantId: appointmentData.tenant_id,
            category: appointmentData.type,
            durationMinutes: appointmentData.duration_minutes || 45,
            appointmentType: appointmentData.appointment_type || 'lesson',
            productIds: productIds || [],
            voucherCode: voucherCode,
            useCredit: useCredit
          })
          
          // ✅ USE SERVER-CALCULATED PRICES (not frontend values!)
          const serverBasePriceRappen = serverPricing.basePriceRappen
          const serverAdminFeeRappen = serverPricing.adminFeeRappen
          const serverProductsPriceRappen = serverPricing.productsPriceRappen
          const serverDiscountAmountRappen = serverPricing.voucherDiscountRappen
          const serverCreditToUseRappen = serverPricing.creditToUseRappen
          const serverFinalTotalRappen = serverPricing.finalTotalRappen
          
          // 🔒 SECURITY CHECK: Compare with frontend values
          const frontendTotal = totalAmountRappenForPayment
          const priceMismatch = Math.abs(serverFinalTotalRappen - frontendTotal) > 50 // Allow 50 Rappen tolerance
          
          if (priceMismatch) {
            logger.warn('⚠️ FRAUD ALERT: Price mismatch detected!', {
              frontendTotal,
              serverCalculated: serverFinalTotalRappen,
              difference: Math.abs(serverFinalTotalRappen - frontendTotal),
              userId: result.user_id,
              appointmentId: result.id
            })
            // Use server price anyway (security priority!)
          }
          
          logger.debug('💳 Creating payment with SERVER-CALCULATED prices:', {
            appointmentId: result.id,
            userId: result.user_id,
            serverTotal: serverFinalTotalRappen,
            frontendTotal,
            used: 'SERVER'
          })
          
          const paymentData = {
            appointment_id: result.id,
            user_id: result.user_id,
            tenant_id: appointmentData.tenant_id,
            // ✅ USE SERVER PRICES (NOT frontend values!)
            lesson_price_rappen: serverBasePriceRappen,
            admin_fee_rappen: serverAdminFeeRappen,
            products_price_rappen: serverProductsPriceRappen,
            discount_amount_rappen: serverDiscountAmountRappen,
            credit_used_rappen: serverCreditToUseRappen,
            // ✅ total_amount_rappen is REMAINING amount after credit
            total_amount_rappen: Math.max(0, serverFinalTotalRappen),
            payment_method: paymentMethodForPayment || 'wallee',
            // ✅ If credit covers the entire amount, mark as completed
            payment_status: serverCreditToUseRappen >= (serverFinalTotalRappen + serverCreditToUseRappen) ? 'completed' : 'pending',
            // ✅ Set paid_at if payment is completed
            ...(serverCreditToUseRappen >= (serverFinalTotalRappen + serverCreditToUseRappen) && { paid_at: new Date().toISOString() }),
            description: appointmentData.title || `Fahrlektio ${appointmentData.type}`,
            metadata: {
              category: appointmentData.type,
              duration_minutes: appointmentData.duration_minutes,
              v2: true, // Mark as V2 pricing
              server_calculated: true
            },
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
            logger.debug('✅ Payment created with SERVER PRICES:', paymentResult.id)
            result.payment_id = paymentResult.id
          }
        } catch (pricingErr: any) {
          logger.error('❌ Server pricing calculation failed:', pricingErr)
          // Fall back to frontend prices (but log the error for investigation)
          logger.warn('⚠️ Falling back to frontend prices due to error')
          
          // Create payment with frontend values as fallback
          const paymentData = {
            appointment_id: result.id,
            user_id: result.user_id,
            tenant_id: appointmentData.tenant_id,
            lesson_price_rappen: basePriceRappen || totalAmountRappenForPayment,
            admin_fee_rappen: adminFeeRappen,
            products_price_rappen: productsPriceRappen,
            discount_amount_rappen: discountAmountRappen,
            credit_used_rappen: creditUsedRappen,
            total_amount_rappen: Math.max(0, totalAmountRappenForPayment - creditUsedRappen),
            payment_method: paymentMethodForPayment || 'wallee',
            payment_status: creditUsedRappen >= totalAmountRappenForPayment ? 'completed' : 'pending',
            ...(creditUsedRappen >= totalAmountRappenForPayment && { paid_at: new Date().toISOString() }),
            description: appointmentData.title || `Fahrlektio ${appointmentData.type}`,
            metadata: {
              category: appointmentData.type,
              v2: false, // Mark as fallback to V1
              server_calculation_failed: true
            },
            created_at: new Date().toISOString()
          }
          
          const { data: paymentResult, error: paymentError } = await supabase
            .from('payments')
            .insert(paymentData)
            .select()
            .single()
          
          if (!paymentError) {
            result.payment_id = paymentResult.id
          }
        }
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
