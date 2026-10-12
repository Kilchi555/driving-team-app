/**
 * F1 public cash enroll — required side-effect outbox processor.
 *
 * Jobs are inserted atomically inside enroll_public_cash_course_with_pending_payment.
 * This module claims/completes/fails jobs via SECURITY DEFINER RPCs (service_role).
 *
 * External delivery is at-least-once. Downstream dedupe:
 * - email: no provider send-once (duplicate email possible on ambiguous timeout)
 * - SARI: ALREADY_ENROLLED + membership uniqueness
 * - vehicle: insert best-effort; uniqueness not guaranteed without DB uidx
 */
import { logger } from '~/utils/logger'
import { getSARICredentialsSecure } from '~/server/utils/sari-credentials-secure'
import { SARIClient } from '~/utils/sariClient'
import {
  isConfirmedSariEnrollDuplicate,
  parsePositiveSariSessionId,
  recordConfirmedSariMembershipWithRetry,
  SARI_MEMBERSHIP_SOURCE,
  setRegistrationSariSynced,
  uniqueLocalCourseSessionId,
} from '~/server/utils/registration-sari-membership'
import { internalSecretHeaders } from '~/server/utils/require-staff-or-internal'

export const PUBLIC_CASH_OUTBOX_EVENT_TYPES = [
  'confirmation_email',
  'sari_sync',
  'vehicle_bookings',
] as const

export type PublicCashOutboxEventType = (typeof PUBLIC_CASH_OUTBOX_EVENT_TYPES)[number]

export type PublicCashOutboxJob = {
  id: string
  tenant_id: string
  registration_id: string
  payment_id: string
  enroll_idempotency_key: string
  event_type: PublicCashOutboxEventType
  dedupe_key: string
  payload: Record<string, unknown>
  status: string
  attempts: number
}

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>
  from: (table: string) => any
}

export function isRetryableOutboxError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('timeout')
    || m.includes('temporar')
    || m.includes('econn')
    || m.includes('503')
    || m.includes('429')
    || m.includes('network')
    || m.includes('fetch failed')
  )
}

export async function claimPublicCashEnrollOutboxBatch(
  supabase: RpcClient,
  opts: { limit?: number; workerId: string; staleAfterSeconds?: number } = { workerId: 'worker' },
): Promise<PublicCashOutboxJob[]> {
  const { data, error } = await supabase.rpc('claim_public_cash_enroll_outbox_batch', {
    p_limit: opts.limit ?? 20,
    p_worker_id: opts.workerId,
    p_stale_after_seconds: opts.staleAfterSeconds ?? 300,
  })
  if (error) {
    throw new Error(error.message || 'claim_outbox_failed')
  }
  const rows = Array.isArray(data) ? data : data ? [data] : []
  return rows as PublicCashOutboxJob[]
}

export async function completePublicCashEnrollOutboxJob(
  supabase: RpcClient,
  jobId: string,
  workerId: string,
): Promise<void> {
  const { error } = await supabase.rpc('complete_public_cash_enroll_outbox_job', {
    p_job_id: jobId,
    p_worker_id: workerId,
  })
  if (error) throw new Error(error.message || 'complete_outbox_failed')
}

export async function failPublicCashEnrollOutboxJob(
  supabase: RpcClient,
  jobId: string,
  workerId: string,
  errMessage: string,
  permanent: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('fail_public_cash_enroll_outbox_job', {
    p_job_id: jobId,
    p_worker_id: workerId,
    p_error: errMessage.slice(0, 500),
    p_permanent: permanent,
  })
  if (error) throw new Error(error.message || 'fail_outbox_failed')
}

async function processConfirmationEmail(job: PublicCashOutboxJob): Promise<void> {
  const amountRappen = Number(job.payload?.amount_rappen ?? 0)
  await $fetch('/api/emails/send-course-enrollment-confirmation', {
    method: 'POST',
    headers: internalSecretHeaders(),
    body: {
      courseRegistrationId: job.registration_id,
      paymentMethod: 'cash',
      totalAmount: Number.isFinite(amountRappen) ? amountRappen / 100 : undefined,
    },
  })
}

async function processSariSync(supabase: RpcClient, job: PublicCashOutboxJob): Promise<void> {
  const { data: reg, error: regErr } = await supabase
    .from('course_registrations')
    .select('id, tenant_id, course_id, sari_faberid, birthdate, sari_synced')
    .eq('id', job.registration_id)
    .eq('tenant_id', job.tenant_id)
    .maybeSingle()
  if (regErr) throw new Error(regErr.message)
  if (!reg) throw new Error('registration_not_found')

  const faber = String(reg.sari_faberid || '').trim()
  if (!faber) {
    // Permanent: nothing to sync
    throw Object.assign(new Error('missing_faberid'), { permanent: true })
  }

  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .select('id, tenant_id, sari_managed, sari_course_id, course_sessions(id, tenant_id, sari_session_id, session_number, start_time)')
    .eq('id', reg.course_id)
    .eq('tenant_id', job.tenant_id)
    .maybeSingle()
  if (courseErr) throw new Error(courseErr.message)
  if (!course?.sari_managed) {
    throw Object.assign(new Error('course_not_sari_managed'), { permanent: true })
  }

  const creds = await getSARICredentialsSecure(job.tenant_id)
  const sari = new SARIClient(creds as any)
  const birthdate = String(reg.birthdate || '')
  const payloadIds = Array.isArray(job.payload?.sari_session_ids)
    ? (job.payload.sari_session_ids as unknown[]).map(String)
    : []

  let sessionIds = payloadIds
  if (sessionIds.length === 0 && course.sari_course_id) {
    sessionIds = String(course.sari_course_id)
      .replace(/^GROUP_/i, '')
      .split('_')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  const confirmed: Array<{ sariSessionId: number; courseSessionId: string | null }> = []
  let errors = 0
  for (const raw of sessionIds) {
    const numericId = parsePositiveSariSessionId(raw)
    if (numericId == null) {
      errors++
      continue
    }
    try {
      await sari.enrollStudent(numericId, faber, birthdate)
      confirmed.push({
        sariSessionId: numericId,
        courseSessionId: uniqueLocalCourseSessionId(course.course_sessions, numericId, job.tenant_id),
      })
    } catch (e: any) {
      const msg = e?.message || ''
      if (isConfirmedSariEnrollDuplicate(msg)) {
        confirmed.push({
          sariSessionId: numericId,
          courseSessionId: uniqueLocalCourseSessionId(course.course_sessions, numericId, job.tenant_id),
        })
      } else {
        errors++
        logger.warn('public cash outbox SARI session failed', { jobId: job.id, numericId, msg })
      }
    }
  }

  if (confirmed.length === 0) {
    throw new Error(errors > 0 ? 'sari_all_sessions_failed' : 'sari_no_sessions')
  }

  for (const session of confirmed) {
    await recordConfirmedSariMembershipWithRetry({
      supabase: supabase as any,
      tenantId: job.tenant_id,
      registrationId: job.registration_id,
      sariSessionId: session.sariSessionId,
      courseSessionId: session.courseSessionId,
      source: SARI_MEMBERSHIP_SOURCE.cashEnrollment,
    })
  }
  if (errors === 0) {
    await setRegistrationSariSynced(supabase as any, job.tenant_id, job.registration_id, true)
  }
}

async function processVehicleBookings(supabase: RpcClient, job: PublicCashOutboxJob): Promise<void> {
  const vehicleId = String(job.payload?.vehicle_id || '')
  const userId = String(job.payload?.user_id || '')
  const courseId = String(job.payload?.course_id || '')
  if (!vehicleId || !courseId) {
    throw Object.assign(new Error('missing_vehicle_or_course'), { permanent: true })
  }

  const { data: course, error } = await supabase
    .from('courses')
    .select('id, course_sessions(id, start_time, end_time, session_number)')
    .eq('id', courseId)
    .eq('tenant_id', job.tenant_id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  const sessions = course?.course_sessions || []
  if (!sessions.length) {
    throw Object.assign(new Error('no_course_sessions'), { permanent: true })
  }

  // Skip if bookings already exist for this vehicle+course (weak dedupe).
  const { count } = await supabase
    .from('vehicle_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', job.tenant_id)
    .eq('course_id', course.id)
    .eq('vehicle_id', vehicleId)

  if ((count || 0) > 0) {
    return
  }

  const rows = sessions.map((s: any) => ({
    vehicle_id: vehicleId,
    tenant_id: job.tenant_id,
    course_id: course.id,
    course_session_id: s.id,
    start_time: s.start_time,
    end_time: s.end_time,
    purpose: 'course',
    status: 'confirmed',
    booked_by: userId || null,
  }))
  const { error: insertErr } = await supabase.from('vehicle_bookings').insert(rows)
  if (insertErr) throw new Error(insertErr.message)
}

export async function processPublicCashEnrollOutboxJob(
  supabase: RpcClient,
  job: PublicCashOutboxJob,
): Promise<void> {
  switch (job.event_type) {
    case 'confirmation_email':
      await processConfirmationEmail(job)
      return
    case 'sari_sync':
      await processSariSync(supabase, job)
      return
    case 'vehicle_bookings':
      await processVehicleBookings(supabase, job)
      return
    default:
      throw Object.assign(new Error(`unknown_event_type:${job.event_type}`), { permanent: true })
  }
}

export async function drainPublicCashEnrollOutbox(
  supabase: RpcClient,
  opts: { limit?: number; workerId?: string } = {},
): Promise<{ claimed: number; completed: number; failed: number; retried: number }> {
  const workerId = opts.workerId || `cash-outbox-${process.pid || 'w'}`
  const jobs = await claimPublicCashEnrollOutboxBatch(supabase, {
    limit: opts.limit ?? 20,
    workerId,
  })
  let completed = 0
  let failed = 0
  let retried = 0

  for (const job of jobs) {
    try {
      await processPublicCashEnrollOutboxJob(supabase, job)
      await completePublicCashEnrollOutboxJob(supabase, job.id, workerId)
      completed++
    } catch (err: any) {
      const message = String(err?.message || err || 'outbox_job_failed')
      const permanent = Boolean(err?.permanent) || !isRetryableOutboxError(message)
      await failPublicCashEnrollOutboxJob(supabase, job.id, workerId, message, permanent)
      if (permanent) failed++
      else retried++
      logger.warn('public cash enroll outbox job failed', {
        jobId: job.id,
        eventType: job.event_type,
        permanent,
        // redacted: no payload dump
      })
    }
  }

  return { claimed: jobs.length, completed, failed, retried }
}

/** Best-effort kick; never throws to callers of enroll-cash. */
export function kickPublicCashEnrollOutboxProcessing(): void {
  const secret = process.env.CRON_SECRET
  if (!secret) return
  $fetch('/api/cron/process-public-cash-enroll-outbox', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'x-internal-secret': secret,
    },
  }).catch((err: any) => {
    logger.warn('kick public cash enroll outbox failed (non-fatal)', err?.message)
  })
}
