// Temporary replacement - rewrite loadStaffForCategory to use API
const loadStaffForCategoryNew = async () => {
  if (!canSearch.value) return
  
  hasSearched.value = true
  lastSearchTime.value = new Date().toLocaleTimeString('de-DE')
  
  try {
    if (!currentTenant.value) return
    
    logger.debug('🔄 Loading staff and locations via secure API...')
    
    // Use secure backend API
    const response = await fetch('/api/booking/get-locations-and-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: currentTenant.value.id,
        category_code: filters.value.category_code
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to load locations and staff')
    }

    logger.debug('✅ API Response:', {
      staff_count: data.staff_count,
      locations_with_staff: data.location_count
    })

    // Build staff objects from locations
    const staffMap = new Map<string, any>()

    data.locations.forEach((location: any) => {
      location.available_staff?.forEach((staff: any) => {
        if (!staffMap.has(staff.id)) {
          staffMap.set(staff.id, {
            id: staff.id,
            first_name: staff.first_name,
            last_name: staff.last_name,
            email: staff.email,
            category: staff.category,
            available_locations: []
          })
        }
        // Add this location to staff's available locations
        const staffObj = staffMap.get(staff.id)!
        if (!staffObj.available_locations.some((l: any) => l.id === location.id)) {
          staffObj.available_locations.push(location)
        }
      })
    })

    // Set available staff
    availableStaff.value = Array.from(staffMap.values())
    logger.debug('✅ Available staff:', availableStaff.value.length)
    
    // Build unique locations map
    const locationsMap = new Map<string, any>()
    
    availableStaff.value.forEach((staff: any) => {
      staff.available_locations?.forEach((location: any) => {
        if (!locationsMap.has(location.id)) {
          locationsMap.set(location.id, {
            id: location.id,
            name: location.name,
            address: location.address,
            category_pickup_settings: location.category_pickup_settings || {},
            time_windows: location.time_windows || [],
            available_staff: []
          })
        }
        // Add staff to location
        const locEntry = locationsMap.get(location.id)!
        if (!locEntry.available_staff.some((s: any) => s.id === staff.id)) {
          locEntry.available_staff.push(staff)
        }
      })
    })
    
    availableLocations.value = Array.from(locationsMap.values())
    logger.debug('✅ Available locations:', availableLocations.value.length)
    
    await waitForPressEffect()
    currentStep.value = 2
    
  } catch (err: any) {
    logger.error('❌ Error in loadStaffForCategory:', err)
    error.value = err.message || 'Fehler beim Laden der Daten'
  }
}

