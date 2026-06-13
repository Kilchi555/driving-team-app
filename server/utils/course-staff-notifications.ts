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
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280">${s.description || ''}</td>
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
      <th>Datum</th><th>Zeit</th><th>Beschreibung</th>
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
      <th>Datum</th><th>Zeit</th><th>Beschreibung</th>
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
