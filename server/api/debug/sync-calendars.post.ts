/**
 * DEBUG: Manually trigger external calendar sync
 * Useful for testing calendar integration immediately
 */

import { defineEventHandler, createError, getHeader } from 'h3'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Validate CRON_SECRET
    const authHeader = getHeader(event, 'authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - invalid CRON_SECRET'
      })
    }

    logger.debug('🧪 DEBUG: Manually triggering external calendar sync...')

    // Call the actual sync endpoint
    const syncResponse = await $fetch('/api/cron/sync-external-calendars', {
      method: 'POST',
      headers: {
        'x-api-key': cronSecret,
        'Content-Type': 'application/json'
      }
    })

    logger.debug('✅ Calendar sync completed:', syncResponse)

    return {
      success: true,
      message: 'External calendars synced successfully',
      result: syncResponse
    }

  } catch (error: any) {
    logger.error('❌ Failed to sync calendars:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to sync calendars'
    })
  }
})
