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
  category?: string[]
  tenant_id: string
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
      const locations = await this.loadLocations(options.tenantId)
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
    const { data: availabilitySettings } = await this.supabase
      .from('staff_availability_settings')
      .select('staff_id, minimum_booking_lead_time_hours')
      .in('staff_id', staffIds)

    const settingsMap = new Map(availabilitySettings?.map(s => [s.staff_id, s.minimum_booking_lead_time_hours]))

    return (data || []).map(staff => ({
      ...staff,
      minimum_booking_lead_time_hours: settingsMap.get(staff.id) || 24
    }))
  }

  /**
   * Load categories
   */
  private async loadCategories(tenantId?: string): Promise<Category[]> {
    let query = this.supabase
      .from('categories')
      .select('id, code, name, lesson_duration_minutes, is_active, tenant_id')
      .eq('is_active', true)

    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data, error } = await query
    if (error) throw error

    return data || []
  }

  /**
   * Load locations
   */
  private async loadLocations(tenantId?: string): Promise<Location[]> {
    let query = this.supabase
      .from('locations')
      .select('id, name, address, location_type, is_active, staff_ids, category, tenant_id')
      .eq('is_active', true)
      .eq('location_type', 'standard')

    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data, error } = await query
    if (error) throw error

    return data || []
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
      .eq('is_active', true)

    if (error) throw error

    // If no hours found, create default hours (Mon-Fri 8-18)
    if (!data || data.length === 0) {
      const defaultHours: StaffWorkingHours[] = []
      for (const staffId of staffIds) {
        for (let day = 1; day <= 5; day++) {
          defaultHours.push({
            id: `${staffId}-${day}`,
            staff_id: staffId,
            day_of_week: day,
            start_time: '08:00',
            end_time: '18:00',
            is_active: true
          })
        }
      }
      return defaultHours
    }

    return data
  }

  /**
   * Load appointments (booked slots)
   */
  private async loadAppointments(staffIds: string[], startDate: Date, endDate: Date): Promise<Appointment[]> {
    if (staffIds.length === 0) return []

    const { data, error } = await this.supabase
      .from('appointments')
      .select('id, staff_id, location_id, start_time, end_time, duration_minutes, status, type')
      .in('staff_id', staffIds)
      .not('status', 'eq', 'deleted')
      .is('deleted_at', null)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())

    if (error) throw error

    return data || []
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

      // Get staff's categories
      const staffCategories = params.categories.filter(cat => {
        // If staff has specific category, only allow that one
        if (staff.category) {
          return staff.category === cat.code
        }
        // Otherwise allow all categories
        return true
      })

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
        const dayHours = staffHours.filter(wh => wh.day_of_week === dayOfWeek)

        if (dayHours.length === 0) {
          // No working hours for this day
          currentDate.setDate(currentDate.getDate() + 1)
          continue
        }

        // For each location
        for (const location of staffLocations) {
          // For each category
          for (const category of staffCategories) {
            // Check if location supports this category
            if (location.category && location.category.length > 0 && !location.category.includes(category.code)) {
              continue
            }

            // For each lesson duration
            for (const durationMinutes of category.lesson_duration_minutes) {
              // Generate slots for each working hour block
              for (const hours of dayHours) {
                const daySlots = this.generateDaySlots({
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

    return slots
  }

  /**
   * Generate slots for a specific day
   */
  private generateDaySlots(params: {
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
  }): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = []

    // Parse start and end time
    const [startHour, startMinute] = params.startTime.split(':').map(Number)
    const [endHour, endMinute] = params.endTime.split(':').map(Number)

    // Create start datetime
    const slotStart = new Date(params.date)
    slotStart.setHours(startHour, startMinute, 0, 0)

    // Create end datetime
    const workingEnd = new Date(params.date)
    workingEnd.setHours(endHour, endMinute, 0, 0)

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
      const isAvailable = !this.hasConflict({
        slotStart: currentSlot,
        slotEnd,
        appointments: params.appointments,
        busyTimes: params.busyTimes,
        bufferMinutes: params.bufferMinutes
      })

      slots.push({
        tenant_id: params.staff.tenant_id,
        staff_id: params.staff.id,
        location_id: params.location.id,
        start_time: currentSlot.toISOString(),
        end_time: slotEnd.toISOString(),
        duration_minutes: params.durationMinutes,
        is_available: isAvailable,
        category_code: params.category.code
      })

      // Move to next slot (15-minute increment)
      currentSlot.setMinutes(currentSlot.getMinutes() + 15)
    }

    return slots
  }

  /**
   * Check if a time slot conflicts with appointments or busy times
   */
  private hasConflict(params: {
    slotStart: Date
    slotEnd: Date
    appointments: Appointment[]
    busyTimes: ExternalBusyTime[]
    bufferMinutes: number
  }): boolean {
    const slotStartTime = params.slotStart.getTime()
    const slotEndTime = params.slotEnd.getTime()
    const bufferMs = params.bufferMinutes * 60 * 1000

    // Check appointments
    for (const apt of params.appointments) {
      const aptStart = new Date(apt.start_time).getTime()
      const aptEnd = new Date(apt.end_time).getTime()

      // Check for overlap (including buffer)
      if (
        (slotStartTime >= aptStart - bufferMs && slotStartTime < aptEnd + bufferMs) ||
        (slotEndTime > aptStart - bufferMs && slotEndTime <= aptEnd + bufferMs) ||
        (slotStartTime <= aptStart - bufferMs && slotEndTime >= aptEnd + bufferMs)
      ) {
        return true
      }
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
      // Delete existing slots for this range
      let deleteQuery = this.supabase.from('availability_slots').delete()

      if (tenantId) {
        deleteQuery = deleteQuery.eq('tenant_id', tenantId)
      }
      if (staffId) {
        deleteQuery = deleteQuery.eq('staff_id', staffId)
      }
      if (startDate) {
        deleteQuery = deleteQuery.gte('start_time', startDate.toISOString())
      }
      if (endDate) {
        deleteQuery = deleteQuery.lte('start_time', endDate.toISOString())
      }

      const { error: deleteError } = await deleteQuery

      if (deleteError) {
        logger.warn('⚠️ Could not delete old slots:', deleteError)
      }

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

