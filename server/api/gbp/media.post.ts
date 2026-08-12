import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { listTenantGbpLocations, resolveGbpLocation } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'

/**
 * POST /api/gbp/media
 * Add a public URL into the media pool (no immediate GBP publish).
 * Supports locationIds[] / allLocations for multi-location pool entries.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const body = await readBody<{
    publicUrl: string
    category?: 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'LOGO' | 'COVER'
    locationId?: string | null
    locationIds?: string[]
    allLocations?: boolean
    approved?: boolean
    notes?: string
  }>(event)

  if (!body?.publicUrl?.trim()) throw createError({ statusCode: 400, statusMessage: 'publicUrl required' })

  let locationUuids: string[] = []

  if (body.allLocations) {
    const locs = await listTenantGbpLocations(authUser.tenant_id)
    locationUuids = locs.map(l => l.id)
  } else {
    const fromEvent = getGbpLocationIdFromEvent(event, body)
    const requested = [
      ...(Array.isArray(body.locationIds) ? body.locationIds : []),
      ...(body.locationId ? [body.locationId] : []),
      ...(fromEvent ? [fromEvent] : []),
    ]
    for (const id of [...new Set(requested.filter(Boolean))]) {
      const loc = await resolveGbpLocation(authUser.tenant_id, id)
      if (!locationUuids.includes(loc.id)) locationUuids.push(loc.id)
    }
  }

  if (!locationUuids.length) {
    throw createError({ statusCode: 400, statusMessage: 'Mindestens einen Standort wählen' })
  }

  const rows = locationUuids.map(locationId => ({
    tenant_id: authUser.tenant_id,
    location_id: locationId,
    storage_path: `url/${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    public_url: body.publicUrl.trim(),
    category: body.category || 'INTERIOR',
    approved: body.approved === true,
    source: 'url' as const,
    notes: body.notes || null,
  }))

  const { data, error } = await getSupabaseAdmin()
    .from('gbp_media_assets')
    .insert(rows)
    .select('*')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true, assets: data ?? [], asset: data?.[0] ?? null, locationCount: locationUuids.length }
})
