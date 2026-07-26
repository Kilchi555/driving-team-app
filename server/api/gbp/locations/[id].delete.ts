import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * DELETE /api/gbp/locations/:id
 * Soft-deactivates a linked GBP location (does not disconnect OAuth).
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'location id required' })

  const { data, error } = await getSupabaseAdmin()
    .from('gbp_locations')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('tenant_id', authUser.tenant_id)
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Location not found' })

  return { ok: true }
})
