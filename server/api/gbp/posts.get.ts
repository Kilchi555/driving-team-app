import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { listGbpPosts } from '~/server/utils/gbp'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  try {
    const data = await listGbpPosts(authUser.tenant_id)
    return { success: true, posts: data.localPosts ?? [] }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to fetch posts' })
  }
})
