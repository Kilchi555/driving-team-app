import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import logger from '~/utils/logger'

/**
 * POST /api/staff/assign-student
 *
 * Adds the calling staff member to a student's assigned_staff_ids array.
 * Also sets assigned_staff_id if it was previously empty.
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

  const { data: student, error: studentError } = await supabase
    .from('users')
    .select('id, assigned_staff_id, assigned_staff_ids, tenant_id')
    .eq('id', user_id)
    .eq('tenant_id', caller.tenant_id)
    .single()

  if (studentError || !student) throw createError({ statusCode: 404, message: 'Student not found' })

  const currentIds: string[] = student.assigned_staff_ids || []
  if (currentIds.includes(caller.id)) {
    return { success: true, alreadyAssigned: true }
  }

  const newIds = [...currentIds, caller.id]
  const newPrimaryId = student.assigned_staff_id || caller.id

  const { error: updateError } = await supabase
    .from('users')
    .update({
      assigned_staff_ids: newIds,
      assigned_staff_id: newPrimaryId,
    })
    .eq('id', user_id)
    .eq('tenant_id', caller.tenant_id)

  if (updateError) {
    logger.error('❌ Error assigning student:', updateError)
    throw createError({ statusCode: 500, message: 'Failed to assign student' })
  }

  logger.debug('✅ Staff assigned to student:', { staffId: caller.id, studentId: user_id })
  return { success: true }
})
