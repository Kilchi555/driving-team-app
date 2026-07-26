import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getGbpReviews } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * GET /api/gbp/reviews?locationId=
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  try {
    const data = await getGbpReviews(authUser.tenant_id, getGbpLocationIdFromEvent(event))
    return {
      success: true,
      reviews: data.reviews ?? [],
      totalReviewCount: data.totalReviewCount,
      averageRating: data.averageRating,
    }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to fetch reviews' })
  }
})
