import { defineEventHandler, createError } from 'h3'
import { requireSuperAdmin, getSimyGbpTenantId } from '~/server/utils/require-super-admin'
import { getGbpReviews } from '~/server/utils/gbp'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  try {
    const data = await getGbpReviews(getSimyGbpTenantId())
    return { success: true, reviews: data.reviews ?? [], totalReviewCount: data.totalReviewCount, averageRating: data.averageRating }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message })
  }
})
