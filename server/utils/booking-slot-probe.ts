/**
 * Live booking-slot probe — mirrors the public booking page path:
 * 0) tenant feature allow_online_booking (Hauptschalter → Direktbuchung vs. Anfrage)
 * 1) selectable codes (same as get-booking-init: FS subcategories / non-FS event types)
 * 2) get-locations-and-staff filtering (online-bookable staff × location)
 * 3) get-available-slots filters (is_available, lead time, reserved_until, category,
 *    duration, date range, room required) — 28-day window like the booking UI
 *
 * ready = Hauptschalter an UND mindestens ein Slot sichtbar wie auf der Buchungsseite.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { resolveRoomSettings, isAnyRoomAvailable } from '~/server/utils/room-availability'

export interface BookingReadinessCheck {
  id: string
  label: string
  done: boolean
  href: string | null
  detail?: string | null
}

export interface BookingSlotProbeResult {
  ready: boolean
  /** Tenant feature allow_online_booking (default true if unset) */
  allowOnlineBooking: boolean
  slotsFound: number
  daysChecked: number
  bookingUrl: string | null
  tenantSlug: string | null
  businessType: string | null
  probe: {
    category_code: string | null
    duration_minutes: number | null
    staff_id: string | null
    staff_name: string | null
    location_id: string | null
    location_name: string | null
    start_date: string
    end_date: string
    source: 'category' | 'event_type' | null
    tried_combinations: number
    pairs_found: number
  }
  sampleSlots: Array<{
    start_time: string
    duration_minutes: number
    category_code: string
    staff_name?: string
    location_name?: string
  }>
  checks: BookingReadinessCheck[]
  blockers: string[]
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Same parse rules as get-booking-init (default true if unset). */
async function loadAllowOnlineBooking(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<boolean> {
  try {
    const { data: featureRow } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', tenantId)
      .eq('category', 'features')
      .eq('setting_key', 'allow_online_booking')
      .maybeSingle()

    if (!featureRow?.setting_value) return true
    try {
      const parsed = JSON.parse(featureRow.setting_value)
      if (typeof parsed.enabled === 'boolean') return parsed.enabled
    } catch {
      if (featureRow.setting_value === 'false') return false
      if (featureRow.setting_value === 'true') return true
    }
  } catch (e: any) {
    logger.warn('⚠️ booking-slot-probe allow_online_booking lookup failed:', e?.message)
  }
  return true
}

function parseStaffCategories(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch { /* ignore */ }
    return raw.split(',').map((c) => c.trim()).filter(Boolean)
  }
  return []
}

async function loadSelectableServices(
  supabase: SupabaseClient,
  tenantId: string,
  businessType: string | null,
): Promise<Array<{ code: string; name: string; duration: number; source: 'category' | 'event_type' }>> {
  // Mirror get-booking-init: FS → categories; everything else → public_bookable event types
  if (businessType === 'driving_school') {
    const { data: cats } = await supabase
      .from('categories')
      .select('id, code, name, lesson_duration_minutes, parent_category_id, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    const all = cats || []
    const subs = all.filter((c: any) => !!c.parent_category_id)
    const out: Array<{ code: string; name: string; duration: number; source: 'category' | 'event_type' }> = []
    for (const sub of subs) {
      const durations = Array.isArray(sub.lesson_duration_minutes)
        ? sub.lesson_duration_minutes.map(Number).filter((d: number) => d > 0)
        : []
      // Booking UI can pick any listed duration — probe each so empty durations aren't missed
      for (const duration of durations) {
        out.push({
          code: sub.code,
          name: sub.name,
          duration,
          source: 'category',
        })
      }
    }
    return out
  }

  const { data: eventTypes } = await supabase
    .from('event_types')
    .select('code, name, default_duration_minutes, public_bookable, is_active, display_order')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .eq('public_bookable', true)
    .gt('default_duration_minutes', 0)
    .order('display_order', { ascending: true })

  return (eventTypes || []).map((et: any) => ({
    code: et.code,
    name: et.name,
    duration: Number(et.default_duration_minutes),
    source: 'event_type' as const,
  }))
}

/**
 * Same matching rules as /api/booking/get-locations-and-staff
 */
async function loadBookableStaffLocations(
  supabase: SupabaseClient,
  tenantId: string,
  categoryCode: string,
  isEventTypeBooking: boolean,
): Promise<Array<{
  location_id: string
  location_name: string
  staff_id: string
  staff_name: string
}>> {
  const [staffLocResult, locResult, staffResult] = await Promise.all([
    supabase
      .from('staff_locations')
      .select('staff_id, location_id, is_online_bookable, available_categories')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('is_online_bookable', true),
    supabase
      .from('locations')
      .select('id, name, available_categories, staff_ids, is_active, location_type')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('location_type', 'standard'),
    supabase
      .from('users')
      .select('id, first_name, last_name, category, is_active, role')
      .eq('tenant_id', tenantId)
      .eq('role', 'staff')
      .eq('is_active', true),
  ])

  const staffLocations = staffLocResult.data || []
  const locations = locResult.data || []
  const allStaff = staffResult.data || []
  const locationById = new Map(locations.map((l: any) => [l.id, l]))
  const staffById = new Map(allStaff.map((s: any) => [s.id, s]))

  const staffCategoryMap = new Map<string, string[]>()
  for (const staff of allStaff) {
    staffCategoryMap.set(staff.id, parseStaffCategories(staff.category))
  }

  const staffLocCategoryMap = new Map<string, string[] | null>()
  for (const sl of staffLocations) {
    const cats = Array.isArray(sl.available_categories) ? sl.available_categories : null
    staffLocCategoryMap.set(`${sl.staff_id}:${sl.location_id}`, cats)
  }

  const getEffectiveCategories = (staffId: string, locationId: string): string[] => {
    const perStaff = staffLocCategoryMap.get(`${staffId}:${locationId}`)
    if (Array.isArray(perStaff)) return perStaff
    const staffCats = staffCategoryMap.get(staffId) || []
    const loc = locationById.get(locationId)
    const locCats = Array.isArray(loc?.available_categories) ? loc.available_categories : []
    if (locCats.length === 0) return staffCats
    return staffCats.filter((c) => locCats.includes(c))
  }

  const pairs: Array<{
    location_id: string
    location_name: string
    staff_id: string
    staff_name: string
  }> = []

  for (const sl of staffLocations) {
    const loc = locationById.get(sl.location_id)
    const staff = staffById.get(sl.staff_id)
    if (!loc || !staff) continue

    // Staff must be listed on the location (same as booking attach step)
    const rawIds = loc.staff_ids
    let staffIds: string[] = []
    if (Array.isArray(rawIds)) staffIds = rawIds.map(String)
    else if (typeof rawIds === 'string') {
      try { staffIds = JSON.parse(rawIds) } catch { staffIds = [] }
    }
    if (!staffIds.includes(sl.staff_id)) continue

    if (!isEventTypeBooking) {
      const effective = getEffectiveCategories(sl.staff_id, sl.location_id)
      if (!effective.includes(categoryCode)) continue
    }

    pairs.push({
      location_id: loc.id,
      location_name: loc.name,
      staff_id: staff.id,
      staff_name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim(),
    })
  }

  return pairs
}

/**
 * Same core filters as GET /api/booking/get-available-slots
 * (lead time, reservation expiry, category, duration + room required for fahrstunde).
 * Skips school-vehicle filter: booking only applies that when vehicle_mode requires it.
 */
async function countAvailableSlots(
  supabase: SupabaseClient,
  opts: {
    tenantId: string
    staffId: string
    locationId: string
    categoryCode: string
    durationMinutes: number
    startDate: string
    endDate: string
    leadTimeHours: number
    serviceType?: 'fahrstunde' | 'theorie' | 'beratung'
  },
): Promise<{ count: number; samples: any[] }> {
  const now = new Date()
  const minBookableTime = new Date(now.getTime() + opts.leadTimeHours * 3600 * 1000).toISOString()

  const { data: slots, error } = await supabase
    .from('availability_slots')
    .select('id, start_time, end_time, duration_minutes, category_code, staff_id, location_id')
    .eq('tenant_id', opts.tenantId)
    .eq('is_available', true)
    .or(`reserved_until.is.null,reserved_until.lt.${now.toISOString()}`)
    .eq('staff_id', opts.staffId)
    .eq('location_id', opts.locationId)
    .eq('category_code', opts.categoryCode)
    .eq('duration_minutes', opts.durationMinutes)
    .gte('start_time', `${opts.startDate}T00:00:00Z`)
    .lte('start_time', `${opts.endDate}T23:59:59Z`)
    .gt('start_time', minBookableTime)
    .order('start_time', { ascending: true })
    .limit(40)

  if (error) {
    logger.warn('⚠️ booking-slot-probe slots query failed:', error.message)
    return { count: 0, samples: [] }
  }

  let filtered = slots || []

  // Same room gate as get-available-slots when service_type is set
  const serviceType = opts.serviceType || 'fahrstunde'
  if (filtered.length > 0) {
    const [categoryRes, locationRes] = await Promise.all([
      supabase
        .from('categories')
        .select('room_settings')
        .eq('code', opts.categoryCode)
        .eq('tenant_id', opts.tenantId)
        .maybeSingle(),
      supabase
        .from('locations')
        .select('id, category_room_settings')
        .eq('id', opts.locationId)
        .maybeSingle(),
    ])

    const rule = resolveRoomSettings(
      locationRes.data?.category_room_settings,
      categoryRes.data?.room_settings ?? null,
      opts.categoryCode,
      serviceType,
    )

    if (rule.mode === 'required' && rule.allowed_room_ids.length > 0) {
      const uniqueTimes = new Map<string, { startTime: string; endTime: string; slotIds: string[] }>()
      for (const slot of filtered) {
        const key = `${slot.start_time}:${slot.end_time}`
        if (!uniqueTimes.has(key)) {
          uniqueTimes.set(key, {
            startTime: slot.start_time,
            endTime: slot.end_time,
            slotIds: [],
          })
        }
        uniqueTimes.get(key)!.slotIds.push(slot.id)
      }

      const unavailable = new Set<string>()
      await Promise.all(
        Array.from(uniqueTimes.values()).map(async ({ startTime, endTime, slotIds }) => {
          const available = await isAnyRoomAvailable(supabase, {
            allowedRoomIds: rule.allowed_room_ids,
            startTime,
            endTime,
          })
          if (!available) {
            for (const id of slotIds) unavailable.add(id)
          }
        }),
      )
      filtered = filtered.filter((s) => !unavailable.has(s.id))
    }
  }

  return { count: filtered.length, samples: filtered.slice(0, 20) }
}

export async function probeBookingSlots(
  supabase: SupabaseClient,
  tenantId: string,
  opts?: { days?: number },
): Promise<BookingSlotProbeResult> {
  // Booking UI loads the next 4 weeks (28 days) — keep the same window
  const days = opts?.days ?? 28
  const start = new Date()
  const end = new Date()
  end.setUTCDate(end.getUTCDate() + days)
  const startDate = ymd(start)
  const endDate = ymd(end)

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, business_type, minimum_booking_lead_time_hours')
    .eq('id', tenantId)
    .single()

  const leadTimeHours = tenant?.minimum_booking_lead_time_hours ?? 12
  const bookingUrl = tenant?.slug
    ? `https://app.simy.ch/booking/availability/${tenant.slug}`
    : null

  const [
    { count: staffCount },
    { count: bookableLocCount },
    { data: staffRows },
    { count: queuePending },
    allowOnlineBooking,
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('role', 'staff')
      .eq('is_active', true),
    supabase
      .from('staff_locations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .eq('is_online_bookable', true),
    supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role', 'staff')
      .eq('is_active', true),
    supabase
      .from('availability_recalc_queue')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('processed', false),
    loadAllowOnlineBooking(supabase, tenantId),
  ])

  const staffIds = (staffRows || []).map((u: any) => u.id)
  let hoursCount = 0
  if (staffIds.length > 0) {
    const { count } = await supabase
      .from('staff_working_hours')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .in('staff_id', staffIds)
    hoursCount = count ?? 0
  }

  const services = await loadSelectableServices(supabase, tenantId, tenant?.business_type || null)
  const hasServices = services.length > 0

  const checks: BookingReadinessCheck[] = [
    {
      id: 'master',
      label: 'Direktbuchung eingeschaltet',
      done: allowOnlineBooking,
      href: '/admin/profile?tab=features',
      detail: allowOnlineBooking
        ? 'Kunden sehen den Slot-Kalender'
        : 'Aus → Kunden sehen nur das Anfrageformular (Profil → Funktionen)',
    },
    {
      id: 'staff',
      label: 'Aktiver Mitarbeiter',
      done: (staffCount ?? 0) > 0,
      href: '/admin/users',
      detail: (staffCount ?? 0) > 0 ? `${staffCount} aktiv` : 'Noch niemand eingeladen',
    },
    {
      id: 'hours',
      label: 'Arbeitszeiten hinterlegt',
      done: (hoursCount ?? 0) > 0,
      href: '/admin/users',
      detail: (hoursCount ?? 0) > 0 ? `${hoursCount} Einträge` : 'Im Mitarbeiter-Login setzen',
    },
    {
      id: 'bookable',
      label: 'Treffpunkt online buchbar',
      done: (bookableLocCount ?? 0) > 0,
      href: '/admin/users',
      detail: (bookableLocCount ?? 0) > 0 ? `${bookableLocCount} Zuweisung(en)` : 'Bei Staff-Treffpunkten aktivieren',
    },
    {
      id: 'services',
      label: tenant?.business_type === 'driving_school'
        ? 'Kategorien mit Dauer'
        : 'Online-buchbare Terminarten',
      done: hasServices,
      href: tenant?.business_type === 'driving_school' ? '/admin/categories' : '/admin/profile?tab=eventtypes',
      detail: hasServices
        ? `${new Set(services.map((s) => s.code)).size} wählbar`
        : 'Keine buchbaren Leistungen mit Dauer',
    },
  ]

  const blockers = checks.filter((c) => !c.done).map((c) => c.label)
  if ((queuePending ?? 0) > 0) {
    blockers.push(`${queuePending} Slot-Berechnung(en) noch in der Queue`)
  }

  const probe: BookingSlotProbeResult['probe'] = {
    category_code: null,
    duration_minutes: null,
    staff_id: null,
    staff_name: null,
    location_id: null,
    location_name: null,
    start_date: startDate,
    end_date: endDate,
    source: null,
    tried_combinations: 0,
    pairs_found: 0,
  }

  let slotsFound = 0
  let sampleSlots: BookingSlotProbeResult['sampleSlots'] = []
  let anyPairs = false

  // Live probe — only if prerequisites look reachable
  if ((staffCount ?? 0) > 0 && (bookableLocCount ?? 0) > 0 && hasServices) {
    // Deduplicate category lookups when multiple durations share a code
    const pairsCache = new Map<string, Awaited<ReturnType<typeof loadBookableStaffLocations>>>()

    for (const service of services.slice(0, 16)) {
      const isEventTypeBooking = service.source === 'event_type'
      let pairs = pairsCache.get(service.code)
      if (!pairs) {
        pairs = await loadBookableStaffLocations(
          supabase,
          tenantId,
          service.code,
          isEventTypeBooking,
        )
        pairsCache.set(service.code, pairs)
      }
      if (pairs.length > 0) anyPairs = true
      probe.pairs_found = Math.max(probe.pairs_found, pairs.length)

      for (const pair of pairs.slice(0, 6)) {
        probe.tried_combinations += 1
        const { count, samples } = await countAvailableSlots(supabase, {
          tenantId,
          staffId: pair.staff_id,
          locationId: pair.location_id,
          categoryCode: service.code,
          durationMinutes: service.duration,
          startDate,
          endDate,
          leadTimeHours,
          serviceType: 'fahrstunde',
        })

        if (count > 0) {
          slotsFound = count
          probe.category_code = service.code
          probe.duration_minutes = service.duration
          probe.staff_id = pair.staff_id
          probe.staff_name = pair.staff_name
          probe.location_id = pair.location_id
          probe.location_name = pair.location_name
          probe.source = service.source
          sampleSlots = samples.slice(0, 5).map((s: any) => ({
            start_time: s.start_time,
            duration_minutes: s.duration_minutes,
            category_code: s.category_code,
            staff_name: pair.staff_name,
            location_name: pair.location_name,
          }))
          break
        }
      }
      if (slotsFound > 0) break
    }

    if (slotsFound === 0) {
      const slotBlocker = !anyPairs
        ? 'Buchungsseite fände keine Staff×Treffpunkt-Kombination (Online-buchbar + Kategorie/Terminart)'
        : 'Buchungsseite fände aktuell keine freien Termine (Lead-Time, Räume, Konflikte oder Recalc ausstehend)'
      if (!blockers.includes(slotBlocker)) blockers.push(slotBlocker)
    }
  }

  // If we never found a working combo, still record what we would have tried first
  if (!probe.category_code && services[0]) {
    probe.category_code = services[0].code
    probe.duration_minutes = services[0].duration
    probe.source = services[0].source
  }

  checks.push({
    id: 'slots',
    label: 'Freie Termine wie auf der Buchungsseite',
    done: slotsFound > 0,
    href: bookingUrl,
    detail: slotsFound > 0
      ? `${slotsFound}+ Slot(s) in den nächsten ${days} Tagen (gleicher Pfad wie Booking)`
      : `0 Slots über denselben Pfad wie die Buchungsseite (${days} Tage)`,
  })

  // Customers only see slots when the master switch is on
  const ready = allowOnlineBooking && slotsFound > 0

  return {
    ready,
    allowOnlineBooking,
    slotsFound,
    daysChecked: days,
    bookingUrl,
    tenantSlug: tenant?.slug || null,
    businessType: tenant?.business_type || null,
    probe,
    sampleSlots,
    checks,
    blockers,
  }
}
