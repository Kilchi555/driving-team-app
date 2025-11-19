import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { validateTravelTimeBetweenAppointments, isWithinTimeWindows, extractPLZFromAddress } from '~/utils/travelTimeValidation'

// Types
interface Staff {
  id: string
  first_name: string
  last_name: string
  role: string
  is_active: boolean
  category?: string | null // Aus users.category
  preferred_location_id?: string | null // Aus users.preferred_location_id
  preferred_duration?: number | null // Aus users.preferred_duration
  assigned_staff_ids?: string[] | null // Aus users.assigned_staff_ids
}

interface Category {
  id: number
  code: string
  name: string
  description: string
  lesson_duration_minutes: number[]
  is_active: boolean
}

interface Location {
  id: string
  name: string
  address: string
  location_type: string
  is_active: boolean
  staff_id?: string
  category?: string[]
}

interface StaffWorkingHours {
  id: string
  staff_id: string
  day_of_week: number // 0=Sonntag, 1=Montag, etc.
  start_time: string // HH:MM format
  end_time: string // HH:MM format
  is_active: boolean
}

interface StaffCategory {
  staff_id: string
  category_code: string
  is_active: boolean
}

interface StaffLocation {
  staff_id: string
  location_id: string
  is_active: boolean
}

interface Appointment {
  id: string
  staff_id: string
  location_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: string
  category_code?: string
}

interface AvailableSlot {
  staff_id: string
  staff_name: string
  location_id: string
  location_name: string
  start_time: string
  end_time: string
  duration_minutes: number
  category_code: string
  date: string
  time: string
}

interface StaffLocationCategory {
  staff_id: string
  staff_name: string
  location_id: string
  location_name: string
  category_code: string
  available_slots: AvailableSlot[]
}

interface AvailabilityFilters {
  tenant_id: string
  category_code: string
  location_id?: string
  date: string // YYYY-MM-DD
  duration_minutes: number
  buffer_minutes?: number
}

interface MultiDayAvailabilityFilters {
  tenant_id: string
  category_code: string
  location_id?: string
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  duration_minutes: number
  buffer_minutes?: number
}

export const useAvailabilitySystem = () => {
  const supabase = getSupabase()
  
  // State
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const availableSlots = ref<AvailableSlot[]>([])
  const staffLocationCategories = ref<StaffLocationCategory[]>([])
  
  // Cache für bessere Performance
  const staffCache = ref<Staff[]>([])
  const categoriesCache = ref<Category[]>([])
  const locationsCache = ref<Location[]>([])
  const workingHoursCache = ref<StaffWorkingHours[]>([])
  const staffCategoriesCache = ref<StaffCategory[]>([])
  const staffLocationsCache = ref<StaffLocation[]>([])
  const appointmentsCache = ref<Appointment[]>([])

  // Computed
  const activeStaff = computed(() => 
    staffCache.value.filter(staff => staff.is_active && staff.role === 'staff')
  )

  // Methods
  const loadBaseData = async (tenantId?: string) => {
    try {
      console.log('🔄 Loading base data for availability system...')
      
      // Build queries with tenant filtering
      let staffQuery = supabase.from('users').select('id, first_name, last_name, role, is_active, category, preferred_location_id, preferred_duration, assigned_staff_ids, tenant_id').eq('role', 'staff')
      let categoriesQuery = supabase.from('categories').select('id, code, name, description, lesson_duration_minutes, is_active, tenant_id').eq('is_active', true)
      let locationsQuery = supabase.from('locations').select('id, name, address, location_type, is_active, staff_ids, category, time_windows').eq('is_active', true).eq('location_type', 'standard')
      let availabilityQuery = supabase.from('staff_availability_settings').select('staff_id, minimum_booking_lead_time_hours')
      
      if (tenantId) {
        staffQuery = staffQuery.eq('tenant_id', tenantId)
        categoriesQuery = categoriesQuery.eq('tenant_id', tenantId)
      }
      
      // Load all required data in parallel
      const [
        { data: staffData, error: staffError },
        { data: categoriesData, error: categoriesError },
        { data: locationsData, error: locationsError },
        { data: availabilityData, error: availabilityError }
      ] = await Promise.all([
        staffQuery,
        categoriesQuery,
        locationsQuery,
        availabilityQuery
      ])

      if (staffError) throw staffError
      if (categoriesError) throw categoriesError
      if (locationsError) throw locationsError
      if (availabilityError) console.warn('⚠️ Could not load availability settings:', availabilityError)

      // Enrich staff data with minimum_booking_lead_time_hours
      staffCache.value = (staffData || []).map(staff => {
        const availability = availabilityData?.find(a => a.staff_id === staff.id)
        return {
          ...staff,
          minimum_booking_lead_time_hours: availability?.minimum_booking_lead_time_hours || 24
        }
      })
      categoriesCache.value = categoriesData || []
      locationsCache.value = locationsData || []

      console.log('✅ Base data loaded:', {
        staff: staffCache.value.length,
        categories: categoriesCache.value.length,
        locations: locationsCache.value.length
      })

    } catch (err: any) {
      console.error('❌ Error loading base data:', err)
      error.value = err.message
      throw err
    }
  }

  const loadStaffCapabilities = async () => {
    try {
      console.log('🔄 Loading staff capabilities...')
      
      if (activeStaff.value.length === 0) {
        console.log('⚠️ No active staff found')
        return
      }

      // Use users.category field directly
      const staffCategories: StaffCategory[] = []
      activeStaff.value.forEach(staff => {
        if (staff.category) {
          staffCategories.push({
            staff_id: staff.id,
            category_code: staff.category,
            is_active: true
          })
        } else {
          // If no specific category, assume all categories
          categoriesCache.value.forEach(category => {
            staffCategories.push({
              staff_id: staff.id,
              category_code: category.code,
              is_active: true
            })
          })
        }
      })
      staffCategoriesCache.value = staffCategories

      // Use staff_id from locations table directly
      const staffLocations: StaffLocation[] = []
      locationsCache.value.forEach(location => {
        if (location.staff_id) {
          staffLocations.push({
            staff_id: location.staff_id,
            location_id: location.id,
            is_active: location.is_active
          })
        }
      })
      staffLocationsCache.value = staffLocations

      console.log('✅ Staff capabilities loaded:', {
        staffCategories: staffCategoriesCache.value.length,
        staffLocations: staffLocationsCache.value.length
      })

    } catch (err: any) {
      console.error('❌ Error loading staff capabilities:', err)
      throw err
    }
  }

  const loadWorkingHours = async () => {
    try {
      console.log('🔄 Loading working hours...')
      
      const staffIds = activeStaff.value.map(staff => staff.id)
      
      if (staffIds.length === 0) {
        console.log('⚠️ No active staff found')
        return
      }

      // Load from existing staff_working_hours table (prefer staff_id)
      let workingHoursData: any[] | null = null
      let workingHoursError: any = null
      
      const staffIdQuery = await supabase
        .from('staff_working_hours')
        .select('id, staff_id, day_of_week, start_time, end_time, is_active')
        .in('staff_id', staffIds)
        .eq('is_active', true)
      workingHoursData = staffIdQuery.data
      workingHoursError = staffIdQuery.error

      if (workingHoursError) {
        console.error('❌ Error loading working hours (by staff_id):', workingHoursError)
        throw workingHoursError
      }

      // No fallback needed; table uses staff_id per schema

      workingHoursCache.value = workingHoursData || []

      // If no working hours found, create default ones
      if (workingHoursCache.value.length === 0) {
        console.log('⚠️ No working hours found, creating default ones')
        const defaultWorkingHours: StaffWorkingHours[] = []
        
        activeStaff.value.forEach(staff => {
          // Monday to Friday (1-5) - Note: your table uses 1-7, not 0-6
          for (let day = 1; day <= 5; day++) {
            defaultWorkingHours.push({
              id: `${staff.id}-${day}`,
              staff_id: staff.id,
              day_of_week: day,
              start_time: '08:00',
              end_time: '18:00',
              is_active: true
            })
          }
        })
        workingHoursCache.value = defaultWorkingHours
      }

      console.log('✅ Working hours loaded:', workingHoursCache.value.length)

    } catch (err: any) {
      console.error('❌ Error loading working hours:', err)
      throw err
    }
  }

  const loadAppointments = async (date: string, tenantId?: string, skipFutureFilter = false) => {
    try {
      console.log('🔄 Loading appointments for date:', date, skipFutureFilter ? '(ALL appointments)' : '(future only)')
      
      // DB stores times in UTC with space format (YYYY-MM-DD HH:MM:SS+00), so use that format
      const startOfDayUTC = `${date} 00:00:00+00`
      const endOfDayUTC = `${date} 23:59:59+00`
      
      // Only load appointments that are at least 24 hours in the future (unless skipFutureFilter is true)
      const now = new Date()
      const minFutureTime = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const minFutureTimeUTC = minFutureTime.toISOString()
      
      console.log('⏰ Time filters (UTC):', {
        now: now.toLocaleString('de-CH'),
        minFutureTime: skipFutureFilter ? 'SKIPPED' : minFutureTimeUTC,
        date: date,
        startOfDayUTC: startOfDayUTC,
        endOfDayUTC: endOfDayUTC
      })
      
      // Load internal appointments
      let query = supabase
        .from('appointments')
        .select('id, staff_id, location_id, start_time, end_time, duration_minutes, status, type, custom_location_address')
        .in('status', ['confirmed', 'pending', 'completed', 'scheduled', 'booked'])
        .is('deleted_at', null)
      
      // Apply future filter only if not skipped (for travel-time validation we need ALL appointments)
      if (skipFutureFilter) {
        query = query.gte('start_time', startOfDayUTC).lte('start_time', endOfDayUTC)
      } else {
        query = query.gte('start_time', minFutureTimeUTC)
      }
      
      const { data: appointments, error } = await query

      if (error) throw error
      
      // Load locations for these appointments to get addresses
      const locationIds = [...new Set(appointments?.map(apt => apt.location_id).filter(Boolean))]
      let locationAddressMap: Record<string, string> = {}
      
      if (locationIds.length > 0) {
        const { data: locations, error: locError } = await supabase
          .from('locations')
          .select('id, address')
          .in('id', locationIds)
        
        if (!locError && locations) {
          locationAddressMap = locations.reduce((acc, loc) => {
            acc[loc.id] = loc.address
            return acc
          }, {} as Record<string, string>)
        }
      }
      
      // Enrich appointments with location addresses
      const enrichedAppointments = appointments?.map(apt => ({
        ...apt,
        locations: apt.location_id && locationAddressMap[apt.location_id] 
          ? { address: locationAddressMap[apt.location_id] }
          : undefined
      }))

      // Load external busy times for the same date
      console.log('🛰️ Loading external busy times window:', { startOfDayUTC, endOfDayUTC })
      
      // Use provided tenantId - no need to check current user
      const selectedTenantId = tenantId
      console.log('🏢 Selected tenant ID:', selectedTenantId)
      
      if (!selectedTenantId) {
        console.warn('⚠️ No tenant ID provided for external busy times')
        appointmentsCache.value = enrichedAppointments || []
        return
      }
      
      // Load external busy times (only future appointments, at least 24h ahead)
      const { data: externalBusyTimes, error: externalError } = await supabase
        .from('external_busy_times')
        .select('id, staff_id, start_time, end_time, event_title')
        .eq('tenant_id', selectedTenantId)
        .gte('start_time', minFutureTimeUTC) // Only future appointments (UTC)

      if (externalError) {
        console.warn('⚠️ Error loading external busy times (with date filters):', externalError)
      } else {
        console.log('🛰️ External busy times fetched (with date filters):', (externalBusyTimes?.length || 0), (externalBusyTimes || []).slice(0, 3).map(e => ({ id: e.id, staff_id: e.staff_id, start_time: e.start_time, end_time: e.end_time })))
      }
      
      // Use the future-filtered results for the final data (only appointments at least 24h in the future)
      const finalExternalBusyTimes = externalBusyTimes || []

      // Combine internal appointments and external busy times
      const allAppointments = [
        ...(enrichedAppointments || []),
        ...finalExternalBusyTimes.map(ext => ({
          id: ext.id,
          staff_id: ext.staff_id,
          location_id: null, // External events don't have location
          start_time: ext.start_time,
          end_time: ext.end_time,
          duration_minutes: Math.round((new Date(ext.end_time).getTime() - new Date(ext.start_time).getTime()) / (1000 * 60)),
          status: 'external_busy',
          type: 'external'
        }))
      ]

      // Merge with existing appointments instead of replacing
      // This is important for travel-time validation which loads multiple dates
      const existingAppointments = appointmentsCache.value.filter(apt => {
        const aptDate = apt.start_time.split(' ')[0] // Extract YYYY-MM-DD
        return aptDate !== date // Keep appointments from other dates
      })
      
      appointmentsCache.value = [...existingAppointments, ...allAppointments]
      console.log('✅ Appointments loaded:', {
        internal: enrichedAppointments?.length || 0,
        external: finalExternalBusyTimes.length,
        total: allAppointments.length,
        locationsLoaded: Object.keys(locationAddressMap).length,
        cacheTotal: appointmentsCache.value.length
      })

    } catch (err: any) {
      console.error('❌ Error loading appointments:', err)
      throw err
    }
  }

  const getAvailableSlots = async (filters: AvailabilityFilters): Promise<AvailableSlot[]> => {
    isLoading.value = true
    error.value = null
    
    try {
      console.log('🎯 Getting available slots for:', filters)
      
      // Load all required data if not cached
      if (staffCache.value.length === 0) {
        await loadBaseData(filters.tenant_id)
        await loadStaffCapabilities()
        await loadWorkingHours()
      }
      
      // Load appointments for the specific date
      await loadAppointments(filters.date, filters.tenant_id)
      
      const slots: AvailableSlot[] = []
      const bufferMinutes = filters.buffer_minutes || 15
      
      // Get the day of week (0=Sunday, 1=Monday, etc.)
      const dateObj = new Date(filters.date)
      const dayOfWeek = dateObj.getDay()
      
      // Find staff who can teach the requested category
      const capableStaff = activeStaff.value.filter(staff => {
        return staffCategoriesCache.value.some(sc => 
          sc.staff_id === staff.id && 
          sc.category_code === filters.category_code && 
          sc.is_active
        )
      })
      
      console.log('👥 Capable staff for category', filters.category_code, ':', capableStaff.length)
      
      // For each capable staff member
      for (const staff of capableStaff) {
        // Get working hours for this day
        const workingHours = workingHoursCache.value.find(wh => 
          wh.staff_id === staff.id && 
          wh.day_of_week === dayOfWeek && 
          wh.is_active
        )
        
        if (!workingHours) {
          console.log('⏰ No working hours for staff', staff.id, 'on day', dayOfWeek)
          continue
        }
        
        // Get locations where this staff can teach
        const staffLocations = staffLocationsCache.value.filter(sl => 
          sl.staff_id === staff.id && sl.is_active
        )
        
        // Filter by specific location if requested
        const relevantLocations = filters.location_id 
          ? staffLocations.filter(sl => sl.location_id === filters.location_id)
          : staffLocations
        
        for (const staffLocation of relevantLocations) {
          const location = locationsCache.value.find(l => l.id === staffLocation.location_id)
          if (!location) continue
          
          // Generate time slots within working hours
          const slotsForStaffLocation = generateTimeSlots({
            workingHours,
            staff,
            location,
            date: filters.date,
            duration: filters.duration_minutes,
            buffer: bufferMinutes,
            existingAppointments: appointmentsCache.value.filter(apt => 
              apt.staff_id === staff.id && apt.location_id === location.id
            )
          })
          
          slots.push(...slotsForStaffLocation)
        }
      }
      
      availableSlots.value = slots
      console.log('✅ Generated', slots.length, 'available slots')
      
      return slots
      
    } catch (err: any) {
      console.error('❌ Error getting available slots:', err)
      error.value = err.message
      return []
    } finally {
      isLoading.value = false
    }
  }

  const getStaffLocationCategories = async (filters: { tenant_id: string, category_code: string }): Promise<StaffLocationCategory[]> => {
    isLoading.value = true
    error.value = null
    
    try {
      console.log('🎯 Getting staff-location-category combinations for:', filters)
      
      // Load all required data for the tenant
      await loadBaseData(filters.tenant_id)
      await loadStaffCapabilities()
      await loadWorkingHours()
      
      const combinations: StaffLocationCategory[] = []
      
      // Find staff who can teach the requested category
      const capableStaff = activeStaff.value.filter(staff => {
        return staffCategoriesCache.value.some(sc => 
          sc.staff_id === staff.id && 
          sc.category_code === filters.category_code && 
          sc.is_active
        )
      })
      
      console.log('👥 Capable staff for category', filters.category_code, ':', capableStaff.length)
      
      // For each capable staff member
      for (const staff of capableStaff) {
        // Get locations where this staff can teach
        const staffLocations = staffLocationsCache.value.filter(sl => 
          sl.staff_id === staff.id && sl.is_active
        )
        
        for (const staffLocation of staffLocations) {
          const location = locationsCache.value.find(l => l.id === staffLocation.location_id)
          if (!location) continue
          
          // Check if location supports this category (must be in the array)
          // Handle both flat arrays ["C"] and nested arrays [["C"]]
          const categoryArray = Array.isArray(location.category) ? location.category.flat() : []
          
          // TEMPORARY FIX: If location has no categories defined, assume it supports all
          if (categoryArray.length === 0) {
            console.log('📍 Location', location.name, 'has no categories defined - assuming all categories supported')
          } else if (!categoryArray.includes(filters.category_code)) {
            console.log('📍 Location', location.name, 'does not support category', filters.category_code, 'Available:', categoryArray)
            continue
          }
          
          combinations.push({
            staff_id: staff.id,
            staff_name: `${staff.first_name} ${staff.last_name}`,
            location_id: location.id,
            location_name: location.name,
            category_code: filters.category_code,
            available_slots: []
          })
        }
      }
      
      staffLocationCategories.value = combinations
      console.log('✅ Found', combinations.length, 'staff-location-category combinations')
      
      return combinations
      
    } catch (err: any) {
      console.error('❌ Error getting staff-location-categories:', err)
      error.value = err.message
      return []
    } finally {
      isLoading.value = false
    }
  }

  const getAllAvailableSlots = async (filters: MultiDayAvailabilityFilters): Promise<AvailableSlot[]> => {
    isLoading.value = true
    error.value = null
    
    try {
      console.log('🎯 Getting all available slots for multiple days:', filters)
      
      // Load all required data for the tenant
      await loadBaseData(filters.tenant_id)
      await loadStaffCapabilities()
      await loadWorkingHours()
      
      const allSlots: AvailableSlot[] = []
      const bufferMinutes = filters.buffer_minutes || 15
      
      // Generate date range
      const startDate = new Date(filters.start_date)
      const endDate = new Date(filters.end_date)
      const dates: string[] = []
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0])
      }
      
      console.log('📅 Checking dates:', dates)
      
      // For each date, get available slots
      for (const date of dates) {
        // Load appointments for this date
        await loadAppointments(date, filters.tenant_id)
        
        const dateObj = new Date(date)
        const dayOfWeek = dateObj.getDay()
        
        // Find staff who can teach the requested category
        const capableStaff = activeStaff.value.filter(staff => {
          return staffCategoriesCache.value.some(sc => 
            sc.staff_id === staff.id && 
            sc.category_code === filters.category_code && 
            sc.is_active
          )
        })
        
        // For each capable staff member
        for (const staff of capableStaff) {
          // Get working hours for this day
          const workingHours = workingHoursCache.value.find(wh => 
            wh.staff_id === staff.id && 
            wh.day_of_week === dayOfWeek && 
            wh.is_active
          )
          
          if (!workingHours) {
            continue // No working hours for this day
          }
          
          // Get locations where this staff can teach
          const staffLocations = staffLocationsCache.value.filter(sl => 
            sl.staff_id === staff.id && sl.is_active
          )
          
          // Filter by specific location if requested
          const relevantLocations = filters.location_id 
            ? staffLocations.filter(sl => sl.location_id === filters.location_id)
            : staffLocations
          
          for (const staffLocation of relevantLocations) {
            const location = locationsCache.value.find(l => l.id === staffLocation.location_id)
            if (!location) continue
            
            // Generate time slots within working hours
            const slotsForStaffLocation = generateTimeSlots({
              workingHours,
              staff,
              location,
              date: date,
              duration: filters.duration_minutes,
              buffer: bufferMinutes,
              existingAppointments: appointmentsCache.value.filter(apt => 
                apt.staff_id === staff.id && apt.location_id === location.id
              )
            })
            
            allSlots.push(...slotsForStaffLocation)
          }
        }
      }
      
      availableSlots.value = allSlots
      console.log('✅ Generated', allSlots.length, 'available slots across', dates.length, 'days')
      
      return allSlots
      
    } catch (err: any) {
      console.error('❌ Error getting all available slots:', err)
      error.value = err.message
      return []
    } finally {
      isLoading.value = false
    }
  }

  const getAvailableSlotsForCombination = async (combination: StaffLocationCategory, filters: { duration_minutes: number, buffer_minutes?: number, tenant_id?: string }): Promise<AvailableSlot[]> => {
    try {
      console.log('🕐 Getting available slots for:', combination.staff_name, 'at', combination.location_name)
      
      // Get working hours for this staff
      const workingHours = workingHoursCache.value.filter(wh => 
        wh.staff_id === combination.staff_id && wh.is_active
      )
      
      if (workingHours.length === 0) {
        console.log('⏰ No working hours found for staff', combination.staff_id)
        return []
      }
      
      const slots: AvailableSlot[] = []
      const bufferMinutes = filters.buffer_minutes || 15
      
      // Generate date range (next 7 days)
      const today = new Date()
      const dates: string[] = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        dates.push(date.toISOString().split('T')[0])
      }
      
      // For each date
      for (const date of dates) {
        const dateObj = new Date(date)
        const dayOfWeek = dateObj.getDay()
        
        // Get working hours for this day
        const dayWorkingHours = workingHours.find(wh => wh.day_of_week === dayOfWeek)
        if (!dayWorkingHours) continue
        
        // Load appointments for this date
        await loadAppointments(date, filters.tenant_id)
        
        // Get existing appointments for this staff+location+category
        console.log('🔍 Filtering appointments:', {
          totalAppointments: appointmentsCache.value.length,
          staff_id: combination.staff_id,
          location_id: combination.location_id,
          category_code: combination.category_code,
          appointments: appointmentsCache.value.map(apt => ({
            id: apt.id,
            staff_id: apt.staff_id,
            location_id: apt.location_id,
            type: apt.type,
            start_time: apt.start_time
          }))
        })
        
        const existingAppointments = appointmentsCache.value.filter(apt => 
          apt.staff_id === combination.staff_id
          // Block all appointments for this staff, regardless of location and category
        )
        
        console.log('✅ Filtered existing appointments:', existingAppointments.length)
        
        // Generate time slots
        const daySlots = generateTimeSlots({
          workingHours: dayWorkingHours,
          staff: { 
            id: combination.staff_id, 
            first_name: combination.staff_name.split(' ')[0], 
            last_name: combination.staff_name.split(' ')[1] || '' 
          },
          location: { 
            id: combination.location_id, 
            name: combination.location_name, 
            address: '', 
            location_type: 'standard', 
            is_active: true 
          },
          date: date,
          duration: filters.duration_minutes,
          buffer: bufferMinutes,
          existingAppointments: existingAppointments
        })
        
        // Add date and time info
        daySlots.forEach(slot => {
          slot.date = date
          slot.time = slot.start_time.split('T')[1].substring(0, 5)
        })
        
        slots.push(...daySlots)
      }
      
      console.log('✅ Generated', slots.length, 'slots for', combination.staff_name, 'at', combination.location_name)
      return slots
      
    } catch (err: any) {
      console.error('❌ Error getting slots for combination:', err)
      return []
    }
  }

  const generateTimeSlots = (params: {
    workingHours: StaffWorkingHours
    staff: Staff
    location: Location
    date: string
    duration: number
    buffer: number
    existingAppointments: Appointment[]
    locationTimeWindows?: Array<{ start: string; end: string; days: number[] }>
    maxTravelTimeMinutes?: number
    googleApiKey?: string
    peakSettings?: any
  }): AvailableSlot[] => {
    const { workingHours, staff, location, date, duration: durationParam, buffer, existingAppointments } = params
    
    // Ensure duration is a number
    const duration = typeof durationParam === 'string' ? parseInt(durationParam) : durationParam
    
    const slots: AvailableSlot[] = []
    
    // Parse working hours
    const [startHour, startMinute] = workingHours.start_time.split(':').map(Number)
    const [endHour, endMinute] = workingHours.end_time.split(':').map(Number)
    
    const workingStartMinutes = startHour * 60 + startMinute
    const workingEndMinutes = endHour * 60 + endMinute
    
    // Create buffer zones from existing appointments
    const bufferZones: Array<{ start: number, end: number }> = []
    
    console.log('🔍 Existing appointments for conflict check:', existingAppointments.length)
    console.log('🔍 All appointments details:', existingAppointments.map(apt => ({
      id: apt.id,
      type: apt.type,
      status: apt.status,
      start_time: apt.start_time,
      end_time: apt.end_time,
      staff_id: apt.staff_id
    })))
    
    existingAppointments.forEach(apt => {
      // Convert UTC timestamps to local time for the specific date
      const aptStartUTC = new Date(apt.start_time)
      const aptEndUTC = new Date(apt.end_time)
      
      // Get the local date for comparison
      const targetDate = new Date(date + 'T00:00:00')
      const targetDateUTC = new Date(targetDate.getTime() - targetDate.getTimezoneOffset() * 60000)
      
      // Check if appointment is on the target date
      const aptStartDate = new Date(aptStartUTC.getTime() - aptStartUTC.getTimezoneOffset() * 60000)
      const aptStartDateOnly = aptStartDate.toISOString().split('T')[0]
      
      if (aptStartDateOnly !== date) {
        console.log('⏭️ Skipping appointment not on target date:', {
          appointmentDate: aptStartDateOnly,
          targetDate: date,
          appointment: apt.id
        })
        return
      }
      
      // Convert to minutes from midnight (local time)
      const aptStartMinutes = aptStartUTC.getHours() * 60 + aptStartUTC.getMinutes()
      const aptEndMinutes = aptEndUTC.getHours() * 60 + aptEndUTC.getMinutes()
      
      console.log('📅 Appointment conflict:', {
        id: apt.id,
        type: apt.type,
        status: apt.status,
        start_time: apt.start_time,
        end_time: apt.end_time,
        startMinutes: aptStartMinutes,
        endMinutes: aptEndMinutes,
        buffer: buffer
      })
      
      // Add buffer before and after
      bufferZones.push({
        start: Math.max(0, aptStartMinutes - buffer),
        end: Math.min(24 * 60, aptEndMinutes + buffer)
      })
    })
    
    console.log('🚫 Buffer zones created:', bufferZones)
    
    // Generate slots every 15 minutes, but ensure we have enough time for the full duration
    const slotInterval = 15
    console.log('🕐 Generating slots:', {
      workingStartMinutes,
      workingEndMinutes,
      duration,
      slotInterval,
      bufferZones: bufferZones.length
    })
    
    let slotsGenerated = 0
    let slotsBlocked = 0
    
    for (let minutes = workingStartMinutes; minutes + duration <= workingEndMinutes; minutes += slotInterval) {
      const slotEndMinutes = minutes + duration
      
      // Check if slot conflicts with buffer zones
      const hasConflict = bufferZones.some(zone => 
        (minutes >= zone.start && minutes < zone.end) ||
        (slotEndMinutes > zone.start && slotEndMinutes <= zone.end) ||
        (minutes <= zone.start && slotEndMinutes >= zone.end)
      )
      
      if (hasConflict) {
        slotsBlocked++
        console.log('❌ Slot conflict at', minutes, '-', slotEndMinutes, 'with buffer zones:', bufferZones)
      } else {
        // Convert back to time string
        const startHour = Math.floor(minutes / 60)
        const startMin = minutes % 60
        const endHour = Math.floor(slotEndMinutes / 60)
        const endMin = slotEndMinutes % 60
        
        const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
        const slotStartDateTime = new Date(`${date}T${startTime}:00`)
        const slotEndDateTime = new Date(`${date}T${endTime}:00`)
        
        // Check 1: Time Windows (if defined)
        if (params.locationTimeWindows && params.locationTimeWindows.length > 0) {
          if (!isWithinTimeWindows(slotStartDateTime, params.locationTimeWindows)) {
            slotsBlocked++
            console.log('❌ Slot outside time windows:', startTime)
            continue
          }
        }
        
        // Check 2: Travel Time Validation (if enabled)
        // Note: This is a synchronous function, so we can't use async validation here
        // Travel time validation will be done in a separate pass or on the frontend
        // For now, we'll add the slot and mark it with validation status
        
        slotsGenerated++
        slots.push({
          staff_id: staff.id,
          staff_name: `${staff.first_name} ${staff.last_name}`,
          location_id: location.id,
          location_name: location.name,
          start_time: `${date}T${startTime}:00`,
          end_time: `${date}T${endTime}:00`,
          duration_minutes: duration,
          category_code: 'B' // TODO: Get from filters
        })
      }
    }
    
    console.log('📊 Slot generation summary:', {
      totalSlots: slotsGenerated + slotsBlocked,
      generated: slotsGenerated,
      blocked: slotsBlocked,
      workingHours: `${workingHours.start_time} - ${workingHours.end_time}`,
      duration: duration,
      interval: slotInterval
    })
    
    return slots
  }

  /**
   * Validates slots with travel time checks
   * Filters out slots where the instructor can't travel in time
   */
  const validateSlotsWithTravelTime = async (
    slots: AvailableSlot[],
    staffId: string,
    locationPLZ: string,
    maxTravelTimeMinutes: number,
    googleApiKey: string,
    peakSettings?: any
  ): Promise<AvailableSlot[]> => {
    console.log(`🚗 Starting travel-time validation for ${slots.length} slots`)
    const validSlots: AvailableSlot[] = []
    
    // Get only INTERNAL appointments (not external busy times) for this staff member
    // External busy times don't have locations, so we can't calculate travel time
    const staffAppointments = appointmentsCache.value
      .filter(apt => 
        apt.staff_id === staffId && 
        apt.type !== 'external' && // Exclude external busy times
        apt.location_id // Must have a location
      )
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    
    console.log(`📅 Found ${staffAppointments.length} internal appointments for staff (excluding ${appointmentsCache.value.filter(apt => apt.staff_id === staffId).length - staffAppointments.length} external busy times)`)
    
    // If no appointments, all slots are valid
    if (staffAppointments.length === 0) {
      console.log('✅ No existing appointments with locations, all slots valid')
      return slots
    }
    
    // Helper function to parse local time strings correctly
    const parseLocalTime = (timeStr: string | undefined): Date => {
      if (!timeStr) {
        console.warn('⚠️ parseLocalTime received undefined/null, returning current time')
        return new Date()
      }
      
      // Handle both formats: "2025-11-11 09:00:00" (local) and "2025-11-11T09:00:00.000Z" (ISO)
      const normalized = timeStr.replace('T', ' ').split('.')[0] // Remove milliseconds and Z
      const [datePart, timePart] = normalized.split(' ')
      
      if (!datePart || !timePart) {
        console.warn('⚠️ parseLocalTime received invalid format:', timeStr)
        return new Date(timeStr) // Fallback to default Date parsing
      }
      
      const [year, month, day] = datePart.split('-').map(Number)
      const [hours, minutes, seconds] = timePart.split(':').map(Number)
      return new Date(year, month - 1, day, hours, minutes, seconds || 0)
    }
    
    // Create a set of slots that need validation (only slots adjacent to appointments)
    const slotsToValidate = new Set<string>()
    
    for (const appointment of staffAppointments) {
      const aptStart = parseLocalTime(appointment.start_time)
      const aptEnd = parseLocalTime(appointment.end_time)
      
      // Find slots that are directly before or after this appointment
      slots.forEach(slot => {
        const slotStart = parseLocalTime(slot.start_time)
        const slotEnd = parseLocalTime(slot.end_time)
        
        // Slot is directly before appointment (slot ends when/before appointment starts)
        if (slotEnd <= aptStart && slotEnd.getTime() > aptStart.getTime() - 4 * 60 * 60 * 1000) {
          slotsToValidate.add(slot.id)
        }
        
        // Slot is directly after appointment (slot starts when/after appointment ends)
        if (slotStart >= aptEnd && slotStart.getTime() < aptEnd.getTime() + 4 * 60 * 60 * 1000) {
          slotsToValidate.add(slot.id)
        }
      })
    }
    
    console.log(`🎯 Only ${slotsToValidate.size} slots need travel-time validation (adjacent to appointments)`)
    console.log('🎯 Slots to validate:', Array.from(slotsToValidate).map(id => {
      const slot = slots.find(s => s.id === id)
      return slot ? `${slot.start_time} (${slot.location_name})` : id
    }))
    
    // Step 1: Collect all unique PLZ pairs that need to be fetched
    const plzPairsNeeded = new Set<string>()
    const slotValidationData: Array<{
      slot: AvailableSlot
      previousAppointment: any
      nextAppointment: any
      prevPLZ: string | null
      nextPLZ: string | null
    }> = []
    
    for (const slot of slots) {
      if (!slotsToValidate.has(slot.id)) {
        validSlots.push(slot)
        continue
      }
      
      const slotStart = parseLocalTime(slot.start_time)
      const slotEnd = parseLocalTime(slot.end_time)
      
      const previousAppointment = staffAppointments
        .filter(apt => parseLocalTime(apt.end_time) <= slotStart)
        .pop()
      
      const nextAppointment = staffAppointments
        .find(apt => parseLocalTime(apt.start_time) >= slotEnd)
      
      let prevPLZ: string | null = null
      let nextPLZ: string | null = null
      
      // Extract PLZ from previous appointment
      if (previousAppointment) {
        const prevAddress = previousAppointment.custom_location_address || previousAppointment.locations?.address
        if (prevAddress) {
          prevPLZ = extractPLZFromAddress(prevAddress)
          if (prevPLZ && prevPLZ !== locationPLZ) {
            plzPairsNeeded.add(`${prevPLZ}|${locationPLZ}`)
          }
        }
      }
      
      // Extract PLZ from next appointment
      if (nextAppointment) {
        const nextAddress = nextAppointment.custom_location_address || nextAppointment.locations?.address
        if (nextAddress) {
          nextPLZ = extractPLZFromAddress(nextAddress)
          if (nextPLZ && nextPLZ !== locationPLZ) {
            plzPairsNeeded.add(`${locationPLZ}|${nextPLZ}`)
          }
        }
      }
      
      slotValidationData.push({
        slot,
        previousAppointment,
        nextAppointment,
        prevPLZ,
        nextPLZ
      })
    }
    
    console.log(`📍 Need to fetch ${plzPairsNeeded.size} unique PLZ pairs for validation`)
    console.log(`📍 PLZ pairs:`, Array.from(plzPairsNeeded))
    console.log(`📍 Staff appointments found:`, staffAppointments.length, staffAppointments.map(a => ({
      start: a.start_time,
      end: a.end_time,
      location_id: a.location_id,
      custom_address: a.custom_location_address,
      address: a.locations?.address
    })))
    
    // Step 2: Batch fetch all travel times at once
    const travelTimeCache = new Map<string, number>()
    
    if (plzPairsNeeded.size > 0) {
      const fetchPromises = Array.from(plzPairsNeeded).map(async (pairKey) => {
        const [fromPLZ, toPLZ] = pairKey.split('|')
        try {
          const response = await $fetch<{ travelTime: number }>('/api/pickup/check-distance', {
            method: 'POST',
            body: {
              fromPLZ,
              toPLZ,
              appointmentTime: new Date().toISOString()
            },
            timeout: 15000 // Increased timeout to 15 seconds
          })
          travelTimeCache.set(pairKey, response.travelTime)
          console.log(`✅ Fetched ${fromPLZ} -> ${toPLZ}: ${response.travelTime} min`)
        } catch (error: any) {
          console.warn(`⚠️ Could not fetch ${fromPLZ} -> ${toPLZ} (${error?.message || 'timeout'}), skipping travel-time check for this pair`)
          // Don't add to cache - slots will be considered valid if we can't verify travel time
        }
      })
      
      await Promise.all(fetchPromises)
      
      if (travelTimeCache.size === 0 && plzPairsNeeded.size > 0) {
        console.warn('⚠️ No travel times could be fetched - all slots will be considered valid')
      } else {
        console.log(`✅ Batch fetched ${travelTimeCache.size}/${plzPairsNeeded.size} travel times`)
      }
    }
    
    // Step 3: Validate all slots using cached travel times
    for (const data of slotValidationData) {
      const { slot, previousAppointment, nextAppointment, prevPLZ, nextPLZ } = data
      const slotStart = parseLocalTime(slot.start_time)
      const slotEnd = parseLocalTime(slot.end_time)
      
      let isValid = true
      let reason = ''
      
      // Check previous appointment travel time
      if (previousAppointment && prevPLZ && prevPLZ !== locationPLZ) {
        const pairKey = `${prevPLZ}|${locationPLZ}`
        const travelTime = travelTimeCache.get(pairKey)
        
        if (travelTime !== undefined) {
          const timeDiffMinutes = (slotStart.getTime() - parseLocalTime(previousAppointment.end_time).getTime()) / 1000 / 60
          const requiredTime = travelTime + 5 // 5 min buffer
          
          if (timeDiffMinutes < requiredTime) {
            isValid = false
            reason = `Nicht genug Zeit vom vorherigen Termin (${Math.round(timeDiffMinutes)} Min verfügbar, ${requiredTime} Min benötigt)`
          } else if (travelTime > maxTravelTimeMinutes) {
            isValid = false
            reason = `Zu weit vom vorherigen Termin entfernt (${travelTime} Min, max ${maxTravelTimeMinutes} Min)`
          }
        }
      }
      
      // Check next appointment travel time
      if (isValid && nextAppointment && nextPLZ && nextPLZ !== locationPLZ) {
        const pairKey = `${locationPLZ}|${nextPLZ}`
        const travelTime = travelTimeCache.get(pairKey)
        
        if (travelTime !== undefined) {
          const timeDiffMinutes = (parseLocalTime(nextAppointment.start_time).getTime() - slotEnd.getTime()) / 1000 / 60
          const requiredTime = travelTime + 5 // 5 min buffer
          
          if (timeDiffMinutes < requiredTime) {
            isValid = false
            reason = `Nicht genug Zeit zum nächsten Termin (${Math.round(timeDiffMinutes)} Min verfügbar, ${requiredTime} Min benötigt)`
          } else if (travelTime > maxTravelTimeMinutes) {
            isValid = false
            reason = `Zu weit zum nächsten Termin entfernt (${travelTime} Min, max ${maxTravelTimeMinutes} Min)`
          }
        }
      }
      
      if (isValid) {
        validSlots.push(slot)
      } else {
        console.log('❌ Slot blocked by travel time:', slot.start_time, reason)
      }
    }
    
    console.log(`✅ Travel-time validation complete: ${validSlots.length}/${slots.length} slots valid`)
    return validSlots
  }

  const clearCache = () => {
    staffCache.value = []
    categoriesCache.value = []
    locationsCache.value = []
    workingHoursCache.value = []
    staffCategoriesCache.value = []
    staffLocationsCache.value = []
    appointmentsCache.value = []
    availableSlots.value = []
  }
  
  const clearAppointmentsCache = () => {
    appointmentsCache.value = []
    console.log('🗑️ Appointments cache cleared')
  }

  return {
    // State
    isLoading,
    error,
    availableSlots,
    staffLocationCategories,
    
    // Computed
    activeStaff,
    
    // Methods
    getAvailableSlots,
    getAllAvailableSlots,
    getStaffLocationCategories,
    getAvailableSlotsForCombination,
    loadBaseData,
    loadStaffCapabilities,
    loadWorkingHours,
    loadAppointments,
    validateSlotsWithTravelTime,
    clearCache,
    clearAppointmentsCache
  }
}
