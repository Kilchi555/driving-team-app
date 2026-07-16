/**
 * POST /api/super-admin/vercel-log-review-status
 * Marks a Vercel log review as reviewed/dismissed/open.
 * Body: { reviewId: string, status: 'open' | 'reviewed' | 'dismissed', notes?: string }
 * Super-admin only.
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { requireSuperAdmin } from '~/server/utils/require-super-admin'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

const VALID_STATUSES = ['open', 'reviewed', 'dismissed']

export default defineEventHandler(async (event) => {
  const authUser = await requireSuperAdmin(event)

  const body = await readBody(event)
  const reviewId = body?.reviewId as string | undefined
  const status = body?.status as string | undefined
  const notes = body?.notes as string | undefined

  if (!reviewId || !status || !VALID_STATUSES.includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'reviewId and a valid status are required' })
  }

  const dbUserId = (authUser as any).db_user_id || (authUser as any).profile?.id || null

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('vercel_log_reviews')
    .update({
      status,
      notes: notes ?? undefined,
      reviewed_at: status !== 'open' ? new Date().toISOString() : null,
      reviewed_by: status !== 'open' ? dbUserId : null,
    })
    .eq('id', reviewId)

  if (error) {
    logger.error('VercelLogReviewStatusAPI', 'Failed to update review status:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to update review status' })
  }

  return { success: true }
})
