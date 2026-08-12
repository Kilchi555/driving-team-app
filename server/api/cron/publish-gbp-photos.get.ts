import { defineEventHandler, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { uploadGbpPhoto, getGbpAutomationSettings, listTenantGbpLocations } from '~/server/utils/gbp'
import { assertCronAuth } from '~/server/utils/gbp-automation'

/**
 * Monday 00:00 in `timezone`, returned as UTC ISO.
 */
function startOfWeekIso(timezone: string, now = new Date()): string {
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(now)

  const get = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find(p => p.type === type)?.value || ''

  const year = Number(get(dateParts, 'year'))
  const month = Number(get(dateParts, 'month'))
  const day = Number(get(dateParts, 'day'))
  const weekdayIndex: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  }
  const offsetDays = weekdayIndex[weekday] ?? 0

  // Calendar Monday (handles month/year boundaries)
  const monday = new Date(Date.UTC(year, month - 1, day - offsetDays))
  const my = monday.getUTCFullYear()
  const mm = monday.getUTCMonth() + 1
  const md = monday.getUTCDate()

  // Probe UTC instants until local TZ date is Monday and local time is 00:00
  const noonUtc = Date.UTC(my, mm - 1, md, 12, 0, 0)
  for (let deltaMin = -14 * 60; deltaMin <= 14 * 60; deltaMin += 15) {
    const candidate = new Date(noonUtc + deltaMin * 60 * 1000)
    const local = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(candidate)
    const ly = Number(get(local, 'year'))
    const lm = Number(get(local, 'month'))
    const ld = Number(get(local, 'day'))
    const lh = Number(get(local, 'hour'))
    const lmin = Number(get(local, 'minute'))
    if (ly === my && lm === mm && ld === md && lh === 0 && lmin === 0) {
      return candidate.toISOString()
    }
  }

  return new Date(Date.UTC(my, mm - 1, md, 0, 0, 0)).toISOString()
}

type MediaAsset = {
  id: string
  tenant_id: string
  location_id: string | null
  storage_path: string
  public_url: string
  category: string
  approved: boolean
  source?: string
  notes: string | null
  last_published_at: string | null
  publish_count: number | null
}

/**
 * GET /api/cron/publish-gbp-photos
 * Publishes approved pool photos according to photo_mode + photos_per_week.
 * - Up to photos_per_week per active location per calendar week (tenant timezone)
 * - Min spacing ≈ 7d / photos_per_week between publishes
 * - Prefers location-specific assets; each asset at most once per week
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

        const perWeek = Math.min(7, Math.max(1, Number(settings.photos_per_week) || 2))
        const weekStart = startOfWeekIso(settings.timezone || 'Europe/Zurich')
        const minGapMs = Math.floor((7 * 24 * 60 * 60 * 1000) / perWeek)
        const gapAgo = new Date(Date.now() - minGapMs).toISOString()

        // Distinct location rows published this week (= publish events, since we publish each ≤1×/week)
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

        // Min spacing since last publish for this location
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

        // 1) Location-specific, not yet published this week
        const { data: locCandidates } = await supabase
          .from('gbp_media_assets')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('location_id', loc.id)
          .eq('approved', true)
          .or(`last_published_at.is.null,last_published_at.lt.${weekStart}`)
          .order('last_published_at', { ascending: true, nullsFirst: true })
          .order('created_at', { ascending: true })
          .limit(1)

        let asset = (locCandidates?.[0] as MediaAsset | undefined) ?? null

        // 2) Fallback: tenant-wide (null), skip if this location already has a row for same URL
        if (!asset) {
          const { data: sharedCandidates } = await supabase
            .from('gbp_media_assets')
            .select('*')
            .eq('tenant_id', tenantId)
            .is('location_id', null)
            .eq('approved', true)
            .or(`last_published_at.is.null,last_published_at.lt.${weekStart}`)
            .order('last_published_at', { ascending: true, nullsFirst: true })
            .order('created_at', { ascending: true })
            .limit(20)

          if (sharedCandidates?.length) {
            const urls = sharedCandidates.map((a: MediaAsset) => a.public_url)
            const { data: alreadyLocal } = await supabase
              .from('gbp_media_assets')
              .select('public_url')
              .eq('tenant_id', tenantId)
              .eq('location_id', loc.id)
              .in('public_url', urls)

            const taken = new Set((alreadyLocal ?? []).map((r: { public_url: string }) => r.public_url))
            asset = (sharedCandidates as MediaAsset[]).find(a => !taken.has(a.public_url)) ?? null
          }
        }

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
              updated_at: nowIso,
            })
            .eq('id', asset.id)
        } else {
          // Clone to location for tracking; leave shared original available for other locations
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
          })
        }

        published++
      } catch {
        errors++
      }
    }
  }

  return { ok: true, tenants: tenantIds.length, published, skipped, errors }
})
