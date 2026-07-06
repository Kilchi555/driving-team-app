import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const { tenant_id: tenantId } = await requireAdminProfile(event)

  const body = await readBody(event)
  const { email, firstName } = body

  if (!email) {
    throw createError({ statusCode: 400, message: 'E-Mail fehlt' })
  }

  const supabase = getSupabaseAdmin()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, primary_color, rental_portal_slug, slug')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })
  }

  const tenantName = tenant.name || 'Ihre Fahrschule'
  const primaryColor = tenant.primary_color || '#2563eb'
  const portalSlug = tenant.rental_portal_slug || tenant.slug || ''
  const baseUrl = process.env.APP_URL || 'https://app.simy.ch'
  const portalUrl = `${baseUrl}/partners/${portalSlug}`
  const recipientName = firstName || email

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Einladung zur Fahrzeugvermietung – ${tenantName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: ${primaryColor}; padding: 36px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">
                Fahrzeugvermietung – ${tenantName}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Hallo ${recipientName},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                Sie wurden eingeladen, Fahrzeuge von <strong>${tenantName}</strong> zu mieten.
                Auf unserem Portal können Sie die Fahrzeugverfügbarkeit einsehen und direkt buchen.
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 28px 0;">
                Sie benötigen dafür ein aktives Simy-Konto. Falls Sie noch keines haben, können Sie sich direkt auf dem Portal registrieren.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}"
                       style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: bold;">
                      Zum Fahrzeugportal
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #6b7280; font-size: 13px; line-height: 1.6; margin: 0;">
                Oder kopiere diesen Link:<br>
                <a href="${portalUrl}" style="color: ${primaryColor}; word-break: break-all;">${portalUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">${tenantName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  await sendEmail({
    to: email,
    subject: `Einladung zur Fahrzeugvermietung – ${tenantName}`,
    html: emailHtml,
  })

  return { ok: true }
})
