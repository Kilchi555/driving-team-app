/**
 * Availability Calculator Service
 * 
 * PURPOSE:
 * Centralized service for calculating staff availability slots.
 * Replaces all frontend direct DB queries with secure backend computation.
 * 
 * SECURITY:
 * - Only backend can access sensitive data (appointments, working hours, busy times)
 * - Outputs minimal, public-safe data to availability_slots table
 * - No customer names, payment status, or personal schedules exposed
 * 
 * USAGE:
 * - Called by cron job (nightly at 2 AM)
 * - Can be triggered manually after schedule changes
 * - Recalculates slots when appointments are created/cancelled
 */

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { wallTimeToUtc, parseWorkingTimeParts, DEFAULT_TIMEZONE } from '~/server/utils/zurich-wall-time'
import { isWithinTimeWindows } from '~/utils/travelTimeValidation'

// Types
interface Staff {
  id: string
  first_name: string
  last_name: string
  role: string
  is_active: boolean
  category?: string | null
  tenant_id: string
  minimum_booking_lead_time_hours?: number
  buffer_minutes?: number
  max_travel_minutes?: number | null
  home_plz?: string | null
}

interface Category {
  id: number
  code: string
  name: string
  lesson_duration_minutes: number[]
  is_active: boolean
  tenant_id: string
}

interface TimeWindow {
  start: string  // HH:MM
  end: string    // HH:MM
  days: number[] // 0=Sunday … 6=Saturday (JS convention)
}

interface Location {
  id: string
  name: string
  address: string
  location_type: string
  is_active: boolean
  staff_ids?: string[]
  available_categories?: string[] // Categories this location supports
  category?: string[] // Deprecated, use available_categories
  tenant_id: string
  postal_code?: string // For travel time calculations
  time_windows?: TimeWindow[] // Optional booking availability windows
}

interface StaffWorkingHours {
  id: string
  staff_id: string
  day_of_week: number // 1=Monday, 7=Sunday
  start_time: string // HH:MM wall-clock in `timezone`
  end_time: string   // HH:MM wall-clock in `timezone`
  timezone: string   // IANA timezone, e.g. 'Europe/Zurich'
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
  type: string
  location?: {
    postal_code?: string
  }
}

interface ExternalBusyTime {
  id: string
  staff_id: string
  start_time: string
  end_time: string
  tenant_id: string
  postal_code?: string | null
}

interface AvailabilitySlot {
  tenant_id: string
  staff_id: string
  location_id: string
  start_time: string
  end_time: string
  duration_minutes: number
  is_available: boolean
  category_code: string
}

interface CalculateOptions {
  tenantId?: string
  staffId?: string
  startDate: Date
  endDate: Date
  bufferMinutes?: number
}

/**
 * Main calculator class
 */
export class AvailabilityCalculator {
  private supabase = getSupabaseAdmin()

  /**
   * In-memory travel time cache for the duration of one calculateAvailability() run.
   * Key: "fromPlz→toPlz". Value: minutes (offpeak), or -1 = confirmed no route.
   * Prevents repeated DB + Google API calls for the same PLZ pair within one run.
   */
  private travelTimeCache = new Map<string, number>()

  /**
   * Calculate availability for a date range
   */
  async calculateAvailability(options: CalculateOptions): Promise<number> {
    const startTime = Date.now()
    
    // Defensive: Validate options
    if (!options) {
      throw new Error('Missing options parameter')
    }
    if (!options.startDate) {
      throw new Error('Missing startDate in options')
    }
    if (!options.endDate) {
      throw new Error('Missing endDate in options')
    }
    
    // Clear in-memory travel time cache for this run
    this.travelTimeCache.clear()

    logger.debug('🔄 Starting availability calculation...', {
      tenantId: options.tenantId,
      staffId: options.staffId,
      startDate: options.startDate.toISOString().split('T')[0],
      endDate: options.endDate.toISOString().split('T')[0]
    })

    try {
      // 1. Load all required data
      const staff = await this.loadStaff(options.tenantId, options.staffId)
      const categories = await this.loadCategories(options.tenantId)
      const locations = await this.loadLocations(options.tenantId, staff.map(s => s.id))
      
      // NEW: Get staff IDs that have bookable locations
      let staffWithBookableLocations = staff.map(s => s.id)
      if (locations.length > 0) {
        // Get all staff that have at least one bookable location
        const { data: staffLocations, error: staffLocError } = await this.supabase
          .from('staff_locations')
          .select('staff_id')
          .eq('is_online_bookable', true)
          .eq('is_active', true)
          .in('staff_id', staff.map(s => s.id))
        
        if (!staffLocError && staffLocations && staffLocations.length > 0) {
          staffWithBookableLocations = [...new Set(staffLocations.map(sl => sl.staff_id))]
          logger.debug(`✅ Staff with bookable locations: ${staffWithBookableLocations.length}`)
        }
      }
      
      const workingHours = await this.loadWorkingHours(staffWithBookableLocations)
      const appointments = await this.loadAppointments(staffWithBookableLocations, options.startDate, options.endDate)
      const busyTimes = await this.loadExternalBusyTimes(staffWithBookableLocations, options.startDate, options.endDate, options.tenantId)

      logger.debug('✅ Data loaded:', {
        staff: staff.length,
        staffWithBookableLocations: staffWithBookableLocations.length,
        categories: categories.length,
        locations: locations.length,
        workingHours: workingHours.length,
        appointments: appointments.length,
        busyTimes: busyTimes.length
      })

      // 2. Generate all possible slots
      // DEACTIVATED: Preload all travel times in batch before generating slots
      // logger.debug(`🚗 Preloading travel times... (DEACTIVATED)`)
      // await this.preloadTravelTimes(appointments, locations)
      // logger.debug(`✅ Travel times preloaded (DEACTIVATED)`)
      const slots = await this.generateSlots({
        staff: staff.filter(s => staffWithBookableLocations.includes(s.id)),
        categories,
        locations,
        workingHours,
        appointments,
        busyTimes,
        startDate: options.startDate,
        endDate: options.endDate,
        bufferMinutes: options.bufferMinutes || 15
      })

      logger.debug('✅ Generated slots:', slots.length)

      // 3. Write slots to database (replace existing)
      const written = await this.writeSlots(slots, options.tenantId, options.staffId, options.startDate, options.endDate)

      const duration = Date.now() - startTime
      logger.debug('✅ Availability calculation complete:', {
        slotsGenerated: slots.length,
        slotsWritten: written,
        duration: `${duration}ms`
      })

      return written

    } catch (error: any) {
      logger.error('❌ Availability calculation failed:', error)
      throw error
    }
  }

  /**
   * Load active staff members
   */
  private async loadStaff(tenantId?: string, staffId?: string): Promise<Staff[]> {
    let query = this.supabase
      .from('users')
      .select('id, first_name, last_name, role, is_active, category, tenant_id')
      .eq('role', 'staff')
      .eq('is_active', true)

    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    if (staffId) {
      query = query.eq('id', staffId)
    }

    const { data, error } = await query

    if (error) throw error

    // Load minimum booking lead time (staff-level settings + tenant fallback)
    const staffIds = data?.map(s => s.id) || []
    const settingsMap = new Map()
    
    // Fetch tenant-level default lead time
    let tenantLeadTimeHours = 12
    if (tenantId) {
      const { data: tenantData } = await this.supabase
        .from('tenants')
        .select('minimum_booking_lead_time_hours')
        .eq('id', tenantId)
        .single()
      if (tenantData?.minimum_booking_lead_time_hours != null) {
        tenantLeadTimeHours = tenantData.minimum_booking_lead_time_hours
      }
    }

    // Only query settings if we have staff
    const bufferMap = new Map<string, number>()
    const travelMap = new Map<string, number | null>()
    const homePlzMap = new Map<string, string | null>()
    if (staffIds.length > 0) {
      const { data: availabilitySettings } = await this.supabase
        .from('staff_availability_settings')
        .select('staff_id, minimum_booking_lead_time_hours, buffer_minutes, max_travel_minutes, home_plz')
        .in('staff_id', staffIds)

      if (availabilitySettings) {
        availabilitySettings.forEach(s => {
          settingsMap.set(s.staff_id, s.minimum_booking_lead_time_hours)
          if (s.buffer_minutes != null) bufferMap.set(s.staff_id, s.buffer_minutes)
          travelMap.set(s.staff_id, s.max_travel_minutes ?? null)
          homePlzMap.set(s.staff_id, s.home_plz ?? null)
        })
      }
    }

    return (data || []).map(staff => ({
      ...staff,
      // Staff-level override takes priority, then tenant default, then global fallback
      minimum_booking_lead_time_hours: settingsMap.get(staff.id) ?? tenantLeadTimeHours,
      buffer_minutes: bufferMap.get(staff.id) ?? 15,
      max_travel_minutes: travelMap.get(staff.id) ?? null,
      home_plz: homePlzMap.get(staff.id) ?? null
    }))
  }

  /**
   * Load categories (only subcategories with parent_category_id)
   */
  private async loadCategories(tenantId?: string): Promise<Category[]> {
    let query = this.supabase
      .from('categories')
      .select('id, code, name, lesson_duration_minutes, is_active, tenant_id, parent_category_id')
      .eq('is_active', true)
      .not('parent_category_id', 'is', null) // Only subcategories!

    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data, error } = await query
    if (error) throw error

    logger.debug(`📚 Loaded ${data?.length || 0} subcategories (filtered by parent_category_id)`)
    return data || []
  }

  /**
   * Load locations
   */
  private async loadLocations(tenantId?: string, staffIds: string[] = []): Promise<Location[]> {
    // If staff_ids are provided, query staff_locations table to get only bookable locations
    if (staffIds.length > 0) {
      // Query staff_locations to get only is_online_bookable = true locations
      let staffLocQuery = this.supabase
        .from('staff_locations')
        .select('location_id, is_active, is_online_bookable')
        .in('staff_id', staffIds)
        .eq('is_active', true)
        .eq('is_online_bookable', true)

      if (tenantId) {
        staffLocQuery = staffLocQuery.eq('tenant_id', tenantId)
      }

      const { data: staffLocs, error: staffLocError } = await staffLocQuery

      if (staffLocError) {
        logger.warn('⚠️ Could not load staff_locations:', staffLocError)
        // Fallback to empty array if staff_locations query fails
        return []
      }

      if (!staffLocs || staffLocs.length === 0) {
        logger.debug('ℹ️ No bookable locations found in staff_locations table')
        return []
      }

      // Get unique location IDs from staff_locations
      const locationIds = [...new Set(staffLocs.map(sl => sl.location_id))]

      // Now load the location details from locations table
      let locQuery = this.supabase
        .from('locations')
        .select('id, name, address, location_type, is_active, staff_ids, available_categories, tenant_id, postal_code, time_windows')
        .in('id', locationIds)
        .eq('is_active', true)
        .eq('location_type', 'standard')

      if (tenantId) {
        locQuery = locQuery.eq('tenant_id', tenantId)
      }

      const { data: locations, error: locError } = await locQuery

      if (locError) throw locError

      // Parse staff_ids and available_categories if stored as JSON string
      const parsed = (locations || []).map(loc => {
        let parsedStaffIds = loc.staff_ids || []
        let availableCategories = loc.available_categories || []
        
        // Parse staff_ids if it's a string
        if (typeof parsedStaffIds === 'string') {
          try {
            parsedStaffIds = JSON.parse(parsedStaffIds)
          } catch (e) {
            logger.warn(`⚠️ Could not parse staff_ids for location ${loc.name}:`, parsedStaffIds)
            parsedStaffIds = []
          }
        }
        
        // Parse available_categories if it's a string
        if (typeof availableCategories === 'string') {
          try {
            availableCategories = JSON.parse(availableCategories)
          } catch (e) {
            logger.warn(`⚠️ Could not parse available_categories for location ${loc.name}:`, availableCategories)
            availableCategories = []
          }
        }

        // Parse time_windows (JSONB → array)
        let timeWindows: TimeWindow[] = []
        if (loc.time_windows) {
          if (Array.isArray(loc.time_windows)) {
            timeWindows = loc.time_windows
          } else if (typeof loc.time_windows === 'string') {
            try { timeWindows = JSON.parse(loc.time_windows) } catch { timeWindows = [] }
          }
        }
        
        return {
          ...loc,
          staff_ids: parsedStaffIds,
          available_categories: availableCategories,
          time_windows: timeWindows
        }
      })
      
      // Debug: Log loaded locations with their staff
      parsed.forEach(loc => {
        logger.debug(`📍 Location: ${loc.name} (${loc.id}) | postal_code: ${loc.postal_code}`)
      })
      
      logger.debug(`✅ Loaded ${parsed.length} bookable locations from staff_locations`)
      
      return parsed
    }

    // Fallback: If no staff_ids provided, return empty array
    return []
  }

  /**
   * Load working hours for staff
   */
  private async loadWorkingHours(staffIds: string[]): Promise<StaffWorkingHours[]> {
    if (staffIds.length === 0) return []

    const { data, error } = await this.supabase
      .from('staff_working_hours')
      .select('id, staff_id, day_of_week, start_time, end_time, timezone, is_active')
      .in('staff_id', staffIds)

    if (error) throw error

    // Filter for active hours only
    const activeHours = (data || []).filter(h => h.is_active)
    
    // Check PER STAFF if they have working hours, add defaults for those who don't
    const result: StaffWorkingHours[] = [...activeHours]
    const staffWithHours = new Set(activeHours.map(h => h.staff_id))
    
    for (const staffId of staffIds) {
      if (!staffWithHours.has(staffId)) {
        // This staff has NO active working hours - add defaults (Mon-Fri 8-18)
        logger.debug(`⚠️ Staff ${staffId.substring(0, 8)}... has no working hours, adding defaults`)
        for (let day = 1; day <= 5; day++) {
          result.push({
            id: `${staffId}-${day}-default`,
            staff_id: staffId,
            day_of_week: day,
            start_time: '08:00',
            end_time: '18:00',
            timezone: DEFAULT_TIMEZONE,
            is_active: true
          })
        }
      }
    }
    
    // Log summary
    const hoursByStaff = new Map<string, number>()
    result.forEach(h => {
      hoursByStaff.set(h.staff_id, (hoursByStaff.get(h.staff_id) || 0) + 1)
    })
    logger.debug('📅 Working hours per staff:')
    hoursByStaff.forEach((count, staffId) => {
      const isDefault = !staffWithHours.has(staffId)
      logger.debug(`   ${staffId.substring(0, 8)}...: ${count} days ${isDefault ? '(defaults)' : ''}`)
    })
    
    return result
  }

  /**
   * Load appointments (booked slots)
   */
  private async loadAppointments(staffIds: string[], startDate: Date, endDate: Date): Promise<Appointment[]> {
    if (staffIds.length === 0) return []

    const { data: appointments, error: appointmentsError } = await this.supabase
      .from('appointments')
      .select('id, staff_id, location_id, start_time, end_time, duration_minutes, status, type')
      .in('staff_id', staffIds)
      .not('status', 'eq', 'deleted')
      .is('deleted_at', null)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())

    if (appointmentsError) throw appointmentsError

    if (!appointments || appointments.length === 0) return []

    // Enrich appointments with location postal_code for travel time checks
    const locationIds = [...new Set(appointments.map((a: any) => a.location_id).filter(Boolean))]

    if (locationIds.length > 0) {
      const { data: locationData, error: locError } = await this.supabase
        .from('locations')
        .select('id, postal_code')
        .in('id', locationIds)

      if (locError) {
        logger.warn('⚠️ Could not enrich appointments with location data (travel time check disabled):', locError.message)
      } else if (locationData && locationData.length > 0) {
        const locMap = new Map(locationData.map((l: any) => [l.id, l]))
        return appointments.map((apt: any) => ({
          ...apt,
          location: locMap.get(apt.location_id) ?? undefined
        }))
      }
    }

    return appointments
  }

  /**
   * Load external busy times (from external calendars)
   */
  private async loadExternalBusyTimes(staffIds: string[], startDate: Date, endDate: Date, tenantId?: string): Promise<ExternalBusyTime[]> {
    if (staffIds.length === 0) return []

    let query = this.supabase
      .from('external_busy_times')
      .select('id, staff_id, start_time, end_time, tenant_id, postal_code')
      .in('staff_id', staffIds)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())

    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data, error } = await query

    if (error) {
      logger.warn('⚠️ Could not load external busy times:', error)
      return []
    }

    return data || []
  }

  /**
   * Generate all possible availability slots
   * ✅ NEW: Now async to support travel time checking
   */
  private async generateSlots(params: {
    staff: Staff[]
    categories: Category[]
    locations: Location[]
    workingHours: StaffWorkingHours[]
    appointments: Appointment[]
    busyTimes: ExternalBusyTime[]
    startDate: Date
    endDate: Date
    bufferMinutes: number
  }): Promise<AvailabilitySlot[]> {
    const slots: AvailabilitySlot[] = []

    // For each staff member
    for (const staff of params.staff) {
      // Get staff's working hours
      const staffHours = params.workingHours.filter(wh => wh.staff_id === staff.id)

      // Get staff's locations
      const staffLocations = params.locations.filter(loc =>
        loc.staff_ids?.includes(staff.id)
      )

      // Skip staff without locations
      if (staffLocations.length === 0) {
        logger.debug(`⚠️ Staff ${staff.id.substring(0, 8)}... has NO matching locations! (staff_ids parsing issue?)`)
        continue
      }

      // Get staff's categories
      // NEW: Support both parent and child categories
      // If staff has "B", should match any subcategory of B (B Schaltung, B Automatik)
      const staffCategories = params.categories.filter(cat => {
        // If staff has specific category, only allow those
        if (staff.category) {
          // staff.category can be an array ["A", "B"], a JSON string '["A","B"]', or a CSV "A,B"
          let staffCats: string[]
          if (Array.isArray(staff.category)) {
            staffCats = staff.category
          } else if (typeof staff.category === 'string') {
            // Try JSON.parse first (handles '["B","BPT","B Automatik"]' stored in DB)
            try {
              const parsed = JSON.parse(staff.category)
              staffCats = Array.isArray(parsed) ? parsed : staff.category.split(',').map((c: string) => c.trim())
            } catch {
              staffCats = staff.category.split(',').map((c: string) => c.trim())
            }
          } else {
            staffCats = []
          }
          
          // Check if category code matches (for subcategories where code = parent code)
          // We only load subcategories, so this naturally filters correctly
          return staffCats.includes(cat.code)
        }
        // Otherwise allow all categories
        return true
      })
      
      // DEDUP: If we have multiple categories with the same code (e.g., B Schaltung and B Automatik)
      // only use the FIRST one to avoid creating duplicate slots
      const uniqueCategories = new Map<string, any>()
      staffCategories.forEach((cat: any) => {
        if (!uniqueCategories.has(cat.code)) {
          uniqueCategories.set(cat.code, cat)
        }
      })
      const deduplicatedCategories = Array.from(uniqueCategories.values())
      
      // Debug logging
      logger.debug(`👤 Staff ${staff.first_name} ${staff.last_name} (${staff.id.substring(0, 8)}...):`)
      logger.debug(`   - Locations: ${staffLocations.map(l => l.name).join(', ')}`)
      logger.debug(`   - Staff category: ${staff.category || 'NONE (all allowed)'}`)
      logger.debug(`   - Working hours: ${staffHours.length} entries`)
      logger.debug(`   - Found categories (before dedup): ${staffCategories.map(c => `${c.code} (${c.name})`).join(', ') || 'NONE!'}`)
      logger.debug(`   - Using categories (after dedup): ${deduplicatedCategories.map(c => `${c.code} (${c.name})`).join(', ') || 'NONE!'}`)

      // Get staff's appointments and busy times
      const staffAppointments = params.appointments.filter(apt => apt.staff_id === staff.id)
      const staffBusyTimes = params.busyTimes.filter(bt => bt.staff_id === staff.id)

      // Calculate minimum bookable time
      const minLeadHours = staff.minimum_booking_lead_time_hours || 24
      const minBookableTime = new Date(Date.now() + minLeadHours * 60 * 60 * 1000)

      // For each day in the range (UTC calendar days — matches slot dates in DB)
      const currentDate = new Date(
        Date.UTC(
          params.startDate.getUTCFullYear(),
          params.startDate.getUTCMonth(),
          params.startDate.getUTCDate(),
          0,
          0,
          0,
          0
        )
      )
      const rangeEnd = new Date(
        Date.UTC(
          params.endDate.getUTCFullYear(),
          params.endDate.getUTCMonth(),
          params.endDate.getUTCDate(),
          0,
          0,
          0,
          0
        )
      )
      while (currentDate.getTime() <= rangeEnd.getTime()) {
        const dayOfWeek = this.getDayOfWeek(currentDate) // 1=Monday, 7=Sunday (UTC weekday)

        // Get working hours for this day
        let dayHours = staffHours.filter(wh => wh.day_of_week === dayOfWeek)
        
        // Deduplicate working hours (remove duplicates with same start/end time)
        const seenHours = new Set<string>()
        dayHours = dayHours.filter(wh => {
          const key = `${wh.start_time}:${wh.end_time}`
          if (seenHours.has(key)) {
            logger.debug(`⚠️ Skipping duplicate working hours: ${key}`)
            return false
          }
          seenHours.add(key)
          return true
        })

        if (dayHours.length === 0) {
          // No working hours for this day
          currentDate.setUTCDate(currentDate.getUTCDate() + 1)
          continue
        }

        // For each location
        for (const location of staffLocations) {
          // For each category the staff offers (deduped to avoid duplicates)
          for (const category of deduplicatedCategories) {
            // Check if location supports this category
            if (location.available_categories && location.available_categories.length > 0 && !location.available_categories.includes(category.code)) {
              continue // Location doesn't support this category
            }
            // If available_categories is empty, all categories are allowed
            
            // For each lesson duration
            for (const durationMinutes of category.lesson_duration_minutes) {
              // Generate slots for each working hour block
              for (const hours of dayHours) {
                // ✅ NEW: Now async/await for travel time checking
                const daySlots = await this.generateDaySlots({
                  date: currentDate,
                  startTime: hours.start_time,
                  endTime: hours.end_time,
                  timezone: hours.timezone || DEFAULT_TIMEZONE,
                  durationMinutes,
                  // Per-staff buffer takes priority over the global default
                  bufferMinutes: staff.buffer_minutes ?? params.bufferMinutes,
                  minBookableTime,
                  appointments: staffAppointments,
                  busyTimes: staffBusyTimes,
                  staff,
                  location,
                  category
                })

                slots.push(...daySlots)
              }
            }
          }
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1)
      }
    }

    // Summary: Count slots per staff
    const slotsByStaff = new Map<string, number>()
    slots.forEach(slot => {
      const staffId = slot.staff_id
      slotsByStaff.set(staffId, (slotsByStaff.get(staffId) || 0) + 1)
    })
    
    logger.debug('📊 Slots generated per staff:')
    slotsByStaff.forEach((count, staffId) => {
      const staffMember = params.staff.find(s => s.id === staffId)
      logger.debug(`   ${staffMember?.first_name || 'Unknown'} ${staffMember?.last_name || staffId.substring(0, 8)}: ${count} slots`)
    })

    return slots
  }

  /**
   * Generate slots for a specific day
   * ✅ NEW: Include travel time checking between appointments
   */
  private async generateDaySlots(params: {
    date: Date
    startTime: string // HH:MM wall-clock
    endTime: string   // HH:MM wall-clock
    timezone: string  // IANA timezone for startTime/endTime
    durationMinutes: number
    bufferMinutes: number
    minBookableTime: Date
    appointments: Appointment[]
    busyTimes: ExternalBusyTime[]
    staff: Staff
    location: Location
    category: Category
  }): Promise<AvailabilitySlot[]> {
    const slots: AvailabilitySlot[] = []

    // Working hours in DB = wall-clock time in the given timezone.
    const startParsed = parseWorkingTimeParts(params.startTime)
    const endParsed = parseWorkingTimeParts(params.endTime)

    const y = params.date.getUTCFullYear()
    const m0 = params.date.getUTCMonth()
    const d = params.date.getUTCDate()

    const slotStart = wallTimeToUtc(y, m0, d, startParsed.hours, startParsed.minutes, params.timezone)
    const workingEnd = wallTimeToUtc(y, m0, d, endParsed.hours, endParsed.minutes, params.timezone)

    // Generate slots in 15-minute increments
    const currentSlot = new Date(slotStart)

    while (currentSlot.getTime() + params.durationMinutes * 60 * 1000 <= workingEnd.getTime()) {
      const slotEnd = new Date(currentSlot.getTime() + params.durationMinutes * 60 * 1000)

      // Check if slot is in the future (respecting minimum lead time)
      if (slotEnd <= params.minBookableTime) {
        currentSlot.setUTCMinutes(currentSlot.getUTCMinutes() + 15)
        continue
      }

      // Check location time windows: convert UTC slot to wall-clock time in the location's timezone
      if (params.location.time_windows?.length) {
        const localStr = currentSlot.toLocaleString('en-US', { timeZone: params.timezone })
        const localDate = new Date(localStr)
        if (!isWithinTimeWindows(localDate, params.location.time_windows)) {
          currentSlot.setUTCMinutes(currentSlot.getUTCMinutes() + 15)
          continue
        }
      }

      // Check if slot conflicts with appointments or busy times
      const hasConflict = await this.hasConflict({
        slotStart: currentSlot,
        slotEnd,
        appointments: params.appointments,
        busyTimes: params.busyTimes,
        bufferMinutes: params.bufferMinutes,
        newLocationPostalCode: params.location.postal_code,
        maxTravelMinutes: params.staff.max_travel_minutes ?? null,
        staff: params.staff
      })

      // Skip slots that conflict with appointments or busy times
      if (hasConflict) {
        currentSlot.setUTCMinutes(currentSlot.getUTCMinutes() + 15)
        continue
      }

      slots.push({
        tenant_id: params.staff.tenant_id,
        staff_id: params.staff.id,
        location_id: params.location.id,
        start_time: currentSlot.toISOString(),
        end_time: slotEnd.toISOString(),
        duration_minutes: params.durationMinutes,
        is_available: true, // Only available slots are created
        category_code: params.category.code
      })

      // Move to next slot (15-minute increment, UTC-safe)
      currentSlot.setUTCMinutes(currentSlot.getUTCMinutes() + 15)
    }

    return slots
  }

  /**
   * Check if a time slot conflicts with appointments or busy times
   * ✅ NEW: Include travel time checking
   */
  private async hasConflict(params: {
    slotStart: Date
    slotEnd: Date
    appointments: Appointment[]
    busyTimes: ExternalBusyTime[]
    bufferMinutes: number
    newLocationPostalCode?: string
    maxTravelMinutes?: number | null
    staff?: Staff
  }): Promise<boolean> {
    const slotStartTime = params.slotStart.getTime()
    const slotEndTime = params.slotEnd.getTime()
    const bufferMs = params.bufferMinutes * 60 * 1000


    // Check appointments
    for (const apt of params.appointments) {
      const aptStart = new Date(apt.start_time).getTime()
      const aptEnd = new Date(apt.end_time).getTime()

      // Check for overlap (including buffer)
      const directOverlap = (
        (slotStartTime >= aptStart - bufferMs && slotStartTime < aptEnd + bufferMs) ||
        (slotEndTime > aptStart - bufferMs && slotEndTime <= aptEnd + bufferMs) ||
        (slotStartTime <= aptStart - bufferMs && slotEndTime >= aptEnd + bufferMs)
      )

      if (directOverlap) {
        logger.debug(`⚠️ Direct overlap detected for appointment ${apt.id}`)
        return true
      }

      // Travel time check: if the slot is at a different PLZ than the appointment,
      // the instructor needs enough time to drive there on top of the base buffer.
      // Only runs if both locations have a postal_code configured.
      if (
        params.newLocationPostalCode &&
        apt.location?.postal_code &&
        params.newLocationPostalCode !== apt.location.postal_code
      ) {
        try {
          const travelTime = await this.getTravelTimeForSlot(
            apt.location.postal_code,
            params.newLocationPostalCode,
            params.slotStart
          )

          if (travelTime !== null && travelTime > 0) {
            // Required gap = travel time + base buffer (so instructor arrives with breathing room)
            const requiredGapMs = (travelTime * 60 * 1000) + bufferMs

            // CASE 1: appointment ends → instructor drives to new slot location
            const requiredStartAfterApt = aptEnd + requiredGapMs
            if (aptEnd <= slotStartTime && slotStartTime < requiredStartAfterApt) {
              logger.debug(`⚠️ TRAVEL CONFLICT (Apt→Slot): ${travelTime}min travel + ${params.bufferMinutes}min buffer from ${apt.location.postal_code}→${params.newLocationPostalCode}`)
              return true
            }

            // CASE 2: slot ends → instructor drives to appointment location
            const requiredStartAfterSlot = slotEndTime + requiredGapMs
            if (slotEndTime <= aptStart && aptStart < requiredStartAfterSlot) {
              logger.warn(`⚠️ TRAVEL CONFLICT (Slot→Apt): ${travelTime}min travel + ${params.bufferMinutes}min buffer from ${params.newLocationPostalCode}→${apt.location.postal_code}`)
              return true
            }
          }
        } catch (err: any) {
          logger.warn('⚠️ Travel time check failed (non-fatal, skipping):', err.message)
        }
      }
      // Appointments/locations without postal_code skip travel time check
    }

    // Check busy times
    for (const busyTime of params.busyTimes) {
      const busyStart = new Date(busyTime.start_time).getTime()
      const busyEnd = new Date(busyTime.end_time).getTime()

      // Check for overlap (including buffer)
      if (
        (slotStartTime >= busyStart - bufferMs && slotStartTime < busyEnd + bufferMs) ||
        (slotEndTime > busyStart - bufferMs && slotEndTime <= busyEnd + bufferMs) ||
        (slotStartTime <= busyStart - bufferMs && slotEndTime >= busyEnd + bufferMs)
      ) {
        return true
      }

      // Travel time check for busy times that have a known postal_code
      if (
        params.newLocationPostalCode &&
        busyTime.postal_code &&
        params.newLocationPostalCode !== busyTime.postal_code
      ) {
        try {
          const travelTime = await this.getTravelTimeForSlot(
            params.newLocationPostalCode,
            busyTime.postal_code,
            params.slotStart
          )

          if (travelTime !== null && travelTime > 0) {
            const requiredGapMs = (travelTime * 60 * 1000) + bufferMs

            // Slot ends → drive to busy time location
            const requiredStartAfterSlot = slotEndTime + requiredGapMs
            if (slotEndTime <= busyStart && busyStart < requiredStartAfterSlot) {
              logger.debug(`⚠️ TRAVEL CONFLICT (Slot→BusyTime): ${travelTime}min travel from ${params.newLocationPostalCode}→${busyTime.postal_code}`)
              return true
            }

            // Busy time ends → drive to slot location
            const requiredStartAfterBusy = busyEnd + requiredGapMs
            if (busyEnd <= slotStartTime && slotStartTime < requiredStartAfterBusy) {
              logger.debug(`⚠️ TRAVEL CONFLICT (BusyTime→Slot): ${travelTime}min travel from ${busyTime.postal_code}→${params.newLocationPostalCode}`)
              return true
            }
          }
        } catch (err: any) {
          logger.warn('⚠️ Travel time check for busy time failed (non-fatal):', err.message)
        }
      }
    }

    // Max travel check: if the staff has configured a max_travel_minutes,
    // find where the instructor is coming from (previous appointment or home PLZ)
    // and block this slot if the travel time exceeds their preference.
    if (
      params.newLocationPostalCode &&
      params.maxTravelMinutes != null &&
      params.maxTravelMinutes > 0
    ) {
      try {
        // Find the most recent appointment ending before this slot
        const prevApt = [...params.appointments]
          .filter(a => new Date(a.end_time).getTime() <= slotStartTime && a.location?.postal_code)
          .sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime())[0]

        // Also check busy times as a previous location source
        const prevBusy = [...params.busyTimes]
          .filter(bt => new Date(bt.end_time).getTime() <= slotStartTime && bt.postal_code)
          .sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime())[0]

        // Pick whichever ended most recently
        let fromPlz: string | null = null
        const prevAptTime = prevApt ? new Date(prevApt.end_time).getTime() : 0
        const prevBusyTime = prevBusy ? new Date(prevBusy.end_time).getTime() : 0
        if (prevAptTime >= prevBusyTime && prevApt?.location?.postal_code) {
          fromPlz = prevApt.location.postal_code
        } else if (prevBusyTime > prevAptTime && prevBusy?.postal_code) {
          fromPlz = prevBusy.postal_code
        }
        // No home_plz fallback: if there's no prior appointment, we don't restrict the slot

        if (fromPlz && fromPlz !== params.newLocationPostalCode) {
          const travelTime = await this.getTravelTimeForSlot(fromPlz, params.newLocationPostalCode, params.slotStart)
          if (travelTime !== null && travelTime > params.maxTravelMinutes) {
            logger.debug(`⚠️ MAX TRAVEL EXCEEDED: ${fromPlz}→${params.newLocationPostalCode} = ${travelTime}min (max: ${params.maxTravelMinutes}min)`)
            return true
          }
        }
      } catch (err: any) {
        logger.warn('⚠️ Max travel check failed (non-fatal):', err.message)
      }
    }

    return false
  }

  /*
   * Preload travel times in batch for all postal code combinations
   * This runs BEFORE slot generation to cache all needed travel times at once
   */
  // private async preloadTravelTimes(appointments: Appointment[], locations: Location[]): Promise<void> {
  //   try {
  //     // Collect all unique postal code pairs that need travel time data
  //     const travelTimePairs = new Set<string>()
      
  //     for (const apt of appointments) {
  //       if (!apt.location?.postal_code) continue
        
  //       for (const loc of locations) {
  //         if (!loc.postal_code) continue
  //         if (apt.location.postal_code === loc.postal_code) continue
          
  //         // Add both directions to check
  //         const pairForward = `${apt.location.postal_code}→${loc.postal_code}`
  //         const pairReverse = `${loc.postal_code}→${apt.location.postal_code}`
          
  //         travelTimePairs.add(pairForward)
  //         travelTimePairs.add(pairReverse)
  //       }
  //     }
      
  //     if (travelTimePairs.size === 0) {
  //       logger.debug('ℹ️ No travel time pairs to preload')
  //       return
  //     }
      
  //     logger.debug(`🔄 Preloading ${travelTimePairs.size} travel time pairs`)
      
  //     const pairs = Array.from(travelTimePairs)
      
  //     // Check which ones are already cached
  //     const { data: cached, error: cacheError } = await this.supabase
  //       .from('plz_distance_cache')
  //       .select('from_plz, to_plz')
      
  //     if (cacheError) {
  //       logger.warn('⚠️ Error loading cache:', cacheError)
  //     }
      
  //     const cachedSet = new Set(
  //       cached?.map(c => `${c.from_plz}→${c.to_plz}`) || []
  //     )
      
  //     const toFetch = pairs.filter(p => !cachedSet.has(p))
      
  //     if (toFetch.length === 0) {
  //       logger.debug('✅ All travel times already cached')
  //       return
  //     }
      
  //     logger.debug(`📡 Fetching ${toFetch.length} uncached travel times from Google API`)
      
  //     // Fetch from Google in batches to avoid rate limiting
  //     const config = useRuntimeConfig()
  //     const googleApiKey = config.googleMapsApiKey
      
  //     if (!googleApiKey) {
  //       logger.warn('⚠️ Google API key not configured, skipping travel time preload')
  //       return
  //     }
      
  //     // Process in smaller batches (e.g., 5 at a time) to avoid overwhelming the API
  //     const batchSize = 5
  //     for (let i = 0; i < toFetch.length; i += batchSize) {
  //       const batch = toFetch.slice(i, i + batchSize)
        
  //       // Fetch all in this batch in parallel
  //       await Promise.all(
  //         batch.map(async (pairStr) => {
  //           const [fromPlz, toPlz] = pairStr.split('→')
  //           try {
  //             await this.getTravelTimeForSlot(fromPlz, toPlz, new Date())
  //           } catch (err: any) {
  //             logger.warn(`⚠️ Error fetching travel time ${fromPlz}→${toPlz}:`, err.message)
  //           }
  //         })
  //       )
        
  //       // Small delay between batches
  //       if (i + batchSize < toFetch.length) {
  //         await new Promise(resolve => setTimeout(resolve, 100))
  //       }
  //     }
      
  //     logger.debug(`✅ Travel time preload complete`)
      
  //   } catch (err: any) {
  //     logger.warn('⚠️ Travel time preload failed:', err.message)
  //     // Non-critical: continue without preload
  //   }
  // }

  /**
   * Get travel time in minutes between two Swiss postal codes.
   * Checks plz_distance_cache first; falls back to Google Distance Matrix API on a cache miss.
   * Returns null when the API key is missing or the route cannot be determined.
   */
  private async getTravelTimeForSlot(
    fromPostalCode: string,
    toPostalCode: string,
    slotTime: Date
  ): Promise<number | null> {
    if (fromPostalCode === toPostalCode) return 0

    // Normalise key — distance is symmetric
    const cacheKey = [fromPostalCode, toPostalCode].sort().join('→')

    try {
      // 1. In-memory cache (fastest — avoids DB round-trip for same pair in one run)
      if (this.travelTimeCache.has(cacheKey)) {
        const cached = this.travelTimeCache.get(cacheKey)!
        if (cached === -1) return null // confirmed no-route
        // Apply peak multiplier: offpeak value stored, peak ≈ ×1.3
        return this.isPeakSlotTime(slotTime) ? Math.ceil(cached * 1.3) : cached
      }

      // 2. DB cache (plz_distance_cache table, bidirectional lookup)
      const { data: dbCached, error: cacheErr } = await this.supabase
        .from('plz_distance_cache')
        .select('driving_time_minutes_peak, driving_time_minutes_offpeak')
        .or(
          `and(from_plz.eq.${fromPostalCode},to_plz.eq.${toPostalCode}),` +
          `and(from_plz.eq.${toPostalCode},to_plz.eq.${fromPostalCode})`
        )
        .maybeSingle()

      if (!cacheErr && dbCached) {
        // -1 stored in DB means "no route confirmed" — skip Google
        const offpeakVal = dbCached.driving_time_minutes_offpeak
        if (offpeakVal === -1) {
          this.travelTimeCache.set(cacheKey, -1)
          return null
        }
        this.travelTimeCache.set(cacheKey, offpeakVal)
        const peak = this.isPeakSlotTime(slotTime)
        return peak ? dbCached.driving_time_minutes_peak : offpeakVal
      }

      // 3. Cache miss → call Google Distance Matrix API
      const config = useRuntimeConfig()
      const apiKey = (config.googleDistanceMatrixKey || config.googleMapsApiKey) as string | undefined
      if (!apiKey) {
        logger.warn('⚠️ googleDistanceMatrixKey not configured – skipping travel time check for this run')
        this.travelTimeCache.set(cacheKey, -1) // only in-memory, not in DB
        return null
      }

      const origin = encodeURIComponent(`${fromPostalCode}, Switzerland`)
      const dest   = encodeURIComponent(`${toPostalCode}, Switzerland`)
      const url    = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&mode=driving&language=de&key=${apiKey}`

      const resp = await $fetch<any>(url)
      const element = resp?.rows?.[0]?.elements?.[0]

      if (resp?.status !== 'OK' || element?.status !== 'OK') {
        logger.warn(`⚠️ Google API: no route for ${fromPostalCode}→${toPostalCode} – skipping travel check for this run`)
        // Only cache in-memory (not in DB) — transient API errors should not permanently disable travel checks
        this.travelTimeCache.set(cacheKey, -1)
        return null
      }

      const offpeak = Math.ceil(element.duration.value / 60)
      const peak    = Math.ceil(offpeak * 1.3)
      const distKm  = Math.round((element.distance?.value ?? 0) / 1000)

      // 4. Persist success to both caches
      this.travelTimeCache.set(cacheKey, offpeak)
      await this.supabase
        .from('plz_distance_cache')
        .upsert(
          {
            from_plz: fromPostalCode,
            to_plz: toPostalCode,
            driving_time_minutes: offpeak,
            driving_time_minutes_offpeak: offpeak,
            driving_time_minutes_peak: peak,
            distance_km: distKm,
            last_updated: new Date().toISOString()
          },
          { onConflict: 'from_plz,to_plz' }
        )

      logger.debug(`🚗 Travel time ${fromPostalCode}→${toPostalCode}: offpeak=${offpeak}min peak=${peak}min (cached)`)
      return this.isPeakSlotTime(slotTime) ? peak : offpeak

    } catch (err: any) {
      logger.warn('⚠️ getTravelTimeForSlot error:', err.message)
      this.travelTimeCache.set(cacheKey, -1) // only in-memory, not in DB
      return null
    }
  }

  /** True if the given time falls in morning (07–09) or evening (17–19) rush hour, Mon–Fri */
  private isPeakSlotTime(date: Date): boolean {
    const day  = date.getUTCDay() // 0=Sun, 6=Sat
    if (day === 0 || day === 6) return false
    const hour = date.getUTCHours()
    return (hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)
  }

  /**
   * Write slots to availability_slots table
   */
  private async writeSlots(
    slots: AvailabilitySlot[],
    tenantId?: string,
    staffId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    if (slots.length === 0) {
      logger.debug('ℹ️ No slots to write (staff may have no working hours configured)')
      return 0
    }

    try {
      const upsertBatchSize = 1000   // Upserts use a POST body → no URL length limit
      const deleteBatchSize = 100    // Deletes use `.in()` query params → URL limit ~8 kB; 100 UUIDs ≈ 3.7 kB ✓

      // Step 1: Upsert new slots.
      // onConflict on the natural key preserves the existing UUID for unchanged slots,
      // so any slot_id a user loaded before recalculation remains valid after it.
      logger.debug(`⬆️ Upserting ${slots.length} slots...`)
      let insertedCount = 0

      for (let i = 0; i < slots.length; i += upsertBatchSize) {
        const batch = slots.slice(i, i + upsertBatchSize)

        const { error: insertError } = await this.supabase
          .from('availability_slots')
          .upsert(batch, {
            onConflict: 'staff_id,location_id,start_time,end_time,category_code',
            ignoreDuplicates: false
          })

        if (insertError) {
          logger.error('❌ Error upserting batch:', insertError)
          throw insertError
        }

        insertedCount += batch.length
      }

      logger.debug(`✅ Upserted ${insertedCount} slots`)

      // Step 2: Delete stale slots whose natural key is no longer in the new set.
      // Actively reserved slots (reserved_by_session set + reserved_until in the future)
      // are always preserved even if they became stale, to avoid breaking ongoing bookings.
      //
      // IMPORTANT: Normalize timestamps to epoch ms before comparing. JavaScript's
      // toISOString() returns "2026-06-20T06:15:00.000Z" but Supabase/PostgREST
      // returns "2026-06-20T06:15:00+00:00" — raw string comparison would never match,
      // causing every just-inserted slot to be treated as stale and immediately deleted.
      const toEpoch = (t: string) => new Date(t).getTime()
      const newKeySet = new Set(
        slots.map(s => `${s.staff_id}|${s.location_id}|${toEpoch(s.start_time)}|${toEpoch(s.end_time)}|${s.category_code}`)
      )

      // Fetch existing slots with pagination to avoid Supabase's default 1000-row API
      // limit. Without pagination a staff member with thousands of slots (e.g. many
      // locations × categories × durations) would silently have stale slots skipped.
      //
      // PAGE_SIZE must be ≤ the PostgREST max_rows setting (default 1000 in Supabase).
      // We use 1000 so that receiving fewer rows than PAGE_SIZE reliably signals the
      // last page — if PAGE_SIZE were larger than max_rows the last-page check would
      // fire on the very first request and we'd never read beyond row 1000.
      const FETCH_PAGE_SIZE = 1000
      let fetchOffset = 0
      const allExistingSlots: any[] = []

      for (let pageIndex = 0; pageIndex < 500; pageIndex++) {   // 500 × 1000 = 500k slots max (safety valve)
        let pageQuery = this.supabase
          .from('availability_slots')
          .select('id, staff_id, location_id, start_time, end_time, category_code, reserved_by_session, reserved_until')

        if (tenantId) pageQuery = pageQuery.eq('tenant_id', tenantId)
        if (staffId)  pageQuery = pageQuery.eq('staff_id', staffId)
        // Limit to the recalculation window so we only check slots that this run is
        // responsible for — keeps page counts small and avoids touching past slots.
        if (startDate) pageQuery = pageQuery.gte('start_time', startDate.toISOString())
        if (endDate)   pageQuery = pageQuery.lte('start_time', endDate.toISOString())

        pageQuery = pageQuery.range(fetchOffset, fetchOffset + FETCH_PAGE_SIZE - 1)

        const { data: page, error: pageError } = await pageQuery

        if (pageError) {
          // Non-fatal: upsert already succeeded, skip stale cleanup rather than failing the whole job
          logger.warn('⚠️ Could not fetch existing slots for stale-slot cleanup – skipping cleanup:', pageError)
          return insertedCount
        }

        if (!page || page.length === 0) break       // empty page → done
        allExistingSlots.push(...page)
        if (page.length < FETCH_PAGE_SIZE) break    // partial page → last page
        fetchOffset += FETCH_PAGE_SIZE
      }

      logger.debug(`📋 Fetched ${allExistingSlots.length} existing slots for stale-slot check (${Math.ceil(allExistingSlots.length / FETCH_PAGE_SIZE)} pages)`)

      const now = new Date()
      const staleIds = allExistingSlots
        .filter(s => {
          const key = `${s.staff_id}|${s.location_id}|${toEpoch(s.start_time)}|${toEpoch(s.end_time)}|${s.category_code}`
          if (newKeySet.has(key)) return false
          // Keep actively reserved slots to avoid breaking an in-progress booking
          const isActivelyReserved =
            s.reserved_by_session && s.reserved_until && new Date(s.reserved_until) > now
          return !isActivelyReserved
        })
        .map(s => s.id)

      if (staleIds.length > 0) {
        logger.debug(`🗑️ Deleting ${staleIds.length} stale slots...`)

        for (let i = 0; i < staleIds.length; i += deleteBatchSize) {
          const batchIds = staleIds.slice(i, i + deleteBatchSize)

          let deleteQuery = this.supabase
            .from('availability_slots')
            .delete()
            .in('id', batchIds)

          // Mirror the same scope filters used when fetching — helps PostgREST
          // accept the DELETE and avoids "Bad Request" rejections on unconstrained deletes
          if (tenantId) deleteQuery = deleteQuery.eq('tenant_id', tenantId)
          if (staffId)  deleteQuery = deleteQuery.eq('staff_id', staffId)

          const { error: deleteError } = await deleteQuery

          if (deleteError) {
            logger.warn('⚠️ Error deleting stale slots batch (non-fatal):', deleteError)
          }
        }

        logger.debug(`✅ Deleted ${staleIds.length} stale slots`)
      } else {
        logger.debug('✅ No stale slots to delete')
      }

      return insertedCount

    } catch (error: any) {
      logger.error('❌ Error writing slots:', error)
      throw error
    }
  }

  /**
   * Get day of week (1=Monday, 7=Sunday)
   * IMPORTANT: Use getUTCDay() since all working_hours are stored in UTC
   */
  private getDayOfWeek(date: Date): number {
    const day = date.getUTCDay()
    // Convert JS day (0=Sunday) to our format (1=Monday, 7=Sunday)
    return day === 0 ? 7 : day
  }

  /**
   * Recalculate slots for a specific staff member and date range
   */
  async recalculateForStaff(tenantId: string, staffId: string, days: number = 30): Promise<number> {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)

    return this.calculateAvailability({
      tenantId,
      staffId,
      startDate,
      endDate
    })
  }

  /**
   * Recalculate slots for an entire tenant
   */
  async recalculateForTenant(tenantId: string, days: number = 30): Promise<number> {
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)

    return this.calculateAvailability({
      tenantId,
      startDate,
      endDate
    })
  }
}

/**
 * Export singleton instance
 */
export const availabilityCalculator = new AvailabilityCalculator()

