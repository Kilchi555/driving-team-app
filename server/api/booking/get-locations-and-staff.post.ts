// server/api/booking/get-locations-and-staff.post.ts
// Secure endpoint to fetch locations and staff for a category
// Public endpoint - used by unauthenticated booking page
// All data is validated server-side to ensure tenant isolation

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

    // 1. Load all active STANDARD locations for this tenant that are publicly bookable
    const { data: tenantLocations, error: locationsError } = await serviceSupabase
      .from('locations')
      .select('id, name, address, available_categories, staff_ids, is_active, tenant_id, category_pickup_settings, time_windows, pickup_enabled, pickup_radius_minutes, postal_code, city, location_type, public_bookable')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .eq('location_type', 'standard') // Only standard locations
      .eq('public_bookable', true) // Only locations available for public booking

    if (locationsError) {
      logger.error('❌ Error loading locations:', locationsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load locations'
      })
    }

    logger.debug('📍 Loaded locations:', tenantLocations?.length || 0)

    // 2. Load all staff for this tenant first
    const { data: allStaff, error: staffError } = await serviceSupabase
      .from('users')
      .select('id, first_name, last_name, email, role, category, is_active')
      .eq('tenant_id', tenant_id)
      .eq('role', 'staff')
      .eq('is_active', true)

    if (staffError) {
      logger.warn('⚠️ Error loading staff data:', staffError)
    }

    // 3. Build staff category map from users table (not from locations)
    const staffCategoryMap = new Map<string, string[]>()
    
    if (allStaff) {
      allStaff.forEach((staff: any) => {
        let categories = staff.category || []
        // Parse category if it's a string (JSON array), otherwise use as is
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

    // 4. Filter staff who can teach the selected category
    const capableStaffIds = Array.from(staffCategoryMap.entries())
      .filter(([_, categories]) => categories.includes(category_code))
      .map(([staffId]) => staffId)

    logger.debug('👥 Found capable staff:', capableStaffIds.length)

    // 5. Filter the full staff data to only include capable staff
    let staffData = allStaff?.filter((staff: any) => capableStaffIds.includes(staff.id)) || []
    logger.debug('👤 Loaded staff details:', staffData.length)

    // 5. Build locations map and attach staff
    const locationsMap = new Map<string, any>()
    
    tenantLocations?.forEach((location: any) => {
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

    // 6. Attach staff to their locations
    tenantLocations?.forEach((location: any) => {
      let staffIds = location.staff_ids || []
      if (typeof staffIds === 'string') {
        try {
          staffIds = JSON.parse(staffIds)
        } catch (e) {
          staffIds = []
        }
      }

      const locationEntry = locationsMap.get(location.id)
      if (locationEntry) {
        staffIds.forEach((staffId: string) => {
          const staff = staffData.find(s => s.id === staffId)
          if (staff && staffCategoryMap.get(staffId)?.includes(category_code)) {
            locationEntry.available_staff.push({
              id: staff.id,
              first_name: staff.first_name || 'Unknown',
              last_name: staff.last_name || 'Staff',
              email: staff.email,
              category: staff.category
            })
          }
        })
      }
    })

    const availableLocations = Array.from(locationsMap.values())
      .filter(loc => loc.available_staff.length > 0) // Only return locations with staff

    logger.debug('✅ Locations with staff for category:', availableLocations.length)

    return {
      success: true,
      locations: availableLocations,
      staff_count: staffData.length,
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

