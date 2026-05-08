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
  /** Verified custom from-address. Falls back to platform address when absent/unverified. */
  fromEmail?: string | null
  /** Must be true for fromEmail to be used. */
  domainVerified?: boolean
  /** Override the whole From header (skips fromName/fromEmail logic). */
  from?: string
}

export async function sendEmail(options: SendEmailOptions): Promise<{ messageId: string }> {
  const resend = getResend()

  let from: string
  if (options.from) {
    from = options.from
  } else if (options.fromEmail && options.domainVerified) {
    // Use tenant's verified custom domain
    from = options.fromName
      ? `${options.fromName} <${options.fromEmail}>`
      : options.fromEmail
  } else {
    // Fall back to platform sender, keep tenant display name if given
    from = options.fromName
      ? `${options.fromName} <${PLATFORM_FROM_EMAIL}>`
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
 * Use this in server routes where you only have the tenantId.
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
