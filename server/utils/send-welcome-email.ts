/**
 * Sends a branded welcome email after successful registration.
 *
 * - client  → tenant-branded email ("Willkommen bei [Tenant]!")
 * - staff   → tenant-branded email ("Willkommen im Team – [Tenant]!")
 * - admin   → Simy platform email  ("Willkommen bei Simy, [Tenant]!")
 *
 * Pass tenantName/tenantSlug/tenantPrimaryColor/tenantFromEmail/tenantDomainVerified
 * directly to avoid an extra DB round-trip (e.g. tenant registration where the
 * data is already in memory). Otherwise the function fetches them from the DB.
 */

import { sendEmail } from '~/server/utils/email'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { getTerminologyDefaults, type Terminology } from '~/composables/useTerminology'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import {
  buildBrandedEmailShell,
  displayName,
  emailCtaButton,
  emailDetailBox,
  emailSignature,
  escapeAttr,
  escapeHtml,
} from '~/server/utils/branded-email'
import { SAAS_TRIAL_LABEL } from '~/utils/saas-trial'

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
  /** Optional – when already known from registration */
  businessType?: string | null
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
  let businessType = params.businessType ?? null

  // Always fetch tenant branding when anything is missing (incl. logo)
  {
    const supabase = getSupabaseAdmin()
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, slug, primary_color, from_email, resend_domain_verified, logo_wide_url, logo_url, logo_square_url, business_type')
      .eq('id', tenantId)
      .single()

    businessType   = businessType ?? tenant?.business_type ?? null
    const termsFallback = getTerminologyDefaults(businessType)
    tenantName     = tenantName  ?? tenant?.name          ?? termsFallback.businessNoun
    tenantSlug     = tenantSlug  ?? tenant?.slug           ?? ''
    primaryColor   = params.tenantPrimaryColor ?? tenant?.primary_color ?? '#3B82F6'
    fromEmail      = params.tenantFromEmail    ?? tenant?.from_email     ?? null
    domainVerified = params.tenantDomainVerified ?? tenant?.resend_domain_verified ?? false
    const rawLogoUrl = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
    // Skip base64 data URIs – they bloat the email to 100KB+ and cause bounces
    logoUrl = rawLogoUrl?.startsWith('data:') ? null : rawLogoUrl
  }

  const terms = await getTenantTerminology(getSupabaseAdmin(), tenantId)
  const safeTenantName = tenantName || terms.businessNoun

  const baseUrl  = process.env.NUXT_PUBLIC_BASE_URL || 'https://app.simy.ch'
  const loginUrl = tenantSlug ? `${baseUrl}/${tenantSlug}` : baseUrl

  if (role === 'admin') {
    await sendEmail({
      to,
      subject: `Willkommen bei Simy, ${safeTenantName}! 🎉`,
      senderName: 'Pascal von Simy',
      html: buildAdminHtml(firstName, safeTenantName, loginUrl, terms),
    })
  } else {
    const subject = role === 'staff'
      ? `Willkommen im Team – ${safeTenantName}!`
      : `Willkommen bei ${safeTenantName}!`

    await sendEmail({
      to,
      subject,
      fromName: safeTenantName,
      fromEmail,
      domainVerified,
      html: buildUserHtml(role, firstName, safeTenantName, primaryColor, loginUrl, logoUrl, terms),
    })
  }

  logger.debug(`✅ Welcome email (${role}) sent to ${to}`)
}

// ─── HTML Builders ─────────────────────────────────────────────────────────────

function appStoreBlock(): string {
  return `<div style="margin:24px 0 0;text-align:center">
  <p style="margin:0 0 10px;color:#9ca3af;font-size:12px;">Simy auch als iPhone-App verfügbar</p>
  <a href="https://apps.apple.com/ch/app/simy/id6766244063" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;font-weight:600;">Laden im App Store</a>
</div>`
}

function buildUserHtml(
  role: 'client' | 'staff',
  firstName: string,
  tenantName: string,
  primaryColor: string,
  loginUrl: string,
  logoUrl: string | null = null,
  terms: Terminology = getTerminologyDefaults('driving_school'),
): string {
  const isStaff = role === 'staff'
  const name = displayName(tenantName)

  const headline = isStaff
    ? `Willkommen im Team, ${escapeHtml(firstName)}!`
    : `Willkommen, ${escapeHtml(firstName)}!`

  const intro = isStaff
    ? `Du bist jetzt als ${escapeHtml(terms.staff)} bei <strong>${name}</strong> registriert. Dein Dashboard wartet auf dich.`
    : `Du bist jetzt bei <strong>${name}</strong> registriert und kannst sofort loslegen.`

  const checklist = isStaff
    ? [
        'Kalender & Verfügbarkeiten prüfen',
        `${terms.clientsPlural}-Liste ansehen`,
        `Erste ${terms.appointment} buchen`,
        'Profil vervollständigen',
      ]
    : [
        terms.bookAction,
        'Kurse ansehen',
        'Fortschritt verfolgen',
        'Profil vervollständigen',
      ]

  const ctaLabel = isStaff ? `Zum ${terms.staff}-Dashboard` : 'Jetzt einloggen'

  const checklistHtml = emailDetailBox(
    primaryColor,
    `<p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Was dich erwartet</p>${checklist
      .map(item => `<p style="margin:0 0 6px;color:#374151;font-size:14px;">&#10003;&nbsp; ${escapeHtml(item)}</p>`)
      .join('')}`,
  )

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">${intro}</p>
    ${checklistHtml}
    ${emailCtaButton(loginUrl, ctaLabel, primaryColor)}
    <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
      Oder öffne: <a href="${escapeAttr(loginUrl)}" style="color:${primaryColor};">${escapeHtml(loginUrl)}</a>
    </p>
    ${appStoreBlock()}
    ${emailSignature(tenantName, null, primaryColor)}
  `

  return buildBrandedEmailShell({
    title: headline,
    tenantName,
    primaryColor,
    logoUrl,
    bodyHtml,
    documentTitle: isStaff ? `Willkommen im Team – ${tenantName}` : `Willkommen bei ${tenantName}`,
  })
}

function buildAdminHtml(
  firstName: string,
  tenantName: string,
  loginUrl: string,
  terms: Terminology = getTerminologyDefaults('driving_school'),
): string {
  const name = displayName(tenantName)
  const primary = '#6000BD'

  const steps = emailDetailBox(
    primary,
    `<p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${primary};text-transform:uppercase;letter-spacing:0.5px;">Erste Schritte</p>${[
      'Logo und Profil einrichten',
      `Ersten ${terms.staff} hinzufügen`,
      `Ersten ${terms.client} einladen`,
      'Zahlungen einrichten (Wallee)',
    ].map(s => `<p style="margin:0 0 6px;color:#374151;font-size:14px;">&#10003;&nbsp; ${escapeHtml(s)}</p>`).join('')}`,
  )

  const bodyHtml = `
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hallo <strong>${escapeHtml(firstName)}</strong>,</p>
    <p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
      dein Simy-Konto für <strong>${name}</strong> ist bereit.
      Du hast <strong>${SAAS_TRIAL_LABEL} kostenlos</strong> Zeit, alle Features auszuprobieren – keine Kreditkarte nötig.
    </p>
    ${steps}
    ${emailCtaButton(loginUrl, 'Zum Dashboard', primary)}
    <p style="color:#374151;font-size:14px;margin:0 0 8px;">
      Fragen? Ich bin jederzeit erreichbar:
      <a href="mailto:info@simy.ch" style="color:${primary};font-weight:600;">info@simy.ch</a>
    </p>
    <p style="color:#374151;font-size:14px;margin:16px 0 0;font-weight:600;">
      Pascal<br><span style="color:#6b7280;font-weight:400;">Simy</span>
    </p>
    ${appStoreBlock()}
  `

  return buildBrandedEmailShell({
    title: 'Herzlich willkommen bei Simy!',
    subtitle: `Deine ${escapeHtml(terms.businessNoun)} ist jetzt auf Autopilot.`,
    tenantName: 'Simy',
    primaryColor: primary,
    logoUrl: null,
    bodyHtml,
  })
}
