import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { updateGbpLocationProfile, type GbpBusinessHoursPeriod } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * PUT /api/gbp/profile
 * Updates description, contact info, hours, and/or categories.
 * Only include the fields you want to change.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{
    locationId?: string | null
    description?: string | null
    phoneNumber?: string | null
    websiteUri?: string | null
    regularHours?: GbpBusinessHoursPeriod[]
    primaryCategoryId?: string
    additionalCategoryIds?: string[]
  }>(event)

  const locationId = getGbpLocationIdFromEvent(event, body)

  try {
    await updateGbpLocationProfile(authUser.tenant_id, {
      description: body.description,
      phoneNumber: body.phoneNumber,
      websiteUri: body.websiteUri,
      regularHours: body.regularHours,
      primaryCategoryId: body.primaryCategoryId,
      additionalCategoryIds: body.additionalCategoryIds,
    }, locationId)
    return { success: true }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'Profil konnte nicht gespeichert werden' })
  }
})
