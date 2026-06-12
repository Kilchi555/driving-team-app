import { defineEventHandler, createError, readBody } from 'h3'
import { requireSuperAdmin, getSimyGbpTenantId } from '~/server/utils/require-super-admin'
import { createGbpPost, listGbpPosts } from '~/server/utils/gbp'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  const body = await readBody<{ summary: string; callToActionType?: string; callToActionUrl?: string; topicType?: string }>(event)
  if (!body.summary?.trim()) throw createError({ statusCode: 400, statusMessage: 'Post text required' })

  try {
    const post = await createGbpPost(getSimyGbpTenantId(), body as any)
    return { success: true, post }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message })
  }
})
