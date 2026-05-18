// server/api/admin/courses/send-test-course-reminder.post.ts
// ============================================================
// Sends a test course reminder email to a specified address.
// Used to preview the email before the cron goes live.
//
// POST body:
//   registrationId  string   (required) — a confirmed course_registration UUID
//   overrideEmail   string   (optional) — send to this address instead of participant's email
//
// Usage example (curl):
//   curl -X POST http://localhost:3000/api/admin/courses/send-test-course-reminder \
//     -H "Content-Type: application/json" \
//     -d '{ "registrationId": "<uuid>", "overrideEmail": "you@example.com" }'
// ============================================================

import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  // ── Auth: staff/admin only ──────────────────────────────────
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const body = await readBody(event)
  const { registrationId, overrideEmail } = body ?? {}

  if (!registrationId) {
    throw createError({ statusCode: 400, statusMessage: 'registrationId is required' })
  }

  const supabase = getSupabaseAdmin()

  // ── Load registration ────────────────────────────────────────
  const { data: reg, error: regError } = await supabase
    .from('course_registrations')
    .select(`
      id,
      course_id,
      tenant_id,
      custom_sessions,
      status,
      email,
      first_name,
      last_name,
      course:courses!course_registrations_course_id_fkey (
        id,
        name,
        tenant_id
      )
    `)
    .eq('id', registrationId)
    .single()

  if (regError || !reg) {
    throw createError({ statusCode: 404, statusMessage: 'Registration not found' })
  }

  if (reg.status !== 'confirmed') {
    throw createError({ statusCode: 400, statusMessage: `Registration status is "${reg.status}", expected "confirmed"` })
  }

  // ── Load next upcoming session for this course ───────────────
  const { data: sessions } = await supabase
    .from('course_sessions')
    .select('id, session_number, start_time, end_time, custom_location')
    .eq('course_id', reg.course_id)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(1)

  const session = sessions?.[0]
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'No upcoming session found for this course' })
  }

  // ── Load tenant for branding ─────────────────────────────────
  const tenantId = (reg as any).tenant_id || (reg as any).course?.tenant_id
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, primary_color, logo_wide_url, logo_url, logo_square_url')
    .eq('id', tenantId)
    .single()

  const tenantName   = tenant?.name || 'Driving Team'
  const primaryColor = tenant?.primary_color || '#2563eb'
  const logoUrl      = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
  const dashboardLink = tenant?.slug ? `https://app.simy.ch/${tenant.slug}/customer` : 'https://app.simy.ch'

  const recipientEmail = overrideEmail || (reg as any).email
  if (!recipientEmail) {
    throw createError({ statusCode: 400, statusMessage: 'No email address found for registration' })
  }

  // ── Format ───────────────────────────────────────────────────
  const courseName = (reg as any).course?.name || 'Kurs'
  const sessionStart = new Date(session.start_time)
  const sessionEnd = session.end_time ? new Date(session.end_time) : null

  const dateStr = sessionStart.toLocaleDateString('de-CH', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich'
  })
  const timeStr = sessionStart.toLocaleTimeString('de-CH', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich'
  })
  const timeEndStr = sessionEnd
    ? sessionEnd.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })
    : null
  const timeRange = timeEndStr ? `${timeStr}–${timeEndStr} Uhr` : `${timeStr} Uhr`

  const firstName = (reg as any).first_name || 'Hallo'
  const location = session.custom_location || null

  const html = buildCourseReminderEmail({
    firstName,
    courseName,
    dateStr,
    timeRange,
    location,
    tenantName,
    primaryColor,
    logoUrl,
    dashboardLink,
  })

  const subject = `[TEST] Erinnerung: ${courseName} am ${dateStr}`

  // ── Send ─────────────────────────────────────────────────────
  try {
    const result = await sendEmail({
      to: recipientEmail,
      subject,
      html,
      senderName: tenantName,
    })

    logger.debug(`✅ Test course reminder sent to ${recipientEmail}`, result)

    return {
      success: true,
      sentTo: recipientEmail,
      subject,
      course: courseName,
      session: {
        date: dateStr,
        time: timeRange,
        location,
      },
      messageId: result.messageId,
      note: overrideEmail ? `Sent to override address (registration email: ${(reg as any).email})` : 'Sent to registration email',
    }
  } catch (err: any) {
    logger.error('❌ Failed to send test course reminder:', err)
    throw createError({ statusCode: 500, statusMessage: `Email send failed: ${err.message}` })
  }
})

// ── Email builder (identical to cron endpoint) ─────────────────

interface CourseReminderEmailData {
  firstName: string
  courseName: string
  dateStr: string
  timeRange: string
  location: string | null
  tenantName: string
  primaryColor: string
  logoUrl: string | null
  dashboardLink: string
}

function buildCourseReminderEmail(d: CourseReminderEmailData): string {
  const logoHtml = d.logoUrl
    ? `<div style="margin-bottom:20px;text-align:center"><img src="${d.logoUrl}" alt="${d.tenantName}" style="height:40px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></div>`
    : `<div style="margin-bottom:20px;text-align:center"><div style="width:40px;height:40px;border-radius:10px;background:${d.primaryColor};color:white;font-size:20px;font-weight:700;line-height:40px;text-align:center;margin:0 auto">${d.tenantName.charAt(0).toUpperCase()}</div></div>`

  const rows: [string, string][] = [
    ['Kurs',  d.courseName],
    ['Datum', d.dateStr],
    ['Zeit',  d.timeRange],
  ]
  if (d.location) rows.push(['Ort', d.location])

  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px 8px 0;font-size:13px;color:#6b7280;white-space:nowrap;vertical-align:top">${label}</td>
      <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:500">${value}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">

        <!-- Logo above card -->
        <tr><td>${logoHtml}</td></tr>

        <!-- Card -->
        <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10)">

          <!-- Colored header -->
          <div style="background:${d.primaryColor};padding:28px 32px;text-align:center">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff">Erinnerung an Ihren Kurs</h1>
            <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">${d.tenantName}</p>
          </div>

          <!-- Body -->
          <div style="padding:28px 32px">
            <p style="margin:0 0 20px;font-size:15px;color:#374151">Hallo ${d.firstName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151">
              wir möchten Sie an Ihre bevorstehende Kurseinheit morgen erinnern:
            </p>

            <!-- Details table -->
            <div style="background:#f9fafb;border-radius:10px;padding:16px 20px;margin-bottom:24px">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <tr><td align="center">
                <a href="${d.dashboardLink}" style="display:inline-block;background:${d.primaryColor};color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
                  Meine Kurse ansehen →
                </a>
              </td></tr>
            </table>

            <p style="margin:0;font-size:13px;color:#9ca3af">
              Bei Fragen wenden Sie sich bitte an ${d.tenantName}. Bitte antworten Sie nicht auf diese automatische E-Mail.
            </p>
          </div>

          <!-- Footer -->
          <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;color:#9ca3af">${d.tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af;text-decoration:underline">Simy.ch</a></p>
          </div>

        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
