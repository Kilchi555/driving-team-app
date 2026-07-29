import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getGbpLocationProfile } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * GET /api/gbp/profile
 * Editable profile fields: description, contact info, hours, categories.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const locationId = getGbpLocationIdFromEvent(event)
  try {
    const profile = await getGbpLocationProfile(authUser.tenant_id, locationId)
    return { success: true, profile }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Profil konnte nicht geladen werden' })
  }
})
