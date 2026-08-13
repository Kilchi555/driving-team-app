import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { requireFeature } from '~/server/utils/require-feature'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getGbpAutomationSettings, resolveGbpLocation } from '~/server/utils/gbp'
import { getGbpLocationIdFromEvent } from '~/server/utils/gbp-location-param'
import {
  predictNextPhotoSlots,
  type GbpPhotoQueueAsset,
} from '~/server/utils/gbp-photo-schedule'

/**
 * GET /api/gbp/media/schedule?locationId=
 * Predicted upcoming photo drip slots for a location (same rules as cron).
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await requireFeature(authUser.tenant_id, 'gbp_enabled')

  const locationParam = getGbpLocationIdFromEvent(event)
  if (!locationParam) throw createError({ statusCode: 400, statusMessage: 'locationId required' })

  const loc = await resolveGbpLocation(authUser.tenant_id, locationParam)
  const settings = await getGbpAutomationSettings(authUser.tenant_id, loc.id)

  const { data: assets, error } = await getSupabaseAdmin()
    .from('gbp_media_assets')
    .select('*')
    .eq('tenant_id', authUser.tenant_id)
    .or(`location_id.eq.${loc.id},location_id.is.null`)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const list = (assets ?? []) as GbpPhotoQueueAsset[]
  const prediction = predictNextPhotoSlots({
    settings: {
      photo_mode: settings.photo_mode,
      photos_per_week: settings.photos_per_week,
      timezone: settings.timezone || 'Europe/Zurich',
    },
    assets: list,
    locationId: loc.id,
    maxSlots: 8,
  })

  const byId = new Map(list.map(a => [a.id, a]))
  const upcoming = prediction.upcoming.map((slot) => {
    const asset = byId.get(slot.assetId)
    return {
      rank: slot.rank,
      estimatedAt: slot.estimatedAt,
      assetId: slot.assetId,
      publicUrl: asset?.public_url ?? null,
      category: asset?.category ?? null,
      notes: asset?.notes ?? null,
      approved: asset?.approved ?? false,
      queuePriority: asset?.queue_priority ?? 0,
      lastPublishedAt: asset?.last_published_at ?? null,
      publishCount: asset?.publish_count ?? 0,
    }
  })

  return {
    ok: true,
    locationId: loc.id,
    photoMode: settings.photo_mode,
    photosPerWeek: prediction.photosPerWeek,
    timezone: settings.timezone || 'Europe/Zurich',
    status: prediction.status,
    remainingThisWeek: prediction.remainingThisWeek,
    nextPublishAt: prediction.nextPublishAt,
    cronUtc: '08:15',
    upcoming,
  }
})
