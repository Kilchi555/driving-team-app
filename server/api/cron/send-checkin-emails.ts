/**
 * Cron: Send tenant check-in emails
 * POST /api/cron/send-checkin-emails
 *
 * Runs daily. Sends a friendly check-in email to tenants at:
 *   - Day 7  after registration: "Alles OK?"
 *   - Day 30 after registration: "Wie läuft's?"
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { verifyCronToken } from '~/server/utils/cron'

const WINDOWS = [
  { days: 7,  subject: 'Wie läuft Simy bisher für dich? 👋', label: '7-Tage' },
  { days: 30, subject: 'Ein Monat Simy – wie zufrieden bist du? 🎯', label: '30-Tage' },
]

export default defineEventHandler(async (event) => {
  if (!verifyCronToken(event)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
  const now = new Date()
  let totalSent = 0

  for (const { days, subject, label } of WINDOWS) {
    const windowStart = new Date(now.getTime() - (days + 0.5) * 86400_000)
    const windowEnd   = new Date(now.getTime() - (days - 0.5) * 86400_000)

    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name, slug, contact_email, contact_person_first_name, created_at')
      .gte('created_at', windowStart.toISOString())
      .lt('created_at', windowEnd.toISOString())
      .eq('is_active', true)

    for (const tenant of tenants || []) {
      if (!tenant.contact_email) continue

      const firstName = tenant.contact_person_first_name || tenant.name
      const loginUrl = `${baseUrl}/${tenant.slug}`

      try {
        await sendEmail({
          to: tenant.contact_email,
          subject,
          senderName: 'Pascal von Simy',
          html: buildCheckinEmail({ firstName, tenantName: tenant.name, loginUrl, baseUrl, days }),
        })
        totalSent++
        console.log(`📧 ${label} check-in sent to ${tenant.contact_email}`)
      } catch (err) {
        console.error(`❌ Check-in email failed for ${tenant.contact_email}:`, err)
      }
    }
  }

  return { success: true, sent: totalSent }
})

function buildCheckinEmail({ firstName, tenantName, loginUrl, baseUrl, days }: {
  firstName: string
  tenantName: string
  loginUrl: string
  baseUrl: string
  days: number
}) {
  const intro = days === 7
    ? `Du nutzt Simy jetzt seit einer Woche – wie läuft es so weit für dich?`
    : `Du nutzt Simy nun seit einem Monat. Wir hoffen, es läuft alles nach deinen Vorstellungen!`

  const question = days === 7
    ? `Läuft alles nach Plan? Gibt es etwas, wobei wir dir helfen können?`
    : `Bist du mit Simy zufrieden? Haben wir deine Erwartungen erfüllt?`

  return `<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;background:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;">

        <tr>
          <td style="background:linear-gradient(135deg,#6000BD,#8B2FE8);padding:36px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">
              ${days === 7 ? '👋 Kurzes Hallo nach einer Woche!' : '🎯 Wie läuft es nach einem Monat?'}
            </h1>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 36px 24px;">
            <p style="color:#111;font-size:16px;margin:0 0 16px;">Hallo <strong>${firstName}</strong>,</p>
            <p style="color:#444;font-size:15px;line-height:1.65;margin:0 0 16px;">${intro}</p>
            <p style="color:#444;font-size:15px;line-height:1.65;margin:0 0 24px;">${question}</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7ff;border-radius:8px;border:1px solid #e9d5ff;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 8px;color:#444;font-size:15px;line-height:1.6;">
                    Falls du Fragen hast, etwas nicht funktioniert oder du Feedback geben möchtest — 
                    schreib uns einfach eine kurze E-Mail an 
                    <a href="mailto:info@simy.ch" style="color:#6000BD;font-weight:600;text-decoration:none;">info@simy.ch</a>.
                    Wir antworten innerhalb von 24 Stunden.
                  </p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:24px;">
                  <a href="${loginUrl}"
                    style="display:inline-block;background:linear-gradient(135deg,#6000BD,#8B2FE8);color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:600;">
                    Zum Dashboard →
                  </a>
                </td>
              </tr>
            </table>

            <p style="color:#555;font-size:14px;margin:0;">Liebe Grüsse,</p>
            <p style="color:#333;font-size:14px;margin:6px 0 0;font-weight:600;">Pascal<br>
              <span style="color:#888;font-weight:400;">Simy – Fahrschulsoftware</span>
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#f8f9fa;padding:18px 36px;border-top:1px solid #eee;text-align:center;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
              Simy · support@simy.ch ·
              <a href="${baseUrl}/agb" style="color:#9ca3af;">AGB</a> ·
              <a href="${baseUrl}/datenschutz" style="color:#9ca3af;">Datenschutz</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
