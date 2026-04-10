import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { formatResendFrom } from '~/server/utils/format-resend-from'

const TENANT_ID = '64259d68-195a-4c68-8875-f1b44d962830'
const TEAM_EMAIL = 'info@drivingteam.ch'
const PRIMARY_COLOR = '#1C64F2'
const TENANT_NAME = 'Driving Team Fahrschule'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { first_name, last_name, email, phone, notes, company } = body

    // Validate required fields
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !phone?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Alle Pflichtfelder müssen ausgefüllt sein.' })
    }
    if (!notes?.trim()) {
      throw createError({ statusCode: 400, statusMessage: 'Nachricht ist erforderlich.' })
    }
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse.' })
    }
    if (!/^(?:\+41|0)\d{2}(?:\d{3})\d{2}(?:\d{2})$/.test(phone.replace(/\s/g, ''))) {
      throw createError({ statusCode: 400, statusMessage: 'Ungültige Schweizer Telefonnummer.' })
    }
    if (first_name.trim().length > 100 || last_name.trim().length > 100) {
      throw createError({ statusCode: 400, statusMessage: 'Name zu lang.' })
    }
    if (notes.trim().length > 1000) {
      throw createError({ statusCode: 400, statusMessage: 'Nachricht zu lang (max. 1000 Zeichen).' })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      throw createError({ statusCode: 500, statusMessage: 'Datenbankkonfiguration fehlt.' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Combine company + notes
    const fullNotes = company?.trim()
      ? `Firma: ${company.trim()}\n\n${notes.trim()}`
      : notes.trim()

    const { data: proposal, error: dbError } = await supabase
      .from('booking_proposals')
      .insert({
        tenant_id: TENANT_ID,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        notes: fullNotes,
        category_code: null,
        duration_minutes: null,
        location_id: null,
        staff_id: null,
        preferred_time_slots: [],
        status: 'pending',
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('❌ DB insert error (contact form):', dbError)
      throw createError({ statusCode: 500, statusMessage: 'Anfrage konnte nicht gespeichert werden.' })
    }

    // Send emails (non-blocking — don't fail submission on email error)
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'
      const fromWithName = formatResendFrom(TENANT_NAME, fromEmail)
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

      await resend.emails.send({
        from: fromWithName,
        to: TEAM_EMAIL,
        subject: `Neue Kontaktanfrage: ${first_name.trim()} ${last_name.trim()}`,
        html: buildTeamEmail(first_name.trim(), last_name.trim(), email.trim(), phone.trim(), fullNotes, company?.trim()),
      })

      await delay(500)

      await resend.emails.send({
        from: fromWithName,
        to: email.trim(),
        subject: `Deine Anfrage bei ${TENANT_NAME}`,
        html: buildCustomerEmail(first_name.trim(), fullNotes),
      })
    } catch (emailErr: any) {
      console.warn('⚠️ Failed to send contact emails:', emailErr.message)
    }

    return { success: true, proposal_id: proposal.id }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('❌ Error in contact.post.ts:', err)
    throw createError({ statusCode: 500, statusMessage: 'Interner Serverfehler.' })
  }
})

function buildTeamEmail(
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  notes: string,
  company?: string,
): string {
  const date = new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:20px 10px;">
      <table width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
        <tr>
          <td style="background:linear-gradient(135deg,${PRIMARY_COLOR},${PRIMARY_COLOR}cc);color:white;padding:25px 20px;text-align:center;">
            <h1 style="margin:0;font-size:20px;font-weight:700;">✉️ Neue Kontaktanfrage</h1>
            <p style="margin:5px 0 0;font-size:13px;opacity:.9;">${date} · ${TENANT_NAME}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 20px;">
            <table width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:8px;margin-bottom:20px;">
              <tr><td style="padding:20px;">
                <h3 style="margin:0 0 14px;color:${PRIMARY_COLOR};font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Kontaktdaten</h3>
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;width:130px;">Name</td><td style="padding:4px 0;font-size:13px;color:#111827;font-weight:500;">${firstName} ${lastName}</td></tr>
                  ${company ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Firma</td><td style="padding:4px 0;font-size:13px;color:#111827;">${company}</td></tr>` : ''}
                  <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">E-Mail</td><td style="padding:4px 0;font-size:13px;"><a href="mailto:${email}" style="color:${PRIMARY_COLOR};">${email}</a></td></tr>
                  <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Telefon</td><td style="padding:4px 0;font-size:13px;"><a href="tel:${phone}" style="color:${PRIMARY_COLOR};">${phone}</a></td></tr>
                </table>
              </td></tr>
            </table>
            <table width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:8px;margin-bottom:20px;">
              <tr><td style="padding:20px;">
                <h3 style="margin:0 0 10px;color:${PRIMARY_COLOR};font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Nachricht</h3>
                <p style="margin:0;font-size:13px;color:#374151;white-space:pre-line;">${notes}</p>
              </td></tr>
            </table>
            <table width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding:4px;">
                  <a href="mailto:${email}?subject=Re: Deine Anfrage bei ${TENANT_NAME}" style="display:inline-block;padding:10px 20px;background:${PRIMARY_COLOR};color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">✉️ Antworten</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f3f4f6;padding:14px 20px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">Interne Mitteilung – automatisch generiert.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildCustomerEmail(firstName: string, notes: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:20px 10px;">
      <table width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
        <tr>
          <td style="background:linear-gradient(135deg,${PRIMARY_COLOR},${PRIMARY_COLOR}cc);color:white;padding:28px 20px;text-align:center;">
            <h1 style="margin:0;font-size:22px;font-weight:700;">Danke für deine Anfrage!</h1>
            <p style="margin:6px 0 0;font-size:14px;opacity:.9;">${TENANT_NAME}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 20px;">
            <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hallo ${firstName},</p>
            <p style="margin:0 0 22px;font-size:15px;color:#374151;">vielen Dank für deine Nachricht. Wir haben deine Anfrage erhalten und melden uns innerhalb von <strong>24 Stunden</strong> bei dir.</p>
            <table width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:600;">Deine Nachricht</p>
                <p style="margin:0;font-size:13px;color:#374151;white-space:pre-line;">${notes}</p>
              </td></tr>
            </table>
            <table width="100%" cellspacing="0" cellpadding="0" style="background:#eff6ff;border-radius:8px;margin-bottom:24px;border-left:4px solid ${PRIMARY_COLOR};">
              <tr><td style="padding:14px 16px;">
                <p style="margin:0;font-size:13px;color:#1e40af;">Möchtest du direkt einen Termin buchen? <a href="https://www.simy.ch/booking/availability/driving-team" style="color:${PRIMARY_COLOR};font-weight:600;">Hier geht's zur Online-Buchung →</a></p>
              </td></tr>
            </table>
            <p style="margin:20px 0 4px;font-size:15px;color:#111827;">Freundliche Grüsse</p>
            <p style="margin:0;font-size:14px;font-weight:600;color:#374151;">${TENANT_NAME}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">
              <a href="mailto:${TEAM_EMAIL}" style="color:${PRIMARY_COLOR};">${TEAM_EMAIL}</a> · +41 44 431 00 33 ·
              <a href="https://drivingteam.ch" style="color:${PRIMARY_COLOR};">drivingteam.ch</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f3f4f6;padding:14px 20px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">Diese E-Mail wurde automatisch generiert. Bitte antworte nicht direkt auf diese E-Mail.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
