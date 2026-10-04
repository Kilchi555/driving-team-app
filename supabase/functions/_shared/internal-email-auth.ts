/**
 * Server-to-server gate for SIMY email edge functions.
 *
 * The same env name is required in two places because they do not share a
 * process environment:
 * - Vercel / Nitro: SIMY_INTERNAL_EMAIL_SECRET
 * - Supabase Edge Function secrets: SIMY_INTERNAL_EMAIL_SECRET
 *
 * This is not CRON_SECRET, RESEND_API_KEY, or the service-role key.
 * Gateway JWT verification is not this control. A logged-in user JWT must
 * still fail closed here.
 */

export const INTERNAL_EMAIL_SECRET_HEADER = 'x-simy-internal-email-secret'
export const PLATFORM_FROM_EMAIL = 'noreply@simy.ch'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_BODY = 200_000

export async function secretsEqual(provided: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [left, right] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(provided)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ])
  const a = new Uint8Array(left)
  const b = new Uint8Array(right)
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/**
 * Fail closed when the function secret is unset, the header is missing,
 * or the header does not match. Both failures are the same result so the
 * response does not reveal which one happened.
 */
export async function authorizeInternalEmail(
  headerValue: string | null | undefined,
  configuredSecret: string | null | undefined,
): Promise<boolean> {
  const expected = configuredSecret?.trim() ?? ''
  const provided = headerValue?.trim() ?? ''
  if (!expected || !provided) {
    await secretsEqual(provided || 'missing', expected || 'unset')
    return false
  }
  return secretsEqual(provided, expected)
}

export function unauthorizedResponse(corsHeaders: Record<string, string> = {}): Response {
  return json({ error: 'Unauthorized' }, 401, corsHeaders)
}

export function invalidRequestResponse(corsHeaders: Record<string, string> = {}): Response {
  return json({ error: 'Invalid request' }, 400, corsHeaders)
}

export function unableToSendResponse(corsHeaders: Record<string, string> = {}): Response {
  return json({ error: 'Unable to send email' }, 502, corsHeaders)
}

export function json(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export type OutboundEmail = {
  to: string
  subject: string
  html: string
}

/**
 * Accepts the two existing server payload shapes (`to`+`body`, or `email`+`html`).
 * Sender identity is fixed. A caller-supplied from address is rejected unless
 * it is exactly the platform address.
 */
export function parseOutboundEmail(input: unknown): { ok: true; email: OutboundEmail } | { ok: false } {
  if (!input || typeof input !== 'object') return { ok: false }
  const body = input as Record<string, unknown>

  if (body.from !== undefined && body.from !== null && body.from !== '' && body.from !== PLATFORM_FROM_EMAIL) {
    return { ok: false }
  }

  const toField = typeof body.to === 'string' ? body.to.trim() : ''
  const emailField = typeof body.email === 'string' ? body.email.trim() : ''
  if (toField && emailField && toField.toLowerCase() !== emailField.toLowerCase()) return { ok: false }
  const to = toField || emailField
  if (!to || to.length > 320 || !EMAIL_RE.test(to) || to.includes('\n') || to.includes('\r')) return { ok: false }

  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  if (!subject || subject.length > 200 || /[\r\n]/.test(subject)) return { ok: false }

  const plain = typeof body.body === 'string' ? body.body : ''
  const html = typeof body.html === 'string' ? body.html : ''
  const content = plain.trim() ? plain : html
  if (!content.trim() || content.length > MAX_BODY) return { ok: false }

  const rendered = plain.trim() ? plain.replace(/\n/g, '<br>') : html
  return { ok: true, email: { to, subject, html: rendered } }
}

const INVITE_HOSTS = new Set(['simy.ch', 'www.simy.ch', 'app.simy.ch'])

export type StaffInvite = {
  email: string
  firstName: string
  lastName: string
  tenantName: string
  inviteLink: string
}

export function parseStaffInvite(input: unknown): { ok: true; invite: StaffInvite } | { ok: false } {
  if (!input || typeof input !== 'object') return { ok: false }
  const body = input as Record<string, unknown>

  if (body.fromEmail !== undefined && body.fromEmail !== null && body.fromEmail !== '' && body.fromEmail !== PLATFORM_FROM_EMAIL) {
    return { ok: false }
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
  const tenantName = typeof body.tenantName === 'string' && body.tenantName.trim()
    ? body.tenantName.trim()
    : 'Driving Team'
  const inviteLink = typeof body.inviteLink === 'string' ? body.inviteLink.trim() : ''

  if (!email || email.length > 320 || !EMAIL_RE.test(email)) return { ok: false }
  if (!firstName || firstName.length > 100 || /[\r\n<>]/.test(firstName)) return { ok: false }
  if (!lastName || lastName.length > 100 || /[\r\n<>]/.test(lastName)) return { ok: false }
  if (tenantName.length > 200 || /[\r\n<>]/.test(tenantName)) return { ok: false }
  if (!isAllowedInviteLink(inviteLink)) return { ok: false }

  return { ok: true, invite: { email, firstName, lastName, tenantName, inviteLink } }
}

export function isAllowedInviteLink(link: string): boolean {
  let url: URL
  try {
    url = new URL(link)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  if (url.username || url.password) return false
  const host = url.hostname.toLowerCase()
  if (INVITE_HOSTS.has(host)) return true
  if (host.endsWith('.simy.ch') && host.split('.').every(part => part.length > 0 && !part.includes(' '))) return true
  return false
}

export type ReminderPayment = {
  id: string
  user_id: string | null
  tenant_id: string | null
  appointment_id: string | null
  total_amount_rappen: number | null
  reminder_count: number | null
  payment_status: string | null
  payment_method: string | null
}

export type ReminderUser = {
  id: string
  tenant_id: string | null
  email: string | null
  first_name: string | null
  last_name: string | null
}

export type ReminderTenant = {
  id: string
  name: string | null
  slug: string | null
}

export type ReminderCaller = {
  userId?: string | null
  tenantId?: string | null
}

const REMINDER_STATUSES = new Set(['pending', 'failed'])

/**
 * Identity comes from the payment row. A caller-supplied user or tenant
 * that does not match that row is rejected. Omitted caller ids are not trusted.
 */
export function bindPaymentReminder(
  payment: ReminderPayment | null | undefined,
  user: ReminderUser | null | undefined,
  tenant: ReminderTenant | null | undefined,
  caller: ReminderCaller = {},
): { ok: true; userId: string; tenantId: string; email: string; reminderNumber: number; amountRappen: number } | { ok: false } {
  if (!payment?.id || !payment.user_id || !payment.tenant_id) return { ok: false }
  if (!REMINDER_STATUSES.has(payment.payment_status ?? '')) return { ok: false }
  if (!payment.payment_method || payment.payment_method === 'free') return { ok: false }
  if (!payment.appointment_id) return { ok: false }

  if (caller.userId && caller.userId !== payment.user_id) return { ok: false }
  if (caller.tenantId && caller.tenantId !== payment.tenant_id) return { ok: false }

  if (!user || user.id !== payment.user_id || user.tenant_id !== payment.tenant_id) return { ok: false }
  if (!user.email || !EMAIL_RE.test(user.email)) return { ok: false }
  if (!tenant || tenant.id !== payment.tenant_id) return { ok: false }
  if (!tenant.slug || !/^[a-z0-9-]{1,80}$/.test(tenant.slug)) return { ok: false }

  const amount = Number(payment.total_amount_rappen)
  if (!Number.isFinite(amount) || amount < 0) return { ok: false }

  const current = Number(payment.reminder_count ?? 0)
  const reminderNumber = Number.isFinite(current) && current >= 0 ? current + 1 : 1

  return {
    ok: true,
    userId: payment.user_id,
    tenantId: payment.tenant_id,
    email: user.email,
    reminderNumber,
    amountRappen: amount,
  }
}
