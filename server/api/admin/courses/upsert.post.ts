import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendTenantEmail, sendEmail } from '~/server/utils/email'
import { logger } from '~/utils/logger'

// ── Timezone helper ───────────────────────────────────────────────────────────
/**
 * Convert a date+time entered as Zurich local time to a proper UTC ISO string.
 * Uses the same DST-aware approach as sari-sync-engine.ts.
 *
 * e.g. "2026-09-16" + "08:00" → "2026-09-16T06:00:00.000Z" (CEST = UTC+2)
 *      "2026-01-10" + "08:00" → "2026-01-10T07:00:00.000Z" (CET  = UTC+1)
 */
function zurichLocalToUtcIso(dateStr: string, timeStr: string): string {
  const localStr = `${dateStr}T${timeStr}:00`
  // Step 1: treat as UTC to get a reference point
  const asUtc = new Date(localStr + 'Z')
  // Step 2: find out what Zurich wall-clock shows for that UTC instant
  const zurichStr = asUtc.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
  // Step 3: compute the offset between "fake UTC" and "Zurich wall-clock"
  const zurichFake = new Date(zurichStr.replace(' ', 'T') + 'Z')
  const offsetMs = asUtc.getTime() - zurichFake.getTime()
  // Step 4: apply offset to convert local→UTC
  return new Date(asUtc.getTime() + offsetMs).toISOString()
}

// ── ICS calendar invite generator ────────────────────────────────────────────
function toIcsDate(dateStr: string, timeStr: string): string {
  // Format: YYYYMMDDTHHMMSS (local time with TZID=Europe/Zurich)
  return `${dateStr.replace(/-/g, '')}T${timeStr.replace(':', '')}00`
}

function buildIcs(events: Array<{
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

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Simy//Simy Fahrschule//DE',
    'METHOD:REQUEST',
    vtimezone,
    vevents,
    'END:VCALENDAR',
  ].join('\r\n')

  return Buffer.from(ics, 'utf-8')
}

/**
 * POST /api/admin/courses/upsert
 * Creates or updates a course together with its sessions in one atomic sequence.
 * If the course requires a room, room_bookings are created for each session
 * after a conflict check.
 *
 * Body:
 *   courseData   – object with all course columns
 *   sessions     – array of session objects
 *   courseId     – (optional) id of the course to update; omit to create
 */
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const body = await readBody(event)
  const { courseData, sessions, courseId } = body as {
    courseData: Record<string, any>
    sessions: any[]
    courseId?: string
  }

  if (!courseData) throw createError({ statusCode: 400, statusMessage: 'Missing courseData' })

  const supabase = getSupabaseAdmin()

  // Always scope to tenant
  const payload = {
    ...courseData,
    tenant_id: profile.tenant_id,
  }

  let savedCourseId: string

  if (courseId) {
    // Update
    const { data, error } = await supabase
      .from('courses')
      .update(payload)
      .eq('id', courseId)
      .eq('tenant_id', profile.tenant_id)
      .select()
      .single()

    if (error) {
      logger.error('❌ Error updating course:', error)
      throw createError({ statusCode: 500, statusMessage: error.message })
    }
    savedCourseId = data.id
    logger.debug('✅ Course updated:', savedCourseId)
  } else {
    // Insert
    const { data, error } = await supabase
      .from('courses')
      .insert({ ...payload, created_by: profile.id })
      .select()
      .single()

    if (error) {
      logger.error('❌ Error creating course:', error)
      throw createError({ statusCode: 500, statusMessage: error.message })
    }
    savedCourseId = data.id
    logger.debug('✅ Course created:', savedCourseId)
  }

  // Handle sessions
  if (sessions && sessions.length > 0) {
    if (courseId) {
      // Delete existing sessions before re-creating
      const { error: delError } = await supabase
        .from('course_sessions')
        .delete()
        .eq('course_id', savedCourseId)

      if (delError) {
        logger.error('❌ Error deleting old sessions:', delError)
        throw createError({ statusCode: 500, statusMessage: delError.message })
      }
    }

    const sessionRows = sessions.map((session: any, index: number) => ({
      course_id: savedCourseId,
      session_number: index + 1,
      start_time: zurichLocalToUtcIso(session.date, session.start_time),
      end_time: zurichLocalToUtcIso(session.date, session.end_time),
      description: session.description || `Session ${index + 1}`,
      instructor_type: session.instructor_type,
      staff_id: session.instructor_type === 'internal' ? session.staff_id : null,
      external_instructor_name: session.instructor_type === 'external' ? session.external_instructor_name : null,
      external_instructor_email: session.instructor_type === 'external' ? session.external_instructor_email : null,
      external_instructor_phone: session.instructor_type === 'external' ? session.external_instructor_phone : null,
      allow_individual_booking: session.allow_individual_booking ?? false,
      individual_price_rappen: session.allow_individual_booking ? (Math.round((session.individual_price ?? 0) * 100)) : 0,
      tenant_id: profile.tenant_id,
    }))

    const { error: sessError } = await supabase
      .from('course_sessions')
      .insert(sessionRows)

    if (sessError) {
      logger.error('❌ Error creating sessions:', sessError)
      throw createError({ statusCode: 500, statusMessage: sessError.message })
    }

    logger.debug(`✅ ${sessions.length} sessions saved for course ${savedCourseId}`)
  }

  // Handle room bookings
  const roomId: string | null = courseData.room_id || null
  const requiresRoom: boolean = !!courseData.requires_room

  if (requiresRoom && roomId && sessions && sessions.length > 0) {
    // Build time slots for all sessions
    const timeSlots = sessions.map((session: any) => ({
      start_time: zurichLocalToUtcIso(session.date, session.start_time),
      end_time: zurichLocalToUtcIso(session.date, session.end_time),
    }))

    // Cancel existing room bookings for this course (on update)
    if (courseId) {
      await supabase
        .from('room_bookings')
        .update({ status: 'cancelled' })
        .eq('course_id', savedCourseId)
        .neq('status', 'cancelled')
    }

    // Conflict check: are any of the slots already booked for this room?
    const conflicts: string[] = []
    for (const slot of timeSlots) {
      const { data: existing } = await supabase
        .from('room_bookings')
        .select('id, start_time, end_time, course_id')
        .eq('room_id', roomId)
        .neq('status', 'cancelled')
        .neq('course_id', savedCourseId) // exclude own bookings
        .lt('start_time', slot.end_time)
        .gt('end_time', slot.start_time)

      if (existing && existing.length > 0) {
        conflicts.push(slot.start_time)
      }
    }

    if (conflicts.length > 0) {
      const conflictDates = conflicts
        .map(dt => new Date(dt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
        .join(', ')
      logger.warn(`⚠️ Room conflict detected for room ${roomId}:`, conflicts)
      throw createError({
        statusCode: 409,
        statusMessage: `Raumkonflikt: Der Raum ist bereits zu folgenden Zeiten gebucht: ${conflictDates}`
      })
    }

    // Create room_bookings for each session
    const bookingRows = timeSlots.map((slot) => ({
      room_id: roomId,
      tenant_id: profile.tenant_id,
      course_id: savedCourseId,
      start_time: slot.start_time,
      end_time: slot.end_time,
      purpose: 'course',
      booked_by: profile.id,
      status: 'confirmed',
    }))

    const { error: bookingError } = await supabase
      .from('room_bookings')
      .insert(bookingRows)

    if (bookingError) {
      logger.error('❌ Error creating room_bookings:', bookingError)
      // Non-fatal: course is saved, just log the issue
      logger.warn('⚠️ Course saved but room bookings could not be created')
    } else {
      logger.debug(`✅ ${bookingRows.length} room bookings created for course ${savedCourseId}`)
    }
  } else if (courseId && (!requiresRoom || !roomId)) {
    // Room was removed from an existing course — cancel its bookings
    await supabase
      .from('room_bookings')
      .update({ status: 'cancelled' })
      .eq('course_id', savedCourseId)
      .neq('status', 'cancelled')
  }

  // ── Staff appointments + email ────────────────────────────────────────────
  const internalSessions = (sessions || []).filter(
    (s: any) => s.instructor_type === 'internal' && s.staff_id,
  )

  if (internalSessions.length > 0) {
    // Determine the earliest session date for the title suffix
    const earliestDate = internalSessions
      .map((s: any) => s.date as string)
      .sort()[0]
    const dateLabel = new Date(earliestDate + 'T12:00:00').toLocaleDateString('de-CH', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    const courseLabel = courseData.course_name || courseData.category || 'Kurs'
    // Use start time of the earliest session for the title (e.g. "07:30")
    const earliestSession = internalSessions
      .slice()
      .sort((a: any, b: any) => (a.date + a.start_time).localeCompare(b.date + b.start_time))[0]
    const startTimeLabel = earliestSession?.start_time || ''
    const apptTitle = `${courseLabel} – ab ${startTimeLabel}`

    // On update: remove old course appointments for this course before recreating
    if (courseId) {
      await supabase
        .from('appointments')
        .delete()
        .eq('notes', `course:${savedCourseId}`) // tag we set below
    }

    // Build appointment rows: start 30 min before, end 30 min after session
    const apptRows = internalSessions.map((s: any) => {
      const startMs = new Date(`${s.date}T${s.start_time}:00`).getTime() - 30 * 60 * 1000
      const endMs   = new Date(`${s.date}T${s.end_time}:00`).getTime()   + 30 * 60 * 1000
      return {
        tenant_id:       profile.tenant_id,
        staff_id:        s.staff_id,
        user_id:         null,
        start_time:      new Date(startMs).toISOString(),
        end_time:        new Date(endMs).toISOString(),
        duration_minutes: Math.round((endMs - startMs) / 60000),
        event_type_code: 'course',
        title:           apptTitle,
        description:     s.description || '',
        status:          'confirmed',
        notes:           `course:${savedCourseId}`,
      }
    })

    const { error: apptErr } = await supabase.from('appointments').insert(apptRows)
    if (apptErr) {
      logger.warn('⚠️ Could not create staff course appointments:', apptErr.message)
    } else {
      logger.debug(`✅ ${apptRows.length} course appointments created for staff`)
    }

    // ── Send email to each internal staff member ────────────────────────────
    // Group sessions by staff_id
    const byStaff = new Map<string, any[]>()
    for (const s of internalSessions) {
      if (!byStaff.has(s.staff_id)) byStaff.set(s.staff_id, [])
      byStaff.get(s.staff_id)!.push(s)
    }

    // Load staff users + tenant branding at once
    const staffIds = [...byStaff.keys()]
    const [staffResult, tenantResult] = await Promise.all([
      supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', staffIds)
        .eq('tenant_id', profile.tenant_id),
      supabase
        .from('tenants')
        .select('name, from_email, resend_domain_verified, primary_color, logo_wide_url, logo_url, logo_square_url')
        .eq('id', profile.tenant_id)
        .single(),
    ])

    const staffUsers = staffResult.data
    const tenant = tenantResult.data
    const primaryColor = tenant?.primary_color || '#1e293b'
    const tenantName   = tenant?.name || 'Simy'
    const logoUrl      = tenant?.logo_wide_url || tenant?.logo_url || (tenant as any)?.logo_square_url || null
    const logoHtml     = logoUrl
      ? `<div style="background:#fff;text-align:center;padding:20px 32px 0"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></div>`
      : ''

    for (const staffUser of staffUsers || []) {
      if (!staffUser.email) continue
      const staffSessions = byStaff.get(staffUser.id) || []

      // Group sessions on the same date into one row (start of first – end of last)
      const sortedSessions = staffSessions.sort((a: any, b: any) => (a.date + a.start_time).localeCompare(b.date + b.start_time))
      const byDateMap = new Map<string, any[]>()
      for (const s of sortedSessions) {
        if (!byDateMap.has(s.date)) byDateMap.set(s.date, [])
        byDateMap.get(s.date)!.push(s)
      }
      const sessionRows = Array.from(byDateMap.entries())
        .map(([date, daySessions]) => {
          const dt = new Date(`${date}T${daySessions[0].start_time}:00`)
          const dayLabel = dt.toLocaleDateString('de-CH', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Zurich' })
          const endTime = daySessions[daySessions.length - 1].end_time
          return `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${dayLabel}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${daySessions[0].start_time} – ${endTime} Uhr</td>
          </tr>`
        })
        .join('')

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)}
.header{background:${primaryColor};padding:28px 32px}
.header h1{margin:0;color:#fff;font-size:20px;font-weight:700}
.body{padding:32px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 12px;background:#f9fafb;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
.footer{border-top:1px solid #f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center}</style></head>
<body><div class="wrap">
${logoHtml}
<div class="header"><h1>📅 Kurs-Zuteilung</h1></div>
<div class="body">
<p>Hallo ${staffUser.first_name},</p>
<p>Du wurdest als Instruktor/in für den folgenden Kurs eingetragen:</p>
<p style="font-size:18px;font-weight:700;color:#1e293b;margin:16px 0">${courseLabel}</p>
<p style="color:#6b7280;margin-bottom:24px">Kursbeginn: ${dateLabel}</p>
<table>
  <thead><tr>
    <th>Datum</th><th>Zeit</th>
  </tr></thead>
  <tbody>${sessionRows}</tbody>
</table>
<p style="margin-top:24px;color:#6b7280;font-size:14px">Die Termine sind bereits in deinem Kalender eingetragen.</p>
</div>
<div class="footer">${tenantName} · Powered by <a href="https://simy.ch" style="color:#9ca3af;text-decoration:underline">Simy.ch</a></div>
</div></body></html>`

      try {
        await sendTenantEmail(profile.tenant_id, {
          to: staffUser.email,
          subject: `Kurs-Zuteilung: ${courseLabel} ab ${dateLabel}`,
          html,
        })
        logger.debug(`✅ Course assignment email sent to ${staffUser.email}`)
      } catch (emailErr: any) {
        logger.warn(`⚠️ Could not send course email to ${staffUser.email}:`, emailErr.message)
      }
    }
  }

  // ── External instructor calendar invites ─────────────────────────────────
  const externalSessions = (sessions || []).filter(
    (s: any) => s.instructor_type === 'external' && s.external_instructor_email,
  )

  if (externalSessions.length > 0) {
    // Load tenant info for organizer field (reuse if already fetched above)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, from_email, resend_domain_verified, primary_color, logo_wide_url, logo_url, logo_square_url')
      .eq('id', profile.tenant_id)
      .single()

    const organizerName  = tenant?.name || 'Fahrschule'
    const organizerEmail = (tenant?.resend_domain_verified && tenant?.from_email)
      ? tenant.from_email
      : 'noreply@simy.ch'

    // Determine shared course label + start date for subject/title
    const extEarliestSession = externalSessions
      .slice()
      .sort((a: any, b: any) => (a.date + a.start_time).localeCompare(b.date + b.start_time))[0]
    const extCourseLabel = courseData.course_name || courseData.category || 'Kurs'
    const extDateLabel = new Date(extEarliestSession.date + 'T12:00:00').toLocaleDateString('de-CH', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    const extStartTimeLabel = extEarliestSession?.start_time || ''

    // Group by email
    const byEmail = new Map<string, any[]>()
    for (const s of externalSessions) {
      const email = s.external_instructor_email as string
      if (!byEmail.has(email)) byEmail.set(email, [])
      byEmail.get(email)!.push(s)
    }

    for (const [email, extSessions] of byEmail) {
      const instructorName = extSessions[0].external_instructor_name || email

      // Sort sessions chronologically
      const sorted = extSessions.sort(
        (a: any, b: any) => (a.date + a.start_time).localeCompare(b.date + b.start_time),
      )

      // Build ICS events
      const icsEvents = sorted.map((s: any, i: number) => ({
        uid:            `${savedCourseId}-ext-${i}@simy.ch`,
        date:           s.date,
        startTime:      s.start_time,
        endTime:        s.end_time,
        summary:        `${extCourseLabel} – ab ${extStartTimeLabel}`,
        description:    s.description || `Session ${i + 1}`,
        organizerName,
        organizerEmail,
        attendeeName:   instructorName,
        attendeeEmail:  email,
      }))

      const icsBuffer = buildIcs(icsEvents)

      const extPrimaryColor = tenant?.primary_color || '#1e293b'
      const extLogoUrl = tenant?.logo_wide_url || tenant?.logo_url || (tenant as any)?.logo_square_url || null
      const extLogoHtml = extLogoUrl
        ? `<div style="background:#fff;text-align:center;padding:20px 32px 0"><img src="${extLogoUrl}" alt="${organizerName}" style="height:44px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></div>`
        : ''

      // Build session table — group same-day sessions into one row
      const extByDateMap = new Map<string, any[]>()
      for (const s of sorted) {
        if (!extByDateMap.has(s.date)) extByDateMap.set(s.date, [])
        extByDateMap.get(s.date)!.push(s)
      }
      const sessionRows = Array.from(extByDateMap.entries())
        .map(([date, daySessions]) => {
          const dt = new Date(`${date}T${daySessions[0].start_time}:00`)
          const dayLabel = dt.toLocaleDateString('de-CH', {
            weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Zurich',
          })
          const endTime = daySessions[daySessions.length - 1].end_time
          return `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${dayLabel}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${daySessions[0].start_time} – ${endTime} Uhr</td>
          </tr>`
        })
        .join('')

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)}
.header{background:${extPrimaryColor};padding:28px 32px}
.header h1{margin:0;color:#fff;font-size:20px;font-weight:700}
.body{padding:32px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 12px;background:#f9fafb;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280}
.footer{border-top:1px solid #f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center}</style></head>
<body><div class="wrap">
${extLogoHtml}
<div class="header"><h1>📅 Kurseinladung</h1></div>
<div class="body">
<p>Hallo ${instructorName},</p>
<p>Sie wurden als externer Instruktor/in für den folgenden Kurs eingeplant:</p>
<p style="font-size:18px;font-weight:700;color:#1e293b;margin:16px 0">${extCourseLabel}</p>
<p style="color:#6b7280;margin-bottom:24px">Kursbeginn: ${extDateLabel}</p>
<table>
  <thead><tr>
    <th>Datum</th><th>Zeit</th>
  </tr></thead>
  <tbody>${sessionRows}</tbody>
</table>
<p style="margin-top:24px;color:#6b7280;font-size:14px">
  Im Anhang finden Sie eine Kalender-Einladung (.ics). Öffnen Sie diese, um alle Termine direkt in Ihren Kalender zu übernehmen.
</p>
</div>
<div class="footer">${organizerName} · Powered by <a href="https://simy.ch" style="color:#9ca3af;text-decoration:underline">Simy.ch</a></div>
</div></body></html>`

      try {
        await sendEmail({
          to:          email,
          subject:     `Kurseinladung: ${extCourseLabel} ab ${extDateLabel}`,
          html,
          fromName:    organizerName,
          fromEmail:   tenant?.from_email ?? null,
          domainVerified: tenant?.resend_domain_verified ?? false,
          attachments: [{
            filename: `kurs-${savedCourseId.slice(0, 8)}.ics`,
            content:  icsBuffer,
          }],
        })
        logger.debug(`✅ ICS calendar invite sent to external instructor ${email}`)
      } catch (emailErr: any) {
        logger.warn(`⚠️ Could not send ICS invite to ${email}:`, emailErr.message)
      }
    }
  }

  return { id: savedCourseId }
})
