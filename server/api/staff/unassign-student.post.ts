import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * POST /api/staff/unassign-student
 *
 * Removes the calling staff member from a student's assigned_staff_ids array.
 * Also clears assigned_staff_id if it matches the calling staff member.
 * Historical appointment data (staff_id on appointments) is preserved.
 *
 * Body: { user_id: string }
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: caller, error: callerError } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (callerError || !caller) throw createError({ statusCode: 401, message: 'User not found' })
  if (!['staff', 'admin'].includes(caller.role)) throw createError({ statusCode: 403, message: 'Forbidden' })

  const { user_id } = await readBody(event)
  if (!user_id) throw createError({ statusCode: 400, message: 'user_id is required' })

  // Load current student data
  const { data: student, error: studentError } = await supabase
    .from('users')
    .select('id, assigned_staff_id, assigned_staff_ids, tenant_id')
    .eq('id', user_id)
    .eq('tenant_id', caller.tenant_id)
    .single()

  if (studentError || !student) throw createError({ statusCode: 404, message: 'Student not found' })

  const currentIds: string[] = student.assigned_staff_ids || []
  const newIds = currentIds.filter((id: string) => id !== caller.id)
  const newPrimaryId = student.assigned_staff_id === caller.id ? null : student.assigned_staff_id

  const { error: updateError } = await supabase
    .from('users')
    .update({
      assigned_staff_ids: newIds,
      assigned_staff_id: newPrimaryId
    })
    .eq('id', user_id)
    .eq('tenant_id', caller.tenant_id)

  if (updateError) {
    logger.error('❌ Error unassigning student:', updateError)
    throw createError({ statusCode: 500, message: 'Failed to unassign student' })
  }

  logger.debug('✅ Staff unassigned from student:', { staffId: caller.id, studentId: user_id })
  return { success: true }
})
