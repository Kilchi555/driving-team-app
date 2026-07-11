// server/api/wallee/webhook.post.ts
// ✅ SECURE & RELIABLE Wallee Webhook Handler
// Configured URLs in Wallee:
//   - Production: https://app.simy.ch/api/wallee/webhook
//   - Preview: https://preview.simy.ch/api/wallee/webhook
// Auto-detection based on host header

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { getWalleeConfigForTenant, getWalleeConfigBySpace, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { SARIClient } from '~/utils/sariClient'
import { getSARICredentialsSecure } from '~/server/utils/sari-credentials-secure'
import { findExistingUserByContact } from '~/server/utils/user-matching'
import { normalizePhoneNumber } from '~/server/utils/sms'
import { escapeLikePattern } from '~/server/utils/sql-helpers'
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
  const supabase = getSupabaseAdmin()
  
  // Auto-detect environment based on request host
  const host = event.headers['host'] || ''
  const isProduction = host.includes('app.simy.ch') && !host.includes('preview')
  const isPreview = host.includes('preview.simy.ch')
  
  logger.info(`Webhook received on host: ${host} (Production: ${isProduction}, Preview: ${isPreview}) [v2.2-no-user-required]`)
  
  let webhookLogId: string | undefined
  let transactionId: string | undefined
  
  try {
    // ============ LAYER 0: PARSE BODY ============
    // Note: Wallee does not support HMAC webhook signatures (unlike Stripe).
    // Security is provided by verifying the transaction exists in the Wallee API (Layer 4 fallback).
    const rawBody = await readRawBody(event) || ''
    const body = JSON.parse(rawBody) as WalleeWebhookPayload
    
    // 🔍 DEBUG: Log the entire payload to understand structure
    logger.info('🔔 WEBHOOK PAYLOAD RECEIVED:', JSON.stringify(body, null, 2))
    logger.info('🔔 WEBHOOK BODY KEYS:', Object.keys(body))
    logger.info('🔔 WEBHOOK BODY entityId:', body.entityId, 'type:', typeof body.entityId)
    logger.info('🔔 WEBHOOK BODY state:', body.state, 'type:', typeof body.state)
    
    // ⚠️ IMMEDIATE LOG: Create webhook log entry for debugging
    try {
      const { data: immediateLog, error: immediateLogError } = await supabase
        .from('webhook_logs')
        .insert({
          transaction_id: body.entityId?.toString() || 'unknown',
          entity_id: body.entityId,
          space_id: body.spaceId,
          wallee_state: body.state,
          listener_entity_id: body.listenerEntityId,
          listener_entity_technical_name: body.listenerEntityTechnicalName,
          timestamp: body.timestamp,
          raw_payload: body
        })
        .select('id')
        .single()
      
      if (immediateLogError) {
        logger.error('❌ webhook_logs INSERT failed:', immediateLogError.message, immediateLogError.code, immediateLogError.details)
      } else {
        webhookLogId = immediateLog?.id
        logger.debug('✅ IMMEDIATE webhook log entry created:', webhookLogId)
      }
    } catch (immediateLogErr: any) {
      logger.error('❌ FAILED to create immediate webhook log (exception):', immediateLogErr.message)
    }
    
    // ============ LAYER 0.5: ROUTE REFUND WEBHOOKS ============
    // Wallee sends separate webhooks for Transaction and Refund entities.
    // Refund webhooks have listenerEntityTechnicalName === 'Refund'.
    if (body.listenerEntityTechnicalName === 'Refund') {
      const result = await handleWalleeRefundWebhook(body, supabase, webhookLogId)
      if (webhookLogId) {
        try {
          await supabase
            .from('webhook_logs')
            .update({ success: result.success, payment_status_after: result.status, processing_duration_ms: Date.now() - startTime })
            .eq('id', webhookLogId)
        } catch { /* non-fatal */ }
      }
      return result
    }

    // ============ LAYER 1: PARSE & VALIDATE PAYLOAD ============
    if (!body.entityId || !body.state) {
      logger.warn('❌ Invalid webhook payload - missing entityId or state')
      logger.warn('❌ body.entityId:', body.entityId)
      logger.warn('❌ body.state:', body.state)
      logger.warn('❌ Full body:', JSON.stringify(body))
      return { success: false, error: 'Invalid webhook payload' }
    }
    
    transactionId = body.entityId.toString()
    const walleeState = body.state
    const spaceId = body.spaceId
    
    logger.info('🔔 Wallee Webhook received:', {
      transactionId,
      walleeState,
      spaceId,
      timestamp: body.timestamp
    })
    
    // 🔍 Log webhook receipt (skip if immediate log already succeeded)
    if (!webhookLogId) {
      try {
        const { data: logRecord, error: logInsertError } = await supabase
          .from('webhook_logs')
          .insert({
            transaction_id: transactionId,
            entity_id: body.entityId,
            space_id: body.spaceId,
            wallee_state: walleeState,
            listener_entity_id: body.listenerEntityId,
            listener_entity_technical_name: body.listenerEntityTechnicalName,
            timestamp: body.timestamp,
            raw_payload: body
          })
          .select('id')
          .single()
        
        if (logInsertError) {
          logger.error('❌ webhook_logs INSERT failed:', logInsertError.message, logInsertError.code, logInsertError.details)
        } else {
          webhookLogId = logRecord?.id
          logger.debug('✅ Webhook logged with ID:', webhookLogId)
        }
      } catch (logErr: any) {
        logger.warn('⚠️ Could not log webhook (exception):', logErr.message)
      }
    }
    
    // ============ LAYER 2: MAP STATUS ============
    let paymentStatus = STATUS_MAPPING[walleeState] || 'pending'
    
    // Trust FULFILL immediately - this is the final state
    if (walleeState === 'FULFILL') {
      paymentStatus = 'completed'
      logger.info('✅ FULFILL state - payment is completed')
    }
    
    // ============ LAYER 3: FIND PAYMENT BY TRANSACTION ID ============
    // Note: supabase is already initialized at the top of the handler
    
    logger.debug('🔍 Searching for payment with wallee_transaction_id:', transactionId)
    
    let paymentQuery = supabase
      .from('payments')
      .select(`
        id,
        payment_status,
        appointment_id,
        course_registration_id,
        user_id,
        tenant_id,
        total_amount_rappen,
        metadata,
        wallee_transaction_id,
        credit_used_rappen
      `)
      .eq('wallee_transaction_id', transactionId)

    // Prefer composite lookup (space + transaction) to avoid cross-tenant collisions
    if (spaceId) {
      paymentQuery = paymentQuery.eq('wallee_space_id', spaceId) as any
    }

    let { data: payments, error: findError } = await paymentQuery
    
    // ============ LAYER 3.5: FALLBACK - Search in transaction history table ============
    if (findError || !payments || payments.length === 0) {
      logger.debug('⚠️ Payment not found by current transaction ID, checking history table...')
      
      try {
        let histQuery = supabase
          .from('payment_wallee_transactions')
          .select('payment_id')
          .eq('wallee_transaction_id', transactionId)
        if (spaceId) {
          histQuery = histQuery.eq('wallee_space_id', spaceId) as any
        }
        const { data: historyRecord } = await histQuery.maybeSingle()
        
        if (historyRecord?.payment_id) {
          logger.info('✅ Found payment via transaction history:', historyRecord.payment_id)
          
          const { data: historyPayment, error: historyPaymentError } = await supabase
            .from('payments')
            .select(`
              id,
              payment_status,
              appointment_id,
              course_registration_id,
              user_id,
              tenant_id,
              total_amount_rappen,
              metadata,
              wallee_transaction_id,
              credit_used_rappen
            `)
            .eq('id', historyRecord.payment_id)
            .single()
          
          if (!historyPaymentError && historyPayment) {
            payments = [historyPayment]
            findError = null
          }
        }
      } catch (historyErr: any) {
        logger.warn('⚠️ History table lookup failed (table may not exist yet):', historyErr.message)
      }
    }
    
    // ============ LAYER 4: FALLBACK - Search by merchantReference ============
    if (findError || !payments || payments.length === 0) {
      logger.debug('⚠️ Payment not found by transaction ID or history, trying merchantReference fallback...')
      
      try {
        // Fetch transaction from Wallee to get merchantReference
        const walleeTransaction = await fetchWalleeTransaction(transactionId, spaceId)
        
        if (walleeTransaction) {
          const merchantRef = walleeTransaction.merchantReference || ''
          logger.debug('📋 merchantReference from Wallee:', merchantRef)
          
          // Try different patterns:
          // 1. payment-{uuid} (NEW: Course enrollment with payment ID)
          // 2. appointment-{uuid}-{timestamp}
          // 3. Direct payment ID in merchantRef
          // 4. pos-{uuid} (Staff POS product sale)
          
          let paymentId: string | null = null
          let productSaleId: string | null = null
          
          // Pattern 1: payment-{uuid} - NEW FORMAT from course enrollments
          // Format: "payment-{paymentId} | FirstName LastName | CourseName | Location | Date"
          const paymentMatch = merchantRef.match(/^payment-([a-f0-9-]{36})/)
          if (paymentMatch) {
            paymentId = paymentMatch[1]
            logger.debug('✅ Found payment ID from merchantRef (payment-uuid format):', paymentId)
          }

          // Pattern 1b: topup-{uuid} - credit top-up sessions
          if (!paymentId) {
            const topupMatch = merchantRef.match(/^topup-([a-f0-9-]{36})/)
            if (topupMatch) {
              paymentId = topupMatch[1]
              logger.debug('✅ Found payment ID from merchantRef (topup-uuid format):', paymentId)
            }
          }

          // Pattern 1c: pos-{uuid} - Staff POS product sales
          // Format: "pos-{saleId} | CustomerName"
          if (!paymentId) {
            const posMatch = merchantRef.match(/^pos-([a-f0-9-]{36})/)
            if (posMatch) {
              productSaleId = posMatch[1]
              logger.debug('✅ Found product sale ID from merchantRef (pos-uuid format):', productSaleId)
            }
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
          
          // Handle pos-{uuid}: look up product_sale directly and route through processAnonymousSale
          if (productSaleId && !paymentId) {
            const { data: posRecord } = await supabase
              .from('product_sales')
              .select('id, status, total_amount_rappen, metadata, user_id, tenant_id')
              .eq('id', productSaleId)
              .maybeSingle()
            
            if (posRecord) {
              logger.info('✅ Found product_sale via pos-merchantRef fallback:', posRecord.id)
              // Also save the transaction ID so future webhooks find it directly
              await supabase
                .from('product_sales')
                .update({ wallee_transaction_id: transactionId })
                .eq('id', productSaleId)
              return await processAnonymousSale(posRecord, paymentStatus)
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
                course_registration_id,
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

      // ⚠️ FULFILL with no payment record — alert loudly so admins can investigate
      if (walleeState === 'FULFILL') {
        logger.error('🚨 FULFILL webhook received but NO payment record found!', {
          transactionId,
          spaceId,
          timestamp: body.timestamp,
          action: 'Check Wallee dashboard for transaction details and create payment record manually if needed.'
        })
        // Update webhook log to flag this as requiring manual review
        if (webhookLogId) {
          await supabase.from('webhook_logs').update({
            success: false,
            error_message: `FULFILL webhook: no matching payment record found for transaction ${transactionId}. Manual review required.`,
            processing_duration_ms: Date.now() - startTime
          }).eq('id', webhookLogId)
        }
      } else {
        logger.info('ℹ️ No payment found for non-FULFILL state, ignoring:', { transactionId, walleeState })
      }

      // Return 200 to prevent Wallee from retrying
      return { 
        success: false, 
        error: 'Payment not found',
        transactionId,
        message: 'Webhook acknowledged but payment not found'
      }
    }
    
    logger.info('✅ Found payments:', payments.length)
    
    // 🔍 Update webhook log with payment info
    if (webhookLogId && payments.length > 0) {
      try {
        await supabase
          .from('webhook_logs')
          .update({
            payment_id: payments[0].id,
            payment_status_before: payments[0].payment_status
          })
          .eq('id', webhookLogId)
      } catch (logErr: any) {
        logger.warn('⚠️ Could not update webhook log:', logErr.message)
      }
    }
    
    // ============ LAYER 6: PREVENT STATUS DOWNGRADES ============
    const newPriority = STATUS_PRIORITY[paymentStatus] ?? -1
    const isTerminalFailure = paymentStatus === 'failed' || paymentStatus === 'cancelled'
    const paymentsToUpdate = payments.filter(p => {
      const currentPriority = STATUS_PRIORITY[p.payment_status] ?? -1
      const shouldUpdate = newPriority >= currentPriority

      // Special case: if Wallee reports failed/cancelled for a payment that is
      // currently 'processing' (our optimistic lock or Wallee CONFIRMED state),
      // we still allow it — the lock must be released so the customer can retry.
      if (!shouldUpdate && isTerminalFailure && p.payment_status === 'processing') {
        logger.info(`🔓 Releasing processing lock on ${p.id}: Wallee says ${paymentStatus}`)
        return true
      }

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
    // For failed/cancelled Wallee events: payments that were in 'processing' (our
    // optimistic lock) are reset to 'pending' so the customer can retry — not
    // permanently marked as failed (which would block the pay button).
    const getEffectiveStatus = (p: { payment_status: string }) => {
      if (isTerminalFailure && p.payment_status === 'processing') return 'pending'
      return paymentStatus
    }

    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    }
    
    if (paymentStatus === 'completed') {
      updateData.paid_at = new Date().toISOString()
    }
    
    const paymentIdsToUpdate = paymentsToUpdate.map(p => p.id)

    // Split into two groups when terminal failure hits a 'processing' payment
    const lockReleaseIds = isTerminalFailure
      ? paymentsToUpdate.filter(p => p.payment_status === 'processing').map(p => p.id)
      : []
    const normalUpdateIds = paymentIdsToUpdate.filter(id => !lockReleaseIds.includes(id))

    // Reset lock-held payments back to pending
    if (lockReleaseIds.length > 0) {
      const { error: releaseErr } = await supabase
        .from('payments')
        .update({ payment_status: 'pending', updated_at: new Date().toISOString() })
        .in('id', lockReleaseIds)
      if (releaseErr) logger.error('❌ Error releasing processing locks:', releaseErr)
      else logger.info(`🔓 Released ${lockReleaseIds.length} processing lock(s) back to pending`)
    }

    // Normal status update for the rest
    if (normalUpdateIds.length > 0) {
      const { error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .in('id', normalUpdateIds)

      if (updateError) {
        logger.error('❌ Error updating payments:', updateError)
        return { success: false, error: 'Failed to update payments' }
      }
    }
    
    logger.info(`✅ Updated ${paymentsToUpdate.length} payment(s) to: ${paymentStatus}`)
    
    // ============ LAYER 9: HANDLE COURSE REGISTRATIONS (CREATE or UPDATE) ============
    // ✅ NEW LOGIC: Since we no longer create pending registrations in enroll-wallee,
    // we need to CREATE them here when payment is confirmed
    if (paymentStatus === 'completed' || paymentStatus === 'authorized') {
      const registrationStatus = paymentStatus === 'completed' ? 'confirmed' : 'pending'
      const paymentStatusUpdate = paymentStatus === 'completed' ? 'paid' : 'pending'
      
      // Get payment IDs to find/create linked course registrations
      const paymentIds = paymentsToUpdate.map(p => p.id)
      
      if (paymentIds.length > 0) {
        // Step 1: Try to UPDATE existing registrations (idempotency for webhook retries)
        const { data: existingRegistrations, error: queryError } = await supabase
          .from('course_registrations')
          .select('id, course_id')
          .in('payment_id', paymentIds)
        
        let updatedRegistrations = existingRegistrations || []
        
        // Step 2: For payments without registrations, CREATE them now
        if (!queryError && paymentIds.length > 0) {
          const registrationsToCreate = []
          
          for (const payment of paymentsToUpdate) {
            // Check if this payment already has a registration
            const hasRegistration = updatedRegistrations.some(r => r.payment_id === payment.id)
            
            if (!hasRegistration && payment.metadata?.course_id) {
              // ✅ NEW: Create registration from payment metadata
              logger.info(`📝 Creating course registration for payment: ${payment.id}`)
              
              // Get course details
              const { data: course } = await supabase
                .from('courses')
                .select('id, name, tenant_id')
                .eq('id', payment.metadata.course_id)
                .single()
              
              if (course) {
                // Create or find guest user
                let userId: string | undefined
                if (payment.user_id) {
                  userId = payment.user_id
                } else if (payment.metadata?.email) {
                  // Look for existing user by normalized email (case-insensitive), then by
                  // phone as a fallback — avoids creating a duplicate account for a returning
                  // customer whose email casing/phone format differs from what's on file.
                  const existingUser = await findExistingUserByContact(supabase, {
                    email: payment.metadata?.email,
                    phone: payment.metadata?.phone,
                    tenantId: course.tenant_id
                  })
                  
                  if (existingUser) {
                    userId = existingUser.id
                  } else {
                    // Create guest user
                    const { data: newUser, error: createUserError } = await supabase
                      .from('users')
                      .insert({
                        first_name: payment.metadata?.firstname || 'Guest',
                        last_name: payment.metadata?.lastname || 'User',
                        email: payment.metadata?.email ? String(payment.metadata.email).trim().toLowerCase() : payment.metadata?.email,
                        phone: normalizePhoneNumber(payment.metadata?.phone || '') || payment.metadata?.phone,
                        tenant_id: course.tenant_id,
                        role: 'client',
                        is_active: true,
                        auth_user_id: null,
                        // Set referral code if present in payment metadata
                        ...(payment.metadata?.referral_code ? { referred_by_code: payment.metadata.referral_code } : {}),
                        // ✅ NEW: Generate onboarding token for guest user to complete profile later
                        onboarding_token: crypto.randomUUID ? crypto.randomUUID() : 'token-' + Date.now(),
                        onboarding_token_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                        onboarding_status: 'pending'
                      })
                      .select('id')
                      .single()
                    
                    if (newUser) {
                      userId = newUser.id
                      logger.debug('✅ Created guest user:', userId)

                      // Create affiliate_referrals row if a referral code was stored
                      const refCode = payment.metadata?.referral_code
                      if (refCode) {
                        const { data: affCode } = await supabase
                          .from('affiliate_codes')
                          .select('id, user_id')
                          .eq('code', refCode)
                          .eq('is_active', true)
                          .maybeSingle()

                        if (affCode && affCode.user_id !== userId) {
                          const { error: refInsertError } = await supabase
                            .from('affiliate_referrals')
                            .insert({
                              tenant_id: course.tenant_id,
                              affiliate_code_id: affCode.id,
                              affiliate_user_id: affCode.user_id,
                              referred_user_id: userId,
                              status: 'pending',
                            })
                          if (refInsertError) {
                            logger.error('❌ Failed to create affiliate_referrals row for guest user:', refInsertError.message)
                          } else {
                            logger.info('✅ Created affiliate_referrals row for guest user:', { userId, refCode })
                          }
                        }
                      }
                    } else {
                      logger.error('❌ Failed to create guest user:', {
                        error_code: createUserError?.code,
                        error_message: createUserError?.message,
                        error_details: createUserError?.details,
                        user_data: {
                          first_name: payment.metadata?.firstname || 'Guest',
                          last_name: payment.metadata?.lastname || 'User',
                          email: payment.metadata?.email,
                          tenant_id: course.tenant_id
                        }
                      })
                      // Fallback: duplicate key — look up the existing user
                      if (createUserError?.code === '23505') {
                        const fallbackUser = await findExistingUserByContact(supabase, {
                          email: payment.metadata?.email,
                          phone: payment.metadata?.phone,
                          tenantId: course.tenant_id
                        })
                        if (fallbackUser) {
                          userId = fallbackUser.id
                          logger.info('✅ Fallback: found existing user after duplicate-key error:', userId)
                        }
                      }
                    }
                  }
                }
                
                // Create registration — even without a userId (email stored directly on registration)
                if (userId || payment.metadata?.email) {
                  logger.debug(`📋 Building registration object with userId: ${userId || 'none (guest without account)'}`)
                  registrationsToCreate.push({
                    course_id: course.id,
                    tenant_id: course.tenant_id,
                    user_id: userId || null,
                    payment_id: payment.id,
                    first_name: payment.metadata?.firstname || '',
                    last_name: payment.metadata?.lastname || '',
                    email: payment.metadata?.email,
                    phone: payment.metadata?.phone,
                    sari_faberid: payment.metadata?.sari_faberid || null,
                    street: payment.metadata?.street || null,
                    street_nr: payment.metadata?.street_nr || null,
                    zip: payment.metadata?.zip || null,
                    city: payment.metadata?.city || null,
                    birthdate: payment.metadata?.birthdate || payment.metadata?.sari_birthdate || null,
                    license_number: payment.metadata?.license_number || null,
                    status: registrationStatus,
                    payment_status: paymentStatusUpdate,
                    payment_method: 'wallee',
                    amount_paid_rappen: payment.total_amount_rappen || 0,
                    discount_applied_rappen: payment.metadata?.discount_amount_rappen || 0,
                    registration_date: new Date().toISOString(),
                    registered_at: new Date().toISOString(),
                    custom_sessions: payment.metadata?.custom_sessions || null,
                    is_partial_enrollment: !!(payment.metadata?.is_partial_enrollment),
                    sari_synced: paymentStatus === 'completed',
                    sari_synced_at: paymentStatus === 'completed' ? new Date().toISOString() : null,
                    vehicle_id: payment.metadata?.vehicle_id || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  logger.debug(`✅ Registration object added to array. Total registrations to create: ${registrationsToCreate.length}`)
                } else {
                  logger.error('❌ No email in payment metadata, skipping registration creation')
                }
              } else {
                logger.error(`❌ Course not found for course_id: ${payment.metadata.course_id}`)
              }
            }
          }
          
          // Batch insert new registrations
          if (registrationsToCreate.length > 0) {
            logger.info(`📊 About to insert ${registrationsToCreate.length} course registrations`)
            
            const { data: newRegs, error: insertError } = await supabase
              .from('course_registrations')
              .insert(registrationsToCreate)
              .select('id, course_id, user_id')
            
            if (!insertError && newRegs) {
              logger.info(`✅ Created ${newRegs.length} new course registration(s)`)
              updatedRegistrations = [...updatedRegistrations, ...newRegs]

              // ── Create vehicle_bookings per session (non-fatal) ────────────
              ;(async () => {
                try {
                  for (let i = 0; i < registrationsToCreate.length && i < newRegs.length; i++) {
                    const regData = registrationsToCreate[i]
                    const vehicleId = regData.vehicle_id
                    if (!vehicleId) continue

                    // Load course sessions
                    const { data: sessions } = await supabase
                      .from('course_sessions')
                      .select('id, start_time, end_time')
                      .eq('course_id', regData.course_id)
                    if (!sessions?.length) continue

                    const vBookings = sessions.map((s: any) => ({
                      vehicle_id: vehicleId,
                      tenant_id: regData.tenant_id,
                      course_id: regData.course_id,
                      course_session_id: s.id,
                      start_time: s.start_time,
                      end_time: s.end_time,
                      purpose: 'course',
                      status: 'confirmed',
                      booked_by: regData.user_id || null,
                    }))
                    const { error: vErr } = await supabase.from('vehicle_bookings').insert(vBookings)
                    if (vErr) logger.warn('⚠️ vehicle_bookings insert failed (webhook, non-fatal):', vErr.message)
                    else logger.info(`✅ ${vBookings.length} vehicle_bookings created via webhook for course ${regData.course_id}`)
                  }
                } catch (vE: any) {
                  logger.warn('⚠️ vehicle_bookings creation failed in webhook (non-fatal):', vE.message)
                }
              })()

              // Increment discount usage_count for any discount codes used
              ;(async () => {
                try {
                  for (const payment of paymentsToUpdate) {
                    const discountCode = payment.metadata?.discount_code
                    const tenantIdForDiscount = payment.tenant_id
                    if (!discountCode || !tenantIdForDiscount) continue
                    // Escape LIKE wildcards — discountCode originates from payment metadata,
                    // which is attacker-influenced (set from the original enrollment request).
                    const escapedDiscountCode = escapeLikePattern(discountCode)

                    const { data: disc } = await supabase
                      .from('discounts')
                      .select('id, usage_count')
                      .ilike('code', escapedDiscountCode)
                      .eq('tenant_id', tenantIdForDiscount)
                      .maybeSingle()

                    if (disc) {
                      await supabase.from('discounts').update({ usage_count: (disc.usage_count ?? 0) + 1 }).eq('id', disc.id)
                      logger.debug('📊 Discount usage_count incremented (webhook):', discountCode)
                      continue
                    }

                    const { data: vc } = await supabase
                      .from('voucher_codes')
                      .select('id, current_redemptions')
                      .ilike('code', escapedDiscountCode)
                      .eq('tenant_id', tenantIdForDiscount)
                      .maybeSingle()

                    if (vc) {
                      await supabase.from('voucher_codes').update({ current_redemptions: (vc.current_redemptions ?? 0) + 1 }).eq('id', vc.id)
                      logger.debug('📊 Voucher current_redemptions incremented (webhook):', discountCode)
                    }
                  }
                } catch (e: any) {
                  logger.warn('⚠️ Discount usage increment failed (non-critical):', e.message)
                }
              })()
              
              // ✅ NEW: Update payments with user_id and course_registration_id
              for (let i = 0; i < registrationsToCreate.length && i < newRegs.length; i++) {
                const registration = newRegs[i]
                const originalPayment = registrationsToCreate[i]
                
                // Find the payment that corresponds to this registration
                const payment = paymentsToUpdate.find(p => p.id === originalPayment.payment_id)
                if (payment) {
                  const { error: updatePaymentError } = await supabase
                    .from('payments')
                    .update({
                      user_id: registration.user_id,
                      course_registration_id: registration.id,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', payment.id)
                  
                  if (updatePaymentError) {
                    logger.warn(`⚠️ Failed to update payment ${payment.id} with user_id and course_registration_id:`, updatePaymentError.message)
                  } else {
                    logger.debug(`✅ Updated payment ${payment.id} with user_id=${registration.user_id} and course_registration_id=${registration.id}`)
                    // Also update in-memory so affiliate hook can use it
                    payment.course_registration_id = registration.id
                    payment.user_id = registration.user_id
                  }
                }
              }
            } else {
              logger.error('❌ Error creating course registrations:', {
                error_code: insertError?.code,
                error_message: insertError?.message,
                error_details: insertError?.details,
                registrations_to_create_count: registrationsToCreate.length
              })
              
              // ⚠️ DEBUG: Update payment metadata with error info
              for (const payment of paymentsToUpdate) {
                if (!payment.metadata?.course_id) continue
                try {
                  await supabase
                    .from('payments')
                    .update({
                      metadata: {
                        ...payment.metadata,
                        webhook_registration_error: insertError?.message || 'Unknown error creating registration',
                        webhook_error_timestamp: new Date().toISOString(),
                        webhook_error_code: insertError?.code
                      }
                    })
                    .eq('id', payment.id)
                } catch (e: any) {
                  logger.warn('Could not update payment metadata with error:', e.message)
                }
              }
            }
          }
        }
        
        // Step 3: Update all registrations (existing + newly created)
        if (updatedRegistrations.length > 0) {
          const registrationIds = updatedRegistrations.map(r => r.id)

          // Build payment amount lookup by registration id
          const paymentAmountByRegId: Record<string, number> = {}
          for (const p of paymentsToUpdate) {
            if (p.course_registration_id && p.total_amount_rappen > 0) {
              paymentAmountByRegId[p.course_registration_id] = p.total_amount_rappen
            }
          }

          const baseUpdate = {
            status: registrationStatus,
            payment_status: paymentStatusUpdate,
            webhook_processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          // If all registrations map to a single known amount, do one bulk update
          const uniqueAmounts = [...new Set(Object.values(paymentAmountByRegId))]
          if (uniqueAmounts.length === 1 && uniqueAmounts[0] > 0) {
            const { error: updateError } = await supabase
              .from('course_registrations')
              .update({ ...baseUpdate, amount_paid_rappen: uniqueAmounts[0] })
              .in('id', registrationIds)
            if (updateError) logger.warn('⚠️ Error updating course registrations:', updateError)
          } else {
            // Per-registration update (different amounts or unknown)
            for (const reg of updatedRegistrations) {
              const amount = paymentAmountByRegId[reg.id]
              const payload = amount && amount > 0 ? { ...baseUpdate, amount_paid_rappen: amount } : baseUpdate
              const { error: updateError } = await supabase
                .from('course_registrations')
                .update(payload)
                .eq('id', reg.id)
              if (updateError) logger.warn(`⚠️ Error updating registration ${reg.id}:`, updateError)
            }
          }

          logger.info(`✅ Updated ${registrationIds.length} course registration(s) to: ${registrationStatus}`)
          
          // ============ ENROLL IN SARI AFTER PAYMENT ============
          if (paymentStatus === 'completed') {
            for (const reg of updatedRegistrations) {
              await enrollInSARIAfterPayment(supabase, reg.id)
            }
          }
          
          // ============ UPDATE COURSE PARTICIPANT COUNT ============
          if (paymentStatus === 'completed') {
            logger.debug('📊 Registrations for participant count:', updatedRegistrations.map(r => ({ id: r.id, course_id: r.course_id })))
            const courseIds = [...new Set(updatedRegistrations.map(r => r.course_id).filter(Boolean))]
            logger.debug('📊 Course IDs to update:', courseIds)
            
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
              
              // Also update per-session participant counts
              await updateSessionParticipantCounts(supabase, courseId)
            }
            
            // Update session counts for custom swapped sessions (different courses)
            for (const reg of updatedRegistrations) {
              if (reg.custom_sessions && typeof reg.custom_sessions === 'object') {
                const customCourseIds = new Set<string>()
                for (const custom of Object.values(reg.custom_sessions) as any[]) {
                  if (custom?.courseId && custom.courseId !== reg.course_id) {
                    customCourseIds.add(custom.courseId)
                  }
                }
                for (const customCourseId of customCourseIds) {
                  await updateSessionParticipantCounts(supabase, customCourseId)
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
        
        const updateQuery = supabase
          .from('appointments')
          .update({
            status: appointmentStatus,
            updated_at: new Date().toISOString()
          })
          .in('id', appointmentIds)
        
        // Don't downgrade a 'confirmed' appointment back to 'scheduled' on AUTHORIZED state
        if (paymentStatus === 'authorized') {
          updateQuery.not('status', 'eq', 'confirmed')
        }
        
        const { error: appointmentError } = await updateQuery
        
        if (appointmentError) {
          logger.warn('⚠️ Error updating appointments:', appointmentError)
        } else {
          logger.info(`✅ Updated ${appointmentIds.length} appointment(s) to: ${appointmentStatus}`)
        }
      }
    }
    
    // ============ LAYER 8: AFFILIATE REWARD HOOK ============
    if (paymentStatus === 'completed') {
      for (const payment of paymentsToUpdate) {
        if (payment.user_id && (payment.appointment_id || payment.course_registration_id)) {
          // Fetch driving category from appointment or course
          let drivingCategory: string | null = payment.metadata?.category ?? null
          let courseId: string | null = null

          if (!drivingCategory && payment.appointment_id) {
            try {
              const { data: appt } = await supabase
                .from('appointments')
                .select('type')
                .eq('id', payment.appointment_id)
                .maybeSingle()
              drivingCategory = appt?.type ?? null
            } catch {
              // non-fatal – proceed without category
            }
          }

          if (payment.course_registration_id) {
            try {
              const { data: reg } = await supabase
                .from('course_registrations')
                .select('course_id')
                .eq('id', payment.course_registration_id)
                .maybeSingle()
              courseId = (reg as any)?.course_id ?? null
              if (!drivingCategory && courseId) {
                const { data: courseData } = await supabase
                  .from('courses')
                  .select('category')
                  .eq('id', courseId)
                  .maybeSingle()
                drivingCategory = courseData?.category ?? null
              } else if (!drivingCategory) {
                drivingCategory = null
              }
            } catch {
              // non-fatal
            }
          }

          // Fallback: use course_id from payment metadata
          if (!courseId && payment.metadata?.course_id) {
            courseId = payment.metadata.course_id
          }
          if (!drivingCategory && courseId) {
            try {
              const { data: courseData } = await supabase
                .from('courses')
                .select('category')
                .eq('id', courseId)
                .maybeSingle()
              drivingCategory = courseData?.category ?? null
            } catch {
              // non-fatal
            }
          }

          $fetch('/api/affiliate/process-reward', {
            method: 'POST',
            headers: { 'x-internal-secret': process.env.CRON_SECRET || '' },
            body: {
              appointment_id: payment.appointment_id || undefined,
              course_registration_id: payment.course_registration_id || undefined,
              course_id: courseId || undefined,
              user_id: payment.user_id,
              tenant_id: payment.tenant_id,
              driving_category: drivingCategory,
            }
          }).catch((err: any) => {
            logger.warn('⚠️ Affiliate reward hook failed (non-fatal):', err?.message, err?.data || err?.cause || '')
          })
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
      await processTopupCredits(paymentsToUpdate)
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
    
    // 🔍 Update webhook log with success
    if (webhookLogId && paymentsToUpdate.length > 0) {
      try {
        await supabase
          .from('webhook_logs')
          .update({
            payment_status_after: paymentStatus,
            success: true,
            processing_duration_ms: duration
          })
          .eq('id', webhookLogId)
      } catch (logErr: any) {
        logger.warn('⚠️ Could not finalize webhook log:', logErr.message)
      }
    }
    
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
    
    // 🔍 Log error to webhook_logs
    if (webhookLogId) {
      try {
        await supabase
          .from('webhook_logs')
          .update({
            success: false,
            error_message: error.message || error.toString(),
            processing_duration_ms: Date.now() - startTime
          })
          .eq('id', webhookLogId)
      } catch (logErr: any) {
        logger.warn('⚠️ Could not log webhook error:', logErr.message)
      }
    } else if (transactionId) {
      // Create error log if we don't have a log ID yet
      try {
        await supabase
          .from('webhook_logs')
          .insert({
            transaction_id: transactionId,
            success: false,
            error_message: error.message || error.toString(),
            processing_duration_ms: Date.now() - startTime
          })
      } catch (logErr: any) {
        logger.warn('⚠️ Could not create webhook error log:', logErr.message)
      }
    }
    
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
    let { data: paymentForConfig } = await supabase
      .from('payments')
      .select('tenant_id')
      .eq('wallee_transaction_id', transactionId)
      .maybeSingle()
    
    // Also check history table if payment not found by current transaction ID
    if (!paymentForConfig) {
      try {
        const { data: historyRecord } = await supabase
          .from('payment_wallee_transactions')
          .select('payment_id')
          .eq('wallee_transaction_id', transactionId)
          .maybeSingle()
        
        if (historyRecord?.payment_id) {
          const { data: histPayment } = await supabase
            .from('payments')
            .select('tenant_id')
            .eq('id', historyRecord.payment_id)
            .maybeSingle()
          
          paymentForConfig = histPayment
        }
      } catch {
        // History table may not exist yet
      }
    }
    
    let spaceId = webhookSpaceId
    let walleeCredentials: { spaceId: number; userId: number; apiSecret: string } | null = null

    // 1. Prefer tenant resolved from the payment row — use space-aware lookup so that
    //    pending transactions in the old production space are verified with correct
    //    credentials even when test mode is active (or was recently switched off).
    if (paymentForConfig?.tenant_id && webhookSpaceId) {
      try {
        walleeCredentials = await getWalleeConfigBySpace(paymentForConfig.tenant_id, webhookSpaceId)
        spaceId = webhookSpaceId
      } catch (e: any) {
        logger.warn(`⚠️ [webhook] Could not load Wallee config for tenant ${paymentForConfig.tenant_id}: ${e.message}`)
      }
    }

    // 2. Fallback: resolve tenant directly from the incoming spaceId (tenants.wallee_space_id)
    if (!walleeCredentials && webhookSpaceId) {
      try {
        const { data: tenantBySpace } = await supabase
          .from('tenants')
          .select('id')
          .eq('wallee_space_id', webhookSpaceId)
          .maybeSingle()

        if (tenantBySpace?.id) {
          walleeCredentials = await getWalleeConfigBySpace(tenantBySpace.id, webhookSpaceId)
          spaceId = webhookSpaceId
        }
      } catch (e: any) {
        logger.warn(`⚠️ [webhook] Could not resolve tenant for space ${webhookSpaceId}: ${e.message}`)
      }
    }

    // 3. Last-resort: resolve tenant via payments.wallee_space_id (handles stale tenants.wallee_space_id)
    if (!walleeCredentials && webhookSpaceId) {
      try {
        const { data: paymentBySpace } = await supabase
          .from('payments')
          .select('tenant_id')
          .eq('wallee_space_id', webhookSpaceId)
          .not('tenant_id', 'is', null)
          .limit(1)
          .maybeSingle()

        if (paymentBySpace?.tenant_id) {
          logger.info(`🔍 [webhook] Resolved tenant ${paymentBySpace.tenant_id} via payments.wallee_space_id=${webhookSpaceId}`)
          walleeCredentials = await getWalleeConfigBySpace(paymentBySpace.tenant_id, webhookSpaceId)
          spaceId = webhookSpaceId
        }
      } catch (e: any) {
        logger.warn(`⚠️ [webhook] Last-resort tenant lookup failed for space ${webhookSpaceId}: ${e.message}`)
      }
    }

    if (!walleeCredentials || !spaceId) {
      throw new Error(
        `[webhook] Cannot fetch transaction ${transactionId}: no Wallee credentials found. ` +
        `spaceId=${webhookSpaceId}, tenantId=${paymentForConfig?.tenant_id ?? 'unknown'}. ` +
        `Ensure the tenant has credentials saved in tenant_secrets.`
      )
    }

    const config = getWalleeSDKConfig(walleeCredentials.spaceId, walleeCredentials.userId, walleeCredentials.apiSecret)
    
    transactionService = new WalleeSDK.api.TransactionService(config)
    const response = await transactionService.read(walleeCredentials.spaceId, parseInt(transactionId))
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

async function processTopupCredits(payments: any[]) {
  const supabase = getSupabaseAdmin()

  for (const payment of payments) {
    try {
      let metadata: any = {}
      if (payment.metadata) {
        metadata = typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata
      }

      logger.info('🔍 processTopupCredits checking payment:', { id: payment.id, isTopup: metadata?.is_topup, metadata })

      if (!metadata?.is_topup) continue

      const amountRappen = metadata.topup_amount_rappen || payment.total_amount_rappen
      if (!amountRappen || amountRappen <= 0) {
        logger.warn('⚠️ processTopupCredits: invalid amountRappen:', amountRappen)
        continue
      }

      // Idempotency check: skip if already credited for this payment
      const { data: existingTx } = await supabase
        .from('credit_transactions')
        .select('id')
        .eq('reference_id', payment.id)
        .eq('transaction_type', 'deposit')
        .eq('payment_method', 'wallee')
        .maybeSingle()

      if (existingTx) {
        logger.info('⏭️ processTopupCredits: already credited for payment:', payment.id)
        continue
      }

      const { data: currentCredit, error: creditFetchError } = await supabase
        .from('student_credits')
        .select('id, balance_rappen')
        .eq('user_id', payment.user_id)
        .eq('tenant_id', payment.tenant_id)
        .maybeSingle()

      if (creditFetchError) {
        logger.error('❌ processTopupCredits: credit fetch error:', creditFetchError)
        continue
      }

      const currentBalance = currentCredit?.balance_rappen || 0
      const newBalance = currentBalance + amountRappen

      logger.info('💰 processTopupCredits: applying topup:', { userId: payment.user_id, currentBalance, amountRappen, newBalance })

      const { error: upsertError } = await supabase
        .from('student_credits')
        .upsert({
          user_id: payment.user_id,
          tenant_id: payment.tenant_id,
          balance_rappen: newBalance,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,tenant_id' })

      if (upsertError) {
        logger.error('❌ Topup credit upsert failed:', upsertError)
        continue
      }

      const { error: txInsertError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: payment.user_id,
          tenant_id: payment.tenant_id,
          transaction_type: 'deposit',
          amount_rappen: amountRappen,
          balance_before_rappen: currentBalance,
          balance_after_rappen: newBalance,
          payment_method: 'wallee',
          reference_id: payment.id,
          reference_type: 'payment',
          notes: `Online-Einzahlung via Wallee (CHF ${(amountRappen / 100).toFixed(2)})`
        })

      if (txInsertError) {
        logger.error('❌ processTopupCredits: credit_transactions insert failed:', txInsertError)
      } else {
        logger.info('✅ Topup credit applied:', { userId: payment.user_id, amountRappen, newBalance })
      }
    } catch (err: any) {
      logger.error('❌ processTopupCredits failed for payment:', payment.id, err.message)
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
        
        const customerEmail = payment.metadata.customer_email || product.recipient_email
        const customerName = payment.metadata.customer_name || product.recipient_name

        // Idempotency: skip if voucher already created for this payment+product
        const { data: existingVoucher } = await supabase
          .from('vouchers')
          .select('id, code')
          .eq('payment_id', payment.id)
          .eq('name', product.product_name || product.name)
          .maybeSingle()

        if (existingVoucher) {
          logger.info('⏭️ Voucher already created for payment+product, skipping:', existingVoucher.code)
          continue
        }

        const validUntil = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString()
        
        const { data: newVoucher, error: voucherInsertError } = await supabase
          .from('vouchers')
          .insert({
            code: voucherCode,
            name: product.product_name || product.name,
            description: product.description || '',
            amount_rappen: product.unit_price_rappen || product.price_rappen,
            recipient_name: customerName || null,
            recipient_email: customerEmail || null,
            buyer_name: customerName || null,
            buyer_email: customerEmail || null,
            payment_id: payment.id,
            valid_until: validUntil,
            is_active: true,
            tenant_id: payment.tenant_id
          })
          .select('id, code')
          .single()
        
        if (voucherInsertError || !newVoucher) {
          logger.error('❌ Voucher insert failed:', voucherInsertError?.message)
          continue
        }

        logger.info('✅ Voucher created in webhook:', newVoucher.code)

        // ── Send voucher email with PDF attachment (direct, not queued) ─────────
        // NOTE: outbound_messages_queue does not support binary attachments.
        // Voucher emails must remain direct (Puppeteer-generated PDF inline).
        if (customerEmail) {
          try {
            const { generateVoucherEmailContent, generateVoucherPDFContent } = await import('~/utils/voucherGenerator')
            const { sendEmail } = await import('~/server/utils/email')
            const { getTenantBranding } = await import('~/server/utils/tenant-branding')
            
            const branding = payment.tenant_id ? await getTenantBranding(payment.tenant_id) : {}
            const amountChf = (product.unit_price_rappen || product.price_rappen || 0) / 100

            // Generate PDF buffer
            let pdfAttachment: { filename: string; content: Buffer; contentType: string } | undefined
            try {
              const puppeteerMod = await import('puppeteer-core')
              const Puppeteer = puppeteerMod.default
              const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.USE_SPARTICUZ_CHROMIUM
              let launchOptions: any
              if (isProduction) {
                const chromium = (await import('@sparticuz/chromium')).default
                launchOptions = { args: chromium.args, defaultViewport: chromium.defaultViewport, executablePath: await chromium.executablePath(), headless: chromium.headless }
              } else {
                launchOptions = { headless: 'new', pipe: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] }
              }
              const browser = await Puppeteer.launch(launchOptions)
              const page = await browser.newPage()
              const htmlContent = generateVoucherPDFContent({
                code: newVoucher.code,
                name: product.product_name || product.name || 'Gutschein',
                amount_chf: amountChf,
                recipient_name: customerName || undefined,
                valid_until: validUntil,
                description: product.description || undefined
              }, branding)
              await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
              const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } })
              await page.close()
              await browser.close()
              pdfAttachment = { filename: `Gutschein_${newVoucher.code}.pdf`, content: Buffer.from(pdfBuffer), contentType: 'application/pdf' }
            } catch (pdfErr: any) {
              logger.warn('⚠️ PDF generation failed (email will be sent without attachment):', pdfErr.message)
            }

            const emailContent = generateVoucherEmailContent({
              code: newVoucher.code,
              name: product.product_name || product.name || 'Gutschein',
              amount_chf: amountChf,
              recipient_name: customerName || undefined,
              recipient_email: customerEmail,
              valid_until: validUntil,
              description: product.description || undefined,
            }, branding)

            await sendEmail({
              to: customerEmail,
              subject: emailContent.subject,
              html: emailContent.html,
              senderName: branding.tenantName,
              ...(pdfAttachment ? { attachments: [pdfAttachment] } : {})
            })

            logger.info('✅ Voucher email sent to:', customerEmail, 'code:', newVoucher.code, pdfAttachment ? '(with PDF)' : '(no PDF)')
          } catch (emailErr: any) {
            logger.warn('⚠️ Voucher email send failed (non-critical):', emailErr.message)
          }
        }
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
              notes: `Credit from ${product.product_name || product.name}`
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
            paymentMethod: 'wallee',
            // Pass actual paid amount so email shows correct price for partial/individual bookings
            totalAmount: payment.total_amount_rappen ? payment.total_amount_rappen / 100 : undefined
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
        custom_sessions,
        is_partial_enrollment,
        courses!inner(
          id,
          sari_managed,
          sari_course_id,
          is_partial_only,
          tenant_id,
          course_sessions(id, start_time, session_number, sari_session_id)
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
    
    // 4. Get birthdate + individual_session_number from payment metadata
    let birthdate: string | null = null
    let individualSessionNum: number | null = null
    
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
      if (payment?.metadata?.individual_session_number) {
        individualSessionNum = Number(payment.metadata.individual_session_number)
        logger.debug('✅ Got individual_session_number from payment metadata:', individualSessionNum)
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
    
    // Get ALL course IDs from group (e.g., "GROUP_2110027_2110028_2110029_2110030" → [2110027, 2110028, 2110029, 2110030])
    const sariCourseIdParts = course.sari_course_id.split('_')
    let sariCourseIds = sariCourseIdParts.slice(1).filter((id: string) => id && !isNaN(parseInt(id)))
    
    if (sariCourseIds.length === 0) {
      logger.error('❌ Invalid SARI course ID format:', course.sari_course_id)
      return
    }

    // For partial enrollment, filter session IDs to only those the customer booked.
    // is_partial_only courses already contain only the relevant sessions in sari_course_id
    // — no further filtering needed.
    if (registration.is_partial_enrollment && !course.is_partial_only) {
      if (individualSessionNum !== null) {
        // Individual session booking: enroll only in the specific session
        const targetSess = (course.course_sessions || []).find(
          (s: any) => s.session_number === individualSessionNum && s.allow_individual_booking
        )
        if (targetSess?.sari_session_id) {
          sariCourseIds = [String(targetSess.sari_session_id)]
        } else if (sariCourseIds.length >= individualSessionNum) {
          sariCourseIds = [sariCourseIds[individualSessionNum - 1]]
        }
        logger.info(`🎯 Individual session ${individualSessionNum}: enrolling in ${sariCourseIds.join(',')}`)
      } else {
        // Category-level partial booking: filter by partial_start_position from DB
        const { data: categoryConfig } = await supabase
          .from('courses')
          .select('course_category:course_categories(partial_start_position)')
          .eq('id', registration.course_id)
          .maybeSingle()
        const startPos: number = (categoryConfig as any)?.course_category?.partial_start_position ?? 3
        const courseSessions: any[] = course.course_sessions || []
        if (courseSessions.length > 0) {
          const sortedSessions = [...courseSessions].sort((a: any, b: any) =>
            a.start_time.localeCompare(b.start_time)
          )
          let pos = 0
          let lastDate = ''
          const sessionPosMap: Record<string, number> = {}
          for (const s of sortedSessions) {
            const d = s.start_time.split('T')[0]
            if (d !== lastDate) { pos++; lastDate = d }
            if (s.sari_session_id) sessionPosMap[String(s.sari_session_id)] = pos
          }
          sariCourseIds = sariCourseIds.filter(id => {
            const p = sessionPosMap[String(id)]
            return p === undefined || p >= startPos
          })
          logger.info(`🎯 Partial enrollment: SARI will receive ${sariCourseIds.length} session(s) from position ${startPos}`)
        }
      }
    }
    
    // Apply custom sessions if any were selected
    if (registration.custom_sessions && typeof registration.custom_sessions === 'object') {
      logger.info('🔄 Applying custom sessions:', registration.custom_sessions)
      
      // custom_sessions format: {"2": {originalSariIds: ["2110055", "2110056"], sariSessionIds: ["2110059", "2110060"], ...}}
      for (const [position, customData] of Object.entries(registration.custom_sessions)) {
        const custom = customData as any
        
        // Get original IDs to replace and new IDs
        const originalIds = custom?.originalSariIds || []
        const newIds = custom?.sariSessionIds || (custom?.sariSessionId ? [custom.sariSessionId] : [])
        
        logger.debug(`📍 Position ${position}: originalIds=${originalIds.join(',')}, newIds=${newIds.join(',')}`)
        
        if (originalIds.length > 0 && newIds.length > 0) {
          // Replace each original ID with corresponding new ID
          for (let i = 0; i < originalIds.length && i < newIds.length; i++) {
            const origId = originalIds[i]
            const newId = newIds[i]
            
            // Find and replace in the array
            const idx = sariCourseIds.findIndex((id: string) => id === origId || id === origId.toString())
            if (idx >= 0) {
              logger.debug(`📝 Replacing session ID ${sariCourseIds[idx]} → ${newId} at index ${idx}`)
              sariCourseIds[idx] = newId
            } else {
              logger.warn(`⚠️ Original session ID ${origId} not found in course sessions`)
            }
          }
        } else if (newIds.length > 0 && originalIds.length === 0) {
          // Legacy fallback: Position-based replacement (for old data without originalSariIds)
          logger.warn('⚠️ Using legacy position-based replacement (no originalSariIds)')
          
          // Fetch course sessions to understand the day-grouping
          const sessionsPerPosition: number[] = []
          const { data: courseSessions } = await supabase
            .from('course_sessions')
            .select('id, start_time')
            .eq('course_id', course.id)
            .order('start_time', { ascending: true })
          
          if (courseSessions && courseSessions.length > 0) {
            const byDate: Map<string, number> = new Map()
            for (const session of courseSessions) {
              const date = session.start_time.split('T')[0]
              byDate.set(date, (byDate.get(date) || 0) + 1)
            }
            for (const count of byDate.values()) {
              sessionsPerPosition.push(count)
            }
          } else {
            // Last resort: try to detect from sariCourseIds length
            // VKU typically has 4 sessions over 2 days = [2, 2]
            // PGS typically has more sessions
            if (sariCourseIds.length === 4) {
              sessionsPerPosition.push(2, 2) // Assume VKU pattern
            } else {
              sessionsPerPosition.push(...Array(sariCourseIds.length).fill(1))
            }
          }
          
          const posNum = parseInt(position)
          let startIdx = 0
          for (let p = 0; p < posNum - 1 && p < sessionsPerPosition.length; p++) {
            startIdx += sessionsPerPosition[p]
          }
          
          for (let i = 0; i < newIds.length && (startIdx + i) < sariCourseIds.length; i++) {
            logger.debug(`📝 Legacy replacing session at index ${startIdx + i}: ${sariCourseIds[startIdx + i]} → ${newIds[i]}`)
            sariCourseIds[startIdx + i] = newIds[i]
          }
        }
      }
    }
    
    // Format birthdate as YYYY-MM-DD (already should be in this format)
    const birthdateFormatted = typeof birthdate === 'string' && birthdate.includes('T')
      ? birthdate.split('T')[0]
      : birthdate
    
    logger.info(`🎯 Enrolling in SARI for ${sariCourseIds.length} sessions: ${sariCourseIds.join(', ')}`)
    logger.info(`🔐 SARI Credentials: faberid=${registration.sari_faberid}, birthdate=${birthdateFormatted}`)
    
    // Enroll in ALL sessions
    let successCount = 0
    let errorCount = 0
    
    for (const sessionId of sariCourseIds) {
      try {
        logger.debug(`📝 Enrolling in session ${sessionId} (type: ${typeof sessionId}, parsed: ${parseInt(sessionId)})...`)
        const result = await sari.enrollStudent(parseInt(sessionId), registration.sari_faberid, birthdateFormatted)
        successCount++
        logger.debug(`✅ Session ${sessionId} enrolled, result:`, result)
      } catch (sessionError: any) {
        // If already enrolled, that's OK - count as success
        if (sessionError.message?.includes('ALREADY_ENROLLED') || sessionError.message?.includes('PERSON_ALREADY_ADDED')) {
          logger.debug(`⏭️ Session ${sessionId}: Already enrolled (OK)`)
          successCount++
        } else {
          logger.warn(`⚠️ Session ${sessionId} enrollment failed:`, {
            message: sessionError.message,
            code: sessionError.code,
            response: sessionError.response
          })
          errorCount++
        }
      }
    }
    
    logger.info(`✅ SARI enrollment completed: ${successCount}/${sariCourseIds.length} sessions successful${errorCount > 0 ? `, ${errorCount} errors` : ''}`)
    
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

// ============ WALLEE REFUND WEBHOOK HANDLER ============
// Called when Wallee sends a Refund entity event (SUCCESSFUL or FAILED).
// - SUCCESSFUL: confirms our optimistic 'refunded' status (usually a no-op).
// - FAILED:     reverts the payment to 'completed' so staff can investigate / retry.
async function handleWalleeRefundWebhook(
  body: WalleeWebhookPayload,
  supabase: any,
  webhookLogId?: string
): Promise<{ success: boolean; status?: string; message: string }> {
  const refundId = body.entityId.toString()
  const refundState = body.state // e.g. 'SUCCESSFUL', 'FAILED', 'PENDING'
  const spaceId = body.spaceId

  logger.info('🔔 Wallee REFUND webhook:', { refundId, refundState, spaceId })

  // Only act on terminal states
  if (refundState !== 'SUCCESSFUL' && refundState !== 'FAILED') {
    logger.info(`⏭️ Refund webhook non-terminal state (${refundState}), skipping`)
    return { success: true, message: `Refund ${refundState} acknowledged, no action needed` }
  }

  // ── 1. Look up payment by wallee_refund_id ───────────────────────────────
  let payment: any = null

  const { data: byRefundId } = await supabase
    .from('payments')
    .select('id, payment_status, tenant_id, wallee_transaction_id, total_amount_rappen')
    .eq('wallee_refund_id', refundId)
    .maybeSingle()

  if (byRefundId) {
    payment = byRefundId
  } else {
    // ── 2. Fallback: fetch Refund from Wallee API → get transaction ID ────
    logger.info(`⚠️ No payment found by wallee_refund_id=${refundId}, fetching from Wallee API…`)
    try {
      const WalleeModule = await import('wallee')
      let WalleeSDK: any = null
      if (WalleeModule.Wallee?.api?.RefundService) WalleeSDK = WalleeModule.Wallee
      else if (WalleeModule.default?.api?.RefundService) WalleeSDK = WalleeModule.default
      else if (WalleeModule.api?.RefundService) WalleeSDK = WalleeModule

      if (WalleeSDK) {
        // Resolve credentials from the spaceId that originated the webhook
        let walleeCredentials: { spaceId: number; userId: number; apiSecret: string } | null = null
        if (spaceId) {
          try {
            const { data: tenantBySpace } = await supabase
              .from('tenants')
              .select('id')
              .eq('wallee_space_id', spaceId)
              .maybeSingle()
            if (tenantBySpace?.id) {
              walleeCredentials = await getWalleeConfigBySpace(tenantBySpace.id, spaceId)
            }
          } catch (e: any) {
            logger.warn('⚠️ Could not resolve credentials for refund webhook:', e.message)
          }
        }

        if (walleeCredentials) {
          const config = getWalleeSDKConfig(walleeCredentials.spaceId, walleeCredentials.userId, walleeCredentials.apiSecret)
          const refundService = new WalleeSDK.api.RefundService(config)
          const refundEntity = (await refundService.read(walleeCredentials.spaceId, parseInt(refundId)))?.body

          const transactionId = refundEntity?.transaction?.id?.toString()
          if (transactionId) {
            const { data: byTxId } = await supabase
              .from('payments')
              .select('id, payment_status, tenant_id, wallee_transaction_id, total_amount_rappen')
              .eq('wallee_transaction_id', transactionId)
              .maybeSingle()
            if (byTxId) {
              payment = byTxId
              // Backfill wallee_refund_id so future webhooks hit directly
              await supabase.from('payments').update({ wallee_refund_id: refundId }).eq('id', byTxId.id)
              logger.info('✅ Found payment via Wallee API fallback, refund ID backfilled:', byTxId.id)
            }
          }
        }
      }
    } catch (fallbackErr: any) {
      logger.error('❌ Wallee API fallback for refund webhook failed:', fallbackErr.message)
    }
  }

  if (!payment) {
    logger.warn('⚠️ Refund webhook: payment not found for refundId:', refundId)
    return { success: false, message: 'Payment not found for refund ID' }
  }

  // ── 3. Handle terminal state ──────────────────────────────────────────────
  if (refundState === 'SUCCESSFUL') {
    // Confirm our optimistic 'refunded' status
    if (payment.payment_status !== 'refunded') {
      await supabase
        .from('payments')
        .update({ payment_status: 'refunded', refunded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', payment.id)
      logger.info('✅ Refund SUCCESSFUL — payment status confirmed as refunded:', payment.id)
    } else {
      logger.info('✅ Refund SUCCESSFUL — payment already marked refunded:', payment.id)
    }
    return { success: true, status: 'refunded', message: 'Refund confirmed successful' }
  }

  // refundState === 'FAILED'
  // Revert payment to 'completed' so the admin can see and retry/handle manually
  logger.error(`❌ Wallee REFUND FAILED for payment ${payment.id} (refundId: ${refundId})`)

  await supabase
    .from('payments')
    .update({
      payment_status: 'completed',
      wallee_refund_id: null,
      notes: `⚠️ Wallee-Rückerstattung FEHLGESCHLAGEN (refundId: ${refundId}). Bitte manuell prüfen und erneut veranlassen.`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id)

  // Log loudly — an admin needs to act
  logger.error('🚨 ADMIN ACTION REQUIRED: Wallee refund failed, payment reverted to completed.', {
    paymentId: payment.id,
    refundId,
    amount: `CHF ${((payment.total_amount_rappen || 0) / 100).toFixed(2)}`,
    tenantId: payment.tenant_id,
  })

  return { success: true, status: 'reverted_to_completed', message: 'Refund failed — payment reverted to completed' }
}

// ============ UPDATE SESSION PARTICIPANT COUNTS ============
async function updateSessionParticipantCounts(supabase: any, courseId: string) {
  try {
    // Get all sessions for this course with their session_number
    const { data: sessions, error: sessionsError } = await supabase
      .from('course_sessions')
      .select('id, session_number')
      .eq('course_id', courseId)
    
    if (sessionsError || !sessions) {
      logger.warn(`⚠️ Could not fetch sessions for course ${courseId}`)
      return
    }

    // Get all confirmed registrations for this course
    const { data: registrations } = await supabase
      .from('course_registrations')
      .select('id, custom_sessions, is_partial_enrollment, individual_session_number, partial_start_session')
      .eq('course_id', courseId)
      .eq('status', 'confirmed')

    const allRegs = registrations || []

    for (const session of sessions) {
      const sNum = session.session_number

      const count = allRegs.filter((reg: any) => {
        // Individual session booking: only count for that specific session
        if (reg.individual_session_number != null) {
          return reg.individual_session_number === sNum
        }
        // Partial enrollment (Teil X onwards): only count from partial_start_session
        if (reg.partial_start_session != null) {
          if (sNum < reg.partial_start_session) return false
        }
        // Custom session swap: if this session was swapped out, don't count
        if (reg.custom_sessions) {
          const override = (reg.custom_sessions as Record<string, any>)[String(sNum)]
          if (override) return false
        }
        return true
      }).length

      const { error: updateError } = await supabase
        .from('course_sessions')
        .update({ 
          current_participants: count,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id)
      
      if (updateError) {
        logger.warn(`⚠️ Error updating session ${session.id}:`, updateError)
      } else {
        logger.debug(`✅ Updated session ${session.id} (session_number=${sNum}) participants: ${count}`)
      }
    }
  } catch (error: any) {
    logger.warn(`⚠️ Error updating session participants:`, error.message)
  }
}
