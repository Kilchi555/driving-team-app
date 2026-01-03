/**
 * Cron Job: Process Automatic Payments
 * Runs every 5 minutes to authorize payments where scheduled_authorization_date <= NOW
 * 
 * Security:
 * ✅ Layer 1: Auth - Vercel CRON_SECRET verification
 * ✅ Layer 2: Rate Limiting - Prevents re-trigger within 30 seconds
 * ✅ Layer 3: Audit Logging - Logs every execution
 * ✅ Layer 7: Error Handling - Detailed error messages
 * 
 * Flow:
 * - Termin < 24h away: scheduled_authorization_date = NOW → authorize immediately
 * - Termin >= 24h away: scheduled_authorization_date = start_time - 24h → authorize 24h before
 */

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { verifyCronToken, checkCronRateLimit, logCronExecution } from '~/server/utils/cron'

export default defineEventHandler(async (event) => {
  const startTime = new Date()
  let processedCount = 0
  let successCount = 0
  let skipCount = 0
  let failureCount = 0
  
  try {
    // Layer 1: Authentication - Verify Vercel Cron token
    if (!verifyCronToken(event)) {
      logger.error('🚨 Unauthorized cron request to process-automatic-payments')
      throw createError({
        statusCode: 401,
        message: 'Unauthorized - Invalid cron token'
      })
    }
    
    const supabase = getSupabaseAdmin()
    const now = new Date()
    
    // Layer 2: Rate Limiting - Prevent re-trigger
    const canRun = await checkCronRateLimit(supabase, 'process-automatic-payments', 30)
    if (!canRun) {
      logger.warn('⏱️ Rate limited: process-automatic-payments ran too recently')
      
      await logCronExecution(supabase, 'process-automatic-payments', 'success', {
        startedAt: startTime,
        completedAt: new Date(),
        errorMessage: 'Skipped due to rate limit'
      })
      
      return {
        success: false,
        reason: 'rate_limited',
        message: 'Skipped - ran too recently'
      }
    }

    logger.debug('💳 [CRON] Processing automatic payments - checking scheduled_authorization_date...')

    // Find payments that should be authorized NOW:
    // - payment_status is 'pending' (not yet authorized)
    // - scheduled_authorization_date <= NOW
    // - appointment is not cancelled
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        user_id,
        tenant_id,
        appointment_id,
        total_amount_rappen,
        scheduled_authorization_date,
        payment_status,
        appointments!inner (
          id,
          start_time,
          status
        )
      `)
      .eq('payment_status', 'pending')
      .lte('scheduled_authorization_date', now.toISOString())
      .not('appointments', 'is', null)

    if (paymentsError) {
      const errorMsg = `Error fetching pending payments: ${paymentsError.message}`
      logger.error(`❌ ${errorMsg}`)
      
      // Layer 3: Audit Logging - Log failure
      await logCronExecution(supabase, 'process-automatic-payments', 'failed', {
        startedAt: startTime,
        completedAt: new Date(),
        errorMessage: errorMsg
      })
      
      throw paymentsError
    }

    if (!payments || payments.length === 0) {
      logger.debug('ℹ️ No pending payments to authorize')
      
      // Layer 3: Audit Logging - Log success (no work)
      await logCronExecution(supabase, 'process-automatic-payments', 'success', {
        processedCount: 0,
        startedAt: startTime,
        completedAt: new Date()
      })
      
      return {
        success: true,
        processed: 0,
        message: 'No pending payments to authorize'
      }
    }

    processedCount = payments.length
    logger.debug(`📋 Found ${payments.length} payment(s) to authorize`)

    // Process each payment
    for (const payment of payments) {
      try {
        const appointment = Array.isArray(payment.appointments)
          ? payment.appointments[0]
          : payment.appointments

        // Skip if appointment is cancelled
        if (appointment.status === 'cancelled') {
          logger.debug(`⏭️  Skipping cancelled appointment payment: ${payment.id}`)
          skipCount++
          continue
        }

        const hoursUntilAppointment = (new Date(appointment.start_time).getTime() - now.getTime()) / (1000 * 60 * 60)
        logger.debug(`🔐 [${payment.id}] Authorizing payment (${hoursUntilAppointment.toFixed(1)}h until appointment)...`)

        // Call authorize-payment endpoint
        const authResponse = await $fetch('/api/wallee/authorize-payment', {
          method: 'POST',
          body: {
            paymentId: payment.id,
            userId: payment.user_id,
            tenantId: payment.tenant_id,
            appointmentStartTime: appointment.start_time,
            automaticPaymentHoursBefore: 24
          }
        })

        if (authResponse?.success) {
          logger.debug(`✅ [${payment.id}] Payment authorized - State: ${authResponse.state}`)
          successCount++
        } else {
          console.warn(`⚠️ [${payment.id}] Authorization returned non-success:`, authResponse)
          failureCount++
        }

      } catch (error: any) {
        console.error(`❌ [${payment.id}] Error authorizing:`, error.message)
        failureCount++
        // Continue with next payment
      }
    }

    const result = {
      success: true,
      total: payments.length,
      authorized: successCount,
      skipped: skipCount,
      failed: failureCount,
      runtime_ms: new Date().getTime() - startTime.getTime(),
      message: `Processed ${payments.length} payments: ${successCount} authorized, ${skipCount} skipped, ${failureCount} failed`
    }

    logger.debug(`📊 [CRON] Processing complete:`, result)
    
    // Layer 3: Audit Logging - Log success
    await logCronExecution(supabase, 'process-automatic-payments', 'success', {
      processedCount: successCount,
      startedAt: startTime,
      completedAt: new Date()
    })
    
    return result

  } catch (error: any) {
    logger.error(`❌ [CRON] Error in process-automatic-payments: ${error.message}`)
    
    // Log the error if we have supabase access
    try {
      const supabase = getSupabaseAdmin()
      await logCronExecution(supabase, 'process-automatic-payments', 'failed', {
        startedAt: startTime,
        completedAt: new Date(),
        processedCount: processedCount,
        errorMessage: error.message || 'Unknown error'
      })
    } catch (logError) {
      logger.error('❌ Failed to log cron error:', logError)
    }
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal server error'
    })
  }
})
