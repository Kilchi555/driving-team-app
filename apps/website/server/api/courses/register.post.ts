import { defineEventHandler, readBody, createError } from 'h3'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { formatResendFrom } from '~/server/utils/format-resend-from'
import { getSupabaseServiceCredentials } from '~/server/utils/supabase-service-env'

const COURSE_TYPE_LABELS: Record<string, string> = {
  czv_grundkurs: 'CZV Grundkurs',
  fahrlehrer_weiterbildung: 'Fahrlehrerweiterbildung',
}

const PRIMARY_COLOR = '#019ee5'

interface CourseRegistrationPayload {
  tenant_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  faberid?: string
  birthdate?: string
  street?: string
  street_nr?: string
  zip?: string
  city?: string
  course_type: string
  /** Human-readable dates (legacy / form labels) */
  course_dates?: string[]
  /** Public courses.id rows — validated server-side; drives capacity */
  course_ids?: string[]
  notes?: string
  company?: string
  location?: string
  start_time?: string
  course_title?: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function formatDateLabelDeCh(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Zurich',
  }).format(d)
}

async function incrementCourseParticipantCount(
  supabase: SupabaseClient,
  courseId: string,
): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data: row, error: selErr } = await supabase
      .from('courses')
      .select('current_participants, max_participants, status')
      .eq('id', courseId)
      .single()

    if (selErr || !row) {
      throw createError({ statusCode: 500, statusMessage: 'Kurs nicht gefunden' })
    }

    const cur = row.current_participants ?? 0
    const max = row.max_participants ?? 0
    if (cur >= max) {
      throw createError({ statusCode: 409, statusMessage: 'Kurs ist ausgebucht' })
    }

    const next = cur + 1
    const newStatus = next >= max ? 'full' : row.status

    const { data: updated, error: upErr } = await supabase
      .from('courses')
      .update({
        current_participants: next,
        ...(newStatus !== row.status ? { status: newStatus } : {}),
      })
      .eq('id', courseId)
      .eq('current_participants', cur)
      .select('id')

    if (upErr) {
      throw createError({ statusCode: 500, statusMessage: 'Platz konnte nicht reserviert werden' })
    }
    if (updated && updated.length > 0) {
      return
    }
  }
  throw createError({ statusCode: 409, statusMessage: 'Kurs ausgebucht oder stark nachgefragt — bitte erneut versuchen' })
}

async function deleteCourseRegistrationsByIds(
  supabase: SupabaseClient,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return
  await supabase.from('course_registrations').delete().in('id', ids)
}

async function decrementCourseParticipantCount(
  supabase: SupabaseClient,
  courseId: string,
): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data: row, error: selErr } = await supabase
      .from('courses')
      .select('current_participants, max_participants, status')
      .eq('id', courseId)
      .single()

    if (selErr || !row) return

    const cur = row.current_participants ?? 0
    if (cur <= 0) return

    const next = cur - 1
    const max = row.max_participants ?? 0
    const newStatus = next >= max ? 'full' : 'active'

    const { data: updated, error: upErr } = await supabase
      .from('courses')
      .update({
        current_participants: next,
        ...(newStatus !== row.status ? { status: newStatus } : {}),
      })
      .eq('id', courseId)
      .eq('current_participants', cur)
      .select('id')

    if (upErr) return
    if (updated && updated.length > 0) return
  }
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as CourseRegistrationPayload

    if (!body.tenant_id) {
      throw createError({ statusCode: 400, statusMessage: 'tenant_id is required' })
    }
    if (!body.first_name?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'first_name is required' })
    }
    if (!body.last_name?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'last_name is required' })
    }
    if (!body.course_type?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'course_type is required' })
    }
    if (body.email && !body.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid email format' })
    }
    if (body.phone && !body.phone.match(/^[\d\s\+\-\(\)]+$/)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid phone format' })
    }

    const { supabaseUrl, supabaseServiceKey } = getSupabaseServiceCredentials(event)

    if (!supabaseUrl || !supabaseServiceKey) {
      throw createError({ statusCode: 500, statusMessage: 'Database configuration missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const rawIds = (body.course_ids || []).filter(id => typeof id === 'string' && UUID_RE.test(id.trim()))
    const uniqueIds = [...new Set(rawIds.map(id => id.trim()))]

    let resolvedDateLabels: string[] = body.course_dates?.length ? [...body.course_dates] : []

    if (uniqueIds.length > 0) {
      const { data: courseRows, error: cErr } = await supabase
        .from('courses')
        .select('id, tenant_id, is_public, status, max_participants, current_participants, course_start_date')
        .in('id', uniqueIds)

      if (cErr || !courseRows || courseRows.length !== uniqueIds.length) {
        throw createError({ statusCode: 400, statusMessage: 'Ungültige Kursauswahl' })
      }

      for (const row of courseRows) {
        if (row.tenant_id !== body.tenant_id || !row.is_public) {
          throw createError({ statusCode: 400, statusMessage: 'Ungültige Kursauswahl' })
        }
        if (!['active', 'full'].includes(row.status || '')) {
          throw createError({ statusCode: 400, statusMessage: 'Kurs nicht buchbar' })
        }
        const cur = row.current_participants ?? 0
        const max = row.max_participants ?? 0
        if (cur >= max) {
          throw createError({ statusCode: 409, statusMessage: 'Ein gewählter Kurs ist ausgebucht' })
        }
      }

      const byId = new Map(courseRows.map(r => [r.id, r]))
      resolvedDateLabels = uniqueIds
        .map((id) => {
          const r = byId.get(id)
          if (r?.course_start_date) return formatDateLabelDeCh(r.course_start_date)
          return ''
        })
        .filter(Boolean)
    }

    let finalNotes = body.notes || ''
    if (body.company?.trim()) {
      finalNotes = `Firma: ${body.company}\n${finalNotes}`.trim()
    }
    if (resolvedDateLabels.length > 0) {
      finalNotes = `${finalNotes}\nGewünschte Kursdaten: ${resolvedDateLabels.join(', ')}`.trim()
    }
    if (uniqueIds.length > 0) {
      finalNotes = `${finalNotes}\n(course_ids: ${uniqueIds.join(', ')})`.trim()
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, contact_email, primary_color')
      .eq('id', body.tenant_id)
      .single()

    const tenantColor = tenant?.primary_color || PRIMARY_COLOR
    const tenantName = tenant?.name || 'Driving Team'

    const emailBody: CourseRegistrationPayload = {
      ...body,
      course_dates: resolvedDateLabels.length > 0 ? resolvedDateLabels : body.course_dates,
    }

    const reservedCourseIds: string[] = []
    if (uniqueIds.length > 0) {
      try {
        for (const id of uniqueIds) {
          await incrementCourseParticipantCount(supabase, id)
          reservedCourseIds.push(id)
        }
      }
      catch (reserveErr) {
        for (const id of [...reservedCourseIds].reverse()) {
          await decrementCourseParticipantCount(supabase, id)
        }
        throw reserveErr
      }
    }

    let data: unknown

    if (uniqueIds.length > 0) {
      /** Wie VKU/PGS/Simy-Flows: eine Zeile pro Kurs in `course_registrations`, Kontaktdaten denormalisiert (kein `course_leads`). */
      const registrationIds: string[] = []
      const insertedRows: Record<string, unknown>[] = []
      const addressLine = [body.street?.trim(), body.street_nr?.trim()].filter(Boolean).join(' ').trim()
      const regNotes = [
        finalNotes || '',
        body.birthdate ? `Geburtsdatum: ${body.birthdate}` : '',
        addressLine || body.zip || body.city
          ? `Adresse: ${[addressLine, [body.zip, body.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')}`
          : '',
        `website_course_type: ${body.course_type.trim()}`,
      ]
        .filter(Boolean)
        .join('\n')
        .trim() || null

      try {
        for (const courseId of uniqueIds) {
          const row = {
            course_id: courseId,
            tenant_id: body.tenant_id,
            user_id: null as string | null,
            participant_id: null as string | null,
            first_name: body.first_name.trim(),
            last_name: body.last_name.trim(),
            email: body.email?.trim() || null,
            phone: body.phone?.trim() || null,
            sari_faberid: body.faberid?.trim() || null,
            status: 'confirmed',
            payment_status: 'pending',
            payment_method: 'invoice',
            notes: regNotes,
            registered_at: new Date().toISOString(),
          }

          const { data: regRow, error: regErr } = await supabase
            .from('course_registrations')
            .insert(row)
            .select()
            .single()

          if (regErr || !regRow) {
            console.error('course_registrations insert:', regErr)
            throw regErr || new Error('insert failed')
          }
          insertedRows.push(regRow as Record<string, unknown>)
          registrationIds.push((regRow as { id: string }).id)
        }
        data = insertedRows
      }
      catch (regLoopErr) {
        await deleteCourseRegistrationsByIds(supabase, registrationIds)
        for (const id of [...reservedCourseIds].reverse()) {
          await decrementCourseParticipantCount(supabase, id)
        }
        throw createError({
          statusCode: 500,
          statusMessage: 'Anmeldung konnte nicht gespeichert werden',
        })
      }
    }
    else {
      const { data: participantRows, error } = await supabase
        .from('course_leads')
        .insert({
          tenant_id: body.tenant_id,
          first_name: body.first_name.trim(),
          last_name: body.last_name.trim(),
          email: body.email?.trim() || null,
          phone: body.phone?.trim() || null,
          faberid: body.faberid?.trim() || null,
          birthdate: body.birthdate || null,
          street: body.street?.trim() || null,
          street_nr: body.street_nr?.trim() || null,
          zip: body.zip?.trim() || null,
          city: body.city?.trim() || null,
          course_type: body.course_type.trim(),
          notes: finalNotes || null,
        })
        .select()

      if (error) {
        console.error('Database error:', error)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to create course registration',
        })
      }
      data = participantRows
    }

    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'
      const fromWithName = formatResendFrom(tenantName, fromEmail)
      const teamEmail = 'info@drivingteam.ch'
      const courseLabel = COURSE_TYPE_LABELS[body.course_type] || body.course_type
      const isDefinitiveRegistration = resolvedDateLabels.length > 0

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

      await resend.emails.send({
        from: fromWithName,
        to: teamEmail,
        subject: isDefinitiveRegistration
          ? `Neue Anmeldung: ${body.course_title || courseLabel} – ${body.first_name} ${body.last_name}`
          : `Interessenanmeldung: ${body.course_title || courseLabel} – ${body.first_name} ${body.last_name}`,
        html: buildTeamEmail(emailBody, courseLabel, finalNotes, isDefinitiveRegistration, tenantColor, tenantName),
      })

      await delay(600)

      if (body.email) {
        await resend.emails.send({
          from: fromWithName,
          to: body.email,
          subject: isDefinitiveRegistration
            ? `Anmeldebestätigung: ${courseLabel}`
            : `Interessenanmeldung erhalten: ${courseLabel}`,
          html: buildCustomerEmail(emailBody, courseLabel, isDefinitiveRegistration, tenantColor, tenantName),
        })
      }
    } catch (emailErr: any) {
      console.warn('⚠️ Failed to send course registration emails:', emailErr.message)
    }

    return {
      success: true,
      data,
      message: 'Course registration created successfully',
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('Error:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    })
  }
})

function buildTeamEmail(
  body: CourseRegistrationPayload,
  courseLabel: string,
  finalNotes: string,
  isDefinitive: boolean,
  primaryColor: string,
  tenantName: string,
): string {
  const addressLine = [body.street, body.street_nr].filter(Boolean).join(' ')
  const cityLine = [body.zip, body.city].filter(Boolean).join(' ')
  const fullAddress = [addressLine, cityLine].filter(Boolean).join(', ') || '–'
  const birthdateFormatted = formatBirthdate(body.birthdate)
  const datesHtml = body.course_dates?.length
    ? body.course_dates.map(d => {
        const time = body.start_time ? ` · ${body.start_time} Uhr` : ''
        const loc = body.location ? ` · ${body.location}` : ''
        return `<li style="margin-bottom:4px;">${d}${time}${loc}</li>`
      }).join('')
    : ''

  const badgeHtml = isDefinitive
    ? `<span style="display:inline-block;background:#dcfce7;color:#166534;border-radius:20px;padding:4px 14px;font-size:12px;font-weight:600;">Definitive Anmeldung</span>`
    : `<span style="display:inline-block;background:#fef9c3;color:#854d0e;border-radius:20px;padding:4px 14px;font-size:12px;font-weight:600;">Interessenanmeldung</span>`

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Neue Kursanmeldung</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;">
        <tr>
          <td align="center" style="padding:20px 10px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="background:linear-gradient(135deg,${primaryColor} 0%,${primaryColor}cc 100%);color:white;padding:25px 20px;text-align:center;">
                  <h1 style="margin:0;font-size:22px;font-weight:600;">${isDefinitive ? 'Neue Kursanmeldung' : 'Neue Interessenanmeldung'}</h1>
                  <p style="margin:5px 0 0 0;opacity:0.9;font-size:14px;">${tenantName} – Interne Mitteilung</p>
                </td>
              </tr>
              <tr>
                <td style="padding:25px 20px;">
                  <p style="margin:0 0 6px 0;font-size:15px;color:#374151;">
                    <strong>Kurs:</strong> ${body.course_title || courseLabel} &nbsp; ${badgeHtml}
                  </p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:8px;margin:20px 0;">
                    <tr>
                      <td style="padding:20px;">
                        <h3 style="margin:0 0 14px 0;color:${primaryColor};font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Teilnehmer</h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;width:150px;">Name</td><td style="padding:4px 0;font-size:13px;color:#111827;font-weight:500;">${body.first_name} ${body.last_name}</td></tr>
                          ${body.company ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Firma</td><td style="padding:4px 0;font-size:13px;color:#111827;font-weight:500;">${body.company}</td></tr>` : ''}
                          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">E-Mail</td><td style="padding:4px 0;font-size:13px;"><a href="mailto:${body.email || ''}" style="color:${primaryColor};">${body.email || '–'}</a></td></tr>
                          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Telefon</td><td style="padding:4px 0;font-size:13px;"><a href="tel:${body.phone || ''}" style="color:${primaryColor};">${body.phone || '–'}</a></td></tr>
                          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Geburtsdatum</td><td style="padding:4px 0;font-size:13px;color:#111827;">${birthdateFormatted}</td></tr>
                          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Führerausweis-Nr.</td><td style="padding:4px 0;font-size:13px;color:#111827;font-weight:500;">${body.faberid || '–'}</td></tr>
                          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Adresse</td><td style="padding:4px 0;font-size:13px;color:#111827;">${fullAddress}</td></tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  ${isDefinitive ? `
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e0f4fd;border-radius:8px;margin-bottom:20px;border-left:4px solid ${primaryColor};">
                    <tr><td style="padding:16px 20px;">
                      <h3 style="margin:0 0 10px 0;color:#0369a1;font-size:14px;font-weight:600;">Angemeldete Kursdaten</h3>
                      <ul style="margin:0;padding-left:20px;font-size:13px;color:#374151;">${datesHtml}</ul>
                    </td></tr>
                  </table>
                  ` : `
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fef9c3;border-radius:8px;margin-bottom:20px;border-left:4px solid #eab308;">
                    <tr><td style="padding:14px 20px;">
                      <p style="margin:0;font-size:13px;color:#713f12;"><strong>Interessenanmeldung:</strong> Noch keine Kursdaten bekannt.</p>
                    </td></tr>
                  </table>
                  `}
                  ${(body.notes || body.company) && finalNotes ? `
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:8px;margin-bottom:20px;">
                    <tr><td style="padding:16px 20px;">
                      <h3 style="margin:0 0 8px 0;color:${primaryColor};font-size:14px;font-weight:600;">Bemerkungen</h3>
                      <p style="margin:0;font-size:13px;color:#374151;white-space:pre-line;">${finalNotes}</p>
                    </td></tr>
                  </table>
                  ` : ''}
                  <p style="margin:20px 0 0 0;font-size:12px;color:#6b7280;">${tenantName} · info@drivingteam.ch · +41 44 431 00 33</p>
                </td>
              </tr>
              <tr>
                <td style="background:#f3f4f6;padding:14px 20px;text-align:center;">
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

function buildCustomerEmail(
  body: CourseRegistrationPayload,
  courseLabel: string,
  isDefinitive: boolean,
  primaryColor: string,
  tenantName: string,
): string {
  const addressLine = [body.street, body.street_nr].filter(Boolean).join(' ')
  const cityLine = [body.zip, body.city].filter(Boolean).join(' ')
  const fullAddress = [addressLine, cityLine].filter(Boolean).join(', ')
  const birthdateFormatted = formatBirthdate(body.birthdate)
  const datesHtml = body.course_dates?.length
    ? body.course_dates.map(d => {
        const time = body.start_time ? ` · ${body.start_time} Uhr` : ''
        const loc = body.location ? ` · ${body.location}` : ''
        return `<li style="margin-bottom:4px;">${d}${time}${loc}</li>`
      }).join('')
    : ''

  const confirmationBox = isDefinitive ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#dcfce7;border-radius:8px;margin-bottom:20px;border-left:4px solid #22c55e;">
      <tr><td style="padding:14px 20px;">
        <h3 style="margin:0 0 6px 0;color:#166534;font-size:14px;font-weight:600;">✅ Anmeldung bestätigt</h3>
        <ul style="margin:0;padding-left:18px;color:#166534;font-size:13px;line-height:1.7;">
          <li>Bitte gültigen Führerausweis am Kurstag mitnehmen.</li>
          <li>Die Rechnung wird ca. 30 Tage vor dem Kurs per separater E-Mail versendet.</li>
        </ul>
      </td></tr>
    </table>
  ` : `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fef9c3;border-radius:8px;margin-bottom:20px;border-left:4px solid #eab308;">
      <tr><td style="padding:14px 20px;">
        <h3 style="margin:0 0 6px 0;color:#854d0e;font-size:14px;font-weight:600;">Interessenanmeldung erhalten</h3>
        <p style="margin:0;color:#713f12;font-size:13px;">Wir haben dein Interesse notiert. Sobald die Kursdaten feststehen, melden wir uns umgehend bei dir.</p>
      </td></tr>
    </table>
  `

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isDefinitive ? 'Anmeldebestätigung' : 'Interessenanmeldung erhalten'}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;">
        <tr>
          <td align="center" style="padding:20px 10px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
              <tr>
                <td style="background:linear-gradient(135deg,${primaryColor} 0%,${primaryColor}cc 100%);color:white;padding:28px 20px;text-align:center;">
                  <h1 style="margin:0;font-size:22px;font-weight:600;">${isDefinitive ? 'Anmeldebestätigung' : 'Interessenanmeldung erhalten'}</h1>
                  <p style="margin:6px 0 0 0;opacity:0.9;font-size:14px;">${tenantName}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 20px;">
                  <p style="margin:0 0 16px 0;font-size:16px;color:#111827;">Hallo ${body.first_name},</p>
                  <p style="margin:0 0 22px 0;font-size:15px;color:#374151;">
                    ${isDefinitive
                      ? `vielen Dank für deine Anmeldung zum <strong>${body.course_title || courseLabel} Kurs</strong>. Wir freuen uns auf deine Teilnahme!`
                      : `vielen Dank für dein Interesse am <strong>${body.course_title || courseLabel} Kurs</strong>. Wir haben deine Anmeldung erhalten und melden uns, sobald die Kursdaten feststehen.`
                    }
                  </p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:8px;margin-bottom:20px;">
                    <tr><td style="padding:20px;">
                      <h3 style="margin:0 0 14px 0;color:${primaryColor};font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Deine Angaben</h3>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;width:150px;">Kurs</td><td style="padding:4px 0;font-size:13px;color:#111827;font-weight:600;">${body.course_title || courseLabel}</td></tr>
                        <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Name</td><td style="padding:4px 0;font-size:13px;color:#111827;">${body.first_name} ${body.last_name}</td></tr>
                        ${body.company ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Firma</td><td style="padding:4px 0;font-size:13px;color:#111827;">${body.company}</td></tr>` : ''}
                        <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">E-Mail</td><td style="padding:4px 0;font-size:13px;color:#111827;">${body.email}</td></tr>
                        <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Telefon</td><td style="padding:4px 0;font-size:13px;color:#111827;">${body.phone || '–'}</td></tr>
                        <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Geburtsdatum</td><td style="padding:4px 0;font-size:13px;color:#111827;">${birthdateFormatted}</td></tr>
                        <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Führerausweis-Nr.</td><td style="padding:4px 0;font-size:13px;color:#111827;">${body.faberid || '–'}</td></tr>
                        ${fullAddress ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Adresse</td><td style="padding:4px 0;font-size:13px;color:#111827;">${fullAddress}</td></tr>` : ''}
                      </table>
                      ${isDefinitive && datesHtml ? `
                      <div style="margin-top:16px;padding-top:14px;border-top:1px solid #e5e7eb;">
                        <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;font-weight:600;">Angemeldete Kursdaten</p>
                        <ul style="margin:0;padding-left:20px;font-size:13px;color:#374151;">${datesHtml}</ul>
                      </div>
                      ` : ''}
                      ${body.notes ? `
                      <div style="margin-top:16px;padding-top:14px;border-top:1px solid #e5e7eb;">
                        <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;font-weight:600;">Bemerkungen</p>
                        <p style="margin:0;font-size:13px;color:#374151;">${body.notes}</p>
                      </div>
                      ` : ''}
                    </td></tr>
                  </table>
                  ${confirmationBox}
                  <p style="margin:20px 0 6px 0;font-size:15px;color:#111827;">Freundliche Grüsse</p>
                  <p style="margin:0;font-size:13px;color:#374151;font-weight:600;">${tenantName}</p>
                  <p style="margin:4px 0 0 0;font-size:12px;color:#6b7280;">
                    info@drivingteam.ch · +41 44 431 00 33 · <a href="https://drivingteam.ch" style="color:${primaryColor};text-decoration:none;">drivingteam.ch</a>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background:#f3f4f6;padding:14px 20px;text-align:center;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;">Diese E-Mail wurde automatisch generiert. Bitte antworte nicht direkt auf diese E-Mail.</p>
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

function formatBirthdate(value?: string): string {
  if (!value) return '–'
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) return `${match[3]}.${match[2]}.${match[1]}`
  return value
}
