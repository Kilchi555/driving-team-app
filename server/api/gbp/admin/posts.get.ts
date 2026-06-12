import { defineEventHandler, createError } from 'h3'
import { requireSuperAdmin, getSimyGbpTenantId } from '~/server/utils/require-super-admin'
import { listGbpPosts } from '~/server/utils/gbp'

export default defineEventHandler(async (event) => {
  await requireSuperAdmin(event)
  try {
    const data = await listGbpPosts(getSimyGbpTenantId())
    return { success: true, posts: data.localPosts ?? [] }
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: err.message })
  }
})
