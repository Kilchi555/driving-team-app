/**
 * Dedicated server-side force-reset: invalidate the current password hash
 * without knowing it, revoke every current GoTrue session/refresh token,
 * then issue one recovery link through the existing app reset flow.
 *
 * This is NOT the user-facing change-password path.
 * This is NOT a production apply of any account set.
 *
 * Access JWTs remain valid until expiry. Do not claim otherwise.
 */

import { randomBytes } from 'node:crypto'
import type { AuditLogEntry } from '~/server/utils/audit'

/** Keep in lockstep with composables/usePasswordStrength.ts PASSWORD_MIN_LENGTH. */
export const FORCE_RESET_PASSWORD_MIN_LENGTH = 12

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export const FORCE_RESET_ACTION = 'force_password_reset'
export const ACCESS_JWT_SEMANTICS = 'VALID_UNTIL_EXPIRY' as const
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
/** CSPRNG input floor; discarded password length stays 43 (32 bytes of base64url). */
export const DISCARDED_PASSWORD_BYTES = 32
export const DISCARDED_PASSWORD_LENGTH = 43

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/** Uniform integer in [0, max) via CSPRNG rejection sampling (no modulo bias). */
function randomIntBelow(max: number): number {
  if (!Number.isInteger(max) || max <= 0 || max > 256) {
    throw new Error('randomIntBelow max out of range')
  }
  const limit = Math.floor(256 / max) * max
  let byte = 0
  do {
    byte = randomBytes(1)[0]
  } while (byte >= limit)
  return byte % max
}

function randomChar(alphabet: string): string {
  return alphabet[randomIntBelow(alphabet.length)]
}

function shuffleInPlace(chars: string[]): void {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIntBelow(i + 1)
    const tmp = chars[i]
    chars[i] = chars[j]
    chars[j] = tmp
  }
}

export type ForceResetStage =
  | 'lookup'
  | 'password'
  | 'sessions'
  | 'tokens'
  | 'recovery'
  | 'complete'

export type ForceResetError = {
  stage: ForceResetStage
  code: string
  message: string
}

export type ForceResetResult = {
  complete: boolean
  password_changed: boolean
  sessions_revoked: boolean
  sessions_revoked_count: number
  recovery_required: boolean
  recovery_dispatched: boolean
  auth_user_id: string | null
  public_user_id: string | null
  tenant_id: string | null
  access_jwt: typeof ACCESS_JWT_SEMANTICS
  error?: ForceResetError
}

export type ForceResetTarget = {
  authUserId?: string
  publicUserId?: string
}

export type ForceResetActor = {
  authUserId?: string | null
  publicUserId?: string | null
  role?: string | null
  ipAddress?: string | null
}

export type PublicUserRow = {
  id: string
  auth_user_id: string | null
  email: string | null
  first_name: string | null
  tenant_id: string | null
  deleted_at?: string | null
}

export type ForceResetDeps = {
  findPublicUser: (target: ForceResetTarget) => Promise<PublicUserRow | null>
  updateUserPassword: (authUserId: string, password: string) => Promise<void>
  revokeAllSessions: (authUserId: string) => Promise<number>
  closeImpersonations?: (publicUserId: string) => Promise<void>
  expireUnusedResetTokens: (publicUserId: string) => Promise<void>
  createResetToken: (input: {
    publicUserId: string
    email: string
    token: string
    expiresAt: string
  }) => Promise<void>
  sendRecoveryEmail: (input: {
    to: string
    firstName: string | null
    resetLink: string
    tenantId: string | null
  }) => Promise<void>
  audit: (entry: AuditLogEntry) => Promise<void>
  now?: () => Date
  randomPassword?: () => string
  randomToken?: () => string
  appBaseUrl?: string
  resolveTenantSlug?: (tenantId: string) => Promise<string | null>
}

const inFlight = new Map<string, Promise<ForceResetResult>>()

export function generateDiscardedPassword(): string {
  const chars: string[] = [
    randomChar(LOWERCASE),
    randomChar(UPPERCASE),
    randomChar(DIGITS),
  ]
  while (chars.length < DISCARDED_PASSWORD_LENGTH) {
    chars.push(randomChar(BASE64URL_ALPHABET))
  }
  shuffleInPlace(chars)
  const password = chars.join('')
  if (
    password.length < FORCE_RESET_PASSWORD_MIN_LENGTH ||
    password.length !== DISCARDED_PASSWORD_LENGTH ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw new Error('Discarded password did not meet Production password policy')
  }
  return password
}

export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

function lockKey(target: ForceResetTarget): string {
  if (target.authUserId && isUuid(target.authUserId)) return `auth:${target.authUserId}`
  if (target.publicUserId && isUuid(target.publicUserId)) return `public:${target.publicUserId}`
  return 'invalid'
}

function fail(
  result: ForceResetResult,
  stage: ForceResetStage,
  code: string,
  message: string,
): ForceResetResult {
  return {
    ...result,
    complete: false,
    error: { stage, code, message },
  }
}

function recoveryHtml(firstName: string | null, resetLink: string): string {
  const greeting = firstName ? `Hallo ${firstName}` : 'Hallo'
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;line-height:1.5;color:#111827">
<p>${greeting},</p>
<p>Aus Sicherheitsgründen wurde dein bisheriges Passwort ungültig gemacht. Alle bestehenden Anmeldungen wurden beendet.</p>
<p>Bitte setze jetzt ein neues Passwort über diesen Link (1 Stunde gültig, einmalig):</p>
<p><a href="${resetLink}">Passwort zurücksetzen</a></p>
<p>Falls du diese Nachricht nicht erwartet hast, kontaktiere den Support. Es wird kein temporäres Passwort per E-Mail verschickt.</p>
</body></html>`
}

export function createDefaultForceResetDeps(): ForceResetDeps {
  return {
    async findPublicUser(target) {
      const { getSupabaseAdmin } = await import('~/server/utils/supabase-admin')
      const supabase = getSupabaseAdmin()
      let query = supabase
        .from('users')
        .select('id, auth_user_id, email, first_name, tenant_id, deleted_at')
        .is('deleted_at', null)

      if (target.publicUserId) query = query.eq('id', target.publicUserId)
      else if (target.authUserId) query = query.eq('auth_user_id', target.authUserId)
      else return null

      const { data, error } = await query.maybeSingle()
      if (error) throw new Error(error.message)
      return (data as PublicUserRow | null) ?? null
    },

    async updateUserPassword(authUserId, password) {
      const { getSupabaseAdmin } = await import('~/server/utils/supabase-admin')
      const supabase = getSupabaseAdmin()
      const { error } = await supabase.auth.admin.updateUserById(authUserId, { password })
      if (error) throw new Error(error.message || 'password_update_failed')
    },

    async revokeAllSessions(authUserId) {
      const { getSupabaseAdmin } = await import('~/server/utils/supabase-admin')
      const { revokeAuthSessions } = await import('~/server/utils/session-control')
      const supabase = getSupabaseAdmin()
      // NULL session id = every current session + its refresh tokens.
      return revokeAuthSessions(supabase, authUserId, null)
    },

    async closeImpersonations(publicUserId) {
      const { getSupabaseAdmin } = await import('~/server/utils/supabase-admin')
      const { closeOpenImpersonationsForUser } = await import('~/server/utils/session-control')
      const supabase = getSupabaseAdmin()
      await closeOpenImpersonationsForUser(supabase, publicUserId)
    },

    async expireUnusedResetTokens(publicUserId) {
      const { getSupabaseAdmin } = await import('~/server/utils/supabase-admin')
      const supabase = getSupabaseAdmin()
      const { error } = await supabase
        .from('password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('user_id', publicUserId)
        .is('used_at', null)
      if (error) throw new Error(error.message)
    },

    async createResetToken({ publicUserId, email, token, expiresAt }) {
      const { getSupabaseAdmin } = await import('~/server/utils/supabase-admin')
      const supabase = getSupabaseAdmin()
      const { error } = await supabase.from('password_reset_tokens').insert({
        user_id: publicUserId,
        email,
        token,
        reset_method: 'email',
        expires_at: expiresAt,
      })
      if (error) throw new Error(error.message)
    },

    async sendRecoveryEmail({ to, firstName, resetLink, tenantId }) {
      const { sendEmail, sendTenantEmail } = await import('~/server/utils/email')
      const html = recoveryHtml(firstName, resetLink)
      const subject = 'Aus Sicherheitsgründen: Passwort zurücksetzen'
      if (tenantId) {
        await sendTenantEmail(tenantId, { to, subject, html })
        return
      }
      await sendEmail({ to, subject, html })
    },

    async audit(entry) {
      const { logAudit } = await import('~/server/utils/audit')
      await logAudit(entry)
    },

    async resolveTenantSlug(tenantId) {
      const { getSupabaseAdmin } = await import('~/server/utils/supabase-admin')
      const supabase = getSupabaseAdmin()
      const { data } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', tenantId)
        .maybeSingle()
      return data?.slug || null
    },
  }
}

function assertSafeTarget(target: ForceResetTarget): void {
  const hasAuth = !!target.authUserId
  const hasPublic = !!target.publicUserId
  if (hasAuth === hasPublic) {
    const err = new Error('Genau eine Ziel-ID (auth_user_id oder user_id) ist erforderlich') as Error & { code: string }
    err.code = 'TARGET_REQUIRED'
    throw err
  }
  if (target.authUserId && !isUuid(target.authUserId)) {
    const err = new Error('Ungültige auth_user_id') as Error & { code: string }
    err.code = 'INVALID_ID'
    throw err
  }
  if (target.publicUserId && !isUuid(target.publicUserId)) {
    const err = new Error('Ungültige user_id') as Error & { code: string }
    err.code = 'INVALID_ID'
    throw err
  }
}

export async function forceInvalidatePassword(
  target: ForceResetTarget,
  actor: ForceResetActor = {},
  deps: ForceResetDeps = createDefaultForceResetDeps(),
): Promise<ForceResetResult> {
  assertSafeTarget(target)
  const key = lockKey(target)
  const existing = inFlight.get(key)
  if (existing) {
    const blocked: ForceResetResult = {
      complete: false,
      password_changed: false,
      sessions_revoked: false,
      sessions_revoked_count: 0,
      recovery_required: false,
      recovery_dispatched: false,
      auth_user_id: target.authUserId || null,
      public_user_id: target.publicUserId || null,
      tenant_id: null,
      access_jwt: ACCESS_JWT_SEMANTICS,
      error: {
        stage: 'lookup',
        code: 'IN_PROGRESS',
        message: 'Eine Force-Reset-Operation für diesen Benutzer läuft bereits',
      },
    }
    await writeAudit(deps, actor, blocked)
    return blocked
  }

  const run = executeForceReset(target, actor, deps)
  inFlight.set(key, run)
  try {
    return await run
  } finally {
    if (inFlight.get(key) === run) inFlight.delete(key)
  }
}

async function executeForceReset(
  target: ForceResetTarget,
  actor: ForceResetActor,
  deps: ForceResetDeps,
): Promise<ForceResetResult> {
  const result: ForceResetResult = {
    complete: false,
    password_changed: false,
    sessions_revoked: false,
    sessions_revoked_count: 0,
    recovery_required: false,
    recovery_dispatched: false,
    auth_user_id: target.authUserId || null,
    public_user_id: target.publicUserId || null,
    tenant_id: null,
    access_jwt: ACCESS_JWT_SEMANTICS,
  }

  let publicUser: PublicUserRow | null = null
  try {
    publicUser = await deps.findPublicUser(target)
  } catch (err: any) {
    const failed = fail(result, 'lookup', 'LOOKUP_FAILED', err?.message || 'lookup_failed')
    await writeAudit(deps, actor, failed)
    return failed
  }

  if (!publicUser) {
    const code = target.authUserId ? 'AUTH_ONLY_NO_PUBLIC_ROW' : 'USER_NOT_FOUND'
    const failed = fail(
      result,
      'lookup',
      code,
      target.authUserId
        ? 'Kein public.users-Datensatz — AUTH_ONLY wird nicht automatisch angelegt'
        : 'Benutzer nicht gefunden',
    )
    await writeAudit(deps, actor, failed)
    return failed
  }

  result.public_user_id = publicUser.id
  result.tenant_id = publicUser.tenant_id
  result.auth_user_id = publicUser.auth_user_id

  if (!publicUser.auth_user_id || !isUuid(publicUser.auth_user_id)) {
    const failed = fail(result, 'lookup', 'NO_AUTH_USER', 'Konto hat keinen Auth-User — kein Create-Pfad')
    await writeAudit(deps, actor, failed)
    return failed
  }

  if (actor.authUserId && actor.authUserId === publicUser.auth_user_id) {
    const failed = fail(result, 'lookup', 'SELF_RESET_FORBIDDEN', 'Eigenes Konto kann nicht force-resetet werden')
    await writeAudit(deps, actor, failed)
    return failed
  }

  if (!publicUser.email) {
    const failed = fail(result, 'lookup', 'NO_EMAIL', 'Kein Recovery möglich — keine E-Mail hinterlegt')
    await writeAudit(deps, actor, failed)
    return failed
  }

  try {
    const discarded = (deps.randomPassword || generateDiscardedPassword)()
    await deps.updateUserPassword(publicUser.auth_user_id, discarded)
    result.password_changed = true
    result.recovery_required = true
  } catch (err: any) {
    const failed = fail(result, 'password', 'PASSWORD_UPDATE_FAILED', err?.message || 'password_update_failed')
    await writeAudit(deps, actor, failed)
    return failed
  }

  try {
    const revoked = await deps.revokeAllSessions(publicUser.auth_user_id)
    result.sessions_revoked = true
    result.sessions_revoked_count = Number.isFinite(revoked) ? revoked : 0
    if (deps.closeImpersonations) {
      await deps.closeImpersonations(publicUser.id)
    }
  } catch (err: any) {
    const failed = fail(result, 'sessions', 'SESSION_REVOKE_FAILED', err?.message || 'session_revoke_failed')
    await writeAudit(deps, actor, failed)
    return failed
  }

  try {
    await deps.expireUnusedResetTokens(publicUser.id)
  } catch (err: any) {
    const failed = fail(result, 'tokens', 'TOKEN_INVALIDATION_FAILED', err?.message || 'token_invalidation_failed')
    await writeAudit(deps, actor, failed)
    return failed
  }

  const token = (deps.randomToken || generateResetToken)()
  const now = deps.now ? deps.now() : new Date()
  const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MS).toISOString()
  try {
    await deps.createResetToken({
      publicUserId: publicUser.id,
      email: publicUser.email,
      token,
      expiresAt,
    })
  } catch (err: any) {
    const failed = fail(result, 'recovery', 'RECOVERY_TOKEN_FAILED', err?.message || 'recovery_token_failed')
    await writeAudit(deps, actor, failed)
    return failed
  }

  const baseUrl = (deps.appBaseUrl || process.env.NUXT_PUBLIC_APP_URL || 'https://app.simy.ch').replace(/\/$/, '')
  let tenantSlug: string | null = null
  if (publicUser.tenant_id && deps.resolveTenantSlug) {
    try {
      tenantSlug = await deps.resolveTenantSlug(publicUser.tenant_id)
    } catch {
      tenantSlug = null
    }
  }
  const resetLink = `${baseUrl}/password-reset?token=${token}${tenantSlug ? `&tenant=${encodeURIComponent(tenantSlug)}` : ''}`

  try {
    await deps.sendRecoveryEmail({
      to: publicUser.email,
      firstName: publicUser.first_name,
      resetLink,
      tenantId: publicUser.tenant_id,
    })
    result.recovery_dispatched = true
  } catch (err: any) {
    const failed = fail(result, 'recovery', 'RECOVERY_EMAIL_FAILED', err?.message || 'recovery_email_failed')
    await writeAudit(deps, actor, failed)
    return failed
  }

  result.complete = true
  await writeAudit(deps, actor, result)
  return result
}

async function writeAudit(
  deps: ForceResetDeps,
  actor: ForceResetActor,
  result: ForceResetResult,
): Promise<void> {
  const status = result.complete ? 'success' : result.password_changed ? 'partial' : 'failed'
  try {
    await deps.audit({
      user_id: actor.publicUserId || undefined,
      auth_user_id: actor.authUserId || undefined,
      action: FORCE_RESET_ACTION,
      resource_type: 'user',
      resource_id: result.public_user_id || result.auth_user_id || undefined,
      status,
      tenant_id: result.tenant_id || undefined,
      ip_address: actor.ipAddress || undefined,
      error_message: result.error ? `${result.error.code}:${result.error.stage}` : undefined,
      details: {
        operation: FORCE_RESET_ACTION,
        password_changed: result.password_changed,
        sessions_revoked: result.sessions_revoked,
        sessions_revoked_count: result.sessions_revoked_count,
        recovery_required: result.recovery_required,
        recovery_dispatched: result.recovery_dispatched,
        access_jwt: result.access_jwt,
        error_code: result.error?.code || null,
        error_stage: result.error?.stage || null,
        target_auth_user_id: result.auth_user_id,
        target_public_user_id: result.public_user_id,
      },
    })
  } catch {
    // Audit must never change the security outcome.
  }
}

export function resetForceResetLocksForTests(): void {
  inFlight.clear()
}
