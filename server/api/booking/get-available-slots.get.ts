/**
 * Public API: Get Available Slots
 * 
 * PURPOSE:
 * Returns pre-computed availability slots from the availability_slots table.
 * Frontend only sees minimal, public-safe data (no customer info, no sensitive schedules).
 * 
 * SECURITY:
 * - Public endpoint (no auth required for browsing)
 * - Rate limited (100/min per IP)
 * - Only returns available slots (is_available = true)
 * - No sensitive data exposed
 * - Tenant isolated
 * 
 * USAGE:
 * GET /api/booking/get-available-slots?tenant_id=<uuid>&staff_id=<uuid>&start_date=2026-01-15&end_date=2026-01-20&duration_minutes=45
 */

import { defineEventHandler, getQuery, createError, H3Event } from 'h3'
import { getSupabase } from '~/server/utils/supabase'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'
import { isSchoolVehicleAvailable } from '~/server/utils/vehicle-availability'

interface AvailableSlot {
  id: string
  staff_id: string
  location_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  category_code: string
  is_available: boolean
  is_reserved: boolean
  reserved_by_session?: string
}

interface GetAvailableSlotsQuery {
  tenant_id?: string
  staff_id?: string
  location_id?: string
  start_date?: string // YYYY-MM-DD
  end_date?: string // YYYY-MM-DD
  duration_minutes?: string
  category_code?: string
  vehicle_mode?: string // option key — passed through to vehicle_bookings check
  /** '1' or 'true' — tells the API that this option requires a school vehicle (capacity check) */
  requires_school_vehicle?: string
}

export default defineEventHandler(async (event: H3Event) => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)

  try {
    logger.debug('🔍 Get Available Slots API called')

    // ============ LAYER 1: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      ipAddress,
      'get_available_slots',
      100, // 100 requests per minute
      60000 // 60 seconds
    )

    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests. Please try again later.'
      })
    }

    // ============ LAYER 2: VALIDATE INPUT ============
    const query = getQuery(event) as GetAvailableSlotsQuery

    if (!query.tenant_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'tenant_id is required'
      })
    }

    if (!query.start_date || !query.end_date) {
      throw createError({
        statusCode: 400,
        statusMessage: 'start_date and end_date are required (YYYY-MM-DD format)'
      })
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(query.start_date) || !dateRegex.test(query.end_date)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid date format. Use YYYY-MM-DD'
      })
    }

    // ============ LAYER 3: FETCH SLOTS ============
    // Use anon key so RLS policies are enforced
    const supabase = getSupabaseAdmin()
    const now = new Date()

    // Load tenant's minimum booking lead time (default 12h if not set)
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('minimum_booking_lead_time_hours')
      .eq('id', query.tenant_id)
      .single()
    const leadTimeHours = tenantData?.minimum_booking_lead_time_hours ?? 12
    const minBookableTime = new Date(now.getTime() + leadTimeHours * 3600 * 1000).toISOString()

    let slotsQuery = supabase
      .from('availability_slots')
      .select('id, staff_id, location_id, start_time, end_time, duration_minutes, category_code, is_available, reserved_by_session, reserved_until')
      .eq('tenant_id', query.tenant_id)
      // CRITICAL: Only show slots that are actually available
      // - is_available = true (not part of definitive booking)
      // - AND (no temporary reservation OR reservation has expired)
      .eq('is_available', true)
      .or(`reserved_until.is.null,reserved_until.lt.${now.toISOString()}`)
      .gte('start_time', `${query.start_date}T00:00:00Z`)
      .lte('start_time', `${query.end_date}T23:59:59Z`)
      .gt('start_time', minBookableTime) // Only show slots after the minimum lead time window
      .order('start_time', { ascending: true })

    // Optional filters
    if (query.staff_id) {
      slotsQuery = slotsQuery.eq('staff_id', query.staff_id)
    }

    if (query.location_id) {
      slotsQuery = slotsQuery.eq('location_id', query.location_id)
    }

    if (query.duration_minutes) {
      slotsQuery = slotsQuery.eq('duration_minutes', parseInt(query.duration_minutes))
    }

    if (query.category_code) {
      slotsQuery = slotsQuery.eq('category_code', query.category_code)
    }

    const { data: slots, error: slotsError } = await slotsQuery

    if (slotsError) {
      logger.error('❌ Error fetching slots:', slotsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch available slots'
      })
    }

    logger.debug('📊 Slots query result:', {
      count: slots?.length || 0,
      filters: {
        tenant_id: query.tenant_id,
        staff_id: query.staff_id,
        location_id: query.location_id,
        category_code: query.category_code,
        duration_minutes: query.duration_minutes,
        date_range: `${query.start_date} to ${query.end_date}`
      }
    })

    // ============ LAYER 4: ENRICH WITH MINIMAL DATA ============
    // Load staff names, location names and online-bookable status in one parallel round-trip
    const staffIds = [...new Set(slots?.map(s => s.staff_id) || [])]
    const locationIds = [...new Set(slots?.map(s => s.location_id) || [])]

    const [staffData, locationData, staffLocationsData] = await Promise.all([
      staffIds.length > 0 ? supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', staffIds)
        .then(res => res.data || []) : Promise.resolve([]),
      locationIds.length > 0 ? supabase
        .from('locations')
        .select('id, name')
        .in('id', locationIds)
        .then(res => res.data || []) : Promise.resolve([]),
      staffIds.length > 0 && locationIds.length > 0 ? supabase
        .from('staff_locations')
        .select('staff_id, location_id, is_online_bookable')
        .in('staff_id', staffIds)
        .in('location_id', locationIds)
        .then(res => res.data || []) : Promise.resolve([])
    ])

    const staffMap = new Map(staffData.map((s: any) => [s.id, `${s.first_name} ${s.last_name}`]))
    const locationMap = new Map(locationData.map((l: any) => [l.id, l.name]))

    // Build nested map for quick is_online_bookable lookup: staff_id -> location_id -> boolean
    const staffLocationsMap = new Map<string, Map<string, boolean>>()
    for (const sl of staffLocationsData as any[]) {
      if (!staffLocationsMap.has(sl.staff_id)) {
        staffLocationsMap.set(sl.staff_id, new Map())
      }
      staffLocationsMap.get(sl.staff_id)!.set(sl.location_id, sl.is_online_bookable)
    }

    logger.debug('📊 Enrichment data loaded in parallel:', {
      staff: staffData.length,
      locations: locationData.length,
      staff_locations: (staffLocationsData as any[]).length
    })

    // ============ LAYER 5: FILTER BY VEHICLE AVAILABILITY ============
    // When vehicle_mode=school, filter out slots where no school vehicle is available.
    // Checks are parallelised across unique location+category combinations.
    const requiresSchoolVehicle =
      query.requires_school_vehicle === '1' || query.requires_school_vehicle === 'true'
    let vehicleUnavailableSlotIds = new Set<string>()

    if (requiresSchoolVehicle && slots && slots.length > 0 && query.category_code) {
      // Collect unique location+time combinations to minimise DB queries
      const uniqueLocationTimes = new Map<string, { locationId: string; startTime: string; endTime: string; slotIds: string[] }>()
      for (const slot of slots) {
        const key = `${slot.location_id}:${slot.start_time}:${slot.end_time}`
        if (!uniqueLocationTimes.has(key)) {
          uniqueLocationTimes.set(key, {
            locationId: slot.location_id,
            startTime: slot.start_time,
            endTime: slot.end_time,
            slotIds: [],
          })
        }
        uniqueLocationTimes.get(key)!.slotIds.push(slot.id)
      }

      const vehicleChecks = await Promise.all(
        Array.from(uniqueLocationTimes.values()).map(async ({ locationId, startTime, endTime, slotIds }) => {
          const available = await isSchoolVehicleAvailable(supabase, {
            tenantId: query.tenant_id!,
            locationId,
            categoryCode: query.category_code!,
            startTime,
            endTime,
          })
          return { available, slotIds }
        })
      )

      for (const { available, slotIds } of vehicleChecks) {
        if (!available) {
          for (const id of slotIds) vehicleUnavailableSlotIds.add(id)
        }
      }

      logger.debug('🚗 Vehicle availability check:', {
        vehicle_mode: 'school',
        total_slots: slots.length,
        unavailable_due_to_fleet: vehicleUnavailableSlotIds.size,
      })
    }

    // Enrich slots with names and apply all filters
    const enrichedSlots = (slots || [])
      .filter(slot => {
        // Filter: vehicle fleet capacity
        if (vehicleUnavailableSlotIds.has(slot.id)) {
          logger.debug(`🔍 FILTERED OUT slot (no school vehicle): ${slot.id}`)
          return false
        }
        // Filter: is_online_bookable
        const locationBookableMap = staffLocationsMap.get(slot.staff_id)
        if (locationBookableMap) {
          const isOnlineBookable = locationBookableMap.get(slot.location_id)
          if (isOnlineBookable === false) {
            logger.debug(`🔍 FILTERED OUT slot: staff=${slot.staff_id}, location=${slot.location_id}, is_online_bookable=false`)
            return false
          }
        }
        return true
      })
      .map(slot => ({
        id: slot.id,
        staff_id: slot.staff_id,
        staff_name: staffMap.get(slot.staff_id) || 'Unknown',
        location_id: slot.location_id,
        location_name: locationMap.get(slot.location_id) || 'Unknown',
        start_time: slot.start_time,
        end_time: slot.end_time,
        duration_minutes: slot.duration_minutes,
        category_code: slot.category_code,
        is_available: slot.is_available,
        reserved_by_session: slot.reserved_by_session,
        reserved_until: slot.reserved_until,
        status: 'available',
      }))

    const duration = Date.now() - startTime
    logger.debug('✅ Available slots fetched:', {
      count: enrichedSlots?.length || 0,
      filters: {
        tenant_id: query.tenant_id,
        staff_id: query.staff_id,
        location_id: query.location_id,
        start_date: query.start_date,
        end_date: query.end_date,
        duration_minutes: query.duration_minutes,
        category_code: query.category_code
      },
      duration: `${duration}ms`
    })

    return {
      success: true,
      slots: enrichedSlots || [],
      count: enrichedSlots?.length || 0
    }

  } catch (error: any) {
    logger.error('❌ Get Available Slots API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch available slots'
    })
  }
})

