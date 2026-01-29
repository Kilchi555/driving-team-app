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
    const { staffId } = body

    if (!staffId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing staffId'
      })
    }

    const supabase = getSupabaseAdmin()

    logger.debug('🔄 Looking for unassigned students for staff:', staffId)

    // 1. Find all unassigned students
    const { data: unassignedStudents, error: studentsError } = await supabase
      .from('users')
      .select('id, first_name, last_name, assigned_staff_ids')
      .eq('role', 'client')
      .or('assigned_staff_ids.is.null,assigned_staff_ids.eq.{}')

    if (studentsError || !unassignedStudents) {
      logger.debug('No unassigned students found')
      return { assignments: [] }
    }

    logger.debug(`📊 ${unassignedStudents.length} unassigned students found`)

    const assignments = []

    // 2. For each student, check if they have appointments with this staff
    for (const student of unassignedStudents) {
      const { count, error: countError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', student.id)
        .eq('staff_id', staffId)
        .is('deleted_at', null)

      if (countError) continue

      // Assign if at least 1 appointment exists
      if ((count || 0) >= 1) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ assigned_staff_ids: [staffId] })
          .eq('id', student.id)

        if (!updateError) {
          assignments.push({
            studentId: student.id,
            studentName: `${student.first_name} ${student.last_name}`,
            appointmentCount: count
          })
          logger.debug(`✅ Assigned: ${student.first_name} ${student.last_name}`)
        }
      }
    }

    logger.debug(`✅ ${assignments.length} students auto-assigned`)
    return { assignments }

  } catch (error: any) {
    logger.error('Error during bulk assignment:', error)
    throw error
  }
})
