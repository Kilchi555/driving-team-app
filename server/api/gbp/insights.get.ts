import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getGbpInsightsSnapshot } from '~/server/utils/gbp-insights'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * GET /api/gbp/insights?locationId=
 * Syncs (refills) Google metrics into DB, then returns display totals from history.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  try {
    const snapshot = await getGbpInsightsSnapshot(authUser.tenant_id, getGbpLocationIdFromEvent(event))
    return { success: true, ...snapshot }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to fetch GBP insights' })
  }
})
