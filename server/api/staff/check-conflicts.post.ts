import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

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

    const body = await readBody(event)
    const { staffId, date, startTime, endTime, excludeAppointmentId } = body

    if (!staffId || !date || !startTime || !endTime) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters'
      })
    }

    // Convert time to ISO format for database query
    const startDateTime = `${date}T${startTime}:00`
    const endDateTime = `${date}T${endTime}:00`
    
    logger.debug('🔍 Checking availability for staff:', staffId, 'at', startDateTime, 'to', endDateTime)
    
    const supabase = getSupabaseAdmin()

    // Check for appointment conflicts using simple time range comparison
    const { data: conflictingAppointments, error: dbError } = await supabase
      .from('appointments')
      .select('id, start_time, end_time, title, status')
      .eq('staff_id', staffId)
      .eq('status', 'scheduled')
      .is('deleted_at', null)
      .or(`start_time.lt.${endDateTime},end_time.gt.${startDateTime}`)
    
    if (dbError) {
      logger.error('Error checking availability:', dbError)
      throw dbError
    }
    
    // Filter out current appointment if editing
    const actualConflicts = conflictingAppointments?.filter(apt => apt.id !== excludeAppointmentId) || []
    
    const isAvailable = actualConflicts.length === 0
    
    if (!isAvailable) {
      logger.debug('🚫 Staff', staffId, 'is busy at this time, conflicts:', actualConflicts.length)
    } else {
      logger.debug('✅ Staff', staffId, 'is available at this time')
    }
    
    return {
      isAvailable,
      conflicts: actualConflicts.map(apt => ({
        id: apt.id,
        start: apt.start_time,
        end: apt.end_time,
        title: apt.title
      }))
    }

  } catch (error: any) {
    logger.error('Error in checkStaffAvailability:', error)
    throw error
  }
})
