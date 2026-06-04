import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { SARIClient } from '~/utils/sariClient'
import { getSARICredentialsSecure } from '~/server/utils/sari-credentials-secure'
import { generateCourseRegistrationCancellationEmail } from '~/server/utils/email-templates'
import { logger } from '~/utils/logger'

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
  const { enrollmentId } = await readBody(event) as { enrollmentId: string }

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
    .select('name, contact_email, primary_color')
    .eq('id', profile.tenant_id)
    .single()

  // ── 1. SARI de-enrollment ──────────────────────────────────────────────────
  const user   = reg.users as any
  const faberid = user?.faberid

  if (course?.sari_managed && course?.sari_course_id && faberid) {
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
          // Non-fatal per session – log and continue
          logger.warn(`⚠️ SARI unenroll failed for session ${numericId}:`, sessionErr.message)
        }
      }
    } catch (sariErr: any) {
      logger.warn('⚠️ SARI de-enrollment failed (non-fatal):', sariErr.message)
    }
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

  // ── 3. Cancellation email ──────────────────────────────────────────────────
  const recipientEmail = reg.email
  if (recipientEmail) {
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

      const { subject, html } = generateCourseRegistrationCancellationEmail({
        firstName:  reg.first_name || '',
        lastName:   reg.last_name  || '',
        courseName: course?.name   || '',
        courseDate,
        location:   course?.description || undefined,
        tenantName: tenant?.name        || 'Driving Team',
        tenantEmail: tenant?.contact_email || undefined,
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

  return { success: true }
})
