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

    // Create anon client to respect RLS policies
    const { createClient } = await import('@supabase/supabase-js')
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

    logger.debug('📍 Fetching locations and staff:', {
      tenant_id,
      category_code
    })

    // 🔒 STRICT MODE: Load ONLY staff_locations with is_online_bookable: true
    // This is the single source of truth for online bookable staff/location combinations
    const { data: staffLocations, error: staffLocError } = await supabase
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

    // ✅ NEW: Also load ALL standard locations for the category (not just those with staff_locations entries)
    const { data: allStandardLocations, error: allLocError } = await supabase
      .from('locations')
      .select('id, name, staff_ids, available_categories')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .eq('location_type', 'standard')

    if (allLocError) {
      logger.error('❌ Error loading all standard locations:', allLocError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load locations'
      })
    }

    logger.debug('📍 Loaded all standard locations:', allStandardLocations?.length || 0)

    // Filter locations to category
    const categoryLocations = (allStandardLocations || []).filter((loc: any) => {
      const availableCategories = loc.available_categories || []
      return availableCategories.includes(category_code)
    })

    logger.debug('📍 Filtered to category locations:', categoryLocations.length)

    // Get unique location IDs (from both staff_locations AND standard locations)
    const staffLocLocationIds = [...new Set(staffLocations?.map(sl => sl.location_id) || [])]
    const allCategoryLocationIds = categoryLocations.map(loc => loc.id)
    const allLocationIds = [...new Set([...staffLocLocationIds, ...allCategoryLocationIds])]

    // Get all staff IDs from staff_locations
    const staffIds = [...new Set(staffLocations?.map(sl => sl.staff_id) || [])]

    logger.debug('📊 Unique locations and staff from staff_locations', {
      locationCount: allLocationIds.length,
      staffCount: staffIds.length
    })

    // 2. Load location details
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('id, name, address, available_categories, is_active, tenant_id, category_pickup_settings, time_windows, pickup_enabled, pickup_radius_minutes, postal_code, city, location_type, staff_ids')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .eq('location_type', 'standard')
      .in('id', allLocationIds)

    if (locationsError) {
      logger.error('❌ Error loading locations:', locationsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load locations'
      })
    }

    logger.debug('📍 Loaded locations:', locations?.length || 0)

    // 3. Load ALL staff for the tenant
    const { data: allStaff, error: staffError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, category, is_active')
      .eq('tenant_id', tenant_id)
      .eq('role', 'staff')
      .eq('is_active', true)

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
          available_staff: [],
          staff_ids: location.staff_ids || [] // Store staff_ids from location
        })
      }
    })

    // 6. Attach staff to locations
    // ✅ NEW: Use location.staff_ids as source of truth (not just staff_locations)
    locationsMap.forEach((locationEntry, locationId) => {
      const locationStaffIds = locationEntry.staff_ids || []
      
      // Find all staff that work at this location and have the category
      locationStaffIds.forEach((staffId: string) => {
        const staff = allStaff?.find(s => s.id === staffId)
        
        if (staff) {
          const staffCategories = Array.isArray(staff.category) ? staff.category : 
            (typeof staff.category === 'string' ? JSON.parse(staff.category || '[]') : [])
          
          // Include if staff has this category
          if (staffCategories.includes(category_code)) {
            // Check if this staff/location combo is marked as online bookable
            const isOnlineBookable = staffLocations?.some(sl => 
              sl.staff_id === staffId && sl.location_id === locationId && sl.is_online_bookable === true
            )
            
            // Include the staff (regardless of online bookable status for standard locations)
            locationEntry.available_staff.push({
              id: staff.id,
              first_name: staff.first_name || 'Unknown',
              last_name: staff.last_name || 'Staff',
              email: staff.email,
              category: staff.category,
              is_online_bookable: isOnlineBookable || false // Store the online bookable status
            })
          }
        }
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
