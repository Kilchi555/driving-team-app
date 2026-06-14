/**
 * Sends a branded welcome email after successful registration.
 *
 * - client  → tenant-branded email ("Willkommen bei [Fahrschule]!")
 * - staff   → tenant-branded email ("Willkommen im Team – [Fahrschule]!")
 * - admin   → Simy platform email  ("Willkommen bei Simy, [Fahrschule]!")
 *
 * Pass tenantName/tenantSlug/tenantPrimaryColor/tenantFromEmail/tenantDomainVerified
 * directly to avoid an extra DB round-trip (e.g. tenant registration where the
 * data is already in memory). Otherwise the function fetches them from the DB.
 */

import { sendEmail } from '~/server/utils/email'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export type WelcomeEmailRole = 'client' | 'staff' | 'admin'

export interface SendWelcomeEmailParams {
  role: WelcomeEmailRole
  to: string
  firstName: string
  tenantId: string
  /** Optional – skips DB fetch when already known */
  tenantName?: string
  tenantSlug?: string
  tenantPrimaryColor?: string
  tenantFromEmail?: string | null
  tenantDomainVerified?: boolean
}

export async function sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<void> {
  const {
    role, to, firstName, tenantId,
  } = params

  // Resolve tenant data (DB fetch only if not passed in)
  let tenantName = params.tenantName
  let tenantSlug = params.tenantSlug
  let primaryColor = params.tenantPrimaryColor ?? '#3B82F6'
  let fromEmail = params.tenantFromEmail ?? null
  let domainVerified = params.tenantDomainVerified ?? false
  let logoUrl: string | null = null

  if (!tenantName || !tenantSlug) {
    const supabase = getSupabaseAdmin()
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, slug, primary_color, from_email, resend_domain_verified, logo_wide_url, logo_url, logo_square_url')
      .eq('id', tenantId)
      .single()

    tenantName     = tenantName  ?? tenant?.name          ?? 'Fahrschule'
    tenantSlug     = tenantSlug  ?? tenant?.slug           ?? ''
    primaryColor   = params.tenantPrimaryColor ?? tenant?.primary_color ?? '#3B82F6'
    fromEmail      = params.tenantFromEmail    ?? tenant?.from_email     ?? null
    domainVerified = params.tenantDomainVerified ?? tenant?.resend_domain_verified ?? false
    logoUrl        = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
  }

  const baseUrl  = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
  const loginUrl = tenantSlug ? `${baseUrl}/${tenantSlug}` : baseUrl

  if (role === 'admin') {
    await sendEmail({
      to,
      subject: `Willkommen bei Simy, ${tenantName}! 🎉`,
      senderName: 'Pascal von Simy',
      html: buildAdminHtml(firstName, tenantName ?? 'Fahrschule', loginUrl),
    })
  } else {
    const subject = role === 'staff'
      ? `Willkommen im Team – ${tenantName}!`
      : `Willkommen bei ${tenantName}!`

    await sendEmail({
      to,
      subject,
      fromName: tenantName,
      fromEmail,
      domainVerified,
      html: buildUserHtml(role, firstName, tenantName ?? 'Fahrschule', primaryColor, loginUrl, logoUrl),
    })
  }
}

// ─── HTML Builders ─────────────────────────────────────────────────────────────

function buildUserHtml(
  role: 'client' | 'staff',
  firstName: string,
  tenantName: string,
  primaryColor: string,
  loginUrl: string,
  logoUrl: string | null = null,
): string {
  const isStaff = role === 'staff'

  const headline = isStaff
    ? `Willkommen im Team, ${firstName}!`
    : `Willkommen, ${firstName}!`

  const intro = isStaff
    ? `Du bist jetzt als Fahrlehrer/in bei <strong>${tenantName}</strong> registriert. Dein Dashboard wartet auf dich.`
    : `Du bist jetzt bei <strong>${tenantName}</strong> registriert und kannst sofort loslegen.`

  const checklist = isStaff
    ? [
        'Kalender & Verfügbarkeiten prüfen',
        'Schülerliste ansehen',
        'Erste Fahrstunde buchen',
        'Profil vervollständigen',
      ]
    : [
        'Fahrstunden buchen',
        'Kurse ansehen',
        'Fortschritt verfolgen',
        'Profil vervollständigen',
      ]

  const ctaLabel = isStaff ? 'Zum Fahrlehrer-Dashboard' : 'Jetzt einloggen'

  const logoHtml = logoUrl
    ? `<tr><td style="background:#fff;text-align:center;padding:24px 36px 0"><img src="${logoUrl}" alt="${tenantName}" style="height:44px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f3f4f6;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">

  ${logoHtml}
  <!-- Header -->
  <tr>
    <td style="background:${primaryColor};padding:36px 36px 28px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.3px;">${headline}</h1>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${tenantName}</p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:32px 36px 24px;">
      <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">${intro}</p>

      <!-- Checklist -->
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;margin:0 0 28px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#6b7280;">
            Was dich erwartet
          </p>
          ${checklist.map(item => `
          <p style="margin:0 0 6px;color:#374151;font-size:14px;">
            &#10003;&nbsp; ${item}
          </p>`).join('')}
        </td></tr>
      </table>

      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:0 0 24px;">
          <a href="${loginUrl}"
            style="display:inline-block;background:${primaryColor};color:#fff;text-decoration:none;
                   padding:14px 40px;border-radius:8px;font-size:15px;font-weight:600;">
            ${ctaLabel} →
          </a>
        </td></tr>
      </table>

      <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
        Oder öffne: <a href="${loginUrl}" style="color:${primaryColor};">${loginUrl}</a>
      </p>

      <!-- App Store -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
        <tr><td align="center">
          <p style="margin:0 0 10px;color:#9ca3af;font-size:12px;">Simy auch als iPhone-App verfügbar</p>
          <a href="https://apps.apple.com/ch/app/simy/id6766244063"
            style="display:inline-flex;align-items:center;gap:8px;background:#000;color:#fff;
                   text-decoration:none;padding:10px 18px;border-radius:10px;font-family:-apple-system,sans-serif;">
            <span style="font-size:22px;line-height:1;">&#63743;</span>
            <span style="text-align:left;line-height:1.2;">
              <span style="display:block;font-size:9px;color:#ccc;letter-spacing:0.3px;">Laden im</span>
              <span style="display:block;font-size:15px;font-weight:600;color:#fff;">App Store</span>
            </span>
          </a>
        </td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f9fafb;padding:16px 36px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">${tenantName} · Powered by Simy.ch</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

function buildAdminHtml(firstName: string, tenantName: string, loginUrl: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#6000BD,#8B2FE8);padding:40px 36px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:-0.3px;">
        Herzlich willkommen bei Simy!
      </h1>
      <p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">
        Deine Fahrschule ist jetzt auf Autopilot.
      </p>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:32px 36px 24px;">
      <p style="color:#111;font-size:15px;margin:0 0 16px;">Hallo <strong>${firstName}</strong>,</p>
      <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">
        dein Simy-Konto für <strong>${tenantName}</strong> ist bereit.
        Du hast <strong>60 Tage kostenlos</strong> Zeit, alle Features auszuprobieren – keine Kreditkarte nötig.
      </p>

      <!-- First steps -->
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#f9f7ff;border-radius:10px;border:1px solid #e9d5ff;margin:0 0 28px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.7px;color:#6000BD;">
            Erste Schritte
          </p>
          ${[
            'Logo und Profil einrichten',
            'Ersten Fahrlehrer hinzufügen',
            'Ersten Schüler einladen',
            'Zahlungen einrichten (Wallee)',
          ].map(s => `<p style="margin:0 0 6px;color:#374151;font-size:14px;">&#10003;&nbsp; ${s}</p>`).join('')}
        </td></tr>
      </table>

      <!-- CTA -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center" style="padding:0 0 24px;">
          <a href="${loginUrl}"
            style="display:inline-block;background:linear-gradient(135deg,#6000BD,#8B2FE8);color:#fff;
                   text-decoration:none;padding:14px 44px;border-radius:8px;font-size:15px;font-weight:600;">
            Zum Dashboard →
          </a>
        </td></tr>
      </table>

      <p style="color:#555;font-size:14px;margin:0 0 8px;">
        Fragen? Ich bin jederzeit erreichbar:
        <a href="mailto:info@simy.ch" style="color:#6000BD;font-weight:600;">info@simy.ch</a>
      </p>
      <p style="color:#333;font-size:14px;margin:16px 0 0;font-weight:600;">
        Pascal<br><span style="color:#888;font-weight:400;">Simy – Fahrschulsoftware</span>
      </p>

      <!-- App Store -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
        <tr><td align="center">
          <p style="margin:0 0 10px;color:#9ca3af;font-size:12px;">Simy auch als iPhone-App verfügbar</p>
          <a href="https://apps.apple.com/ch/app/simy/id6766244063"
            style="display:inline-flex;align-items:center;gap:8px;background:#000;color:#fff;
                   text-decoration:none;padding:10px 18px;border-radius:10px;font-family:-apple-system,sans-serif;">
            <span style="font-size:22px;line-height:1;">&#63743;</span>
            <span style="text-align:left;line-height:1.2;">
              <span style="display:block;font-size:9px;color:#ccc;letter-spacing:0.3px;">Laden im</span>
              <span style="display:block;font-size:15px;font-weight:600;color:#fff;">App Store</span>
            </span>
          </a>
        </td></tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f8f9fa;padding:16px 36px;border-top:1px solid #eee;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        Simy · support@simy.ch ·
        <a href="https://app.simy.ch/agb" style="color:#9ca3af;">AGB</a> ·
        <a href="https://app.simy.ch/datenschutz" style="color:#9ca3af;">Datenschutz</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`
}
