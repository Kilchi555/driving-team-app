import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * PATCH /api/gbp/media/:id — approve / notes / category
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const body = await readBody<{
    approved?: boolean
    category?: string
    notes?: string | null
    locationId?: string | null
  }>(event)

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.approved != null) patch.approved = body.approved
  if (body.category != null) patch.category = body.category
  if (body.notes !== undefined) patch.notes = body.notes
  if (body.locationId !== undefined) patch.location_id = body.locationId

  const { data, error } = await getSupabaseAdmin()
    .from('gbp_media_assets')
    .update(patch)
    .eq('tenant_id', authUser.tenant_id)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Asset not found' })
  return { ok: true, asset: data }
})
