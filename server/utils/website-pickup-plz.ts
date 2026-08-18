/**
 * Persist Swiss PLZs that fall inside a tenant's pickup travel-time radius.
 * Used by the public website checker — never expose private pickup/home addresses.
 */
import { swissPlzFromValue, type WebsitePickupOffer } from '~/server/utils/website-pickup'

const SETTING_KEY = 'pickup_plz'
const SETTING_CATEGORY = 'website'
const MAX_PLZ = 800

export type WebsitePickupPlzCache = {
  radius_minutes: number
  origins: string[]
  in: string[]
  out: string[]
  updated_at: string
}

type SupabaseLike = { from: (table: string) => any }

function uniquePlz(values: Array<string | null | undefined>) {
  return [...new Set(values.map((v) => swissPlzFromValue(v)).filter(Boolean) as string[])]
}

function parseCache(raw: unknown): WebsitePickupPlzCache | null {
  const value = typeof raw === 'string' ? (() => {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  })() : raw
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, any>
  const origins = uniquePlz(Array.isArray(row.origins) ? row.origins : [])
  const radius = Number(row.radius_minutes)
  if (!origins.length || !Number.isFinite(radius) || radius <= 0) return null
  return {
    radius_minutes: radius,
    origins,
    in: uniquePlz(Array.isArray(row.in) ? row.in : []),
    out: uniquePlz(Array.isArray(row.out) ? row.out : []),
    updated_at: String(row.updated_at || ''),
  }
}

function minutesFromRow(row: any) {
  const off = Number(row?.driving_time_minutes_offpeak)
  if (Number.isFinite(off) && off >= 0) return off
  const legacy = Number(row?.driving_time_minutes)
  return Number.isFinite(legacy) && legacy >= 0 ? legacy : null
}

async function loadStoredCache(supabase: SupabaseLike, tenantId: string) {
  const { data } = await supabase
    .from('tenant_settings')
    .select('id, setting_value')
    .eq('tenant_id', tenantId)
    .eq('setting_key', SETTING_KEY)
    .maybeSingle()
  return { id: data?.id as string | undefined, cache: parseCache(data?.setting_value) }
}

async function saveCache(supabase: SupabaseLike, tenantId: string, cache: WebsitePickupPlzCache) {
  const payload = {
    tenant_id: tenantId,
    category: SETTING_CATEGORY,
    setting_key: SETTING_KEY,
    setting_type: 'json',
    setting_value: JSON.stringify({
      ...cache,
      in: cache.in.slice(0, MAX_PLZ),
      out: cache.out.slice(0, MAX_PLZ),
    }),
  }
  const existing = await loadStoredCache(supabase, tenantId)
  if (existing.id) {
    await supabase.from('tenant_settings').update(payload).eq('id', existing.id)
    return
  }
  await supabase.from('tenant_settings').upsert(payload, {
    onConflict: 'tenant_id,category,setting_key',
  })
}

async function plzFromDistanceCache(
  supabase: SupabaseLike,
  origins: string[],
  radiusMinutes: number,
) {
  if (!origins.length) return []
  const { data: fromRows } = await supabase
    .from('plz_distance_cache')
    .select('from_plz, to_plz, driving_time_minutes, driving_time_minutes_offpeak')
    .in('from_plz', origins)
    .limit(2000)
  const { data: toRows } = await supabase
    .from('plz_distance_cache')
    .select('from_plz, to_plz, driving_time_minutes, driving_time_minutes_offpeak')
    .in('to_plz', origins)
    .limit(2000)

  const covered = new Set(origins)
  for (const row of [...(fromRows || []), ...(toRows || [])]) {
    const minutes = minutesFromRow(row)
    if (minutes == null || minutes > radiusMinutes) continue
    const other = origins.includes(String(row.from_plz)) ? String(row.to_plz) : String(row.from_plz)
    const plz = swissPlzFromValue(other)
    if (plz) covered.add(plz)
  }
  return [...covered]
}

export async function ensureWebsitePickupPlzCache(
  supabase: SupabaseLike,
  tenantId: string,
  offer: WebsitePickupOffer,
): Promise<WebsitePickupPlzCache | null> {
  if (!offer.enabled || !offer.radiusMinutes || !offer.originPlz.length) return null
  const stored = await loadStoredCache(supabase, tenantId)
  const sameShape =
    stored.cache &&
    stored.cache.radius_minutes === offer.radiusMinutes &&
    stored.cache.origins.join(',') === offer.originPlz.slice().sort().join(',')
  const fromDistances = await plzFromDistanceCache(supabase, offer.originPlz, offer.radiusMinutes)
  const next: WebsitePickupPlzCache = {
    radius_minutes: offer.radiusMinutes,
    origins: offer.originPlz.slice().sort(),
    in: uniquePlz([
      ...offer.originPlz,
      ...(sameShape ? stored.cache?.in || [] : []),
      ...fromDistances,
    ]),
    out: sameShape ? stored.cache?.out || [] : [],
    updated_at: new Date().toISOString(),
  }
  const changed =
    !sameShape ||
    next.in.length !== (stored.cache?.in.length || 0) ||
    next.in.some((plz) => !stored.cache?.in.includes(plz))
  if (changed) await saveCache(supabase, tenantId, next)
  return next
}

async function travelMinutesFromCache(supabase: SupabaseLike, fromPlz: string, toPlz: string) {
  if (fromPlz === toPlz) return 0
  const { data } = await supabase
    .from('plz_distance_cache')
    .select('driving_time_minutes, driving_time_minutes_offpeak')
    .or(
      `and(from_plz.eq.${fromPlz},to_plz.eq.${toPlz}),and(from_plz.eq.${toPlz},to_plz.eq.${fromPlz})`,
    )
    .limit(1)
    .maybeSingle()
  return minutesFromRow(data)
}

async function travelMinutesFromGoogle(fromPlz: string, toPlz: string) {
  const key = String(useRuntimeConfig().googleMapsApiKey || '').trim()
  if (!key) return null
  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${encodeURIComponent(`${fromPlz}, Switzerland`)}` +
    `&destinations=${encodeURIComponent(`${toPlz}, Switzerland`)}` +
    `&mode=driving&language=de&key=${key}`
  const res: any = await $fetch(url)
  const element = res?.rows?.[0]?.elements?.[0]
  if (res?.status !== 'OK' || element?.status !== 'OK' || element?.duration?.value == null) {
    return null
  }
  return Math.max(0, Math.ceil(Number(element.duration.value) / 60))
}

async function rememberPlz(
  supabase: SupabaseLike,
  tenantId: string,
  cache: WebsitePickupPlzCache,
  plz: string,
  inside: boolean,
) {
  const inSet = new Set(cache.in)
  const outSet = new Set(cache.out)
  if (inside) {
    inSet.add(plz)
    outSet.delete(plz)
  } else {
    outSet.add(plz)
    inSet.delete(plz)
  }
  const next = {
    ...cache,
    in: [...inSet].slice(0, MAX_PLZ),
    out: [...outSet].slice(0, MAX_PLZ),
    updated_at: new Date().toISOString(),
  }
  await saveCache(supabase, tenantId, next)
  return next
}

export async function checkWebsitePickupPlz(
  supabase: SupabaseLike,
  tenantId: string,
  offer: WebsitePickupOffer,
  rawPlz: string,
): Promise<{
  plz: string
  in_radius: boolean | null
  minutes: number | null
  radius_minutes: number | null
}> {
  const plz = swissPlzFromValue(rawPlz)
  if (!plz || !offer.enabled) {
    return { plz: rawPlz, in_radius: null, minutes: null, radius_minutes: offer.radiusMinutes }
  }
  const radius = offer.radiusMinutes
  if (!radius || !offer.originPlz.length) {
    return { plz, in_radius: null, minutes: null, radius_minutes: radius }
  }

  let cache = await ensureWebsitePickupPlzCache(supabase, tenantId, offer)
  if (!cache) {
    return { plz, in_radius: null, minutes: null, radius_minutes: radius }
  }
  if (cache.in.includes(plz)) {
    return { plz, in_radius: true, minutes: cache.origins.includes(plz) ? 0 : null, radius_minutes: radius }
  }
  if (cache.out.includes(plz)) {
    return { plz, in_radius: false, minutes: null, radius_minutes: radius }
  }

  let best: number | null = null
  for (const origin of offer.originPlz) {
    let minutes = await travelMinutesFromCache(supabase, origin, plz)
    if (minutes == null) {
      try {
        minutes = await travelMinutesFromGoogle(origin, plz)
      } catch {
        minutes = null
      }
      if (minutes != null && origin !== plz) {
        await supabase.from('plz_distance_cache').upsert(
          {
            from_plz: origin,
            to_plz: plz,
            driving_time_minutes: Math.max(1, minutes),
            driving_time_minutes_offpeak: minutes,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'from_plz,to_plz' },
        )
      }
    }
    if (minutes == null) continue
    if (best == null || minutes < best) best = minutes
    if (minutes <= radius) break
  }

  if (best == null) {
    return { plz, in_radius: null, minutes: null, radius_minutes: radius }
  }
  const inside = best <= radius
  await rememberPlz(supabase, tenantId, cache, plz, inside)
  return { plz, in_radius: inside, minutes: best, radius_minutes: radius }
}
