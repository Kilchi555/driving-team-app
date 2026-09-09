/**
 * GET /api/cron/sync-auto-waitlists
 *
 * Keeps auto waitlist placeholders in sync for categories with waitlist_enabled.
 * Schedule: hourly
 */
import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { syncAutoCategoryWaitlists } from '~/server/utils/auto-category-waitlist'
import { logger } from '~/utils/logger'
import { assertCronRequest } from '~/server/utils/cron-auth'

export default defineEventHandler(async (event) => {
  assertCronRequest(event)

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
