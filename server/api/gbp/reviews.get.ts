import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getGbpReviews } from '~/server/utils/gbp'

/**
 * GET /api/gbp/reviews
 * Returns the 20 most recent GBP reviews.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  try {
    const data = await getGbpReviews(authUser.tenant_id)
    return { success: true, reviews: data.reviews ?? [], totalReviewCount: data.totalReviewCount, averageRating: data.averageRating }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to fetch reviews' })
  }
})
