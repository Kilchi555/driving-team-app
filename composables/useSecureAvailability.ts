/**
 * Composable: Use Secure Availability
 * 
 * PURPOSE:
 * Replaces useAvailabilitySystem with secure API-based slot fetching.
 * No direct database queries - only API calls.
 * 
 * SECURITY:
 * - All data fetching through secure APIs
 * - No sensitive data exposed
 * - Race-condition-safe booking
 * 
 * USAGE:
 * const {
 *   availableSlots,
 *   isLoading,
 *   error,
 *   fetchAvailableSlots,
 *   reserveSlot,
 *   createAppointment
 * } = useSecureAvailability()
 */

import { ref } from 'vue'
import { logger } from '~/utils/logger'

interface AvailableSlot {
  id: string
  staff_id: string
  staff_name: string
  location_id: string
  location_name: string
  start_time: string
  end_time: string
  duration_minutes: number
  category_code: string
}

interface FetchSlotsOptions {
  tenant_id: string
  staff_id?: string
  location_id?: string
  start_date: string // YYYY-MM-DD
  end_date: string // YYYY-MM-DD
  duration_minutes?: number
  category_code?: string
}

interface ReserveSlotOptions {
  slot_id: string
  session_id: string
}

interface CreateAppointmentOptions {
  slot_id: string
  session_id: string
  appointment_type: string
  category_code: string
  notes?: string
}

export const useSecureAvailability = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const availableSlots = ref<AvailableSlot[]>([])
  const staffLocations = ref<any[]>([]) // Cache staff_locations for filtering

  /**
   * Filter slots by online bookable status (frontend security layer)
   * Loads staff_locations and filters out slots where is_online_bookable = false
   */
  const filterSlotsByOnlineBookable = async (slots: AvailableSlot[], staffId: string): Promise<AvailableSlot[]> => {
    try {
      // Get unique staff IDs from slots
      const slotStaffIds = [...new Set(slots.map(s => s.staff_id))]
      
      if (slotStaffIds.length === 0) return slots

      logger.debug('🔒 Frontend filtering: Loading staff_locations for online bookable check', {
        staffIds: slotStaffIds,
        totalSlots: slots.length
      })

      // Try to load staff_locations with is_online_bookable status
      let staffLocations: Array<{
        staff_id: string
        location_id: string
        is_online_bookable: boolean
      }> = []

      try {
        const response = await $fetch<{
          success: boolean
          data: Array<{
            staff_id: string
            location_id: string
            is_online_bookable: boolean
          }>
        }>('/api/staff/get-staff-locations', {
          method: 'POST',
          body: { staff_ids: slotStaffIds }
        })

        if (response?.success && response.data) {
          staffLocations = response.data
          logger.debug('✅ Loaded staff_locations from API', {
            entries: staffLocations.length
          })
        }
      } catch (apiErr: any) {
        logger.warn('⚠️ Could not load staff_locations from API:', apiErr.message)
        logger.debug('ℹ️ Will continue without frontend filtering - backend filtering should handle it')
      }

      if (staffLocations.length === 0) {
        logger.debug('ℹ️ No staff_locations to filter - returning all slots')
        return slots
      }

      // Create a map for quick lookup: staff_id -> location_id -> is_online_bookable
      const staffLocMap = new Map<string, Map<string, boolean>>()
      for (const sl of staffLocations) {
        if (!staffLocMap.has(sl.staff_id)) {
          staffLocMap.set(sl.staff_id, new Map())
        }
        staffLocMap.get(sl.staff_id)!.set(sl.location_id, sl.is_online_bookable)
      }

      logger.debug('🔍 Filtering slots based on staff_locations', {
        uniqueStaffLocations: staffLocMap.size,
        totalSlots: slots.length
      })

      // Filter slots
      const filteredSlots = slots.filter(slot => {
        const locationMap = staffLocMap.get(slot.staff_id)
        if (locationMap) {
          const isOnlineBookable = locationMap.get(slot.location_id)
          logger.debug(`  Checking: staff=${slot.staff_id.substring(0, 8)}, loc=${slot.location_id.substring(0, 8)}, is_online_bookable=${isOnlineBookable}`)
          
          // If explicitly set to false, filter out
          if (isOnlineBookable === false) {
            logger.debug(`    ❌ FILTERED OUT: is_online_bookable=false`)
            return false
          }
          if (isOnlineBookable === true) {
            logger.debug(`    ✅ KEEPING: is_online_bookable=true`)
            return true
          }
        }
        logger.debug(`    ✅ KEEPING: no staff_locations entry (default=true)`)
        return true
      })

      logger.debug('🔒 Frontend filtering complete', {
        before: slots.length,
        after: filteredSlots.length,
        filtered_out: slots.length - filteredSlots.length
      })

      return filteredSlots
    } catch (err: any) {
      logger.warn('⚠️ Frontend filtering failed, returning unfiltered slots:', err.message)
      logger.debug('ℹ️ Stack:', err.stack)
      return slots // Return unfiltered slots if filtering fails
    }
  }

  /**
   * Fetch available slots from backend API
   */
  const fetchAvailableSlots = async (options: FetchSlotsOptions): Promise<AvailableSlot[]> => {
    isLoading.value = true
    error.value = null

    try {
      logger.debug('🔍 Fetching available slots via API...', options)

      const params = new URLSearchParams()
      params.append('tenant_id', options.tenant_id)
      params.append('start_date', options.start_date)
      params.append('end_date', options.end_date)

      if (options.staff_id) params.append('staff_id', options.staff_id)
      if (options.location_id) params.append('location_id', options.location_id)
      if (options.duration_minutes) params.append('duration_minutes', options.duration_minutes.toString())
      if (options.category_code) params.append('category_code', options.category_code)

      const response = await $fetch<{ success: boolean; slots: AvailableSlot[]; count: number }>(
        `/api/booking/get-available-slots?${params.toString()}`
      )

      if (!response.success) {
        throw new Error('Failed to fetch available slots')
      }

      let slots = response.slots
      logger.debug('✅ Available slots fetched from API:', slots.length)

      // 🔒 FRONTEND FILTERING: Additional security layer
      // Filter slots based on staff_locations is_online_bookable status
      if (slots.length > 0) {
        slots = await filterSlotsByOnlineBookable(slots, options.staff_id || '')
      }

      availableSlots.value = slots
      logger.debug('✅ Available slots after frontend filtering:', slots.length)

      return slots

    } catch (err: any) {
      logger.error('❌ Error fetching available slots:', err)
      error.value = err.message || 'Failed to fetch available slots'
      throw err

    } finally {
      isLoading.value = false
    }
  }

  /**
   * Reserve a slot temporarily (10 minutes)
   */
  const reserveSlot = async (options: ReserveSlotOptions): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      logger.debug('🔒 Reserving slot...', options.slot_id)

      const response = await $fetch('/api/booking/reserve-slot', {
        method: 'POST',
        body: {
          slot_id: options.slot_id,
          session_id: options.session_id
        }
      })

      logger.debug('✅ Slot reserved successfully')
      return response

    } catch (err: any) {
      logger.error('❌ Error reserving slot:', err)
      error.value = err.statusMessage || err.message || 'Failed to reserve slot'
      throw err

    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create appointment (after slot reservation)
   */
  const createAppointment = async (
    options: CreateAppointmentOptions
  ): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      logger.debug('📅 Creating appointment...', options.slot_id)

      const response = await $fetch('/api/booking/create-appointment', {
        method: 'POST',
        body: {
          slot_id: options.slot_id,
          session_id: options.session_id,
          appointment_type: options.appointment_type,
          category_code: options.category_code,
          notes: options.notes
        }
      })

      logger.debug('✅ Appointment created successfully')
      return response

    } catch (err: any) {
      logger.error('❌ Error creating appointment:', err)
      error.value = err.statusMessage || err.message || 'Failed to create appointment'
      throw err

    } finally {
      isLoading.value = false
    }
  }

  /**
   * Group slots by date for calendar display
   */
  const groupSlotsByDate = (slots: AvailableSlot[]): Record<string, AvailableSlot[]> => {
    const grouped: Record<string, AvailableSlot[]> = {}

    for (const slot of slots) {
      const date = slot.start_time.split('T')[0] // Extract YYYY-MM-DD

      if (!grouped[date]) {
        grouped[date] = []
      }

      grouped[date].push(slot)
    }

    return grouped
  }

  /**
   * Group slots by staff
   */
  const groupSlotsByStaff = (slots: AvailableSlot[]): Record<string, AvailableSlot[]> => {
    const grouped: Record<string, AvailableSlot[]> = {}

    for (const slot of slots) {
      if (!grouped[slot.staff_id]) {
        grouped[slot.staff_id] = []
      }

      grouped[slot.staff_id].push(slot)
    }

    return grouped
  }

  /**
   * Group slots by location
   */
  const groupSlotsByLocation = (slots: AvailableSlot[]): Record<string, AvailableSlot[]> => {
    const grouped: Record<string, AvailableSlot[]> = {}

    for (const slot of slots) {
      if (!grouped[slot.location_id]) {
        grouped[slot.location_id] = []
      }

      grouped[slot.location_id].push(slot)
    }

    return grouped
  }

  /**
   * Filter slots by staff
   */
  const filterSlotsByStaff = (slots: AvailableSlot[], staffId: string): AvailableSlot[] => {
    return slots.filter(slot => slot.staff_id === staffId)
  }

  /**
   * Filter slots by location
   */
  const filterSlotsByLocation = (slots: AvailableSlot[], locationId: string): AvailableSlot[] => {
    return slots.filter(slot => slot.location_id === locationId)
  }

  /**
   * Filter slots by duration
   */
  const filterSlotsByDuration = (slots: AvailableSlot[], duration: number): AvailableSlot[] => {
    return slots.filter(slot => slot.duration_minutes === duration)
  }

  /**
   * Generate session ID for slot reservation
   */
  const generateSessionId = (): string => {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  return {
    // State
    isLoading,
    error,
    availableSlots,

    // Methods
    fetchAvailableSlots,
    reserveSlot,
    createAppointment,

    // Helpers
    groupSlotsByDate,
    groupSlotsByStaff,
    groupSlotsByLocation,
    filterSlotsByStaff,
    filterSlotsByLocation,
    filterSlotsByDuration,
    generateSessionId
  }
}

