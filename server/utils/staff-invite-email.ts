/**
 * Branded staff-invitation email — explains Admin vs Staff logins
 * and includes the registration CTA.
 */

import {
  buildBrandedEmailShell,
  displayName,
  emailCtaButton,
  emailDetailBox,
  escapeHtml,
} from '~/server/utils/branded-email'

export function isPlaceholderStaffInviteEmail(email: string | null | undefined): boolean {
  if (!email) return true
  const e = email.toLowerCase()
  return e.includes('@onboarding.simy.ch') || (e.startsWith('pending_') && e.includes('@invite.simy.ch'))
}

export function buildStaffInviteEmailHtml(opts: {
  firstName: string
  tenantName: string
  inviteLink: string
  staffLabel: string
  loginUrl?: string | null
  /** Admin email that must NOT be reused for staff registration */
  adminEmail?: string | null
  primaryColor?: string
  logoUrl?: string | null
}): string {
  const {
    firstName,
    tenantName,
    inviteLink,
    staffLabel,
    loginUrl,
    adminEmail,
    primaryColor = '#6000BD',
    logoUrl = null,
  } = opts

  const name = displayName(tenantName)
  const safeStaff = escapeHtml(staffLabel)

  const dualLogin = emailDetailBox(
    primaryColor,
    `<p style="margin:0 0 12px;font-size:12px;font-weight:700;color:${primaryColor};text-transform:uppercase;letter-spacing:0.5px;">Zwei getrennte Logins</p>
    <p style="margin:0 0 10px;color:#374151;font-size:14px;line-height:1.55;">
      <strong>${safeStaff}-Login</strong> = dein Arbeits-Login im Berufsalltag<br>
      (Kalender, Termine, Kunden, Bewertungen).
    </p>
    <p style="margin:0;color:#374151;font-size:14px;line-height:1.55;">
      <strong>Admin-Login</strong> = Einstellungen, Auswertungen, Rechnungen, Zahlungen.
    </p>`,
  )

  const emailHint = adminEmail
    ? `<p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">
        <strong>Wichtig:</strong> Verwende für diesen ${safeStaff}-Login eine
        <strong>andere E-Mail</strong> als
        <span style="font-family:monospace;font-size:13px;">${escapeHtml(adminEmail)}</span>
        (z.B. privat / Gmail / iCloud).
      </p>`
    : `<p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">
        <strong>Wichtig:</strong> Das ist ein eigener Account — nicht denselben Login wie Admin verwenden.
      </p>`

  const loginHint = loginUrl
    ? `<p style="color:#6b7280;font-size:13px;margin:16px 0 0;text-align:center;line-height:1.5;">
        Nach der Registrierung einloggen unter:<br>
        <a href="${escapeHtml(loginUrl)}" style="color:${primaryColor};">${escapeHtml(loginUrl)}</a>
      </p>`
    : ''

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">
      Hallo <strong>${escapeHtml(firstName || '')}</strong>,
    </p>
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">
      du wurdest als <strong>${safeStaff}</strong> bei <strong>${name}</strong> eingeladen.
      Richte jetzt deinen <strong>${safeStaff}-Login für den Berufsalltag</strong> ein.
    </p>
    ${dualLogin}
    ${emailHint}
    ${emailCtaButton(inviteLink, `${staffLabel}-Konto jetzt erstellen`, primaryColor)}
    <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
      Oder Link kopieren:<br>
      <a href="${escapeHtml(inviteLink)}" style="color:${primaryColor};word-break:break-all;">${escapeHtml(inviteLink)}</a>
    </p>
    ${loginHint}
    <p style="color:#9ca3af;font-size:12px;margin:20px 0 0;text-align:center;">Einladung gültig 30 Tage.</p>
  `

  return buildBrandedEmailShell({
    title: `${safeStaff}-Login einrichten`,
    subtitle: `Für den Berufsalltag bei ${name}`,
    tenantName,
    primaryColor,
    logoUrl,
    bodyHtml,
    documentTitle: `Einladung als ${staffLabel} – ${tenantName}`,
  })
}
