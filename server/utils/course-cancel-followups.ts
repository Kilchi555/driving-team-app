/**
 * Post-commit follow-ups for course cancellation: staff calendar cleanup + SARI unenroll.
 * Must run after cancelCourse DB/email cascade for every cancellation entry point.
 * Does not invent refunds or reopen cancelled registrations/invoices.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SARIClient,
  isSariUnenrollIdempotent,
  isSariUnenrollBlocked,
  getSariUnenrollBlockedMessage,
} from '~/utils/sariClient'
import { getTenantSecretsSecure } from '~/server/utils/get-tenant-secrets-secure'
import {
  deleteStaffCourseAppointments,
  notifyStaffCourseCancelled,
} from '~/server/utils/course-staff-notifications'
import { logger } from '~/utils/logger'
import {
  deleteConfirmedSariMembership,
  isUnresolvedSariRegistration,
  listRegistrationSariMemberships,
} from '~/server/utils/registration-sari-membership'
import type { CourseCancelResult } from '~/server/utils/cancel-course'

export type CourseCancelStaffResult = {
  instructorsCleared: number
  notified: number
  ok: boolean
  errors: string[]
}

export type CourseCancelSariResult = {
  applicable: boolean
  unenrolled: number
  unresolved: number
  failed: number
  localOnly: number
  error: string | null
  failedCount: number
  blockedCount: number
  restoredCount: 0
  blockedMessage?: string
  ok: boolean
}

export type CourseCancelFollowUpResult = {
  staff: CourseCancelStaffResult
  sari: CourseCancelSariResult | null
  warnings: string[]
  complete: boolean
}

export async function runCourseCancelFollowUps(opts: {
  supabase: SupabaseClient
  tenantId: string
  courseId: string
  notifyStaff?: boolean
  /** Base cancel result from cancelCourse (DB/email/resources). */
  cancelResult: CourseCancelResult
}): Promise<CourseCancelFollowUpResult> {
  const { supabase, tenantId, courseId, notifyStaff = false, cancelResult } = opts
  const warnings = [...cancelResult.warnings]
  const staff: CourseCancelStaffResult = {
    instructorsCleared: 0,
    notified: 0,
    ok: true,
    errors: [],
  }

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

    const { data: courseNameRow } = await supabase
      .from('courses')
      .select('name')
      .eq('id', courseId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    const courseForNotify = {
      id: courseId,
      name: courseNameRow?.name || 'Kurs',
      tenant_id: tenantId,
    }

    for (const [staffId, sessions] of byStaff) {
      await deleteStaffCourseAppointments(supabase, staffId, courseId)
      staff.instructorsCleared++
      if (notifyStaff) {
        await notifyStaffCourseCancelled(supabase, staffId, courseForNotify, sessions)
        staff.notified++
      }
    }

    const { data: leftover } = await supabase
      .from('appointments')
      .delete()
      .eq('notes', `course:${courseId}`)
      .eq('tenant_id', tenantId)
      .select('id')

    if (leftover?.length) {
      staff.instructorsCleared += leftover.length
    }
  } catch (staffCleanupErr: any) {
    staff.ok = false
    const msg = staffCleanupErr?.message || String(staffCleanupErr)
    staff.errors.push(msg)
    warnings.push(`Staff-Kalender: ${msg}`)
    logger.warn('⚠️ Staff appointment cleanup after course cancel failed:', msg)
  }

  const { data: courseMeta } = await supabase
    .from('courses')
    .select('sari_managed, tenants!inner(sari_enabled, sari_environment)')
    .eq('id', courseId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const tenant = (courseMeta as any)?.tenants
  const isSariManaged = !!(courseMeta as any)?.sari_managed && !!tenant?.sari_enabled

  let sari: CourseCancelSariResult | null = null

  if (isSariManaged) {
    let sariUnenrolled = 0
    let sariUnresolved = 0
    let sariLocalOnly = 0
    let sariError: string | null = null
    let sariFailedCount = 0
    let sariBlockedCount = 0
    let sariOk = true

    try {
      const sariSecrets = await getTenantSecretsSecure(
        tenantId,
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
        .eq('tenant_id', tenantId)
        .eq('status', 'cancelled')
        .is('deleted_at', null)

      const failuresForLog: Array<{ faberid: string; sessionId: number; error: string }> = []
      let unenrolled = 0

      for (const reg of regs || []) {
        const faberid = (reg as any).sari_faberid || (reg as any).users?.faberid
        const memberships = await listRegistrationSariMemberships(supabase, tenantId, reg.id)
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
          sariOk = false
          warnings.push(`SARI-Status unklar für Anmeldung ${reg.id} — manuell prüfen`)
          continue
        }

        let regFailed = false
        for (const membership of memberships) {
          try {
            await sariClient.unenrollStudent(membership.sari_session_id, faberid)
            await deleteConfirmedSariMembership({
              supabase,
              tenantId,
              registrationId: reg.id,
              sariSessionId: membership.sari_session_id,
            })
            unenrolled++
          } catch (err: any) {
            if (isSariUnenrollIdempotent(err.message)) {
              await deleteConfirmedSariMembership({
                supabase,
                tenantId,
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
          sariOk = false
          warnings.push(`SARI-Abmeldung unvollständig für Anmeldung ${reg.id}`)
        } else {
          await supabase
            .from('course_registrations')
            .update({ sari_synced: true, sari_synced_at: new Date().toISOString() })
            .eq('id', reg.id)
            .eq('tenant_id', tenantId)
        }
      }

      if (failuresForLog.length > 0) {
        await supabase.from('sari_sync_logs').insert({
          tenant_id: tenantId,
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
      sariOk = false
      warnings.push(`SARI: ${sariErr.message}`)
    }

    sari = {
      applicable: true,
      unenrolled: sariUnenrolled,
      unresolved: sariUnresolved,
      failed: sariFailedCount,
      localOnly: sariLocalOnly,
      error: sariError,
      failedCount: sariFailedCount,
      blockedCount: sariBlockedCount,
      restoredCount: 0,
      blockedMessage: sariBlockedCount > 0 ? getSariUnenrollBlockedMessage() : undefined,
      ok: sariOk && !sariError && sariFailedCount === 0 && sariUnresolved === 0,
    }
  }

  const followUpComplete = cancelResult.complete && staff.ok && (sari ? sari.ok : true)

  return {
    staff,
    sari,
    warnings,
    complete: followUpComplete,
  }
}

/**
 * Full canonical cancellation used by every HTTP entry point.
 */
export async function cancelCourseWithFollowUps(opts: {
  supabase: SupabaseClient
  tenantId: string
  actorId: string
  courseId: string
  notifyParticipants?: boolean
  notifyStaff?: boolean
  reason?: string | null
}): Promise<{
  cancelResult: CourseCancelResult
  followUps: CourseCancelFollowUpResult
  complete: boolean
  warnings: string[]
}> {
  const { cancelCourse } = await import('~/server/utils/cancel-course')
  const cancelResult = await cancelCourse({
    supabase: opts.supabase,
    tenantId: opts.tenantId,
    actorId: opts.actorId,
    courseId: opts.courseId,
    notifyParticipants: opts.notifyParticipants !== false,
    reason: opts.reason || null,
  })

  const followUps = await runCourseCancelFollowUps({
    supabase: opts.supabase,
    tenantId: opts.tenantId,
    courseId: opts.courseId,
    notifyStaff: !!opts.notifyStaff,
    cancelResult,
  })

  return {
    cancelResult,
    followUps,
    complete: followUps.complete,
    warnings: followUps.warnings,
  }
}
