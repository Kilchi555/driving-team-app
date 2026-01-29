// composables/useStaffAvailability.ts - Migriert zu API-basierten Abfragen
import { ref, readonly } from 'vue'
import { logger } from '~/utils/logger'

export interface StaffAvailability {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  isAvailable: boolean
  availabilityStatus: 'available' | 'busy' | 'unknown'
}

export const useStaffAvailability = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Check if a staff member is available at a specific time via API
   */
  const checkStaffAvailability = async (
    staffId: string, 
    date: string, 
    startTime: string, 
    endTime: string,
    excludeAppointmentId?: string
  ): Promise<boolean> => {
    try {
      logger.debug('🔍 Checking availability via API:', staffId)
      
      const result = await $fetch('/api/staff/check-conflicts', {
        method: 'POST',
        body: {
          staffId,
          date,
          startTime,
          endTime,
          excludeAppointmentId
        }
      })

      return result.isAvailable
      
    } catch (error: any) {
      logger.error('Error in checkStaffAvailability:', error)
      return true // Assume available on error
    }
  }

  /**
   * Load all staff members with availability status for a specific time via API
   */
  const loadStaffWithAvailability = async (
    date?: string,
    startTime?: string,
    endTime?: string,
    excludeAppointmentId?: string
  ): Promise<StaffAvailability[]> => {
    if (isLoading.value) return []
    
    isLoading.value = true
    error.value = null
    
    try {
      logger.debug('👥 Loading staff members with availability...')
      
      const query: Record<string, string> = {}
      if (date) query.date = date
      if (startTime) query.startTime = startTime
      if (endTime) query.endTime = endTime
      if (excludeAppointmentId) query.excludeAppointmentId = excludeAppointmentId

      const result = await $fetch('/api/staff/availability', {
        method: 'GET',
        query
      })

      logger.debug('✅ Staff loaded with availability')
      return result.staff || []
      
    } catch (err: any) {
      logger.error('Error loading staff with availability:', err)
      error.value = err.message || 'Error loading staff'
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Check if multiple staff members are available at the same time
   */
  const checkMultipleStaffAvailability = async (
    staffIds: string[],
    date: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string
  ): Promise<Record<string, boolean>> => {
    const availabilityMap: Record<string, boolean> = {}
    
    await Promise.all(
      staffIds.map(async (staffId) => {
        const isAvailable = await checkStaffAvailability(
          staffId,
          date,
          startTime,
          endTime,
          excludeAppointmentId
        )
        availabilityMap[staffId] = isAvailable
      })
    )
    
    return availabilityMap
  }

  /**
   * Get next available time slot for a staff member
   */
  const getNextAvailableSlot = async (
    staffId: string,
    date: string,
    startTime: string,
    durationMinutes: number
  ): Promise<string | null> => {
    try {
      const startDateTime = new Date(`${date}T${startTime}:00`)
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000)
      
      const isAvailable = await checkStaffAvailability(
        staffId,
        date,
        startTime,
        endDateTime.toTimeString().slice(0, 5)
      )
      
      if (isAvailable) {
        return startTime
      }
      
      // Try next 15-minute slot
      const nextSlot = new Date(startDateTime.getTime() + 15 * 60000)
      const nextTime = nextSlot.toTimeString().slice(0, 5)
      
      return await getNextAvailableSlot(staffId, date, nextTime, durationMinutes)
      
    } catch (error: any) {
      logger.error('Error getting next available slot:', error)
      return null
    }
  }

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Functions
    checkStaffAvailability,
    loadStaffWithAvailability,
    checkMultipleStaffAvailability,
    getNextAvailableSlot
  }
}
