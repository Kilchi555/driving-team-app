// server/api/cron/send-instructor-reminders.get.ts
// ============================================================
// Sends reminder emails to course session instructors 2 days
// before their session.
//
// Schedule: daily at 07:00 UTC (09:00 Zürich summer)
// Window:   course_sessions starting between NOW()+44h and NOW()+52h
//
// Internal staff:  reminder email with session details + participant list
// External instructor: same email + ICS calendar attachment (METHOD:REQUEST)
//
// Dedup: stage = 'course_instructor_2day_reminder', key: session_id
// ============================================================

import { defineEventHandler, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { sendEmail } from '~/server/utils/email'
import { buildIcs } from '~/server/utils/course-staff-notifications'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  // ── Auth ─────────────────────────────────────────────────────
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('⚠️ Unauthorized cron attempt on send-instructor-reminders')
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const now = new Date()

  // 2-day window: 44h → 52h from now
  const windowStart = new Date(now.getTime() + 44 * 60 * 60 * 1000)
  const windowEnd   = new Date(now.getTime() + 52 * 60 * 60 * 1000)

  logger.debug('📅 send-instructor-reminders: window', windowStart.toISOString(), '→', windowEnd.toISOString())

  // ── 1. Load sessions in window that have an instructor ────────
  const { data: sessions, error: sessionsError } = await supabase
    .from('course_sessions')
    .select(`
      id, course_id, tenant_id, session_number, start_time, end_time,
      custom_location, staff_id, instructor_type,
      external_instructor_email, external_instructor_name,
      is_active,
      course:courses!course_sessions_course_id_fkey(
        id, name, status, is_active,
        course_category:course_categories(name)
      )
    `)
    .gte('start_time', windowStart.toISOString())
    .lt('start_time', windowEnd.toISOString())
    .eq('is_active', true)
    .or('staff_id.not.is.null,external_instructor_email.not.is.null')

  if (sessionsError) {
    logger.error('❌ Failed to fetch sessions:', sessionsError)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch sessions' })
  }

  const activeSessions = (sessions || []).filter((s: any) =>
    s.course?.status === 'active' && s.course?.is_active !== false,
  )

  if (activeSessions.length === 0) {
    logger.debug('ℹ️ No instructor sessions in 2-day window')
    return { success: true, sent: 0, skipped: 0, duration_ms: Date.now() - startTime }
  }

  logger.debug(`📋 Found ${activeSessions.length} instructor session(s) in window`)

  // ── 2. Dedup check ────────────────────────────────────────────
  const sessionIds = activeSessions.map((s: any) => s.id)
  const { data: existing } = await (supabase as any)
    .from('outbound_messages_queue')
    .select('context_data')
    .eq('context_data->>stage' as any, 'course_instructor_2day_reminder')
    .in('status', ['pending', 'sending', 'sent'])
    .gte('created_at', new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString())

  const alreadySent = new Set<string>(
    (existing || []).map((r: any) => r.context_data?.session_id).filter(Boolean),
  )

  // ── 3. Load internal staff emails ─────────────────────────────
  const staffIds = [...new Set(
    activeSessions.map((s: any) => s.staff_id).filter(Boolean),
  )] as string[]

  const staffEmailMap = new Map<string, { email: string; firstName: string; name: string }>()
  if (staffIds.length > 0) {
    const { data: staffUsers } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .in('id', staffIds)
    for (const u of (staffUsers || []) as any[]) {
      if (u.email) {
        staffEmailMap.set(u.id, {
          email: u.email,
          firstName: u.first_name || 'Hallo',
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        })
      }
    }
  }

  // ── 4. Load tenant info ────────────────────────────────────────
  const tenantIds = [...new Set(activeSessions.map((s: any) => s.tenant_id).filter(Boolean))] as string[]
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, primary_color, logo_wide_url, logo_url, logo_square_url, from_email, resend_domain_verified')
    .in('id', tenantIds)
  const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t]))

  // ── 5. Load participant counts per course ─────────────────────
  const courseIds = [...new Set(activeSessions.map((s: any) => s.course_id))] as string[]
  const participantCountMap = new Map<string, number>()
  if (courseIds.length > 0) {
    const { data: regs } = await supabase
      .from('course_registrations')
      .select('course_id')
      .in('course_id', courseIds)
      .eq('status', 'confirmed')
      .is('deleted_at', null)
    for (const r of (regs || []) as any[]) {
      participantCountMap.set(r.course_id, (participantCountMap.get(r.course_id) || 0) + 1)
    }
  }

  // ── 6. Send reminders ──────────────────────────────────────────
  const toQueue: any[] = []
  let skipped = 0

  for (const session of activeSessions as any[]) {
    if (alreadySent.has(session.id)) { skipped++; continue }

    const tenant = tenantMap.get(session.tenant_id)
    if (!tenant) { skipped++; continue }

    const courseName     = session.course?.name || 'Kurs'
    const categoryName   = session.course?.course_category?.name || null
    const tenantName     = tenant.name || 'Fahrschule'
    const primaryColor   = tenant.primary_color || '#2563eb'
    const logoUrl        = tenant.logo_wide_url || tenant.logo_url || tenant.logo_square_url || null
    const participantCount = participantCountMap.get(session.course_id) || 0

    const { dateStr, timeRange } = formatSession(session)

    // Determine instructor email + name
    let instructorEmail: string | null = null
    let instructorFirstName = 'Hallo'
    let instructorName = 'Kursleiter'
    let isExternal = false

    if (session.instructor_type === 'external' && session.external_instructor_email) {
      instructorEmail   = session.external_instructor_email
      instructorName    = session.external_instructor_name || 'Kursleiter'
      instructorFirstName = instructorName.split(' ')[0]
      isExternal = true
    } else if (session.staff_id && staffEmailMap.has(session.staff_id)) {
      const staff = staffEmailMap.get(session.staff_id)!
      instructorEmail   = staff.email
      instructorName    = staff.name
      instructorFirstName = staff.firstName
    }

    if (!instructorEmail) { skipped++; continue }

    // Build ICS for external instructors
    let icsBuffer: Buffer | null = null
    if (isExternal) {
      const organizerEmail = (tenant.resend_domain_verified && tenant.from_email)
        ? tenant.from_email
        : 'noreply@simy.ch'
      const startLocal = new Date(session.start_time).toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
      const endLocal   = session.end_time
        ? new Date(session.end_time).toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
        : new Date(new Date(session.start_time).getTime() + 2 * 60 * 60 * 1000)
            .toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
      const [startDate, startTime] = startLocal.split(' ')
      const [,          endTime]   = (typeof endLocal === 'string' ? endLocal : '').split(' ')
      const summary = categoryName ? `${categoryName} – Session ${session.session_number || 1}` : courseName

      icsBuffer = buildIcs([{
        uid:            `reminder-${session.id}@simy.ch`,
        date:           startDate,
        startTime:      startTime?.slice(0, 5) || '08:00',
        endTime:        endTime?.slice(0, 5)   || '10:00',
        summary,
        description:    `Erinnerung: ${courseName} am ${dateStr}`,
        organizerName:  tenantName,
        organizerEmail,
        attendeeName:   instructorName,
        attendeeEmail:  instructorEmail,
      }])
    }

    const html = buildInstructorReminderEmail({
      firstName: instructorFirstName,
      courseName,
      categoryName,
      dateStr,
      timeRange,
      location: session.custom_location || null,
      participantCount,
      tenantName,
      primaryColor,
      logoUrl,
    })

    const fromEmail = (tenant.resend_domain_verified && tenant.from_email)
      ? tenant.from_email
      : null

    // Queue via outbound_messages_queue (compatible with existing dedup + send pipeline)
    // Note: ICS attachments can't be stored in the queue JSON → send directly for external
    if (isExternal && icsBuffer) {
      try {
        await sendEmail({
          to: instructorEmail,
          subject: `Erinnerung in 2 Tagen: ${courseName} — ${dateStr}`,
          html,
          fromName: tenantName,
          fromEmail,
          domainVerified: tenant.resend_domain_verified ?? false,
          attachments: [{ filename: 'kurs-termin.ics', content: icsBuffer }],
        })
        logger.debug(`✅ ICS reminder sent to external instructor ${instructorEmail}`)
      } catch (e: any) {
        logger.warn(`⚠️ Could not send ICS reminder to ${instructorEmail}:`, e.message)
        skipped++
        continue
      }
      // Track via queue for dedup (without attachment - just the dedup record)
      toQueue.push({
        tenant_id:       session.tenant_id,
        channel:         'email',
        recipient_email: instructorEmail,
        subject:         `Erinnerung in 2 Tagen: ${courseName} — ${dateStr}`,
        body:            '<!-- sent directly with ICS attachment -->',
        status:          'sent',
        send_at:         now.toISOString(),
        context_data: {
          stage:      'course_instructor_2day_reminder',
          session_id: session.id,
          course_name: courseName,
          is_external: true,
        },
      })
    } else {
      toQueue.push({
        tenant_id:       session.tenant_id,
        channel:         'email',
        recipient_email: instructorEmail,
        subject:         `Erinnerung in 2 Tagen: ${courseName} — ${dateStr}`,
        body:            html,
        status:          'pending',
        send_at:         now.toISOString(),
        context_data: {
          stage:      'course_instructor_2day_reminder',
          session_id: session.id,
          course_name: courseName,
          is_external: false,
        },
      })
    }
  }

  // ── 7. Insert internal-staff entries into queue ───────────────
  const queueEntries = toQueue.filter(e => e.status === 'pending')
  if (queueEntries.length > 0) {
    const { error: insertError } = await supabase
      .from('outbound_messages_queue')
      .insert(queueEntries)
    if (insertError) logger.error('❌ Failed to insert instructor reminders:', insertError)
  }

  // Insert dedup records for directly-sent ICS mails
  const dedupEntries = toQueue.filter(e => e.status === 'sent')
  if (dedupEntries.length > 0) {
    await supabase.from('outbound_messages_queue').insert(dedupEntries).throwOnError()
  }

  const totalSent = toQueue.length
  logger.debug(`✅ send-instructor-reminders: ${totalSent} sent/queued, ${skipped} skipped — ${Date.now() - startTime}ms`)

  return { success: true, sent: totalSent, skipped, duration_ms: Date.now() - startTime }
})

// ── Helpers ───────────────────────────────────────────────────

function formatSession(session: any): { dateStr: string; timeRange: string } {
  const start = new Date(session.start_time)
  const end   = session.end_time ? new Date(session.end_time) : null
  const dateStr = start.toLocaleDateString('de-CH', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich',
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

function buildInstructorReminderEmail(d: {
  firstName: string
  courseName: string
  categoryName: string | null
  dateStr: string
  timeRange: string
  location: string | null
  participantCount: number
  tenantName: string
  primaryColor: string
  logoUrl: string | null
}): string {
  const rows: [string, string][] = [
    ['Kurs', d.courseName],
    ...(d.categoryName && d.categoryName !== d.courseName ? [['Kursart', d.categoryName] as [string, string]] : []),
    ['Datum', d.dateStr],
    ['Zeit', d.timeRange],
    ...(d.location ? [['Ort', d.location] as [string, string]] : []),
    ['Teilnehmer', `${d.participantCount} bestätigt`],
  ]

  const rowsHtml = rows.map(([l, v]) => `
    <tr>
      <td style="padding:8px 12px 8px 0;font-size:13px;color:#6b7280;white-space:nowrap;vertical-align:top;width:100px">${l}</td>
      <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:500">${v}</td>
    </tr>`).join('')

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">
      <tr><td>${logoBlock(d.logoUrl, d.tenantName, d.primaryColor)}</td></tr>
      <tr><td style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10)">
        <div style="background:${d.primaryColor};padding:28px 32px;text-align:center">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff">Erinnerung: Kurs in 2 Tagen</h1>
          <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">${d.tenantName}</p>
        </div>
        <div style="padding:28px 32px">
          <p style="margin:0 0 20px;font-size:15px;color:#374151">Hallo ${d.firstName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151">
            dies ist eine Erinnerung an deinen bevorstehenden Kurs in 2 Tagen:
          </p>
          <div style="background:#f9fafb;border-radius:10px;padding:16px 20px;margin-bottom:24px">
            <table cellpadding="0" cellspacing="0" width="100%"><tbody>${rowsHtml}</tbody></table>
          </div>
          <p style="margin:0;font-size:13px;color:#9ca3af">
            Bei Fragen wende dich bitte direkt an ${d.tenantName}.
          </p>
        </div>
        <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:12px;color:#9ca3af">${d.tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af;text-decoration:underline">Simy.ch</a></p>
        </div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}
