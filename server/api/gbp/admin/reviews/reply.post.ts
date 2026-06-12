import { defineEventHandler, createError, readBody, getQuery } from 'h3'
import { requireSuperAdmin, getSimyGbpTenantId } from '~/server/utils/require-super-admin'
import { replyToGbpReview } from '~/server/utils/gbp'

/**
 * POST /api/gbp/admin/reviews/reply?reviewId=...
 */
export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const { reviewId } = getQuery(event) as { reviewId: string }
  if (!reviewId) throw createError({ statusCode: 400, statusMessage: 'reviewId query param required' })

  const { comment } = await readBody<{ comment: string }>(event)
  if (!comment?.trim()) throw createError({ statusCode: 400, statusMessage: 'Comment required' })

  const result = await replyToGbpReview(getSimyGbpTenantId(), reviewId, comment.trim())
  return { success: true, result }
})
