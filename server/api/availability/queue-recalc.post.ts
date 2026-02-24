/**
 * Staff-Specific Availability Recalculation Queue
 * 
 * When a staff member updates:
 * - Working hours
 * - Private events (external busy times)
 * 
 * We flag them for recalculation and a background job processes them.
 * This keeps the availability_slots table always current without waiting for nightly cron.
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

interface StaffRecalcRequest {
  staff_id: string
  tenant_id: string
  trigger: 'working_hours' | 'external_event' | 'appointment'
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as StaffRecalcRequest
    const { staff_id, tenant_id, trigger } = body

    if (!staff_id || !tenant_id || !trigger) {
      throw createError({
        statusCode: 400,
        statusMessage: 'staff_id, tenant_id, and trigger are required'
      })
    }

    const supabase = getSupabaseAdmin()

    // ============ STEP 1: Create or update recalculation queue entry ============
    logger.debug(`📋 Queueing staff for recalculation`, {
      staff_id,
      tenant_id,
      trigger
    })

    const { error: queueError } = await supabase
      .from('availability_recalc_queue')
      .upsert(
        {
          staff_id,
          tenant_id,
          trigger,
          queued_at: new Date().toISOString(),
          processed: false
        },
        { onConflict: 'staff_id,tenant_id' }
      )

    if (queueError) {
      logger.error('❌ Error queuing staff for recalculation:', queueError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to queue recalculation'
      })
    }

    logger.debug(`✅ Staff queued for recalculation: ${staff_id}`)

    // ============ STEP 2: Immediately trigger cron to process queue ============
    // Don't wait for next scheduled run - process immediately for instant updates
    try {
      logger.debug(`⚡ Immediately triggering cron to process queue...`)
      
      // Get CRON_SECRET for authentication
      const cronSecret = process.env.CRON_SECRET
      const headers: any = {
        'Content-Type': 'application/json'
      }
      
      // Only add auth header if CRON_SECRET is configured
      if (cronSecret && cronSecret.trim() !== '') {
        headers['Authorization'] = `Bearer ${cronSecret}`
      }
      
      const cronResponse = await $fetch('/api/cron/process-recalc-queue', {
        method: 'GET',
        headers
      })
      
      logger.debug(`✅ Cron executed immediately:`, {
        processed: cronResponse.processed,
        failed: cronResponse.failed,
        duration_ms: cronResponse.duration_ms
      })
      
    } catch (cronError: any) {
      // Non-critical: cron will run on next scheduled interval anyway
      logger.warn(`⚠️ Failed to trigger immediate cron (non-critical):`, cronError.message)
    }

    return {
      success: true,
      message: 'Staff queued for availability recalculation',
      queued: {
        staff_id,
        tenant_id,
        trigger
      }
    }

  } catch (error: any) {
    logger.error('❌ Error in queue-recalc API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to queue recalculation'
    })
  }
})
