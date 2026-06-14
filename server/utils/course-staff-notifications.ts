/**
 * Shared utility for course staff appointment management and email notifications.
 *
 * Used by:
 *  - /api/admin/courses/upsert (manual courses)
 *  - /api/admin/courses/update-session-instructors (SARI courses — staff reassignment)
 *  - sari-sync-engine (auto-match + initial notification on sync)
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { sendTenantEmail, sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CourseSessionForNotification {
  id: string
  start_time: string    // ISO
  end_time:   string    // ISO
  description?: string | null
  instructor_type?: 'internal' | 'external' | null
  staff_id?:  string | null
  external_instructor_name?:  string | null
  external_instructor_email?: string | null
  external_instructor_phone?: string | null
}

export interface CourseForNotification {
  id:         string
  name:       string
  tenant_id:  string
  category?:  string | null
  course_category?: { name: string; icon?: string } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-CH', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
}

function apptTitle(course: CourseForNotification, sessions: CourseSessionForNotification[]) {
  const label = course.course_category?.name || course.name || 'Kurs'
  const firstStart = sessions
    .slice()
    .sort((a, b) => a.start_time.localeCompare(b.start_time))[0]?.start_time
  const time = firstStart ? fmtTime(firstStart) : ''
  return `${label} – ab ${time}`
}

// ── Core: create/delete appointments for a staff member ───────────────────────

/** Delete all course-related appointments for a specific staff + course. */
export async function deleteStaffCourseAppointments(
  supabase: SupabaseClient,
  staffId: string,
  courseId: string,
) {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('staff_id', staffId)
    .eq('notes', `course:${courseId}`)

  if (error) logger.warn(`⚠️ Could not delete course appointments for staff ${staffId}:`, error.message)
}

/** Create appointments for one staff member across all their sessions in a course. */
export async function createStaffCourseAppointments(
  supabase: SupabaseClient,
  staffId: string,
  course: CourseForNotification,
  sessions: CourseSessionForNotification[],
) {
  const title = apptTitle(course, sessions)

  const rows = sessions.map((s) => {
    const startMs = new Date(s.start_time).getTime() - 30 * 60 * 1000
    const endMs   = new Date(s.end_time).getTime()   + 30 * 60 * 1000
    return {
      tenant_id:        course.tenant_id,
      staff_id:         staffId,
      user_id:          null,
      start_time:       new Date(startMs).toISOString(),
      end_time:         new Date(endMs).toISOString(),
      duration_minutes: Math.round((endMs - startMs) / 60000),
      event_type_code:  'course',
      title,
      description:      s.description || '',
      status:           'confirmed',
      notes:            `course:${course.id}`,
    }
  })

  const { error } = await supabase.from('appointments').insert(rows)
  if (error) logger.warn(`⚠️ Could not create course appointments for staff ${staffId}:`, error.message)
  else logger.debug(`✅ ${rows.length} course appointments created for staff ${staffId}`)
}

// ── Email builders ─────────────────────────────────────────────────────────────

function sessionTable(sessions: CourseSessionForNotification[]) {
  return sessions
    .slice()
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((s) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${fmtDate(s.start_time)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${fmtTime(s.start_time)} – ${fmtTime(s.end_time)} Uhr</td>
    </tr>`)
    .join('')
}

function emailWrapper(headerTitle: string, body: string, footerName: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)}
.header{background:linear-gradient(135deg,#1e293b,#334155);padding:28px 32px}
.header h1{margin:0;color:#fff;font-size:20px;font-weight:700}
.body{padding:32px}table{width:100%;border-collapse:collapse}
th{text-align:left;padding:8px 12px;background:#f9fafb;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
.footer{border-top:1px solid #f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center}</style></head>
<body><div class="wrap">
<div class="header"><h1>${headerTitle}</h1></div>
<div class="body">${body}</div>
<div class="footer">${footerName} · Powered by Simy.ch</div>
</div></body></html>`
}

// ── Notification: new assignment ───────────────────────────────────────────────

export async function notifyStaffAssigned(
  supabase: SupabaseClient,
  staffId: string,
  course: CourseForNotification,
  sessions: CourseSessionForNotification[],
) {
  const { data: staffUser } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', staffId)
    .single()

  if (!staffUser?.email) {
    logger.warn(`⚠️ Staff ${staffId} has no email — skipping assignment notification`)
    return
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, from_email, resend_domain_verified')
    .eq('id', course.tenant_id)
    .single()

  const courseLabel = course.course_category?.name || course.name || 'Kurs'
  const rows = sessionTable(sessions)

  const html = emailWrapper(
    '📅 Kurs-Zuteilung',
    `<p>Hallo ${staffUser.first_name},</p>
    <p>Du wurdest als Instruktor/in für den folgenden Kurs eingeplant:</p>
    <p style="font-size:18px;font-weight:700;color:#1e293b;margin:16px 0">${courseLabel}</p>
    <table><thead><tr>
      <th>Datum</th><th>Zeit</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <p style="margin-top:24px;color:#6b7280;font-size:14px">Die Termine sind bereits in deinem Kalender eingetragen.</p>`,
    tenant?.name || 'Simy',
  )

  try {
    await sendEmail({
      to: staffUser.email,
      subject: `Kurs-Zuteilung: ${courseLabel}`,
      html,
      fromName: tenant?.name ?? undefined,
      fromEmail: tenant?.from_email ?? null,
      domainVerified: tenant?.resend_domain_verified ?? false,
    })
    logger.debug(`✅ Assignment email sent to ${staffUser.email}`)
  } catch (e: any) {
    logger.warn(`⚠️ Could not send assignment email to ${staffUser.email}:`, e.message)
  }
}

// ── Notification: removed from course ─────────────────────────────────────────

export async function notifyStaffRemoved(
  supabase: SupabaseClient,
  staffId: string,
  course: CourseForNotification,
  sessions: CourseSessionForNotification[],
) {
  const { data: staffUser } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', staffId)
    .single()

  if (!staffUser?.email) return

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, from_email, resend_domain_verified')
    .eq('id', course.tenant_id)
    .single()

  const courseLabel = course.course_category?.name || course.name || 'Kurs'
  const rows = sessionTable(sessions)

  const html = emailWrapper(
    '❌ Kurs-Zuteilung entfernt',
    `<p>Hallo ${staffUser.first_name},</p>
    <p>Deine Zuteilung als Instruktor/in für den folgenden Kurs wurde aufgehoben:</p>
    <p style="font-size:18px;font-weight:700;color:#dc2626;margin:16px 0">${courseLabel}</p>
    <table><thead><tr>
      <th>Datum</th><th>Zeit</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <p style="margin-top:24px;color:#6b7280;font-size:14px">Die Kalendertermine wurden automatisch entfernt.</p>`,
    tenant?.name || 'Simy',
  )

  try {
    await sendEmail({
      to: staffUser.email,
      subject: `Kurs-Zuteilung aufgehoben: ${courseLabel}`,
      html,
      fromName: tenant?.name ?? undefined,
      fromEmail: tenant?.from_email ?? null,
      domainVerified: tenant?.resend_domain_verified ?? false,
    })
    logger.debug(`✅ Removal email sent to ${staffUser.email}`)
  } catch (e: any) {
    logger.warn(`⚠️ Could not send removal email to ${staffUser.email}:`, e.message)
  }
}

// ── Fuzzy name matching: SARI instructor → internal staff ─────────────────────

export function normalizeNameForMatch(name: string): string {
  return name.toLowerCase().replace(/[^a-züöäéàè\s]/g, '').replace(/\s+/g, ' ').trim()
}

export async function matchSariInstructorToStaff(
  supabase: SupabaseClient,
  tenantId: string,
  instructorName: string | null | undefined,
): Promise<string | null> {
  if (!instructorName) return null

  const { data: staffList } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('tenant_id', tenantId)
    .in('role', ['staff', 'admin'])

  if (!staffList?.length) return null

  const needle = normalizeNameForMatch(instructorName)

  for (const u of staffList) {
    const full = normalizeNameForMatch(`${u.first_name} ${u.last_name}`)
    const reversed = normalizeNameForMatch(`${u.last_name} ${u.first_name}`)
    if (full === needle || reversed === needle) {
      logger.debug(`✅ SARI instructor "${instructorName}" matched to staff ${u.id}`)
      return u.id
    }
  }

  // Partial match fallback: both parts present
  const parts = needle.split(' ')
  for (const u of staffList) {
    const full = normalizeNameForMatch(`${u.first_name} ${u.last_name}`)
    if (parts.every((p) => full.includes(p))) {
      logger.debug(`✅ SARI instructor "${instructorName}" partial-matched to staff ${u.id}`)
      return u.id
    }
  }

  logger.debug(`ℹ️ No staff match for SARI instructor "${instructorName}"`)
  return null
}

// ── Historical email lookup for external instructors ──────────────────────────
/**
 * Search previous course_sessions for the same external instructor name
 * to find a previously stored email address.
 */
export async function lookupExternalInstructorEmail(
  supabase: SupabaseClient,
  tenantId: string,
  instructorName: string,
): Promise<string | null> {
  if (!instructorName) return null

  const needle = normalizeNameForMatch(instructorName)

  const { data: sessions } = await supabase
    .from('course_sessions')
    .select('external_instructor_name, external_instructor_email')
    .eq('tenant_id', tenantId)
    .eq('instructor_type', 'external')
    .not('external_instructor_email', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  for (const s of sessions || []) {
    if (!s.external_instructor_name || !s.external_instructor_email) continue
    const candidate = normalizeNameForMatch(s.external_instructor_name)
    const parts = needle.split(' ')
    if (candidate === needle || parts.every((p) => candidate.includes(p))) {
      logger.debug(`✅ Found historical email for external instructor "${instructorName}"`)
      return s.external_instructor_email as string
    }
  }

  logger.debug(`ℹ️ No historical email found for external instructor "${instructorName}"`)
  return null
}

// ── ICS builder (shared) ──────────────────────────────────────────────────────

function toIcsDate(dateStr: string, timeStr: string): string {
  return `${dateStr.replace(/-/g, '')}T${timeStr.replace(':', '')}00`
}

export function buildIcs(events: Array<{
  uid: string
  date: string
  startTime: string
  endTime: string
  summary: string
  description: string
  organizerName: string
  organizerEmail: string
  attendeeName: string
  attendeeEmail: string
}>): Buffer {
  const vtimezone = [
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Zurich',
    'BEGIN:STANDARD',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=10',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYDAY=-1SU;BYMONTH=3',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
  ].join('\r\n')

  const vevents = events.map((e) => [
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTART;TZID=Europe/Zurich:${toIcsDate(e.date, e.startTime)}`,
    `DTEND;TZID=Europe/Zurich:${toIcsDate(e.date, e.endTime)}`,
    `SUMMARY:${e.summary}`,
    `DESCRIPTION:${e.description.replace(/\n/g, '\\n')}`,
    `ORGANIZER;CN=${e.organizerName}:mailto:${e.organizerEmail}`,
    `ATTENDEE;CN=${e.attendeeName};RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:${e.attendeeEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
  ].join('\r\n')).join('\r\n')

  return Buffer.from(
    ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Simy//Simy Fahrschule//DE', 'METHOD:REQUEST', vtimezone, vevents, 'END:VCALENDAR'].join('\r\n'),
    'utf-8',
  )
}

// ── Admin notification: missing external instructor email ─────────────────────
/**
 * Sends an email to the tenant admin when an external instructor has no email
 * and no historical record could be found.
 */
export async function notifyAdminMissingExternalEmail(
  supabase: SupabaseClient,
  tenantId: string,
  courseName: string,
  instructorName: string,
  sessions: CourseSessionForNotification[],
) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, from_email, resend_domain_verified')
    .eq('id', tenantId)
    .single()

  // Find admin email (tenant owner / admin role)
  const { data: admins } = await supabase
    .from('users')
    .select('email')
    .eq('tenant_id', tenantId)
    .eq('role', 'admin')
    .not('email', 'is', null)
    .limit(3)

  const adminEmails = (admins || []).map((a) => a.email).filter(Boolean) as string[]
  if (adminEmails.length === 0) return

  const tenantName = tenant?.name || 'Simy'
  const sessionRows = sessions
    .slice()
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((s) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${fmtDate(s.start_time)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${fmtTime(s.start_time)} – ${fmtTime(s.end_time)} Uhr</td>
    </tr>`)
    .join('')

  const html = emailWrapper(
    '⚠️ E-Mail für externen Instruktor fehlt',
    `<p>Beim SARI-Sync wurde ein externer Instruktor erkannt, für den noch keine E-Mail-Adresse hinterlegt ist:</p>
    <p style="font-size:16px;font-weight:700;color:#1e293b;margin:16px 0">
      ${instructorName}
    </p>
    <p>Kurs: <strong>${courseName}</strong></p>
    <p>Betroffene Sessions:</p>
    <table><thead><tr><th>Datum</th><th>Zeit</th></tr></thead><tbody>${sessionRows}</tbody></table>
    <p style="margin-top:24px;color:#6b7280;font-size:14px">
      Bitte E-Mail-Adresse im Kurs-Detail hinterlegen, damit der Instruktor eine Kalendereinladung erhält.
    </p>`,
    tenantName,
  )

  try {
    await sendEmail({
      to: adminEmails,
      subject: `Aktion erforderlich: E-Mail für externen Instruktor "${instructorName}" fehlt`,
      html,
      fromName: tenantName,
      fromEmail: tenant?.from_email ?? null,
      domainVerified: tenant?.resend_domain_verified ?? false,
    })
    logger.debug(`✅ Admin notified about missing external instructor email: ${instructorName}`)
  } catch (e: any) {
    logger.warn('⚠️ Could not send admin missing-email notification:', e.message)
  }
}

// ── Send ICS invite to external instructor ────────────────────────────────────
export async function sendExternalInstructorInvite(
  supabase: SupabaseClient,
  tenantId: string,
  course: CourseForNotification,
  instructorName: string,
  instructorEmail: string,
  sessions: CourseSessionForNotification[],
) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, from_email, resend_domain_verified')
    .eq('id', tenantId)
    .single()

  const organizerName  = tenant?.name || 'Fahrschule'
  const organizerEmail = (tenant?.resend_domain_verified && tenant?.from_email)
    ? tenant.from_email
    : 'noreply@simy.ch'

  const courseLabel = course.course_category?.name || course.name || 'Kurs'
  const sorted = sessions.slice().sort((a, b) => a.start_time.localeCompare(b.start_time))
  const firstStart = sorted[0]?.start_time
  const startTimeLabel = firstStart ? fmtTime(firstStart) : ''
  const dateLabel = firstStart ? fmtDate(firstStart) : ''
  const summary = `${courseLabel} – ab ${startTimeLabel}`

  const icsEvents = sorted.map((s, i) => {
    const d = s.start_time.slice(0, 10)
    const st = fmtTime(s.start_time)
    const et = fmtTime(s.end_time)
    return {
      uid:            `${course.id}-ext-${i}@simy.ch`,
      date:           d,
      startTime:      st,
      endTime:        et,
      summary,
      description:    s.description || `Session ${i + 1}`,
      organizerName,
      organizerEmail,
      attendeeName:   instructorName,
      attendeeEmail:  instructorEmail,
    }
  })

  const icsBuffer = buildIcs(icsEvents)

  const sessionRows = sorted.map((s) => `<tr>
    <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${fmtDate(s.start_time)}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${fmtTime(s.start_time)} – ${fmtTime(s.end_time)} Uhr</td>
  </tr>`).join('')

  const html = emailWrapper(
    '📅 Kurseinladung',
    `<p>Hallo ${instructorName},</p>
    <p>Sie wurden als externer Instruktor/in für den folgenden Kurs eingeplant:</p>
    <p style="font-size:18px;font-weight:700;color:#1e293b;margin:16px 0">${courseLabel}</p>
    <p style="color:#6b7280;margin-bottom:24px">Kursbeginn: ${dateLabel}</p>
    <table><thead><tr><th>Datum</th><th>Zeit</th></tr></thead><tbody>${sessionRows}</tbody></table>
    <p style="margin-top:24px;color:#6b7280;font-size:14px">
      Im Anhang finden Sie eine Kalender-Einladung (.ics). Öffnen Sie diese, um alle Termine direkt in Ihren Kalender zu übernehmen.
    </p>`,
    organizerName,
  )

  try {
    await sendEmail({
      to: instructorEmail,
      subject: `Kurseinladung: ${courseLabel} ab ${dateLabel}`,
      html,
      fromName: organizerName,
      fromEmail: tenant?.from_email ?? null,
      domainVerified: tenant?.resend_domain_verified ?? false,
      attachments: [{ filename: `kurs-${course.id.slice(0, 8)}.ics`, content: icsBuffer }],
    })
    logger.debug(`✅ ICS invite sent to external instructor ${instructorEmail}`)
  } catch (e: any) {
    logger.warn(`⚠️ Could not send ICS invite to ${instructorEmail}:`, e.message)
  }
}

// ── Admin reminder: SARI courses without instructor ───────────────────────────

export interface MissingInstructorEntry {
  courseId: string
  courseName: string
  firstSession: string  // ISO start_time of earliest session
  sessionCount: number
}

/**
 * After a SARI sync, queries all active SARI-managed courses for this tenant
 * that have at least one session without an instructor, then sends a single
 * summary reminder email to all tenant admins.
 * The email is only sent if there are actually affected courses.
 */
export async function notifyAdminMissingInstructors(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<void> {
  // Dedup: only send once per day per tenant
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentAlert } = await (supabase as any)
    .from('outbound_messages_queue')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('context_data->>stage' as any, 'sari_missing_instructor_alert')
    .gte('created_at', oneDayAgo)
    .limit(1)

  if (recentAlert && recentAlert.length > 0) {
    logger.debug('⏭️ Missing-instructor admin alert already sent in the last 24h — skipping')
    return
  }

  // Find sessions of SARI courses that have no instructor assigned yet,
  // for future dates only (don't nag about past courses).
  const { data: rows } = await supabase
    .from('course_sessions')
    .select('id, course_id, start_time, courses!inner(id, name, sari_managed, status, tenant_id)')
    .eq('courses.tenant_id', tenantId)
    .eq('courses.sari_managed', true)
    .neq('courses.status', 'cancelled')
    .is('staff_id', null)
    .is('external_instructor_name', null)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })

  if (!rows || rows.length === 0) return

  // Aggregate by course
  const byCoursemap = new Map<string, MissingInstructorEntry>()
  for (const row of rows) {
    const course = row.courses as any
    if (!byCoursemap.has(row.course_id)) {
      byCoursemap.set(row.course_id, {
        courseId: row.course_id,
        courseName: course.name,
        firstSession: row.start_time,
        sessionCount: 1,
      })
    } else {
      byCoursemap.get(row.course_id)!.sessionCount++
    }
  }
  const affected = Array.from(byCoursemap.values()).sort((a, b) =>
    a.firstSession.localeCompare(b.firstSession),
  )

  // Load tenant + admins
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, from_email, resend_domain_verified')
    .eq('id', tenantId)
    .single()

  const { data: admins } = await supabase
    .from('users')
    .select('email')
    .eq('tenant_id', tenantId)
    .eq('role', 'admin')
    .not('email', 'is', null)
    .limit(5)

  const adminEmails = (admins || []).map((a) => a.email).filter(Boolean) as string[]
  if (adminEmails.length === 0) return

  const tenantName = tenant?.name || 'Simy'

  const tableRows = affected.map((c) => `<tr>
    <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${c.courseName}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${fmtDate(c.firstSession)}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center">${c.sessionCount}</td>
  </tr>`).join('')

  const html = emailWrapper(
    '⚠️ Pendenzen: SARI-Kurse ohne Instruktor',
    `<p>Nach dem letzten SARI-Sync gibt es noch <strong>${affected.length} Kurs${affected.length === 1 ? '' : 'e'}</strong> ohne zugewiesenen Instruktor:</p>
    <table>
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 12px">Kurs</th>
          <th style="text-align:left;padding:8px 12px">Erster Termin</th>
          <th style="text-align:center;padding:8px 12px">Sessions</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    <p style="margin-top:24px;color:#6b7280;font-size:14px">
      Bitte weise in der Kursübersicht für jeden Kurs einen Instruktor zu, damit die Mitarbeitenden benachrichtigt werden und die Termine in ihrem Kalender erscheinen.
    </p>`,
    tenantName,
  )

  try {
    await sendEmail({
      to: adminEmails,
      subject: `Aktion erforderlich: ${affected.length} SARI-Kurs${affected.length === 1 ? '' : 'e'} ohne Instruktor`,
      html,
      fromName: tenantName,
      fromEmail: tenant?.from_email ?? null,
      domainVerified: tenant?.resend_domain_verified ?? false,
    })
    logger.debug(`✅ Admin reminded about ${affected.length} SARI courses missing instructors`)

    // Record dedup entry so we don't send again within 24h
    await (supabase as any)
      .from('outbound_messages_queue')
      .insert({
        tenant_id:       tenantId,
        channel:         'email',
        recipient_email: adminEmails[0],
        subject:         `Aktion erforderlich: ${affected.length} SARI-Kurse ohne Instruktor`,
        body:            '<!-- dedup sentinel -->',
        status:          'sent',
        send_at:         new Date().toISOString(),
        context_data: {
          stage:           'sari_missing_instructor_alert',
          affected_count:  affected.length,
        },
      })
  } catch (e: any) {
    logger.warn('⚠️ Could not send missing-instructor reminder email:', e.message)
  }
}
