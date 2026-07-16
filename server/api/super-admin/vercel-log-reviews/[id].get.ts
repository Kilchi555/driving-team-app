/**
 * GET /api/super-admin/vercel-log-reviews/:id
 * Returns a single review plus the raw log events it aggregated.
 * Super-admin only.
 */
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const supabase = getSupabaseAdmin()

  const { data: review, error: reviewError } = await supabase
    .from('vercel_log_reviews')
    .select('*')
    .eq('id', id)
    .single()

  if (reviewError || !review) {
    throw createError({ statusCode: 404, statusMessage: 'Review not found' })
  }

  const { data: events, error: eventsError } = await supabase
    .from('vercel_log_events')
    .select('id, level, message, status_code, path, method, environment, occurred_at, deployment_id')
    .eq('review_id', id)
    .order('occurred_at', { ascending: false })
    .limit(500)

  if (eventsError) {
    logger.error('VercelLogReviewsAPI', 'Failed to fetch review events:', eventsError)
  }

  return { success: true, data: { review, events: events || [] } }
})
