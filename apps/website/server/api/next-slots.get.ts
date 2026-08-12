/**
 * GET /api/next-slots?page=fahrschule-lachen
 * Live teaser slots for Driving Team location/category pages.
 */
import { createWebsiteSupabaseClient } from '~/server/utils/supabase-service-env'
import { resolveNextSlotsFilter } from '~/server/utils/next-slots-map'

const DT_TENANT_ID = '64259d68-195a-4c68-8875-f1b44d962830'
const BOOKING_BASE = 'https://app.simy.ch/booking/availability/driving-team'
const LOOKAHEAD_DAYS = 14
const LEAD_HOURS = 12
const MAX_SLOTS = 6
const MAX_PER_CATEGORY = 3
const CACHE_MS = 120_000

export type DtTeaserSlot = {
  id: string
  start_time: string
  end_time: string
  duration_minutes: number | null
  category_code: string | null
  label: string
  day_label: string
  time_label: string
  location_id: string | null
  location_name: string | null
  book_url: string
}

type CacheEntry = {
  at: number
  slots: DtTeaserSlot[]
  usedFallback: boolean
  hint: string | null
  defaultLocationId: string | null
  defaultCategory: string | null
}

const memoryCache = new Map<string, CacheEntry>()

function formatDayLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat('de-CH', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

function formatTimeLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso.slice(11, 16)
  }
}

function categoryLabel(code: string | null) {
  if (!code) return 'Termin'
  return code.replace(/_/g, ' ')
}

function buildBookUrl(row: {
  category_code?: string | null
  location_id?: string | null
  start_time: string
}) {
  const params = new URLSearchParams()
  if (row.category_code) params.set('category', String(row.category_code))
  if (row.location_id) params.set('location', String(row.location_id))
  params.set('prefill', 'partial')
  params.set('date', String(row.start_time).slice(0, 10))
  // Prefer %20 over "+" so Vue Router category matching stays reliable
  return `${BOOKING_BASE}?${params.toString().replace(/\+/g, '%20')}`
}

function diversify(rows: any[]): DtTeaserSlot[] {
  const perCat = new Map<string, number>()
  const seen = new Set<string>()
  const out: DtTeaserSlot[] = []
  for (const row of rows) {
    const cat = String(row.category_code || 'general')
    const start = String(row.start_time)
    const loc = String(row.location_id || '')
    const key = `${start}|${cat}|${loc}`
    if (seen.has(key)) continue
    const used = perCat.get(cat) || 0
    if (used >= MAX_PER_CATEGORY) continue
    seen.add(key)
    perCat.set(cat, used + 1)
    const locJoin = Array.isArray(row.locations) ? row.locations[0] : row.locations
    out.push({
      id: String(row.id),
      start_time: start,
      end_time: String(row.end_time || start),
      duration_minutes: row.duration_minutes != null ? Number(row.duration_minutes) : null,
      category_code: row.category_code || null,
      label: categoryLabel(row.category_code || null),
      day_label: formatDayLabel(start),
      time_label: formatTimeLabel(start),
      location_id: row.location_id || null,
      location_name: locJoin?.name || null,
      book_url: buildBookUrl(row),
    })
    if (out.length >= MAX_SLOTS) break
  }
  return out
}

async function querySlots(
  supabase: ReturnType<typeof createWebsiteSupabaseClient>,
  locationIds: string[],
  categories: string[],
) {
  if (!supabase || !locationIds.length) return [] as any[]

  const now = new Date()
  const minBookable = new Date(now.getTime() + LEAD_HOURS * 3600 * 1000)
  const end = new Date(now.getTime() + LOOKAHEAD_DAYS * 86400000)

  let q = supabase
    .from('availability_slots')
    .select(
      'id, start_time, end_time, duration_minutes, category_code, location_id, locations(name)',
    )
    .eq('tenant_id', DT_TENANT_ID)
    .eq('is_available', true)
    .in('location_id', locationIds)
    .or(`reserved_until.is.null,reserved_until.lt.${now.toISOString()}`)
    .gt('start_time', minBookable.toISOString())
    .lte('start_time', end.toISOString())
    .order('start_time', { ascending: true })
    .limit(120)

  if (categories.length) {
    q = q.in('category_code', categories)
  }

  const { data, error } = await q
  if (error) {
    console.error('[next-slots]', error.message)
    return []
  }
  return data || []
}

export default defineEventHandler(async (event) => {
  const page = String(getQuery(event).page || '').trim()
  const filter = resolveNextSlotsFilter(page)
  if (!filter) {
    setHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=60')
    return {
      slots: [],
      used_fallback: false,
      hint: null,
      booking_url: BOOKING_BASE,
      default_location_id: null,
      default_category: null,
    }
  }

  const cacheKey = page
  const hit = memoryCache.get(cacheKey)
  if (hit && Date.now() - hit.at < CACHE_MS) {
    setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
    return {
      slots: hit.slots,
      used_fallback: hit.usedFallback,
      hint: hit.hint,
      booking_url: BOOKING_BASE,
      default_location_id: hit.defaultLocationId,
      default_category: hit.defaultCategory,
    }
  }

  const supabase = createWebsiteSupabaseClient(event)
  if (!supabase) {
    throw createError({ statusCode: 503, statusMessage: 'Slots temporarily unavailable' })
  }

  let rows = await querySlots(supabase, filter.locationIds, filter.categories)
  let usedFallback = false
  let hint: string | null = null

  if (!rows.length && filter.fallbackLocationIds?.length) {
    rows = await querySlots(supabase, filter.fallbackLocationIds, filter.categories)
    usedFallback = rows.length > 0
    hint = usedFallback ? filter.fallbackHint || null : null
  }

  const slots = diversify(rows)
  const defaultLocationId = filter.locationIds[0] || null
  const defaultCategory = filter.categories[0] || null
  memoryCache.set(cacheKey, {
    at: Date.now(),
    slots,
    usedFallback,
    hint,
    defaultLocationId,
    defaultCategory,
  })

  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
  return {
    slots,
    used_fallback: usedFallback,
    hint,
    booking_url: BOOKING_BASE,
    default_location_id: defaultLocationId,
    default_category: defaultCategory,
  }
})
