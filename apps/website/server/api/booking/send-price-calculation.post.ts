import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

const TENANT_ID = '64259d68-195a-4c68-8875-f1b44d962830'
const TEAM_EMAIL = 'info@drivingteam.ch'
const PRIMARY_COLOR_FALLBACK = '#1C64F2'
const TENANT_NAME_FALLBACK = 'Driving Team Fahrschule'

interface PriceCalculationPayload {
  email: string
  firstName?: string
  category: string
  lessonsCount: number
  totalCost: number
  calculationDetails: string
  svaFees?: { label: string; amount: number }[]
  externalCostsTotal?: number
  newsletterOptIn?: boolean
  sessionId?: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as PriceCalculationPayload

    if (!body.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid email address' })
    }
    if (!body.category || !body.lessonsCount || !body.totalCost) {
      throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw createError({ statusCode: 500, statusMessage: 'Database configuration missing' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Load tenant branding
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, contact_email, primary_color')
      .eq('id', TENANT_ID)
      .single()

    const primaryColor = tenant?.primary_color || PRIMARY_COLOR_FALLBACK
    const tenantName = tenant?.name || TENANT_NAME_FALLBACK
    const teamEmail = tenant?.contact_email || TEAM_EMAIL

    // Save lead to database for follow-up
    const { error: dbError } = await supabase
      .from('price_calculation_leads')
      .insert({
        tenant_id: TENANT_ID,
        first_name: body.firstName?.trim() || null,
        email: body.email.trim().toLowerCase(),
        category: body.category,
        lessons_count: body.lessonsCount,
        total_cost: body.totalCost,
        calculation_details: body.calculationDetails,
        newsletter_opt_in: body.newsletterOptIn ?? false,
        session_id: body.sessionId || null,
      })

    if (dbError) {
      console.error('❌ Failed to save price calculation lead:', dbError)
      // Don't fail the whole request if DB insert fails — still send email
    }

    // Send email via Resend
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@drivingteam.ch'

      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

      // Email to customer
      await resend.emails.send({
        from: fromEmail,
        to: body.email.trim(),
        subject: `Deine Kostenschätzung – ${tenantName}`,
        html: buildCustomerEmail(body, primaryColor, tenantName, teamEmail),
      })

      await delay(600)

      // Notification to team
      await resend.emails.send({
        from: fromEmail,
        to: teamEmail,
        subject: `💰 Neue Preiskalkulation: ${body.category}${body.firstName ? ` – ${body.firstName}` : ''} (${body.email})`,
        html: buildTeamEmail(body, primaryColor, tenantName),
      })
    } catch (emailErr: any) {
      console.warn('⚠️ Failed to send price calculation emails:', emailErr.message)
      // Return success anyway since lead is saved
    }

    return { success: true }
  } catch (err: any) {
    if (err?.statusCode) throw err
    console.error('❌ Error in send-price-calculation:', err)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})

function buildCustomerEmail(body: PriceCalculationPayload, primaryColor: string, tenantName: string, teamEmail: string): string {
  const greeting = body.firstName ? `Hallo ${body.firstName}` : 'Hallo'

  // Main cost rows (skip the "Externe Kosten" line – rendered separately below)
  const rows = body.calculationDetails
    .split('\n')
    .filter(line => Boolean(line) && !line.startsWith('GESCHÄTZTE GESAMTKOSTEN') && !line.includes('Externe Kosten'))
    .map(line => {
      const parts = line.split(':')
      const label = parts[0].trim()
      const value = parts.slice(1).join(':').trim()
      return `<tr style="border-bottom:1px solid #f3f4f6;"><td style="padding:10px 16px;font-size:13px;color:#374151;">${label}</td><td style="padding:10px 16px;font-size:13px;color:#111827;font-weight:500;text-align:right;white-space:nowrap;">${value}</td></tr>`
    })
    .join('')

  // Detailed external costs block (blue, matching website design)
  const svaBlock = (body.svaFees && body.svaFees.length > 0) ? `
    <tr style="background:#eff6ff;border-bottom:1px solid #dbeafe;">
      <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#1e40af;">🏛️ Strassenverkehrsamt &amp; weitere Kosten</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#1e40af;text-align:right;white-space:nowrap;">CHF ${body.externalCostsTotal}.–</td>
    </tr>
    ${body.svaFees.map(fee => `
      <tr style="background:#f0f9ff;border-bottom:1px solid #e0f2fe;">
        <td style="padding:6px 16px 6px 28px;font-size:12px;color:#374151;">↳ ${fee.label}</td>
        <td style="padding:6px 16px;font-size:12px;color:#374151;text-align:right;white-space:nowrap;">CHF ${fee.amount}.–</td>
      </tr>
    `).join('')}
    <tr style="background:#f0f9ff;border-bottom:1px solid #dbeafe;">
      <td colspan="2" style="padding:4px 16px 8px 28px;font-size:11px;color:#6b7280;">* nicht für Inhaber:innen von anderen Kategorien</td>
    </tr>
  ` : ''

  const totalRow = `<tr style="background:${primaryColor};"><td style="padding:12px 16px;font-size:14px;font-weight:700;color:white;">Geschätzte Gesamtkosten</td><td style="padding:12px 16px;font-size:16px;font-weight:700;color:white;text-align:right;white-space:nowrap;">CHF ${body.totalCost}.–</td></tr>`

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;">
        <tr><td align="center" style="padding:20px 10px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,${primaryColor} 0%,${primaryColor}cc 100%);color:white;padding:28px 20px;text-align:center;">
                <h1 style="margin:0;font-size:22px;font-weight:700;">💰 Deine Kostenschätzung</h1>
                <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">${tenantName}</p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding:28px 20px;">
                <p style="margin:0 0 6px;font-size:16px;color:#111827;">${greeting},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;">hier ist deine persönliche Kostenschätzung für die Kategorie <strong>${body.category}</strong>. Bitte beachte, dass es sich um eine unverbindliche Orientierungshilfe handelt.</p>

                <!-- Cost Table -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                  ${rows}
                  ${svaBlock}
                  ${totalRow}
                </table>

                <!-- Disclaimer -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fef9c3;border-radius:8px;margin-bottom:24px;border-left:4px solid #eab308;">
                  <tr><td style="padding:14px 16px;">
                    <p style="margin:0;font-size:13px;color:#713f12;"><strong>⚠️ Unverbindliche Schätzung:</strong> Die tatsächlichen Kosten können je nach individuellem Lernfortschritt und gewählten Leistungen abweichen.</p>
                  </td></tr>
                </table>

                <!-- CTA -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px;text-align:center;">
                    <p style="margin:0 0 12px;font-size:14px;color:#374151;">Bereit, mit deiner Ausbildung zu starten?</p>
                    <a href="https://simy.ch/booking/availability/driving-team" style="display:inline-block;padding:12px 28px;background:${primaryColor};color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Jetzt Termin buchen →</a>
                  </td></tr>
                </table>

                <p style="margin:20px 0 4px;font-size:15px;color:#111827;">Freundliche Grüsse</p>
                <p style="margin:0;font-size:14px;font-weight:600;color:#374151;">${tenantName}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">
                  <a href="mailto:${teamEmail}" style="color:${primaryColor};">${teamEmail}</a> · +41 44 431 00 33 ·
                  <a href="https://drivingteam.ch" style="color:${primaryColor};">drivingteam.ch</a>
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
        </td></tr>
      </table>
    </body>
    </html>
  `
}

function buildTeamEmail(body: PriceCalculationPayload, primaryColor: string, tenantName: string): string {
  const date = new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;">
        <tr><td align="center" style="padding:20px 10px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
            <tr>
              <td style="background:linear-gradient(135deg,${primaryColor} 0%,${primaryColor}cc 100%);color:white;padding:25px 20px;text-align:center;">
                <h1 style="margin:0;font-size:20px;font-weight:700;">💰 Neue Preiskalkulation</h1>
                <p style="margin:5px 0 0;font-size:13px;opacity:0.9;">${date} – Interner Lead</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border-radius:8px;margin-bottom:20px;">
                  <tr><td style="padding:20px;">
                    <h3 style="margin:0 0 14px;color:${primaryColor};font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Lead-Daten</h3>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${body.firstName ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;width:140px;">Vorname</td><td style="padding:4px 0;font-size:13px;color:#111827;font-weight:500;">${body.firstName}</td></tr>` : ''}
                      <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">E-Mail</td><td style="padding:4px 0;font-size:13px;"><a href="mailto:${body.email}" style="color:${primaryColor};">${body.email}</a></td></tr>
                      <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Kategorie</td><td style="padding:4px 0;font-size:13px;color:#111827;font-weight:500;">${body.category}</td></tr>
                      <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Fahrstunden</td><td style="padding:4px 0;font-size:13px;color:#111827;">${body.lessonsCount}</td></tr>
                      <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Geschätzte Kosten</td><td style="padding:4px 0;font-size:14px;color:#111827;font-weight:700;">CHF ${body.totalCost}.–</td></tr>
                    </table>
                  </td></tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
                  <tr>
                    <td style="padding:4px;">
                      <a href="mailto:${body.email}?subject=Deine Kostenschätzung – ${tenantName}" style="display:inline-block;padding:10px 20px;background:${primaryColor};color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">✉️ Follow-up senden</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:12px;color:#9ca3af;">Lead wurde in der Datenbank gespeichert (price_calculation_leads).</p>
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
    </html>
  `
}
