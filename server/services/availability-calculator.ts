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
}

interface Category {
  id: number
  code: string
  name: string
  lesson_duration_minutes: number[]
  is_active: boolean
  tenant_id: string
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
}

interface StaffWorkingHours {
  id: string
  staff_id: string
  day_of_week: number // 1=Monday, 7=Sunday
  start_time: string // HH:MM
  end_time: string // HH:MM
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
      const workingHours = await this.loadWorkingHours(staff.map(s => s.id))
      const appointments = await this.loadAppointments(staff.map(s => s.id), options.startDate, options.endDate)
      const busyTimes = await this.loadExternalBusyTimes(staff.map(s => s.id), options.startDate, options.endDate, options.tenantId)

      logger.debug('✅ Data loaded:', {
        staff: staff.length,
        categories: categories.length,
        locations: locations.length,
        workingHours: workingHours.length,
        appointments: appointments.length,
        busyTimes: busyTimes.length
      })

      // 2. Generate all possible slots
      const slots = await this.generateSlots({
        staff,
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

    // Load minimum booking lead time
    const staffIds = data?.map(s => s.id) || []
    const settingsMap = new Map()
    
    // Only query settings if we have staff
    if (staffIds.length > 0) {
      const { data: availabilitySettings } = await this.supabase
        .from('staff_availability_settings')
        .select('staff_id, minimum_booking_lead_time_hours')
        .in('staff_id', staffIds)

      if (availabilitySettings) {
        availabilitySettings.forEach(s => {
          settingsMap.set(s.staff_id, s.minimum_booking_lead_time_hours)
        })
      }
    }

    return (data || []).map(staff => ({
      ...staff,
      minimum_booking_lead_time_hours: settingsMap.get(staff.id) || 24
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
        .select('id, name, address, location_type, is_active, staff_ids, available_categories, tenant_id, postal_code')
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
        
        return {
          ...loc,
          staff_ids: parsedStaffIds,
          available_categories: availableCategories
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
      .select('id, staff_id, day_of_week, start_time, end_time, is_active')
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

    // ✅ NEW: Load location details (postal_code) for travel time calculation
    if (appointments && appointments.length > 0) {
      const locationIds = [...new Set(appointments.map(a => a.location_id))]
      
      const { data: locations, error: locError } = await this.supabase
        .from('locations')
        .select('id, postal_code')
        .in('id', locationIds)
      
      if (!locError && locations) {
        const locMap = new Map(locations.map(l => [l.id, l]))
        
        // Enrich appointments with location data
        return appointments.map(apt => ({
          ...apt,
          location: locMap.get(apt.location_id)
        }))
      }
    }

    return appointments || []
  }

  /**
   * Load external busy times (from external calendars)
   */
  private async loadExternalBusyTimes(staffIds: string[], startDate: Date, endDate: Date, tenantId?: string): Promise<ExternalBusyTime[]> {
    if (staffIds.length === 0) return []

    let query = this.supabase
      .from('external_busy_times')
      .select('id, staff_id, start_time, end_time, tenant_id')
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
          // staff.category can be an array ["A", "B"] or a string "A,B"
          let staffCats: string[]
          if (Array.isArray(staff.category)) {
            staffCats = staff.category
          } else if (typeof staff.category === 'string') {
            staffCats = staff.category.split(',').map((c: string) => c.trim())
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

      // For each day in the range
      const currentDate = new Date(params.startDate)
      while (currentDate <= params.endDate) {
        const dayOfWeek = this.getDayOfWeek(currentDate) // 1=Monday, 7=Sunday

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
          currentDate.setDate(currentDate.getDate() + 1)
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
                  durationMinutes,
                  bufferMinutes: params.bufferMinutes,
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

        currentDate.setDate(currentDate.getDate() + 1)
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
    startTime: string // HH:MM
    endTime: string // HH:MM
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

    // Parse start and end time
    const [startHour, startMinute] = params.startTime.split(':').map(Number)
    const [endHour, endMinute] = params.endTime.split(':').map(Number)

    // Create start datetime (use UTC to avoid timezone issues)
    const slotStart = new Date(params.date)
    slotStart.setUTCHours(startHour, startMinute, 0, 0)

    // Create end datetime
    const workingEnd = new Date(params.date)
    workingEnd.setUTCHours(endHour, endMinute, 0, 0)

    // Generate slots in 15-minute increments
    const currentSlot = new Date(slotStart)

    while (currentSlot.getTime() + params.durationMinutes * 60 * 1000 <= workingEnd.getTime()) {
      const slotEnd = new Date(currentSlot.getTime() + params.durationMinutes * 60 * 1000)

      // Check if slot is in the future (respecting minimum lead time)
      if (slotEnd <= params.minBookableTime) {
        currentSlot.setMinutes(currentSlot.getMinutes() + 15)
        continue
      }

      // Check if slot conflicts with appointments or busy times
      const hasConflict = await this.hasConflict({
        slotStart: currentSlot,
        slotEnd,
        appointments: params.appointments,
        busyTimes: params.busyTimes,
        bufferMinutes: params.bufferMinutes,
        newLocationPostalCode: params.location.postal_code,
        staff: params.staff
      })

      // Skip slots that conflict with appointments or busy times
      if (hasConflict) {
        currentSlot.setMinutes(currentSlot.getMinutes() + 15)
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

      // Move to next slot (15-minute increment)
      currentSlot.setMinutes(currentSlot.getMinutes() + 15)
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
    staff?: Staff
  }): Promise<boolean> {
    const slotStartTime = params.slotStart.getTime()
    const slotEndTime = params.slotEnd.getTime()
    const bufferMs = params.bufferMinutes * 60 * 1000

    logger.debug(`🔍 hasConflict check for slot ${params.slotStart.toISOString()}, appointments: ${params.appointments.length}`)

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

      // ✅ NEW: Check travel time between appointment location and new slot location
      // IMPORTANT: Only check if appointment location is a standard location with postal_code
      // AND: Only check if the appointment is at one of the online-bookable locations
      logger.debug(`📍 Appointment location check:`, {
        aptPostalCode: apt.location?.postal_code,
        newPostalCode: params.newLocationPostalCode,
        hasPostal: !!apt.location?.postal_code,
        sameLocation: params.newLocationPostalCode === apt.location?.postal_code
      })

      if (params.newLocationPostalCode && apt.location?.postal_code && 
          params.newLocationPostalCode !== apt.location.postal_code) {
        try {
          logger.debug(`🚗 Checking travel time from ${apt.location.postal_code} to ${params.newLocationPostalCode}`)
          
          const travelTime = await this.getTravelTimeForSlot(
            apt.location.postal_code,
            params.newLocationPostalCode,
            params.slotStart
          )

          logger.debug(`⏱️ Travel time result:`, { travelTime, slotStart: params.slotStart.toISOString() })

          if (travelTime !== null && travelTime > 0) {
            const travelBufferMs = travelTime * 60 * 1000
            
            // CASE 1: Appointment ends, then staff needs to travel to new location
            // Slot cannot start until: appointmentEnd + travelTime
            const requiredFreeTimeStart = aptEnd + travelBufferMs

            logger.debug(`⏱️ Travel time analysis (Apt→Slot):`, {
              travelTimeMinutes: travelTime,
              aptEnd: new Date(aptEnd).toISOString(),
              requiredStart: new Date(requiredFreeTimeStart).toISOString(),
              slotStart: params.slotStart.toISOString(),
              conflict: slotStartTime < requiredFreeTimeStart
            })

            // If slot starts before staff can travel there from appointment, it's a conflict
            // BUT: Only if appointment ends BEFORE slot starts (apt→slot progression)
            if (aptEnd <= slotStartTime && slotStartTime < requiredFreeTimeStart) {
              logger.warn(`⚠️ TRAVEL TIME CONFLICT (Apt→Slot): slot ${params.slotStart.toISOString()} needs ${travelTime}min travel from ${apt.location.postal_code} to ${params.newLocationPostalCode}`)
              return true
            }

            // CASE 2: Slot ends, then staff needs to travel to appointment location
            // Appointment cannot start until: slotEnd + travelTime
            const requiredFreeTimeForApt = slotEndTime + travelBufferMs

            logger.debug(`⏱️ Travel time analysis (Slot→Apt):`, {
              travelTimeMinutes: travelTime,
              slotEnd: new Date(slotEndTime).toISOString(),
              requiredStart: new Date(requiredFreeTimeForApt).toISOString(),
              aptStart: new Date(aptStart).toISOString(),
              conflict: aptStart < requiredFreeTimeForApt
            })

            // If appointment starts before staff can travel there from slot, it's a conflict
            // BUT: Only if slot ends BEFORE appointment starts (slot→apt progression)
            logger.debug(`⏱️ Slot→Apt adjacency check: slotEnd (${new Date(slotEndTime).toISOString()}) <= aptStart (${new Date(aptStart).toISOString()})? ${slotEndTime <= aptStart}`)
            
            if (slotEndTime <= aptStart && aptStart < requiredFreeTimeForApt) {
              logger.warn(`⚠️ TRAVEL TIME CONFLICT (Slot→Apt): appointment ${new Date(aptStart).toISOString()} needs ${travelTime}min travel from ${params.newLocationPostalCode} to ${apt.location.postal_code}`)
              return true
            }
          }
        } catch (err: any) {
          logger.warn('⚠️ Error checking travel time:', err.message)
          // Non-critical: continue without travel time check if error occurs
        }
      }
      // Note: Appointments with custom locations (no postal_code) don't trigger travel time checks
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
    }

    return false
  }

  /**
   * Get travel time between two postal codes using cache or Google API
   */
  private async getTravelTimeForSlot(fromPostalCode: string, toPostalCode: string, slotTime: Date): Promise<number | null> {
    try {
      // Check cache first
      const { data: cached, error } = await this.supabase
        .from('plz_distance_cache')
        .select('driving_time_minutes_peak, driving_time_minutes_offpeak')
        .or(`and(from_plz.eq.${fromPostalCode},to_plz.eq.${toPostalCode}),and(from_plz.eq.${toPostalCode},to_plz.eq.${fromPostalCode})`)
        .maybeSingle()

      if (!error && cached) {
        logger.debug(`✅ Travel time from cache: ${fromPostalCode} -> ${toPostalCode}`)
        
        // Determine if peak or offpeak
        const hour = slotTime.getHours()
        const day = slotTime.getDay()
        const isWeekday = day !== 0 && day !== 6
        const isPeakTime = isWeekday && ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19))
        
        return isPeakTime ? cached.driving_time_minutes_peak : cached.driving_time_minutes_offpeak
      }

      logger.debug(`⚠️ No travel time cache for ${fromPostalCode} -> ${toPostalCode}`)
      
      // NEW: Try to fetch from Google Distance API and cache it
      const googleApiKey = process.env.GOOGLE_DISTANCE_MATRIX_API_KEY
      if (!googleApiKey) {
        logger.warn('⚠️ Google Distance API key not configured, cannot fetch travel time')
        return null
      }

      logger.debug(`🔄 Fetching travel time from Google Distance API: ${fromPostalCode} -> ${toPostalCode}`)
      
      try {
        // Fetch from Google Distance Matrix API
        const origin = `${fromPostalCode}, Switzerland`
        const destination = `${toPostalCode}, Switzerland`
        
        // Call for offpeak time
        const offpeakUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=driving&language=de&key=${googleApiKey}`
        
        const offpeakResponse = await $fetch<any>(offpeakUrl)
        
        if (offpeakResponse.status !== 'OK' || !offpeakResponse.rows?.[0]?.elements?.[0]) {
          logger.warn('⚠️ Google API error (offpeak):', offpeakResponse.status)
          return null
        }
        
        const offpeakElement = offpeakResponse.rows[0].elements[0]
        if (offpeakElement.status !== 'OK') {
          logger.warn('⚠️ No route found (offpeak):', offpeakElement.status)
          return null
        }
        
        const offpeakMinutes = Math.ceil(offpeakElement.duration.value / 60)
        
        // Call for peak time
        const peakTime = new Date(slotTime)
        peakTime.setHours(8, 0, 0, 0)
        if (peakTime <= new Date()) {
          peakTime.setDate(peakTime.getDate() + 1)
        }
        
        const peakUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&mode=driving&departure_time=${Math.floor(peakTime.getTime() / 1000)}&traffic_model=pessimistic&language=de&key=${googleApiKey}`
        
        const peakResponse = await $fetch<any>(peakUrl)
        
        let peakMinutes = offpeakMinutes
        if (peakResponse.status === 'OK' && peakResponse.rows?.[0]?.elements?.[0]?.status === 'OK') {
          const peakElement = peakResponse.rows[0].elements[0]
          if (peakElement.duration_in_traffic) {
            peakMinutes = Math.ceil(peakElement.duration_in_traffic.value / 60)
          }
        }
        
        logger.debug(`✅ Google Distance API results: offpeak=${offpeakMinutes} min, peak=${peakMinutes} min`)
        
        // NEW: Save to database cache so we don't need to call Google API again
        logger.debug(`💾 Saving travel time to database cache: ${fromPostalCode} -> ${toPostalCode}`)
        const { error: cacheError } = await this.supabase
          .from('plz_distance_cache')
          .upsert({
            from_plz: fromPostalCode,
            to_plz: toPostalCode,
            driving_time_minutes: offpeakMinutes,
            driving_time_minutes_offpeak: offpeakMinutes,
            driving_time_minutes_peak: peakMinutes,
            distance_km: Math.round(offpeakElement.distance.value / 1000),
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'from_plz,to_plz'
          })
        
        if (cacheError) {
          logger.warn('⚠️ Error saving to cache:', cacheError)
        } else {
          logger.debug(`✅ Saved to cache: ${fromPostalCode} -> ${toPostalCode}`)
        }
        
        // Return the appropriate time (peak or offpeak)
        const hour = slotTime.getHours()
        const day = slotTime.getDay()
        const isWeekday = day !== 0 && day !== 6
        const isPeakTime = isWeekday && ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19))
        
        return isPeakTime ? peakMinutes : offpeakMinutes
      } catch (apiErr: any) {
        logger.warn(`⚠️ Error calling Google Distance API: ${apiErr.message || apiErr}`)
        return null
      }
    } catch (err: any) {
      logger.warn('⚠️ Error getting travel time:', err.message)
      return null
    }
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
      logger.warn('⚠️ No slots to write')
      return 0
    }

    try {
      // CLEAN SLATE: Delete ALL availability slots for this tenant/staff and recalculate from scratch
      // This is much simpler and more reliable than trying to delete specific ranges
      logger.debug('🗑️ Deleting ALL existing slots for recalculation (clean slate approach)...')
      
      let deleteAllQuery = this.supabase.from('availability_slots').delete()

      if (tenantId) {
        deleteAllQuery = deleteAllQuery.eq('tenant_id', tenantId)
      }
      if (staffId) {
        deleteAllQuery = deleteAllQuery.eq('staff_id', staffId)
      }

      const { error: deleteAllError, count: deletedCount } = await deleteAllQuery

      if (deleteAllError) {
        logger.error('❌ Error deleting all slots:', deleteAllError)
        throw deleteAllError
      }
      
      logger.debug(`✅ Deleted ${deletedCount || 0} existing slots - recalculating from scratch`)

      // Insert new slots in batches (Supabase limit: 1000 rows per insert)
      const batchSize = 1000
      let insertedCount = 0

      for (let i = 0; i < slots.length; i += batchSize) {
        const batch = slots.slice(i, i + batchSize)

        const { error: insertError } = await this.supabase
          .from('availability_slots')
          .insert(batch)

        if (insertError) {
          logger.error('❌ Error inserting batch:', insertError)
          throw insertError
        }

        insertedCount += batch.length
      }

      logger.debug('✅ Slots written to database:', insertedCount)
      return insertedCount

    } catch (error: any) {
      logger.error('❌ Error writing slots:', error)
      throw error
    }
  }

  /**
   * Get day of week (1=Monday, 7=Sunday)
   */
  private getDayOfWeek(date: Date): number {
    const day = date.getDay()
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

