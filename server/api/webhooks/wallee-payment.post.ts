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
    
    // Find ALL payments by Wallee transaction ID (there might be multiple)
    const { data: payments, error: findError } = await supabase
      .from('payments')
      .select(`
        id,
        payment_status,
        appointment_id,
        user_id,
        total_amount_rappen,
        metadata,
        wallee_transaction_id,
        appointments (
          id,
          title,
          start_time
        )
      `)
      .eq('wallee_transaction_id', transactionId)
    
    if (findError || !payments || payments.length === 0) {
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
    
    console.log('✅ Payments found:', {
      count: payments.length,
      paymentIds: payments.map(p => p.id),
      currentStatus: payments[0]?.payment_status,
      newStatus: paymentStatus
    })
    
    // Update ALL payments with this transaction ID
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
      .eq('wallee_transaction_id', transactionId)
    
    if (updateError) {
      console.error('❌ Error updating payments:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update payments'
      })
    }
    
    console.log('✅ All payment statuses updated successfully')
    
    // Update ALL appointments if payment completed
    if (paymentStatus === 'completed') {
      const appointmentIds = payments
        .filter(p => p.appointment_id)
        .map(p => p.appointment_id)
      
      if (appointmentIds.length > 0) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({
            is_paid: true,
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .in('id', appointmentIds)
        
        if (appointmentError) {
          console.error('❌ Error updating appointments:', appointmentError)
        } else {
          console.log('✅ All appointments marked as paid:', appointmentIds.length)
        }
      }
    }
    
    // Create vouchers if payment completed and products are vouchers
    if (paymentStatus === 'completed') {
      for (const payment of payments) {
        try {
          await createVouchersAfterPayment(payment.id, payment.metadata)
        } catch (voucherErr) {
          console.warn('⚠️ Could not create vouchers for payment:', payment.id, voucherErr)
        }
      }
    }

    // Send notification email if payment completed (use first payment)
    if (paymentStatus === 'completed' && payments.length > 0) {
      try {
        await sendPaymentConfirmationEmail({
          payment: payments[0],
          amount: payments.reduce((sum, p) => sum + p.total_amount_rappen, 0) / 100,
          transactionId
        })
      } catch (emailErr) {
        console.warn('⚠️ Could not send confirmation email:', emailErr)
      }
    }
    
    // Send notification email if payment failed
    if (paymentStatus === 'failed' && payments.length > 0) {
      try {
        await sendPaymentFailedEmail({
          payment: payments[0],
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
      payment_ids: payments.map(p => p.id),
      payments_count: payments.length,
      old_status: payments[0]?.payment_status,
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

// Helper function to create vouchers after successful payment
async function createVouchersAfterPayment(paymentId: string, metadata: any) {
  console.log('🎁 Creating vouchers for payment:', paymentId)
  
  if (!metadata?.products) {
    console.log('ℹ️ No products in metadata, skipping voucher creation')
    return
  }

  const supabase = getSupabase()
  
  for (const product of metadata.products) {
    // Check if this product is a voucher
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('is_voucher')
      .eq('id', product.id)
      .single()
    
    if (productError || !productData?.is_voucher) {
      console.log('ℹ️ Product is not a voucher, skipping:', product.id)
      continue
    }

    // Create voucher in discounts table
    const voucherData = {
      name: product.name,
      description: product.description || '',
      discount_value: product.price_rappen / 100, // Convert to CHF
      discount_type: 'fixed',
      is_voucher: true,
      voucher_recipient_name: metadata.customer_name || 'Inhaber',
      voucher_recipient_email: metadata.customer_email,
      valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      payment_id: paymentId,
      is_active: true,
      created_at: new Date().toISOString()
    }

    const { data: voucher, error: voucherError } = await supabase
      .from('discounts')
      .insert(voucherData)
      .select()
      .single()

    if (voucherError) {
      console.error('❌ Error creating voucher:', voucherError)
    } else {
      console.log('✅ Voucher created:', voucher.id)
    }
  }
}
