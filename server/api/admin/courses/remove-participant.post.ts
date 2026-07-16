import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARIClient, isSariUnenrollIdempotent, isSariUnenrollBlocked, getSariUnenrollBlockedMessage } from '~/utils/sariClient'
import { getSARICredentialsSecure } from '~/server/utils/sari-credentials-secure'
import { generateCourseRegistrationCancellationEmail } from '~/server/utils/email-templates'
import { logger } from '~/utils/logger'
import { processWalleeRefund } from '~/server/utils/wallee-refund'

/** Outcome of the SARI de-enrollment attempt, returned to the admin UI so a failure is never silent. */
interface SariSyncResult {
  /** Whether SARI de-enrollment was attempted at all (false for non-SARI courses). */
  attempted: boolean
  /** True once every relevant session was either unenrolled or already in that state. */
  success: boolean
  /** True if SARI actively refused the removal (e.g. registration already confirmed) — needs manual action in the SARI portal. */
  blocked: boolean
  message?: string
}

/**
 * POST /api/admin/courses/remove-participant
 * Soft-deletes a course registration by setting deleted_at / deleted_by.
 * Also:
 *   - De-enrolls the participant from SARI (if sari_managed + participant has faberid)
 *   - Sends a cancellation confirmation email to the participant
 *
 * Body:
 *   enrollmentId – id of the course_registrations row
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const {
    enrollmentId,
    reason,
    notify,
    processRefund: shouldProcessRefund,
    refundAmountChf,
  } = await readBody(event) as {
    enrollmentId: string
    reason?: string
    notify?: boolean
    /** If true, attempt a Wallee refund after removing the participant */
    processRefund?: boolean
    /** Refund amount in CHF. If omitted, falls back to the full Wallee-captured amount. */
    refundAmountChf?: number
  }

  if (!enrollmentId) throw createError({ statusCode: 400, statusMessage: 'Missing enrollmentId' })

  const supabase = getSupabaseAdmin()

  // Load full registration with course, sessions, user and tenant data.
  // Tenant ownership is verified via the courses join (not tenant_id on the
  // registration itself, which may be null or differ for externally-created records).
  const { data: reg, error: regError } = await supabase
    .from('course_registrations')
    .select(`
      id,
      tenant_id,
      user_id,
      first_name,
      last_name,
      email,
      is_partial_enrollment,
      courses!inner(
        id,
        tenant_id,
        name,
        description,
        sari_managed,
        sari_course_id,
        course_sessions(id, sari_session_id, start_time, session_number)
      ),
      users!course_registrations_user_id_fkey(faberid, birthdate)
    `)
    .eq('id', enrollmentId)
    .single()

  if (regError) {
    logger.error('❌ remove-participant query error:', regError)
    throw createError({ statusCode: 500, statusMessage: regError.message })
  }
  if (!reg) throw createError({ statusCode: 404, statusMessage: 'Registration not found' })

  // Verify the course belongs to this admin's tenant
  const course = reg.courses as any
  if (course?.tenant_id !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  // Load tenant info for the email
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, contact_email, primary_color, logo_wide_url, logo_url, logo_square_url')
    .eq('id', profile.tenant_id)
    .single()

  // ── 1. SARI de-enrollment ──────────────────────────────────────────────────
  const user   = reg.users as any
  const faberid = user?.faberid

  const sariSync: SariSyncResult = { attempted: false, success: true, blocked: false }

  if (course?.sari_managed && course?.sari_course_id && faberid) {
    sariSync.attempted = true
    const failedSessions: string[] = []
    let blockedByConfirmed = false

    try {
      const credentials = await getSARICredentialsSecure(profile.tenant_id, 'ADMIN_REMOVE_PARTICIPANT')
      if (!credentials) throw new Error('SARI not configured for this tenant')
      const sari = new SARIClient(credentials)
      const sessions: any[] = course.course_sessions || []

      // For partial enrollments only de-enroll from sessions the user was enrolled in.
      // We use the category's partial_start_position from DB to determine this.
      let relevantSessions = sessions
      if (reg.is_partial_enrollment) {
        // Fetch partial_start_position from category
        const { data: courseWithCategory } = await supabase
          .from('courses')
          .select('course_category_id, course_categories(partial_start_position)')
          .eq('id', course.id)
          .single()
        const startPos = (courseWithCategory?.course_categories as any)?.partial_start_position ?? 3
        relevantSessions = sessions.filter(s => (s.session_number ?? 99) >= startPos)
      }

      // Unenroll from each session individually
      for (const session of relevantSessions) {
        const sessionId = session.sari_session_id
        if (!sessionId) continue
        const numericId = typeof sessionId === 'string'
          ? parseInt(sessionId.replace(/\D/g, ''), 10)
          : sessionId
        if (!numericId || isNaN(numericId)) continue
        try {
          await sari.unenrollStudent(numericId, faberid)
          logger.debug(`✅ SARI unenrolled session ${numericId} for ${faberid}`)
        } catch (sessionErr: any) {
          if (isSariUnenrollIdempotent(sessionErr.message)) {
            // Already not enrolled — this is the goal state, not a failure.
            logger.debug(`ℹ️ SARI session ${numericId} already unenrolled for ${faberid}`)
            continue
          }
          if (isSariUnenrollBlocked(sessionErr.message)) {
            blockedByConfirmed = true
          }
          failedSessions.push(`${numericId}: ${sessionErr.message}`)
          logger.warn(`⚠️ SARI unenroll failed for session ${numericId}:`, sessionErr.message)
        }
      }
    } catch (sariErr: any) {
      failedSessions.push(sariErr.message)
      logger.warn('⚠️ SARI de-enrollment failed:', sariErr.message)
    }

    sariSync.success = failedSessions.length === 0
    sariSync.blocked = blockedByConfirmed
    if (!sariSync.success) {
      sariSync.message = blockedByConfirmed
        ? getSariUnenrollBlockedMessage()
        : `SARI-Abmeldung teilweise/vollständig fehlgeschlagen: ${failedSessions.join('; ')}`
    }

    // Audit trail: record the outcome so failures are discoverable later, not just in server logs.
    await supabase.from('sari_sync_logs').insert({
      tenant_id: profile.tenant_id,
      operation: 'UNENROLL_STUDENT_REMOVE_PARTICIPANT',
      status: sariSync.success ? 'success' : 'error',
      result: { failedSessions },
      error_message: sariSync.message ?? null,
      metadata: { enrollmentId, courseId: course.id, userId: reg.user_id, faberid },
    })

    // Only claim "synced" once SARI actually reflects the removal — an unconditional
    // true here previously masked failed de-enrollments (see cancel-course.post.ts bug).
    await supabase
      .from('course_registrations')
      .update({ sari_synced: sariSync.success, sari_synced_at: sariSync.success ? new Date().toISOString() : null })
      .eq('id', enrollmentId)
  } else if (course?.sari_managed && !faberid) {
    logger.warn('⚠️ SARI-managed course but user has no faberid – skipping SARI de-enrollment')
  }

  // ── 2. Soft-delete the registration ───────────────────────────────────────
  const { error } = await supabase
    .from('course_registrations')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: profile.id,
    })
    .eq('id', enrollmentId)

  if (error) {
    logger.error('❌ Error removing participant:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  logger.debug('✅ Participant removed:', enrollmentId)

  // ── 2a. Optional Wallee refund ──────────────────────────────────────────
  let refundResult: any = null

  if (shouldProcessRefund) {
    // Look up the payment for this enrollment
    let payment: any = null

    // Try via payment_id column on course_registrations (if populated)
    const { data: regWithPayment } = await supabase
      .from('course_registrations')
      .select('payment_id')
      .eq('id', enrollmentId)
      .single()

    if (regWithPayment?.payment_id) {
      const { data: pd } = await supabase
        .from('payments')
        .select('id, payment_status, total_amount_rappen, credit_used_rappen, wallee_transaction_id, tenant_id')
        .eq('id', regWithPayment.payment_id)
        .single()
      payment = pd
    }

    // Fallback: reverse lookup
    if (!payment) {
      const { data: pd } = await supabase
        .from('payments')
        .select('id, payment_status, total_amount_rappen, credit_used_rappen, wallee_transaction_id, tenant_id')
        .eq('course_registration_id', enrollmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      payment = pd
    }

    if (payment) {
      const requestedAmountRappen = refundAmountChf != null
        ? Math.round(refundAmountChf * 100)
        : payment.total_amount_rappen

      refundResult = await processWalleeRefund({
        payment,
        requestedAmountRappen,
        tenantId: profile.tenant_id,
        idempotencyKey: `course-remove-${enrollmentId}`,
        reason: reason || 'Kurs-Abmeldung durch Admin',
      })

      if (refundResult.success) {
        // Mark payment as refunded in DB
        await supabase
          .from('payments')
          .update({
            payment_status: 'refunded',
            refunded_at: new Date().toISOString(),
            notes: `Rückerstattung durch Admin (CHF ${refundResult.refundedAmountChf.toFixed(2)}): ${reason || 'Kurs-Abmeldung'}`,
          })
          .eq('id', payment.id)

        logger.info('✅ Payment refunded via Wallee:', {
          paymentId: payment.id,
          refundId: refundResult.refundId,
          amountChf: refundResult.refundedAmountChf,
        })
      } else {
        logger.warn('⚠️ Wallee refund failed (participant was still removed):', refundResult.error)
      }
    } else {
      logger.debug('⚠️ No payment found for enrollment — skipping refund')
      refundResult = { success: false, error: 'Keine Zahlung gefunden', refundedAmountRappen: 0, refundedAmountChf: 0 }
    }
  }

  // ── 2b. Recalculate current_participants + status ──────────────────────────
  const courseId = (course as any).id
  if (courseId) {
    const { count } = await supabase
      .from('course_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .is('deleted_at', null)

    const newCount = count ?? 0

    // Load max_participants and current status to decide new status
    const { data: courseRow } = await supabase
      .from('courses')
      .select('max_participants, status')
      .eq('id', courseId)
      .single()

    const isFull = newCount >= (courseRow?.max_participants ?? Infinity)
    const currentStatus = courseRow?.status

    // If course was full and now has space again, revert to active/scheduled
    const newStatus = isFull
      ? 'full'
      : currentStatus === 'full' ? 'active' : undefined

    const updatePayload: Record<string, unknown> = { current_participants: newCount }
    if (newStatus !== undefined) updatePayload.status = newStatus

    await supabase
      .from('courses')
      .update(updatePayload)
      .eq('id', courseId)

    logger.debug(`✅ Course participant count updated to ${newCount}, status: ${newStatus ?? currentStatus}`)
  }

  // ── 3. Cancellation email ──────────────────────────────────────────────────
  const recipientEmail = reg.email
  const shouldNotify = notify !== false // default true if not specified
  if (recipientEmail && shouldNotify) {
    try {
      const sessions: any[] = course?.course_sessions || []
      const firstSession = sessions
        .filter(s => s.start_time)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0]

      const courseDate = firstSession?.start_time
        ? new Date(firstSession.start_time).toLocaleDateString('de-CH', {
            weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
            timeZone: 'Europe/Zurich'
          })
        : undefined

      const logoUrl = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
      const { subject, html } = generateCourseRegistrationCancellationEmail({
        firstName:  reg.first_name || '',
        lastName:   reg.last_name  || '',
        courseName: course?.name   || '',
        courseDate,
        location:   course?.description || undefined,
        tenantName: tenant?.name        || 'Ihre Fahrschule',
        tenantEmail: tenant?.contact_email || undefined,
        reason:     reason || undefined,
        primaryColor: tenant?.primary_color || undefined,
        logoUrl,
      })

      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail   = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'
      const fromWithName = tenant?.name ? `${tenant.name} <${fromEmail}>` : fromEmail

      await resend.emails.send({ from: fromWithName, to: recipientEmail, subject, html })
      logger.info('✅ Cancellation email sent to:', recipientEmail)
    } catch (emailErr: any) {
      logger.warn('⚠️ Cancellation email failed (non-fatal):', emailErr.message)
    }
  }

  return { success: true, refund: refundResult, sariSync }
})
