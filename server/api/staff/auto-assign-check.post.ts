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
    const { userId, staffId } = body

    if (!userId || !staffId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required parameters'
      })
    }

    const supabase = getSupabaseAdmin()

    logger.debug('🔍 Checking first appointment assignment for student:', userId)

    // 1. Check if student already has assigned_staff
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, assigned_staff_ids, first_name, last_name')
      .eq('id', userId)
      .eq('role', 'client')
      .single()

    if (studentError || !student) {
      logger.debug('Student not found for auto-assignment')
      return { assigned: false, reason: 'Student not found' }
    }

    // 2. Check if staff is already in the list
    const currentStaffIds = student.assigned_staff_ids || []
    const isStaffAlreadyAssigned = currentStaffIds.includes(staffId)
    
    if (isStaffAlreadyAssigned) {
      logger.debug(`Staff already assigned for ${student.first_name} ${student.last_name}`)
      return { assigned: false, reason: 'Staff already in list' }
    }

    // 3. Count appointments with this staff
    const { count: staffSpecificCount, error: countError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('staff_id', staffId)
      .is('deleted_at', null)

    if (countError) {
      logger.error('Error counting appointments:', countError)
      return { assigned: false, reason: 'Counting error' }
    }

    logger.debug(`Appointments between student and staff: ${staffSpecificCount}`)

    // 4. Assignment logic: assign on first appointment with this staff
    if ((staffSpecificCount || 0) === 1) {
      // Add staff to array (don't replace!)
      const updatedStaffIds = [...currentStaffIds, staffId]
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ assigned_staff_ids: updatedStaffIds })
        .eq('id', userId)

      if (updateError) {
        logger.error('Error during auto-assignment:', updateError)
        return { assigned: false, reason: 'Update error', error: updateError.message }
      }

      logger.debug(`✅ Auto-assignment: ${student.first_name} ${student.last_name} - Staff added`)
      
      return {
        assigned: true,
        studentName: `${student.first_name} ${student.last_name}`,
        appointmentCount: staffSpecificCount,
        reason: 'First appointment with this staff',
        totalStaff: updatedStaffIds.length
      }
    }

    return { assigned: false, reason: `Not the first appointment with this staff (${staffSpecificCount} appointments)` }

  } catch (error: any) {
    logger.error('Error during auto-assignment check:', error)
    throw error
  }
})
