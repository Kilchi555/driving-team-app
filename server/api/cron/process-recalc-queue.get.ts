/**
 * Cron Job: Process Staff Availability Recalculation Queue
 * 
 * PURPOSE:
 * - Runs every 5 minutes
 * - Processes pending staff recalculations from queue
 * - Recalculates availability_slots for queued staff
 * - Handles both immediate updates and bulk nightly recalcs
 * 
 * TRIGGERED BY:
 * - Staff updates working hours
 * - Staff adds/removes private events
 * - Staff creates/updates appointments
 * 
 * BENEFITS:
 * - Users see availability updates within 5 minutes
 * - No need to wait for nightly 3am cron
 * - Only affected staff are processed
 * - Scalable: can batch multiple staff
 */

import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { availabilityCalculator } from '~/server/services/availability-calculator'

export default defineEventHandler(async (event) => {
  try {
    logger.debug('⏰ Starting availability recalculation queue processor...')

    const supabase = getSupabaseAdmin()
    const startTime = Date.now()

    // ============ STEP 1: Get pending recalculations ============
    const { data: pendingQueue, error: queueError } = await supabase
      .from('availability_recalc_queue')
      .select('*')
      .eq('processed', false)
      .order('queued_at', { ascending: true })
      .limit(50) // Process up to 50 staff per run

    if (queueError) {
      logger.error('❌ Error fetching recalc queue:', queueError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch recalculation queue'
      })
    }

    const pendingCount = pendingQueue?.length || 0
    logger.debug(`📋 Found ${pendingCount} pending staff recalculations`)

    if (pendingCount === 0) {
      return {
        success: true,
        message: 'No pending recalculations',
        processed: 0
      }
    }

    // ============ STEP 2: Process each staff member ============
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as any[]
    }

    for (const queueEntry of pendingQueue || []) {
      try {
        logger.debug(`🔄 Processing staff: ${queueEntry.staff_id} (trigger: ${queueEntry.trigger})`)

        // Recalculate availability for next 30 days
        const slotsCreated = await availabilityCalculator.recalculateForStaff(
          queueEntry.tenant_id,
          queueEntry.staff_id,
          30 // 30 days
        )

        logger.debug(`✅ Recalculated ${slotsCreated} slots for ${queueEntry.staff_id}`)

        // Mark as processed
        const { error: updateError } = await supabase
          .from('availability_recalc_queue')
          .update({
            processed: true,
            processed_at: new Date().toISOString()
          })
          .eq('id', queueEntry.id)

        if (updateError) {
          logger.warn(`⚠️ Failed to mark queue entry as processed: ${updateError.message}`)
        }

        results.successful++

      } catch (error: any) {
        logger.error(`❌ Error processing staff ${queueEntry.staff_id}:`, error)
        results.failed++
        results.errors.push({
          staff_id: queueEntry.staff_id,
          error: error.message
        })
      }
    }

    const duration = Date.now() - startTime
    logger.info(`✅ Queue processing complete:`, {
      successful: results.successful,
      failed: results.failed,
      total: pendingCount,
      duration_ms: duration
    })

    return {
      success: results.failed === 0,
      message: `Processed ${results.successful}/${pendingCount} staff recalculations`,
      processed: results.successful,
      failed: results.failed,
      errors: results.errors,
      duration_ms: duration
    }

  } catch (error: any) {
    logger.error('❌ Critical error in recalc queue processor:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to process recalculation queue'
    })
  }
})
