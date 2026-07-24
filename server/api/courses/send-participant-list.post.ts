// server/api/courses/send-participant-list.post.ts
// ============================================================
// On-demand: sends the participant list email for a specific course
// to the assigned instructor + all tenant admins.
//
// Called by the admin UI with a "Teilnehmerliste senden" button.
// Auth: requires valid admin/owner session.
// ============================================================

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // ── Auth (Bearer + httpOnly cookie + refresh fallback) ───────────────────
  const me = await requireAdminProfile(event, ['admin', 'owner', 'super_admin'])
  const supabase = getSupabaseAdmin()

  // ── Body ──────────────────────────────────────────────────
  const { courseId, sessionId } = await readBody(event)
  if (!courseId) throw createError({ statusCode: 400, statusMessage: 'courseId is required' })

  // ── Load course + sessions ─────────────────────────────────
  let sessionQuery = supabase
    .from('course_sessions')
    .select('id, session_number, start_time, end_time, custom_location, staff_id, instructor_type, external_instructor_email, external_instructor_name')
    .eq('course_id', courseId)
    .eq('tenant_id', me.tenant_id)
    .order('start_time', { ascending: true })

  if (sessionId) sessionQuery = sessionQuery.eq('id', sessionId)

  const { data: sessions, error: sessErr } = await sessionQuery
  if (sessErr || !sessions?.length) {
    throw createError({ statusCode: 404, statusMessage: 'No sessions found for this course' })
  }

  // ── Load course name ───────────────────────────────────────
  const { data: course } = await supabase
    .from('courses')
    .select('name')
    .eq('id', courseId)
    .single()
  const courseName = course?.name || 'Kurs'

  // ── Load tenant branding ────────────────────────────────────
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, primary_color, logo_wide_url, logo_url, logo_square_url')
    .eq('id', me.tenant_id)
    .single()
  const tenantName   = tenant?.name || 'Ihre Fahrschule'
  const primaryColor = tenant?.primary_color || '#2563eb'
  const logoUrl      = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null

  // ── Load staff emails ───────────────────────────────────────
  const staffIds = [...new Set(sessions.map((s: any) => s.staff_id).filter(Boolean))]
  const staffEmailMap = new Map<string, { email: string; name: string }>()
  if (staffIds.length > 0) {
    const { data: staffUsers } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .in('id', staffIds)
    for (const u of (staffUsers || []) as any[]) {
      if (u.email) staffEmailMap.set(u.id, { email: u.email, name: `${u.first_name} ${u.last_name}`.trim() })
    }
  }

  // ── Load tenant admins ──────────────────────────────────────
  const { data: admins } = await supabase
    .from('users')
    .select('email, first_name')
    .eq('tenant_id', me.tenant_id)
    .in('role', ['admin', 'owner'])
    .is('deleted_at', null)

  let totalSent = 0
  const sentTo: string[] = []

  for (const session of sessions as any[]) {
    // Load participants for this session
    const sessionNumberStr = String(session.session_number)
    const { data: regs } = await supabase
      .from('course_registrations')
      .select('id, first_name, last_name, email, phone, street, zip, city')
      .eq('course_id', courseId)
      .eq('status', 'confirmed')
      .is('deleted_at', null)
      .or(`custom_sessions.is.null,custom_sessions->>${sessionNumberStr}.is.null`)

    const participants = (regs || []) as any[]

    const { dateStr, timeRange } = formatSession(session)

    const html = buildStaffEmail({
      courseName, dateStr, timeRange,
      location: session.custom_location || null,
      participants,
      tenantName, primaryColor, logoUrl,
      isOnDemand: true,
    })
    const subject = `Teilnehmerliste: ${courseName} — ${dateStr} (${participants.length} Teilnehmer)`

    // Collect recipients: instructor + admins (deduped)
    const recipientSet = new Map<string, string>()
    if (session.instructor_type === 'external' && session.external_instructor_email) {
      recipientSet.set(session.external_instructor_email, session.external_instructor_name || 'Kursleiter')
    } else if (session.staff_id && staffEmailMap.has(session.staff_id)) {
      const s = staffEmailMap.get(session.staff_id)!
      recipientSet.set(s.email, s.name)
    }
    for (const a of (admins || []) as any[]) {
      if (a.email) recipientSet.set(a.email, a.first_name || 'Admin')
    }

    for (const [email] of recipientSet) {
      try {
        await sendEmail({ to: email, subject, html, senderName: tenantName })
        sentTo.push(email)
        totalSent++
      } catch (err: any) {
        logger.warn(`⚠️ Could not send participant list to ${email}:`, err?.message)
      }
    }
  }

  logger.debug(`✅ send-participant-list: ${totalSent} emails sent for course ${courseId}`)
  return {
    success: true,
    sent: totalSent,
    recipients: sentTo,
    message: `Teilnehmerliste an ${totalSent} Empfänger gesendet`
  }
})

// ── Helpers ────────────────────────────────────────────────────

function formatSession(session: any): { dateStr: string; timeRange: string } {
  const start = new Date(session.start_time)
  const end   = session.end_time ? new Date(session.end_time) : null
  const dateStr    = start.toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich' })
  const timeStr    = start.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })
  const timeEndStr = end?.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' }) ?? null
  return { dateStr, timeRange: timeEndStr ? `${timeStr}–${timeEndStr} Uhr` : `${timeStr} Uhr` }
}

function logoBlock(logoUrl: string | null, tenantName: string, primaryColor: string): string {
  return logoUrl
    ? `<div style="margin-bottom:20px;text-align:center"><img src="${logoUrl}" alt="${tenantName}" style="height:40px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></div>`
    : `<div style="margin-bottom:20px;text-align:center"><div style="width:40px;height:40px;border-radius:10px;background:${primaryColor};color:white;font-size:20px;font-weight:700;line-height:40px;text-align:center;margin:0 auto">${tenantName.charAt(0).toUpperCase()}</div></div>`
}

function buildStaffEmail(d: {
  courseName: string; dateStr: string; timeRange: string; location: string | null
  participants: any[]; tenantName: string; primaryColor: string; logoUrl: string | null
  isOnDemand?: boolean
}): string {
  const participantRows = d.participants.map((p: any, i: number) => {
    const phoneBtn = p.phone
      ? `<a href="tel:${p.phone}" style="display:inline-block;background:#f3f4f6;color:#374151;text-decoration:none;font-size:12px;font-weight:500;padding:5px 10px;border-radius:6px;border:1px solid #e5e7eb;margin-right:4px;white-space:nowrap">📞 ${p.phone}</a>`
      : ''
    const emailBtn = p.email
      ? `<a href="mailto:${p.email}" style="display:inline-block;background:#eff6ff;color:#2563eb;text-decoration:none;font-size:12px;font-weight:500;padding:5px 10px;border-radius:6px;border:1px solid #bfdbfe;white-space:nowrap">✉ ${p.email}</a>`
      : ''
    return `
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:12px 8px;font-size:13px;color:#9ca3af;text-align:center;vertical-align:middle">${i + 1}</td>
        <td style="padding:12px 8px;font-size:13px;color:#111827;font-weight:500;vertical-align:middle">${p.first_name || ''} ${p.last_name || ''}</td>
        <td style="padding:12px 8px;vertical-align:middle"><div style="display:flex;gap:6px;flex-wrap:wrap">${phoneBtn}${emailBtn}${!phoneBtn && !emailBtn ? '<span style="font-size:12px;color:#9ca3af">—</span>' : ''}</div></td>
      </tr>`
  }).join('')

  const headerTitle = d.isOnDemand ? 'Teilnehmerliste' : 'Kurs morgen'
  const headerSubline = d.isOnDemand
    ? `<p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.85)">Auf Anfrage versandt · ${d.tenantName}</p>`
    : `<p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85)">${d.tenantName}</p>`

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px">
      <tr><td>${logoBlock(d.logoUrl, d.tenantName, d.primaryColor)}</td></tr>
      <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10)">
        <div style="background:${d.primaryColor};padding:28px 32px">
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#fff">${headerTitle}</h1>
          ${headerSubline}
        </div>
        <div style="padding:24px 32px 0">
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#f9fafb;border-radius:10px;margin-bottom:24px">
            <tr><td style="padding:16px 20px">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280;white-space:nowrap;width:80px">Kurs</td>
                  <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600">${d.courseName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280">Datum</td>
                  <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500">${d.dateStr}</td>
                </tr>
                <tr>
                  <td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280">Zeit</td>
                  <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500">${d.timeRange}</td>
                </tr>
                ${d.location ? `<tr>
                  <td style="padding:6px 12px 6px 0;font-size:13px;color:#6b7280">Ort</td>
                  <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500">${d.location}</td>
                </tr>` : ''}
              </table>
            </td></tr>
          </table>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827">
            Teilnehmerliste
            <span style="display:inline-block;margin-left:8px;background:${d.primaryColor};color:#fff;font-size:12px;font-weight:700;padding:2px 10px;border-radius:20px">${d.participants.length}</span>
          </p>
        </div>
        <div style="overflow-x:auto">
          <table cellpadding="0" cellspacing="0" width="100%" style="min-width:480px">
            <thead>
              <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb">
                <th style="padding:10px 8px;font-size:11px;color:#9ca3af;text-align:center;font-weight:600;width:40px">#</th>
                <th style="padding:10px 8px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">Name</th>
                <th style="padding:10px 8px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">Kontakt</th>
              </tr>
            </thead>
            <tbody>${d.participants.length ? participantRows : '<tr><td colspan="3" style="padding:20px;text-align:center;font-size:13px;color:#9ca3af">Keine bestätigten Teilnehmer</td></tr>'}</tbody>
          </table>
        </div>
        <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:12px;color:#9ca3af">${d.tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af;text-decoration:underline">Simy.ch</a></p>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
