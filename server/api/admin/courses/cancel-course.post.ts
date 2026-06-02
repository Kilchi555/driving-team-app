import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

/**
 * POST /api/admin/courses/cancel-course
 * Cancels a course, all its confirmed registrations, and sends cancellation emails.
 *
 * Body:
 *   courseId      – id of the course to cancel
 *   notifyByEmail – boolean (send cancellation email via Resend)
 *   participants  – array of { user_id, email, first_name, last_name }
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { courseId, notifyByEmail, participants } = body as {
    courseId: string
    notifyByEmail?: boolean
    participants?: Array<{ user_id: string; email?: string; first_name?: string; last_name?: string }>
  }

  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'Missing courseId' })

  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  // Fetch course with sessions and tenant for email
  const { data: course } = await supabase
    .from('courses')
    .select(`
      id, name, description,
      course_sessions(id, start_time, end_time),
      tenants!inner(id, name, slug, contact_email, primary_color)
    `)
    .eq('id', courseId)
    .eq('tenant_id', profile.tenant_id)
    .single()

  if (!course) throw createError({ statusCode: 404, statusMessage: 'Course not found' })

  // Update course status to cancelled
  const { error: courseError } = await supabase
    .from('courses')
    .update({
      status: 'cancelled',
      cancelled_at: now,
      cancelled_by: profile.id,
      status_changed_at: now,
      status_changed_by: profile.id,
    })
    .eq('id', courseId)

  if (courseError) {
    logger.error('❌ Error cancelling course:', courseError)
    throw createError({ statusCode: 500, statusMessage: courseError.message })
  }

  // Cancel all confirmed registrations
  const { error: regError } = await supabase
    .from('course_registrations')
    .update({ status: 'cancelled', cancelled_at: now })
    .eq('course_id', courseId)
    .eq('status', 'confirmed')

  if (regError) {
    logger.error('❌ Error cancelling registrations:', regError)
    throw createError({ statusCode: 500, statusMessage: regError.message })
  }

  logger.debug('✅ Course cancelled:', courseId)

  // Send cancellation emails if requested
  if (notifyByEmail && participants && participants.length > 0) {
    const tenant = (course as any).tenants
    const sessions: any[] = (course as any).course_sessions || []

    const sortedSessions = [...sessions].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    const formattedSessions = formatSessionsForEmail(sortedSessions)

    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'
      const fromWithName = tenant?.name ? `${tenant.name} <${fromEmail}>` : fromEmail

      let sent = 0
      for (const p of participants) {
        if (!p.email) continue
        const firstName = p.first_name || 'Teilnehmer'

        const subject = `Kurs abgesagt: ${course.name}`
        const html = buildCancellationEmail({
          firstName,
          courseName: course.name,
          courseDescription: course.description || '',
          formattedSessions,
          tenantName: tenant?.name || '',
          tenantEmail: tenant?.contact_email || '',
          primaryColor: tenant?.primary_color || '#ef4444',
        })

        try {
          await resend.emails.send({ from: fromWithName, to: p.email, subject, html })
          sent++
        } catch (err: any) {
          logger.warn(`⚠️ Failed to send cancellation email to ${p.email}:`, err.message)
        }
      }

      logger.debug(`✅ Sent ${sent}/${participants.length} cancellation emails`)
    } catch (err: any) {
      // Non-fatal: log but don't fail the cancellation
      logger.error('⚠️ Email sending failed for course cancellation:', err.message)
    }
  }

  return { success: true }
})

function buildCancellationEmail({
  firstName,
  courseName,
  courseDescription,
  formattedSessions,
  tenantName,
  tenantEmail,
  primaryColor,
}: {
  firstName: string
  courseName: string
  courseDescription: string
  formattedSessions: string
  tenantName: string
  tenantEmail: string
  primaryColor: string
}): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kurs abgesagt: ${courseName}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;">
        <tr>
          <td align="center" style="padding:20px 10px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

              <!-- Header -->
              <tr>
                <td style="background:#ef4444;color:white;padding:25px 20px;text-align:center;">
                  <h1 style="margin:0;font-size:22px;font-weight:600;">Kursabsage</h1>
                  <p style="margin:5px 0 0 0;opacity:0.9;font-size:14px;">${tenantName}</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:25px 20px;">
                  <p style="margin:0 0 15px 0;font-size:16px;">Hallo ${firstName},</p>
                  <p style="margin:0 0 20px 0;font-size:15px;color:#374151;">
                    leider müssen wir dir mitteilen, dass der folgende Kurs abgesagt wurde.
                  </p>

                  <!-- Course Details -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fef2f2;border-radius:8px;margin-bottom:20px;border-left:4px solid #ef4444;">
                    <tr>
                      <td style="padding:20px;">
                        <h3 style="margin:0 0 12px 0;color:#b91c1c;font-size:15px;font-weight:600;">Abgesagter Kurs</h3>
                        <p style="margin:0 0 8px 0;font-size:13px;"><strong>Kurs:</strong> ${courseName}</p>
                        ${courseDescription ? `<p style="margin:0 0 8px 0;font-size:13px;"><strong>Standort:</strong> ${courseDescription}</p>` : ''}
                        ${formattedSessions ? `
                        <p style="margin:8px 0 4px 0;font-size:13px;"><strong>Termine:</strong></p>
                        <ul style="margin:0;padding-left:20px;font-size:13px;color:#374151;">
                          ${formattedSessions}
                        </ul>` : ''}
                      </td>
                    </tr>
                  </table>

                  <!-- Apology -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fef3c7;border-radius:8px;margin-bottom:20px;border-left:4px solid #f59e0b;">
                    <tr>
                      <td style="padding:16px;">
                        <p style="margin:0;font-size:13px;color:#92400e;">
                          Wir entschuldigen uns für die Unannehmlichkeiten. Bei Fragen oder zur Vereinbarung eines neuen Termins kontaktiere uns bitte direkt.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:20px 0 5px 0;font-size:15px;">Freundliche Grüsse,<br>${tenantName}</p>
                  ${tenantEmail ? `<p style="margin:8px 0 0 0;font-size:12px;color:#6b7280;">${tenantEmail}</p>` : ''}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f3f4f6;padding:15px 20px;text-align:center;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;">Diese E-Mail wurde automatisch generiert.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

function formatSessionsForEmail(sessions: any[]): string {
  if (!sessions || sessions.length === 0) return ''

  const sessionsByDate: Record<string, any[]> = {}
  for (const s of sessions) {
    const dateKey = new Date(s.start_time).toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
    if (!sessionsByDate[dateKey]) sessionsByDate[dateKey] = []
    sessionsByDate[dateKey].push(s)
  }

  const extractTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('de-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' })

  return Object.entries(sessionsByDate).map(([dateKey, daySessions]) => {
    const date = new Date(`${dateKey}T12:00:00`).toLocaleDateString('de-CH', {
      timeZone: 'Europe/Zurich', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(',', '.')
    const start = extractTime(daySessions[0].start_time)
    const last = daySessions[daySessions.length - 1]
    const end = last.end_time ? ` - ${extractTime(last.end_time)}` : ''
    return `<li>${date}, ${start}${end}</li>`
  }).join('\n')
}
