// Cron Job: Sync external calendars for all staff
// Called by Vercel scheduled cron (GET) or manual trigger with Bearer CRON_SECRET / x-api-key CRON_API_KEY

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { runExternalCalendarsSyncJob } from '~/server/utils/sync-external-calendars-job'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // ============ SECURITY: Accept x-vercel-cron, Bearer CRON_SECRET, or x-api-key CRON_API_KEY ============
    const vercelCronHeader = getHeader(event, 'x-vercel-cron')
    const authHeader = getHeader(event, 'authorization')
    const apiKey = getHeader(event, 'x-api-key')

    const cronSecret = process.env.CRON_SECRET
    const apiKeyEnv = process.env.CRON_API_KEY

    const isVercelCron = vercelCronHeader === '1'
    const isValidSecret = cronSecret && cronSecret.trim() !== '' && authHeader === `Bearer ${cronSecret}`
    const isValidApiKey = apiKeyEnv && apiKey === apiKeyEnv

    if (!isVercelCron && !isValidSecret && !isValidApiKey) {
      logger.warn('⚠️ sync-external-calendars cron called without valid auth')
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - invalid or missing credentials'
      })
    }

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
