// server/api/payments/create-payment.post.ts
import { defineEventHandler, readBody } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import {
  validatePaymentData,
  validateAmount,
  validateUUID,
  throwIfInvalid,
  throwValidationError
} from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { paymentData } = body

    if (!paymentData) {
      throw new Error('Payment data is required')
    }

    // Validate payment data
    const validation = validatePaymentData({
      user_id: paymentData.user_id,
      appointment_id: paymentData.appointment_id,
      total_amount_rappen: paymentData.total_amount_rappen,
      payment_status: paymentData.payment_status,
      payment_method: paymentData.payment_method,
      currency: paymentData.currency
    })
    
    throwIfInvalid(validation)

    logger.debug('💳 Server: Creating payment with data:', {
      appointment_id: paymentData.appointment_id,
      payment_method: paymentData.payment_method,
      payment_status: paymentData.payment_status,
      company_billing_address_id: paymentData.company_billing_address_id,
      company_billing_address_id_type: typeof paymentData.company_billing_address_id,
      company_billing_address_id_is_null: paymentData.company_billing_address_id === null,
      company_billing_address_id_is_undefined: paymentData.company_billing_address_id === undefined,
      total_amount_rappen: paymentData.total_amount_rappen
    })

    const supabase = getSupabaseAdmin()

    // ✅ CRITICAL: Do NOT include company_billing_address_id if invalid
    // This prevents FK constraint issues with non-existent addresses
    const cleanPaymentData: any = {
      ...paymentData
    }
    
    // Remove the key entirely if it's not a valid value
    if (!cleanPaymentData.company_billing_address_id || 
        cleanPaymentData.company_billing_address_id === 'null' ||
        (typeof cleanPaymentData.company_billing_address_id === 'string' && 
         cleanPaymentData.company_billing_address_id.trim() === '')) {
      delete cleanPaymentData.company_billing_address_id
    }

    logger.debug('💳 Server: Cleaned payment data:', {
      has_company_billing_address_id: 'company_billing_address_id' in cleanPaymentData,
      company_billing_address_id: cleanPaymentData.company_billing_address_id,
      company_billing_address_id_type: typeof cleanPaymentData.company_billing_address_id
    })

    // ✅ Use admin client to bypass RLS - allows null company_billing_address_id
    const { data: payment, error } = await supabase
      .from('payments')
      .insert(cleanPaymentData)
      .select()
      .single()

    if (error) {
      logger.error('❌ Error creating payment:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        paymentData: cleanPaymentData
      })
      throw new Error(`Failed to create payment: ${error.message}`)
    }

    logger.debug('✅ Payment created successfully:', payment.id)

    // ✅ NEW: Load any pending unpaid charges from cancelled appointments
    // and add them to the current payment total
    let totalAmountWithPendingCharges = payment.total_amount_rappen || 0
    
    try {
      logger.debug('🔍 Checking for pending cancellation charges for user:', paymentData.user_id)
      
      // Find all pending payments for this user that are from cancelled appointments
      const { data: pendingCharges, error: pendingError } = await supabase
        .from('payments')
        .select('id, total_amount_rappen, appointments!inner(id, status)')
        .eq('user_id', paymentData.user_id)
        .eq('payment_status', 'pending')
        .eq('appointments.status', 'cancelled')
        .not('payment_id', 'is', null) // Exclude payments linked to other payments
      
      if (!pendingError && pendingCharges && pendingCharges.length > 0) {
        let totalPendingCharges = 0
        const pendingPaymentIds: string[] = []
        
        for (const pendingPayment of pendingCharges) {
          totalPendingCharges += pendingPayment.total_amount_rappen || 0
          pendingPaymentIds.push(pendingPayment.id)
        }
        
        logger.debug('✅ Found pending cancellation charges to add:', {
          count: pendingCharges.length,
          totalRappen: totalPendingCharges,
          paymentIds: pendingPaymentIds
        })
        
        // Add pending charges to current payment
        totalAmountWithPendingCharges += totalPendingCharges
        
        // Update current payment total
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            total_amount_rappen: totalAmountWithPendingCharges,
            notes: `${payment.notes || ''}${payment.notes ? ' | ' : ''}Includes pending cancellation charges (${totalPendingCharges / 100} CHF)`
          })
          .eq('id', payment.id)
        
        if (!updateError) {
          logger.debug('✅ Updated current payment with pending charges:', {
            originalAmount: payment.total_amount_rappen,
            totalAmount: totalAmountWithPendingCharges,
            added: totalPendingCharges
          })
        } else {
          logger.warn('⚠️ Could not update payment with pending charges:', updateError.message)
        }
      }
    } catch (err: any) {
      logger.warn('⚠️ Error checking for pending cancellation charges:', err.message)
      // Continue anyway - pending charges can be handled manually
    }

    // ✅ If no company_billing_address_id AND payment_method is invoice, create a pending task (Pendenz)
    const hasBillingAddress = !!cleanPaymentData.company_billing_address_id
    const isInvoicePayment = paymentData.payment_method === 'invoice'
    
    console.log('📝 [PENDENCY] Checking if pendency should be created:', {
      hasBillingAddress,
      isInvoicePayment,
      payment_method: paymentData.payment_method,
      hasAppointmentId: !!paymentData.appointment_id,
      company_billing_address_id: cleanPaymentData.company_billing_address_id
    })
    
    if (!hasBillingAddress && isInvoicePayment && paymentData.appointment_id) {
      try {
        console.log('📝 [PENDENCY] Creating pending task for missing billing address')
        
        // Get appointment details for the pending task
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select('title, user_id, staff_id, tenant_id, created_at, users!appointments_user_id_fkey(first_name, last_name)')
          .eq('id', paymentData.appointment_id)
          .single()
        
        console.log('📝 [PENDENCY] Appointment data fetched:', {
          hasAppointmentData: !!appointmentData,
          appointmentError: appointmentError?.message,
          staff_id: appointmentData?.staff_id,
          customerName: appointmentData?.users ? `${appointmentData.users.first_name} ${appointmentData.users.last_name}` : 'Unknown'
        })
        
        if (appointmentData) {
          // We need to resolve staff_id to the actual users.id
          let assignedUserId = null
          
          // Try multiple ways to find the user:
          // 1. First check if staff_id is directly a users.id
          const { data: userById, error: userByIdError } = await supabase
            .from('users')
            .select('id')
            .eq('id', appointmentData.staff_id)
            .single()
          
          if (userById && userById.id) {
            assignedUserId = userById.id
            console.log('📝 [PENDENCY] Found users.id directly:', assignedUserId)
          } else {
            // 2. If not found, try to find by auth_user_id
            const { data: staffUser, error: staffError } = await supabase
              .from('users')
              .select('id')
              .eq('auth_user_id', appointmentData.staff_id)
              .single()
            
            if (staffUser && staffUser.id) {
              assignedUserId = staffUser.id
              console.log('📝 [PENDENCY] Found users.id by auth_user_id:', assignedUserId)
            } else {
              console.warn('⚠️ [PENDENCY] Could not find users.id for staff_id:', appointmentData.staff_id, staffError?.message)
            }
          }
          
          // Get customer name
          const customerName = appointmentData.users 
            ? `${appointmentData.users.first_name} ${appointmentData.users.last_name}`.trim()
            : 'Kunde'
          
          // Use created_at for due_date
          const createdAtDate = new Date(appointmentData.created_at)
          
          const pendencyData = {
            title: 'Rechnungsadresse erforderlich',
            description: `${customerName} benötigt eine Rechnungsadresse`,
            priority: 'hoch',
            status: 'pendent',
            assigned_to: assignedUserId || null, // Use resolved users.id or null
            created_by: assignedUserId || null,  // Use resolved users.id or null
            tenant_id: appointmentData.tenant_id,
            due_date: createdAtDate.toISOString(),
            tags: ['billing', 'invoice', 'missing-address'],
            notes: `Appointment ID: ${paymentData.appointment_id}\nPayment ID: ${payment.id}\nCustomer: ${customerName}`
          }
          
          console.log('📝 [PENDENCY] Inserting pendency:', { title: pendencyData.title, assigned_to: pendencyData.assigned_to, created_by: pendencyData.created_by })
          
          const { data: createdPendency, error: pendencyError } = await supabase
            .from('pendencies')
            .insert([pendencyData])
            .select()
          
          console.log('📝 [PENDENCY] Pendency creation result:', {
            success: !pendencyError,
            error: pendencyError?.message,
            pendencyId: createdPendency?.[0]?.id
          })
          
          if (pendencyError) {
            console.error('❌ [PENDENCY] Failed to create pending task:', {
              message: pendencyError.message,
              code: pendencyError.code,
              details: pendencyError.details
            })
          } else {
            console.log('✅ [PENDENCY] Pending task created successfully')
          }
        } else {
          console.error('❌ [PENDENCY] Could not fetch appointment data:', appointmentError?.message)
        }
      } catch (pendencyErr: any) {
        console.error('❌ [PENDENCY] Error creating pending task:', {
          message: pendencyErr.message
        })
      }
    } else {
      console.log('ℹ️ [PENDENCY] Skipped: hasBillingAddress=' + hasBillingAddress + ', hasAppointmentId=' + !!paymentData.appointment_id)
    }

    return {
      success: true,
      payment
    }
  } catch (err: any) {
    logger.error('❌ Error in create-payment endpoint:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Failed to create payment'
    })
  }
})

