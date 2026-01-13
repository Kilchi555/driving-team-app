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
      discountAmountRappen = 0
    } = body

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
              total_amount_rappen: remainingAmountRappen,
              credit_used_rappen: creditUsedRappen || 0,
              updated_at: new Date().toISOString()
            }
            
            // ✅ Update payment_status based on remaining amount
            // Only change status if it was 'pending' before (don't override 'completed' if paid, or 'cancelled')
            if (existingPayment.payment_status === 'pending' || existingPayment.payment_status === 'completed') {
              paymentUpdateData.payment_status = remainingAmountRappen === 0 ? 'completed' : 'pending'
              
              // Set or clear paid_at
              const existingPaidAt = (existingPayment as any).paid_at
              if (remainingAmountRappen === 0 && !existingPaidAt) {
                paymentUpdateData.paid_at = new Date().toISOString()
              } else if (remainingAmountRappen > 0) {
                paymentUpdateData.paid_at = null
              }
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
            tenant_id: appointmentData.tenant_id,
            lesson_price_rappen: finalBasePrice,
            admin_fee_rappen: adminFeeRappen || 0,
            products_price_rappen: productsPriceRappen || 0,
            discount_amount_rappen: discountAmountRappen || 0,
            // ✅ FIX: total_amount_rappen is the REMAINING amount after credit is deducted
            total_amount_rappen: remainingAmountRappen,
            payment_method: paymentMethodForPayment || 'wallee',
            invoice_address: body.invoiceAddressForPayment || null, // ✅ NEW: Store invoice address
            // ✅ CRITICAL FIX: Check REMAINING amount (after credit), not finalTotalAmount!
            payment_status: remainingAmountRappen === 0 ? 'completed' : 'pending',
            // ✅ FIX: Set paid_at ONLY if remaining amount is 0 (nothing left to pay)
            ...(remainingAmountRappen === 0 ? { paid_at: new Date().toISOString() } : {}),
            // ✅ NEW: Store credit used in payment record
            credit_used_rappen: creditUsedRappen || 0,
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
            
            // ✅ NEW: Create pendency if invoice payment without address
            if (paymentMethodForPayment === 'invoice') {
              const invoiceAddr = body.invoiceAddressForPayment || paymentData.invoice_address
              const hasInvoiceAddress = invoiceAddr && 
                typeof invoiceAddr === 'object' && 
                Object.keys(invoiceAddr).length > 0 &&
                invoiceAddr.company_name
              
              if (!hasInvoiceAddress) {
                logger.debug('📋 Creating pendency for missing invoice address')
                
                // Get student name
                const { data: student } = await supabase
                  .from('users')
                  .select('first_name, last_name')
                  .eq('id', result.user_id)
                  .single()
                
                const studentName = student 
                  ? `${student.first_name} ${student.last_name}`.trim() 
                  : 'Unbekannt'
                
                // Create pendency
                const { error: pendencyError } = await supabase
                  .from('pendencies')
                  .insert({
                    tenant_id: appointmentData.tenant_id,
                    title: 'Rechnungsadresse erforderlich',
                    description: `${studentName} benötigt eine Rechnungsadresse`,
                    status: 'pendent',
                    priority: 'hoch',
                    type: 'sonstiges',
                    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
                    assigned_to: result.staff_id,
                    assigned_to_type: 'keine',
                    tags: ['billing', 'invoice', 'missing-address'],
                    linked_resources: [],
                    metadata: `Appointment ID: ${result.id}\nPayment ID: ${paymentResult.id}\nCustomer: ${studentName}`,
                    created_by: result.staff_id
                  })
                
                if (pendencyError) {
                  logger.warn('⚠️ Failed to create invoice address pendency:', pendencyError)
                } else {
                  logger.debug('✅ Invoice address pendency created')
                }
              }
            }
          }
        } catch (paymentErr: any) {
          logger.warn('⚠️ Payment creation exception (non-critical):', paymentErr.message)
          // Don't throw - appointment is already created
        }
      }
    }

    // ✅ NEW: Send appointment confirmation email (immediately after creation)
    if (mode === 'create') {
      try {
        logger.debug('📧 Sending appointment confirmation email...')
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
        logger.warn('⚠️ Failed to send appointment confirmation email (non-critical):', confirmationErr.message)
        // Don't throw - appointment was created successfully
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

