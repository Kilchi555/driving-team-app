// server/api/booking/get-locations-and-staff.post.ts
// Secure endpoint to fetch locations and staff for a category
// Public endpoint - used by unauthenticated booking page
// All data is validated server-side to ensure tenant isolation
//
// STRICT MODE: Only returns locations/staff combinations that are explicitly marked as online bookable in staff_locations table

import { logger } from '~/utils/logger'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { tenant_id, category_code } = body

    // Validate required parameters
    if (!tenant_id || !category_code) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters: tenant_id, category_code'
      })
    }

    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const anonKey = process.env.SUPABASE_ANON_KEY

    if (!anonKey) {
      console.error('❌ SUPABASE_ANON_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const supabase = createClient(supabaseUrl, anonKey)

    logger.debug('📍 Fetching locations and staff:', { tenant_id, category_code })

    // Detect event-type booking: code is a public_bookable event type, not a category.
    // In that mode staff_locations.available_categories hold topic codes — must not filter
    // by the event type code or the booking page gets zero locations.
    const [{ data: categoryRow }, { data: eventTypeRow }] = await Promise.all([
      supabase
        .from('categories')
        .select('id')
        .eq('tenant_id', tenant_id)
        .eq('code', category_code)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('event_types')
        .select('id, code')
        .eq('tenant_id', tenant_id)
        .eq('code', category_code)
        .eq('is_active', true)
        .eq('public_bookable', true)
        .limit(1)
        .maybeSingle(),
    ])
    const isEventTypeBooking = !categoryRow && !!eventTypeRow

    // ✅ PARALLEL: Run all 3 independent queries at once instead of sequentially
    const [staffLocResult, allStandardLocResult, allStaffResult] = await Promise.all([
      // 1. staff_locations with is_online_bookable: true (incl. per-staff categories)
      supabase
        .from('staff_locations')
        .select('staff_id, location_id, is_online_bookable, available_categories')
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .eq('is_online_bookable', true),

      // 2. All standard locations for tenant (full fields – avoids a 2nd query later)
      supabase
        .from('locations')
        .select('id, name, address, available_categories, is_active, tenant_id, category_pickup_settings, category_vehicle_settings, time_windows, pickup_enabled, pickup_radius_minutes, postal_code, city, canton, location_type, staff_ids')
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
        .eq('location_type', 'standard'),

      // 3. All active staff for tenant
      supabase
        .from('users')
        .select('id, first_name, last_name, email, role, category, is_active')
        .eq('tenant_id', tenant_id)
        .eq('role', 'staff')
        .eq('is_active', true)
    ])

    if (staffLocResult.error) {
      logger.error('❌ Error loading staff_locations:', staffLocResult.error)
      throw createError({ statusCode: 500, statusMessage: 'Failed to load staff locations' })
    }
    if (allStandardLocResult.error) {
      logger.error('❌ Error loading all standard locations:', allStandardLocResult.error)
      throw createError({ statusCode: 500, statusMessage: 'Failed to load locations' })
    }
    if (allStaffResult.error) {
      logger.warn('⚠️ Error loading staff data:', allStaffResult.error)
    }

    const staffLocations = staffLocResult.data
    const allStandardLocations = allStandardLocResult.data
    const allStaff = allStaffResult.data

    logger.debug('📍 Loaded in parallel:', {
      staff_locations: staffLocations?.length || 0,
      standard_locations: allStandardLocations?.length || 0,
      staff: allStaff?.length || 0
    })

    // Build staff category map
    const staffCategoryMap = new Map<string, string[]>()
    
    if (allStaff) {
      allStaff.forEach((staff: any) => {
        let categories = staff.category || []
        if (typeof categories === 'string') {
          try {
            categories = JSON.parse(categories)
          } catch (e) {
            logger.warn('⚠️ Could not parse categories for staff:', staff.id)
            categories = []
          }
        }
        staffCategoryMap.set(staff.id, Array.isArray(categories) ? categories : [])
      })
    }

    // Map staff_id:location_id → per-staff location categories
    const staffLocCategoryMap = new Map<string, string[] | null>()
    for (const sl of staffLocations || []) {
      const key = `${sl.staff_id}:${sl.location_id}`
      const cats = Array.isArray(sl.available_categories) ? sl.available_categories : null
      staffLocCategoryMap.set(key, cats)
    }

    const locationById = new Map((allStandardLocations || []).map((loc: any) => [loc.id, loc]))

    // Effective categories for a staff×location pair
    const getEffectiveCategories = (staffId: string, locationId: string): string[] => {
      const key = `${staffId}:${locationId}`
      const perStaff = staffLocCategoryMap.get(key)
      if (Array.isArray(perStaff)) return perStaff

      const staffCats = staffCategoryMap.get(staffId) || []
      const loc = locationById.get(locationId)
      const locCats = Array.isArray(loc?.available_categories) ? loc.available_categories : []
      if (locCats.length === 0) return staffCats
      return staffCats.filter((c) => locCats.includes(c))
    }

    // Locations that have at least one online-bookable staff offering this category
    // (or any online-bookable staff for event-type bookings)
    const matchingLocationIds = new Set<string>()
    for (const sl of staffLocations || []) {
      if (isEventTypeBooking) {
        matchingLocationIds.add(sl.location_id)
        continue
      }
      const effective = getEffectiveCategories(sl.staff_id, sl.location_id)
      if (effective.includes(category_code)) {
        matchingLocationIds.add(sl.location_id)
      }
    }

    logger.debug('📍 Locations matching category via staff_locations:', {
      count: matchingLocationIds.size,
      isEventTypeBooking,
    })

    const locations = (allStandardLocations || []).filter((loc: any) => matchingLocationIds.has(loc.id))
    logger.debug('📍 Loaded locations:', locations.length)
    logger.debug('👤 Staff already loaded in parallel:', allStaff?.length || 0)

    // 5. Build locations map with staff
    const locationsMap = new Map<string, any>()
    
    locations.forEach((location: any) => {
      if (!locationsMap.has(location.id)) {
        // Parse time_windows if it's a string
        let timeWindows = location.time_windows || []
        if (typeof timeWindows === 'string') {
          try {
            timeWindows = JSON.parse(timeWindows)
          } catch (e) {
            timeWindows = []
          }
        }
        
        // Parse category_pickup_settings if it's a string
        let categoryPickupSettings = location.category_pickup_settings || {}
        if (typeof categoryPickupSettings === 'string') {
          try {
            categoryPickupSettings = JSON.parse(categoryPickupSettings)
          } catch (e) {
            categoryPickupSettings = {}
          }
        }

        locationsMap.set(location.id, {
          id: location.id,
          name: location.name,
          address: location.address,
          // Prefer location-level categories; if empty, derive from staff_locations
          // so clients that still filter on available_categories keep working.
          available_categories: (() => {
            const locCats = Array.isArray(location.available_categories) ? location.available_categories : []
            if (locCats.length > 0) return locCats
            const fromStaff = new Set<string>()
            for (const sl of staffLocations || []) {
              if (sl.location_id !== location.id) continue
              const cats = Array.isArray(sl.available_categories) ? sl.available_categories : []
              cats.forEach((c: string) => fromStaff.add(c))
            }
            return fromStaff.size > 0 ? Array.from(fromStaff) : [category_code]
          })(),
          category_pickup_settings: categoryPickupSettings,
          time_windows: timeWindows,
          pickup_enabled: location.pickup_enabled || false,
          pickup_radius_minutes: location.pickup_radius_minutes || 0,
          postal_code: location.postal_code,
          city: location.city,
          canton: location.canton,
          available_staff: [],
          staff_ids: (() => {
            const raw = location.staff_ids
            if (!raw) return []
            if (Array.isArray(raw)) return raw
            try { return JSON.parse(raw) } catch { return [] }
          })()
        })
      }
    })

    // 6. Attach staff to locations — only if online bookable AND offers this category at this location
    locationsMap.forEach((locationEntry, locationId) => {
      const locationStaffIds = locationEntry.staff_ids || []
      
      locationStaffIds.forEach((staffId: string) => {
        const staff = allStaff?.find(s => s.id === staffId)
        if (!staff) return

        const isOnlineBookable = staffLocations?.some(sl => 
          sl.staff_id === staffId && sl.location_id === locationId && sl.is_online_bookable === true
        )
        if (!isOnlineBookable) return

        const effectiveCats = getEffectiveCategories(staffId, locationId)
        if (!isEventTypeBooking && !effectiveCats.includes(category_code)) return

        locationEntry.available_staff.push({
          id: staff.id,
          first_name: staff.first_name || 'Unknown',
          last_name: staff.last_name || 'Staff',
          category: staff.category,
          available_categories: effectiveCats,
          is_online_bookable: true
        })
      })
    })

    const availableLocations = Array.from(locationsMap.values())
      .filter(loc => loc.available_staff.length > 0) // Only return locations with staff

    logger.debug('✅ Final locations with staff for category:', availableLocations.length)

    return {
      success: true,
      locations: availableLocations,
      staff_count: availableLocations.reduce((sum, loc) => sum + loc.available_staff.length, 0),
      location_count: availableLocations.length
    }

  } catch (err: any) {
    logger.error('❌ Error in get-locations-and-staff:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.statusMessage || 'Failed to fetch locations and staff'
    })
  }
})
