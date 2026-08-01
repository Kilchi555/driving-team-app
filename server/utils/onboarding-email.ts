// Shared onboarding / registration-reminder email HTML (aligned with appointment confirm layout).

export type OnboardingEmailVariant = 'welcome' | 'reminder'

export interface OnboardingEmailParams {
  variant: OnboardingEmailVariant
  tenantName: string
  primaryColor: string
  logoUrl: string | null
  customerFirstName: string
  onboardingLink: string
  /** Login / tenant app URL for “already registered” hint */
  loginLink?: string | null
  /** e.g. Fahrschule / Consulting-Unternehmen — used in help text */
  businessNoun: string
  /** Link validity in days (default 30) */
  linkValidDays?: number
}

function logoRow(logoUrl: string | null, tenantName: string): string {
  if (!logoUrl) return ''
  return `<tr><td style="background:#fff;text-align:center;padding:20px 30px 16px"><img src="${logoUrl}" alt="${escapeAttr(tenantName)}" style="height:44px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></td></tr>`
}

/** Escape for HTML text nodes. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, '&#39;')
}

/**
 * Prevent mail clients (Apple Mail, Outlook, etc.) from auto-linking
 * domain-like names such as "Simy.ch" by inserting a zero-width space
 * before each ".".
 */
function displayName(text: string): string {
  return escapeHtml(text).replace(/\./g, '&#8203;.')
}

export function buildOnboardingEmailHtml(p: OnboardingEmailParams): string {
  const days = p.linkValidDays ?? 30
  const firstName = escapeHtml(p.customerFirstName || 'Hallo')
  const tenantName = displayName(p.tenantName)
  const businessNoun = escapeHtml(p.businessNoun)
  const loginLink = p.loginLink || 'https://app.simy.ch/login'
  const onboardingHref = escapeAttr(p.onboardingLink)
  const loginHref = escapeAttr(loginLink)

  const title = p.variant === 'reminder'
    ? 'Registrierungserinnerung'
    : `Willkommen bei ${tenantName}`

  const intro = p.variant === 'reminder'
    ? `wir erinnern dich daran, dass deine Registrierung bei <strong>${tenantName}</strong> noch ausstehend ist. Schliess sie jetzt ab, um dein Konto zu aktivieren und deine Buchungen zu verwalten.`
    : `schön, dass du dich für uns entschieden hast! Um dein Konto zu aktivieren, klicke auf den Button und folge den Schritten (Passwort setzen, Profil ergänzen).`

  const ctaLabel = p.variant === 'reminder' ? 'Jetzt registrieren' : 'Registrierung abschliessen'

  const infoBox = `<div style="background-color:#f8f9fa;border-left:4px solid ${p.primaryColor};padding:15px;margin:20px 0;border-radius:4px">
    <p style="margin:5px 0;color:#374151"><strong>Nächster Schritt:</strong> Passwort setzen und Profil ergänzen</p>
    <p style="margin:5px 0;color:#374151"><strong>Gültigkeit:</strong> ${days} Tage</p>
    <p style="margin:5px 0;color:#374151"><strong>${businessNoun}:</strong> ${tenantName}</p>
  </div>`

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${p.variant === 'reminder' ? 'Registrierungserinnerung' : `Willkommen bei ${escapeHtml(p.tenantName)}`}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td>
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);margin:0 auto;">
          ${logoRow(p.logoUrl, p.tenantName)}
          <tr>
            <td style="background-color:${p.primaryColor};padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:bold;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Hallo ${firstName},</p>
              <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">${intro}</p>

              ${infoBox}

              <div style="text-align:center;margin:30px 0;">
                <a href="${onboardingHref}" style="background-color:${p.primaryColor};color:white;padding:15px 40px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;font-size:16px;">${ctaLabel}</a>
              </div>

              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 16px 0;">
                Oder kopiere diesen Link:<br>
                <a href="${onboardingHref}" style="color:${p.primaryColor};word-break:break-all;">${escapeHtml(p.onboardingLink)}</a>
              </p>

              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 20px 0;">
                Bereits registriert? Dann melde dich unter <a href="${loginHref}" style="color:${p.primaryColor}">${escapeHtml(loginLink)}</a> an.<br>
                Link funktioniert nicht? Bitte deine ${businessNoun} um einen neuen Link.
              </p>

              <p style="color:#374151;font-size:16px;line-height:1.6;margin:20px 0 0 0;">Freundliche Grüsse,<br><strong>${tenantName}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:30px;border-top:1px solid #e5e7eb;text-align:center;border-radius:0 0 8px 8px;">
              <p style="color:#6b7280;font-size:12px;margin:0;">Dies ist eine automatisch generierte E-Mail. Bitte antworte nicht auf diese E-Mail.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
