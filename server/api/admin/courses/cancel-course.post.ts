import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { cancelCourseWithFollowUps } from '~/server/utils/course-cancel-followups'

/**
 * POST /api/admin/courses/cancel-course
 *
 * Canonical course-cancellation entry point. Runs DB cascade + email outbox +
 * staff calendar cleanup + SARI unenroll via cancelCourseWithFollowUps
 * (shared with /api/courses/update-status when status=cancelled).
 *
 * Body:
 *   courseId, notifyByEmail?, notifyStaff?, reason?, participants? (optional hint only)
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { courseId, notifyByEmail, notifyStaff, reason } = body as {
    courseId: string
    notifyByEmail?: boolean
    notifyStaff?: boolean
    reason?: string
    participants?: unknown
  }

  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })

  const supabase = getSupabaseAdmin()

  const { cancelResult, followUps, complete, warnings } = await cancelCourseWithFollowUps({
    supabase,
    tenantId: profile.tenant_id,
    actorId: profile.id,
    courseId,
    notifyParticipants: notifyByEmail !== false,
    notifyStaff: !!notifyStaff,
    reason: reason || null,
  })

  return {
    success: true,
    complete,
    courseId,
    database: cancelResult.database,
    emails: cancelResult.emails,
    resources: cancelResult.resources,
    manualReviewRequired: cancelResult.manualReviewRequired,
    warnings,
    auditId: cancelResult.auditId,
    staff: {
      instructorsCleared: followUps.staff.instructorsCleared,
      notified: followUps.staff.notified,
      ok: followUps.staff.ok,
      errors: followUps.staff.errors,
    },
    sari: followUps.sari
      ? {
          unenrolled: followUps.sari.unenrolled,
          unresolved: followUps.sari.unresolved,
          failed: followUps.sari.failed,
          localOnly: followUps.sari.localOnly,
          error: followUps.sari.error,
          failedCount: followUps.sari.failedCount,
          blockedCount: followUps.sari.blockedCount,
          restoredCount: 0 as const,
          blockedMessage: followUps.sari.blockedMessage,
          ok: followUps.sari.ok,
        }
      : null,
  }
})
