import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { formatResendFrom } from '~/server/utils/format-resend-from'

const COURSE_TYPE_LABELS: Record<string, string> = {
  czv_grundkurs: 'CZV Grundkurs',
  fahrlehrer_weiterbildung: 'Fahrlehrerweiterbildung',
}

const PRIMARY_COLOR = '#019ee5' // Driving Team primary blue

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
  course_dates?: string[]
  notes?: string
  company?: string
  location?: string   // e.g. 'Hotel Marina Lachen/SZ'
  start_time?: string // e.g. '08:00'
  course_title?: string // e.g. 'Motorboot Fahrlehrerweiterbildung'
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as CourseRegistrationPayload

    // Validation
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

    // Build notes with company and selected course dates
    let finalNotes = body.notes || ''
    if (body.company?.trim()) {
      finalNotes = `Firma: ${body.company}\n${finalNotes}`.trim()
    }
    if (body.course_dates && body.course_dates.length > 0) {
      finalNotes = `${finalNotes}\nGewünschte Kursdaten: ${body.course_dates.join(', ')}`.trim()
    }

    const supabase = getSupabaseAdmin()

    // Load tenant for branding
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, contact_email, primary_color')
      .eq('id', body.tenant_id)
      .single()

    const tenantColor = tenant?.primary_color || PRIMARY_COLOR
    const tenantName = tenant?.name || 'Driving Team'

    const { data, error } = await supabase
      .from('course_participants')
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

    // Send emails (non-blocking)
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'
      const fromWithName = formatResendFrom(tenantName, fromEmail)
      const teamEmail = 'info@drivingteam.ch'
      const courseLabel = COURSE_TYPE_LABELS[body.course_type] || body.course_type
      const isDefinitiveRegistration = !!(body.course_dates && body.course_dates.length > 0)

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

      // Team notification
      await resend.emails.send({
        from: fromWithName,
        to: teamEmail,
        subject: isDefinitiveRegistration
          ? `Neue Anmeldung: ${body.course_title || courseLabel} – ${body.first_name} ${body.last_name}`
          : `Interessenanmeldung: ${body.course_title || courseLabel} – ${body.first_name} ${body.last_name}`,
        html: buildTeamEmail(body, courseLabel, finalNotes, isDefinitiveRegistration, tenantColor, tenantName),
      })

      await delay(600)

      // Customer confirmation (only if email provided)
      if (body.email) {
        await resend.emails.send({
          from: fromWithName,
          to: body.email,
          subject: isDefinitiveRegistration
            ? `Anmeldebestätigung: ${courseLabel}`
            : `Interessenanmeldung erhalten: ${courseLabel}`,
          html: buildCustomerEmail(body, courseLabel, isDefinitiveRegistration, tenantColor, tenantName),
        })
      }

      console.log('✅ Course registration emails sent')
    } catch (emailErr: any) {
      console.warn('⚠️ Failed to send course registration emails:', emailErr.message)
      // Don't fail the registration if email fails
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

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,${primaryColor} 0%,${primaryColor}cc 100%);color:white;padding:25px 20px;text-align:center;">
                  <h1 style="margin:0;font-size:22px;font-weight:600;">${isDefinitive ? 'Neue Kursanmeldung' : 'Neue Interessenanmeldung'}</h1>
                  <p style="margin:5px 0 0 0;opacity:0.9;font-size:14px;">${tenantName} – Interne Mitteilung</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:25px 20px;">
                  <p style="margin:0 0 6px 0;font-size:15px;color:#374151;">
                    <strong>Kurs:</strong> ${body.course_title || courseLabel} &nbsp; ${badgeHtml}
                  </p>

                  <!-- Teilnehmer -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:8px;margin:20px 0;">
                    <tr>
                      <td style="padding:20px;">
                        <h3 style="margin:0 0 14px 0;color:${primaryColor};font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Teilnehmer</h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="padding:4px 0;font-size:13px;color:#6b7280;width:150px;">Name</td>
                            <td style="padding:4px 0;font-size:13px;color:#111827;font-weight:500;">${body.first_name} ${body.last_name}</td>
                          </tr>
                          ${body.company ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Firma</td><td style="padding:4px 0;font-size:13px;color:#111827;font-weight:500;">${body.company}</td></tr>` : ''}
                          <tr>
                            <td style="padding:4px 0;font-size:13px;color:#6b7280;">E-Mail</td>
                            <td style="padding:4px 0;font-size:13px;"><a href="mailto:${body.email || ''}" style="color:${primaryColor};">${body.email || '–'}</a></td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0;font-size:13px;color:#6b7280;">Telefon</td>
                            <td style="padding:4px 0;font-size:13px;"><a href="tel:${body.phone || ''}" style="color:${primaryColor};">${body.phone || '–'}</a></td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0;font-size:13px;color:#6b7280;">Geburtsdatum</td>
                            <td style="padding:4px 0;font-size:13px;color:#111827;">${birthdateFormatted}</td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0;font-size:13px;color:#6b7280;">Führerausweis-Nr.</td>
                            <td style="padding:4px 0;font-size:13px;color:#111827;font-weight:500;">${body.faberid || '–'}</td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0;font-size:13px;color:#6b7280;">Adresse</td>
                            <td style="padding:4px 0;font-size:13px;color:#111827;">${fullAddress}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  ${isDefinitive ? `
                  <!-- Gewählte Kursdaten -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e0f4fd;border-radius:8px;margin-bottom:20px;border-left:4px solid ${primaryColor};">
                    <tr>
                      <td style="padding:16px 20px;">
                        <h3 style="margin:0 0 10px 0;color:#0369a1;font-size:14px;font-weight:600;">Angemeldete Kursdaten</h3>
                        <ul style="margin:0;padding-left:20px;font-size:13px;color:#374151;">
                          ${datesHtml}
                        </ul>
                      </td>
                    </tr>
                  </table>
                  ` : `
                  <!-- Interessenanmeldung Hinweis -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fef9c3;border-radius:8px;margin-bottom:20px;border-left:4px solid #eab308;">
                    <tr>
                      <td style="padding:14px 20px;">
                        <p style="margin:0;font-size:13px;color:#713f12;">
                          <strong>Interessenanmeldung:</strong> Noch keine Kursdaten bekannt. Bitte beim Kunden melden, sobald Termine feststehen.
                        </p>
                      </td>
                    </tr>
                  </table>
                  `}

                  ${(body.notes || body.company) && finalNotes ? `
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:8px;margin-bottom:20px;">
                    <tr>
                      <td style="padding:16px 20px;">
                        <h3 style="margin:0 0 8px 0;color:${primaryColor};font-size:14px;font-weight:600;">Bemerkungen</h3>
                        <p style="margin:0;font-size:13px;color:#374151;white-space:pre-line;">${finalNotes}</p>
                      </td>
                    </tr>
                  </table>
                  ` : ''}

                  <p style="margin:20px 0 0 0;font-size:12px;color:#6b7280;">
                    ${tenantName} &nbsp;·&nbsp; info@drivingteam.ch &nbsp;·&nbsp; +41 44 431 00 33
                  </p>
                </td>
              </tr>

              <!-- Footer -->
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
      <tr>
        <td style="padding:14px 20px;">
          <h3 style="margin:0 0 6px 0;color:#166534;font-size:14px;font-weight:600;">✅ Anmeldung bestätigt</h3>
          <ul style="margin:0;padding-left:18px;color:#166534;font-size:13px;line-height:1.7;">
            <li>Bitte gültigen Führerausweis am Kurstag mitnehmen.</li>
            <li>Die Rechnung wird ca. 30 Tage vor dem Kurs per separater E-Mail versendet.</li>
          </ul>
        </td>
      </tr>
    </table>
  ` : `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fef9c3;border-radius:8px;margin-bottom:20px;border-left:4px solid #eab308;">
      <tr>
        <td style="padding:14px 20px;">
          <h3 style="margin:0 0 6px 0;color:#854d0e;font-size:14px;font-weight:600;">Interessenanmeldung erhalten</h3>
          <p style="margin:0;color:#713f12;font-size:13px;">Wir haben dein Interesse notiert. Sobald die Kursdaten feststehen, melden wir uns umgehend bei dir.</p>
        </td>
      </tr>
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

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,${primaryColor} 0%,${primaryColor}cc 100%);color:white;padding:28px 20px;text-align:center;">
                  <h1 style="margin:0;font-size:22px;font-weight:600;">${isDefinitive ? 'Anmeldebestätigung' : 'Interessenanmeldung erhalten'}</h1>
                  <p style="margin:6px 0 0 0;opacity:0.9;font-size:14px;">${tenantName}</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:28px 20px;">
                  <p style="margin:0 0 16px 0;font-size:16px;color:#111827;">Hallo ${body.first_name},</p>
                  <p style="margin:0 0 22px 0;font-size:15px;color:#374151;">
                    ${isDefinitive
                      ? `vielen Dank für deine Anmeldung zum <strong>${body.course_title || courseLabel} Kurs</strong>. Wir freuen uns auf deine Teilnahme!`
                      : `vielen Dank für dein Interesse am <strong>${body.course_title || courseLabel} Kurs</strong>. Wir haben deine Anmeldung erhalten und melden uns, sobald die Kursdaten feststehen.`
                    }
                  </p>

                  <!-- Kursdetails -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:8px;margin-bottom:20px;">
                    <tr>
                      <td style="padding:20px;">
                        <h3 style="margin:0 0 14px 0;color:${primaryColor};font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Deine Angaben</h3>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="padding:4px 0;font-size:13px;color:#6b7280;width:150px;">Kurs</td>
                            <td style="padding:4px 0;font-size:13px;color:#111827;font-weight:600;">${body.course_title || courseLabel}</td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0;font-size:13px;color:#6b7280;">Name</td>
                            <td style="padding:4px 0;font-size:13px;color:#111827;">${body.first_name} ${body.last_name}</td>
                          </tr>
                          ${body.company ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Firma</td><td style="padding:4px 0;font-size:13px;color:#111827;">${body.company}</td></tr>` : ''}
                          <tr>
                            <td style="padding:4px 0;font-size:13px;color:#6b7280;">E-Mail</td>
                            <td style="padding:4px 0;font-size:13px;color:#111827;">${body.email}</td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0;font-size:13px;color:#6b7280;">Telefon</td>
                            <td style="padding:4px 0;font-size:13px;color:#111827;">${body.phone || '–'}</td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0;font-size:13px;color:#6b7280;">Geburtsdatum</td>
                            <td style="padding:4px 0;font-size:13px;color:#111827;">${birthdateFormatted}</td>
                          </tr>
                          <tr>
                            <td style="padding:4px 0;font-size:13px;color:#6b7280;">Führerausweis-Nr.</td>
                            <td style="padding:4px 0;font-size:13px;color:#111827;">${body.faberid || '–'}</td>
                          </tr>
                          ${fullAddress ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Adresse</td><td style="padding:4px 0;font-size:13px;color:#111827;">${fullAddress}</td></tr>` : ''}
                        </table>

                        ${isDefinitive && datesHtml ? `
                        <div style="margin-top:16px;padding-top:14px;border-top:1px solid #e5e7eb;">
                          <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;font-weight:600;">Angemeldete Kursdaten</p>
                          <ul style="margin:0;padding-left:20px;font-size:13px;color:#374151;">
                            ${datesHtml}
                          </ul>
                        </div>
                        ` : ''}

                        ${body.notes ? `
                        <div style="margin-top:16px;padding-top:14px;border-top:1px solid #e5e7eb;">
                          <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;font-weight:600;">Bemerkungen</p>
                          <p style="margin:0;font-size:13px;color:#374151;">${body.notes}</p>
                        </div>
                        ` : ''}
                      </td>
                    </tr>
                  </table>

                  <!-- Status-Box -->
                  ${confirmationBox}

                  <p style="margin:20px 0 6px 0;font-size:15px;color:#111827;">Freundliche Grüsse</p>
                  <p style="margin:0;font-size:13px;color:#374151;font-weight:600;">${tenantName}</p>
                  <p style="margin:4px 0 0 0;font-size:12px;color:#6b7280;">
                    info@drivingteam.ch &nbsp;·&nbsp; +41 44 431 00 33 &nbsp;·&nbsp; <a href="https://drivingteam.ch" style="color:${primaryColor};text-decoration:none;">drivingteam.ch</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
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


/** Convert ISO date 'yyyy-mm-dd' → 'dd.mm.yyyy', pass through anything else */
function formatBirthdate(value?: string): string {
  if (!value) return '–'
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) return `${match[3]}.${match[2]}.${match[1]}`
  return value
}
