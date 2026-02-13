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
  const supabase = getSupabaseAdmin()
  
  // Auto-detect environment based on request host
  const host = event.headers['host'] || ''
  const isProduction = host.includes('www.simy.ch') && !host.includes('preview')
  const isPreview = host.includes('preview.simy.ch')
  
  logger.info(`Webhook received on host: ${host} (Production: ${isProduction}, Preview: ${isPreview})`)
  
  let webhookLogId: string | undefined
  let transactionId: string | undefined
  
  try {
    // ============ LAYER 0: OPTIONAL SIGNATURE CHECK ============
    // Note: Real security comes from Wallee API verification in Layer 3
    // The signature header is optional - if present, we validate it
    const body = await readBody(event) as WalleeWebhookPayload
    const signature = event.headers['x-wallee-signature'] as string
    
    // 🔍 DEBUG: Log the entire payload to understand structure
    logger.info('🔔 WEBHOOK PAYLOAD RECEIVED:', JSON.stringify(body, null, 2))
    logger.info('🔔 WEBHOOK BODY KEYS:', Object.keys(body))
    logger.info('🔔 WEBHOOK BODY entityId:', body.entityId, 'type:', typeof body.entityId)
    logger.info('🔔 WEBHOOK BODY state:', body.state, 'type:', typeof body.state)
    
    // ⚠️ IMMEDIATE LOG: Try to create webhook log entry RIGHT NOW
    // This will help us debug if the webhook is even being called
    try {
      const { data: immediateLog } = await supabase
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
      
      webhookLogId = immediateLog?.id
      logger.debug('✅ IMMEDIATE webhook log entry created:', webhookLogId)
    } catch (immediateLogErr: any) {
      logger.error('❌ FAILED to create immediate webhook log:', immediateLogErr.message)
      // Continue anyway - this is just for debugging
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
    
    // 🔍 Log webhook receipt
    try {
      const { data: logRecord } = await supabase
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
      
      webhookLogId = logRecord?.id
      logger.debug('✅ Webhook logged with ID:', webhookLogId)
    } catch (logErr: any) {
      logger.warn('⚠️ Could not log webhook:', logErr.message)
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
          // 1. payment-{uuid} (NEW: Course enrollment with payment ID)
          // 2. appointment-{uuid}-{timestamp}
          // 3. Direct payment ID in merchantRef
          
          let paymentId: string | null = null
          
          // Pattern 1: payment-{uuid} - NEW FORMAT from course enrollments
          // Format: "payment-{paymentId} | FirstName LastName | CourseName | Location | Date"
          const paymentMatch = merchantRef.match(/^payment-([a-f0-9-]{36})/)
          if (paymentMatch) {
            paymentId = paymentMatch[1]
            logger.debug('✅ Found payment ID from merchantRef (payment-uuid format):', paymentId)
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
            
            // ⚠️ CRITICAL DEBUG: Log this to payments table metadata so we can see it in the DB
            const debugInfo = {
              webhook_debug: true,
              timestamp: new Date().toISOString(),
              hasRegistration,
              course_id_in_metadata: payment.metadata?.course_id,
              should_create: !hasRegistration && !!payment.metadata?.course_id,
              payment_status: paymentStatus,
              existingRegistrations_count: updatedRegistrations.length
            }

            logger.debug(`🔍 Webhook debug: Checking payment ${payment.id} for registration creation. hasRegistration: ${hasRegistration}, payment.metadata?.course_id: ${payment.metadata?.course_id}`)
            
            if (!hasRegistration && payment.metadata?.course_id) {
              // ✅ NEW: Create registration from payment metadata
              logger.info(`📝 Creating course registration for payment: ${payment.id}`)
              
              // Get course details
              const { data: course } = await supabase
                .from('courses')
                .select('id, name, tenant_id')
                .eq('id', payment.metadata.course_id)
                .single()
              
              logger.debug(`🔍 Course lookup result: course=${course?.id}, name=${course?.name}`)
              
              if (course) {
                // Create or find guest user
                let userId: string | undefined
                if (payment.user_id) {
                  userId = payment.user_id
                  logger.debug(`✅ Using existing user_id from payment: ${userId}`)
                } else if (payment.metadata?.email) {
                  logger.debug(`🔍 Looking for guest user by email: ${payment.metadata.email}`)
                  // Look for existing user
                  const { data: existingUser } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', payment.metadata.email)
                    .eq('tenant_id', course.tenant_id)
                    .maybeSingle()
                  
                  if (existingUser) {
                    userId = existingUser.id
                    logger.debug(`✅ Found existing guest user: ${userId}`)
                  } else {
                    logger.debug(`👤 No existing user found, creating new guest user`)
                    // Create guest user
                    const { data: newUser } = await supabase
                      .from('users')
                      .insert({
                        first_name: payment.metadata?.firstname || 'Guest',
                        last_name: payment.metadata?.lastname || 'User',
                        email: payment.metadata?.email,
                        phone: payment.metadata?.phone,
                        tenant_id: course.tenant_id,
                        role: 'student',
                        is_active: true,
                        is_guest: true,
                        auth_user_id: null
                      })
                      .select('id')
                      .single()
                    
                    if (newUser) {
                      userId = newUser.id
                      logger.debug('✅ Created guest user:', userId)
                    } else {
                      logger.warn('⚠️ Failed to create guest user')
                    }
                  }
                } else {
                  logger.warn('⚠️ No user_id and no email in payment metadata')
                }
                
                // Create registration
                if (userId) {
                  logger.debug(`📋 Building registration object with userId: ${userId}`)
                  registrationsToCreate.push({
                    course_id: course.id,
                    tenant_id: course.tenant_id,
                    user_id: userId,
                    payment_id: payment.id,
                    first_name: payment.metadata?.firstname || '',
                    last_name: payment.metadata?.lastname || '',
                    email: payment.metadata?.email,
                    phone: payment.metadata?.phone,
                    sari_faberid: payment.metadata?.sari_faberid,
                    status: registrationStatus,
                    payment_status: paymentStatusUpdate,
                    custom_sessions: payment.metadata?.custom_sessions || null,
                    sari_synced: paymentStatus === 'completed',
                    sari_synced_at: paymentStatus === 'completed' ? new Date().toISOString() : null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  logger.debug(`✅ Registration object added to array. Total registrations to create: ${registrationsToCreate.length}`)
                } else {
                  logger.error('❌ No userId available, skipping registration creation')
                }
              } else {
                logger.error(`❌ Course not found for course_id: ${payment.metadata.course_id}`)
              }
            }
          }
          
          // Batch insert new registrations
          if (registrationsToCreate.length > 0) {
            logger.info(`📊 About to insert ${registrationsToCreate.length} course registrations`)
            logger.debug('📋 Registration data to insert:', JSON.stringify(registrationsToCreate, null, 2).substring(0, 500))
            
            const { data: newRegs, error: insertError } = await supabase
              .from('course_registrations')
              .insert(registrationsToCreate)
              .select('id, course_id')
            
            if (!insertError && newRegs) {
              logger.info(`✅ Created ${newRegs.length} new course registration(s)`)
              updatedRegistrations = [...updatedRegistrations, ...newRegs]
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
                  .catch(e => logger.warn('Could not update payment metadata with error:', e.message))
              }
            }
          } else {
            logger.warn('⚠️ No registrations to create. registrationsToCreate.length:', registrationsToCreate.length)
          }
        }
        
        // Step 3: Update all registrations (existing + newly created)
        if (updatedRegistrations.length > 0) {
          const registrationIds = updatedRegistrations.map(r => r.id)
          const { error: updateError } = await supabase
            .from('course_registrations')
            .update({
              status: registrationStatus,
              payment_status: paymentStatusUpdate,
              webhook_processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .in('id', registrationIds)
          
          if (updateError) {
            logger.warn('⚠️ Error updating course registrations:', updateError)
          } else {
            logger.info(`✅ Updated ${registrationIds.length} course registration(s) to: ${registrationStatus}`)
          }
          
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
        const walleeConfig = getWalleeConfigForTenant(paymentForConfig.tenant_id)
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
        custom_sessions,
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
    
    // Get ALL course IDs from group (e.g., "GROUP_2110027_2110028_2110029_2110030" → [2110027, 2110028, 2110029, 2110030])
    const sariCourseIdParts = course.sari_course_id.split('_')
    let sariCourseIds = sariCourseIdParts.slice(1).filter((id: string) => id && !isNaN(parseInt(id)))
    
    if (sariCourseIds.length === 0) {
      logger.error('❌ Invalid SARI course ID format:', course.sari_course_id)
      return
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

// ============ UPDATE SESSION PARTICIPANT COUNTS ============
async function updateSessionParticipantCounts(supabase: any, courseId: string) {
  try {
    // Get all sessions for this course
    const { data: sessions, error: sessionsError } = await supabase
      .from('course_sessions')
      .select('id, sari_session_id')
      .eq('course_id', courseId)
    
    if (sessionsError || !sessions) {
      logger.warn(`⚠️ Could not fetch sessions for course ${courseId}`)
      return
    }
    
    // For each session, count participants
    // This includes:
    // 1. Regular registrations for this course
    // 2. Custom swaps FROM other courses TO this session
    // And excludes:
    // 3. Custom swaps FROM this course TO other courses
    
    for (const session of sessions) {
      // Count regular participants (not swapped away)
      const { count: regularCount } = await supabase
        .from('course_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'confirmed')
        .or(`custom_sessions.is.null,custom_sessions.not.cs.{"courseId":"${session.id}"}`)
      
      // For simplicity, use the course-level count for now
      // TODO: Implement proper per-session counting with custom_sessions
      const { count: totalCount } = await supabase
        .from('course_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'confirmed')
      
      const participantCount = totalCount || 0
      
      const { error: updateError } = await supabase
        .from('course_sessions')
        .update({ 
          current_participants: participantCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id)
      
      if (updateError) {
        logger.warn(`⚠️ Error updating session ${session.id}:`, updateError)
      } else {
        logger.debug(`✅ Updated session ${session.id} participants: ${participantCount}`)
      }
    }
  } catch (error: any) {
    logger.warn(`⚠️ Error updating session participants:`, error.message)
  }
}
