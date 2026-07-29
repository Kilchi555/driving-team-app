import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { uploadGbpPhoto } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{
    photoUrl: string
    category?: 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'LOGO' | 'COVER'
    locationId?: string
    description?: string | null
  }>(event)

  if (!body?.photoUrl) throw createError({ statusCode: 400, statusMessage: 'photoUrl required' })

  try {
    const result = await uploadGbpPhoto(
      authUser.tenant_id,
      body.photoUrl,
      body.category,
      getGbpLocationIdFromEvent(event, body),
      body.description
    )
    return { success: true, media: result }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to upload photo' })
  }
})
