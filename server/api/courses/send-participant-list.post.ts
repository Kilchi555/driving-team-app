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
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { shouldNotifyAssignedStaff } from '~/server/utils/tenant-staff-notify'
import { buildStaffEmail } from '~/server/utils/participant-list-staff-email'

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
  const terms = await getTenantTerminology(supabase, me.tenant_id)
  const tenantName   = tenant?.name || terms.businessNoun || 'Ihr Unternehmen'
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
  const notifyInternalStaff = await shouldNotifyAssignedStaff(supabase, me.tenant_id)

  for (const session of sessions as any[]) {
    // Load participants for this session
    const sessionNumberStr = String(session.session_number)
    const { data: regs } = await supabase
      .from('course_registrations')
      .select('id, first_name, last_name, email, phone, street, zip, city, birthdate, license_number, sari_faberid')
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

    // Collect recipients: instructor + admins (deduped).
    // Solo tenants: skip internal staff — admins only (external instructors still get mail).
    const recipientSet = new Map<string, string>()
    if (session.instructor_type === 'external' && session.external_instructor_email) {
      recipientSet.set(session.external_instructor_email, session.external_instructor_name || 'Kursleiter')
    } else if (notifyInternalStaff && session.staff_id && staffEmailMap.has(session.staff_id)) {
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
