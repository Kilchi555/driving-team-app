import { defineEventHandler, createError, getRouterParam, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { generateGbpPhotoCaptionFromBuffer } from '~/server/utils/gbp-automation'

const BUCKET = 'tenant-assets'

/**
 * POST /api/gbp/media/:id/recaption
 * Regenerate SEO caption for a pool asset (location-aware).
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const body = await readBody<{ draftText?: string | null; locationId?: string | null }>(event).catch(() => ({}))

  const supabase = getSupabaseAdmin()
  const { data: asset, error } = await supabase
    .from('gbp_media_assets')
    .select('*')
    .eq('tenant_id', authUser.tenant_id)
    .eq('id', id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!asset) throw createError({ statusCode: 404, statusMessage: 'Asset not found' })
  if (!asset.storage_path) throw createError({ statusCode: 400, statusMessage: 'Kein Storage-Pfad für Caption' })

  const { data: file, error: dlError } = await supabase.storage
    .from(BUCKET)
    .download(asset.storage_path)

  if (dlError || !file) {
    throw createError({ statusCode: 500, statusMessage: dlError?.message || 'Download fehlgeschlagen' })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const locationId = body?.locationId || asset.location_id
  const caption = await generateGbpPhotoCaptionFromBuffer({
    tenantId: authUser.tenant_id,
    locationId,
    imageBuffer: buffer,
    draftText: body?.draftText ?? asset.notes,
  })

  if (!caption?.trim()) {
    throw createError({ statusCode: 502, statusMessage: 'KI lieferte keine Caption' })
  }

  const notes = caption.trim().slice(0, 250)
  const { data: updated, error: updError } = await supabase
    .from('gbp_media_assets')
    .update({ notes, updated_at: new Date().toISOString() })
    .eq('tenant_id', authUser.tenant_id)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (updError) throw createError({ statusCode: 500, statusMessage: updError.message })
  return { ok: true, asset: updated, notes }
})
