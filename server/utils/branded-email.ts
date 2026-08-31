/**
 * Shared branded email shell — same visual language as appointment confirm
 * and onboarding mails (logo, solid header, accent detail box, signature, footer).
 */

export function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, '&#39;')
}

/** Prevent mail clients from auto-linking domain-like names (e.g. Simy.ch). */
export function displayName(text: string): string {
  return escapeHtml(text).replace(/\./g, '&#8203;.')
}

export function emailLogoRow(logoUrl: string | null | undefined, tenantName: string): string {
  if (!logoUrl || logoUrl.startsWith('data:')) return ''
  return `<tr><td style="background:#fff;text-align:center;padding:20px 30px 16px"><img src="${escapeAttr(logoUrl)}" alt="${escapeAttr(tenantName)}" style="height:44px;max-width:200px;object-fit:contain;display:block;margin:0 auto"></td></tr>`
}

/** Detail / info box with left accent (appointment-confirm style). */
export function emailDetailBox(primaryColor: string, rowsHtml: string): string {
  return `<div style="background-color:#f8f9fa;border-left:4px solid ${primaryColor};padding:15px;margin:20px 0;border-radius:4px">${rowsHtml}</div>`
}

export function emailDetailRow(label: string, valueHtml: string): string {
  return `<p style="margin:5px 0;color:#374151;font-size:14px;line-height:1.5"><strong>${escapeHtml(label)}:</strong> ${valueHtml}</p>`
}

export function emailStatusBox(opts: {
  bg: string
  border: string
  titleColor: string
  bodyColor: string
  title: string
  bodyHtml: string
}): string {
  return `<div style="background:${opts.bg};border-left:4px solid ${opts.border};border-radius:4px;padding:15px;margin:20px 0">
  <p style="margin:0 0 6px;color:${opts.titleColor};font-size:14px;font-weight:700">${opts.title}</p>
  <p style="margin:0;color:${opts.bodyColor};font-size:13px;line-height:1.5">${opts.bodyHtml}</p>
</div>`
}

export function emailCtaButton(href: string, label: string, primaryColor: string): string {
  return `<div style="text-align:center;margin:30px 0">
  <a href="${escapeAttr(href)}" style="background-color:${primaryColor};color:white;padding:15px 40px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:bold;font-size:16px">${escapeHtml(label)}</a>
</div>`
}

export interface BrandedEmailShellParams {
  title: string
  /** Shown under the title in the colored header */
  subtitle?: string
  tenantName: string
  primaryColor: string
  logoUrl?: string | null
  /** Inner HTML for the body (greeting, boxes, CTAs, signature) */
  bodyHtml: string
  documentTitle?: string
}

export function buildBrandedEmailShell(p: BrandedEmailShellParams): string {
  const primary = p.primaryColor || '#2563eb'
  const name = displayName(p.tenantName)
  const title = p.title // may already contain HTML (e.g. displayName)
  const subtitle = p.subtitle
    ? `<p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">${p.subtitle}</p>`
    : `<p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85)">${name}</p>`

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(p.documentTitle || p.title.replace(/<[^>]+>/g, ''))}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
    <tr>
      <td>
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);margin:0 auto;">
          ${emailLogoRow(p.logoUrl, p.tenantName)}
          <tr>
            <td style="background-color:${primary};padding:40px 30px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:bold;">${title}</h1>
              ${subtitle}
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              ${p.bodyHtml}
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

export const SIMY_PRIMARY = '#6000BD'
export const SIMY_GRADIENT = 'linear-gradient(135deg,#6000BD,#8B2FE8)'
export const SIMY_LOGO_URL = 'https://simy.ch/simy-logo.png'
export const SIMY_APP_STORE_URL = 'https://apps.apple.com/ch/app/simy/id6766244063'

/** Platform chrome used by Simy-branded mails (quota alerts, appointment changes). */
export function buildSimyPlatformEmail(opts: {
  eyebrow: string
  title: string
  subtitle?: string
  documentTitle?: string
  bodyHtml: string
  footerHtml?: string
}): string {
  const subtitle = opts.subtitle
    ? `<p style="margin:8px 0 0;font-size:14px;line-height:1.4;color:rgba(255,255,255,.78)">${opts.subtitle}</p>`
    : ''
  const footer = opts.footerHtml
    || `<a href="https://simy.ch" style="color:#9ca3af;text-decoration:none">Simy.ch</a>`

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(opts.documentTitle || opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;padding:0 16px">
    <div style="text-align:center;padding:0 0 18px">
      <a href="https://simy.ch" style="text-decoration:none">
        <img src="${SIMY_LOGO_URL}" alt="Simy" width="120" style="max-width:120px;height:auto;display:inline-block;border:0">
      </a>
    </div>
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)">
      <div style="background:${SIMY_GRADIENT};padding:28px 32px">
        <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.72)">${escapeHtml(opts.eyebrow)}</p>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;line-height:1.25">${opts.title}</h1>
        ${subtitle}
      </div>
      <div style="padding:28px 32px 32px">
        ${opts.bodyHtml}
      </div>
      <div style="border-top:1px solid #f3f4f6;padding:18px 32px;font-size:12px;color:#9ca3af;text-align:center">
        ${footer}
      </div>
    </div>
  </div>
</body>
</html>`
}

export function simyCtaButton(href: string, label: string): string {
  return `<div style="text-align:center;margin:28px 0 8px">
  <a href="${escapeAttr(href)}" style="display:inline-block;background:${SIMY_GRADIENT};color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700">${escapeHtml(label)}</a>
</div>`
}

/** Quiet App Store CTA — keep it below the real message, never in the header. */
export function emailAppStoreBlock(
  caption = 'Simy auch als iPhone-App verfügbar',
  enabled = true,
): string {
  if (!enabled) return ''
  return `<div style="margin:24px 0 0;text-align:center">
  <p style="margin:0 0 10px;color:#9ca3af;font-size:12px;">${escapeHtml(caption)}</p>
  <a href="${SIMY_APP_STORE_URL}" style="display:inline-block;background-color:#111827;color:#ffffff !important;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;border:1px solid #ffffff;">Laden im App Store</a>
</div>`
}

const APPOINTMENT_APP_CAPTION = 'Mitteilungen und Termine in der iPhone-App'

/** Same block, wording for booking / reminder / cancel mails. */
export function emailAppointmentAppStoreBlock(enabled = true): string {
  return emailAppStoreBlock(APPOINTMENT_APP_CAPTION, enabled)
}

export function emailSignature(tenantName: string, contactEmail?: string | null, primaryColor = '#2563eb'): string {
  const name = displayName(tenantName)
  const mail = contactEmail
    ? `<br><a href="mailto:${escapeAttr(contactEmail)}" style="color:${primaryColor};text-decoration:none">${escapeHtml(contactEmail)}</a>`
    : ''
  return `<p style="color:#374151;font-size:16px;line-height:1.6;margin:20px 0 0 0;">Freundliche Grüsse,<br><strong>${name}</strong>${mail}</p>`
}
