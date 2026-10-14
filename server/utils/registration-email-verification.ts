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
 * Prefers SQL `consume_tenant_registration_email_token` (FOR UPDATE) when migrated.
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

  // Preferred path: single DB transaction with row locks.
  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    'consume_tenant_registration_email_token',
    { p_token_hash: tokenHash },
  )

  if (!rpcError && Array.isArray(rpcRows) && rpcRows[0]) {
    const row = rpcRows[0] as {
      ok: boolean
      reason: string | null
      tenant_id: string | null
      email_normalized: string | null
      slug: string | null
      tenant_name: string | null
    }
    if (!row.ok) {
      const allowed = new Set([
        'invalid',
        'expired',
        'used',
        'email_mismatch',
        'tenant_missing',
        'already_verified',
      ])
      const reason = allowed.has(String(row.reason))
        ? (row.reason as
            | 'invalid'
            | 'expired'
            | 'used'
            | 'email_mismatch'
            | 'tenant_missing'
            | 'already_verified')
        : 'invalid'
      // Refresh / double-submit after successful verify: re-issue HMAC only while
      // the tenant is verified and still has no admin (prevents stranding).
      if (reason === 'used' || reason === 'already_verified') {
        const reissued = await reissueRegistrationTokenForVerifiedPendingAdmin(
          supabase,
          tokenHash,
        )
        if (reissued) return reissued
      }
      return { ok: false, reason }
    }
    return {
      ok: true,
      tenantId: String(row.tenant_id),
      email: String(row.email_normalized),
      registrationToken: generateRegistrationToken(String(row.tenant_id)),
      slug: String(row.slug || ''),
      name: String(row.tenant_name || ''),
    }
  }

  // Fallback for pre-migration environments / unit tests without RPC.
  if (rpcError) {
    console.warn(
      '⚠️ consume_tenant_registration_email_token RPC unavailable, using conditional update fallback:',
      rpcError.message,
    )
  }

  const { data: row, error } = await supabase
    .from('tenant_registration_email_tokens')
    .select('id, tenant_id, email_normalized, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error || !row) return { ok: false, reason: 'invalid' }
  if (row.used_at) {
    const reissued = await reissueRegistrationTokenForVerifiedPendingAdmin(supabase, tokenHash)
    if (reissued) return reissued
    return { ok: false, reason: 'used' }
  }
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

/**
 * After a verification token is consumed, page refresh re-POSTs the same link.
 * Re-issue the short-lived HMAC registration_token only when:
 * - the email token hash matches a previously used row
 * - the bound tenant is verified/active
 * - no admin user exists yet
 * Once an admin exists, replay stays rejected.
 */
async function reissueRegistrationTokenForVerifiedPendingAdmin(
  supabase: SupabaseClient,
  tokenHash: string,
): Promise<Extract<ConsumeVerificationResult, { ok: true }> | null> {
  const { data: tokenRow } = await supabase
    .from('tenant_registration_email_tokens')
    .select('tenant_id, email_normalized, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!tokenRow?.used_at || !tokenRow.tenant_id) return null

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, contact_email, email_verified_at, registration_status, is_active')
    .eq('id', tokenRow.tenant_id)
    .maybeSingle()

  if (!tenant || !tenantAllowsPrivilegedOnboarding(tenant)) return null

  const contactNormalized = normalizeRegistrationEmail(tenant.contact_email || '')
  if (!contactNormalized || contactNormalized !== tokenRow.email_normalized) return null

  const { data: existingAdmin } = await supabase
    .from('users')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle()

  if (existingAdmin) return null

  return {
    ok: true,
    tenantId: tenant.id,
    email: contactNormalized,
    registrationToken: generateRegistrationToken(tenant.id),
    slug: tenant.slug,
    name: tenant.name,
  }
}
