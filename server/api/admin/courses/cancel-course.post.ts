import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARIClient, isSariUnenrollIdempotent, isSariUnenrollBlocked, getSariUnenrollBlockedMessage } from '~/utils/sariClient'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import {
  deleteStaffCourseAppointments,
  notifyStaffCourseCancelled,
} from '~/server/utils/course-staff-notifications'
import { logger } from '~/utils/logger'
import { cancelCourse } from '~/server/utils/cancel-course'
import {
  deleteConfirmedSariMembership,
  isUnresolvedSariRegistration,
  listRegistrationSariMemberships,
} from '~/server/utils/registration-sari-membership'

/**
 * POST /api/admin/courses/cancel-course
 *
 * Canonical course-cancellation entry point. Delegates DB + email outbox work to
 * `cancelCourse` (shared with /api/courses/update-status when status=cancelled).
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

  // ── Canonical cascade: course, regs, unpaid payments/invoices, resources, email outbox ──
  const cancelResult = await cancelCourse({
    supabase,
    tenantId: profile.tenant_id,
    actorId: profile.id,
    courseId,
    notifyParticipants: notifyByEmail !== false,
    reason: reason || null,
  })

  // ── Staff calendar blocks: always remove; email only if admin opted in ──
  let staffAppointmentsRemoved = 0
  let staffNotified = 0
  try {
    const { data: staffSessions } = await supabase
      .from('course_sessions')
      .select('id, start_time, end_time, description, staff_id')
      .eq('course_id', courseId)
      .not('staff_id', 'is', null)

    const byStaff = new Map<string, Array<{ id: string; start_time: string; end_time: string; description?: string | null }>>()
    for (const s of staffSessions || []) {
      if (!s.staff_id) continue
      if (!byStaff.has(s.staff_id)) byStaff.set(s.staff_id, [])
      byStaff.get(s.staff_id)!.push(s)
    }

    const courseForNotify = {
      id: courseId,
      name: (await supabase.from('courses').select('name').eq('id', courseId).single()).data?.name || 'Kurs',
      tenant_id: profile.tenant_id,
    }

    for (const [staffId, sessions] of byStaff) {
      await deleteStaffCourseAppointments(supabase, staffId, courseId)
      staffAppointmentsRemoved++
      if (notifyStaff) {
        await notifyStaffCourseCancelled(supabase, staffId, courseForNotify, sessions)
        staffNotified++
      }
    }

    const { data: leftover } = await supabase
      .from('appointments')
      .delete()
      .eq('notes', `course:${courseId}`)
      .select('id')

    if (leftover?.length) {
      staffAppointmentsRemoved += leftover.length
    }
  } catch (staffCleanupErr: any) {
    cancelResult.warnings.push(`Staff-Kalender: ${staffCleanupErr.message}`)
    logger.warn('⚠️ Staff appointment cleanup after course cancel failed:', staffCleanupErr.message)
  }

  // ── SARI unenroll (best-effort; does not invent refunds or reopen cancelled invoices) ──
  const { data: courseMeta } = await supabase
    .from('courses')
    .select('sari_managed, tenants!inner(sari_enabled, sari_environment)')
    .eq('id', courseId)
    .eq('tenant_id', profile.tenant_id)
    .maybeSingle()

  const tenant = (courseMeta as any)?.tenants
  const isSariManaged = !!(courseMeta as any)?.sari_managed && !!tenant?.sari_enabled

  let sariUnenrolled = 0
  let sariUnresolved = 0
  let sariLocalOnly = 0
  let sariError: string | null = null
  let sariFailedCount = 0
  let sariBlockedCount = 0

  if (isSariManaged) {
    try {
      const sariSecrets = await getTenantSecretsSecure(
        profile.tenant_id,
        ['SARI_CLIENT_ID', 'SARI_CLIENT_SECRET', 'SARI_USERNAME', 'SARI_PASSWORD'],
        'CANCEL_COURSE_SARI_UNENROLL',
      )

      const sariClient = new SARIClient({
        environment: (tenant.sari_environment || 'test') as 'test' | 'production',
        clientId: sariSecrets.SARI_CLIENT_ID,
        clientSecret: sariSecrets.SARI_CLIENT_SECRET,
        username: sariSecrets.SARI_USERNAME,
        password: sariSecrets.SARI_PASSWORD,
      })

      const { data: regs } = await supabase
        .from('course_registrations')
        .select('id, user_id, status, payment_method, sari_faberid, users!course_registrations_user_id_fkey(id, faberid)')
        .eq('course_id', courseId)
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'cancelled')
        .is('deleted_at', null)

      const failuresForLog: Array<{ faberid: string; sessionId: number; error: string }> = []
      let unenrolled = 0

      for (const reg of regs || []) {
        const faberid = (reg as any).sari_faberid || (reg as any).users?.faberid
        const memberships = await listRegistrationSariMemberships(supabase, profile.tenant_id, reg.id)
        if (!faberid || (reg as any).payment_method === 'reserved') {
          sariLocalOnly++
          continue
        }
        if (memberships.length === 0 && isUnresolvedSariRegistration({
          sariManaged: true,
          faberid,
          status: 'confirmed',
          paymentMethod: (reg as any).payment_method,
          membershipCount: 0,
        })) {
          sariUnresolved++
          cancelResult.warnings.push(`SARI-Status unklar für Anmeldung ${reg.id} — manuell prüfen`)
          continue
        }

        let regFailed = false
        for (const membership of memberships) {
          try {
            await sariClient.unenrollStudent(membership.sari_session_id, faberid)
            await deleteConfirmedSariMembership({
              supabase,
              tenantId: profile.tenant_id,
              registrationId: reg.id,
              sariSessionId: membership.sari_session_id,
            })
            unenrolled++
          } catch (err: any) {
            if (isSariUnenrollIdempotent(err.message)) {
              await deleteConfirmedSariMembership({
                supabase,
                tenantId: profile.tenant_id,
                registrationId: reg.id,
                sariSessionId: membership.sari_session_id,
              })
              unenrolled++
              continue
            }
            regFailed = true
            if (isSariUnenrollBlocked(err.message)) sariBlockedCount++
            failuresForLog.push({ faberid, sessionId: membership.sari_session_id, error: err.message })
          }
        }
        if (regFailed) {
          sariFailedCount++
          cancelResult.warnings.push(`SARI-Abmeldung unvollständig für Anmeldung ${reg.id}`)
        } else {
          await supabase
            .from('course_registrations')
            .update({ sari_synced: true, sari_synced_at: new Date().toISOString() })
            .eq('id', reg.id)
            .eq('tenant_id', profile.tenant_id)
        }
      }

      if (failuresForLog.length > 0) {
        await supabase.from('sari_sync_logs').insert({
          tenant_id: profile.tenant_id,
          operation: 'UNENROLL_STUDENT_CANCEL_COURSE',
          status: sariFailedCount === (regs || []).length ? 'error' : 'partial',
          result: { failures: failuresForLog },
          error_message: sariBlockedCount > 0
            ? getSariUnenrollBlockedMessage()
            : `${failuresForLog.length} SARI-Abmeldung(en) fehlgeschlagen`,
          metadata: { courseId },
        })
      }

      sariUnenrolled = unenrolled
    } catch (sariErr: any) {
      logger.error(`⚠️ SARI unenrollment failed during course cancellation: ${sariErr.message}`)
      sariError = sariErr.message
      cancelResult.warnings.push(`SARI: ${sariErr.message}`)
    }
  }

  const complete = cancelResult.complete && cancelResult.warnings.length === 0 && !sariError && sariFailedCount === 0

  return {
    success: true,
    complete,
    courseId,
    database: cancelResult.database,
    emails: cancelResult.emails,
    manualReviewRequired: cancelResult.manualReviewRequired,
    warnings: cancelResult.warnings,
    auditId: cancelResult.auditId,
    staff: {
      instructorsCleared: staffAppointmentsRemoved,
      notified: staffNotified,
    },
    sari: isSariManaged
      ? {
          unenrolled: sariUnenrolled,
          unresolved: sariUnresolved,
          failed: sariFailedCount,
          localOnly: sariLocalOnly,
          error: sariError,
          failedCount: sariFailedCount,
          blockedCount: sariBlockedCount,
          restoredCount: 0,
          blockedMessage: sariBlockedCount > 0 ? getSariUnenrollBlockedMessage() : undefined,
        }
      : null,
  }
})
