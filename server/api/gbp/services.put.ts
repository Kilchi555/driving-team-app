import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { updateGbpServices, type GbpServiceItem } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * PUT /api/gbp/services
 * Overwrites the full free-form service list for a location.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{ locationId?: string | null; services: GbpServiceItem[] }>(event)
  if (!Array.isArray(body?.services)) throw createError({ statusCode: 400, statusMessage: 'services required' })

  const locationId = getGbpLocationIdFromEvent(event, body)
  try {
    await updateGbpServices(authUser.tenant_id, body.services, locationId)
    return { success: true }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Services konnten nicht gespeichert werden' })
  }
})
