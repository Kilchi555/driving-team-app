import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * PATCH /api/gbp/media/:id — approve / notes / category / queue_priority / bumpToFront
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
    queue_priority?: number
    bumpToFront?: boolean
  }>(event)

  const supabase = getSupabaseAdmin()

  const { data: existing, error: loadError } = await supabase
    .from('gbp_media_assets')
    .select('*')
    .eq('tenant_id', authUser.tenant_id)
    .eq('id', id)
    .maybeSingle()

  if (loadError) throw createError({ statusCode: 500, statusMessage: loadError.message })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Asset not found' })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.approved != null) patch.approved = body.approved
  if (body.category != null) patch.category = body.category
  if (body.notes !== undefined) patch.notes = body.notes
  if (body.locationId !== undefined) patch.location_id = body.locationId
  if (body.queue_priority != null) patch.queue_priority = Math.max(0, Math.floor(body.queue_priority))

  if (body.bumpToFront === true) {
    let q = supabase
      .from('gbp_media_assets')
      .select('queue_priority')
      .eq('tenant_id', authUser.tenant_id)
      .order('queue_priority', { ascending: false })
      .limit(1)

    if (existing.location_id) {
      q = q.eq('location_id', existing.location_id)
    } else {
      q = q.is('location_id', null)
    }

    const { data: top } = await q.maybeSingle()
    const maxPri = top?.queue_priority ?? 0
    patch.queue_priority = maxPri + 1
  }

  const { data, error } = await supabase
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
