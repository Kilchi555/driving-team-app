/**
 * Teaser next-slots for tenant marketing sites.
 * Light query on availability_slots — not the full booking engine.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  formatSlotDayLabel,
  formatSlotTimeLabel,
  resolveSlotTimeZone,
  slotLocalHour,
} from '~/utils/slot-display-time'

export type WebsiteTeaserSlot = {
  id: string
  start_time: string
  end_time: string
  duration_minutes: number | null
  category_code: string | null
  label: string
  day_label: string
  time_label: string
  book_url: string
}

const memoryCache = new Map<string, { at: number; slots: WebsiteTeaserSlot[] }>()
const CACHE_MS = 120_000
const MAX_SLOTS = 9
const MAX_PER_CATEGORY = 6
const LOOKAHEAD_DAYS = 14

function categoryLabel(code: string | null) {
  if (!code) return 'Termin'
  return code.replace(/_/g, ' ')
}

/** Hide 05:00 / late-night generator leftovers — customers expect 07:00–20:00 school-local. */
function isCustomerFacingHour(iso: string, timeZone: string) {
  const hour = slotLocalHour(iso, timeZone)
  return hour >= 7 && hour < 20
}

export function buildWebsiteTeaserSlots(
  rows: any[],
  bookingUrl: string,
  timeZone?: string | null,
): WebsiteTeaserSlot[] {
  const zone = resolveSlotTimeZone(timeZone)
  const perCat = new Map<string, number>()
  const seenStartCat = new Set<string>()
  const out: WebsiteTeaserSlot[] = []
  for (const row of rows) {
    const start = String(row.start_time)
    if (!isCustomerFacingHour(start, zone)) continue
    const cat = String(row.category_code || 'general')
    const dedupeKey = `${start}|${cat}`
    if (seenStartCat.has(dedupeKey)) continue
    const used = perCat.get(cat) || 0
    if (used >= MAX_PER_CATEGORY) continue
    seenStartCat.add(dedupeKey)
    perCat.set(cat, used + 1)
    const sep = bookingUrl.includes('?') ? '&' : '?'
    const params = new URLSearchParams()
    if (row.category_code) params.set('category', String(row.category_code))
    params.set('prefill', 'partial')
    // Booking page matches this against the UTC date prefix of start_time.
    // For Europe/Zurich lesson hours (07:00–19:59) that prefix is the school day.
    params.set('date', start.slice(0, 10))
    out.push({
      id: String(row.id),
      start_time: start,
      end_time: String(row.end_time || start),
      duration_minutes: row.duration_minutes != null ? Number(row.duration_minutes) : null,
      category_code: row.category_code || null,
      label: categoryLabel(row.category_code || null),
      day_label: formatSlotDayLabel(start, zone),
      time_label: formatSlotTimeLabel(start, zone),
      book_url: `${bookingUrl}${sep}${params.toString().replace(/\+/g, '%20')}`,
  })
    if (out.length >= MAX_SLOTS) break
  }
  return out
}

export async function loadWebsiteTeaserSlots(
  supabase: Pick<SupabaseClient, 'from'>,
  opts: {
    tenantId: string
    bookingUrl: string
    leadTimeHours?: number | null
    timeZone?: string | null
    bypassCache?: boolean
  },
): Promise<WebsiteTeaserSlot[]> {
  const zone = resolveSlotTimeZone(opts.timeZone)
  const cacheKey = `${opts.tenantId}:${zone}:${opts.bookingUrl}`
  if (!opts.bypassCache) {
    const hit = memoryCache.get(cacheKey)
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.slots
  }

  const now = new Date()
  const lead = opts.leadTimeHours != null && Number.isFinite(Number(opts.leadTimeHours))
    ? Number(opts.leadTimeHours)
    : 12
  const minBookable = new Date(now.getTime() + lead * 3600 * 1000)
  const end = new Date(now.getTime() + LOOKAHEAD_DAYS * 86400000)

  const { data, error } = await supabase
    .from('availability_slots')
    .select('id, start_time, end_time, duration_minutes, category_code, is_available, reserved_until')
    .eq('tenant_id', opts.tenantId)
    .eq('is_available', true)
    .or(`reserved_until.is.null,reserved_until.lt.${now.toISOString()}`)
    .gt('start_time', minBookable.toISOString())
    .lte('start_time', end.toISOString())
    .order('start_time', { ascending: true })
    .limit(180)

  if (error) {
    console.error('[website-next-slots]', error.message)
    return []
  }

  const slots = buildWebsiteTeaserSlots(data || [], opts.bookingUrl, zone)
  memoryCache.set(cacheKey, { at: Date.now(), slots })
  return slots
}

export function buildSlotEventSchema(
  slots: WebsiteTeaserSlot[],
  opts: { siteUrl: string; businessName: string; max?: number },
) {
  const max = opts.max ?? 5
  return slots.slice(0, max).map((s, i) => ({
    '@type': 'Event',
    '@id': `${opts.siteUrl}#slot-${i + 1}`,
    name: `${s.label} — ${opts.businessName}`,
    startDate: s.start_time,
    endDate: s.end_time,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    organizer: { '@id': `${opts.siteUrl}#business` },
    offers: {
      '@type': 'Offer',
      url: s.book_url,
      availability: 'https://schema.org/InStock',
      priceCurrency: 'CHF',
    },
    url: s.book_url,
  }))
}

export function buildReserveActionSchema(bookingUrl: string, name: string) {
  return {
    '@type': 'ReserveAction',
    name,
    target: {
      '@type': 'EntryPoint',
      urlTemplate: bookingUrl,
      actionPlatform: [
        'http://schema.org/DesktopWebPlatform',
        'http://schema.org/MobileWebPlatform',
      ],
      inLanguage: 'de-CH',
    },
    result: {
      '@type': 'Reservation',
      name: 'Online-Buchung',
    },
  }
}
