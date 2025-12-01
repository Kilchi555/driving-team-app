// server/api/webhooks/wallee-payment.post.ts
// ✅ WALLEE WEBHOOK HANDLER für Payment Updates

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
      'AUTHORIZED': 'authorized', // Provisorische Belastung
      'FULFILL': 'completed', // Wallee meldet erfolgreiche Belastung
      'COMPLETED': 'completed', // Finale Abbuchung (Capture) durchgeführt
      'SUCCESSFUL': 'completed',
      'FAILED': 'failed',
      'CANCELED': 'cancelled',
      'DECLINE': 'failed',
      'VOIDED': 'cancelled'
    }
    
    const paymentStatus = statusMapping[walleeState] || 'pending'
    
    console.log(`🔄 Mapping Wallee state "${walleeState}" to payment status "${paymentStatus}"`)
    
    // ✅ IMPORTANT: Fetch actual transaction state from Wallee API BEFORE processing
    let actualPaymentStatus = paymentStatus
    try {
      console.log('🔍 Fetching actual transaction state from Wallee API...')
      
      // Get Wallee settings for the first payment we find (or use default)
      const { data: firstPaymentForSettings } = await supabase
        .from('payments')
        .select('tenant_id')
        .eq('wallee_transaction_id', transactionId)
        .limit(1)
        .maybeSingle()
      
      const tenantIdForSettings = firstPaymentForSettings?.tenant_id
      let spaceId = body.spaceId || parseInt(process.env.WALLEE_SPACE_ID || '82592')
      let userId = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
      let apiSecret = process.env.WALLEE_SECRET_KEY || 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
      
      if (tenantIdForSettings) {
        const { data: walleeSettings } = await supabase
          .from('tenant_settings')
          .select('setting_value')
          .eq('tenant_id', tenantIdForSettings)
          .eq('setting_key', 'wallee_credentials')
          .single()
        
        if (walleeSettings?.setting_value) {
          const creds = walleeSettings.setting_value as any
          spaceId = creds.space_id
          userId = creds.user_id
          apiSecret = creds.api_secret
        }
      }
      
      const config = {
        space_id: spaceId,
        user_id: userId,
        api_secret: apiSecret
      }
      
      const WalleeModule = await import('wallee')
      const Wallee = WalleeModule.default || WalleeModule.Wallee || WalleeModule
      const transactionService = new (Wallee as any).api.TransactionService(config)
      const transactionResponse = await transactionService.read(spaceId, parseInt(transactionId))
      const walleeTransaction = transactionResponse.body
      
      const actualWalleeState = (walleeTransaction as any).state || walleeState
      actualPaymentStatus = statusMapping[actualWalleeState] || 'pending'
      
      console.log('✅ Actual payment status from API:', {
        webhookState: walleeState,
        actualApiState: actualWalleeState,
        webhookPaymentStatus: paymentStatus,
        actualPaymentStatus: actualPaymentStatus
      })
    } catch (apiError) {
      console.warn('⚠️ Could not fetch actual state from Wallee API, using webhook state:', apiError)
    }
    
    // Find ALL payments by Wallee transaction ID (there might be multiple)
    console.log(`🔍 Searching for payment with wallee_transaction_id: "${transactionId}" (type: ${typeof transactionId})`)
    
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
      // ✅ Try to find appointment by transaction metadata (from confirmation page)
      console.log('🔍 Payment not found, checking transaction metadata for appointment...')
      
      try {
        // Fetch transaction details from Wallee to get merchantReference
        const spaceId = body.spaceId || parseInt(process.env.WALLEE_SPACE_ID || '82592')
        const userId = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
        const apiSecret = process.env.WALLEE_SECRET_KEY || 'ZtJAPWa4n1Gk86lrNaAZTXNfP3gpKrAKsSDPqEu8Re8='
        const config = {
          space_id: spaceId,
          user_id: userId,
          api_secret: apiSecret
        }
        
        const WalleeModule = await import('wallee')
        const Wallee = WalleeModule.default || WalleeModule.Wallee || WalleeModule
        const transactionService = new (Wallee as any).api.TransactionService(config)
        const transactionResponse = await transactionService.read(spaceId, parseInt(transactionId))
        const walleeTransaction = transactionResponse.body
        
        // ✅ WICHTIG: Use the ACTUAL transaction state from API, not the webhook event state!
        // The webhook might say AUTHORIZED, but API might already say FULFILL
        const actualWalleeState = (walleeTransaction as any).state || walleeState
        const actualPaymentStatus = statusMapping[actualWalleeState] || 'pending'
        
        console.log('📋 Wallee transaction details:', {
          id: walleeTransaction.id,
          webhookState: walleeState,
          actualApiState: actualWalleeState,
          webhookPaymentStatus: paymentStatus,
          actualPaymentStatus: actualPaymentStatus,
          merchantReference: (walleeTransaction as any).merchantReference,
          customerId: (walleeTransaction as any).customerId,
          amount: (walleeTransaction as any).lineItems?.[0]?.amountIncludingTax
        })
        
        // Extract appointment ID from merchantReference (format: "appointment-{id}-{timestamp}")
        const merchantRef = (walleeTransaction as any).merchantReference || ''
        const appointmentIdMatch = merchantRef.match(/appointment-([a-f0-9-]+)-\d+/)
        
        if (appointmentIdMatch) {
          const appointmentId = appointmentIdMatch[1]
          console.log('✅ Found appointment ID from merchantReference:', appointmentId)
          
          // Load appointment
          const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', appointmentId)
            .maybeSingle()
          
          if (!aptError && appointment) {
            // Calculate amount in Rappen
            const amountInCHF = (walleeTransaction as any).lineItems?.[0]?.amountIncludingTax || 0
            const amountInRappen = Math.round(amountInCHF * 100)
            
            // Create payment record
            const { data: newPayment, error: createError } = await supabase
              .from('payments')
              .insert({
                appointment_id: appointmentId,
                user_id: appointment.user_id,
                staff_id: appointment.staff_id,
                tenant_id: appointment.tenant_id,
                total_amount_rappen: amountInRappen,
                payment_method: 'wallee',
                payment_status: actualPaymentStatus,  // ✅ Use actual API state, not webhook state
                wallee_transaction_id: transactionId,
                currency: 'CHF',
                description: `Termin: ${appointment.title || 'Fahrstunde'}`,
                paid_at: actualPaymentStatus === 'completed' ? new Date().toISOString() : null,
                metadata: {
                  created_from: 'webhook_auto_create',
                  merchant_reference: merchantRef
                }
              })
              .select()
              .single()
            
            if (!createError && newPayment) {
              console.log('✅ Created payment from transaction metadata:', newPayment.id)
              
              // Confirm appointment if payment completed
              if (paymentStatus === 'completed') {
                await supabase
                  .from('appointments')
                  .update({
                    status: 'confirmed',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', appointmentId)
                
                console.log('✅ Appointment confirmed via webhook')
              }
              
              // Use the newly created payment for further processing
              payments = [newPayment]
            } else {
              console.error('❌ Error creating payment from transaction:', createError)
            }
          } else {
            console.warn('⚠️ Appointment not found:', appointmentId)
          }
        }
      } catch (transactionErr: any) {
        console.warn('⚠️ Could not fetch transaction details from Wallee:', transactionErr.message)
      }
      
      // If still no payment, try to find anonymous sale
      if (!payments || payments.length === 0) {
        console.log('🔍 Payment still not found, checking for anonymous sale...')
        
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
    }
    
    console.log('✅ Payments found:', {
      count: payments.length,
      paymentIds: payments.map(p => p.id),
      currentStatus: payments[0]?.payment_status,
      newStatus: paymentStatus
    })
    
    // ✅ WICHTIG: Verhindere Downgrade zu schlechteren Status
    // Status Priorität: completed > authorized > processing > confirmed > pending > failed/cancelled
    const statusPriority: Record<string, number> = {
      'completed': 5,
      'authorized': 4,
      'processing': 3,
      'confirmed': 2,
      'pending': 1,
      'failed': 0,
      'cancelled': 0
    }
    
    const newStatusPriority = statusPriority[paymentStatus] ?? -1
    const shouldUpdatePayment = (currentStatus: string) => {
      const currentPriority = statusPriority[currentStatus] ?? -1
      const shouldUpdate = newStatusPriority >= currentPriority
      
      if (!shouldUpdate) {
        console.log(`⏭️ Ignoring status downgrade: ${currentStatus} (${currentPriority}) -> ${paymentStatus} (${newStatusPriority})`)
      }
      return shouldUpdate
    }
    
    // Filter payments that should be updated
    const paymentsToUpdate = payments.filter(p => shouldUpdatePayment(p.payment_status))
    
    if (paymentsToUpdate.length === 0) {
      console.log('✅ All payments have better or equal status, skipping update')
      return {
        success: true,
        message: 'Payments status not downgraded',
        transactionId,
        paymentStatus: actualPaymentStatus // ✅ Use actualPaymentStatus
      }
    }
    
    console.log(`📝 Will update ${paymentsToUpdate.length}/${payments.length} payments`)
    
    // Update ALL payments with this transaction ID
    const updateData: any = {
      payment_status: actualPaymentStatus, // ✅ Use actualPaymentStatus from API
      updated_at: new Date().toISOString()
    }
    
    // Set completion timestamp if successful
    if (actualPaymentStatus === 'completed') {
      updateData.paid_at = new Date().toISOString()
    }
    
    // Update nur die Payments die aktualisiert werden sollen (keine Downgrades)
    if (paymentsToUpdate.length > 0) {
      const paymentIdsToUpdate = paymentsToUpdate.map(p => p.id)
      
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
      
      console.log(`✅ ${paymentsToUpdate.length} payment(s) updated to status: ${actualPaymentStatus}`)
    }
    
    // Update appointments ONLY if payments were actually updated AND (completed or authorized)
    // ✅ NUR 'completed' oder 'authorized' = Zahlung wurde tatsächlich verarbeitet
    // 'processing' oder 'pending' oder 'confirmed' = Noch nicht fertig, daher Termin noch NICHT bestätigen
    if ((actualPaymentStatus === 'completed' || actualPaymentStatus === 'authorized') && paymentsToUpdate.length > 0) {
      const appointmentIds = paymentsToUpdate
        .filter(p => p.appointment_id)
        .map(p => p.appointment_id)
      
      if (appointmentIds.length > 0) {
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({
            status: actualPaymentStatus === 'completed' ? 'confirmed' : 'scheduled',
            updated_at: new Date().toISOString()
          })
          .in('id', appointmentIds)
        
        if (appointmentError) {
          console.error('❌ Error updating appointments:', appointmentError)
        } else {
          console.log(`✅ ${appointmentIds.length} appointment(s) updated to status: ${paymentStatus === 'completed' ? 'confirmed' : 'scheduled'}`)
        }
      }
    }
    
    // ✅ Save Wallee payment method token if tokenization was enabled
    // Speichere Token bei authorized oder completed
    if ((paymentStatus === 'completed' || paymentStatus === 'authorized') && payments.length > 0) {
      const firstPayment = payments[0]
      if (firstPayment.user_id && firstPayment.tenant_id) {
        try {
          // Versuche Payment Methods von Wallee zu synchronisieren und zu speichern
          const syncResult = await $fetch('/api/wallee/sync-payment-methods', {
            method: 'POST',
            body: {
              userId: firstPayment.user_id,
              tenantId: firstPayment.tenant_id,
              transactionId: transactionId
            }
          })
          console.log('✅ Attempted to sync payment methods for transaction:', transactionId, syncResult)
          
          // ✅ Prüfe ob dies eine Tokenization-only Transaktion war
          // Wenn ja, storniere die Transaktion automatisch
          const syncResultTyped = syncResult as { success?: boolean; error?: string }
          if (syncResultTyped.success && firstPayment.metadata?.isTokenizationOnly === 'true') {
            try {
              console.log('🔙 Auto-refunding tokenization-only transaction:', transactionId)
              // TODO: Implementiere automatische Stornierung via Wallee API
              // Für jetzt: Markiere Payment als refunded in unserer DB
              await supabase
                .from('payments')
                .update({
                  payment_status: 'refunded',
                  metadata: {
                    ...firstPayment.metadata,
                    auto_refunded: true,
                    refunded_at: new Date().toISOString(),
                    refund_reason: 'Tokenization-only transaction - automatic refund'
                  }
                })
                .eq('id', firstPayment.id)
              
              console.log('✅ Tokenization transaction marked as auto-refunded in DB')
              // TODO: Rufe Wallee Refund API auf, um die Transaktion tatsächlich zu stornieren
            } catch (refundErr: any) {
              console.warn('⚠️ Could not auto-refund tokenization transaction (non-critical):', refundErr.message)
            }
          }
        } catch (tokenErr: any) {
          // Nicht kritisch - Token könnte später gespeichert werden
          console.warn('⚠️ Could not save payment method token (non-critical):', tokenErr.message)
        }
      }
    }

    // Create vouchers if payment completed and products are vouchers
    if (actualPaymentStatus === 'completed') {
      for (const payment of payments) {
        try {
          await createVouchersAfterPayment(payment.id, payment.metadata)
        } catch (voucherErr) {
          console.warn('⚠️ Could not create vouchers for payment:', payment.id, voucherErr)
        }
        
        // ✅ NEW: Auto-credit for credit products (5er/10er Abos)
        try {
          await processCreditProductPurchase(payment)
        } catch (creditErr) {
          console.warn('⚠️ Could not process credit product purchase:', payment.id, creditErr)
        }
      }
    }

    // Send notification email if payment completed (use first payment)
    if (actualPaymentStatus === 'completed' && payments.length > 0) {
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
    if (actualPaymentStatus === 'failed' && payments.length > 0) {
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
      new_status: actualPaymentStatus // ✅ Use actualPaymentStatus
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

  const supabase = getSupabaseAdmin()
  
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

// ✅ NEW: Helper function to process credit product purchases
async function processCreditProductPurchase(payment: any) {
  console.log('💰 Checking for credit product purchase:', payment.id)
  
  if (!payment.user_id) {
    console.log('ℹ️ No user_id in payment, skipping credit processing')
    return
  }

  const supabase = getSupabaseAdmin()
  
  // ✅ NEW: Check for standalone product purchases (from shop)
  if (!payment.appointment_id && payment.metadata?.products) {
    console.log('🛍️ Standalone product purchase detected, checking for credit products...')
    
    const metadataProducts = payment.metadata.products
    
    // ✅ Look up actual product details from database (metadata might be incomplete)
    const productIds = metadataProducts.map((p: any) => p.id)
    const { data: dbProducts, error: dbError } = await supabase
      .from('products')
      .select('id, name, is_credit_product, credit_amount_rappen')
      .in('id', productIds)
    
    if (dbError) {
      console.error('❌ Error fetching products from DB:', dbError)
      return
    }
    
    console.log('📊 Products from DB:', dbProducts)
    
    // Find credit products
    const creditProducts: any[] = []
    for (const metaProduct of metadataProducts) {
      const dbProduct = dbProducts?.find((p: any) => p.id === metaProduct.id)
      if (dbProduct?.is_credit_product === true) {
        creditProducts.push({
          ...metaProduct,
          is_credit_product: dbProduct.is_credit_product,
          credit_amount_rappen: dbProduct.credit_amount_rappen
        })
      }
    }
    
    if (creditProducts.length === 0) {
      console.log('ℹ️ No credit products in standalone purchase')
      return
    }
    
    console.log(`✅ Found ${creditProducts.length} credit product(s) in standalone purchase`)
    
    // Get student_credits
    const { data: studentCredit, error: scError } = await supabase
      .from('student_credits')
      .select('id, balance_rappen')
      .eq('user_id', payment.user_id)
      .single()
    
    if (scError || !studentCredit) {
      console.error('❌ Could not load student_credits:', scError)
      return
    }
    
    // Process each credit product
    for (const product of creditProducts) {
      const creditAmount = (product.credit_amount_rappen || 0) * (product.quantity || 1)
      console.log(`💰 Adding ${creditAmount / 100} CHF from ${product.name}`)
      
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
        console.error('❌ Could not update student credit balance:', updateError)
        continue
      }
      
      // Create credit_transaction
      const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: payment.user_id,
          transaction_type: 'purchase',
          amount_rappen: creditAmount,
          balance_before_rappen: oldBalance,
          balance_after_rappen: newBalance,
          payment_method: 'online',
          reference_id: payment.id,
          reference_type: 'payment',
          created_by: null,
          notes: `Guthaben-Produkt gekauft: ${product.name} (CHF ${(creditAmount / 100).toFixed(2)})`,
          tenant_id: payment.tenant_id,
          status: 'completed'
        })
      
      if (txError) {
        console.error('❌ Could not create credit transaction:', txError)
      } else {
        console.log('✅ Credit added and transaction created')
      }
      
      // Update balance for next iteration
      studentCredit.balance_rappen = newBalance
    }
    
    return
  }
  
  // Original logic for appointment-based purchases
  if (!payment.appointment_id) {
    console.log('ℹ️ No appointment_id and no metadata products, skipping')
    return
  }

  // Load discount_sale to find product_sales
  const { data: discountSale, error: dsError } = await supabase
    .from('discount_sales')
    .select('id')
    .eq('appointment_id', payment.appointment_id)
    .maybeSingle()

  if (dsError || !discountSale) {
    console.log('ℹ️ No discount_sale found, skipping')
    return
  }

  // Load product_sales with product details
  const { data: productSales, error: psError } = await supabase
    .from('product_sales')
    .select(`
      id,
      quantity,
      unit_price_rappen,
      products (
        id,
        name,
        is_credit_product,
        credit_amount_rappen
      )
    `)
    .eq('product_sale_id', discountSale.id)

  if (psError || !productSales || productSales.length === 0) {
    console.log('ℹ️ No product_sales found, skipping')
    return
  }

  // Find credit products
  const creditProducts = productSales.filter(ps => 
    ps.products && (ps.products as any).is_credit_product === true
  )

  if (creditProducts.length === 0) {
    console.log('ℹ️ No credit products in purchase, skipping')
    return
  }

  console.log(`💳 Found ${creditProducts.length} credit product(s) in purchase`)

  // Process each credit product
  for (const productSale of creditProducts) {
    const product = productSale.products as any
    const creditAmount = (product.credit_amount_rappen || 0) * productSale.quantity

    if (creditAmount <= 0) {
      console.warn('⚠️ Credit amount is 0 or negative, skipping product:', product.id)
      continue
    }

    console.log('💰 Processing credit product:', {
      productName: product.name,
      quantity: productSale.quantity,
      creditPerUnit: (product.credit_amount_rappen / 100).toFixed(2),
      totalCredit: (creditAmount / 100).toFixed(2)
    })

    // Load current student credit
    const { data: studentCredit, error: creditError } = await supabase
      .from('student_credits')
      .select('id, balance_rappen')
      .eq('user_id', payment.user_id)
      .single()

    if (creditError || !studentCredit) {
      console.error('❌ Error loading student credit:', creditError)
      continue
    }

    const oldBalance = studentCredit.balance_rappen || 0
    const newBalance = oldBalance + creditAmount

    // Update student credit balance
    const { error: updateError } = await supabase
      .from('student_credits')
      .update({
        balance_rappen: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentCredit.id)

    if (updateError) {
      console.error('❌ Error updating student credit:', updateError)
      continue
    }

    console.log('✅ Credit balance updated:', {
      oldBalance: (oldBalance / 100).toFixed(2),
      creditAdded: (creditAmount / 100).toFixed(2),
      newBalance: (newBalance / 100).toFixed(2)
    })

    // Create credit transaction
    const { error: txError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: payment.user_id,
        transaction_type: 'purchase',
        amount_rappen: creditAmount,
        balance_before_rappen: oldBalance,
        balance_after_rappen: newBalance,
        payment_method: 'purchase',
        reference_id: payment.id,
        reference_type: 'payment',
        created_by: payment.user_id,
        notes: `Guthaben-Produkt gekauft: ${product.name} (${productSale.quantity}x)`,
        tenant_id: payment.tenant_id
      })

    if (txError) {
      console.error('❌ Error creating credit transaction:', txError)
      continue
    }

    console.log('✅ Credit transaction created for product:', product.name)
  }
}
