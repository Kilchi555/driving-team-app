import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getGbpServices } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * GET /api/gbp/services
 * Free-form service items configured for a location.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const locationId = getGbpLocationIdFromEvent(event)
  try {
    const result = await getGbpServices(authUser.tenant_id, locationId)
    return { success: true, ...result }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Services konnten nicht geladen werden' })
  }
})
