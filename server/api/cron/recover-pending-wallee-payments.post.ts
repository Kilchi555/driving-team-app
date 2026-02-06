// server/api/cron/recover-pending-wallee-payments.post.ts
// Cron job: Check old pending Wallee payments and sync with Wallee API
// Run this every 10 minutes to catch failed webhooks

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { Wallee } from 'wallee'
import { getWalleeConfigForTenant, getWalleeSDKConfig } from '~/server/utils/wallee-config'

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

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // ✅ SECURITY: Verify cron secret
    const cronSecret = getHeader(event, 'x-cron-secret')
    if (cronSecret !== process.env.CRON_SECRET) {
      logger.warn('❌ Invalid cron secret')
      throw createError({ statusCode: 401, statusMessage: 'Invalid cron secret' })
    }

    logger.info('🔄 Starting Wallee payment recovery cron...')

    const supabase = getSupabaseAdmin()

    // Find payments that are:
    // 1. pending status
    // 2. have wallee_transaction_id
    // 3. created more than 5 minutes ago
    // 4. haven't been checked recently (last update > 2 minutes ago)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()

    const { data: pendingPayments, error: findError } = await supabase
      .from('payments')
      .select(`
        id,
        user_id,
        tenant_id,
        wallee_transaction_id,
        payment_status,
        total_amount_rappen,
        created_at,
        updated_at
      `)
      .eq('payment_status', 'pending')
      .eq('payment_method', 'wallee')
      .not('wallee_transaction_id', 'is', null)
      .lt('created_at', fiveMinutesAgo)
      .lt('updated_at', twoMinutesAgo)

    if (findError) {
      throw findError
    }

    logger.info(`🔍 Found ${pendingPayments?.length || 0} pending payments to check`)

    if (!pendingPayments || pendingPayments.length === 0) {
      return {
        success: true,
        message: 'No pending payments to recover',
        duration_ms: Date.now() - startTime
      }
    }

    let recovered = 0
    let failed = 0
    let errors: any[] = []

    // Check each payment with Wallee
    for (const payment of pendingPayments) {
      try {
        logger.debug(`🔍 Checking transaction ${payment.wallee_transaction_id} for payment ${payment.id}`)

        // Get tenant config
        const walleeConfig = getWalleeConfigForTenant(payment.tenant_id)
        const config = getWalleeSDKConfig(walleeConfig.spaceId, walleeConfig.userId, walleeConfig.apiSecret)
        const transactionService = new Wallee.api.TransactionService(config)

        // Fetch from Wallee
        const response = await transactionService.read(walleeConfig.spaceId, parseInt(payment.wallee_transaction_id))
        const transaction = response?.body || response

        if (!transaction) {
          logger.warn(`⚠️ No transaction found for ID ${payment.wallee_transaction_id}`)
          failed++
          continue
        }

        const walleeState = transaction.state
        const mappedStatus = STATUS_MAPPING[walleeState] || 'pending'

        logger.debug(`📊 Wallee state: ${walleeState} → ${mappedStatus}`)

        // If status changed, update payment
        if (mappedStatus !== payment.payment_status) {
          logger.info(`✅ Recovering payment ${payment.id}: ${payment.payment_status} → ${mappedStatus}`)

          const updateData: any = {
            payment_status: mappedStatus,
            updated_at: new Date().toISOString()
          }

          if (mappedStatus === 'completed') {
            updateData.paid_at = new Date().toISOString()
          }

          const { error: updateError } = await supabase
            .from('payments')
            .update(updateData)
            .eq('id', payment.id)

          if (updateError) {
            logger.error(`❌ Error updating payment ${payment.id}:`, updateError)
            failed++
            errors.push({ paymentId: payment.id, error: updateError.message })
          } else {
            recovered++

            // Log the recovery
            try {
              await supabase
                .from('webhook_logs')
                .insert({
                  transaction_id: payment.wallee_transaction_id,
                  payment_id: payment.id,
                  wallee_state: walleeState,
                  payment_status_before: payment.payment_status,
                  payment_status_after: mappedStatus,
                  success: true,
                  error_message: 'Recovered via cron job',
                  raw_payload: {
                    recovery: true,
                    wallee_state: walleeState
                  }
                })
            } catch (logErr: any) {
              logger.warn('⚠️ Could not log recovery:', logErr.message)
            }
          }
        } else {
          logger.debug(`⏭️ Payment ${payment.id} status unchanged: ${mappedStatus}`)
        }
      } catch (error: any) {
        logger.error(`❌ Error processing payment ${payment.id}:`, error.message)
        failed++
        errors.push({ paymentId: payment.id, error: error.message })
      }
    }

    const duration = Date.now() - startTime
    logger.info(`✅ Recovery cron completed: ${recovered} recovered, ${failed} failed in ${duration}ms`)

    return {
      success: true,
      message: 'Wallee payment recovery completed',
      summary: {
        checked: pendingPayments.length,
        recovered,
        failed,
        errors: errors.length > 0 ? errors : undefined
      },
      duration_ms: duration
    }
  } catch (error: any) {
    logger.error('❌ Cron job error:', error)
    return {
      success: false,
      error: error.message,
      duration_ms: Date.now() - startTime
    }
  }
})
