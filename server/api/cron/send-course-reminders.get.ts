// server/api/cron/send-course-reminders.get.ts
// ============================================================
// Queues course session reminder emails for next-day sessions.
//
// Schedule: daily at 07:00 UTC (09:00 Zürich summer / 08:00 winter)
// Window:   course_sessions starting between NOW()+20h and NOW()+28h
//
// Participant email:
//  - Course name, date, time, location, dashboard link
//  - Skipped if participant has swapped out this session (custom_sessions)
//
// Staff/admin email (1 per session):
//  - Internal staff: looked up via staff_id → users.email
//  - External instructor: external_instructor_email
//  - Full participant list: name, address, phone, email
//  - Tenant branding (color, logo)
//  - Also sent to tenant admin (users.role = 'admin')
//  - Skipped silently if no email available
//
// Dedup:
//  Participant: stage = 'course_reminder',       key: registration_id + session_id
//  Staff:       stage = 'course_staff_reminder', key: session_id
//
// Test mode:
//  ?test_registration_id=<uuid>
//  ?test_registration_id=<uuid>&test_email=<email>
// ============================================================

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  // ── Auth ────────────────────────────────────────────────────
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on send-course-reminders')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()

  const query = getQuery(event)
  const testRegistrationId = typeof query.test_registration_id === 'string' ? query.test_registration_id : null
  const testEmail = typeof query.test_email === 'string' ? query.test_email : null

  const windowStart = new Date(now.getTime() + 20 * 60 * 60 * 1000)
  const windowEnd   = new Date(now.getTime() + 28 * 60 * 60 * 1000)

  if (testRegistrationId) {
    logger.debug(`🧪 TEST MODE: registration ${testRegistrationId}${testEmail ? ` → ${testEmail}` : ''}`)
  } else {
    logger.debug('📅 send-course-reminders: window', windowStart.toISOString(), '→', windowEnd.toISOString())
  }

  // ── 1. Load sessions + registrations ──────────────────────────
  const sessionsMap = new Map<string, any>()
  // Map<session_id, registration[]>
  const sessionParticipants = new Map<string, any[]>()
  let registrations: any[] = []

  const REG_SELECT = `
    id, course_id, tenant_id, custom_sessions,
    email, first_name, last_name, phone,
    street, zip, city,
    course:courses!course_registrations_course_id_fkey ( id, name, tenant_id )
  `

  if (testRegistrationId) {
    const { data: reg, error: regError } = await supabase
      .from('course_registrations')
      .select(REG_SELECT)
      .eq('id', testRegistrationId)
      .eq('status', 'confirmed')
      .single()

    if (regError || !reg) {
      throw createError({ statusCode: 404, statusMessage: 'Registration not found or not confirmed' })
    }

    const { data: sessions } = await supabase
      .from('course_sessions')
      .select('id, course_id, tenant_id, session_number, start_time, end_time, custom_location, staff_id, instructor_type, external_instructor_email, external_instructor_name')
      .eq('course_id', reg.course_id)
      .gte('start_time', now.toISOString())
      .order('start_time', { ascending: true })
      .limit(1)

    for (const session of (sessions || []) as any[]) {
      sessionsMap.set(session.id, session)
      sessionParticipants.set(session.id, [reg])
      registrations.push({ ...reg, session })
    }
  } else {
    const { data: sessions, error: sessionsError } = await supabase
      .from('course_sessions')
      .select('id, course_id, tenant_id, session_number, start_time, end_time, custom_location, staff_id, instructor_type, external_instructor_email, external_instructor_name, course:courses!course_sessions_course_id_fkey(is_active, status)')
      .gte('start_time', windowStart.toISOString())
      .lt('start_time', windowEnd.toISOString())
      .eq('is_active', true)

    if (sessionsError) {
      logger.error('❌ Failed to fetch course sessions:', sessionsError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch course sessions' })
    }

    if (!sessions || sessions.length === 0) {
      logger.debug('ℹ️ No course sessions in window')
      return { success: true, queued_participants: 0, queued_staff: 0, skipped: 0, duration_ms: Date.now() - startTime }
    }

    logger.debug(`📋 Found ${sessions.length} session(s) in window`)

    for (const session of sessions as any[]) {
      // Only send for active courses
      if (session.course?.status !== 'active') continue

      sessionsMap.set(session.id, session)
      const sessionNumberStr = String(session.session_number)

      const { data: regs } = await supabase
        .from('course_registrations')
        .select(REG_SELECT)
        .eq('course_id', session.course_id)
        .eq('status', 'confirmed')
        .is('deleted_at', null)
        .or(`custom_sessions.is.null,custom_sessions->>${sessionNumberStr}.is.null`)

      const regList = (regs || []) as any[]
      sessionParticipants.set(session.id, regList)

      for (const reg of regList) {
        registrations.push({ ...reg, session })
      }
    }
  }

  // ── 2. Load tenants ───────────────────────────────────────────
  const tenantIds = [...new Set([
    ...registrations.map((r: any) => r.tenant_id || r.course?.tenant_id),
    ...[...sessionsMap.values()].map((s: any) => s.tenant_id),
  ].filter(Boolean))]

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, slug, primary_color, logo_wide_url, logo_url, logo_square_url')
    .in('id', tenantIds)
  const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t]))

  // ── 3. Load internal staff emails ─────────────────────────────
  const staffIds = [...new Set(
    [...sessionsMap.values()].map((s: any) => s.staff_id).filter(Boolean)
  )]
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

  // ── 4. Load tenant admin emails ───────────────────────────────
  // Admin gets the same participant list so they're always in the loop
  const { data: adminUsers } = await supabase
    .from('users')
    .select('id, tenant_id, email, first_name')
    .in('tenant_id', tenantIds)
    .in('role', ['admin', 'owner'])
    .is('deleted_at', null)
  const adminsByTenant = new Map<string, any[]>()
  for (const u of (adminUsers || []) as any[]) {
    if (!adminsByTenant.has(u.tenant_id)) adminsByTenant.set(u.tenant_id, [])
    adminsByTenant.get(u.tenant_id)!.push(u)
  }

  // ── 5. Dedup check ────────────────────────────────────────────
  const alreadyQueuedParticipant = new Set<string>()
  const alreadyQueuedStaff = new Set<string>()

  if (!testRegistrationId) {
    const { data: existing } = await (supabase as any)
      .from('outbound_messages_queue')
      .select('context_data')
      .in('context_data->>stage' as any, ['course_reminder', 'course_staff_reminder'])
      .in('status', ['pending', 'sending', 'sent'])
      .gte('created_at', new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString())

    for (const row of (existing || []) as any[]) {
      const stage = row.context_data?.stage
      if (stage === 'course_reminder') {
        alreadyQueuedParticipant.add(`${row.context_data?.registration_id}:${row.context_data?.session_id}`)
      } else if (stage === 'course_staff_reminder') {
        alreadyQueuedStaff.add(row.context_data?.session_id)
      }
    }
  }

  // ── 6. Build participant queue entries ─────────────────────────
  const toInsert: any[] = []
  let skipped = 0

  for (const item of registrations) {
    const { session } = item
    const courseName = item.course?.name || 'Kurs'
    const tenantId = item.tenant_id || item.course?.tenant_id
    const tenant = tenantMap.get(tenantId)

    const recipientEmail = testEmail || item.email
    if (!recipientEmail) { skipped++; continue }

    const dedupKey = `${item.id}:${session.id}`
    if (!testRegistrationId && alreadyQueuedParticipant.has(dedupKey)) { skipped++; continue }

    const tenantName   = tenant?.name || 'Driving Team'
    const primaryColor = tenant?.primary_color || '#2563eb'
    const logoUrl      = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
    const dashboardLink = tenant?.slug ? `https://app.simy.ch/${tenant.slug}/customer` : 'https://app.simy.ch'
    const { dateStr, timeRange } = formatSession(session)

    toInsert.push({
      tenant_id:       tenantId,
      channel:         'email',
      recipient_email: recipientEmail,
      subject:         `Erinnerung: ${courseName} morgen, ${dateStr}`,
      body:            buildParticipantReminderEmail({
        firstName: item.first_name || 'Hallo',
        courseName, dateStr, timeRange,
        location: session.custom_location || null,
        tenantName, primaryColor, logoUrl, dashboardLink,
      }),
      status:   'pending',
      send_at:  now.toISOString(),
      context_data: {
        stage: 'course_reminder', registration_id: item.id,
        session_id: session.id, course_name: courseName, tenant_name: tenantName,
      }
    })
  }

  // ── 7. Build staff + admin queue entries (1 per session) ───────
  for (const [sessionId, session] of sessionsMap) {
    if (!testRegistrationId && alreadyQueuedStaff.has(sessionId)) continue

    const tenantId = session.tenant_id
    const tenant = tenantMap.get(tenantId)
    const tenantName   = tenant?.name || 'Driving Team'
    const primaryColor = tenant?.primary_color || '#2563eb'
    const logoUrl      = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null

    const sampleReg = registrations.find((r: any) => r.session.id === sessionId)
    const courseName = sampleReg?.course?.name || 'Kurs'
    const { dateStr, timeRange } = formatSession(session)
    const participants = sessionParticipants.get(sessionId) || []

    // Collect all recipients: instructor + admins (deduped by email)
    const recipientSet = new Map<string, string>() // email → name

    if (session.instructor_type === 'external' && session.external_instructor_email) {
      recipientSet.set(session.external_instructor_email, session.external_instructor_name || 'Kursleiter')
    } else if (session.staff_id && staffEmailMap.has(session.staff_id)) {
      const s = staffEmailMap.get(session.staff_id)!
      recipientSet.set(s.email, s.name)
    }

    for (const admin of (adminsByTenant.get(tenantId) || [])) {
      if (admin.email) recipientSet.set(admin.email, admin.first_name || 'Admin')
    }

    if (recipientSet.size === 0) continue

    const html = buildStaffReminderEmail({
      courseName, dateStr, timeRange,
      location: session.custom_location || null,
      participants,
      tenantName, primaryColor, logoUrl,
    })

    for (const [email, name] of recipientSet) {
      const recipientEmail = testEmail || email
      toInsert.push({
        tenant_id:       tenantId,
        channel:         'email',
        recipient_email: recipientEmail,
        subject:         `Kurs morgen: ${courseName} — ${participants.length} Teilnehmer`,
        body:            html,
        status:          'pending',
        send_at:         now.toISOString(),
        context_data: {
          stage: 'course_staff_reminder', session_id: sessionId,
          course_name: courseName, tenant_name: tenantName, recipient_name: name,
        }
      })
    }
  }

  if (toInsert.length === 0) {
    logger.debug('ℹ️ No new course reminders to queue')
    return { success: true, queued_participants: 0, queued_staff: 0, skipped, duration_ms: Date.now() - startTime }
  }

  // ── 8. Insert into queue ───────────────────────────────────────
  const { error: insertError } = await supabase
    .from('outbound_messages_queue')
    .insert(toInsert)

  if (insertError) {
    logger.error('❌ Failed to insert course reminders:', insertError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to queue course reminders' })
  }

  const queuedParticipants = toInsert.filter(r => r.context_data.stage === 'course_reminder').length
  const queuedStaff        = toInsert.filter(r => r.context_data.stage === 'course_staff_reminder').length

  logger.debug(`✅ send-course-reminders: ${queuedParticipants} participant + ${queuedStaff} staff/admin emails in ${Date.now() - startTime}ms`)

  return {
    success: true,
    queued_participants: queuedParticipants,
    queued_staff:        queuedStaff,
    skipped,
    duration_ms: Date.now() - startTime,
  }
})

// ── Helpers ────────────────────────────────────────────────────

function formatSession(session: any): { dateStr: string; timeRange: string } {
  const start = new Date(session.start_time)
  const end   = session.end_time ? new Date(session.end_time) : null
  const dateStr = start.toLocaleDateString('de-CH', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich'
  })
  const timeStr    = start.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })
  const timeEndStr = end?.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' }) ?? null
  return { dateStr, timeRange: timeEndStr ? `${timeStr}–${timeEndStr} Uhr` : `${timeStr} Uhr` }
}

function logoBlock(logoUrl: string | null, tenantName: string, primaryColor: string): string {
  return logoUrl
    ? `<div style="margin-bottom:20px;text-align:center"><img src="${logoUrl}" alt="${tenantName}" style="height:40px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></div>`
    : `<div style="margin-bottom:20px;text-align:center"><div style="width:40px;height:40px;border-radius:10px;background:${primaryColor};color:white;font-size:20px;font-weight:700;line-height:40px;text-align:center;margin:0 auto">${tenantName.charAt(0).toUpperCase()}</div></div>`
}

// ── Participant reminder email ──────────────────────────────────

function buildParticipantReminderEmail(d: {
  firstName: string; courseName: string; dateStr: string; timeRange: string
  location: string | null; tenantName: string; primaryColor: string
  logoUrl: string | null; dashboardLink: string
}): string {
  const rows: [string, string][] = [
    ['Kurs', d.courseName], ['Datum', d.dateStr], ['Zeit', d.timeRange],
  ]
  if (d.location) rows.push(['Ort', d.location])

  const rowsHtml = rows.map(([l, v]) => `
    <tr>
      <td style="padding:8px 12px 8px 0;font-size:13px;color:#6b7280;white-space:nowrap;vertical-align:top">${l}</td>
      <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:500">${v}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">
      <tr><td>${logoBlock(d.logoUrl, d.tenantName, d.primaryColor)}</td></tr>
      <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10)">
        <div style="background:${d.primaryColor};padding:28px 32px;text-align:center">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff">Erinnerung an Ihren Kurs</h1>
          <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">${d.tenantName}</p>
        </div>
        <div style="padding:28px 32px">
          <p style="margin:0 0 20px;font-size:15px;color:#374151">Hallo ${d.firstName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151">wir möchten Sie an Ihre bevorstehende Kurseinheit morgen erinnern:</p>
          <div style="background:#f9fafb;border-radius:10px;padding:16px 20px;margin-bottom:24px">
            <table cellpadding="0" cellspacing="0" width="100%"><tbody>${rowsHtml}</tbody></table>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
            <tr><td align="center">
              <a href="${d.dashboardLink}" style="display:inline-block;background:${d.primaryColor};color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">Meine Kurse ansehen →</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#9ca3af">Bei Fragen wenden Sie sich bitte an ${d.tenantName}.</p>
        </div>
        <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:12px;color:#9ca3af">${d.tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af;text-decoration:underline">Simy.ch</a></p>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

// ── Staff/admin reminder email with participant list ────────────

function buildStaffReminderEmail(d: {
  courseName: string; dateStr: string; timeRange: string; location: string | null
  participants: any[]; tenantName: string; primaryColor: string; logoUrl: string | null
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

  const emptyRow = `<tr><td colspan="3" style="padding:20px;text-align:center;font-size:13px;color:#9ca3af">Keine bestätigten Teilnehmer</td></tr>`

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:680px">
      <tr><td>${logoBlock(d.logoUrl, d.tenantName, d.primaryColor)}</td></tr>
      <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10)">

        <!-- Header -->
        <div style="background:${d.primaryColor};padding:28px 32px">
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#fff">Kurs morgen</h1>
          <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85)">${d.tenantName}</p>
        </div>

        <!-- Session info -->
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

          <!-- Participant count badge -->
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827">
            Teilnehmerliste
            <span style="display:inline-block;margin-left:8px;background:${d.primaryColor};color:#fff;font-size:12px;font-weight:700;padding:2px 10px;border-radius:20px">${d.participants.length}</span>
          </p>
        </div>

        <!-- Participant table -->
        <div style="padding:0 32px 28px">
          <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;border-collapse:separate;border-spacing:0">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:10px 8px;font-size:12px;color:#6b7280;font-weight:600;text-align:center;border-bottom:1px solid #e5e7eb;width:32px">#</th>
                <th style="padding:10px 8px;font-size:12px;color:#6b7280;font-weight:600;text-align:left;border-bottom:1px solid #e5e7eb">Name</th>
                <th style="padding:10px 8px;font-size:12px;color:#6b7280;font-weight:600;text-align:left;border-bottom:1px solid #e5e7eb">Kontakt</th>
              </tr>
            </thead>
            <tbody>${d.participants.length > 0 ? participantRows : emptyRow}</tbody>
          </table>
        </div>

        <!-- Footer -->
        <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:12px;color:#9ca3af">${d.tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af;text-decoration:underline">Simy.ch</a></p>
        </div>

      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
