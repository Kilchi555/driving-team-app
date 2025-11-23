// server/api/wallee/webhook.post.ts
// Wallee Webhook für Payment Status Updates

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    console.log('🔔 Wallee Webhook received:', {
      entityId: body.entityId,
      state: body.state,
      timestamp: body.timestamp,
      fullBody: body
    })

    // Validate webhook (in production, verify signature)
    // Wallee sendet entityId statt transaction.id und state direkt
    const transactionId = body.entityId || body.transaction?.id
    const transactionState = body.state || body.transaction?.state
    
    if (!transactionId) {
      console.warn('⚠️ Invalid webhook payload - no transaction ID found')
      return { success: false, message: 'Invalid payload' }
    }

    // Process AUTHORIZED (provisorische Belastung) and FULFILL (finale Abbuchung)
    if (!['AUTHORIZED', 'FULFILL'].includes(transactionState)) {
      console.log(`ℹ️ Ignoring transaction state: ${transactionState}`)
      return { success: true, message: `Ignoring state: ${transactionState}` }
    }

    const isAuthorized = transactionState === 'AUTHORIZED'
    const isFulfilled = transactionState === 'FULFILL'

    // Connect to Supabase
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Service role key not configured'
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Find payment by Wallee transaction ID
    console.log('🔍 Looking up payment for transaction:', transactionId)
    console.log('🔍 Searching for wallee_transaction_id =', String(transactionId))
    
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, appointment_id, payment_status')
      .eq('wallee_transaction_id', String(transactionId))
      .maybeSingle()

    if (paymentError) {
      console.error('❌ Database error looking up payment:', paymentError)
      return { success: false, message: 'Database error', error: paymentError }
    }
    
    if (!payment) {
      console.error('❌ Payment not found for transaction:', transactionId)
      console.log('📋 Searched for wallee_transaction_id:', String(transactionId))
      return { success: false, message: 'Payment not found' }
    }

    console.log('✅ Payment found:', { id: payment.id, appointment_id: payment.appointment_id, current_status: payment.payment_status })

    // Handle AUTHORIZED state (provisorische Belastung - 3 Tage vor Termin)
    if (isAuthorized) {
      console.log('💳 Transaction AUTHORIZED - provisorische Belastung (Authorization Hold)')
      // Just log it, no DB update needed for AUTHORIZED state
      // The payment will remain pending until FULFILL happens
      return {
        success: true,
        message: 'Transaction authorized (provisional hold)',
        paymentId: payment.id,
        state: 'authorized'
      }
    }

    // Handle FULFILL state (finale Abbuchung - 24h vor Termin)
    if (isFulfilled) {
      console.log('✅ Transaction FULFILL - finale Abbuchung')
      
      // Update payment status to completed
      console.log('🔄 Updating payment status to completed...')
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({
          payment_status: 'completed',
          paid_at: new Date().toISOString(),
          automatic_payment_processed: true,
          automatic_payment_processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (updatePaymentError) {
        console.error('❌ Failed to update payment:', updatePaymentError)
        throw updatePaymentError
      }

      console.log('✅ Payment updated to completed')

      // Update appointment status to confirmed
      if (payment.appointment_id) {
        console.log('🔄 Updating appointment status to confirmed...')
        const { error: updateAppointmentError } = await supabase
          .from('appointments')
          .update({
            status: 'confirmed',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.appointment_id)

        if (updateAppointmentError) {
          console.error('⚠️ Failed to update appointment:', updateAppointmentError)
          // Don't fail the webhook if appointment update fails
        } else {
          console.log('✅ Appointment updated to confirmed')
        }
      }

      // Nach erfolgreicher Fulfillment: Speichere Payment Method Token
      console.log('💳 Attempting to save payment method token...')
      try {
        const tokenResponse = await $fetch('/api/wallee/save-payment-token', {
          method: 'POST',
          body: {
            transactionId: transactionId,
            userId: payment.user_id || null,
            tenantId: body.spaceId ? null : null // Will be fetched from payment
          }
        })
        console.log('✅ Token saved:', tokenResponse)
      } catch (tokenError: any) {
        console.warn('⚠️ Could not save payment method token:', tokenError.message)
        // Continue - this is not critical
      }

      return {
        success: true,
        message: 'Payment fulfilled and appointment confirmed',
        paymentId: payment.id,
        appointmentId: payment.appointment_id,
        state: 'fulfilled'
      }
    }

    return {
      success: true,
      message: 'Payment and appointment updated',
      paymentId: payment.id,
      appointmentId: payment.appointment_id
    }

  } catch (error: any) {
    console.error('❌ Webhook error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Webhook processing failed'
    })
  }
})

