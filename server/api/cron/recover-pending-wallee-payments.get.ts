// server/api/cron/recover-pending-wallee-payments.get.ts
// Cron job: Check old pending Wallee payments and sync with Wallee API
// Run this every 10 minutes to catch failed webhooks

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { Wallee } from 'wallee'
import { getWalleeConfigForTenant, getWalleeConfigBySpace, getWalleeSDKConfig } from '~/server/utils/wallee-config'

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
    // ✅ SECURITY: Verify cron secret (Vercel sends Authorization: Bearer <secret>)
    const secret = process.env.CRON_SECRET
    if (secret && secret.trim() !== '') {
      const authHeader = getHeader(event, 'authorization')
      const vercelCronHeader = getHeader(event, 'x-vercel-cron')
      const isValidSecret = authHeader === `Bearer ${secret}`
      const isVercelCron = vercelCronHeader === '1'
      if (!isValidSecret && !isVercelCron) {
        logger.warn('❌ Invalid cron secret')
        throw createError({ statusCode: 401, statusMessage: 'Invalid cron secret' })
      }
    }

    logger.info('🔄 Starting Wallee payment recovery cron...')

    const supabase = getSupabaseAdmin()

    let recovered = 0
    let failed = 0
    let errors: any[] = []

    // ============ PHASE 1: Recover stuck 'pending' payments ============
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
      logger.error('❌ Phase 1 query failed:', findError.message)
      throw findError
    }

    logger.info(`📋 Phase 1: found ${pendingPayments?.length || 0} pending payment(s) with stale Wallee transaction to check`)

    if (pendingPayments && pendingPayments.length > 0) {
      for (const payment of pendingPayments) {
        logger.info(`🔍 Phase 1: checking payment ${payment.id} | tx=${payment.wallee_transaction_id} | CHF ${(payment.total_amount_rappen / 100).toFixed(2)} | updated_at=${payment.updated_at}`)

        try {
          // Get tenant config
          const walleeConfig = await getWalleeConfigForTenant(payment.tenant_id)
          const config = getWalleeSDKConfig(walleeConfig.spaceId, walleeConfig.userId, walleeConfig.apiSecret)
          const transactionService = new Wallee.api.TransactionService(config)

          // Fetch current transaction from Wallee
          const response = await transactionService.read(walleeConfig.spaceId, parseInt(payment.wallee_transaction_id))
          const transaction = response?.body || response

          let walleeState = transaction?.state || null
          let mappedStatus = walleeState ? (STATUS_MAPPING[walleeState] || 'pending') : 'pending'

          if (!transaction) {
            logger.warn(`⚠️ Phase 1: no transaction found for ID ${payment.wallee_transaction_id} (payment ${payment.id})`)
          }

          // When Wallee reports FAILED/CANCELLED for a still-pending payment,
          // keep it as pending so the customer can create a new transaction and retry.
          if ((mappedStatus === 'failed' || mappedStatus === 'cancelled') && payment.payment_status === 'pending') {
            logger.info(`🔄 Phase 1: Wallee ${walleeState} for pending payment ${payment.id} — keeping as pending (retryable)`)
            mappedStatus = 'pending'
          }

          logger.info(`📊 Phase 1 payment ${payment.id}: Wallee tx=${payment.wallee_transaction_id} state=${walleeState} → ${mappedStatus}`)

          // If primary transaction is still pending, check historical transaction IDs
          if (mappedStatus === 'pending') {
            try {
              const { data: historyRecords } = await supabase
                .from('payment_wallee_transactions')
                .select('wallee_transaction_id')
                .eq('payment_id', payment.id)

              if (historyRecords && historyRecords.length > 0) {
                for (const record of historyRecords) {
                  if (record.wallee_transaction_id === payment.wallee_transaction_id) continue

                  try {
                    const histResponse = await transactionService.read(walleeConfig.spaceId, parseInt(record.wallee_transaction_id))
                    const histTx = histResponse?.body || histResponse

                    if (histTx?.state) {
                      const histStatus = STATUS_MAPPING[histTx.state] || 'pending'
                      logger.info(`🔎 Phase 1 history tx=${record.wallee_transaction_id} state=${histTx.state} → ${histStatus}`)

                      if (histStatus === 'completed' || histStatus === 'authorized') {
                        logger.info(`✅ Found completed historical transaction ${record.wallee_transaction_id} (${histTx.state}) for payment ${payment.id}`)
                        walleeState = histTx.state
                        mappedStatus = histStatus
                        break
                      }
                    }
                  } catch (histErr: any) {
                    logger.debug(`⚠️ Could not check historical transaction ${record.wallee_transaction_id}:`, histErr.message)
                  }
                }
              }
            } catch (historyErr: any) {
              logger.debug('⚠️ Could not query transaction history:', historyErr.message)
            }
          }

          // If no valid state found from any transaction, skip
          if (!walleeState) {
            failed++
            continue
          }

          // If status changed, update payment
          if (mappedStatus !== payment.payment_status) {
            logger.info(`✅ Phase 1 recovering payment ${payment.id}: ${payment.payment_status} → ${mappedStatus}`)

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
              logger.error(`❌ Phase 1: error updating payment ${payment.id}:`, updateError)
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
                    error_message: 'Recovered via cron job (Phase 1)',
                    raw_payload: {
                      recovery: true,
                      wallee_state: walleeState,
                      phase: 'pending_recovery'
                    }
                  })
              } catch (logErr: any) {
                logger.warn('⚠️ Could not log recovery:', logErr.message)
              }
            }
          } else {
            logger.info(`⏭️ Phase 1 payment ${payment.id}: status unchanged (${mappedStatus})`)
          }
        } catch (error: any) {
          logger.error(`❌ Phase 1: error processing payment ${payment.id}:`, error.message)
          failed++
          errors.push({ paymentId: payment.id, error: error.message })
        }
      }

      logger.info(`✅ Phase 1 complete: ${recovered} recovered, ${failed} failed out of ${pendingPayments.length} checked`)
    }

    // ============ PHASE 2: Recover stuck 'processing' payments ============
    // Payments in 'processing' are held by an optimistic lock set in process.post.ts
    // when the user is redirected to Wallee. If the Wallee webhook for FAILED/DECLINE
    // never arrives, the payment stays in 'processing' forever and blocks the pay button.
    // We mirror the webhook handler: FAILED/DECLINE/CANCELED/VOIDED on a 'processing'
    // payment → reset to 'pending' so the customer can retry.
    let processingReleased = 0
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

      const { data: stuckPayments, error: stuckError } = await supabase
        .from('payments')
        .select('id, user_id, tenant_id, wallee_transaction_id, wallee_space_id, payment_status, created_at, updated_at')
        .eq('payment_status', 'processing')
        .eq('payment_method', 'wallee')
        .not('wallee_transaction_id', 'is', null)
        .lt('created_at', tenMinutesAgo)
        .lt('updated_at', tenMinutesAgo)

      logger.info(`🔍 Phase 2: found ${stuckPayments?.length ?? 0} stuck 'processing' payment(s) to check`)

      if (!stuckError && stuckPayments && stuckPayments.length > 0) {
        for (const payment of stuckPayments) {
          let walleeState: string | undefined
          try {
            // Use getWalleeConfigBySpace so we always match the exact Wallee space the
            // transaction lives in (avoids wrong-credentials errors when test mode is
            // active or when per-tenant credentials differ from the env fallback).
            let walleeConfig
            if (payment.wallee_space_id) {
              walleeConfig = await getWalleeConfigBySpace(payment.tenant_id, payment.wallee_space_id)
            } else {
              walleeConfig = await getWalleeConfigForTenant(payment.tenant_id)
            }
            const config = getWalleeSDKConfig(walleeConfig.spaceId, walleeConfig.userId, walleeConfig.apiSecret)
            const transactionService = new Wallee.api.TransactionService(config)

            const response = await transactionService.read(walleeConfig.spaceId, parseInt(payment.wallee_transaction_id))
            const transaction = response?.body || response
            walleeState = transaction?.state

            if (!walleeState) {
              logger.warn(`⚠️ No Wallee state for processing payment ${payment.id}, skipping`)
              try {
                await supabase.from('webhook_logs').insert({
                  transaction_id: payment.wallee_transaction_id,
                  payment_id: payment.id,
                  wallee_state: 'UNKNOWN',
                  payment_status_before: 'processing',
                  success: false,
                  error_message: 'Cron Phase 2: Wallee returned no state for transaction',
                  raw_payload: { recovery: true, phase: 'processing_no_state' }
                })
              } catch {}
              continue
            }

            const mappedStatus = STATUS_MAPPING[walleeState] || 'pending'
            logger.info(`📊 Phase 2 payment ${payment.id}: Wallee=${walleeState} → ${mappedStatus}`)

            const isTerminalFailure = mappedStatus === 'failed' || mappedStatus === 'cancelled'

            if (isTerminalFailure) {
              // Wallee says it failed — release the optimistic lock back to pending so the customer can retry
              logger.info(`🔓 Releasing processing lock for payment ${payment.id} (Wallee: ${walleeState}) → pending`)
              const { error: releaseErr } = await supabase
                .from('payments')
                .update({ payment_status: 'pending', updated_at: new Date().toISOString() })
                .eq('id', payment.id)
                .eq('payment_status', 'processing')

              if (releaseErr) {
                logger.error(`❌ Error releasing lock for payment ${payment.id}:`, releaseErr)
              } else {
                processingReleased++
                try {
                  await supabase.from('webhook_logs').insert({
                    transaction_id: payment.wallee_transaction_id,
                    payment_id: payment.id,
                    wallee_state: walleeState,
                    payment_status_before: 'processing',
                    payment_status_after: 'pending',
                    success: true,
                    error_message: 'Processing lock released via cron (Wallee reported failure, webhook missed)',
                    raw_payload: { recovery: true, wallee_state: walleeState, phase: 'processing_release' }
                  })
                } catch {}
              }
            } else if (mappedStatus === 'completed' || mappedStatus === 'authorized') {
              // Wallee says it succeeded — update normally (webhook was likely missed)
              logger.info(`✅ Completing stuck processing payment ${payment.id} (Wallee: ${walleeState}) → ${mappedStatus}`)
              const updateData: any = { payment_status: mappedStatus, updated_at: new Date().toISOString() }
              if (mappedStatus === 'completed') updateData.paid_at = new Date().toISOString()

              const { error: completeErr } = await supabase
                .from('payments')
                .update(updateData)
                .eq('id', payment.id)
                .eq('payment_status', 'processing')

              if (completeErr) {
                logger.error(`❌ Error completing payment ${payment.id}:`, completeErr)
              } else {
                recovered++
                try {
                  await supabase.from('webhook_logs').insert({
                    transaction_id: payment.wallee_transaction_id,
                    payment_id: payment.id,
                    wallee_state: walleeState,
                    payment_status_before: 'processing',
                    payment_status_after: mappedStatus,
                    success: true,
                    error_message: 'Recovered stuck processing payment via cron (webhook missed)',
                    raw_payload: { recovery: true, wallee_state: walleeState, phase: 'processing_complete' }
                  })
                } catch {}
              }
            } else if (mappedStatus === 'processing' || mappedStatus === 'pending') {
              // Wallee is still in CONFIRMED/PROCESSING/PENDING — normally in-flight.
              // BUT: if the Wallee transaction has been in-flight for more than 2 hours
              // (based on when the payment was last updated, i.e. when the transaction
              // was created), it's safe to assume Wallee will never complete it.
              // Release the lock back to pending so the customer can retry.
              //
              // NOTE: We intentionally use `updated_at` (when the transaction was last set)
              // rather than `created_at` (original payment creation, potentially months old).
              // Using `created_at` would cause every old payment with a brand-new transaction
              // to be incorrectly flagged as long-stuck on the very first cron cycle.
              const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
              const isLongStuck = payment.updated_at < twoHoursAgo

              if (isLongStuck) {
                logger.info(`⏰ Payment ${payment.id} stuck in processing/Wallee-${walleeState} for >2h (updated_at: ${payment.updated_at}) — releasing to pending`)
                const { error: timeoutReleaseErr } = await supabase
                  .from('payments')
                  .update({ payment_status: 'pending', updated_at: new Date().toISOString() })
                  .eq('id', payment.id)
                  .eq('payment_status', 'processing')

                if (timeoutReleaseErr) {
                  logger.error(`❌ Error releasing timeout lock for payment ${payment.id}:`, timeoutReleaseErr)
                } else {
                  processingReleased++
                  try {
                    await supabase.from('webhook_logs').insert({
                      transaction_id: payment.wallee_transaction_id,
                      payment_id: payment.id,
                      wallee_state: walleeState,
                      payment_status_before: 'processing',
                      payment_status_after: 'pending',
                      success: true,
                      error_message: `Processing lock released via cron after 2h timeout (Wallee still ${walleeState}, updated_at: ${payment.updated_at})`,
                      raw_payload: { recovery: true, wallee_state: walleeState, phase: 'processing_timeout_release' }
                    })
                  } catch {}
                }
              } else {
                logger.debug(`⏳ Payment ${payment.id} still in-flight (Wallee: ${walleeState}), updated_at: ${payment.updated_at} — waiting for 2h timeout`)
              }
              // If not yet 2 hours old, leave alone and check again next cycle.
            }
          } catch (stuckErr: any) {
            logger.error(`❌ Error checking stuck processing payment ${payment.id}:`, stuckErr.message)
            try {
              await supabase.from('webhook_logs').insert({
                transaction_id: payment.wallee_transaction_id,
                payment_id: payment.id,
                wallee_state: walleeState ?? 'ERROR',
                payment_status_before: 'processing',
                success: false,
                error_message: `Cron Phase 2 error: ${stuckErr.message}`,
                raw_payload: { recovery: true, phase: 'processing_error', error: stuckErr.message }
              })
            } catch {}
          }
        }
      }
    } catch (phase2Err: any) {
      logger.warn('⚠️ Phase 2 (processing lock release) failed:', phase2Err.message)
    }

    // ============ PHASE 3: Cancel abandoned checkouts ============
    // Pending payments with no user_id older than 3 hours = abandoned checkout.
    // The user started the Wallee checkout page but never completed it.
    // We mark them as cancelled so they don't pollute the dashboard stats.
    let abandoned = 0
    try {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

      const { data: abandonedPayments, error: abandonedError } = await supabase
        .from('payments')
        .select('id')
        .eq('payment_status', 'pending')
        .eq('payment_method', 'wallee')
        .is('user_id', null)
        .lt('created_at', threeHoursAgo)

      logger.info(`🗑️ Phase 3: found ${abandonedPayments?.length ?? 0} abandoned checkout(s) (no user_id after 3h)`)

      if (!abandonedError && abandonedPayments && abandonedPayments.length > 0) {
        const ids = abandonedPayments.map(p => p.id)
        const { error: cancelError } = await supabase
          .from('payments')
          .update({
            payment_status: 'cancelled',
            notes: 'Automatisch storniert: Checkout-Abbruch (kein User nach 3h)',
            updated_at: new Date().toISOString()
          })
          .in('id', ids)

        if (!cancelError) {
          abandoned = ids.length
          logger.info(`🧹 Phase 3: cancelled ${abandoned} abandoned checkout payment(s)`)
        } else {
          logger.warn('⚠️ Phase 3: error cancelling abandoned payments:', cancelError.message)
        }
      }
    } catch (abandonedErr: any) {
      logger.warn('⚠️ Phase 3 (abandoned cleanup) failed:', abandonedErr.message)
    }

    const duration = Date.now() - startTime
    logger.info(`🏁 Recovery cron finished in ${duration}ms — Phase1: ${recovered} recovered / ${failed} failed | Phase2: ${processingReleased} processing released | Phase3: ${abandoned} abandoned cancelled`)

    return {
      success: true,
      message: 'Wallee payment recovery completed',
      summary: {
        phase1_checked: pendingPayments?.length ?? 0,
        phase1_recovered: recovered,
        phase1_failed: failed,
        phase2_processing_released: processingReleased,
        phase3_abandoned_cancelled: abandoned,
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
