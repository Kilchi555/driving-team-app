/**
 * Single policy for claiming a client login.
 *
 * Auth emails are global. A public.users row may only attach an auth_user_id
 * that is not already owned by another profile (enforced in app + unique index).
 *
 * Existing auth users are never password-reset via admin API. Orphans must
 * sign in or use email password-reset — otherwise a guest SMS link can steal them.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { validateEmail, validateUUID } from '~/server/utils/validators'

export const AuthEmailClaimCode = {
  AVAILABLE: 'AVAILABLE',
  INVALID: 'INVALID',
  TENANT_CLIENT_EXISTS: 'TENANT_CLIENT_EXISTS',
  AUTH_LINKED_ELSEWHERE: 'AUTH_LINKED_ELSEWHERE',
  ORPHAN_CLAIMABLE: 'ORPHAN_CLAIMABLE',
  AUTH_LOOKUP_FAILED: 'AUTH_LOOKUP_FAILED',
} as const

export type AuthEmailClaimCode = (typeof AuthEmailClaimCode)[keyof typeof AuthEmailClaimCode]

export const PUBLIC_EMAIL_TAKEN_MESSAGE =
  'Diese E-Mail-Adresse ist bereits registriert. Bitte verwende eine andere E-Mail oder melde dich an.'

export interface AuthEmailClaim {
  code: AuthEmailClaimCode
  availableForAccount: boolean
  availableForGuestBooking: boolean
  authUserId: string | null
  message: string
}

export function messageForAuthEmailClaimCode(code: string): string | null {
  switch (code) {
    case AuthEmailClaimCode.INVALID:
      return 'Ungültige E-Mail-Adresse'
    case AuthEmailClaimCode.TENANT_CLIENT_EXISTS:
      return 'Diese E-Mail-Adresse ist bereits mit einem Konto verbunden. Bitte melde dich an.'
    case AuthEmailClaimCode.AUTH_LINKED_ELSEWHERE:
      return 'Diese E-Mail-Adresse ist bereits mit einem anderen Konto verknüpft. Bitte verwende eine andere E-Mail-Adresse oder melde dich direkt an.'
    case AuthEmailClaimCode.ORPHAN_CLAIMABLE:
      return 'Diese E-Mail-Adresse hat bereits ein Login. Bitte melde dich an oder setze das Passwort zurück.'
    case AuthEmailClaimCode.AUTH_LOOKUP_FAILED:
      return 'Die E-Mail konnte gerade nicht geprüft werden. Bitte versuche es erneut.'
    case AuthEmailClaimCode.AVAILABLE:
      return 'E-Mail verfügbar'
    default:
      return null
  }
}

export function decideClientEmailClaim(input: {
  email: string
  tenantClientWithAuth: { id: string } | null
  authUser: { id: string } | null
  authLookupFailed?: boolean
  linkedProfileIds: string[]
  excludeUserId?: string | null
}): AuthEmailClaim {
  const email = String(input.email || '').trim().toLowerCase()
  if (!validateEmail(email).valid) {
    return claim(AuthEmailClaimCode.INVALID, null)
  }

  if (input.tenantClientWithAuth && input.tenantClientWithAuth.id !== input.excludeUserId) {
    return claim(AuthEmailClaimCode.TENANT_CLIENT_EXISTS, input.authUser?.id ?? null)
  }

  if (input.authLookupFailed) {
    return claim(AuthEmailClaimCode.AUTH_LOOKUP_FAILED, null)
  }

  if (!input.authUser) {
    return claim(AuthEmailClaimCode.AVAILABLE, null)
  }

  const linkedElsewhere = input.linkedProfileIds.some(id => id !== input.excludeUserId)
  if (linkedElsewhere) {
    return claim(AuthEmailClaimCode.AUTH_LINKED_ELSEWHERE, input.authUser.id)
  }

  return claim(AuthEmailClaimCode.ORPHAN_CLAIMABLE, input.authUser.id)
}

function claim(code: AuthEmailClaimCode, authUserId: string | null): AuthEmailClaim {
  const availableForAccount = code === AuthEmailClaimCode.AVAILABLE
  return {
    code,
    authUserId,
    availableForAccount,
    availableForGuestBooking:
      code !== AuthEmailClaimCode.INVALID && code !== AuthEmailClaimCode.TENANT_CLIENT_EXISTS,
    message: messageForAuthEmailClaimCode(code) || 'Diese E-Mail ist nicht verfügbar.',
  }
}

export type AuthUserLookup =
  | { ok: true; user: { id: string } | null }
  | { ok: false }

/**
 * Resolve an Auth user by email via service-role RPC.
 *
 * Do NOT call `supabase.auth.admin.getUserByEmail` — it does not exist in
 * supabase-js v2 (throws TypeError). That bug blocked all staff invites after
 * 2026-08-30 with a false "already in Auth" error.
 *
 * Requires `public.lookup_auth_user_id_by_email` (sql_migrations/20260901_…).
 */
export async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<AuthUserLookup> {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return { ok: true, user: null }

  try {
    const { data, error } = await supabase.rpc('lookup_auth_user_id_by_email', {
      p_email: normalized,
    })
    if (error) return { ok: false }
    return { ok: true, user: data ? { id: String(data) } : null }
  } catch {
    return { ok: false }
  }
}

export async function evaluateClientEmailClaim(opts: {
  supabase: SupabaseClient
  email: string
  tenantId: string
  excludeUserId?: string | null
}): Promise<AuthEmailClaim> {
  const email = String(opts.email || '').trim().toLowerCase()
  if (!validateEmail(email).valid) {
    return decideClientEmailClaim({
      email,
      tenantClientWithAuth: null,
      authUser: null,
      linkedProfileIds: [],
    })
  }

  let tenantQuery = opts.supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('tenant_id', opts.tenantId)
    .eq('role', 'client')
    .not('auth_user_id', 'is', null)

  if (opts.excludeUserId) {
    tenantQuery = tenantQuery.neq('id', opts.excludeUserId)
  }

  const { data: tenantClient } = await tenantQuery.maybeSingle()
  const authLookup = await findAuthUserByEmail(opts.supabase, email)
  if (!authLookup.ok) {
    return decideClientEmailClaim({
      email,
      tenantClientWithAuth: tenantClient,
      authUser: null,
      authLookupFailed: true,
      linkedProfileIds: [],
      excludeUserId: opts.excludeUserId,
    })
  }

  let linkedProfileIds: string[] = []
  if (authLookup.user) {
    const { data: linked } = await opts.supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', authLookup.user.id)
    linkedProfileIds = (linked || []).map(row => row.id)
  }

  return decideClientEmailClaim({
    email,
    tenantClientWithAuth: tenantClient,
    authUser: authLookup.user,
    linkedProfileIds,
    excludeUserId: opts.excludeUserId,
  })
}

/** Untrusted clients must not learn whether an email exists in Auth globally. */
export function publicEmailCheckAvailable(claim: AuthEmailClaim, purpose: 'account' | 'booking'): boolean {
  if (purpose === 'booking') return claim.availableForGuestBooking
  if (claim.code === AuthEmailClaimCode.AUTH_LINKED_ELSEWHERE) return true
  if (claim.code === AuthEmailClaimCode.ORPHAN_CLAIMABLE) return true
  if (claim.code === AuthEmailClaimCode.AUTH_LOOKUP_FAILED) return true
  return claim.availableForAccount
}

export async function resolvePendingUserIdFromOnboardingToken(
  supabase: SupabaseClient,
  token: string | null | undefined,
): Promise<string | null> {
  if (!token || !validateUUID(token).valid) return null
  const { data: user } = await supabase
    .from('users')
    .select('id, onboarding_status, onboarding_token_expires')
    .eq('onboarding_token', token)
    .eq('onboarding_status', 'pending')
    .maybeSingle()
  if (!user) return null
  if (user.onboarding_token_expires && new Date(user.onboarding_token_expires) < new Date()) return null
  return user.id
}

function phoneDigitsForCompare(phone?: string | null): string {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('41') && digits.length >= 11) return digits.slice(-9)
  if (digits.startsWith('0') && digits.length >= 10) return digits.slice(-9)
  return digits.length > 9 ? digits.slice(-9) : digits
}

export function pendingContactMismatch(opts: {
  storedEmail?: string | null
  storedPhone?: string | null
  incomingEmail?: string | null
  incomingPhone?: string | null
  matchedByEmail: boolean
  matchedByPhone: boolean
}): boolean {
  const storedEmail = (opts.storedEmail || '').trim().toLowerCase()
  const incomingEmail = (opts.incomingEmail || '').trim().toLowerCase()
  const storedPhone = phoneDigitsForCompare(opts.storedPhone)
  const incomingPhone = phoneDigitsForCompare(opts.incomingPhone)

  if (opts.matchedByEmail && incomingPhone && storedPhone && incomingPhone !== storedPhone) return true
  if (opts.matchedByPhone && incomingEmail && storedEmail && incomingEmail !== storedEmail) return true
  return false
}

export function isSupabaseEmailTakenError(message: string | null | undefined): boolean {
  const lower = (message || '').toLowerCase()
  return lower.includes('already') || lower.includes('registered')
}

export function isUniqueAuthUserIdViolation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  if (error.code === '23505') return /auth_user_id/i.test(error.message || '')
  return /users_auth_user_id/i.test(error.message || '')
}

export function throwAuthEmailClaimError(result: AuthEmailClaim): never {
  throw createError({
    statusCode: 409,
    statusMessage: result.message,
    message: result.message,
    data: { code: result.code },
  })
}

export async function claimOrCreateAuthUser(opts: {
  supabase: SupabaseClient
  email: string
  password: string
  firstName?: string | null
  lastName?: string | null
  tenantId: string
  excludeUserId?: string | null
}): Promise<{ authUserId: string }> {
  const email = String(opts.email || '').trim().toLowerCase()
  const claim = await evaluateClientEmailClaim({
    supabase: opts.supabase,
    email,
    tenantId: opts.tenantId,
    excludeUserId: opts.excludeUserId,
  })

  if (!claim.availableForAccount) {
    throwAuthEmailClaimError(claim)
  }

  const { data: authData, error: authError } = await opts.supabase.auth.admin.createUser({
    email,
    password: opts.password,
    email_confirm: true,
    user_metadata: {
      first_name: opts.firstName || undefined,
      last_name: opts.lastName || undefined,
    },
  })

  if (!authError && authData?.user?.id) {
    return { authUserId: authData.user.id }
  }

  if (authError && isSupabaseEmailTakenError(authError.message)) {
    const again = await evaluateClientEmailClaim({
      supabase: opts.supabase,
      email,
      tenantId: opts.tenantId,
      excludeUserId: opts.excludeUserId,
    })
    throwAuthEmailClaimError(
      again.availableForAccount
        ? {
            ...again,
            code: AuthEmailClaimCode.AUTH_LINKED_ELSEWHERE,
            availableForAccount: false,
            message: messageForAuthEmailClaimCode(AuthEmailClaimCode.AUTH_LINKED_ELSEWHERE)!,
          }
        : again,
    )
  }

  if (authError?.message?.toLowerCase().includes('password')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Das Passwort entspricht nicht den Anforderungen. Bitte wähle ein stärkeres Passwort.',
      message: 'Das Passwort entspricht nicht den Anforderungen. Bitte wähle ein stärkeres Passwort.',
      data: { code: 'WEAK_PASSWORD' },
    })
  }

  throw createError({
    statusCode: 409,
    statusMessage: 'Fehler beim Erstellen des Benutzerkontos',
    message: 'Fehler beim Erstellen des Benutzerkontos',
    data: { code: 'AUTH_CREATE_FAILED' },
  })
}
