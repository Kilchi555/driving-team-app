/**
 * POST /api/booking/get-slots-for-pickup
 *
 * Returns pre-computed availability slots filtered by customer pickup PLZ feasibility.
 * For each slot, checks whether the instructor can reach the customer's PLZ in time
 * from their immediately preceding appointment (or their previous slot's location).
 *
 * Only applies when the tenant has `customer_plz_travel_check_enabled` turned on.
 * Falls open (slot is included) if travel time cannot be determined.
 *
 * Body: {
 *   tenant_id, staff_id, location_id?, category_code?, duration_minutes?,
 *   start_date (YYYY-MM-DD), end_date (YYYY-MM-DD),
 *   customer_plz (4-digit Swiss PLZ)
 * }
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'

interface PickupSlotRequest {
  tenant_id: string
  staff_id?: string
  location_id?: string
  category_code?: string
  duration_minutes?: number
  start_date: string
  end_date: string
  customer_plz: string
}

/** True during morning (07-09) or evening (17-19) rush hour Mon-Fri (UTC). */
function isPeakTime(date: Date): boolean {
  const day = date.getUTCDay()
  if (day === 0 || day === 6) return false
  const hour = date.getUTCHours()
  return (hour >= 5 && hour < 7) || (hour >= 15 && hour < 17) // 07-09 / 17-19 Zurich ≈ 05-07 / 15-17 UTC
}

/**
 * Look up cached travel time, or call Google Distance Matrix API and cache the result.
 * Returns null if travel time cannot be determined (fail-open).
 */
async function getTravelTime(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  fromPlz: string,
  toPlz: string,
  slotTime: Date
): Promise<number | null> {
  if (fromPlz === toPlz) return 0

  try {
    // 1. Check PLZ cache (bidirectional)
    const { data: cached } = await supabase
      .from('plz_distance_cache')
      .select('driving_time_minutes_peak, driving_time_minutes_offpeak')
      .or(
        `and(from_plz.eq.${fromPlz},to_plz.eq.${toPlz}),` +
        `and(from_plz.eq.${toPlz},to_plz.eq.${fromPlz})`
      )
      .maybeSingle()

    if (cached) {
      return isPeakTime(slotTime)
        ? cached.driving_time_minutes_peak
        : cached.driving_time_minutes_offpeak
    }

    // 2. Cache miss → call Google Distance Matrix API
    const config = useRuntimeConfig()
    const apiKey = (config.googleDistanceMatrixKey || config.googleMapsApiKey) as string | undefined
    if (!apiKey) {
      logger.warn('⚠️ googleDistanceMatrixKey not configured – skipping pickup travel check')
      return null
    }

    const origin = encodeURIComponent(`${fromPlz}, Switzerland`)
    const dest = encodeURIComponent(`${toPlz}, Switzerland`)
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&mode=driving&language=de&key=${apiKey}`

    const resp = await $fetch<any>(url)
    const element = resp?.rows?.[0]?.elements?.[0]
    if (resp?.status !== 'OK' || element?.status !== 'OK') {
      logger.warn(`⚠️ Google API: no route for ${fromPlz}→${toPlz}`)
      return null
    }

    const offpeak = Math.ceil(element.duration.value / 60)
    const peak = Math.ceil(offpeak * 1.3)
    const distKm = Math.round((element.distance?.value ?? 0) / 1000)

    // 3. Cache result
    await supabase
      .from('plz_distance_cache')
      .upsert(
        {
          from_plz: fromPlz,
          to_plz: toPlz,
          driving_time_minutes: offpeak,
          driving_time_minutes_offpeak: offpeak,
          driving_time_minutes_peak: peak,
          distance_km: distKm,
          last_updated: new Date().toISOString()
        },
        { onConflict: 'from_plz,to_plz' }
      )

    logger.debug(`🚗 Travel time ${fromPlz}→${toPlz}: offpeak=${offpeak}min peak=${peak}min (cached)`)
    return isPeakTime(slotTime) ? peak : offpeak

  } catch (err: any) {
    logger.warn('⚠️ getTravelTime error (fail open):', err.message)
    return null
  }
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)

  try {
    // ── Rate limiting ──────────────────────────────────────────────────────────
    const rl = await checkRateLimit(ipAddress, 'get_slots_for_pickup', 60, 60000)
    if (!rl.allowed) {
      throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please try again later.' })
    }

    // ── Input validation ───────────────────────────────────────────────────────
    const body = await readBody(event) as PickupSlotRequest
    const { tenant_id, staff_id, location_id, category_code, duration_minutes,
            start_date, end_date, customer_plz } = body

    if (!tenant_id || !start_date || !end_date || !customer_plz) {
      throw createError({ statusCode: 400, statusMessage: 'tenant_id, start_date, end_date, and customer_plz are required' })
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid date format. Use YYYY-MM-DD' })
    }

    const plzRegex = /^\d{4}$/
    if (!plzRegex.test(customer_plz.trim())) {
      throw createError({ statusCode: 400, statusMessage: 'customer_plz must be a 4-digit Swiss PLZ' })
    }

    const normalizedCustomerPlz = customer_plz.trim()
    const supabase = getSupabaseAdmin()

    // ── Load tenant lead time ──────────────────────────────────────────────────
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('minimum_booking_lead_time_hours')
      .eq('id', tenant_id)
      .single()
    const leadTimeHours = tenantData?.minimum_booking_lead_time_hours ?? 12
    const now = new Date()
    const minBookableTime = new Date(now.getTime() + leadTimeHours * 3600 * 1000).toISOString()

    // ── Fetch pre-computed availability slots ──────────────────────────────────
    let slotsQuery = supabase
      .from('availability_slots')
      .select('id, staff_id, location_id, start_time, end_time, duration_minutes, category_code, is_available, reserved_by_session, reserved_until')
      .eq('tenant_id', tenant_id)
      .eq('is_available', true)
      .or(`reserved_until.is.null,reserved_until.lt.${now.toISOString()}`)
      .gte('start_time', `${start_date}T00:00:00Z`)
      .lte('start_time', `${end_date}T23:59:59Z`)
      .gt('start_time', minBookableTime)
      .order('start_time', { ascending: true })

    if (staff_id) slotsQuery = slotsQuery.eq('staff_id', staff_id)
    if (location_id) slotsQuery = slotsQuery.eq('location_id', location_id)
    if (duration_minutes) slotsQuery = slotsQuery.eq('duration_minutes', duration_minutes)
    if (category_code) slotsQuery = slotsQuery.eq('category_code', category_code)

    const { data: slots, error: slotsError } = await slotsQuery
    if (slotsError) {
      logger.error('❌ Error fetching slots:', slotsError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch available slots' })
    }

    const rawSlots = slots || []
    if (rawSlots.length === 0) {
      return { success: true, slots: [], count: 0, travel_check_applied: true }
    }

    // ── Enrich with staff / location names ────────────────────────────────────
    const staffIds = [...new Set(rawSlots.map(s => s.staff_id))]
    const locationIds = [...new Set(rawSlots.map(s => s.location_id))]

    const [staffData, locationData, staffLocationsData, locationsWithPlz, staffSettings] = await Promise.all([
      supabase.from('users').select('id, first_name, last_name').in('id', staffIds).then(r => r.data || []),
      supabase.from('locations').select('id, name').in('id', locationIds).then(r => r.data || []),
      supabase.from('staff_locations').select('staff_id, location_id, is_online_bookable')
        .in('staff_id', staffIds).in('location_id', locationIds).then(r => r.data || []),
      supabase.from('locations').select('id, postal_code').in('id', locationIds).then(r => r.data || []),
      supabase.from('staff_availability_settings').select('staff_id, buffer_minutes').in('staff_id', staffIds).then(r => r.data || [])
    ])

    const staffMap = new Map((staffData as any[]).map(s => [s.id, `${s.first_name} ${s.last_name}`]))
    const locationNameMap = new Map((locationData as any[]).map(l => [l.id, l.name]))
    const locationPlzMap = new Map((locationsWithPlz as any[]).map(l => [l.id, l.postal_code]))
    const staffBufferMap = new Map((staffSettings as any[]).map(s => [s.staff_id, s.buffer_minutes ?? 15]))

    const staffLocationsMap = new Map<string, Map<string, boolean>>()
    for (const sl of staffLocationsData as any[]) {
      if (!staffLocationsMap.has(sl.staff_id)) staffLocationsMap.set(sl.staff_id, new Map())
      staffLocationsMap.get(sl.staff_id)!.set(sl.location_id, sl.is_online_bookable)
    }

    // ── Load upcoming confirmed appointments for these staff in the date range ─
    // We need to check if instructor has an appointment JUST BEFORE each slot.
    const rangeStart = `${start_date}T00:00:00Z`
    // Extend range back by 4 hours to catch appointments ending just before the window
    const extendedStart = new Date(new Date(rangeStart).getTime() - 4 * 3600 * 1000).toISOString()
    // Extend range forward by 4 hours to catch appointments starting just after the last slot
    const extendedEnd = new Date(new Date(`${end_date}T23:59:59Z`).getTime() + 4 * 3600 * 1000).toISOString()

    const { data: instructorAppointments } = await supabase
      .from('appointments')
      .select('id, staff_id, start_time, end_time, location_id, location:locations(postal_code)')
      .in('staff_id', staffIds)
      .not('status', 'in', '("deleted","cancelled")')
      .is('deleted_at', null)
      .gte('end_time', extendedStart)
      .lte('start_time', extendedEnd)
      .order('start_time', { ascending: true })

    // Index appointments by staff_id for fast lookup
    const appointmentsByStaff = new Map<string, any[]>()
    for (const apt of (instructorAppointments || []) as any[]) {
      if (!appointmentsByStaff.has(apt.staff_id)) appointmentsByStaff.set(apt.staff_id, [])
      appointmentsByStaff.get(apt.staff_id)!.push(apt)
    }

    // ── Filter slots by travel feasibility ────────────────────────────────────
    const filteredSlots: any[] = []

    for (const slot of rawSlots) {
      // Filter out non-bookable staff/location combos
      const locBookableMap = staffLocationsMap.get(slot.staff_id)
      if (locBookableMap && locBookableMap.get(slot.location_id) === false) continue

      const slotStart = new Date(slot.start_time)
      const staffApts = appointmentsByStaff.get(slot.staff_id) || []

      const slotEnd = new Date(slot.end_time)

      // Find the most recent appointment that ends BEFORE this slot starts
      let precedingApt: any = null
      // Find the earliest appointment that starts AFTER this slot ends
      let followingApt: any = null

      for (const apt of staffApts) {
        const aptEnd = new Date(apt.end_time)
        const aptStart = new Date(apt.start_time)

        if (aptEnd <= slotStart) {
          // Appointment ends before slot starts → preceding
          if (!precedingApt || aptEnd > new Date(precedingApt.end_time)) {
            precedingApt = apt
          }
        } else if (aptStart >= slotEnd) {
          // Appointment starts after slot ends → following
          if (!followingApt || aptStart < new Date(followingApt.start_time)) {
            followingApt = apt
          }
        }
      }

      let feasible = true
      const bufferMinutes = staffBufferMap.get(slot.staff_id) ?? 15

      // CHECK 1: Instructor travels FROM preceding appointment TO customer PLZ
      if (feasible && precedingApt) {
        const aptLocationPlz: string | null =
          (precedingApt.location as any)?.postal_code ||
          locationPlzMap.get(precedingApt.location_id) ||
          null

        if (aptLocationPlz && aptLocationPlz !== normalizedCustomerPlz) {
          const aptEnd = new Date(precedingApt.end_time)
          const gapMinutes = (slotStart.getTime() - aptEnd.getTime()) / 60000

          const travelTime = await getTravelTime(supabase, aptLocationPlz, normalizedCustomerPlz, slotStart)

          if (travelTime !== null && (travelTime + bufferMinutes) > gapMinutes) {
            logger.debug(
              `⛔ Slot ${slot.start_time} filtered (before): gap=${gapMinutes}min < travel=${travelTime}+buffer=${bufferMinutes}min ` +
              `(${aptLocationPlz}→${normalizedCustomerPlz})`
            )
            feasible = false
          }
        }
      }

      // CHECK 2: Instructor travels FROM customer PLZ TO following appointment
      if (feasible && followingApt) {
        const aptLocationPlz: string | null =
          (followingApt.location as any)?.postal_code ||
          locationPlzMap.get(followingApt.location_id) ||
          null

        if (aptLocationPlz && aptLocationPlz !== normalizedCustomerPlz) {
          const aptStart = new Date(followingApt.start_time)
          const gapMinutes = (aptStart.getTime() - slotEnd.getTime()) / 60000

          const travelTime = await getTravelTime(supabase, normalizedCustomerPlz, aptLocationPlz, slotEnd)

          if (travelTime !== null && (travelTime + bufferMinutes) > gapMinutes) {
            logger.debug(
              `⛔ Slot ${slot.start_time} filtered (after): gap=${gapMinutes}min < travel=${travelTime}+buffer=${bufferMinutes}min ` +
              `(${normalizedCustomerPlz}→${aptLocationPlz})`
            )
            feasible = false
          }
        }
      }

      if (feasible) {
        filteredSlots.push({
          id: slot.id,
          staff_id: slot.staff_id,
          staff_name: staffMap.get(slot.staff_id) || 'Unknown',
          location_id: slot.location_id,
          location_name: locationNameMap.get(slot.location_id) || 'Unknown',
          start_time: slot.start_time,
          end_time: slot.end_time,
          duration_minutes: slot.duration_minutes,
          category_code: slot.category_code,
          is_available: slot.is_available,
          reserved_by_session: slot.reserved_by_session,
          reserved_until: slot.reserved_until,
          status: 'available'
        })
      }
    }

    const duration = Date.now() - startTime
    logger.debug(`✅ Pickup slot filter: ${rawSlots.length} raw → ${filteredSlots.length} feasible (${duration}ms)`)

    return {
      success: true,
      slots: filteredSlots,
      count: filteredSlots.length,
      travel_check_applied: true,
      total_before_filter: rawSlots.length
    }

  } catch (error: any) {
    logger.error('❌ get-slots-for-pickup error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch pickup slots'
    })
  }
})
