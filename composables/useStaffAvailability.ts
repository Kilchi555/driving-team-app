// composables/useStaffAvailability.ts
import { ref, readonly } from 'vue'
import { getSupabase } from '~/utils/supabase'

export interface StaffAvailability {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  tenant_id: string  // ✅ Added for debugging
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
      
      console.log('🔍 Checking availability for staff:', staffId, 'at', startDateTime, 'to', endDateTime)
      
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
        console.log('🚫 Staff', staffId, 'is busy at this time:', {
          conflicts: actualConflicts.length,
          conflictingAppointments: actualConflicts.map(apt => ({
            id: apt.id,
            start: apt.start,
            end: apt.end,
            title: apt.title
          }))
        })
      } else {
        console.log('✅ Staff', staffId, 'is available at this time')
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
      console.log('👥 Loading staff members with availability...')

      // ✅ Get current user's tenant_id first
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
        .single()
      
      const tenantId = userProfile?.tenant_id
      if (!tenantId) {
        throw new Error('User has no tenant assigned')
      }

      console.log('🔍 useStaffAvailability - Current tenant_id:', tenantId)
      
      // Load basic staff information - FILTERED BY TENANT
      const { data: allStaff, error: staffError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, tenant_id')  // Added tenant_id to select
        .eq('role', 'staff')
        .eq('is_active', true)
        .eq('tenant_id', tenantId)  // ✅ TENANT FILTER ADDED
        .order('first_name')

      console.log('🔍 useStaffAvailability Debug:', {
        expectedTenantId: tenantId,
        staffFound: allStaff?.map(s => ({
          name: `${s.first_name} ${s.last_name}`,
          tenant_id: s.tenant_id,
          matches: s.tenant_id === tenantId
        }))
      })
      
      if (staffError) throw staffError
      
      // If we have time information, check availability
      if (date && startTime && endTime) {
        console.log('📅 Checking staff availability for:', { date, startTime, endTime })
        
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
        
        console.log('✅ Staff loaded with availability:', {
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
        
        console.log('✅ All staff loaded (no time info available):', staffWithUnknownStatus.length, 'members')
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
