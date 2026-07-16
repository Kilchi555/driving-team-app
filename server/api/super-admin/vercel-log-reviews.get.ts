/**
 * GET /api/super-admin/vercel-log-reviews
 * Lists the Vercel error/warning reviews created by the review-vercel-logs cron.
 * Super-admin only.
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)

  const query = getQuery(event)
  const status = query.status as string | undefined
  const limit = Math.min(parseInt(query.limit as string) || 50, 200)

  const supabase = getSupabaseAdmin()
  let dbQuery = supabase
    .from('vercel_log_reviews')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) dbQuery = dbQuery.eq('status', status)

  const { data, error, count } = await dbQuery

  if (error) {
    logger.error('VercelLogReviewsAPI', 'Failed to fetch reviews:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch reviews' })
  }

  return { success: true, data: { reviews: data || [], total: count || 0 } }
})
