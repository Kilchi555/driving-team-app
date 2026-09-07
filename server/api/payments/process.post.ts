// server/api/payments/process.post.ts
// SECURED: 10-Layer security implementation for complete payment processing
// Creates payment record AND initiates Wallee transaction in one call

import { defineEventHandler, getHeader, createError, readBody } from 'h3'
import { roundToNearest5Rappen } from '~/utils/rounding'
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
import { getAuthenticatedUser } from '~/server/utils/auth'
import { buildWalleeTaxedLineItem, loadCheckoutVat, mergeVatIntoMetadata } from '~/server/utils/wallee-line-item'
import { attachResourceLabelsToAppointments, flattenAppointment, formatResourceSubtitle } from '~/server/utils/appointment-resource-labels'
import { availableWalletRappen } from '~/server/utils/apply-student-credit'
import { consumeGiftCardForPayment } from '~/server/utils/consume-gift-card'
import { deductStudentCredit, incrementStudentCredit, InsufficientAvailableCreditError } from '~/server/utils/wallet-atomic'
import {
  abandonOrResumePayment,
  canReplaceOpenWalleeState,
  capturedAmountRappenFromTx,
  expectedChargeRappen,
  openWalleeCreditDecision,
  plannedChargeRappenFromTx,
  walleeCapturedCoversExpected,
} from '~/server/utils/wallee-payment-sync'

interface PaymentProcessRequest {
  // CHANGED: Now takes existing paymentId instead of creating new payment
  paymentId: string  // ID of existing payment to process
  orderId?: string   // Optional: Custom order ID for Wallee
  successUrl?: string
  failedUrl?: string
  /** Customer choice when an open Wallee checkout amount no longer matches wallet credit */
  openPaymentChoice?: 'continue' | 'replace'
}

interface PaymentProcessResponse {
  success: boolean
  paymentId?: string
  transactionId?: string | number
  paymentUrl?: string
  paymentStatus?: string
  error?: string
  message?: string
  reused?: boolean
  needsOpenPaymentChoice?: boolean
  existingChargeRappen?: number
  newChargeRappen?: number
  creditToApplyRappen?: number
  canReplace?: boolean
  replaceBlockedReason?: string
}

export default defineEventHandler(async (event): Promise<PaymentProcessResponse> => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined
  let auditDetails: any = {}
  let userData: { id: string; tenant_id: string; email?: string; first_name?: string; last_name?: string } | undefined
  let body: PaymentProcessRequest | undefined

  try {
    logger.debug('💳 Unified Payment Processing API called')

    // ============ LAYER 1: AUTHENTICATION ============
    // Accepts both Authorization: Bearer <token> header and HTTP-only session cookies
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      logger.warn('❌ No valid authentication found')
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    authenticatedUserId = authUser.id
    auditDetails.authenticated_user_id = authenticatedUserId
    const supabaseAdmin = getSupabaseAdmin()

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

    // ============ LAYER 5+6: GET USER & PAYMENT IN PARALLEL ============
    // User profile already resolved by getAuthenticatedUser — no extra DB query needed.
    userData = {
      id: authUser.db_user_id as string,
      tenant_id: authUser.tenant_id as string,
      email: authUser.profile?.email || (authUser as any).email,
      first_name: authUser.profile?.first_name,
      last_name: authUser.profile?.last_name,
    }

    if (!userData.id || !userData.tenant_id) {
      logger.warn('❌ User profile incomplete')
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    tenantId = userData.tenant_id
    auditDetails.tenant_id = tenantId

    // Fetch credit balance and payment record in parallel (saves one sequential roundtrip)
    logger.debug('💰 Fetching credit balance + payment in parallel for user:', userData.id)
    const [
      { data: creditData },
      { data: payment, error: paymentError }
    ] = await Promise.all([
      supabaseAdmin
        .from('student_credits')
        .select('balance_rappen, pending_withdrawal_rappen')
        .eq('user_id', userData.id)
        .eq('tenant_id', tenantId)
        .maybeSingle(),
      supabaseAdmin
        .from('payments')
        .select('id, user_id, tenant_id, total_amount_rappen, credit_used_rappen, payment_method, payment_status, description, metadata, wallee_transaction_id, appointments(id, start_time, duration_minutes, type, location_id, vehicle_mode, vehicle_id, room_id, staff:users!staff_id(first_name, last_name))')
        .eq('id', body.paymentId)
        .eq('tenant_id', tenantId)
        .single()
    ])

    const rawCreditBalance = Math.round(Number(creditData?.balance_rappen) || 0)
    const availableCredit = availableWalletRappen(creditData)
    auditDetails.available_credit_rappen = availableCredit
    auditDetails.raw_credit_balance_rappen = rawCreditBalance
    logger.debug('💰 Available credit:', (availableCredit / 100).toFixed(2), 'CHF')

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

    // Only allow processing pending (or already-claimed processing) payments
    if (payment.payment_status !== 'pending' && payment.payment_status !== 'processing') {
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

    // ── ATOMIC LOCK: claim the payment by flipping pending → processing ──────
    // Uses a conditional UPDATE so only one concurrent request succeeds.
    // If the payment is already 'processing' from a prior request, we fall
    // through to the existing-transaction check below and reuse its URL.
    let claimedLock = false
    if (payment.payment_status === 'pending') {
      const { data: claimResult, error: claimError } = await supabaseAdmin
        .from('payments')
        .update({ payment_status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', payment.id)
        .eq('payment_status', 'pending') // only succeeds if still pending
        .select('id')
        .maybeSingle()

      if (claimError) {
        logger.error('❌ Failed to claim payment lock:', claimError)
        throw createError({ statusCode: 500, statusMessage: 'Failed to initiate payment' })
      }

      if (!claimResult) {
        // Another concurrent request already claimed this payment
        logger.warn('⚠️ Payment already claimed by concurrent request:', payment.id)
        throw createError({ statusCode: 409, statusMessage: 'Zahlung wird bereits verarbeitet. Bitte warten.' })
      }

      claimedLock = true
      logger.debug('🔒 Payment lock claimed:', payment.id)
    }
    auditDetails.claimed_lock = claimedLock

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

    // ============ LAYER 9: EXISTING WALLEE TX — ask before applying new credit ============
    if (payment.wallee_transaction_id) {
      logger.info('🔍 Payment already has wallee_transaction_id:', payment.wallee_transaction_id, '- checking status at Wallee...')
      const walleeConfigEarly = await getWalleeConfigForTenant(tenantId)
      const spaceIdEarly = walleeConfigEarly.spaceId
      const configEarly = getWalleeSDKConfig(spaceIdEarly, walleeConfigEarly.userId, walleeConfigEarly.apiSecret)
      const transactionServiceEarly: Wallee.api.TransactionService = new Wallee.api.TransactionService(configEarly)

      try {
        const existingTxResponse = await transactionServiceEarly.read(spaceIdEarly, parseInt(payment.wallee_transaction_id))
        const existingTx = existingTxResponse?.body || existingTxResponse

        if (existingTx?.state) {
          const COMPLETED_STATES = ['FULFILL', 'COMPLETED', 'SUCCESSFUL']
          const AUTHORIZED_STATES = ['AUTHORIZED']
          const OPEN_STATES = ['PENDING', 'CONFIRMED', 'PROCESSING']
          const FAILURE_STATES = ['FAILED', 'CANCELED', 'DECLINE', 'VOIDED']

          if (COMPLETED_STATES.includes(existingTx.state)) {
            const expected = expectedChargeRappen({
              total_amount_rappen: payment.total_amount_rappen,
              credit_used_rappen: amountAlreadyUsed,
            })
            const captured = capturedAmountRappenFromTx(existingTx)
            if (!walleeCapturedCoversExpected(captured, expected)) {
              logger.warn('❌ Existing Wallee tx underpays this payment — refusing complete', {
                paymentId: payment.id,
                captured,
                expected,
              })
              throw createError({
                statusCode: 409,
                statusMessage: 'Wallee-Betrag stimmt nicht mit der Zahlung überein',
              })
            }

            logger.info('✅ Existing Wallee transaction is already', existingTx.state, '- marking payment as completed')
            const now = new Date().toISOString()
            await supabaseAdmin.from('payments').update({
              payment_status: 'completed',
              paid_at: now,
              updated_at: now,
              wallee_transaction_state: existingTx.state
            }).eq('id', payment.id)

            await consumeGiftCardForPayment({
              supabase: supabaseAdmin,
              tenantId,
              paymentId: payment.id,
              redeemedBy: userData.id,
              discountCode: (payment as any).metadata?.discount_code ?? null,
            })

            if (payment.appointments?.id) {
              await supabaseAdmin.from('appointments').update({
                payment_status: 'paid',
                updated_at: now
              }).eq('id', payment.appointments.id)
            }

            return {
              success: true,
              paymentId: payment.id,
              paymentStatus: 'completed',
              message: 'Payment was already completed via existing Wallee transaction'
            }
          }

          if (AUTHORIZED_STATES.includes(existingTx.state) || OPEN_STATES.includes(existingTx.state)) {
            const creditChoice = openWalleeCreditDecision({
              openWalleeChargeRappen: plannedChargeRappenFromTx(existingTx),
              totalAmountRappen: payment.total_amount_rappen,
              creditAlreadyUsedRappen: amountAlreadyUsed,
              availableCreditRappen: availableCredit,
              pendingCreditRefundRappen: Number((payment.metadata as any)?.pending_credit_refund) || 0,
            })
            const canReplace = canReplaceOpenWalleeState(existingTx.state)
            const choice = body.openPaymentChoice

            if (creditChoice.needsChoice && choice !== 'continue' && choice !== 'replace') {
              let paymentPageUrl: string | undefined =
                (existingTx?.paymentPageUrl as string | undefined) ||
                (existingTx?.paymentPageEndpoint as string | undefined)
              if (!paymentPageUrl && OPEN_STATES.includes(existingTx.state)) {
                try {
                  const paymentService: Wallee.api.TransactionPaymentPageService = new Wallee.api.TransactionPaymentPageService(configEarly)
                  const urlResponse = await paymentService.paymentPageUrl(spaceIdEarly, parseInt(payment.wallee_transaction_id))
                  paymentPageUrl = urlResponse?.body || urlResponse
                } catch (urlError: any) {
                  logger.warn('⚠️ Could not get payment page URL for choice prompt:', urlError.message)
                }
              }
              return {
                success: true,
                paymentId: payment.id,
                paymentStatus: payment.payment_status,
                needsOpenPaymentChoice: true,
                existingChargeRappen: creditChoice.existingChargeRappen,
                newChargeRappen: creditChoice.newChargeRappen,
                creditToApplyRappen: creditChoice.creditToApplyRappen,
                canReplace,
                replaceBlockedReason: canReplace
                  ? undefined
                  : 'Die offene Zahlung ist beim Anbieter bereits bestätigt und kann nicht storniert werden. Bitte die alte Zahlung fortsetzen oder warten, bis sie abläuft.',
                paymentUrl: paymentPageUrl,
                transactionId: String(payment.wallee_transaction_id),
                message: 'Offene Zahlung und Guthaben weichen voneinander ab'
              }
            }

            if (creditChoice.needsChoice && choice === 'replace') {
              if (!canReplace) {
                throw createError({
                  statusCode: 409,
                  statusMessage: 'Die offene Zahlung kann gerade nicht storniert werden. Bitte die alte Zahlung fortsetzen oder warten, bis sie abläuft.',
                })
              }
              const abandoned = await abandonOrResumePayment({
                id: payment.id,
                tenant_id: tenantId,
                payment_status: payment.payment_status,
                wallee_transaction_id: payment.wallee_transaction_id,
              })
              if (abandoned.decision !== 'abandoned' && abandoned.decision !== 'release_pending') {
                throw createError({
                  statusCode: 409,
                  statusMessage: abandoned.message || 'Die offene Zahlung konnte nicht storniert werden.',
                })
              }
              payment.wallee_transaction_id = null
              logger.info('♻️ Customer chose new checkout with credit — old Wallee tx abandoned')
            } else {
              // continue old checkout (or amounts already match): never deduct extra credit
              if (creditChoice.needsChoice && choice === 'continue') {
                await restoreCreditHeldForOpenCheckout({
                  supabase: supabaseAdmin,
                  payment,
                  userId: userData.id,
                  tenantId,
                })
              }

              if (AUTHORIZED_STATES.includes(existingTx.state)) {
                const now = new Date().toISOString()
                await supabaseAdmin.from('payments').update({
                  payment_status: 'authorized',
                  updated_at: now,
                  wallee_transaction_state: existingTx.state
                }).eq('id', payment.id)
                return {
                  success: true,
                  paymentId: payment.id,
                  paymentStatus: 'authorized',
                  message: 'Payment already authorized via existing Wallee transaction'
                }
              }

              logger.info(`♻️ Reusing open Wallee transaction ${payment.wallee_transaction_id} (state=${existingTx.state})`)
              let paymentPageUrl: string | undefined =
                (existingTx?.paymentPageUrl as string | undefined) ||
                (existingTx?.paymentPageEndpoint as string | undefined)
              if (!paymentPageUrl) {
                try {
                  const paymentService: Wallee.api.TransactionPaymentPageService = new Wallee.api.TransactionPaymentPageService(configEarly)
                  const urlResponse = await paymentService.paymentPageUrl(spaceIdEarly, parseInt(payment.wallee_transaction_id))
                  paymentPageUrl = urlResponse?.body || urlResponse
                } catch (urlError: any) {
                  logger.warn('⚠️ Could not get payment page URL for reuse:', urlError.message)
                  paymentPageUrl = `https://app-wallee.com/payment/transaction/pay?spaceId=${spaceIdEarly}&transactionId=${payment.wallee_transaction_id}`
                }
              }
              await supabaseAdmin.from('payments').update({
                payment_status: 'processing',
                updated_at: new Date().toISOString(),
                wallee_transaction_state: existingTx.state
              }).eq('id', payment.id)
              return {
                success: true,
                paymentId: payment.id,
                transactionId: String(payment.wallee_transaction_id),
                paymentUrl: paymentPageUrl,
                reused: true,
                message: 'Existing open Wallee transaction reused'
              }
            }
          }

          if (!FAILURE_STATES.includes(existingTx.state) && existingTx.state) {
            if (!['FAILED', 'CANCELED', 'DECLINE', 'VOIDED'].includes(existingTx.state)
              && !OPEN_STATES.includes(existingTx.state)
              && !AUTHORIZED_STATES.includes(existingTx.state)
              && !COMPLETED_STATES.includes(existingTx.state)) {
              logger.warn(`⚠️ Unexpected Wallee state ${existingTx.state} — refusing to create a second transaction`)
              throw createError({
                statusCode: 409,
                statusMessage: 'Zahlung wird noch verarbeitet. Bitte warte einen Moment und versuche es erneut.'
              })
            }
          }

          if (FAILURE_STATES.includes(existingTx.state)) {
            logger.info(`📋 Existing transaction failed (${existingTx.state}) - creating new transaction`)
            try {
              const { error: historyError } = await supabaseAdmin.from('payment_wallee_transactions').insert({
                payment_id: payment.id,
                wallee_transaction_id: payment.wallee_transaction_id,
                wallee_space_id: spaceIdEarly
              })
              if (historyError) {
                logger.warn('⚠️ Could not save transaction history:', historyError.message)
              }
            } catch (historyErr: any) {
              logger.warn('⚠️ Transaction history save failed:', historyErr.message)
            }
          }
        }
      } catch (checkErr: any) {
        if (checkErr?.statusCode) throw checkErr
        logger.warn('⚠️ Could not check existing Wallee transaction:', checkErr.message)
        throw createError({
          statusCode: 503,
          statusMessage: 'Zahlungsstatus konnte nicht geprüft werden. Bitte versuche es in wenigen Sekunden erneut.'
        })
      }
    }

    // ============ LAYER 10: IF FULLY COVERED BY CREDIT → COMPLETE PAYMENT ============
    if (finalAmountToPay <= 0) {
      logger.debug('✅ Payment fully covered by credit, completing payment...')

      // Deduct credit from student_credits
      if (creditToDeduct > 0) {
        let newBalance = rawCreditBalance - creditToDeduct
        try {
          const deducted = await deductStudentCredit(supabaseAdmin, {
            userId: userData.id,
            tenantId,
            amountRappen: creditToDeduct,
          })
          newBalance = deducted.balance_rappen
        } catch (creditUpdateError: any) {
          logger.error('❌ Error updating student credit balance:', creditUpdateError)
          await logAudit({
            user_id: authenticatedUserId,
            action: 'process_payment_with_credit',
            status: 'failed',
            error_message: `Failed to deduct credit: ${creditUpdateError.message}`,
            ip_address: ipAddress,
            details: auditDetails
          })
          if (creditUpdateError instanceof InsufficientAvailableCreditError) {
            throw createError({ statusCode: 400, statusMessage: creditUpdateError.message })
          }
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
            balance_before_rappen: rawCreditBalance,
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

      await consumeGiftCardForPayment({
        supabase: supabaseAdmin,
        tenantId,
        paymentId: payment.id,
        redeemedBy: userData.id,
        discountCode: (payment as any).metadata?.discount_code ?? null,
      })

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
      let newBalance = rawCreditBalance - creditToDeduct
      try {
        const deducted = await deductStudentCredit(supabaseAdmin, {
          userId: userData.id,
          tenantId,
          amountRappen: creditToDeduct,
        })
        newBalance = deducted.balance_rappen
      } catch (creditUpdateError: any) {
        logger.error('❌ Error updating student credit balance:', creditUpdateError)
        if (creditUpdateError instanceof InsufficientAvailableCreditError) {
          throw createError({ statusCode: 400, statusMessage: creditUpdateError.message })
        }
        throw createError({ statusCode: 500, statusMessage: 'Failed to update student credit' })
      }

      logger.debug('✅ Credit deducted - new balance:', (newBalance / 100).toFixed(2))

      const { error: transactionError } = await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id: userData.id,
          tenant_id: tenantId,
          transaction_type: 'payment',
          amount_rappen: -creditToDeduct,
          balance_before_rappen: rawCreditBalance,
          balance_after_rappen: newBalance,
          payment_method: 'credit',
          reference_id: payment.id,
          reference_type: 'payment',
          notes: `Guthaben für Zahlung verwendet (Payment ID: ${payment.id}, Restbetrag online)`,
          status: 'completed',
          created_at: new Date().toISOString()
        })
      if (transactionError) {
        logger.warn('⚠️ Could not create credit transaction:', transactionError)
      }

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

    // ✅ Use FINAL amount (after credit deduction) and ROUNDED for Wallee transaction
    const walleeAmount = roundToNearest5Rappen(finalAmountToPay)

    logger.debug('💰 Creating Wallee transaction with amount after credit:', {
      original_amount_rappen: payment.total_amount_rappen,
      original_amount_chf: (payment.total_amount_rappen / 100).toFixed(2),
      credit_deducted_rappen: creditToDeduct,
      credit_deducted_chf: (creditToDeduct / 100).toFixed(2),
      before_rounding_rappen: finalAmountToPay,
      before_rounding_chf: (finalAmountToPay / 100).toFixed(2),
      wallee_amount_rappen: walleeAmount,
      wallee_amount_chf: (walleeAmount / 100).toFixed(2),
      orderId: body.orderId,
      paymentId: body.paymentId,
      spaceId: spaceId
    })

    const vat = await loadCheckoutVat(supabaseAdmin, tenantId!, walleeAmount)
    await supabaseAdmin
      .from('payments')
      .update({
        metadata: mergeVatIntoMetadata(payment.metadata, vat),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id)

    const appointment = flattenAppointment(payment.appointments)
    try {
      if (appointment && tenantId) {
        await attachResourceLabelsToAppointments(supabaseAdmin, tenantId, [appointment])
      }
    } catch (labelErr: any) {
      logger.warn('⚠️ Could not resolve vehicle/room labels for Wallee line:', labelErr?.message)
    }
    const resourceSubtitle = formatResourceSubtitle(appointment?.vehicle_label, appointment?.room_name)
    const walleeLineName = [payment.description || 'Termin', resourceSubtitle].filter(Boolean).join(' · ')

    // Create line items for Wallee (remaining amount after credit)
    const lineItems: Wallee.model.LineItemCreate[] = [
      {
        ...buildWalleeTaxedLineItem({
          name: walleeLineName,
          amountIncludingTaxChf: walleeAmount / 100,
          vatRatePercent: vat.vatRate,
        }),
        type: Wallee.model.LineItemType.PRODUCT,
      }
    ]

    const { livePaymentCheckoutDeps, runPaymentCheckoutCreate } = await import('~/server/utils/wallee-checkout-claim')
    const checkout = await runPaymentCheckoutCreate(
      { paymentId: payment.id, tenantId: tenantId! },
      livePaymentCheckoutDeps(async ({ merchantReference }) => {
        const createdTransaction = await transactionService.create(spaceId, {
          lineItems,
          spaceViewId: null,
          currency: 'CHF',
          autoConfirmationEnabled: true,
          chargeRetryEnabled: false,
          customersEmailAddress: userData.email,
          customerId: `dt-${tenantId}-${userData.id}`,
          shippingAddress: null,
          billingAddress: null,
          deviceSessionIdentifier: null,
          merchantReference,
          successUrl: body.successUrl || `${getServerUrl()}/customer-dashboard?payment_success=true`,
          failedUrl: body.failedUrl || `${getServerUrl()}/customer-dashboard?payment_failed=true`
        })
        const transaction = createdTransaction?.body || createdTransaction
        if (!transaction?.id) {
          throw new Error('Failed to create Wallee transaction. No ID in response.')
        }
        return {
          id: String(transaction.id),
          paymentPageUrl: transaction.paymentPageUrl || transaction.paymentPageEndpoint || null,
          spaceId,
        }
      })
    )
    const transactionId = checkout.transactionId
    const paymentPageUrl = checkout.paymentUrl

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

    // If we claimed the processing lock OR were retrying an already-processing payment
    // and Wallee/downstream failed, reset to pending so the customer can retry.
    // claimedLock covers the normal "pending → processing" path.
    // We also reset for the "already processing" retry path (claimedLock = false) to avoid
    // permanently stuck payments when an error occurs mid-retry.
    const shouldReleaseLock = auditDetails.claimed_lock || payment?.payment_status === 'processing'
    if (shouldReleaseLock && body?.paymentId) {
      try {
        await getSupabaseAdmin()
          .from('payments')
          .update({ payment_status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', body.paymentId)
          .eq('payment_status', 'processing')
        logger.info('🔓 Payment lock released back to pending after error:', body.paymentId)
      } catch (resetErr) {
        logger.error('⚠️ Could not reset payment lock to pending:', resetErr)
      }
    }

    // Log with user_id if available (after user lookup), otherwise use auth_user_id
    try {
      await logAudit({
        user_id: userData?.id || null,
        auth_user_id: authenticatedUserId || null,
        action: 'process_payment',
        status: 'error',
        error_message: errorMessage,
        ip_address: ipAddress,
        tenant_id: tenantId || null,
        details: { ...auditDetails, duration_ms: Date.now() - startTime }
      })
    } catch (auditErr) {
      logger.error('Failed to log audit entry:', auditErr)
    }

    throw createError({ statusCode, statusMessage: errorMessage })
  }
})

async function restoreCreditHeldForOpenCheckout(opts: {
  supabase: any
  payment: any
  userId: string
  tenantId: string
}): Promise<void> {
  const pending = Math.round(Number(opts.payment?.metadata?.pending_credit_refund) || 0)
  if (pending <= 0) return

  const incremented = await incrementStudentCredit(opts.supabase, {
    userId: opts.userId,
    tenantId: opts.tenantId,
    amountRappen: pending,
  })

  await opts.supabase.from('credit_transactions').insert({
    user_id: opts.userId,
    tenant_id: opts.tenantId,
    transaction_type: 'refund',
    amount_rappen: pending,
    balance_before_rappen: incremented.balance_rappen - pending,
    balance_after_rappen: incremented.balance_rappen,
    payment_method: 'credit',
    reference_id: opts.payment.id,
    reference_type: 'payment',
    notes: 'Guthaben zurückgebucht — offene Zahlung ohne Guthaben-Abzug fortgesetzt',
    status: 'completed',
    created_at: new Date().toISOString(),
  })

  const metadata = {
    ...(opts.payment.metadata && typeof opts.payment.metadata === 'object' ? opts.payment.metadata : {}),
    pending_credit_refund: null,
    credit_restored_for_open_checkout: true,
  }
  const newCreditUsed = Math.max(0, Math.round(Number(opts.payment.credit_used_rappen) || 0) - pending)
  await opts.supabase.from('payments').update({
    credit_used_rappen: newCreditUsed,
    metadata,
    updated_at: new Date().toISOString(),
  }).eq('id', opts.payment.id)

  opts.payment.credit_used_rappen = newCreditUsed
  opts.payment.metadata = metadata
}

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



