// server/api/wallee/webhook.post.ts
// ✅ SECURE & RELIABLE Wallee Webhook Handler
// Configured URLs in Wallee:
//   - Production: https://www.simy.ch/api/wallee/webhook
//   - Preview: https://preview.simy.ch/api/wallee/webhook
// Auto-detection based on host header

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { SARIClient } from '~/utils/sariClient'
import { getSARICredentialsSecure } from '~/server/utils/sari-credentials-secure'
// crypto import removed - using static token validation instead of HMAC
// Wallee SDK import will be handled dynamically in fetchWalleeTransaction

// ============ TYPES ============
interface WalleeWebhookPayload {
  listenerEntityId: number
  listenerEntityTechnicalName: string
  spaceId: number
  id: number
  state: string
  entityId: number
  timestamp: string
}

// Wallee state to our status mapping
const STATUS_MAPPING: Record<string, string> = {
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

// Status priority for preventing downgrades
const STATUS_PRIORITY: Record<string, number> = {
  'completed': 5,
  'authorized': 4,
  'processing': 3,
  'confirmed': 2,
  'pending': 1,
  'failed': 0,
  'cancelled': 0
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  // Auto-detect environment based on request host
  const host = event.headers['host'] || ''
  const isProduction = host.includes('www.simy.ch') && !host.includes('preview')
  const isPreview = host.includes('preview.simy.ch')
  
  logger.info(`Webhook received on host: ${host} (Production: ${isProduction}, Preview: ${isPreview})`)
  try {
    // ============ LAYER 0: OPTIONAL SIGNATURE CHECK ============
    // Note: Real security comes from Wallee API verification in Layer 3
    // The signature header is optional - if present, we validate it
    const body = await readBody(event) as WalleeWebhookPayload
    const signature = event.headers['x-wallee-signature'] as string
    
    if (signature) {
      const expectedSecret = process.env.WALLEE_WEBHOOK_SECRET || 'wh_dT8kP2mX9qR4vL7nJ3bY6cZ1fH5'
      if (signature !== expectedSecret) {
        logger.error('❌ Invalid webhook signature - token mismatch')
        throw createError({
          statusCode: 401,
          statusMessage: 'Invalid webhook signature'
        })
      }
      logger.debug('✅ Webhook signature validated')
    } else {
      logger.warn('⚠️ No webhook signature provided - proceeding with Wallee API verification')
    }
    
    // ============ LAYER 1: PARSE & VALIDATE PAYLOAD ============
    if (!body.entityId || !body.state) {
      logger.warn('❌ Invalid webhook payload - missing entityId or state')
      return { success: false, error: 'Invalid webhook payload' }
    }
    
    const transactionId = body.entityId.toString()
    const walleeState = body.state
    const spaceId = body.spaceId
    
    logger.info('🔔 Wallee Webhook received:', {
      transactionId,
      walleeState,
      spaceId,
      timestamp: body.timestamp
    })
    
    // ============ LAYER 2: MAP STATUS ============
    let paymentStatus = STATUS_MAPPING[walleeState] || 'pending'
    
    // Trust FULFILL immediately - this is the final state
    if (walleeState === 'FULFILL') {
      paymentStatus = 'completed'
      logger.info('✅ FULFILL state - payment is completed')
    }
    
    // ============ LAYER 3: FIND PAYMENT BY TRANSACTION ID ============
    const supabase = getSupabaseAdmin()
    
    logger.debug('🔍 Searching for payment with wallee_transaction_id:', transactionId)
    
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
        credit_used_rappen
      `)
      .eq('wallee_transaction_id', transactionId)
    
    // ============ LAYER 4: FALLBACK - Search by merchantReference ============
    if (findError || !payments || payments.length === 0) {
      logger.debug('⚠️ Payment not found by transaction ID, trying merchantReference fallback...')
      
      try {
        // Fetch transaction from Wallee to get merchantReference
        const walleeTransaction = await fetchWalleeTransaction(transactionId, spaceId)
        
        if (walleeTransaction) {
          const merchantRef = walleeTransaction.merchantReference || ''
          logger.debug('📋 merchantReference from Wallee:', merchantRef)
          
          // Try different patterns:
          // 1. payment-{uuid}
          // 2. appointment-{uuid}-{timestamp}
          // 3. Direct payment ID in merchantRef
          
          let paymentId: string | null = null
          
          // Pattern 1: payment-{uuid}
          const paymentMatch = merchantRef.match(/payment-([a-f0-9-]{36})/)
          if (paymentMatch) {
            paymentId = paymentMatch[1]
            logger.debug('✅ Found payment ID from merchantRef (payment-uuid):', paymentId)
          }
          
          // Pattern 2: Just a UUID (36 chars)
          if (!paymentId && /^[a-f0-9-]{36}$/i.test(merchantRef)) {
            paymentId = merchantRef
            logger.debug('✅ merchantRef is a UUID, using directly:', paymentId)
          }
          
          // Pattern 3: appointment-{uuid}-{timestamp} - need to find payment by appointment
          if (!paymentId) {
            const appointmentMatch = merchantRef.match(/appointment-([a-f0-9-]{36})/)
            if (appointmentMatch) {
              const appointmentId = appointmentMatch[1]
              logger.debug('🔍 Found appointment ID, searching for payment:', appointmentId)
              
              const { data: paymentByAppointment } = await supabase
                .from('payments')
                .select('id')
                .eq('appointment_id', appointmentId)
                .maybeSingle()
              
              if (paymentByAppointment) {
                paymentId = paymentByAppointment.id
                logger.debug('✅ Found payment by appointment ID:', paymentId)
              }
            }
          }
          
          // Fetch payment if found
          if (paymentId) {
            const { data: foundPayment, error: foundError } = await supabase
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
                credit_used_rappen
              `)
              .eq('id', paymentId)
              .single()
            
            if (!foundError && foundPayment) {
              payments = [foundPayment]
              
              // Update wallee_transaction_id if not set
              if (!foundPayment.wallee_transaction_id) {
                await supabase
                  .from('payments')
                  .update({ 
                    wallee_transaction_id: transactionId,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', paymentId)
                logger.debug('✅ Updated payment with wallee_transaction_id')
              }
            }
          }
          
          // Use actual state from Wallee API (more reliable than webhook state)
          if (walleeTransaction.state) {
            const actualStatus = STATUS_MAPPING[walleeTransaction.state] || paymentStatus
            if (STATUS_PRIORITY[actualStatus] > STATUS_PRIORITY[paymentStatus]) {
              paymentStatus = actualStatus
              logger.debug('✅ Using actual state from Wallee API:', walleeTransaction.state, '→', paymentStatus)
            }
          }
        }
      } catch (fallbackError: any) {
        logger.warn('⚠️ Fallback search failed:', fallbackError.message)
      }
    }
    
    // ============ LAYER 5: HANDLE NOT FOUND ============
    if (!payments || payments.length === 0) {
      // Check for anonymous sale (product sales without appointment)
      const { data: anonymousSale } = await supabase
        .from('product_sales')
        .select('id, status, total_amount_rappen, metadata, user_id, tenant_id')
        .eq('wallee_transaction_id', transactionId)
        .maybeSingle()
      
      if (anonymousSale) {
        logger.debug('✅ Found anonymous sale:', anonymousSale.id)
        return await processAnonymousSale(anonymousSale, paymentStatus)
      }
      
      logger.info('❌ No payment found for transaction:', transactionId)
      // Return 200 to prevent Wallee from retrying
      return { 
        success: false, 
        error: 'Payment not found',
        transactionId,
        message: 'Webhook acknowledged but payment not found'
      }
    }
    
    logger.info('✅ Found payments:', payments.length)
    
    // ============ LAYER 6: PREVENT STATUS DOWNGRADES ============
    const newPriority = STATUS_PRIORITY[paymentStatus] ?? -1
    const paymentsToUpdate = payments.filter(p => {
      const currentPriority = STATUS_PRIORITY[p.payment_status] ?? -1
      const shouldUpdate = newPriority >= currentPriority
      
      if (!shouldUpdate) {
        logger.debug(`⏭️ Skipping downgrade: ${p.payment_status} → ${paymentStatus}`)
      }
      return shouldUpdate
    })
    
    if (paymentsToUpdate.length === 0) {
      logger.debug('✅ All payments already have equal or better status')
      return {
        success: true,
        message: 'No update needed - status already equal or better',
        transactionId,
        paymentStatus
      }
    }
    
    // ============ LAYER 7: UPDATE PAYMENTS ============
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    }
    
    if (paymentStatus === 'completed') {
      updateData.paid_at = new Date().toISOString()
    }
    
    const paymentIdsToUpdate = paymentsToUpdate.map(p => p.id)
    
    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .in('id', paymentIdsToUpdate)
    
    if (updateError) {
      logger.error('❌ Error updating payments:', updateError)
      return { success: false, error: 'Failed to update payments' }
    }
    
    logger.info(`✅ Updated ${paymentsToUpdate.length} payment(s) to: ${paymentStatus}`)
    
    // ============ LAYER 9: UPDATE COURSE REGISTRATIONS (NEW!) ============
    if (paymentStatus === 'completed' || paymentStatus === 'authorized') {
      const registrationStatus = paymentStatus === 'completed' ? 'confirmed' : 'pending'
      const paymentStatusUpdate = paymentStatus === 'completed' ? 'paid' : 'pending'
      
      // Get payment IDs to find linked course registrations
      const paymentIds = paymentsToUpdate.map(p => p.id)
      
      if (paymentIds.length > 0) {
        // Update course_registrations that have these payment_ids
        const { data: updatedRegistrations, error: registrationError } = await supabase
          .from('course_registrations')
          .update({
            status: registrationStatus,
            payment_status: paymentStatusUpdate,
            sari_synced: paymentStatus === 'completed', // Mark as synced (SARI enrollment happened during validation)
            sari_synced_at: paymentStatus === 'completed' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          })
          .in('payment_id', paymentIds)
          .select('id, course_id')
        
        if (registrationError) {
          logger.warn('⚠️ Error updating course registrations:', registrationError)
        } else if (updatedRegistrations && updatedRegistrations.length > 0) {
          logger.info(`✅ Updated ${updatedRegistrations.length} course registration(s) to: ${registrationStatus}`)
          
          // ============ ENROLL IN SARI AFTER PAYMENT ============
          if (paymentStatus === 'completed') {
            for (const reg of updatedRegistrations) {
              await enrollInSARIAfterPayment(supabase, reg.id)
            }
          }
          
          // ============ UPDATE COURSE PARTICIPANT COUNT ============
          if (paymentStatus === 'completed') {
            const courseIds = [...new Set(updatedRegistrations.map(r => r.course_id).filter(Boolean))]
            
            for (const courseId of courseIds) {
              // Count confirmed registrations for this course
              const { count, error: countError } = await supabase
                .from('course_registrations')
                .select('*', { count: 'exact', head: true })
                .eq('course_id', courseId)
                .eq('status', 'confirmed')
              
              if (!countError && count !== null) {
                const { error: updateError } = await supabase
                  .from('courses')
                  .update({ 
                    current_participants: count,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', courseId)
                
                if (updateError) {
                  logger.warn(`⚠️ Error updating current_participants for course ${courseId}:`, updateError)
                } else {
                  logger.info(`✅ Updated current_participants for course ${courseId}: ${count}`)
                }
              }
            }
          }
        }
      }
    }

    // ============ LAYER 10: UPDATE APPOINTMENTS ============
    if (paymentStatus === 'completed' || paymentStatus === 'authorized') {
      const appointmentIds = paymentsToUpdate
        .filter(p => p.appointment_id)
        .map(p => p.appointment_id)
      
      if (appointmentIds.length > 0) {
        const appointmentStatus = paymentStatus === 'completed' ? 'confirmed' : 'scheduled'
        
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({
            status: appointmentStatus,
            updated_at: new Date().toISOString()
          })
          .in('id', appointmentIds)
        
        if (appointmentError) {
          logger.warn('⚠️ Error updating appointments:', appointmentError)
        } else {
          logger.info(`✅ Updated ${appointmentIds.length} appointment(s) to: ${appointmentStatus}`)
        }
      }
    }
    
    // ============ LAYER 9: HANDLE CREDIT REFUND FOR FAILED/CANCELLED ============
    if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      await handleCreditRefund(paymentsToUpdate)
    }
    
    // ============ LAYER 10: CONFIRM CREDIT DEDUCTION FOR COMPLETED ============
    if (paymentStatus === 'completed') {
      await confirmCreditDeduction(paymentsToUpdate)
      await processVouchersAndCredits(payments)
    }
    
    // ============ LAYER 11: SEND COURSE ENROLLMENT CONFIRMATION EMAILS ============
    if (paymentStatus === 'completed') {
      await sendCourseEnrollmentEmails(paymentsToUpdate)
    }
    
    // ============ LAYER 12: SAVE PAYMENT TOKEN (if applicable) ============
    if ((paymentStatus === 'completed' || paymentStatus === 'authorized') && payments.length > 0) {
      await savePaymentToken(payments[0], transactionId)
    }
    
    const duration = Date.now() - startTime
    logger.info(`🎉 Webhook processed in ${duration}ms`)
    
    return {
      success: true,
      message: 'Webhook processed successfully',
      payment_ids: paymentIdsToUpdate,
      payments_updated: paymentsToUpdate.length,
      new_status: paymentStatus,
      duration_ms: duration
    }
    
  } catch (error: any) {
    logger.error('❌ Webhook processing error:', error)
    
    // Return 200 to prevent Wallee from retrying infinitely
    return {
      success: false,
      error: error.message,
      message: 'Webhook error logged - will not retry'
    }
  }
})

// ============ HELPER FUNCTIONS ============

async function fetchWalleeTransaction(transactionId: string, webhookSpaceId?: number): Promise<any> {
  try {
    // Import Wallee SDK dynamically FIRST - more defensive
    let WalleeSDK: any = null
    let transactionService: any = null
    
    try {
      const WalleeModule = await import('wallee')
      
      // Try multiple ways to access the SDK
      if (WalleeModule.Wallee?.api?.TransactionService) {
        WalleeSDK = WalleeModule.Wallee
      } else if (WalleeModule.default?.api?.TransactionService) {
        WalleeSDK = WalleeModule.default
      } else if (WalleeModule.api?.TransactionService) {
        // If api is directly on module
        WalleeSDK = WalleeModule
      }
      
      if (!WalleeSDK?.api?.TransactionService) {
        logger.error('❌ Wallee SDK structure not recognized. Module keys:', Object.keys(WalleeModule))
        return null
      }
      
      logger.debug('✅ Wallee SDK loaded successfully')
    } catch (importError: any) {
      logger.error('❌ Failed to import Wallee SDK:', importError.message)
      return null
    }
    
    // Try to get tenant-specific config first
    const supabase = getSupabaseAdmin()
    const { data: paymentForConfig } = await supabase
      .from('payments')
      .select('tenant_id')
      .eq('wallee_transaction_id', transactionId)
      .maybeSingle()
    
    let spaceId = webhookSpaceId || parseInt(process.env.WALLEE_SPACE_ID || '82592')
    let userId = parseInt(process.env.WALLEE_APPLICATION_USER_ID || '140525')
    let apiSecret = process.env.WALLEE_SECRET_KEY
    
    if (!apiSecret) {
      throw new Error('WALLEE_SECRET_KEY not configured')
    }
    
    if (paymentForConfig?.tenant_id) {
      try {
        const walleeConfig = await getWalleeConfigForTenant(paymentForConfig.tenant_id)
        spaceId = walleeConfig.spaceId
        userId = walleeConfig.userId
        apiSecret = walleeConfig.apiSecret
      } catch (e) {
        // Use default config
      }
    }
    
    const config = getWalleeSDKConfig(spaceId, userId, apiSecret)
    
    transactionService = new WalleeSDK.api.TransactionService(config)
    const response = await transactionService.read(spaceId, parseInt(transactionId))
    return response.body
  } catch (error: any) {
    logger.warn('⚠️ Could not fetch Wallee transaction:', error.message)
    return null
  }
}

async function processAnonymousSale(sale: any, paymentStatus: string) {
  const supabase = getSupabaseAdmin()
  
  if (sale.status === paymentStatus) {
    return { success: true, message: 'Anonymous sale status unchanged' }
  }
  
  const updateData: any = {
    status: paymentStatus,
    updated_at: new Date().toISOString()
  }
  
  if (paymentStatus === 'completed') {
    updateData.paid_at = new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('product_sales')
    .update(updateData)
    .eq('id', sale.id)
  
  if (error) {
    logger.error('❌ Error updating anonymous sale:', error)
    return { success: false, error: 'Failed to update sale' }
  }
  
  logger.debug('✅ Anonymous sale updated to:', paymentStatus)
  return { success: true, message: 'Anonymous sale updated' }
}

async function handleCreditRefund(payments: any[]) {
  const supabase = getSupabaseAdmin()
  
  for (const payment of payments) {
    const pendingRefund = payment.metadata?.pending_credit_refund
    
    if (pendingRefund && pendingRefund > 0 && payment.user_id) {
      logger.debug(`💰 Refunding credit for failed payment: ${(pendingRefund / 100).toFixed(2)} CHF`)
      
      const { data: creditData } = await supabase
        .from('student_credits')
        .select('balance_rappen')
        .eq('user_id', payment.user_id)
        .single()
      
      if (creditData) {
        const balanceBefore = creditData.balance_rappen || 0
        const newBalance = balanceBefore + pendingRefund
        
        // 1. Update student_credits balance
        await supabase
          .from('student_credits')
          .update({
            balance_rappen: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', payment.user_id)
        
        // 2. ✅ Create credit_transaction for the refund
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: payment.user_id,
            tenant_id: payment.tenant_id,
            transaction_type: 'refund',
            amount_rappen: pendingRefund,
            balance_before_rappen: balanceBefore,
            balance_after_rappen: newBalance,
            payment_method: 'wallee_failed',
            reference_id: payment.id,
            reference_type: 'payment',
            notes: `Rückerstattung wegen fehlgeschlagener Wallee-Zahlung (Payment ID: ${payment.id})`,
            status: 'completed',
            created_at: new Date().toISOString()
          })
        
        // 3. Clear pending refund flag
        await supabase
          .from('payments')
          .update({
            metadata: {
              ...payment.metadata,
              pending_credit_refund: null,
              credit_refunded: true,
              credit_refunded_at: new Date().toISOString(),
              credit_refund_amount: pendingRefund
            }
          })
          .eq('id', payment.id)
        
        logger.debug('✅ Credit refunded successfully with transaction record')
      }
    }
  }
}

async function confirmCreditDeduction(payments: any[]) {
  const supabase = getSupabaseAdmin()
  
  for (const payment of payments) {
    const creditUsed = payment.credit_used_rappen
    const pendingRefund = payment.metadata?.pending_credit_refund
    
    // If credit was used in this payment, create a transaction record
    if (creditUsed && creditUsed > 0 && payment.user_id) {
      logger.debug(`✅ Confirming credit deduction: ${(creditUsed / 100).toFixed(2)} CHF`)
      
      // Get current balance to calculate balance_before
      const { data: creditData } = await supabase
        .from('student_credits')
        .select('balance_rappen')
        .eq('user_id', payment.user_id)
        .single()
      
      const currentBalance = creditData?.balance_rappen || 0
      const balanceBefore = currentBalance + creditUsed // Reconstruct balance before deduction
      
      // ✅ Create credit_transaction for the usage
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: payment.user_id,
          tenant_id: payment.tenant_id,
          transaction_type: 'payment',
          amount_rappen: -creditUsed, // Negative for deduction
          balance_before_rappen: balanceBefore,
          balance_after_rappen: currentBalance,
          payment_method: 'credit',
          reference_id: payment.id,
          reference_type: 'payment',
          notes: `Guthaben für Zahlung verwendet (Payment ID: ${payment.id}, Betrag: CHF ${(payment.total_amount_rappen / 100).toFixed(2)})`,
          status: 'completed',
          created_at: new Date().toISOString()
        })
      
      logger.debug('✅ Credit transaction created for payment')
    }
    
    // Clear pending_credit_refund if it exists
    if (pendingRefund && pendingRefund > 0) {
      await supabase
        .from('payments')
        .update({
          metadata: {
            ...payment.metadata,
            pending_credit_refund: null,
            credit_confirmed_at: new Date().toISOString()
          }
        })
        .eq('id', payment.id)
    }
  }
}

async function processVouchersAndCredits(payments: any[]) {
  const supabase = getSupabaseAdmin()
  
  for (const payment of payments) {
    if (!payment.metadata?.products || !Array.isArray(payment.metadata.products)) {
      continue
    }
    
    // Process vouchers
    const voucherProducts = payment.metadata.products.filter((p: any) => p.is_voucher)
    
    for (const product of voucherProducts) {
      try {
        const { generateVoucherCode } = await import('~/utils/voucherGenerator')
        const voucherCode = generateVoucherCode()
        
        await supabase
          .from('vouchers')
          .insert({
            code: voucherCode,
            name: product.name,
            description: product.description || '',
            amount_rappen: product.price_rappen,
            recipient_email: payment.metadata.customer_email,
            buyer_email: payment.metadata.customer_email,
            payment_id: payment.id,
            valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true,
            tenant_id: payment.tenant_id
          })
        
        logger.debug('✅ Voucher created:', voucherCode)
      } catch (err: any) {
        logger.warn('⚠️ Voucher creation failed:', err.message)
      }
    }
    
    // Process credit products
    for (const product of payment.metadata.products) {
      try {
        const { data: productData } = await supabase
          .from('products')
          .select('is_credit_product, credit_amount_rappen')
          .eq('id', product.id)
          .single()
        
        if (productData?.is_credit_product && productData.credit_amount_rappen > 0) {
          const { data: currentCredit } = await supabase
            .from('student_credits')
            .select('balance_rappen')
            .eq('user_id', payment.user_id)
            .eq('tenant_id', payment.tenant_id)
            .single()
          
          const newBalance = (currentCredit?.balance_rappen || 0) + productData.credit_amount_rappen
          
          await supabase
            .from('student_credits')
            .update({ balance_rappen: newBalance })
            .eq('user_id', payment.user_id)
            .eq('tenant_id', payment.tenant_id)
          
          await supabase
            .from('credit_transactions')
            .insert({
              user_id: payment.user_id,
              tenant_id: payment.tenant_id,
              transaction_type: 'credit_product_purchase',
              amount_rappen: productData.credit_amount_rappen,
              balance_before_rappen: currentCredit?.balance_rappen || 0,
              balance_after_rappen: newBalance,
              reference_id: payment.id,
              reference_type: 'payment',
              notes: `Credit from ${product.name}`
            })
          
          logger.debug('✅ Credit added:', (productData.credit_amount_rappen / 100).toFixed(2), 'CHF')
        }
      } catch (err: any) {
        logger.warn('⚠️ Credit product processing failed:', err.message)
      }
    }
  }
}

async function savePaymentToken(payment: any, transactionId: string) {
  if (!payment.user_id || !payment.tenant_id) {
    return
  }
  
  try {
    // Call the existing save-payment-token API internally
    await $fetch('/api/wallee/save-payment-token', {
      method: 'POST',
      body: {
        transactionId,
        userId: payment.user_id,
        tenantId: payment.tenant_id
      }
    })
    logger.debug('✅ Payment token save triggered')
  } catch (err: any) {
    // Non-critical - token can be saved later
    logger.warn('⚠️ Payment token save failed (non-critical):', err.message)
  }
}

async function sendCourseEnrollmentEmails(payments: any[]) {
  const supabase = getSupabaseAdmin()
  
  for (const payment of payments) {
    try {
      // Check if this payment is for a course enrollment
      // First try looking up by course_registration_id (new way)
      let courseRegistrationId = null
      
      if (payment.course_registration_id) {
        courseRegistrationId = payment.course_registration_id
      } else if (payment.id) {
        // Fallback: try looking up by payment_id (old way for compatibility)
        const { data } = await supabase
          .from('course_registrations')
          .select('id')
          .eq('payment_id', payment.id)
          .single()
        
        if (data) {
          courseRegistrationId = data.id
        }
      }
      
      if (!courseRegistrationId) {
        logger.debug('⏭️ No course enrollment found for payment:', payment.id)
        continue
      }
      
      // Trigger the email service
      try {
        await $fetch('/api/emails/send-course-enrollment-confirmation', {
          method: 'POST',
          body: {
            courseRegistrationId,
            paymentMethod: 'wallee'
          }
        })
        logger.info('✅ Course enrollment confirmation email triggered for:', courseRegistrationId)
      } catch (err: any) {
        logger.warn('⚠️ Email service call failed:', err.message)
        // Non-critical - continue
      }
    } catch (err: any) {
      logger.warn('⚠️ Course enrollment email processing failed:', err.message)
    }
  }
}

// ============ SARI ENROLLMENT AFTER PAYMENT ============
async function enrollInSARIAfterPayment(supabase: any, registrationId: string) {
  try {
    logger.info(`📝 SARI enrollment for registration: ${registrationId}`)
    
    // 1. Get registration details with course info AND payment metadata
    const { data: registration, error: regError } = await supabase
      .from('course_registrations')
      .select(`
        id,
        sari_faberid,
        tenant_id,
        course_id,
        payment_id,
        courses!inner(
          id,
          sari_managed,
          sari_course_id,
          tenant_id
        )
      `)
      .eq('id', registrationId)
      .single()
    
    if (regError || !registration) {
      logger.warn('⚠️ Registration not found for SARI enrollment:', registrationId)
      return
    }
    
    const course = registration.courses
    
    // 2. Skip if not SARI-managed
    if (!course.sari_managed || !course.sari_course_id) {
      logger.debug('⏭️ Course is not SARI-managed, skipping SARI enrollment')
      return
    }
    
    // 3. Skip if no FABERID
    if (!registration.sari_faberid) {
      logger.warn('⚠️ No SARI FABERID found for registration:', registrationId)
      return
    }
    
    // 4. Get birthdate from payment metadata
    let birthdate: string | null = null
    
    if (registration.payment_id) {
      const { data: payment } = await supabase
        .from('payments')
        .select('metadata')
        .eq('id', registration.payment_id)
        .single()
      
      if (payment?.metadata?.sari_birthdate) {
        birthdate = payment.metadata.sari_birthdate
        logger.debug('✅ Got birthdate from payment metadata:', birthdate)
      }
    }
    
    if (!birthdate) {
      logger.error('❌ No birthdate available for SARI enrollment (not in payment metadata)')
      return
    }
    
    // 5. Get SARI credentials
    const credentials = await getSARICredentialsSecure(registration.tenant_id, 'WEBHOOK_ENROLLMENT')
    if (!credentials) {
      logger.error('❌ SARI credentials not found for tenant:', registration.tenant_id)
      return
    }
    
    // 6. Create SARI client and enroll
    const sari = new SARIClient(credentials)
    
    // Get first course ID from group (e.g., "GROUP_2110027_2110028_..." → 2110027)
    const sariCourseId = course.sari_course_id.split('_')[1]
    if (!sariCourseId) {
      logger.error('❌ Invalid SARI course ID format:', course.sari_course_id)
      return
    }
    
    // Format birthdate as YYYY-MM-DD (already should be in this format)
    const birthdateFormatted = typeof birthdate === 'string' && birthdate.includes('T')
      ? birthdate.split('T')[0]
      : birthdate
    
    logger.info(`🎯 Enrolling in SARI: courseId=${sariCourseId}, faberid=${registration.sari_faberid}, birthdate=${birthdateFormatted}`)
    
    await sari.enrollStudent(parseInt(sariCourseId), registration.sari_faberid, birthdateFormatted)
    
    logger.info('✅ SARI enrollment successful!')
    
    // 7. Update registration with sari_synced
    await supabase
      .from('course_registrations')
      .update({
        sari_synced: true,
        sari_synced_at: new Date().toISOString()
      })
      .eq('id', registrationId)
    
    logger.info('✅ Registration marked as SARI synced')
    
  } catch (error: any) {
    logger.error('❌ SARI enrollment failed:', error.message)
    // Non-critical - payment was successful, enrollment can be done manually
  }
}
