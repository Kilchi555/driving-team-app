import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
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

export default defineEventHandler(async (event) => {
  try {
    // Verify auth
    const user = await getAuthenticatedUserWithDbId(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Not authenticated'
      })
    }

    const query = getQuery(event)
    const date = query.date as string | undefined
    const startTime = query.startTime as string | undefined
    const endTime = query.endTime as string | undefined
    const excludeAppointmentId = query.excludeAppointmentId as string | undefined

    const supabase = getSupabaseAdmin()

    logger.debug('👥 Loading staff members...')
    
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
      
      const startDateTime = `${date}T${startTime}:00`
      const endDateTime = `${date}T${endTime}:00`
      
      // Get all conflicting appointments in one query
      const { data: allConflicts, error: conflictError } = await supabase
        .from('appointments')
        .select('staff_id, id')
        .eq('status', 'scheduled')
        .is('deleted_at', null)
        .or(`start_time.lt.${endDateTime},end_time.gt.${startDateTime}`)
      
      if (conflictError) throw conflictError

      // Build set of busy staff
      const busyStaffIds = new Set(
        allConflicts
          ?.filter(apt => apt.id !== excludeAppointmentId)
          .map(apt => apt.staff_id) || []
      )

      const staffWithAvailability: StaffAvailability[] = allStaff.map(staff => ({
        ...staff,
        isAvailable: !busyStaffIds.has(staff.id),
        availabilityStatus: busyStaffIds.has(staff.id) ? 'busy' : 'available'
      }))
      
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
      
      return { staff: sortedStaff }
      
    } else {
      // No time information available - show all staff with unknown status
      const staffWithUnknownStatus: StaffAvailability[] = allStaff.map(staff => ({
        ...staff,
        isAvailable: true,
        availabilityStatus: 'unknown'
      }))
      
      logger.debug('✅ All staff loaded (no time info available):', staffWithUnknownStatus.length, 'members')
      return { staff: staffWithUnknownStatus }
    }

  } catch (error: any) {
    logger.error('Error loading staff with availability:', error)
    throw error
  }
})
