// server/api/admin/courses/update-session-instructors.post.ts
// ============================================================
// Updates only the instructor fields on existing course sessions.
// Used for SARI-managed courses where sessions must not be
// deleted/recreated (that would lose sari_session_id etc.).
//
// Body:
//   sessions: Array of {
//     id:                       string  (course_session UUID, required)
//     instructor_type:          'internal' | 'external' | null
//     staff_id:                 string | null
//     external_instructor_name: string | null
//     external_instructor_email:string | null
//   }
// ============================================================

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { sessions } = body as { sessions: any[] }

  if (!sessions || sessions.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'sessions array is required' })
  }

  const supabase = getSupabaseAdmin()
  let updated = 0

  for (const session of sessions) {
    if (!session.id) continue

    const instructorType = session.instructor_type || null

    const { error } = await supabase
      .from('course_sessions')
      .update({
        instructor_type:           instructorType,
        staff_id:                  instructorType === 'internal' ? (session.staff_id || null) : null,
        external_instructor_name:  instructorType === 'external' ? (session.external_instructor_name || null) : null,
        external_instructor_email: instructorType === 'external' ? (session.external_instructor_email || null) : null,
        external_instructor_phone: null,
      })
      .eq('id', session.id)
      .eq('tenant_id', profile.tenant_id)

    if (error) {
      logger.error(`❌ Failed to update instructor for session ${session.id}:`, error)
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    updated++
  }

  logger.debug(`✅ Updated instructor fields for ${updated} sessions`)
  return { success: true, updated }
})
