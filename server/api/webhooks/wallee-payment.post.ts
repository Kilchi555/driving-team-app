// server/api/webhooks/wallee-payment.post.ts
// ✅ WALLEE WEBHOOK HANDLER für Payment Updates

import { getSupabase } from '~/utils/supabase'

interface WalleeWebhookPayload {
  listenerEntityId: number
  listenerEntityTechnicalName: string
  spaceId: number
  id: number
  state: string
  entityId: number
  timestamp: string
}

interface WalleeTransactionState {
  PENDING: 'pending'
  CONFIRMED: 'processing'
  PROCESSING: 'processing'
  SUCCESSFUL: 'completed'
  FAILED: 'failed'
  CANCELED: 'cancelled'
  DECLINE: 'failed'
  FULFILL: 'completed'
}

export default defineEventHandler(async (event) => {
  try {
    console.log('🔔 Wallee Webhook received')
    
    const body = await readBody(event) as WalleeWebhookPayload
    console.log('📨 Webhook payload:', JSON.stringify(body, null, 2))
    
    // Validate webhook
    if (!body.entityId || !body.state) {
      console.error('❌ Invalid webhook payload')
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid webhook payload'
      })
    }
    
    const supabase = getSupabase()
    const transactionId = body.entityId.toString()
    const walleeState = body.state
    
    console.log('🔍 Processing transaction:', {
      transactionId,
      walleeState,
      spaceId: body.spaceId
    })
    
    // Map Wallee state to our payment status
    const statusMapping: Record<string, string> = {
      'PENDING': 'pending',
      'CONFIRMED': 'processing',
      'PROCESSING': 'processing',
      'SUCCESSFUL': 'completed',
      'FAILED': 'failed',
      'CANCELED': 'cancelled',
      'DECLINE': 'failed',
      'FULFILL': 'completed'
    }
    
    const paymentStatus = statusMapping[walleeState] || 'pending'
    
    console.log(`🔄 Mapping Wallee state "${walleeState}" to payment status "${paymentStatus}"`)
    
    // Find payment by Wallee transaction ID
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select(`
        id,
        payment_status,
        appointment_id,
        user_id,
        total_amount_rappen,
        appointments (
          id,
          title,
          start_time
        )
      `)
      .eq('wallee_transaction_id', transactionId)
      .single()
    
    if (findError || !payment) {
      // Try to find anonymous sale instead
      console.log('🔍 Payment not found, checking for anonymous sale...')
      
      const { data: anonymousSale, error: saleError } = await supabase
        .from('product_sales')
        .select(`
          id,
          status,
          total_amount_rappen,
          metadata,
          user_id
        `)
        .eq('wallee_transaction_id', transactionId)
        .single()
      
      if (saleError || !anonymousSale) {
        console.error('❌ Neither payment nor anonymous sale found for transaction:', transactionId)
        throw createError({
          statusCode: 404,
          statusMessage: 'Payment or sale not found'
        })
      }
      
      // Process anonymous sale
      console.log('✅ Anonymous sale found:', {
        saleId: anonymousSale.id,
        currentStatus: anonymousSale.status,
        newStatus: paymentStatus
      })
      
      // Skip if status hasn't changed
      if (anonymousSale.status === paymentStatus) {
        console.log('ℹ️ Sale status unchanged, skipping update')
        return { success: true, message: 'Status unchanged' }
      }
      
      // Update anonymous sale status
      const updateData: any = {
        status: paymentStatus,
        wallee_transaction_state: walleeState,
        updated_at: new Date().toISOString()
      }
      
      // Set completion timestamp if successful
      if (paymentStatus === 'completed') {
        updateData.paid_at = new Date().toISOString()
      }
      
      const { error: updateError } = await supabase
        .from('product_sales')
        .update(updateData)
        .eq('id', anonymousSale.id)
      
      if (updateError) {
        console.error('❌ Error updating anonymous sale:', updateError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to update anonymous sale'
        })
      }
      
      console.log('✅ Anonymous sale status updated successfully')
      
      // Send confirmation email if payment completed
      if (paymentStatus === 'completed') {
        try {
          await sendAnonymousSaleConfirmationEmail({
            saleId: anonymousSale.id,
            customerName: anonymousSale.metadata?.customer_name || 'Anonymer Kunde',
            customerEmail: anonymousSale.metadata?.customer_email,
            totalAmount: anonymousSale.total_amount_rappen,
            paymentMethod: anonymousSale.metadata?.payment_method || 'online'
          })
        } catch (emailError) {
          console.warn('⚠️ Could not send confirmation email:', emailError)
        }
      }
      
      return { success: true, message: 'Anonymous sale updated' }
    }
    
    console.log('✅ Payment found:', {
      paymentId: payment.id,
      currentStatus: payment.payment_status,
      newStatus: paymentStatus
    })
    
    // Skip if status hasn't changed
    if (payment.payment_status === paymentStatus) {
      console.log('ℹ️ Payment status unchanged, skipping update')
      return { success: true, message: 'Status unchanged' }
    }
    
    // Update payment status
    const updateData: any = {
      payment_status: paymentStatus,
      wallee_transaction_state: walleeState,
      updated_at: new Date().toISOString()
    }
    
    // Set completion timestamp if successful
    if (paymentStatus === 'completed') {
      updateData.paid_at = new Date().toISOString()
    }
    
    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', payment.id)
    
    if (updateError) {
      console.error('❌ Error updating payment:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update payment'
      })
    }
    
    console.log('✅ Payment status updated successfully')
    
    // Update appointment if payment completed
    if (paymentStatus === 'completed' && payment.appointment_id) {
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          is_paid: true,
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.appointment_id)
      
      if (appointmentError) {
        console.error('❌ Error updating appointment:', appointmentError)
      } else {
        console.log('✅ Appointment marked as paid')
      }
    }
    
    // Create status history entry (optional - table may not exist yet)
    try {
      const { error: historyError } = await supabase
        .from('payment_status_history')
        .insert({
          payment_id: payment.id,
          status: paymentStatus,
          wallee_transaction_state: walleeState,
          metadata: {
            webhook_timestamp: body.timestamp,
            space_id: body.spaceId,
            listener_entity: body.listenerEntityTechnicalName
          },
          created_at: new Date().toISOString()
        })
      
      if (historyError) {
        console.warn('⚠️ Could not create status history (table may not exist):', historyError)
      }
    } catch (historyErr) {
      console.warn('⚠️ Status history table may not exist yet:', historyErr)
      // Continue - main webhook processing was successful
    }
    
    // Send notification email if payment completed
    if (paymentStatus === 'completed') {
      try {
        await sendPaymentConfirmationEmail({
          payment,
          amount: payment.total_amount_rappen / 100,
          transactionId
        })
      } catch (emailErr) {
        console.warn('⚠️ Could not send confirmation email:', emailErr)
      }
    }
    
    // Send notification email if payment failed
    if (paymentStatus === 'failed') {
      try {
        await sendPaymentFailedEmail({
          payment,
          transactionId,
          reason: walleeState
        })
      } catch (emailErr) {
        console.warn('⚠️ Could not send failure email:', emailErr)
      }
    }
    
    console.log('🎉 Webhook processed successfully')
    
    return {
      success: true,
      message: 'Webhook processed',
      payment_id: payment.id,
      old_status: payment.payment_status,
      new_status: paymentStatus
    }
    
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error)
    
    // Return 200 even on error to prevent Wallee from retrying
    // Log the error for investigation
    return {
      success: false,
      error: error.message,
      message: 'Webhook error logged'
    }
  }
})

// Helper function to send payment confirmation email
async function sendPaymentConfirmationEmail(data: any) {
  console.log('📧 Sending payment confirmation email for payment:', data.payment.id)
  // TODO: Implement email service
  // Could use Supabase Edge Functions, SendGrid, etc.
}

// Helper function to send payment failed email
async function sendPaymentFailedEmail(data: any) {
  console.log('📧 Sending payment failed email for payment:', data.payment.id)
  // TODO: Implement email service
}

// Helper function to send anonymous sale confirmation email
async function sendAnonymousSaleConfirmationEmail(data: any) {
  console.log('📧 Sending anonymous sale confirmation email for sale:', data.saleId)
  // TODO: Implement email service
}
