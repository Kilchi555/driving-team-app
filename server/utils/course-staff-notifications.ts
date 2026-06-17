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
    timeZone: 'Europe/Zurich',
  })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-CH', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Zurich',
  })
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

/**
 * Merges sessions that are directly consecutive (gap ≤ 5 min) into single blocks.
 * Returns padded blocks: 45 min before first session, 15 min after last.
 */
function buildAppointmentBlocks(
  sessions: CourseSessionForNotification[],
): Array<{ startMs: number; endMs: number }> {
  const sorted = [...sessions].sort((a, b) => a.start_time.localeCompare(b.start_time))
  const raw: Array<{ startMs: number; endMs: number }> = []

  for (const s of sorted) {
    const startMs = new Date(s.start_time).getTime()
    const endMs   = new Date(s.end_time).getTime()
    const last    = raw[raw.length - 1]

    if (last && startMs - last.endMs <= 5 * 60 * 1000) {
      last.endMs = Math.max(last.endMs, endMs)
    } else {
      raw.push({ startMs, endMs })
    }
  }

  return raw.map((b) => ({
    startMs: b.startMs - 45 * 60 * 1000,
    endMs:   b.endMs   + 15 * 60 * 1000,
  }))
}

/** Create appointments for one staff member across all their sessions in a course. */
export async function createStaffCourseAppointments(
  supabase: SupabaseClient,
  staffId: string,
  course: CourseForNotification,
  sessions: CourseSessionForNotification[],
) {
  const title = apptTitle(course, sessions)
  const blocks = buildAppointmentBlocks(sessions)

  const rows = blocks.map((b) => ({
    tenant_id:        course.tenant_id,
    staff_id:         staffId,
    user_id:          null,
    start_time:       new Date(b.startMs).toISOString(),
    end_time:         new Date(b.endMs).toISOString(),
    duration_minutes: Math.round((b.endMs - b.startMs) / 60000),
    event_type_code:  'course',
    title,
    description:      '',
    status:           'confirmed',
    notes:            `course:${course.id}`,
  }))

  const { error } = await supabase.from('appointments').insert(rows)
  if (error) logger.warn(`⚠️ Could not create course appointments for staff ${staffId}:`, error.message)
  else logger.debug(`✅ ${rows.length} course appointments created for staff ${staffId}`)
}

// ── Email builders ─────────────────────────────────────────────────────────────

/** Groups sessions that fall on the same day into a single row (start–end of that day). */
function groupSessionsByDay(sessions: CourseSessionForNotification[]) {
  const sorted = [...sessions].sort((a, b) => a.start_time.localeCompare(b.start_time))
  const byDate = new Map<string, CourseSessionForNotification[]>()
  for (const s of sorted) {
    const date = s.start_time.split('T')[0]
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(s)
  }
  return Array.from(byDate.entries()).map(([, daySessions]) => ({
    startTime: daySessions[0].start_time,
    endTime:   daySessions[daySessions.length - 1].end_time,
    count:     daySessions.length,
  }))
}

function sessionTable(sessions: CourseSessionForNotification[]) {
  return groupSessionsByDay(sessions)
    .map((g) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${fmtDate(g.startTime)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${fmtTime(g.startTime)} – ${fmtTime(g.endTime)} Uhr</td>
    </tr>`)
    .join('')
}

interface TenantBranding {
  name: string
  primaryColor: string
  logoUrl: string | null
}

function emailWrapper(headerTitle: string, body: string, footerName: string, branding?: TenantBranding) {
  const color   = branding?.primaryColor || '#1e293b'
  const logoUrl = branding?.logoUrl || null
  const logoHtml = logoUrl
    ? `<div style="text-align:center;margin-bottom:20px"><img src="${logoUrl}" alt="${branding?.name || ''}" style="height:44px;max-width:220px;object-fit:contain;display:block;margin:0 auto"></div>`
    : ''
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)}
.header{background:${color};padding:28px 32px}
.header h1{margin:0;color:#fff;font-size:20px;font-weight:700}
.body{padding:32px}table{width:100%;border-collapse:collapse}
th{text-align:left;padding:8px 12px;background:#f9fafb;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
.footer{border-top:1px solid #f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center}</style></head>
<body><div class="wrap">
${logoHtml ? `<div style="background:#fff;padding:20px 32px 0">${logoHtml}</div>` : ''}
<div class="header"><h1>${headerTitle}</h1></div>
<div class="body">${body}</div>
<div class="footer">${footerName} · Powered by <a href="https://simy.ch" style="color:#9ca3af;text-decoration:underline">Simy.ch</a></div>
</div></body></html>`
}

function extractBranding(tenant: any): TenantBranding {
  return {
    name: tenant?.name || 'Simy',
    primaryColor: tenant?.primary_color || '#1e293b',
    logoUrl: tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null,
  }
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
    .select('name, from_email, resend_domain_verified, primary_color, logo_wide_url, logo_url, logo_square_url')
    .eq('id', course.tenant_id)
    .single()

  const branding = extractBranding(tenant)
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
    branding.name,
    branding,
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
    .select('name, from_email, resend_domain_verified, primary_color, logo_wide_url, logo_url, logo_square_url')
    .eq('id', course.tenant_id)
    .single()

  const branding = extractBranding(tenant)
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
    branding.name,
    branding,
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
    .select('name, from_email, resend_domain_verified, primary_color, logo_wide_url, logo_url, logo_square_url')
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

  const branding = extractBranding(tenant)
  const sessionRows = groupSessionsByDay(sessions)
    .map((g) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${fmtDate(g.startTime)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${fmtTime(g.startTime)} – ${fmtTime(g.endTime)} Uhr</td>
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
    branding.name,
    branding,
  )

  try {
    await sendEmail({
      to: adminEmails,
      subject: `Aktion erforderlich: E-Mail für externen Instruktor "${instructorName}" fehlt`,
      html,
      fromName: branding.name,
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
    .select('name, from_email, resend_domain_verified, primary_color, logo_wide_url, logo_url, logo_square_url')
    .eq('id', tenantId)
    .single()

  const branding = extractBranding(tenant)
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
      organizerName:  branding.name,
      organizerEmail,
      attendeeName:   instructorName,
      attendeeEmail:  instructorEmail,
    }
  })

  const icsBuffer = buildIcs(icsEvents)

  const sessionRows = groupSessionsByDay(sorted)
    .map((g) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${fmtDate(g.startTime)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${fmtTime(g.startTime)} – ${fmtTime(g.endTime)} Uhr</td>
    </tr>`)
    .join('')

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
    branding.name,
    branding,
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

  // Aggregate missing-instructor rows by course
  const byCoursemap = new Map<string, MissingInstructorEntry>()
  for (const row of (rows || [])) {
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

  // Query draft courses for this tenant
  const { data: draftRows } = await supabase
    .from('courses')
    .select('id, name, course_category:course_categories(name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(50)

  const draftCourses = (draftRows || []) as Array<{ id: string; name: string; course_category?: { name?: string } | null }>

  // If neither list has entries, nothing to send
  if (affected.length === 0 && draftCourses.length === 0) return

  // Load tenant + admins
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, from_email, resend_domain_verified, primary_color, logo_wide_url, logo_url, logo_square_url')
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

  const branding = extractBranding(tenant)

  let bodyHtml = ''

  if (affected.length > 0) {
    const tableRows = affected.map((c) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${c.courseName}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${fmtDate(c.firstSession)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center">${c.sessionCount}</td>
    </tr>`).join('')
    bodyHtml += `
    <h2 style="font-size:16px;font-weight:600;color:#92400e;margin:0 0 8px">⚠️ ${affected.length} Kurs${affected.length === 1 ? '' : 'e'} ohne Instruktor</h2>
    <p style="margin:0 0 12px;color:#374151">Nach dem letzten SARI-Sync sind noch keine Instruktoren zugewiesen:</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#fef3c7">
          <th style="text-align:left;padding:8px 12px;font-weight:600;color:#92400e">Kurs</th>
          <th style="text-align:left;padding:8px 12px;font-weight:600;color:#92400e">Erster Termin</th>
          <th style="text-align:center;padding:8px 12px;font-weight:600;color:#92400e">Sessions</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>`
  }

  if (draftCourses.length > 0) {
    const draftRows2 = draftCourses.map((c) => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${c.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280">${c.course_category?.name ?? '–'}</td>
    </tr>`).join('')
    bodyHtml += `
    <h2 style="font-size:16px;font-weight:600;color:#374151;margin:0 0 8px">📋 ${draftCourses.length} Kurs${draftCourses.length === 1 ? '' : 'e'} im Entwurf-Status</h2>
    <p style="margin:0 0 12px;color:#374151">Diese Kurse sind noch nicht veröffentlicht und für Teilnehmende nicht buchbar:</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f3f4f6">
          <th style="text-align:left;padding:8px 12px;font-weight:600;color:#374151">Kurs</th>
          <th style="text-align:left;padding:8px 12px;font-weight:600;color:#374151">Kategorie</th>
        </tr>
      </thead>
      <tbody>${draftRows2}</tbody>
    </table>`
  }

  bodyHtml += `<p style="margin-top:8px;color:#6b7280;font-size:14px">
    Bitte prüfe die Kursübersicht und bearbeite die offenen Pendenzen.
  </p>`

  const subjectParts = []
  if (affected.length > 0) subjectParts.push(`${affected.length} Kurs${affected.length === 1 ? '' : 'e'} ohne Instruktor`)
  if (draftCourses.length > 0) subjectParts.push(`${draftCourses.length} im Entwurf`)
  const subject = `Pendenzen: ${subjectParts.join(', ')}`

  const html = emailWrapper(
    '⚠️ Pendenzen: Kursübersicht',
    bodyHtml,
    branding.name,
    branding,
  )

  try {
    await sendEmail({
      to: adminEmails,
      subject,
      html,
      fromName: branding.name,
      fromEmail: tenant?.from_email ?? null,
      domainVerified: tenant?.resend_domain_verified ?? false,
    })
    logger.debug(`✅ Admin reminded: ${affected.length} missing-instructor courses, ${draftCourses.length} draft courses`)

    // Record dedup entry so we don't send again within 24h
    await (supabase as any)
      .from('outbound_messages_queue')
      .insert({
        tenant_id:       tenantId,
        channel:         'email',
        recipient_email: adminEmails[0],
        subject,
        body:            '<!-- dedup sentinel -->',
        status:          'sent',
        send_at:         new Date().toISOString(),
        context_data: {
          stage:              'sari_missing_instructor_alert',
          affected_count:     affected.length,
          draft_count:        draftCourses.length,
        },
      })
  } catch (e: any) {
    logger.warn('⚠️ Could not send missing-instructor reminder email:', e.message)
  }
}
