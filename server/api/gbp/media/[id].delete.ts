import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * DELETE /api/gbp/media/:id
 * Removes the pool row. Storage file is only deleted when no other pool rows share the path.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const supabase = getSupabaseAdmin()
  const { data: asset } = await supabase
    .from('gbp_media_assets')
    .select('id, storage_path, source')
    .eq('tenant_id', authUser.tenant_id)
    .eq('id', id)
    .maybeSingle()

  if (!asset) throw createError({ statusCode: 404, statusMessage: 'Asset not found' })

  const { error } = await supabase
    .from('gbp_media_assets')
    .delete()
    .eq('id', id)
    .eq('tenant_id', authUser.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Only remove storage when this was the last reference to the file
  if (asset.source === 'upload' && asset.storage_path && !asset.storage_path.startsWith('url/')) {
    const { count } = await supabase
      .from('gbp_media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', authUser.tenant_id)
      .eq('storage_path', asset.storage_path)

    if ((count ?? 0) === 0) {
      await supabase.storage.from('tenant-assets').remove([asset.storage_path])
    }
  }

  return { ok: true }
})
