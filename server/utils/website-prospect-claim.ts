/**
 * Public prospect claim.
 * The winning request is the one row returned by reserve_website_prospect_claim.
 * No second tenant or website is created. claimed_at is set only after the owner row exists.
 */
import { createError } from 'h3'
import { hashPreviewToken } from '~/server/utils/website-preview-access'
import { sanitizeString, validateBasicPassword, validateEmail } from '~/server/utils/validators'
import {
  CLAIM_REJECTION,
  claimTokenShapeOk,
  mintProspectClaimSecret,
} from '~/server/utils/website-prospect-guard'

type DbError = { message?: string; code?: string; status?: number } | null

type QueryResult<T> = { data: T | null; error: DbError }

export type ClaimDb = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<QueryResult<unknown>>
  from: (table: string) => {
    select: (columns?: string) => ClaimFilter
    insert: (values: Record<string, unknown>) => ClaimFilter
    update: (values: Record<string, unknown>) => ClaimFilter
  }
  auth: {
    admin: {
      createUser: (args: {
        email: string
        password: string
        email_confirm: true
        user_metadata: { role: 'admin'; tenant_id: string; first_name: string; last_name: string }
      }) => Promise<{ data: { user: { id: string } } | null; error: DbError }>
      deleteUser: (id: string) => Promise<{ error: DbError }>
    }
  }
}

type ClaimFilter = PromiseLike<QueryResult<unknown>> & {
  eq: (column: string, value: unknown) => ClaimFilter
  is: (column: string, value: null) => ClaimFilter
  select: (columns?: string) => ClaimFilter
  limit: (count: number) => ClaimFilter
  maybeSingle: () => Promise<QueryResult<Record<string, unknown>>>
  single: () => Promise<QueryResult<Record<string, unknown>>>
}

export type ClaimInput = {
  token: string
  email: string
  password: string
  passwordConfirm: string
  now?: Date
}

export type ClaimSuccess = { success: true; redirect: '/login' }

type ReservedProspect = { id: string; tenant_id: string; website_id: string }

function asRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (data && typeof data === 'object') return [data as Record<string, unknown>]
  return []
}

function httpError(statusCode: number, statusMessage: string): never {
  throw createError({ statusCode, statusMessage, message: statusMessage })
}

function rejectToken(): never {
  httpError(400, CLAIM_REJECTION)
}

function splitProspectName(name: string): { first_name: string; last_name: string } {
  const clean = sanitizeString(name, 120)
  const parts = clean.split(/\s+/).filter(Boolean)
  return {
    first_name: sanitizeString(parts[0] || 'Inhaber', 100) || 'Inhaber',
    last_name: sanitizeString(parts.slice(1).join(' ') || 'Website', 100) || 'Website',
  }
}

function isExistingAuthUser(error: DbError): boolean {
  if (!error) return false
  return error.code === 'email_exists' || error.status === 422
}

async function releaseClaim(supabase: ClaimDb, prospectId: string, nowIso: string): Promise<void> {
  await supabase.rpc('release_website_prospect_claim', {
    p_prospect_id: prospectId,
    p_now: nowIso,
  })
}

async function commitClaim(supabase: ClaimDb, prospectId: string, nowIso: string): Promise<boolean> {
  const committed = await supabase.rpc('commit_website_prospect_claim', {
    p_prospect_id: prospectId,
    p_now: nowIso,
  })
  if (committed.error) return false
  return asRows(committed.data).length === 1
}

function ownerCreatedError(): never {
  httpError(500, 'Das Konto wurde erstellt. Bitte melden Sie sich an. Der Abschluss konnte nicht gespeichert werden.')
}

export async function prepareProspectClaim(supabase: ClaimDb, prospectId: string, now = new Date()) {
  const minted = mintProspectClaimSecret(now)
  const stored = await supabase
    .from('website_prospects')
    .update({
      claim_token_hash: minted.hash,
      claim_token_expires_at: minted.expiresAt,
      updated_at: now.toISOString(),
    })
    .eq('id', prospectId)
    .is('claimed_at', null)
    .select('id')
  if (stored.error || asRows(stored.data).length !== 1) {
    httpError(409, 'Claim-Token konnte nicht gespeichert werden.')
  }
  return { token: minted.token, expiresAt: minted.expiresAt }
}

export async function claimWebsiteProspect(supabase: ClaimDb, input: ClaimInput): Promise<ClaimSuccess> {
  const token = String(input.token || '').trim()
  const email = String(input.email || '').trim().toLowerCase()
  const password = String(input.password || '')
  const passwordConfirm = String(input.passwordConfirm || '')
  const now = input.now ?? new Date()
  const nowIso = now.toISOString()

  if (!claimTokenShapeOk(token)) rejectToken()
  if (!validateEmail(email).valid) {
    httpError(400, 'Ungültige E-Mail-Adresse')
  }
  const passwordCheck = validateBasicPassword(password)
  if (!passwordCheck.valid) {
    httpError(400, passwordCheck.message || 'Ungültiges Passwort')
  }
  if (password !== passwordConfirm) {
    httpError(400, 'Die Passwörter stimmen nicht überein')
  }

  const reservation = await supabase.rpc('reserve_website_prospect_claim', {
    p_token_hash: hashPreviewToken(token),
    p_now: nowIso,
  })
  if (reservation.error) {
    httpError(503, 'Der Dienst ist vorübergehend nicht verfügbar.')
  }
  const reservedRows = asRows(reservation.data)
  if (reservedRows.length !== 1) rejectToken()

  const prospectId = String(reservedRows[0].id || '')
  const tenantId = String(reservedRows[0].tenant_id || '')
  const websiteId = String(reservedRows[0].website_id || '')
  if (!prospectId || !tenantId || !websiteId) {
    if (prospectId) await releaseClaim(supabase, prospectId, nowIso)
    rejectToken()
  }
  const reserved: ReservedProspect = { id: prospectId, tenant_id: tenantId, website_id: websiteId }

  const failBeforeUser = async (statusCode: number, statusMessage: string): Promise<never> => {
    await releaseClaim(supabase, reserved.id, nowIso)
    httpError(statusCode, statusMessage)
  }

  const prospectRow = await supabase
    .from('website_prospects')
    .select('id, name, tenant_id, website_id')
    .eq('id', reserved.id)
    .maybeSingle()
  if (prospectRow.error || !prospectRow.data) {
    return failBeforeUser(503, 'Der Dienst ist vorübergehend nicht verfügbar.')
  }
  if (String(prospectRow.data.tenant_id || '') !== reserved.tenant_id || String(prospectRow.data.website_id || '') !== reserved.website_id) {
    return failBeforeUser(400, CLAIM_REJECTION)
  }

  const tenantRow = await supabase
    .from('tenants')
    .select('id, website_only')
    .eq('id', reserved.tenant_id)
    .maybeSingle()
  if (tenantRow.error) return failBeforeUser(503, 'Der Dienst ist vorübergehend nicht verfügbar.')
  if (!tenantRow.data || tenantRow.data.website_only !== true) {
    return failBeforeUser(400, CLAIM_REJECTION)
  }

  const primaryAdmin = await supabase
    .from('users')
    .select('id, tenant_id, auth_user_id, email, is_primary_admin')
    .eq('tenant_id', reserved.tenant_id)
    .eq('is_primary_admin', true)
    .limit(2)
  if (primaryAdmin.error) return failBeforeUser(503, 'Der Dienst ist vorübergehend nicht verfügbar.')
  const owners = asRows(primaryAdmin.data).filter((row) => String(row.tenant_id || '') === reserved.tenant_id)
  if (owners.length > 1) return failBeforeUser(409, 'Diese Website wurde bereits übernommen.')
  if (owners.length === 1) {
    const owner = owners[0]
    const sameOwner = owner.is_primary_admin === true
      && Boolean(owner.auth_user_id)
      && String(owner.email || '').toLowerCase() === email
    if (!sameOwner) return failBeforeUser(409, 'Diese Website wurde bereits übernommen.')
    const committed = await commitClaim(supabase, reserved.id, nowIso)
    if (!committed) ownerCreatedError()
    return { success: true, redirect: '/login' }
  }

  const existingEmail = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('email', email)
    .limit(1)
  if (existingEmail.error) return failBeforeUser(503, 'Der Dienst ist vorübergehend nicht verfügbar.')
  if (asRows(existingEmail.data).length > 0) {
    return failBeforeUser(409, 'Diese E-Mail-Adresse ist bereits als Benutzer registriert.')
  }

  const names = splitProspectName(String(prospectRow.data.name || ''))
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      tenant_id: reserved.tenant_id,
      first_name: names.first_name,
      last_name: names.last_name,
    },
  })
  if (created.error || !created.data?.user?.id) {
    await releaseClaim(supabase, reserved.id, nowIso)
    if (isExistingAuthUser(created.error)) {
      httpError(409, 'Diese E-Mail-Adresse ist bereits registriert.')
    }
    httpError(500, 'Konto konnte nicht erstellt werden. Bitte erneut versuchen.')
  }

  const authUserId = created.data.user.id
  const inserted = await supabase
    .from('users')
    .insert({
      auth_user_id: authUserId,
      tenant_id: reserved.tenant_id,
      email,
      first_name: names.first_name,
      last_name: names.last_name,
      role: 'admin',
      is_active: true,
      is_primary_admin: true,
    })
    .select('id')
    .single()

  if (inserted.error || !inserted.data?.id) {
    await compensateFailedProfile(supabase, authUserId, reserved, nowIso)
  }

  const committed = await commitClaim(supabase, reserved.id, nowIso)
  if (!committed) ownerCreatedError()
  return { success: true, redirect: '/login' }
}

async function compensateFailedProfile(
  supabase: ClaimDb,
  authUserId: string,
  reserved: ReservedProspect,
  nowIso: string,
): Promise<void> {
  const profile = await supabase
    .from('users')
    .select('id, tenant_id, is_primary_admin, auth_user_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  if (profile.error) {
    httpError(500, 'Benutzerprofil konnte nicht erstellt werden. Bitte später erneut versuchen.')
  }
  if (profile.data && String(profile.data.tenant_id || '') === reserved.tenant_id && profile.data.is_primary_admin === true) {
    return
  }
  if (profile.data) {
    httpError(500, 'Benutzerprofil konnte nicht erstellt werden. Bitte später erneut versuchen.')
  }

  let deleteError: DbError = null
  try {
    const deleted = await supabase.auth.admin.deleteUser(authUserId)
    deleteError = deleted.error
  } catch {
    deleteError = { message: 'delete failed' }
  }
  if (deleteError) {
    httpError(500, 'Konto konnte nicht bereinigt werden. Bitte später erneut versuchen.')
  }
  await releaseClaim(supabase, reserved.id, nowIso)
  httpError(500, 'Benutzerprofil konnte nicht erstellt werden. Bitte erneut versuchen.')
}
