// server/api/wallee/webhook.post.ts
// ✅ WALLEE WEBHOOK HANDLER
// Delegates to the main payment webhook handler

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'

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
    
    const supabase = getSupabaseAdmin()
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
      'AUTHORIZED': 'authorized',
      'FULFILL': 'completed',
      'COMPLETED': 'completed',
      'SUCCESSFUL': 'completed',
      'FAILED': 'failed',
      'CANCELED': 'cancelled',
      'DECLINE': 'failed',
      'VOIDED': 'cancelled'
    }
    
    const paymentStatus = statusMapping[walleeState] || 'pending'
    
    console.log(`🔄 Mapping Wallee state "${walleeState}" to payment status "${paymentStatus}"`)
    
    // ✅ WICHTIG: FULFILL ist der final state - glaube dem Webhook!
    let actualPaymentStatus = paymentStatus
    
    // ✅ If webhook says FULFILL, trust it! Don't double-check with API
    if (walleeState === 'FULFILL') {
      console.log('✅ Webhook reports FULFILL - payment is completed')
      actualPaymentStatus = 'completed'
    }
    
    // Find ALL payments by Wallee transaction ID
    console.log(`🔍 Searching for payment with wallee_transaction_id: "${transactionId}"`)
    
    let { data: payments, error: findError } = await supabase
      .from('payments')
      .select(`
        id,
        payment_status,
        appointment_id,
        user_id,
        tenant_id,
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
    
    console.log(`🔍 Query result:`, { 
      found: payments?.length || 0, 
      error: findError?.message,
      payments: payments?.map(p => ({ id: p.id, wallee_transaction_id: p.wallee_transaction_id }))
    })
    
    if (findError || !payments || payments.length === 0) {
      console.error('❌ Payment not found for transaction:', transactionId)
      throw createError({
        statusCode: 404,
        statusMessage: 'Payment not found'
      })
    }
    
    console.log('✅ Payments found:', {
      count: payments.length,
      paymentIds: payments.map(p => p.id)
    })
    
    // Update ALL payments with this transaction ID
    const updateData: any = {
      payment_status: actualPaymentStatus,
      updated_at: new Date().toISOString()
    }
    
    // Set completion timestamp if successful
    if (actualPaymentStatus === 'completed') {
      updateData.paid_at = new Date().toISOString()
    }
    
    const paymentIdsToUpdate = payments.map(p => p.id)
    
    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .in('id', paymentIdsToUpdate)
    
    if (updateError) {
      console.error('❌ Error updating payments:', updateError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update payments'
      })
    }
    
    console.log(`✅ ${paymentIdsToUpdate.length} payment(s) updated to status: ${actualPaymentStatus}`)
    
    // Process credit products if payment is completed
    if (actualPaymentStatus === 'completed') {
      console.log('🎁 Processing credit product purchases...')
      for (const payment of payments) {
        try {
          await processCreditProductPurchase(payment)
        } catch (creditErr) {
          console.error('❌ ERROR in processCreditProductPurchase:', creditErr)
        }
      }
    }
    
    console.log('🎉 Webhook processed successfully')
    
    return {
      success: true,
      message: 'Webhook processed',
      payment_ids: payments.map(p => p.id),
      payments_count: payments.length,
      status: actualPaymentStatus
    }
    
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error)
    
    // Return 200 even on error to prevent Wallee from retrying
    return {
      success: false,
      error: error.message,
      message: 'Webhook error logged'
    }
  }
})

// ✅ Helper function to process credit product purchases
async function processCreditProductPurchase(payment: any) {
  console.log('💰 [processCreditProductPurchase] Starting for payment:', {
    id: payment.id,
    user_id: payment.user_id,
    appointment_id: payment.appointment_id,
    hasMetadata: !!payment.metadata,
    metadataProducts: payment.metadata?.products?.length || 0
  })
  
  if (!payment.user_id) {
    console.log('ℹ️ [processCreditProductPurchase] No user_id in payment, skipping')
    return
  }

  const supabase = getSupabaseAdmin()
  
  // Check for standalone product purchases (from shop)
  if (!payment.appointment_id && payment.metadata?.products) {
    console.log('🛍️ [processCreditProductPurchase] Standalone product purchase detected')
    
    const metadataProducts = payment.metadata.products
    
    // Look up actual product details from database
    const productIds = metadataProducts.map((p: any) => p.id)
    console.log('📊 [processCreditProductPurchase] Looking up products from DB:', productIds)
    
    const { data: dbProducts, error: dbError } = await supabase
      .from('products')
      .select('id, name, is_credit_product, credit_amount_rappen')
      .in('id', productIds)
    
    if (dbError) {
      console.error('❌ [processCreditProductPurchase] Error fetching products from DB:', dbError)
      return
    }
    
    console.log('📊 [processCreditProductPurchase] Products from DB:', dbProducts)
    
    // Find credit products
    const creditProducts: any[] = []
    for (const metaProduct of metadataProducts) {
      const dbProduct = dbProducts?.find((p: any) => p.id === metaProduct.id)
      console.log('🔍 [processCreditProductPurchase] Checking product:', {
        metaProductId: metaProduct.id,
        metaProductName: metaProduct.name,
        found: !!dbProduct,
        isCreditProduct: dbProduct?.is_credit_product
      })
      
      if (dbProduct?.is_credit_product === true) {
        creditProducts.push({
          ...metaProduct,
          is_credit_product: dbProduct.is_credit_product,
          credit_amount_rappen: dbProduct.credit_amount_rappen
        })
      }
    }
    
    if (creditProducts.length === 0) {
      console.log('ℹ️ [processCreditProductPurchase] No credit products in purchase')
      return
    }
    
    console.log(`✅ [processCreditProductPurchase] Found ${creditProducts.length} credit product(s)`)
    
    // Get student_credits
    let { data: studentCredit, error: scError } = await supabase
      .from('student_credits')
      .select('id, balance_rappen')
      .eq('user_id', payment.user_id)
      .eq('tenant_id', payment.tenant_id)
      .single()
    
    console.log('📊 [processCreditProductPurchase] student_credits query result:', {
      found: !!studentCredit,
      error: scError?.message
    })
    
    // If student_credits doesn't exist, create it
    if (scError && (scError.code === 'PGRST116' || scError.message?.includes('0 rows'))) {
      console.warn('⚠️ [processCreditProductPurchase] student_credits not found, creating...')
      
      const { data: newStudentCredit, error: createError } = await supabase
        .from('student_credits')
        .insert({
          user_id: payment.user_id,
          balance_rappen: 0,
          tenant_id: payment.tenant_id,
          notes: 'Auto-created for credit product purchase'
        })
        .select('id, balance_rappen')
        .single()
      
      if (createError) {
        console.error('❌ [processCreditProductPurchase] Error creating student_credits:', createError)
        return
      }
      
      studentCredit = newStudentCredit
      console.log('✅ [processCreditProductPurchase] student_credits created')
    } else if (scError) {
      console.error('❌ [processCreditProductPurchase] Error loading student_credits:', scError)
      return
    }
    
    // Process each credit product
    for (const product of creditProducts) {
      const creditAmount = (product.credit_amount_rappen || 0) * (product.quantity || 1)
      console.log(`💰 [processCreditProductPurchase] Adding ${creditAmount / 100} CHF from ${product.name}`)
      
      const oldBalance = studentCredit.balance_rappen
      const newBalance = oldBalance + creditAmount
      
      // Update balance
      const { error: updateError } = await supabase
        .from('student_credits')
        .update({
          balance_rappen: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', studentCredit.id)
      
      if (updateError) {
        console.error('❌ [processCreditProductPurchase] Error updating balance:', updateError)
        continue
      }
      
      console.log('✅ [processCreditProductPurchase] Credit balance updated')
      
      // Create credit_transaction
      const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: payment.user_id,
          transaction_type: 'credit_product_purchase',
          amount_rappen: creditAmount,
          balance_before_rappen: oldBalance,
          balance_after_rappen: newBalance,
          payment_method: 'online',
          reference_id: payment.id,
          reference_type: 'payment',
          created_by: null,
          notes: `Guthaben-Produkt gekauft: ${product.name}`,
          tenant_id: payment.tenant_id,
          status: 'completed'
        })
      
      if (txError) {
        console.error('❌ [processCreditProductPurchase] Error creating transaction:', txError)
      } else {
        console.log('✅ [processCreditProductPurchase] Credit transaction created')
      }
      
      studentCredit.balance_rappen = newBalance
    }
  }
}

