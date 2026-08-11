/**
 * GET /api/cron/sync-auto-waitlists
 *
 * Keeps auto waitlist placeholders in sync for categories with waitlist_enabled.
 * Schedule: hourly
 */
import { defineEventHandler, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { syncAutoCategoryWaitlists } from '~/server/utils/auto-category-waitlist'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on sync-auto-waitlists')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const started = Date.now()
  const supabase = getSupabaseAdmin()
  const { actions } = await syncAutoCategoryWaitlists(supabase)

  return {
    success: true,
    durationMs: Date.now() - started,
    changes: actions.filter((a) => a.action !== 'skipped').length,
    actions,
  }
})
