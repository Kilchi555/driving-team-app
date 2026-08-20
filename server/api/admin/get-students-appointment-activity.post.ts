import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { fetchStudentAppointmentActivity } from '~/server/utils/student-appointment-activity-db'

const MAX_STUDENT_IDS = 3000

function uniqueStudentIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const ids = new Set<string>()
  for (const value of raw) {
    if (typeof value === 'string' && value.trim()) ids.add(value.trim())
  }
  return [...ids]
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthUserFromRequest(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const studentIds = uniqueStudentIds(body?.studentIds)
  if (studentIds.length > MAX_STUDENT_IDS) {
    throw createError({ statusCode: 400, statusMessage: 'Too many student IDs' })
  }

  const supabase = getSupabaseAdmin()
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (profileError || !userProfile) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  if (!['staff', 'admin', 'tenant_admin', 'super_admin'].includes(userProfile.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  if (!studentIds.length) {
    return { success: true, data: {} }
  }

  try {
    return {
      success: true,
      data: await fetchStudentAppointmentActivity(supabase, userProfile.tenant_id, studentIds)
    }
  } catch (error: any) {
    logger.error('❌ get-students-appointment-activity:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch appointment activity'
    })
  }
})
