import { defineEventHandler, createError, readBody, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { replyToGbpReview } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * POST /api/gbp/reviews/:id/reply
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const reviewId = getRouterParam(event, 'id')
  if (!reviewId) throw createError({ statusCode: 400, statusMessage: 'Review ID required' })

  const body = await readBody<{ comment: string; locationId?: string }>(event)
  if (!body?.comment?.trim()) throw createError({ statusCode: 400, statusMessage: 'Comment required' })

  try {
    const result = await replyToGbpReview(
      authUser.tenant_id,
      reviewId,
      body.comment.trim(),
      getGbpLocationIdFromEvent(event, body)
    )
    return { success: true, reply: result }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to reply to review' })
  }
})
