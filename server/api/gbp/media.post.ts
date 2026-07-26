import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { resolveGbpLocation } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * POST /api/gbp/media
 * Add a public URL into the media pool (no immediate GBP publish).
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{
    publicUrl: string
    category?: 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'LOGO' | 'COVER'
    locationId?: string | null
    approved?: boolean
    notes?: string
  }>(event)

  if (!body?.publicUrl?.trim()) throw createError({ statusCode: 400, statusMessage: 'publicUrl required' })

  let locationUuid: string | null = null
  const locationId = getGbpLocationIdFromEvent(event, body)
  if (locationId) {
    const loc = await resolveGbpLocation(authUser.tenant_id, locationId)
    locationUuid = loc.id
  }

  const { data, error } = await getSupabaseAdmin()
    .from('gbp_media_assets')
    .insert({
      tenant_id: authUser.tenant_id,
      location_id: locationUuid,
      storage_path: `url/${Date.now()}`,
      public_url: body.publicUrl.trim(),
      category: body.category || 'INTERIOR',
      approved: body.approved === true,
      source: 'url',
      notes: body.notes || null,
    })
    .select('*')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true, asset: data }
})
