/**
 * Passkey (WebAuthn) helpers used across all /api/auth/passkey/* endpoints.
 *
 * Centralises:
 * - Relying Party configuration (RP ID, RP name, allowed origins)
 * - Feature-flag checks (which roles may / must use passkeys)
 * - Audit logging
 * - Request-context extraction (IP, UA)
 */

import { H3Event, getRequestIP, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

// ──────────────────────────────────────────────────────────────────────────────
// Relying Party configuration
// ──────────────────────────────────────────────────────────────────────────────

export interface PasskeyConfig {
  /** The RP ID — typically your apex domain. PERMANENT once first passkey is registered. */
  rpID: string
  /** Human-readable name shown by the OS during the biometric prompt. */
  rpName: string
  /** All HTTPS origins the browser/app may use. Must include exactly the origins you embed. */
  expectedOrigins: string[]
}

export function getPasskeyConfig(): PasskeyConfig {
  const rpID = process.env.WEBAUTHN_RP_ID || 'simy.ch'
  const rpName = process.env.WEBAUTHN_RP_NAME || 'Simy'

  // Origins: env-comma-list takes precedence; otherwise sensible defaults
  const fromEnv = (process.env.WEBAUTHN_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const expectedOrigins = fromEnv.length
    ? fromEnv
    : [
        // Common production hosts under simy.ch
        'https://simy.ch',
        'https://app.simy.ch',
        'https://staff.simy.ch',
        'https://admin.simy.ch',
        // Native app shims (iOS Capacitor)
        'capacitor://localhost',
        'ionic://localhost',
        // Local dev
        'http://localhost:3000',
        'https://localhost:3000'
      ]

  return { rpID, rpName, expectedOrigins }
}

// ──────────────────────────────────────────────────────────────────────────────
// Feature-flag rollout — controls who may / must use passkeys per role
// ──────────────────────────────────────────────────────────────────────────────

function parseRoleList(envValue: string | undefined): Set<string> {
  return new Set(
    (envValue || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  )
}

/** Roles for which the user-facing Passkey UI is shown. Phase 1: 'admin' only. */
export function isPasskeyEnabledForRole(role: string | null | undefined): boolean {
  if (!role) return false
  const enabled = parseRoleList(process.env.PASSKEY_ENABLED_ROLES || 'admin')
  return enabled.has(role.toLowerCase())
}

/**
 * Roles that MUST use passkey to log in (password is rejected).
 * Phase 1: empty (passkey is optional, password still works).
 */
export function isPasskeyRequiredForRole(role: string | null | undefined): boolean {
  if (!role) return false
  const required = parseRoleList(process.env.PASSKEY_REQUIRED_ROLES || '')
  return required.has(role.toLowerCase())
}

// ──────────────────────────────────────────────────────────────────────────────
// Request context (IP, User-Agent)
// ──────────────────────────────────────────────────────────────────────────────

export interface RequestContext {
  ipAddress: string | null
  userAgent: string | null
}

export function getRequestContext(event: H3Event): RequestContext {
  return {
    ipAddress: getRequestIP(event, { xForwardedFor: true }) || null,
    userAgent: getHeader(event, 'user-agent') || null
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Audit logging — every passkey-related security event
// ──────────────────────────────────────────────────────────────────────────────

export type PasskeyEventType =
  | 'register_start'
  | 'register_success'
  | 'register_fail'
  | 'login_start'
  | 'login_success'
  | 'login_fail'
  | 'credential_deleted'
  | 'backup_code_used'
  | 'backup_code_generated'
  | 'emergency_disable'

export interface PasskeyAuditEntry {
  userId: string | null
  credentialId?: string | null
  eventType: PasskeyEventType
  success: boolean
  errorCode?: string
  errorMessage?: string
  details?: Record<string, unknown>
  ipAddress?: string | null
  userAgent?: string | null
}

export async function logPasskeyEvent(entry: PasskeyAuditEntry): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('webauthn_audit_log').insert({
      user_id: entry.userId,
      credential_id: entry.credentialId ?? null,
      event_type: entry.eventType,
      success: entry.success,
      error_code: entry.errorCode ?? null,
      error_message: entry.errorMessage ?? null,
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
      details: entry.details ?? null
    })
    if (error) {
      logger.warn('⚠️ Failed to write passkey audit entry:', error.message)
    }
  } catch (err: any) {
    // Audit logging must never break the main flow
    logger.warn('⚠️ Audit log error (non-fatal):', err?.message)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Challenge storage (server-side, with TTL)
// ──────────────────────────────────────────────────────────────────────────────

const CHALLENGE_TTL_MINUTES = 5

export async function storeChallenge(params: {
  userId: string | null
  challenge: string
  challengeType: 'registration' | 'authentication'
  ip?: string | null
  userAgent?: string | null
}): Promise<string> {
  const supabase = getSupabaseAdmin()
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MINUTES * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('webauthn_challenges')
    .insert({
      user_id: params.userId,
      challenge: params.challenge,
      challenge_type: params.challengeType,
      expires_at: expiresAt,
      ip_address: params.ip ?? null,
      user_agent: params.userAgent ?? null
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to store challenge: ${error?.message ?? 'unknown error'}`)
  }
  return data.id
}

// ──────────────────────────────────────────────────────────────────────────────
// DB-based rate limiting (works serverless / multi-instance)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Check whether a given IP has exceeded the allowed number of failed passkey
 * events within the rolling window. Queries webauthn_audit_log — no in-memory
 * state required, so it works correctly across Vercel serverless instances.
 *
 * Returns true when the caller is allowed to proceed, false when rate-limited.
 */
export async function checkPasskeyRateLimit(params: {
  ipAddress: string | null
  eventTypePrefix: string    // e.g. 'login_fail' or 'backup_code'
  maxFailures: number        // max allowed failures in the window
  windowMinutes: number      // rolling window in minutes
}): Promise<boolean> {
  if (!params.ipAddress) return true  // no IP = can't rate-limit, allow through

  try {
    const supabase = getSupabaseAdmin()
    const since = new Date(Date.now() - params.windowMinutes * 60 * 1000).toISOString()

    const { count } = await supabase
      .from('webauthn_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', params.ipAddress)
      .eq('success', false)
      .ilike('event_type', `${params.eventTypePrefix}%`)
      .gte('created_at', since)

    return (count ?? 0) < params.maxFailures
  } catch {
    // Never block legitimate traffic because of a rate-limit query failure
    return true
  }
}

/**
 * Delete expired and consumed challenges older than 1 hour to keep the table
 * from growing indefinitely. Called opportunistically at the end of verify flows.
 */
export async function pruneExpiredChallenges(): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    await supabase
      .from('webauthn_challenges')
      .delete()
      .lt('expires_at', oneHourAgo)
  } catch {
    // Non-fatal
  }
}

/**
 * Atomically consume a challenge: returns it if valid + unconsumed + unexpired,
 * otherwise returns null. Marks it consumed in the same transaction.
 */
export async function consumeChallenge(
  challengeId: string,
  expectedType: 'registration' | 'authentication'
): Promise<{ challenge: string; userId: string | null } | null> {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  // Fetch + mark consumed atomically via UPDATE … RETURNING.
  const { data, error } = await supabase
    .from('webauthn_challenges')
    .update({ consumed_at: now })
    .eq('id', challengeId)
    .eq('challenge_type', expectedType)
    .is('consumed_at', null)
    .gt('expires_at', now)
    .select('challenge, user_id')
    .maybeSingle()

  if (error || !data) {
    return null
  }
  return { challenge: data.challenge, userId: data.user_id }
}
