import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getGbpInsights } from '~/server/utils/gbp'

/**
 * GET /api/gbp/insights
 * Returns GBP performance metrics for the last 28 days.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  try {
    const insights = await getGbpInsights(authUser.tenant_id)
    return { success: true, insights }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to fetch GBP insights' })
  }
})
