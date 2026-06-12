import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { createGbpPost } from '~/server/utils/gbp'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{
    summary: string
    callToActionType?: 'LEARN_MORE' | 'SIGN_UP' | 'BOOK' | 'ORDER' | 'SHOP' | 'CALL'
    callToActionUrl?: string
    topicType?: 'STANDARD' | 'EVENT' | 'OFFER'
  }>(event)

  if (!body.summary?.trim()) throw createError({ statusCode: 400, statusMessage: 'Post text required' })

  try {
    const post = await createGbpPost(authUser.tenant_id, body)
    return { success: true, post }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message || 'Failed to create post' })
  }
})
