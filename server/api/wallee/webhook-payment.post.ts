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
    // NOTE: Wallee webhook is configured to report: Fulfill, Authorized, Decline, Voided
    // But we only care about Fulfill (completed) and Decline (failed) for this webhook listener
    const statusMapping: Record<string, string> = {
      'PENDING': 'pending',
      'CONFIRMED': 'processing',
      'PROCESSING': 'processing',
      'AUTHORIZED': 'authorized', // May appear in API, but webhook is configured for Fulfill
      'FULFILL': 'completed', // Final settlement - money actually charged
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
    // Wenn Wallee FULFILL sagt, ist die Transaktion fertig und Geld wurde abgebucht
    let actualPaymentStatus = paymentStatus
    let walleeTransaction: any = null
    
    // ✅ If webhook says FULFILL, trust it! Don't double-check with API
    if (walleeState === 'FULFILL') {
      console.log('✅ Webhook reports FULFILL - payment is completed')
      actualPaymentStatus = 'completed'
    } else {
      // For other states, try to fetch actual state from API for verification
      try {
        console.log('🔍 Fetching actual transaction state from Wallee API for non-FULFILL state...')
        
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
        walleeTransaction = transactionResponse.body
        
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
        console.warn('⚠️ Defaulting actualPaymentStatus to webhook state:', paymentStatus)
        actualPaymentStatus = paymentStatus
      }
    }
    
    console.log(`📋 FINAL STATE BEFORE PAYMENT LOOKUP:`, {
      webhookState: walleeState,
      webhookPaymentStatus: paymentStatus,
      actualPaymentStatus: actualPaymentStatus,
      actualPaymentStatusIsCompleted: actualPaymentStatus === 'completed',
      walleeTransactionFetched: !!walleeTransaction
    })
    
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
    
    const newStatusPriority = statusPriority[actualPaymentStatus] ?? -1
    const shouldUpdatePayment = (currentStatus: string) => {
      const currentPriority = statusPriority[currentStatus] ?? -1
      const shouldUpdate = newStatusPriority >= currentPriority
      
      if (!shouldUpdate) {
        console.log(`⏭️ Ignoring status downgrade: ${currentStatus} (${currentPriority}) -> ${actualPaymentStatus} (${newStatusPriority})`)
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
    
    console.log(`📋 CHECKPOINT: After payment update - actualPaymentStatus is: "${actualPaymentStatus}"`)
    console.log(`📋 IMPORTANT: Now proceeding to voucher and credit product processing...`)
    
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

    // ✅ VOUCHER & CREDIT PRODUCT PROCESSING
    // Create vouchers if payment completed and products are vouchers
    console.log(`🔍 [CRITICAL DEBUG] About to check voucher processing:`)
    console.log(`   - actualPaymentStatus: "${actualPaymentStatus}" (typeof: ${typeof actualPaymentStatus})`)
    console.log(`   - Is string 'completed'?: ${actualPaymentStatus === 'completed'}`)
    console.log(`   - Actual length: ${actualPaymentStatus?.length}`)
    console.log(`   - Charcode at 0: ${actualPaymentStatus?.charCodeAt(0)}`)
    console.log(`   - Trimmed: "${actualPaymentStatus?.trim()}"`)
    console.log(`   - Trimmed === 'completed': ${actualPaymentStatus?.trim() === 'completed'}`)
    
    if (actualPaymentStatus === 'completed') {
      console.log(`✅ [Voucher Processing] Payment status is 'completed', processing vouchers...`)
      for (const payment of payments) {
        console.log(`🎁 [createVouchersAfterPayment] Called for payment: ${payment.id}`)
        console.log(`   - Has metadata: ${!!payment.metadata}`)
        if (payment.metadata) {
          console.log(`   - Metadata type: ${typeof payment.metadata}`)
          console.log(`   - Metadata: ${JSON.stringify(payment.metadata).substring(0, 200)}...`)
        }
        
        try {
          await createVouchersAfterPayment(payment.id, payment.metadata)
        } catch (voucherErr) {
          console.warn('⚠️ Could not create vouchers for payment:', payment.id, voucherErr)
        }
        
        // ✅ NEW: Auto-credit for credit products (5er/10er Abos)
        try {
          console.log('🎁 Processing credit product purchase for payment:', payment.id)
          await processCreditProductPurchase(payment)
          console.log('✅ Credit product purchase processed successfully')
        } catch (creditErr) {
          console.error('❌ ERROR in processCreditProductPurchase:', creditErr)
        }
      }
    } else {
      console.log(`❌ [Voucher Processing] SKIPPED - payment status is NOT 'completed'!`)
      console.log(`   - actualPaymentStatus: "${actualPaymentStatus}"`)
      console.log(`   - Type: ${typeof actualPaymentStatus}`)
      console.log(`   - Length: ${actualPaymentStatus?.length}`)
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

// ✅ NEW: Helper function to process credit product purchases
async function processCreditProductPurchase(payment: any) {
  console.log('🎁 Processing credit product purchase for payment:', payment.id)
  
  if (!payment.metadata?.products || !Array.isArray(payment.metadata.products)) {
    console.log('ℹ️ No products in metadata, skipping credit product processing')
    return
  }

  const supabase = getSupabaseAdmin()
  
  for (const product of payment.metadata.products) {
    try {
      // Check if this product is a credit product (5er/10er Abo)
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('is_credit_product, credit_amount_rappen')
        .eq('id', product.id)
        .single()
      
      if (productError || !productData?.is_credit_product) {
        console.log('ℹ️ Product is not a credit product, skipping:', product.id)
        continue
      }

      // Add credit to student_credits
      const { data: currentCredit, error: creditError } = await supabase
        .from('student_credits')
        .select('balance_rappen')
        .eq('user_id', payment.user_id)
        .eq('tenant_id', payment.tenant_id)
        .single()

      if (creditError) {
        console.error('❌ Error fetching student credit:', creditError)
        continue
      }

      const newBalance = (currentCredit?.balance_rappen || 0) + productData.credit_amount_rappen

      // Update balance
      const { error: updateError } = await supabase
        .from('student_credits')
        .update({ balance_rappen: newBalance })
        .eq('user_id', payment.user_id)
        .eq('tenant_id', payment.tenant_id)

      if (updateError) {
        console.error('❌ Error updating student credit balance:', updateError)
        continue
      }

      // Create credit transaction
      const { error: txError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: payment.user_id,
          transaction_type: 'credit_product_purchase',
          amount_rappen: productData.credit_amount_rappen,
          balance_before_rappen: currentCredit?.balance_rappen || 0,
          balance_after_rappen: newBalance,
          reference_id: payment.id,
          reference_type: 'payment',
          notes: `Credit from ${product.name}`,
          tenant_id: payment.tenant_id
        })

      if (txError) {
        console.error('❌ Error creating credit transaction:', txError)
      } else {
        console.log('✅ Credit added to student:', {
          userId: payment.user_id,
          amountRappen: productData.credit_amount_rappen,
          newBalance
        })
      }
    } catch (err) {
      console.error('❌ Error processing credit product:', err)
    }
  }
}

// Helper function to create vouchers after successful payment
async function createVouchersAfterPayment(paymentId: string, metadata: any) {
  console.log('🎁 Creating vouchers for payment:', paymentId)
  console.log('📦 Metadata:', metadata)
  
  if (!metadata) {
    console.log('ℹ️ Metadata is null/undefined, skipping voucher creation')
    return
  }
  
  if (!metadata?.products) {
    console.log('ℹ️ No products in metadata, skipping voucher creation')
    return
  }

  console.log('🎁 Found products in metadata:', metadata.products.length)
  const voucherProducts = metadata.products.filter((p: any) => {
    console.log(`  - Checking product: ${p.id} (is_voucher=${p.is_voucher})`)
    return p.is_voucher
  })
  console.log(`🎁 Found ${voucherProducts.length} voucher products`)

  if (voucherProducts.length === 0) {
    console.log('ℹ️ No voucher products found, skipping')
    return
  }

  const supabase = getSupabaseAdmin()
  
  // Fetch payment for tenant_id and user_id
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single()

  if (paymentError || !payment) {
    console.error('❌ Payment not found:', paymentError)
    return
  }
  
  for (const product of voucherProducts) {
    try {
      // Generate voucher code
      const { generateVoucherCode } = await import('~/utils/voucherGenerator')
      const voucherCode = generateVoucherCode()
      
      // Create voucher in NEW vouchers table
      const voucherData = {
        code: voucherCode,
        name: product.name,
        description: product.description || '',
        amount_rappen: product.price_rappen,
        recipient_name: metadata.recipient_name,
        recipient_email: metadata.customer_email,
        buyer_name: metadata.customer_name,
        buyer_email: metadata.customer_email,
        payment_id: paymentId,
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        is_active: true,
        tenant_id: payment.tenant_id
      }

      console.log('💾 Creating voucher with data:', voucherData)

      const { data: voucher, error: voucherError } = await supabase
        .from('vouchers')
        .insert(voucherData)
        .select()
        .single()

      if (voucherError) {
        console.error('❌ Error creating voucher:', voucherError)
      } else {
        console.log('✅ Voucher created:', { code: voucher.code, id: voucher.id })
      }
    } catch (err) {
      console.error('❌ Error processing voucher:', err)
    }
  }
}
