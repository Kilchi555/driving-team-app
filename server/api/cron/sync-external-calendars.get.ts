// Cron Job: Sync external calendars for all staff
// Called by Vercel scheduled cron (GET) or manual trigger with Bearer CRON_SECRET / x-api-key CRON_API_KEY

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { runExternalCalendarsSyncJob } from '~/server/utils/sync-external-calendars-job'
import { logger } from '~/utils/logger'
import { assertCronRequest } from '~/server/utils/cron-auth'

export default defineEventHandler(async (event) => {
  assertCronRequest(event)
  try {
    logger.info('🔄 Starting scheduled external calendar sync for all staff...')

    const result = await runExternalCalendarsSyncJob(getSupabaseAdmin())
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
