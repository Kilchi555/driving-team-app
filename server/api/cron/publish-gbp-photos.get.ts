import { defineEventHandler, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { uploadGbpPhoto, getGbpAutomationSettings, listTenantGbpLocations } from '~/server/utils/gbp'
import { assertCronAuth } from '~/server/utils/gbp-automation'

/**
 * GET /api/cron/publish-gbp-photos
 * Publishes approved pool photos according to photo_mode.
 * - approved_only / pool_auto: up to 1 photo per active location per day
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
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

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

        // Already published a pool photo to this location in last 24h?
        const { count } = await supabase
          .from('gbp_media_assets')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('approved', true)
          .gte('last_published_at', dayAgo)
          .or(`location_id.eq.${loc.id},location_id.is.null`)

        if ((count ?? 0) > 0) {
          skipped++
          continue
        }

        // Pick least-recently published approved asset for this location (or tenant-wide)
        const { data: candidates } = await supabase
          .from('gbp_media_assets')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('approved', true)
          .or(`location_id.eq.${loc.id},location_id.is.null`)
          .order('last_published_at', { ascending: true, nullsFirst: true })
          .order('created_at', { ascending: true })
          .limit(1)

        const asset = candidates?.[0]
        if (!asset) {
          skipped++
          continue
        }

        // pool_auto: approved required (same as approved_only for now — pool_auto can later auto-approve)
        if (settings.photo_mode === 'pool_auto' && !asset.approved) {
          skipped++
          continue
        }

        const gbp = await uploadGbpPhoto(tenantId, asset.public_url, asset.category, loc.id)
        if (gbp?.error) {
          errors++
          continue
        }

        await supabase
          .from('gbp_media_assets')
          .update({
            last_published_at: new Date().toISOString(),
            publish_count: (asset.publish_count || 0) + 1,
            location_id: asset.location_id || loc.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', asset.id)

        published++
      } catch {
        errors++
      }
    }
  }

  return { ok: true, tenants: tenantIds.length, published, skipped, errors }
})
