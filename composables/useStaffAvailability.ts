// composables/useStaffAvailability.ts
import { ref, readonly } from 'vue'
import { getSupabase } from '~/utils/supabase'

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
  const supabase = getSupabase()
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Check if a staff member is available at a specific time
   */
  const checkStaffAvailability = async (
    staffId: string, 
    date: string, 
    startTime: string, 
    endTime: string,
    excludeAppointmentId?: string
  ): Promise<boolean> => {
    try {
      // Convert time to ISO format for database query
      const startDateTime = `${date}T${startTime}:00`
      const endDateTime = `${date}T${endTime}:00`
      
      logger.debug('🔍 Checking availability for staff:', staffId, 'at', startDateTime, 'to', endDateTime)
      
      // Check for appointment conflicts using simple time range comparison
      const { data: conflictingAppointments, error: dbError } = await supabase
        .from('appointments')
        .select('id, start_time, end_time, title, status')
        .eq('staff_id', staffId)
        .eq('status', 'scheduled') // Only scheduled appointments, not cancelled
        .is('deleted_at', null) // ✅ Soft Delete Filter
        .or(`start_time.lt.${endDateTime},end_time.gt.${startDateTime}`) // Simple overlap check
      
      if (dbError) {
        console.error('❌ Error checking staff availability:', dbError)
        return true // Assume available on error
      }
      
      // Filter out current appointment if editing
      const actualConflicts = conflictingAppointments?.filter(apt => apt.id !== excludeAppointmentId) || []
      
      const isAvailable = actualConflicts.length === 0
      
      if (!isAvailable) {
        logger.debug('🚫 Staff', staffId, 'is busy at this time:', {
          conflicts: actualConflicts.length,
          conflictingAppointments: actualConflicts.map(apt => ({
            id: apt.id,
            start: apt.start,
            end: apt.end,
            title: apt.title
          }))
        })
      } else {
        logger.debug('✅ Staff', staffId, 'is available at this time')
      }
      
      return isAvailable
      
    } catch (error) {
      console.error('❌ Error in checkStaffAvailability:', error)
      return true // Assume available on error
    }
  }

  /**
   * Load all staff members with availability status for a specific time
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
      
      // Load basic staff information
      const { data: allStaff, error: staffError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .eq('role', 'staff')
        .eq('is_active', true)
        .order('first_name')
      
      if (staffError) throw staffError
      
      // If we have time information, check availability
      if (date && startTime && endTime) {
        logger.debug('📅 Checking staff availability for:', { date, startTime, endTime })
        
        const staffWithAvailability = await Promise.all(
          allStaff.map(async (staff) => {
            const isAvailable = await checkStaffAvailability(
              staff.id,
              date,
              startTime,
              endTime,
              excludeAppointmentId
            )
            
            return {
              ...staff,
              isAvailable,
              availabilityStatus: isAvailable ? 'available' : 'busy'
            }
          })
        )
        
        // Sort: available first, then busy
        const sortedStaff = staffWithAvailability.sort((a, b) => {
          if (a.isAvailable && !b.isAvailable) return -1
          if (!a.isAvailable && b.isAvailable) return 1
          return a.first_name.localeCompare(b.first_name)
        })
        
        logger.debug('✅ Staff loaded with availability:', {
          total: sortedStaff.length,
          available: sortedStaff.filter(s => s.isAvailable).length,
          busy: sortedStaff.filter(s => !s.isAvailable).length
        })
        
        return sortedStaff
        
      } else {
        // No time information available - show all staff
        const staffWithUnknownStatus = allStaff.map(staff => ({
          ...staff,
          isAvailable: true,
          availabilityStatus: 'unknown' as const
        }))
        
        logger.debug('✅ All staff loaded (no time info available):', staffWithUnknownStatus.length, 'members')
        return staffWithUnknownStatus
      }
      
    } catch (err: any) {
      console.error('❌ Error loading staff with availability:', err)
      error.value = err.message || 'Fehler beim Laden der Fahrlehrer'
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
      // This is a simplified version - you might want to implement more sophisticated logic
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
      
    } catch (error) {
      console.error('❌ Error getting next available slot:', error)
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
