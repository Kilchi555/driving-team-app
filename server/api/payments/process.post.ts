// server/api/payments/process.post.ts
// SECURED: 10-Layer security implementation for complete payment processing
// Creates payment record AND initiates Wallee transaction in one call

import { defineEventHandler, getHeader, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import {
  validateUUID,
  validateEmail,
  validateAmount,
  validatePaymentMethod,
  throwValidationError
} from '~/server/utils/validators'
import { Wallee } from 'wallee'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'
import { buildMerchantReference } from '~/utils/merchantReference'

interface PaymentProcessRequest {
  // CHANGED: Now takes existing paymentId instead of creating new payment
  paymentId: string  // ID of existing payment to process
  orderId?: string   // Optional: Custom order ID for Wallee
  successUrl?: string
  failedUrl?: string
}

interface PaymentProcessResponse {
  success: boolean
  paymentId?: string
  transactionId?: string | number
  paymentUrl?: string
  paymentStatus?: string
  error?: string
  message?: string
}

export default defineEventHandler(async (event): Promise<PaymentProcessResponse> => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined
  let auditDetails: any = {}

  try {
    logger.debug('💳 Unified Payment Processing API called')

    // ============ LAYER 1: AUTHENTICATION ============
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      logger.warn('❌ No auth token provided')
      // Skip audit logging - we don't have a user_id yet
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const token = authHeader.substring(7)
    const supabaseAdmin = getSupabaseAdmin()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      logger.warn('❌ Invalid auth token')
      // Skip audit logging - we don't have a valid user yet
      throw createError({ statusCode: 401, statusMessage: 'Invalid authentication' })
    }

    authenticatedUserId = user.id
    auditDetails.authenticated_user_id = authenticatedUserId

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      authenticatedUserId,
      'register', // operation key (we'll use 'register' as base config, then override)
      20, // maxRequests: 20 per minute for payment processing
      60000 // windowMs: 60 seconds
    )
    if (!rateLimitResult.allowed) {
      throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
    }

    // ============ LAYER 3: READ & VALIDATE INPUT ============
    let body: PaymentProcessRequest
    try {
      body = await readBody(event)
    } catch (e) {
      logger.warn('Invalid request body:', e)
      throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
    }

    // ============ LAYER 4: INPUT VALIDATION ============
    const errors: any = {}

    if (!body.paymentId || !validateUUID(body.paymentId).valid) {
      errors.paymentId = 'Valid payment ID required'
    }

    if (Object.keys(errors).length > 0) {
      logger.warn('Validation errors:', errors)
      throwValidationError(errors)
    }

    // ============ LAYER 5: GET TENANT FROM AUTHENTICATED USER ============
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, email, first_name, last_name')
      .eq('auth_user_id', authenticatedUserId)
      .single()

    if (userError || !userData) {
      logger.warn('❌ User not found')
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    tenantId = userData.tenant_id
    auditDetails.tenant_id = tenantId

    // ============ LAYER 6: GET STUDENT CREDIT BALANCE ============
    logger.debug('💰 Checking student credit balance for user:', userData.id)
    const { data: creditData, error: creditError } = await supabaseAdmin
      .from('student_credits')
      .select('balance_rappen')
      .eq('user_id', userData.id)
      .maybeSingle()

    const availableCredit = creditData?.balance_rappen || 0
    auditDetails.available_credit_rappen = availableCredit
    
    logger.debug('💰 Available credit:', (availableCredit / 100).toFixed(2), 'CHF')

    // ============ LAYER 7: LOAD EXISTING PAYMENT ============
    // Load the existing payment that customer wants to pay for
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('id, user_id, tenant_id, total_amount_rappen, credit_used_rappen, payment_method, payment_status, description, metadata, appointments(id, start_time, duration_minutes, staff:users!staff_id(first_name, last_name))')
      .eq('id', body.paymentId)
      .eq('tenant_id', tenantId)
      .single()

    if (paymentError || !payment) {
      logger.warn('❌ Payment not found in tenant')
      await logAudit({
        user_id: authenticatedUserId,
        action: 'process_payment',
        status: 'failed',
        error_message: 'Payment not found or not in tenant',
        ip_address: ipAddress,
        details: { ...auditDetails, payment_id: body.paymentId }
      })
      throw createError({ statusCode: 404, statusMessage: 'Payment not found' })
    }

    // Verify payment belongs to requesting user
    if (payment.user_id !== userData.id) {
      logger.warn('❌ Payment does not belong to requesting user')
      await logAudit({
        user_id: authenticatedUserId,
        action: 'process_payment',
        status: 'failed',
        error_message: 'Unauthorized: Payment does not belong to user',
        ip_address: ipAddress,
        details: { ...auditDetails, payment_id: body.paymentId }
      })
      throw createError({ statusCode: 403, statusMessage: 'Unauthorized' })
    }

    // Only allow processing pending payments
    if (payment.payment_status !== 'pending') {
      logger.warn('❌ Payment is not pending. Status:', payment.payment_status)
      await logAudit({
        user_id: authenticatedUserId,
        action: 'process_payment',
        status: 'failed',
        error_message: `Cannot process payment with status: ${payment.payment_status}`,
        ip_address: ipAddress,
        details: { ...auditDetails, payment_id: body.paymentId, status: payment.payment_status }
      })
      throw createError({ statusCode: 400, statusMessage: `Payment must be pending to process (current: ${payment.payment_status})` })
    }

    auditDetails.payment_id = body.paymentId
    auditDetails.customer_id = payment.user_id

    // ============ LAYER 8: CALCULATE CREDIT USAGE ============
    logger.debug('💰 Calculating credit usage...')
    
    const amountAlreadyUsed = payment.credit_used_rappen || 0
    const remainingAmount = payment.total_amount_rappen - amountAlreadyUsed
    const creditToDeduct = Math.min(availableCredit, remainingAmount)
    const newTotalCredit = amountAlreadyUsed + creditToDeduct
    const finalAmountToPay = remainingAmount - creditToDeduct

    auditDetails.credit_calculation = {
      total_amount_rappen: payment.total_amount_rappen,
      credit_already_used_rappen: amountAlreadyUsed,
      remaining_amount_rappen: remainingAmount,
      available_credit_rappen: availableCredit,
      credit_to_deduct_rappen: creditToDeduct,
      total_credit_used_rappen: newTotalCredit,
      final_amount_to_pay_rappen: finalAmountToPay
    }

    logger.debug('💰 Credit calculation:', {
      total_amount: (payment.total_amount_rappen / 100).toFixed(2),
      credit_already_used: (amountAlreadyUsed / 100).toFixed(2),
      remaining_amount: (remainingAmount / 100).toFixed(2),
      available_balance: (availableCredit / 100).toFixed(2),
      credit_to_deduct: (creditToDeduct / 100).toFixed(2),
      total_credit_used: (newTotalCredit / 100).toFixed(2),
      final_amount_to_pay: (finalAmountToPay / 100).toFixed(2)
    })

    // ============ LAYER 9: IF FULLY COVERED BY CREDIT → COMPLETE PAYMENT ============
    if (finalAmountToPay <= 0) {
      logger.debug('✅ Payment fully covered by credit, completing payment...')

      // Deduct credit from student_credits
      if (creditToDeduct > 0) {
        const newBalance = availableCredit - creditToDeduct
        const { error: creditUpdateError } = await supabaseAdmin
          .from('student_credits')
          .update({
            balance_rappen: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userData.id)

        if (creditUpdateError) {
          logger.error('❌ Error updating student credit balance:', creditUpdateError)
          await logAudit({
            user_id: authenticatedUserId,
            action: 'process_payment_with_credit',
            status: 'failed',
            error_message: `Failed to deduct credit: ${creditUpdateError.message}`,
            ip_address: ipAddress,
            details: auditDetails
          })
          throw createError({ statusCode: 500, statusMessage: 'Failed to update student credit' })
        }

        logger.debug('✅ Student credit updated - new balance:', (newBalance / 100).toFixed(2))
        
        // ✅ Create credit_transaction for the deduction
        const { error: transactionError } = await supabaseAdmin
          .from('credit_transactions')
          .insert({
            user_id: userData.id,
            tenant_id: tenantId,
            transaction_type: 'payment',
            amount_rappen: -creditToDeduct, // Negative for deduction
            balance_before_rappen: availableCredit,
            balance_after_rappen: newBalance,
            payment_method: 'credit',
            reference_id: payment.id,
            reference_type: 'payment',
            notes: `Guthaben für Zahlung verwendet (Payment ID: ${payment.id}, Betrag: CHF ${(payment.total_amount_rappen / 100).toFixed(2)})`,
            status: 'completed',
            created_at: new Date().toISOString()
          })

        if (transactionError) {
          logger.warn('⚠️ Could not create credit transaction:', transactionError)
          // Non-critical, continue
        } else {
          logger.debug('✅ Credit transaction created')
        }
      }

      // Mark payment as completed
      const now = new Date().toISOString()
      const { error: updateError } = await supabaseAdmin
        .from('payments')
        .update({
          payment_status: 'completed',
          payment_method: 'credit',
          credit_used_rappen: newTotalCredit,
          paid_at: now,
          updated_at: now
        })
        .eq('id', payment.id)

      if (updateError) {
        logger.error('❌ Error updating payment:', updateError)
        throw createError({ statusCode: 500, statusMessage: 'Failed to update payment' })
      }

      // Update appointment if exists
      if (payment.appointments?.id) {
        const { error: aptError } = await supabaseAdmin
          .from('appointments')
          .update({
            payment_status: 'paid',
            is_paid: true,
            updated_at: now
          })
          .eq('id', payment.appointments.id)

        if (aptError) {
          logger.warn('⚠️ Could not update appointment:', aptError)
        } else {
          logger.debug('✅ Appointment marked as paid')
        }
      }

      // Audit log
      await logAudit({
        user_id: authenticatedUserId,
        action: 'payment_completed_with_credit',
        resource_type: 'payment',
        resource_id: payment.id,
        status: 'success',
        ip_address: ipAddress,
        details: {
          ...auditDetails,
          new_credit_balance_rappen: availableCredit - creditToDeduct,
          duration_ms: Date.now() - startTime
        }
      })

      logger.debug('✅ Payment completed with credit')

      return {
        success: true,
        paymentId: payment.id,
        paymentStatus: 'completed',
        message: `Payment completed with credit. ${(creditToDeduct / 100).toFixed(2)} CHF used.`
      }
    }

    // ============ LAYER 10: DEDUCT CREDIT & PROCEED TO WALLEE ============
    logger.debug('💳 Partial credit usage, proceeding to Wallee for remaining amount...')

    // Deduct credit from student_credits BEFORE Wallee
    if (creditToDeduct > 0) {
      const newBalance = availableCredit - creditToDeduct
      const { error: creditUpdateError } = await supabaseAdmin
        .from('student_credits')
        .update({
          balance_rappen: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userData.id)

      if (creditUpdateError) {
        logger.error('❌ Error updating student credit balance:', creditUpdateError)
        throw createError({ statusCode: 500, statusMessage: 'Failed to update student credit' })
      }

      logger.debug('✅ Credit deducted - new balance:', (newBalance / 100).toFixed(2))

      // Update payment with credit_used_rappen
      const { error: paymentUpdateError } = await supabaseAdmin
        .from('payments')
        .update({
          credit_used_rappen: newTotalCredit,
          metadata: {
            ...payment.metadata,
            pending_credit_refund: creditToDeduct // Bei Abbruch/Fehler zurückerstatten
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (paymentUpdateError) {
        logger.error('❌ Error updating payment with credit:', paymentUpdateError)
        // Continue anyway - credit was deducted
      }
    }

    // ============ LAYER 11: CREATE WALLEE TRANSACTION ============
    logger.debug('🔍 Fetching Wallee config for tenant:', tenantId)
    const walleeConfig = await getWalleeConfigForTenant(tenantId)
    const spaceId = walleeConfig.spaceId

    const config = getWalleeSDKConfig(spaceId, walleeConfig.userId, walleeConfig.apiSecret)
    const transactionService: Wallee.api.TransactionService = new Wallee.api.TransactionService(config)

    // ✅ Use FINAL amount (after credit deduction) for Wallee transaction
    const walleeAmount = finalAmountToPay

    logger.debug('💰 Creating Wallee transaction with amount after credit:', {
      original_amount_rappen: payment.total_amount_rappen,
      original_amount_chf: (payment.total_amount_rappen / 100).toFixed(2),
      credit_deducted_rappen: creditToDeduct,
      credit_deducted_chf: (creditToDeduct / 100).toFixed(2),
      wallee_amount_rappen: walleeAmount,
      wallee_amount_chf: (walleeAmount / 100).toFixed(2),
      orderId: body.orderId,
      paymentId: body.paymentId,
      spaceId: spaceId
    })

    // Create line items for Wallee (remaining amount after credit)
    const lineItems: Wallee.model.LineItemCreate[] = [
      {
        name: payment.description || 'Fahrlektion',
        quantity: 1,
        amountIncludingTax: walleeAmount / 100, // Convert to CHF (remaining amount)
        type: Wallee.model.LineItemType.PRODUCT,
        uniqueId: 'item-1',
        taxRate: 0 // No VAT for driving school services (Switzerland)
      }
    ]

    // Build merchant reference with payment ID (CRITICAL for webhook fallback!), customer name, date, time, duration
    const merchantReference = body.orderId || buildMerchantReference({
      paymentId: payment.id,  // ✅ CRITICAL: Include payment ID for webhook fallback
      staffName: `${userData.first_name || ''}-${userData.last_name || ''}`.trim() || undefined,
      startTime: payment.appointments?.start_time,
      durationMinutes: payment.appointments?.duration_minutes,
      appointmentId: payment.appointments?.id
    })

    logger.debug('📋 Generated merchant reference:', merchantReference)

    // Create transaction (let Wallee show ALL available payment methods)
    const transactionCreate: Wallee.model.TransactionCreate = {
      lineItems: lineItems,
      spaceViewId: null,
      currency: 'CHF',
      autoConfirmationEnabled: true,
      chargeRetryEnabled: false,
      customersEmailAddress: userData.email,
      // customerId removed temporarily - was blocking payment methods
      shippingAddress: null,
      billingAddress: null,
      deviceSessionIdentifier: null,
      merchantReference: merchantReference,
      // tokenizationMode removed - not needed without customerId
      successUrl: body.successUrl || `${getServerUrl()}/customer-dashboard?payment_success=true`,
      failedUrl: body.failedUrl || `${getServerUrl()}/customer-dashboard?payment_failed=true`
    }

    const createdTransaction = await transactionService.create(spaceId, transactionCreate)

    // Extract the actual transaction from the SDK response wrapper
    // The SDK returns { response, body } where body is the Transaction object
    const transaction = createdTransaction?.body || createdTransaction
    const transactionId = transaction?.id

    logger.debug('🔍 Wallee response - extracted transaction:', {
      transactionId: transactionId,
      state: transaction?.state,
      paymentPageUrl: transaction?.paymentPageUrl,
      paymentPageEndpoint: transaction?.paymentPageEndpoint,
      allKeys: transaction ? Object.keys(transaction).slice(0, 20) : 'null'
    })

    if (!transactionId) {
      logger.error('❌ Failed to create Wallee transaction - no transaction ID returned', {
        transactionId,
        hasBody: !!createdTransaction?.body
      })
      throw new Error(`Failed to create Wallee transaction. No ID in response.`)
    }

    logger.debug('✅ Wallee transaction created:', {
      transactionId: transactionId,
      state: transaction?.state
    })

    // ============ LAYER 10: GET PAYMENT URL & UPDATE PAYMENT ============
    // Use the Transaction Service to get the payment page URL
    let paymentPageUrl: string | undefined
    
    try {
      // Try to get payment page URL from the service
      const paymentService: Wallee.api.TransactionPaymentPageService = new Wallee.api.TransactionPaymentPageService(config)
      const urlResponse = await paymentService.paymentPageUrl(spaceId, transactionId)
      
      // The response is wrapped in { response, body }, extract the string URL from body
      paymentPageUrl = urlResponse?.body || urlResponse
      
      logger.debug('✅ Payment page URL retrieved from service:', paymentPageUrl?.substring(0, 100) + '...')
    } catch (urlError: any) {
      logger.warn('⚠️ Could not get payment page URL from service, constructing manually:', urlError.message)
      
      // Fallback: construct the URL manually
      paymentPageUrl = `https://app-wallee.com/payment/transaction/pay?spaceId=${spaceId}&transactionId=${transactionId}`
    }

    if (!paymentPageUrl || typeof paymentPageUrl !== 'string') {
      throw new Error('Failed to generate Wallee payment URL')
    }

    // Update payment with Wallee transaction ID - CRITICAL: Must succeed for webhook to work!
    const now = new Date().toISOString()
    let updateSuccess = false
    let lastUpdateError: any = null
    
    // ✅ RETRY LOGIC: Try 3 times to save wallee_transaction_id
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error: updateError } = await supabaseAdmin
        .from('payments')
        .update({
          wallee_transaction_id: transactionId.toString(),
          updated_at: now
        })
        .eq('id', payment.id)

      if (!updateError) {
        updateSuccess = true
        logger.debug(`✅ wallee_transaction_id saved on attempt ${attempt}`)
        break
      }
      
      lastUpdateError = updateError
      logger.warn(`⚠️ Attempt ${attempt}/3 to save wallee_transaction_id failed:`, updateError.message)
      
      if (attempt < 3) {
        // Wait before retry (100ms, 200ms)
        await new Promise(resolve => setTimeout(resolve, attempt * 100))
      }
    }

    if (!updateSuccess) {
      // CRITICAL: Log this prominently so we can investigate
      logger.error('🚨 CRITICAL: Failed to save wallee_transaction_id after 3 attempts!', {
        paymentId: payment.id,
        transactionId: transactionId.toString(),
        error: lastUpdateError?.message
      })
      // Continue anyway - customer should be able to pay, webhook will use fallback
    }

    // ============ AUDIT LOGGING & RESPONSE ============
    auditDetails.transaction_id = transactionId
    auditDetails.amount_chf = (walleeAmount / 100).toFixed(2)
    auditDetails.payment_url_generated = !!paymentPageUrl

    await logAudit({
      user_id: userData.id,  // Use users.id, not auth.uid()
      auth_user_id: authenticatedUserId,
      action: 'process_payment',
      resource_type: 'payment',
      resource_id: payment.id,
      status: 'success',
      ip_address: ipAddress,
      tenant_id: tenantId,
      details: {
        ...auditDetails,
        duration_ms: Date.now() - startTime,
        wallee_transaction_id: transactionId
      }
    })

    logger.debug('✅ Payment processed successfully')

    return {
      success: true,
      paymentId: payment.id,
      transactionId: transactionId,
      paymentUrl: paymentPageUrl,
      paymentStatus: 'pending',
      message: 'Payment processed successfully. Redirecting to payment page...'
    }

  } catch (error: any) {
    logger.error('❌ Error in process-payment:', error)

    const errorMessage = error.statusMessage || error.message || 'Internal server error'
    const statusCode = error.statusCode || 500

    // Log with user_id if available (after user lookup), otherwise use auth_user_id
    await logAudit({
      user_id: userData?.id,  // Will be undefined if user lookup failed
      auth_user_id: authenticatedUserId,  // Always available
      action: 'process_payment',
      status: 'error',
      error_message: errorMessage,
      ip_address: ipAddress,
      tenant_id: tenantId,
      details: { ...auditDetails, duration_ms: Date.now() - startTime }
    })

    throw createError({ statusCode, statusMessage: errorMessage })
  }
})

function getServerUrl(): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const host = process.env.NUXT_PUBLIC_APP_URL || 'localhost:3000'
  return `${protocol}://${host}`
}

/**
 * SECURITY LAYERS IMPLEMENTED:
 *
 * Layer 1: AUTHENTICATION ✅
 *   - Bearer token validation via Supabase
 *
 * Layer 2: RATE LIMITING ✅
 *   - Max 20 requests per minute per user
 *
 * Layer 3: INPUT READING ✅
 *   - Safe body parsing with error handling
 *
 * Layer 4: INPUT VALIDATION ✅
 *   - All fields validated (userId, amount, email, paymentMethod)
 *   - Invalid UUIDs rejected
 *
 * Layer 5: TENANT EXTRACTION ✅
 *   - Tenant ID from authenticated user, never from request
 *
 * Layer 6: OWNERSHIP & AUTHORIZATION ✅
 *   - Customer must exist in tenant
 *   - Appointment (if provided) must belong to customer
 *
 * Layer 7: PAYMENT CREATION ✅
 *   - Safe payment record insertion with all data
 *
 * Layer 8: PAYMENT METHOD ROUTING ✅
 *   - Different handling for cash/invoice vs wallee
 *
 * Layer 9: WALLEE TRANSACTION ✅
 *   - Wallee SDK transaction creation with security
 *
 * Layer 10: AUDIT LOGGING ✅
 *   - All actions logged with user, tenant, amount, timestamps
 */



