import { defineEventHandler, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { uploadGbpPhoto, getGbpAutomationSettings, listTenantGbpLocations } from '~/server/utils/gbp'
import { assertCronAuth } from '~/server/utils/gbp-automation'
import {
  eligiblePhotoCandidates,
  normalizePhotosPerWeek,
  photoMinGapMs,
  startOfWeekIso,
  type GbpPhotoQueueAsset,
} from '~/server/utils/gbp-photo-schedule'

/**
 * GET /api/cron/publish-gbp-photos
 * Publishes approved pool photos according to photo_mode + photos_per_week.
 * - Up to photos_per_week per active location per calendar week (tenant timezone)
 * - Min spacing ≈ 7d / photos_per_week between publishes
 * - Order: queue_priority DESC, then least-recently published
 * Schedule: daily 08:15 UTC
 */
export default defineEventHandler(async (event) => {
  assertCronAuth(getHeader(event, 'authorization') || undefined)

  const supabase = getSupabaseAdmin()
  const { data: connections } = await supabase.from('tenant_google_connections').select('tenant_id')
  const tenantIds = [...new Set((connections ?? []).map(c => c.tenant_id))]

  let published = 0
  let skipped = 0
  let errors = 0

  for (const tenantId of tenantIds) {
    const { data: flag } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', 'features')
      .eq('setting_key', 'gbp_enabled')
      .maybeSingle()

    let enabled = false
    if (flag?.setting_value != null) {
      try {
        const parsed = typeof flag.setting_value === 'string' ? JSON.parse(flag.setting_value) : flag.setting_value
        enabled = parsed === true || parsed?.enabled === true || flag.setting_value === 'true'
      } catch {
        enabled = flag.setting_value === 'true'
      }
    }
    if (!enabled) continue

    const locations = await listTenantGbpLocations(tenantId)
    for (const loc of locations) {
      try {
        const settings = await getGbpAutomationSettings(tenantId, loc.id)
        if (settings.photo_mode === 'off') {
          skipped++
          continue
        }

        const perWeek = normalizePhotosPerWeek(settings.photos_per_week)
        const weekStart = startOfWeekIso(settings.timezone || 'Europe/Zurich')
        const minGapMs = photoMinGapMs(perWeek)
        const gapAgo = new Date(Date.now() - minGapMs).toISOString()

        const { count: weekCount } = await supabase
          .from('gbp_media_assets')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('location_id', loc.id)
          .gte('last_published_at', weekStart)

        if ((weekCount ?? 0) >= perWeek) {
          skipped++
          continue
        }

        const { data: recent } = await supabase
          .from('gbp_media_assets')
          .select('last_published_at')
          .eq('tenant_id', tenantId)
          .eq('location_id', loc.id)
          .not('last_published_at', 'is', null)
          .gte('last_published_at', gapAgo)
          .limit(1)

        if (recent?.length) {
          skipped++
          continue
        }

        const { data: allAssets } = await supabase
          .from('gbp_media_assets')
          .select('*')
          .eq('tenant_id', tenantId)
          .or(`location_id.eq.${loc.id},location_id.is.null`)
          .eq('approved', true)

        const candidates = eligiblePhotoCandidates({
          assets: (allAssets ?? []) as GbpPhotoQueueAsset[],
          locationId: loc.id,
          weekStartIso: weekStart,
        })

        const asset = candidates[0]
        if (!asset) {
          skipped++
          continue
        }

        const gbp = await uploadGbpPhoto(
          tenantId,
          asset.public_url,
          asset.category as 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'LOGO' | 'COVER',
          loc.id,
          asset.notes,
        )
        if (gbp?.error) {
          errors++
          continue
        }

        const nowIso = new Date().toISOString()

        if (asset.location_id) {
          await supabase
            .from('gbp_media_assets')
            .update({
              last_published_at: nowIso,
              publish_count: (asset.publish_count || 0) + 1,
              queue_priority: 0,
              updated_at: nowIso,
            })
            .eq('id', asset.id)
        } else {
          await supabase.from('gbp_media_assets').insert({
            tenant_id: tenantId,
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
          await supabase
            .from('gbp_media_assets')
            .update({
              last_published_at: nowIso,
              publish_count: (asset.publish_count || 0) + 1,
              queue_priority: 0,
              updated_at: nowIso,
            })
            .eq('id', asset.id)
        }

        published++
      } catch {
        errors++
      }
    }
  }

  return { ok: true, tenants: tenantIds.length, published, skipped, errors }
})
