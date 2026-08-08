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

    // ✅ ROLE CHECK — only staff/admin may bulk-assign students
    if (!['admin', 'staff', 'super_admin', 'tenant_admin'].includes(user.role || '')) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions – staff or admin role required'
      })
    }

    if (!user.tenant_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden – no tenant assigned'
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

    // Target staff must belong to caller's tenant (prevents cross-tenant assignment)
    const { data: targetStaff, error: staffError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('id', staffId)
      .eq('tenant_id', user.tenant_id)
      .single()

    if (staffError || !targetStaff) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Staff not found in your tenant'
      })
    }

    if (!['admin', 'staff', 'super_admin', 'tenant_admin'].includes(targetStaff.role || '')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'staffId must refer to a staff/admin user'
      })
    }

    logger.debug('🔄 Looking for unassigned students for staff:', staffId)

    // 1. Find all unassigned students in caller's tenant
    const { data: unassignedStudents, error: studentsError } = await supabase
      .from('users')
      .select('id, first_name, last_name, assigned_staff_ids')
      .eq('role', 'client')
      .eq('tenant_id', user.tenant_id)
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
        .eq('tenant_id', user.tenant_id)
        .is('deleted_at', null)

      if (countError) continue

      // Assign if at least 1 appointment exists
      if ((count || 0) >= 1) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ assigned_staff_ids: [staffId] })
          .eq('id', student.id)
          .eq('tenant_id', user.tenant_id)

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
