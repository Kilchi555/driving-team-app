import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { uploadGbpPhoto, resolveGbpLocation } from '~/server/utils/gbp'

/**
 * POST /api/gbp/media/:id/publish
 * Publish one pool asset to GBP now.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const body = await readBody<{ locationId?: string }>(event)
  const supabase = getSupabaseAdmin()

  const { data: asset, error } = await supabase
    .from('gbp_media_assets')
    .select('*')
    .eq('tenant_id', authUser.tenant_id)
    .eq('id', id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!asset) throw createError({ statusCode: 404, statusMessage: 'Asset not found' })

  const locationId = body?.locationId || asset.location_id
  if (!locationId) throw createError({ statusCode: 400, statusMessage: 'locationId required' })

  const loc = await resolveGbpLocation(authUser.tenant_id, locationId)
  const gbp = await uploadGbpPhoto(
    authUser.tenant_id,
    asset.public_url,
    asset.category,
    loc.id,
    asset.notes
  )

  if (gbp?.error) {
    throw createError({ statusCode: 502, statusMessage: gbp.error.message || 'GBP upload failed' })
  }

  const nowIso = new Date().toISOString()

  // Shared (null) assets: clone to location so other locations keep the original
  if (!asset.location_id) {
    const { data: cloned } = await supabase
      .from('gbp_media_assets')
      .insert({
        tenant_id: authUser.tenant_id,
        location_id: loc.id,
        storage_path: asset.storage_path,
        public_url: asset.public_url,
        category: asset.category,
        approved: true,
        source: asset.source || 'upload',
        notes: asset.notes,
        last_published_at: nowIso,
        publish_count: 1,
        queue_priority: 0,
      })
      .select('*')
      .single()
    await supabase
      .from('gbp_media_assets')
      .update({ queue_priority: 0, updated_at: nowIso })
      .eq('id', id)
    return { ok: true, asset: cloned, gbp }
  }

  const { data: updated } = await supabase
    .from('gbp_media_assets')
    .update({
      approved: true,
      last_published_at: nowIso,
      publish_count: (asset.publish_count || 0) + 1,
      queue_priority: 0,
      updated_at: nowIso,
    })
    .eq('id', id)
    .select('*')
    .single()

  return { ok: true, asset: updated, gbp }
})
