// server/api/payments/create-payment.post.ts
import { defineEventHandler, readBody } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { paymentData } = body

    if (!paymentData) {
      throw new Error('Payment data is required')
    }

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

    // ✅ If no company_billing_address_id, create a pending task (Pendenz)
    const hasBillingAddress = !!cleanPaymentData.company_billing_address_id
    
    console.log('📝 [PENDENCY] Checking if pendency should be created:', {
      hasBillingAddress,
      hasAppointmentId: !!paymentData.appointment_id,
      company_billing_address_id: cleanPaymentData.company_billing_address_id
    })
    
    if (!hasBillingAddress && paymentData.appointment_id) {
      try {
        console.log('📝 [PENDENCY] Creating pending task for missing billing address')
        
        // Get appointment details for the pending task
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select('title, user_id, staff_id, tenant_id')
          .eq('id', paymentData.appointment_id)
          .single()
        
        console.log('📝 [PENDENCY] Appointment data fetched:', {
          hasAppointmentData: !!appointmentData,
          appointmentError: appointmentError?.message
        })
        
        if (appointmentData) {
          // Set due_date to tomorrow to satisfy check constraint
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          
          const pendencyData = {
            title: `Rechnungsadresse erforderlich: ${appointmentData.title}`,
            description: `Der Termin "${appointmentData.title}" wurde erstellt, aber es wurde keine Rechnungsadresse gespeichert. Bitte fügen Sie die Adresse hinzu.`,
            priority: 'hoch',
            status: 'pendent',
            assigned_to: appointmentData.staff_id,
            created_by: appointmentData.staff_id,
            tenant_id: appointmentData.tenant_id,
            due_date: tomorrow.toISOString(),
            tags: ['billing', 'invoice', 'missing-address'],
            notes: `Appointment ID: ${paymentData.appointment_id}\nPayment ID: ${payment.id}`
          }
          
          console.log('📝 [PENDENCY] Inserting pendency:', { title: pendencyData.title })
          
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

