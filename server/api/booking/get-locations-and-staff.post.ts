// server/api/booking/get-locations-and-staff.post.ts
// Secure endpoint to fetch locations and staff for a category
// Public endpoint - used by unauthenticated booking page
// All data is validated server-side to ensure tenant isolation
//
// STRICT MODE: Only returns locations/staff combinations that are explicitly marked as online bookable in staff_locations table

import { logger } from '~/utils/logger'

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

    // Create service role client to bypass RLS
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error'
      })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    logger.debug('📍 Fetching locations and staff:', {
      tenant_id,
      category_code
    })

    // 🔒 STRICT MODE: Load ONLY staff_locations with is_online_bookable: true
    // This is the single source of truth for online bookable staff/location combinations
    const { data: staffLocations, error: staffLocError } = await serviceSupabase
      .from('staff_locations')
      .select('staff_id, location_id, is_online_bookable')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .eq('is_online_bookable', true) // Only online bookable

    if (staffLocError) {
      logger.error('❌ Error loading staff_locations:', staffLocError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load staff locations'
      })
    }

    logger.debug('📍 Loaded staff_locations:', staffLocations?.length || 0)

    if (!staffLocations || staffLocations.length === 0) {
      // No online bookable staff/location combinations
      return {
        success: true,
        locations: [],
        staff_count: 0,
        location_count: 0
      }
    }

    // Get unique location and staff IDs
    const locationIds = [...new Set(staffLocations.map(sl => sl.location_id))]
    const staffIds = [...new Set(staffLocations.map(sl => sl.staff_id))]

    logger.debug('📊 Unique locations and staff from staff_locations', {
      locationCount: locationIds.length,
      staffCount: staffIds.length
    })

    // 2. Load location details
    const { data: locations, error: locationsError } = await serviceSupabase
      .from('locations')
      .select('id, name, address, available_categories, is_active, tenant_id, category_pickup_settings, time_windows, pickup_enabled, pickup_radius_minutes, postal_code, city, location_type')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .eq('location_type', 'standard')
      .in('id', locationIds)

    if (locationsError) {
      logger.error('❌ Error loading locations:', locationsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load locations'
      })
    }

    logger.debug('📍 Loaded locations:', locations?.length || 0)

    // 3. Load staff details and filter by category
    const { data: allStaff, error: staffError } = await serviceSupabase
      .from('users')
      .select('id, first_name, last_name, email, role, category, is_active')
      .eq('tenant_id', tenant_id)
      .eq('role', 'staff')
      .eq('is_active', true)
      .in('id', staffIds)

    if (staffError) {
      logger.warn('⚠️ Error loading staff data:', staffError)
    }

    logger.debug('👤 Loaded staff details:', allStaff?.length || 0)

    // 4. Build staff category map
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

    // 5. Build locations map with staff
    const locationsMap = new Map<string, any>()
    
    locations?.forEach((location: any) => {
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
          available_categories: location.available_categories || [],
          category_pickup_settings: categoryPickupSettings,
          time_windows: timeWindows,
          pickup_enabled: location.pickup_enabled || false,
          pickup_radius_minutes: location.pickup_radius_minutes || 0,
          postal_code: location.postal_code,
          city: location.city,
          available_staff: []
        })
      }
    })

    // 6. Attach staff to locations using staff_locations as source of truth
    staffLocations?.forEach((staffLoc: any) => {
      const locationEntry = locationsMap.get(staffLoc.location_id)
      if (locationEntry) {
        const staff = allStaff?.find(s => s.id === staffLoc.staff_id)
        // Only include if staff exists, has the required category, and is marked online bookable
        if (staff && staffCategoryMap.get(staffLoc.staff_id)?.includes(category_code) && staffLoc.is_online_bookable === true) {
          locationEntry.available_staff.push({
            id: staff.id,
            first_name: staff.first_name || 'Unknown',
            last_name: staff.last_name || 'Staff',
            email: staff.email,
            category: staff.category
          })
        }
      }
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
