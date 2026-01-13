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

      availableSlots.value = response.slots
      logger.debug('✅ Available slots fetched:', response.count)

      return response.slots

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
    options: CreateAppointmentOptions,
    authToken: string
  ): Promise<any> => {
    isLoading.value = true
    error.value = null

    try {
      logger.debug('📅 Creating appointment...', options.slot_id)

      const response = await $fetch('/api/booking/create-appointment', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`
        },
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

