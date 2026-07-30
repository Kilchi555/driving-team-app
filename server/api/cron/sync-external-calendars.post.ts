// Cron Job: Sync external calendars for all staff (manual / legacy POST trigger)

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { runExternalCalendarsSyncJob } from '~/server/utils/sync-external-calendars-job'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const apiKey = getHeader(event, 'x-api-key')
    const expectedKey = process.env.CRON_API_KEY

    if (!apiKey || !expectedKey || apiKey !== expectedKey) {
      logger.warn('⚠️ Cron job called without valid API key')
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or missing API key'
      })
    }

    logger.info('🔄 Starting scheduled external calendar sync for all staff...')

    // Same hardened job as GET — no per-event slot invalidation in-request
    // (availability_recalc_queue + process-recalc-queue cron handle that).
    const result = await runExternalCalendarsSyncJob(getSupabaseAdmin(), {
      notifyOnFailure: false,
    })
    return result
  } catch (error: any) {
    logger.error('❌ Cron sync error:', error)
    return {
      success: false,
      message: 'Cron sync failed',
      error: error.message || 'Unknown error'
    }
  }
})
