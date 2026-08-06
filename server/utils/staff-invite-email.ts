/**
 * Branded staff-invitation email — explains Admin vs Staff logins
 * (only for the first staff member) and includes the registration CTA.
 */

import {
  buildBrandedEmailShell,
  displayName,
  emailCtaButton,
  emailDetailBox,
  escapeHtml,
} from '~/server/utils/branded-email'

type SupabaseLike = {
  from: (table: string) => any
}

export function isPlaceholderStaffInviteEmail(email: string | null | undefined): boolean {
  if (!email) return true
  const e = email.toLowerCase()
  return e.includes('@onboarding.simy.ch') || (e.startsWith('pending_') && e.includes('@invite.simy.ch'))
}

/**
 * True only for the very first staff onboarding of a tenant:
 * no active staff yet, and no other staff invitations (pending/accepted).
 */
export async function isFirstStaffOnboarding(
  supabase: SupabaseLike,
  tenantId: string,
  excludeInvitationId?: string | null,
): Promise<boolean> {
  const { count: staffCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('role', 'staff')
    .eq('is_active', true)

  if ((staffCount || 0) > 0) return false

  let inviteQuery = supabase
    .from('staff_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'accepted'])

  if (excludeInvitationId) {
    inviteQuery = inviteQuery.neq('id', excludeInvitationId)
  }

  const { count: inviteCount } = await inviteQuery
  return (inviteCount || 0) === 0
}

export function buildStaffInviteEmailHtml(opts: {
  firstName: string
  tenantName: string
  inviteLink: string
  staffLabel: string
  /** e.g. Kunden / Klienten / Schüler — branch terminology */
  clientsLabel?: string
  loginUrl?: string | null
  /** Admin email that must NOT be reused for staff registration */
  adminEmail?: string | null
  /** Only for the first staff member — hide afterwards */
  showDualLoginHint?: boolean
  primaryColor?: string
  logoUrl?: string | null
}): string {
  const {
    firstName,
    tenantName,
    inviteLink,
    staffLabel,
    clientsLabel = 'Kunden',
    loginUrl,
    adminEmail,
    showDualLoginHint = false,
    primaryColor = '#6000BD',
    logoUrl = null,
  } = opts

  const name = displayName(tenantName)
  const safeStaff = escapeHtml(staffLabel)
  const safeClients = escapeHtml(clientsLabel)

  const dualLoginBlock = showDualLoginHint
    ? `${emailDetailBox(
        primaryColor,
        `<p style="margin:0 0 12px;font-size:12px;font-weight:700;color:${primaryColor};text-transform:uppercase;letter-spacing:0.5px;">Zwei getrennte Logins</p>
    <p style="margin:0 0 10px;color:#374151;font-size:14px;line-height:1.55;">
      <strong>${safeStaff}-Login</strong> = dein Arbeits-Login im Berufsalltag<br>
      (Kalender, Termine, ${safeClients}, Bewertungen).
    </p>
    <p style="margin:0;color:#374151;font-size:14px;line-height:1.55;">
      <strong>Admin-Login</strong> = Einstellungen, Auswertungen, Rechnungen, Zahlungen.
    </p>`,
      )}
    ${adminEmail
      ? `<p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">
        <strong>Wichtig:</strong> Verwende für diesen ${safeStaff}-Login eine
        <strong>andere E-Mail</strong> als
        <span style="font-family:monospace;font-size:13px;">${escapeHtml(adminEmail)}</span>
        (z.B. privat / Gmail / iCloud).
      </p>`
      : `<p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 16px;">
        <strong>Wichtig:</strong> Das ist ein eigener Account — nicht denselben Login wie Admin verwenden.
      </p>`}`
    : ''

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
    ${dualLoginBlock}
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
