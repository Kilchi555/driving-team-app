import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { deleteGbpPost } from '~/server/utils/gbp'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const postName = getRouterParam(event, 'name')
  if (!postName) throw createError({ statusCode: 400, statusMessage: 'Post name required' })

  try {
    await deleteGbpPost(authUser.tenant_id, decodeURIComponent(postName))
    return { success: true }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to delete post' })
  }
})
