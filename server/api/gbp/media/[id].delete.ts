import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * DELETE /api/gbp/media/:id
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

  if (asset.source === 'upload' && asset.storage_path && !asset.storage_path.startsWith('url/')) {
    await supabase.storage.from('tenant-assets').remove([asset.storage_path])
  }

  const { error } = await supabase
    .from('gbp_media_assets')
    .delete()
    .eq('id', id)
    .eq('tenant_id', authUser.tenant_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
