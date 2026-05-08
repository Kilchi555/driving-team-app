/**
 * Central email utility with per-tenant from-address support.
 *
 * Usage:
 *   // When you have a tenant ID (preferred):
 *   await sendTenantEmail(tenantId, { to, subject, html })
 *
 *   // When you already have tenant data loaded:
 *   await sendEmail({ to, subject, html, fromName: tenant.name, fromEmail: tenant.from_email, domainVerified: tenant.resend_domain_verified })
 *
 *   // Platform fallback (no tenant):
 *   await sendEmail({ to, subject, html })
 */

import { Resend } from 'resend'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

const PLATFORM_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@simy.ch'
const PLATFORM_FROM_NAME  = 'Simy'

let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not configured')
    _resend = new Resend(key)
  }
  return _resend
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  /** Display name shown to the recipient, e.g. "Driving Team AG" */
  fromName?: string
  /** @deprecated use fromName */
  senderName?: string
  /** Verified custom from-address. Falls back to platform address when absent/unverified. */
  fromEmail?: string | null
  /** Must be true for fromEmail to be used. */
  domainVerified?: boolean
  /** Override the whole From header (skips fromName/fromEmail logic). */
  from?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<{ messageId: string }> {
  const resend = getResend()

  // Support legacy senderName alias
  const displayName = options.fromName ?? options.senderName

  let from: string
  if (options.from) {
    from = options.from
  } else if (options.fromEmail && options.domainVerified) {
    from = displayName ? `${displayName} <${options.fromEmail}>` : options.fromEmail
  } else {
    from = displayName
      ? `${displayName} <${PLATFORM_FROM_EMAIL}>`
      : `${PLATFORM_FROM_NAME} <${PLATFORM_FROM_EMAIL}>`
  }

  const { data, error } = await resend.emails.send({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  })

  if (error) throw error
  return { messageId: data!.id }
}

/**
 * Convenience wrapper: loads tenant from DB, then calls sendEmail.
 */
export async function sendTenantEmail(
  tenantId: string,
  options: Omit<SendEmailOptions, 'fromName' | 'fromEmail' | 'domainVerified'>
): Promise<{ messageId: string }> {
  const supabase = getSupabaseAdmin()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, from_email, resend_domain_verified')
    .eq('id', tenantId)
    .single()

  return sendEmail({
    ...options,
    fromName: tenant?.name ?? undefined,
    fromEmail: tenant?.from_email ?? null,
    domainVerified: tenant?.resend_domain_verified ?? false,
  })
}

// ─── Email Template Generators ────────────────────────────────────────────────

function emailWrapper(content: string, tenantName?: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.07)}
.header{background:linear-gradient(135deg,#1e293b,#334155);padding:28px 32px}
.header h1{margin:0;color:#fff;font-size:20px;font-weight:700}
.body{padding:32px}
.label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#6b7280;margin-bottom:4px}
.value{font-size:15px;color:#111827;margin-bottom:20px}
.box{background:#f9fafb;border-radius:12px;padding:20px 24px;margin:20px 0}
.footer{border-top:1px solid #f3f4f6;padding:20px 32px;font-size:12px;color:#9ca3af;text-align:center}</style></head>
<body><div class="wrap">${content}
<div class="footer">${tenantName || 'Simy'} · Powered by Simy.ch</div>
</div></body></html>`
}

export interface AppointmentDeletedEmailParams {
  customerName: string
  appointmentDate: string
  appointmentTime: string
  staffName: string
  reason: string
  tenantName: string
  tenantEmail?: string
  tenantPhone?: string
}

export function generateAppointmentDeletedEmail(p: AppointmentDeletedEmailParams): string {
  const content = `
<div class="header"><h1>Termin storniert</h1></div>
<div class="body">
  <p style="color:#374151;font-size:15px;margin-bottom:24px">Hallo ${p.customerName},<br><br>
  leider musste Ihr Termin bei <strong>${p.tenantName}</strong> automatisch storniert werden.</p>
  <div class="box">
    <div class="label">Datum & Uhrzeit</div>
    <div class="value">${p.appointmentDate} um ${p.appointmentTime} Uhr</div>
    <div class="label">Fahrlehrer</div>
    <div class="value">${p.staffName}</div>
    <div class="label">Grund</div>
    <div class="value">${p.reason}</div>
  </div>
  <p style="color:#374151;font-size:14px">Bitte kontaktieren Sie uns, um einen neuen Termin zu vereinbaren.</p>
  ${p.tenantEmail || p.tenantPhone ? `<div class="box">
    ${p.tenantEmail ? `<div class="label">E-Mail</div><div class="value"><a href="mailto:${p.tenantEmail}" style="color:#2563eb">${p.tenantEmail}</a></div>` : ''}
    ${p.tenantPhone ? `<div class="label">Telefon</div><div class="value">${p.tenantPhone}</div>` : ''}
  </div>` : ''}
</div>`
  return emailWrapper(content, p.tenantName)
}

export interface StaffNotificationEmailParams {
  staffName: string
  customerName: string
  appointmentDate: string
  appointmentTime: string
  reason: string
  tenantName: string
}

export function generateStaffNotificationEmail(p: StaffNotificationEmailParams): string {
  const content = `
<div class="header"><h1>Termin automatisch storniert</h1></div>
<div class="body">
  <p style="color:#374151;font-size:15px;margin-bottom:24px">Hallo ${p.staffName},<br><br>
  ein Termin wurde automatisch storniert, da keine Terminbestätigung erhalten wurde.</p>
  <div class="box">
    <div class="label">Kunde</div>
    <div class="value">${p.customerName}</div>
    <div class="label">Datum & Uhrzeit</div>
    <div class="value">${p.appointmentDate} um ${p.appointmentTime} Uhr</div>
    <div class="label">Grund</div>
    <div class="value">${p.reason}</div>
  </div>
  <p style="color:#374151;font-size:14px">Falls nötig, kontaktiere den Kunden direkt, um den Termin neu zu vereinbaren.</p>
</div>`
  return emailWrapper(content, p.tenantName)
}
