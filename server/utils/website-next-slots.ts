/**
 * Teaser next-slots for tenant marketing sites.
 * Light query on availability_slots — not the full booking engine.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

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
const MAX_PER_CATEGORY = 3
const LOOKAHEAD_DAYS = 14

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

function diversifySlots(rows: any[], bookingUrl: string): WebsiteTeaserSlot[] {
  const perCat = new Map<string, number>()
  const seenStartCat = new Set<string>()
  const out: WebsiteTeaserSlot[] = []
  for (const row of rows) {
    const cat = String(row.category_code || 'general')
    const start = String(row.start_time)
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
    // Hint for booking UI (harmless if ignored)
    params.set('date', start.slice(0, 10))
    out.push({
      id: String(row.id),
      start_time: start,
      end_time: String(row.end_time || start),
      duration_minutes: row.duration_minutes != null ? Number(row.duration_minutes) : null,
      category_code: row.category_code || null,
      label: categoryLabel(row.category_code || null),
      day_label: formatDayLabel(start),
      time_label: formatTimeLabel(start),
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
    bypassCache?: boolean
  },
): Promise<WebsiteTeaserSlot[]> {
  const cacheKey = `${opts.tenantId}:${opts.bookingUrl}`
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

  const slots = diversifySlots(data || [], opts.bookingUrl)
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
