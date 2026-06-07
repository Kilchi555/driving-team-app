import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'

export default defineEventHandler(async (event) => {
  const { tenantId } = await readBody(event)
  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'Missing tenantId' })

  const supabase = getSupabaseAdmin()
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('name, contact_email, contact_person_first_name, slug')
    .eq('id', tenantId)
    .single()

  if (error || !tenant?.contact_email) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found or missing contact_email' })
  }

  const tenantName = tenant.name
  const contactEmail = tenant.contact_email
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
  const loginUrl = `${baseUrl}/${tenant.slug}`
  const name = tenant.contact_person_first_name || tenantName

  await sendEmail({
    to: contactEmail,
    subject: `Willkommen bei Simy, ${tenantName}! 🎉`,
    senderName: 'Pascal von Simy',
    html: `
<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;font-family:Helvetica,Arial,sans-serif;background:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6000BD,#8B2FE8);padding:40px 36px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
              Herzlich willkommen bei Simy! 🎉
            </h1>
            <p style="margin:12px 0 0;color:rgba(255,255,255,.8);font-size:15px;">
              Deine Fahrschule ist jetzt auf Autopilot.
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 24px;">
            <p style="color:#111;font-size:16px;margin:0 0 16px;">Hallo <strong>${name}</strong>,</p>
            <p style="color:#444;font-size:15px;line-height:1.65;margin:0 0 16px;">
              dein Simy-Konto für <strong>${tenantName}</strong> ist bereit. Du hast <strong>60 Tage kostenlos</strong> Zeit,
              alle Features in Ruhe auszuprobieren — keine Kreditkarte nötig.
            </p>
            <p style="color:#444;font-size:15px;line-height:1.65;margin:0 0 28px;">
              Logge dich jetzt ein und kontrolliere alle Einstellungen:
            </p>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:0 0 28px;">
                  <a href="${loginUrl}"
                    style="display:inline-block;background:linear-gradient(135deg,#6000BD,#8B2FE8);color:#fff;text-decoration:none;padding:16px 44px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.2px;">
                    Zum Dashboard →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Next steps -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f7ff;border-radius:8px;border:1px solid #e9d5ff;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 12px;color:#6000BD;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">
                    Nächste Schritte
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:4px 0;color:#333;font-size:14px;">✅ &nbsp;Fahrlehrer Profil erstellen <span style="color:#888;">(Registrations-SMS wurde bereits versendet)</span></td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:#333;font-size:14px;">✅ &nbsp;Ersten Schüler im Fahrlehrer-Login einladen</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:#333;font-size:14px;">✅ &nbsp;Online-Zahlungen einrichten (<a href="${baseUrl}/admin/profile" style="color:#6000BD;text-decoration:none;font-weight:600;">Wallee einrichten →</a>)</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="color:#555;font-size:14px;line-height:1.65;margin:24px 0 0;">
              Bei Fragen bin ich jederzeit per E-Mail erreichbar:
              <a href="mailto:info@simy.ch" style="color:#6000BD;text-decoration:none;font-weight:600;">info@simy.ch</a>
            </p>
            <p style="color:#555;font-size:14px;margin:8px 0 0;">
              Viel Erfolg mit deiner Fahrschule! 🚗
            </p>
            <p style="color:#333;font-size:14px;margin:20px 0 0;font-weight:600;">Pascal<br>
              <span style="color:#888;font-weight:400;">Simy – die smarte Fahrschul-App</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
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
</html>`,
  })

  return { success: true }
})
