import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { replyToGbpReview } from '~/server/utils/gbp'

/**
 * POST /api/gbp/reviews/:id/reply
 * Posts a reply to a GBP review.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const reviewId = getRouterParam(event, 'id')
  if (!reviewId) throw createError({ statusCode: 400, statusMessage: 'Review ID required' })

  const { comment } = await readBody<{ comment: string }>(event)
  if (!comment?.trim()) throw createError({ statusCode: 400, statusMessage: 'Comment required' })

  try {
    const result = await replyToGbpReview(authUser.tenant_id, reviewId, comment.trim())
    return { success: true, reply: result }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to reply to review' })
  }
})
