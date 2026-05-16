/**
 * Sends a double opt-in consent invitation to a lead.
 * Called automatically when a new lead is created.
 */
import { sendEmail } from '~/server/utils/email'
import { buildConsentLink, buildUnsubscribeLink, wrapMarketingEmail } from '~/server/utils/email-template'

export async function sendConsentEmail({
  leadId,
  token,
  email,
  firstName,
  tenantName,
  primaryColor,
}: {
  leadId: string
  token: string
  email: string
  firstName?: string | null
  tenantName: string
  primaryColor: string
}) {
  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL || 'https://app.simy.ch'
  const consentLink = buildConsentLink(baseUrl, leadId, token)
  const unsubscribeLink = buildUnsubscribeLink(baseUrl, leadId, token)
  const greeting = firstName ? `Hallo ${firstName}` : 'Hallo'

  const content = `
    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;font-weight:700">Bleib auf dem Laufenden!</h2>
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7">${greeting}</p>
    <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7">
      Wir würden dir gerne Infos zu Aktionen, neuen Kursen und Tipps von <strong>${tenantName}</strong> senden.
      Mit einem Klick kannst du dich anmelden — natürlich kostenlos und jederzeit kündbar.
    </p>
    <a href="${consentLink}"
      style="display:block;background:${primaryColor};color:#fff;text-decoration:none;text-align:center;padding:16px 28px;border-radius:12px;font-weight:700;font-size:16px;margin:28px 0">
      ✅ Ja, ich melde mich an!
    </a>
    <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center">
      Kein Interesse? Dann ignoriere diese Email einfach.
    </p>
  `

  await sendEmail({
    to: email,
    subject: `Möchtest du unseren Newsletter? – ${tenantName}`,
    html: wrapMarketingEmail(content, tenantName, unsubscribeLink, primaryColor),
    fromName: tenantName,
  })
}
