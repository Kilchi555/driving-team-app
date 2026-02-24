/**
 * DEBUG: Manually trigger availability recalculation queue processor
 * 
 * Only available in non-production environments or with admin token
 * 
 * Usage:
 * POST /api/debug/trigger-recalc-queue
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Queue processor triggered",
 *   "result": { ... cron response ... }
 * }
 */

import { defineEventHandler, createError, getHeader } from 'h3'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    logger.debug('🧪 DEBUG: Manually triggering recalc queue processor...')

    // Get CRON_SECRET for authentication
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || cronSecret.trim() === '') {
      throw createError({
        statusCode: 503,
        statusMessage: 'CRON_SECRET not configured'
      })
    }

    // Trigger the cron endpoint
    const cronResponse = await $fetch('/api/cron/process-recalc-queue', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    })

    logger.debug('✅ Queue processor triggered successfully:', cronResponse)

    return {
      success: true,
      message: 'Queue processor triggered successfully',
      result: cronResponse
    }

  } catch (error: any) {
    logger.error('❌ Failed to trigger queue processor:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to trigger queue processor'
    })
  }
})
