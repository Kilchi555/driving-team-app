import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { uploadGbpPhoto } from '~/server/utils/gbp'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const { photoUrl, category } = await readBody<{
    photoUrl: string
    category?: 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'LOGO' | 'COVER'
  }>(event)

  if (!photoUrl) throw createError({ statusCode: 400, statusMessage: 'photoUrl required' })

  try {
    const result = await uploadGbpPhoto(authUser.tenant_id, photoUrl, category)
    return { success: true, media: result }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to upload photo' })
  }
})
