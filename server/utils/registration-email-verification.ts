/**
 * Public tenant registration email verification.
 * Raw tokens are never persisted — only sha256 hashes.
 */

import { createHash, randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '~/server/utils/email'
import { generateRegistrationToken } from '~/server/utils/registration-token'

export const REGISTRATION_EMAIL_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour
export const REGISTRATION_STATUS_PENDING = 'pending_email_verification'
export const REGISTRATION_STATUS_EMAIL_VERIFIED = 'email_verified'
export const REGISTRATION_STATUS_ACTIVE = 'active'

export function normalizeRegistrationEmail(email: string): string {
  return String(email || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

export function hashRegistrationEmailToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex')
}

export function mintRegistrationEmailToken(): string {
  return randomBytes(32).toString('base64url')
}

export function buildRegistrationVerifyUrl(rawToken: string): string {
  const base =
    process.env.NUXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.URL ||
    'https://app.simy.ch'
  const origin = base.replace(/\/$/, '')
  return `${origin}/tenant-register/verify?token=${encodeURIComponent(rawToken)}`
}

export async function issueRegistrationEmailToken(opts: {
  supabase: SupabaseClient
  tenantId: string
  email: string
  ipAddress?: string | null
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const emailNormalized = normalizeRegistrationEmail(opts.email)
  const rawToken = mintRegistrationEmailToken()
  const tokenHash = hashRegistrationEmailToken(rawToken)
  const expiresAt = new Date(Date.now() + REGISTRATION_EMAIL_TOKEN_TTL_MS)

  // Invalidate prior unused tokens for this tenant+email (email change / resend).
  await opts.supabase
    .from('tenant_registration_email_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('tenant_id', opts.tenantId)
    .eq('email_normalized', emailNormalized)
    .is('used_at', null)

  const { error } = await opts.supabase.from('tenant_registration_email_tokens').insert({
    tenant_id: opts.tenantId,
    email_normalized: emailNormalized,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    created_ip: opts.ipAddress || null,
  })

  if (error) {
    throw new Error(`Failed to persist registration email token: ${error.message}`)
  }

  return { rawToken, expiresAt }
}

export async function sendRegistrationVerificationEmail(opts: {
  to: string
  tenantName: string
  rawToken: string
}): Promise<{ messageId: string }> {
  const url = buildRegistrationVerifyUrl(opts.rawToken)
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
      <h1 style="font-size: 20px;">E-Mail bestätigen</h1>
      <p>Hallo,</p>
      <p>bitte bestätige die E-Mail-Adresse für die Simy-Registrierung von
        <strong>${escapeHtml(opts.tenantName)}</strong>.</p>
      <p style="margin: 28px 0;">
        <a href="${url}"
           style="background:#111827;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;">
          E-Mail bestätigen
        </a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Der Link ist eine Stunde gültig und kann nur einmal verwendet werden.
        Falls du dich nicht registriert hast, ignoriere diese Nachricht.</p>
    </div>
  `
  return sendEmail({
    to: opts.to,
    subject: 'Bitte E-Mail bestätigen — Simy Registrierung',
    html,
    fromName: 'Simy',
  })
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type ConsumeVerificationResult =
  | {
      ok: true
      tenantId: string
      email: string
      registrationToken: string
      slug: string
      name: string
    }
  | {
      ok: false
      reason:
        | 'invalid'
        | 'expired'
        | 'used'
        | 'email_mismatch'
        | 'tenant_missing'
        | 'already_verified'
    }

/**
 * Atomically consume a verification token and activate the tenant for onboarding.
 * Registration HMAC token is issued only after successful verification.
 */
export async function consumeRegistrationEmailToken(
  supabase: SupabaseClient,
  rawToken: string
): Promise<ConsumeVerificationResult> {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 20) {
    return { ok: false, reason: 'invalid' }
  }

  const tokenHash = hashRegistrationEmailToken(rawToken)
  const { data: row, error } = await supabase
    .from('tenant_registration_email_tokens')
    .select('id, tenant_id, email_normalized, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error || !row) return { ok: false, reason: 'invalid' }
  if (row.used_at) return { ok: false, reason: 'used' }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' }
  }

  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, name, slug, contact_email, email_verified_at, registration_status, is_active')
    .eq('id', row.tenant_id)
    .maybeSingle()

  if (tenantErr || !tenant) return { ok: false, reason: 'tenant_missing' }

  const contactNormalized = normalizeRegistrationEmail(tenant.contact_email || '')
  if (!contactNormalized || contactNormalized !== row.email_normalized) {
    return { ok: false, reason: 'email_mismatch' }
  }

  // Mark token used first (single-use). If later steps fail, token stays consumed
  // and a resend is required — prevents replay.
  const { data: consumed, error: consumeErr } = await supabase
    .from('tenant_registration_email_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('used_at', null)
    .select('id')
    .maybeSingle()

  if (consumeErr || !consumed) {
    return { ok: false, reason: 'used' }
  }

  const nowIso = new Date().toISOString()
  const { error: activateErr } = await supabase
    .from('tenants')
    .update({
      email_verified_at: tenant.email_verified_at || nowIso,
      registration_status: REGISTRATION_STATUS_EMAIL_VERIFIED,
      is_active: true,
      updated_at: nowIso,
    })
    .eq('id', tenant.id)

  if (activateErr) {
    console.error('❌ Failed to activate tenant after email verification:', activateErr.message)
    return { ok: false, reason: 'tenant_missing' }
  }

  return {
    ok: true,
    tenantId: tenant.id,
    email: contactNormalized,
    registrationToken: generateRegistrationToken(tenant.id),
    slug: tenant.slug,
    name: tenant.name,
  }
}

export function tenantAllowsPrivilegedOnboarding(tenant: {
  is_active?: boolean | null
  email_verified_at?: string | null
  registration_status?: string | null
}): boolean {
  if (!tenant?.is_active) return false
  if (!tenant.email_verified_at) return false
  const status = tenant.registration_status || REGISTRATION_STATUS_ACTIVE
  return (
    status === REGISTRATION_STATUS_EMAIL_VERIFIED ||
    status === REGISTRATION_STATUS_ACTIVE
  )
}
