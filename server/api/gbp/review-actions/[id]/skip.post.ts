import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/gbp/review-actions/:id/skip
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const { data, error } = await getSupabaseAdmin()
    .from('gbp_review_actions')
    .update({ status: 'skipped', updated_at: new Date().toISOString() })
    .eq('tenant_id', authUser.tenant_id)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Action not found' })
  return { ok: true, action: data }
})
