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
  sendExternalInstructorInvite,
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
  // Accumulate external instructor sessions to send ICS after the loop
  const extInviteMap = new Map<string, any[]>()
  // Accumulate staff changes to notify ONCE after all DB updates are done
  const removedStaff = new Map<string, any[]>() // staffId → sessions removed from
  const addedStaff   = new Set<string>()         // staffId → to notify/appoint after loop

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
    const oldExtEmail = existing.instructor_type === 'external' ? existing.external_instructor_email : null
    const newExtEmail = newType === 'external' ? (session.external_instructor_email || null) : null

    const staffChanged   = oldStaff !== newStaff
    const typeChanged    = existing.instructor_type !== newType
    // External email added or changed → resend invite
    const extEmailChanged = newType === 'external' && newExtEmail && newExtEmail !== oldExtEmail

    // ── External staff: warn if email missing ─────────────────────────
    if (newType === 'external' && !newExtEmail) {
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
        allow_individual_booking:   session.allow_individual_booking ?? false,
        individual_price_rappen:    session.allow_individual_booking ? Math.round((session.individual_price ?? 0) * 100) : 0,
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

    if (!course) continue

    const sessionData = {
      id: existing.id,
      start_time:  existing.start_time,
      end_time:    existing.end_time,
      description: existing.description,
      instructor_type: newType as any,
      staff_id: newStaff,
      external_instructor_name:  session.external_instructor_name || null,
      external_instructor_email: newExtEmail,
    }

    // ── External instructor: accumulate ICS sessions after loop ───────
    if (extEmailChanged) {
      if (!extInviteMap.has(newExtEmail!)) extInviteMap.set(newExtEmail!, [])
      extInviteMap.get(newExtEmail!)!.push({
        ...sessionData,
        external_instructor_name: session.external_instructor_name || '',
      })
    }

    // ── Track staff changes — notify/appoint after all updates ────────
    if (staffChanged) {
      if (oldStaff) {
        // Accumulate sessions removed from old staff (for removal email)
        if (!removedStaff.has(oldStaff)) removedStaff.set(oldStaff, [])
        removedStaff.get(oldStaff)!.push(sessionData)
      }
      if (newStaff) {
        addedStaff.add(newStaff)
      }
    }
  }

  logger.debug(`✅ Updated instructor fields for ${updated} sessions`)

  // ── Post-loop: handle removed staff (one notification per staff) ───
  if (course) {
    for (const [staffId, removedSessions] of removedStaff) {
      await deleteStaffCourseAppointments(supabase, staffId, course.id)
      await notifyStaffRemoved(supabase, staffId, course as any, removedSessions)
    }

    // ── Post-loop: handle added/changed staff (one notification per staff) ──
    for (const staffId of addedStaff) {
      // Now ALL sessions are updated in DB — fetch the complete list for this staff
      const { data: allStaffSessions } = await supabase
        .from('course_sessions')
        .select('id, start_time, end_time, description')
        .eq('course_id', course.id)
        .eq('staff_id', staffId)

      if (allStaffSessions?.length) {
        await createStaffCourseAppointments(supabase, staffId, course as any, allStaffSessions)
        await notifyStaffAssigned(supabase, staffId, course as any, allStaffSessions)

        await supabase
          .from('course_sessions')
          .update({ staff_notified_at: new Date().toISOString() })
          .in('id', allStaffSessions.map((s) => s.id))
      }
    }

    // ── Mark external ICS sessions as notified ─────────────────────
    for (const [email, sessions] of extInviteMap) {
      for (const s of sessions) {
        await supabase
          .from('course_sessions')
          .update({ external_instructor_notified_at: new Date().toISOString() })
          .eq('id', s.id)
      }
    }
  }

  // ── Send ICS invites to external instructors with newly set emails ──
  if (course && extInviteMap.size > 0) {
    for (const [email, sessions] of extInviteMap) {
      const instructorName = sessions[0]?.external_instructor_name || email
      try {
        await sendExternalInstructorInvite(
          supabase,
          profile.tenant_id,
          course as any,
          instructorName,
          email,
          sessions,
        )
      } catch (e: any) {
        logger.warn(`⚠️ Could not send ICS to external instructor ${email}:`, e.message)
      }
    }
  }

  return {
    success: true,
    updated,
    warnings: missingEmailWarnings.length > 0
      ? missingEmailWarnings.map((name) => `Bitte E-Mail für externen Instruktor "${name}" hinterlegen, damit er eine Kalendereinladung erhält.`)
      : [],
  }
})
