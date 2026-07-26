import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * DELETE /api/gbp/scheduled-posts/:id
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const { error } = await getSupabaseAdmin()
    .from('gbp_scheduled_posts')
    .delete()
    .eq('tenant_id', authUser.tenant_id)
    .eq('id', id)
    .neq('status', 'published')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
