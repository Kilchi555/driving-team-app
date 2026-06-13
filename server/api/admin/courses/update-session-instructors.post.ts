// server/api/admin/courses/update-session-instructors.post.ts
// ============================================================
// Updates instructor fields on existing course sessions.
// On change: deletes old staff appointments, creates new ones,
// sends "assigned" / "removed" emails.
// Used for SARI-managed courses and any course where sessions
// must not be deleted/recreated (preserves sari_session_id etc.).
//
// Body:
//   courseId:  string  (UUID of the course)
//   sessions:  Array of {
//     id:                        string  (course_session UUID, required)
//     instructor_type:           'internal' | 'external' | null
//     staff_id:                  string | null
//     external_instructor_name:  string | null
//     external_instructor_email: string | null
//     external_instructor_phone: string | null
//   }
// ============================================================

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import {
  deleteStaffCourseAppointments,
  createStaffCourseAppointments,
  notifyStaffAssigned,
  notifyStaffRemoved,
} from '~/server/utils/course-staff-notifications'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { courseId, sessions } = body as { courseId: string; sessions: any[] }

  if (!sessions || sessions.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'sessions array is required' })
  }

  const supabase = getSupabaseAdmin()

  // Load course for notification context
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('id, name, tenant_id, category, course_category:course_categories(name, icon)')
    .eq('id', courseId || '')
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  // Track external sessions missing emails so we can warn the admin
  const missingEmailWarnings: string[] = []

  let updated = 0

  for (const session of sessions) {
    if (!session.id) continue

    // Load existing session to detect staff changes
    const { data: existing } = await supabase
      .from('course_sessions')
      .select('id, start_time, end_time, description, instructor_type, staff_id, external_instructor_name, external_instructor_email')
      .eq('id', session.id)
      .eq('tenant_id', profile.tenant_id)
      .single()

    if (!existing) continue

    const newType   = session.instructor_type || null
    const newStaff  = newType === 'internal' ? (session.staff_id || null) : null
    const oldStaff  = existing.instructor_type === 'internal' ? existing.staff_id : null

    const staffChanged   = oldStaff !== newStaff
    const typeChanged    = existing.instructor_type !== newType

    // ── External staff: warn if email missing ─────────────────────────
    if (newType === 'external' && !session.external_instructor_email) {
      const name = session.external_instructor_name || 'Externer Instruktor'
      missingEmailWarnings.push(name)
    }

    // ── Update DB ─────────────────────────────────────────────────────
    const { error } = await supabase
      .from('course_sessions')
      .update({
        instructor_type:            newType,
        staff_id:                   newStaff,
        external_instructor_name:   newType === 'external' ? (session.external_instructor_name || null) : null,
        external_instructor_email:  newType === 'external' ? (session.external_instructor_email || null) : null,
        external_instructor_phone:  newType === 'external' ? (session.external_instructor_phone || null) : null,
        // Reset notification flag when staff changes so they get re-notified
        ...(staffChanged || typeChanged ? { staff_notified_at: null, external_instructor_notified_at: null } : {}),
      })
      .eq('id', session.id)
      .eq('tenant_id', profile.tenant_id)

    if (error) {
      logger.error(`❌ Failed to update instructor for session ${session.id}:`, error)
      throw createError({ statusCode: 500, statusMessage: error.message })
    }

    updated++

    // ── Appointment + notification management ─────────────────────────
    if (!course) continue
    const sessionData = {
      id: existing.id,
      start_time:  existing.start_time,
      end_time:    existing.end_time,
      description: existing.description,
      instructor_type: newType as any,
      staff_id: newStaff,
    }

    if (staffChanged) {
      // Remove old staff appointments & notify removal
      if (oldStaff) {
        await deleteStaffCourseAppointments(supabase, oldStaff, course.id)
        // Load all remaining sessions for this staff to determine correct removal context
        await notifyStaffRemoved(supabase, oldStaff, course as any, [sessionData])
      }

      // Create new staff appointments & notify new assignment
      if (newStaff) {
        // Load ALL sessions in this course assigned to the new staff (after update)
        const { data: allStaffSessions } = await supabase
          .from('course_sessions')
          .select('id, start_time, end_time, description')
          .eq('course_id', course.id)
          .eq('staff_id', newStaff)

        if (allStaffSessions?.length) {
          await createStaffCourseAppointments(supabase, newStaff, course as any, allStaffSessions)
          await notifyStaffAssigned(supabase, newStaff, course as any, allStaffSessions)

          // Mark sessions as notified
          await supabase
            .from('course_sessions')
            .update({ staff_notified_at: new Date().toISOString() })
            .in('id', allStaffSessions.map((s) => s.id))
        }
      }
    }
  }

  logger.debug(`✅ Updated instructor fields for ${updated} sessions`)

  return {
    success: true,
    updated,
    warnings: missingEmailWarnings.length > 0
      ? missingEmailWarnings.map((name) => `Bitte E-Mail für externen Instruktor "${name}" hinterlegen, damit er eine Kalendereinladung erhält.`)
      : [],
  }
})
