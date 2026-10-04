/**
 * Edit and renew pending invitations without a second invite mechanism.
 *
 * Staff and admin invitations are rows in staff_invitations.
 * Client invitations are users rows with onboarding_status = pending
 * and no auth user yet.
 *
 * Role, tenant, and invitation ownership always come from the server-side
 * caller and the loaded row. Request payloads cannot set them.
 */
import { createError } from 'h3'
import type { AuthEmailClaim } from '~/server/utils/auth-email-claim'
import { roleFromInvitation, type InvitationRole } from '~/server/utils/invitation-role'
import { generateInvitationToken } from '~/server/utils/invitation-token'
import { sanitizeString, validateEmail, validateUUID } from '~/server/utils/validators'

export type InvitationAdminCaller = {
  role?: string | null
  tenantId?: string | null
  isActive?: boolean | null
  deletedAt?: string | null
}

export type StaffInvitationRow = {
  id: string
  tenant_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  status: string
  role: string | null
  invitation_token: string
  expires_at: string
}

export type PendingClientRow = {
  id: string
  tenant_id: string
  role: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  onboarding_status: string | null
  onboarding_token: string | null
  onboarding_token_expires: string | null
  auth_user_id: string | null
}

export type StaffInviteNamePatch = {
  first_name: string
  last_name: string
}

export type StaffInviteEmailPatch = StaffInviteNamePatch & {
  email: string
  invitation_token: string
  expires_at: string
  status: 'pending'
}

export type ClientInviteNamePatch = {
  first_name: string
  last_name: string
}

export type ClientInviteEmailPatch = ClientInviteNamePatch & {
  email: string
  onboarding_token: string
  onboarding_token_expires: string
}

export type ClientResendPatch = {
  onboarding_token: string
  onboarding_token_expires: string
}

const EDITABLE_STAFF_STATUSES = new Set(['pending', 'expired'])

export async function loadInvitationAdminCaller(
  supabase: { from: (table: string) => any },
  authUserId: string,
): Promise<InvitationAdminCaller & { profileId: string }> {
  const { data, error } = await supabase
    .from('users')
    .select('id, tenant_id, role, is_active, deleted_at')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (error || !data?.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Kein Tenant gefunden' })
  }

  return {
    profileId: data.id,
    tenantId: data.tenant_id,
    role: data.role,
    isActive: data.is_active,
    deletedAt: data.deleted_at,
  }
}

export function assertInvitationAdmin(caller: InvitationAdminCaller): string {
  if (!caller?.tenantId) {
    throw createError({ statusCode: 403, statusMessage: 'Kein Tenant gefunden' })
  }
  if (caller.role !== 'admin' || caller.isActive === false || caller.deletedAt) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Nur Admins können Einladungen bearbeiten',
    })
  }
  return caller.tenantId
}

export function normalizeInviteEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export function parseInviteName(value: unknown, label: string): string {
  const raw = typeof value === 'string' ? value : ''
  const name = sanitizeString(raw, 100).trim()
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: `${label} ist erforderlich` })
  }
  return name
}

export function parseInviteEmail(email: unknown): string {
  const normalized = normalizeInviteEmail(email)
  if (!validateEmail(normalized).valid) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse' })
  }
  return normalized
}

function requireId(id: unknown, label: string): string {
  const value = typeof id === 'string' ? id.trim() : ''
  if (!validateUUID(value).valid) {
    throw createError({ statusCode: 400, statusMessage: `${label} ist ungültig` })
  }
  return value
}

export function buildStaffInvitationRenewal(opts: {
  email: string
  now?: Date
  token?: string
}): {
  invitation_token: string
  expires_at: string
  status: 'pending'
  email: string
} {
  const now = opts.now ?? new Date()
  const expires = new Date(now.getTime())
  expires.setDate(expires.getDate() + 30)
  return {
    invitation_token: opts.token ?? generateInvitationToken(),
    expires_at: expires.toISOString(),
    status: 'pending',
    email: opts.email,
  }
}

export function buildClientOnboardingRenewal(opts: {
  now?: Date
  token?: string
} = {}): ClientResendPatch {
  const now = opts.now ?? new Date()
  const expires = new Date(now.getTime())
  expires.setDate(expires.getDate() + 30)
  return {
    onboarding_token: opts.token ?? crypto.randomUUID(),
    onboarding_token_expires: expires.toISOString(),
  }
}

export function staffInvitationAcceptsToken(
  row: { status: string, invitation_token: string, expires_at: string },
  token: string,
  now: Date,
): boolean {
  return row.status === 'pending'
    && row.invitation_token === token
    && new Date(row.expires_at).getTime() > now.getTime()
}

export function clientOnboardingAcceptsToken(
  row: {
    onboarding_status: string | null
    onboarding_token: string | null
    onboarding_token_expires: string | null
    auth_user_id: string | null
  },
  token: string,
  now: Date,
): boolean {
  if (row.auth_user_id) return false
  if (row.onboarding_status !== 'pending') return false
  if (!row.onboarding_token || row.onboarding_token !== token) return false
  if (!row.onboarding_token_expires) return false
  return new Date(row.onboarding_token_expires).getTime() > now.getTime()
}

/**
 * Canonical client uniqueness for an invited-user email change:
 * - evaluateClientEmailClaim (no auth identity hijack, no tenant client with a login)
 * - another users row in the same tenant (add-student duplicate rule)
 * - another pending staff/admin invitation for that address
 */
export function assertClientInviteEmailFree(opts: {
  claim: AuthEmailClaim
  otherUserInTenant: boolean
  pendingStaffInvite: boolean
}): void {
  if (opts.claim.code === 'AUTH_LOOKUP_FAILED') {
    throw createError({
      statusCode: 503,
      statusMessage: opts.claim.message,
    })
  }
  if (!opts.claim.availableForAccount) {
    throw createError({
      statusCode: 409,
      statusMessage: opts.claim.message,
    })
  }
  if (opts.otherUserInTenant) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Diese E-Mail ist bereits registriert. Bitte eine andere Adresse wählen.',
    })
  }
  if (opts.pendingStaffInvite) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Für diese E-Mail existiert bereits eine offene Einladung.',
    })
  }
}

export async function updatePendingStaffInvitation(opts: {
  caller: InvitationAdminCaller
  invitationId: unknown
  firstName: unknown
  lastName: unknown
  email: unknown
  load: (id: string, tenantId: string) => Promise<StaffInvitationRow | null>
  save: (id: string, tenantId: string, patch: StaffInviteNamePatch | StaffInviteEmailPatch) => Promise<boolean>
  ensureEmailAvailable: (email: string, invitationId: string) => Promise<void>
  now?: Date
  createToken?: () => string
}): Promise<{
  id: string
  first_name: string
  last_name: string
  email: string
  status: 'pending' | 'expired'
  role: InvitationRole
  emailChanged: boolean
  tokenRotated: boolean
  previousToken: string
}> {
  const tenantId = assertInvitationAdmin(opts.caller)
  const invitationId = requireId(opts.invitationId, 'Einladung')
  const firstName = parseInviteName(opts.firstName, 'Vorname')
  const lastName = parseInviteName(opts.lastName, 'Nachname')
  const email = parseInviteEmail(opts.email)

  const invitation = await opts.load(invitationId, tenantId)
  if (!invitation || invitation.tenant_id !== tenantId) {
    throw createError({ statusCode: 404, statusMessage: 'Einladung nicht gefunden' })
  }
  if (!EDITABLE_STAFF_STATUSES.has(invitation.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nur offene Einladungen können bearbeitet werden',
    })
  }

  const currentEmail = normalizeInviteEmail(invitation.email)
  const emailChanged = email !== currentEmail
  const role = roleFromInvitation(invitation.role)
  const previousToken = invitation.invitation_token

  if (!emailChanged) {
    const saved = await opts.save(invitation.id, tenantId, {
      first_name: firstName,
      last_name: lastName,
    })
    if (!saved) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Einladung ist nicht mehr offen',
      })
    }
    const status = invitation.status === 'expired' ? 'expired' : 'pending'
    return {
      id: invitation.id,
      first_name: firstName,
      last_name: lastName,
      email: currentEmail,
      status,
      role,
      emailChanged: false,
      tokenRotated: false,
      previousToken,
    }
  }

  await opts.ensureEmailAvailable(email, invitation.id)
  const renewal = buildStaffInvitationRenewal({
    email,
    now: opts.now,
    token: opts.createToken?.(),
  })
  const saved = await opts.save(invitation.id, tenantId, {
    first_name: firstName,
    last_name: lastName,
    ...renewal,
  })
  if (!saved) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Einladung ist nicht mehr offen',
    })
  }

  return {
    id: invitation.id,
    first_name: firstName,
    last_name: lastName,
    email,
    status: 'pending',
    role,
    emailChanged: true,
    tokenRotated: true,
    previousToken,
  }
}

export async function updatePendingClientInvitation(opts: {
  caller: InvitationAdminCaller
  userId: unknown
  firstName: unknown
  lastName: unknown
  email: unknown
  load: (id: string, tenantId: string) => Promise<PendingClientRow | null>
  save: (id: string, tenantId: string, patch: ClientInviteNamePatch | ClientInviteEmailPatch) => Promise<boolean>
  ensureEmailAvailable: (email: string, userId: string) => Promise<void>
  now?: Date
  createToken?: () => string
}): Promise<{
  id: string
  first_name: string
  last_name: string
  email: string
  onboarding_status: 'pending'
  role: 'client'
  emailChanged: boolean
  tokenRotated: boolean
  previousToken: string | null
}> {
  const tenantId = assertInvitationAdmin(opts.caller)
  const userId = requireId(opts.userId, 'Benutzer')
  const firstName = parseInviteName(opts.firstName, 'Vorname')
  const lastName = parseInviteName(opts.lastName, 'Nachname')
  const email = parseInviteEmail(opts.email)

  const user = await opts.load(userId, tenantId)
  if (!user || user.tenant_id !== tenantId || user.role !== 'client') {
    throw createError({ statusCode: 404, statusMessage: 'Einladung nicht gefunden' })
  }
  if (user.onboarding_status !== 'pending' || user.auth_user_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Nur offene Kundeneinladungen können bearbeitet werden',
    })
  }

  const currentEmail = normalizeInviteEmail(user.email)
  const emailChanged = email !== currentEmail
  const previousToken = user.onboarding_token

  if (!emailChanged) {
    const saved = await opts.save(user.id, tenantId, {
      first_name: firstName,
      last_name: lastName,
    })
    if (!saved) {
      throw createError({ statusCode: 409, statusMessage: 'Einladung ist nicht mehr offen' })
    }
    return {
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      email: currentEmail,
      onboarding_status: 'pending',
      role: 'client',
      emailChanged: false,
      tokenRotated: false,
      previousToken,
    }
  }

  await opts.ensureEmailAvailable(email, user.id)
  const renewal = buildClientOnboardingRenewal({
    now: opts.now,
    token: opts.createToken?.(),
  })
  const saved = await opts.save(user.id, tenantId, {
    first_name: firstName,
    last_name: lastName,
    email,
    ...renewal,
  })
  if (!saved) {
    throw createError({ statusCode: 409, statusMessage: 'Einladung ist nicht mehr offen' })
  }

  return {
    id: user.id,
    first_name: firstName,
    last_name: lastName,
    email,
    onboarding_status: 'pending',
    role: 'client',
    emailChanged: true,
    tokenRotated: true,
    previousToken,
  }
}

export async function renewPendingClientInvitation(opts: {
  caller: InvitationAdminCaller
  userId: unknown
  load: (id: string, tenantId: string) => Promise<PendingClientRow | null>
  save: (id: string, tenantId: string, patch: ClientResendPatch) => Promise<boolean>
  now?: Date
  createToken?: () => string
}): Promise<{
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'client'
  onboarding_status: 'pending'
  token: string
  previousToken: string | null
  expiresAt: string
}> {
  const tenantId = assertInvitationAdmin(opts.caller)
  const userId = requireId(opts.userId, 'Benutzer')
  const user = await opts.load(userId, tenantId)
  if (!user || user.tenant_id !== tenantId || user.role !== 'client') {
    throw createError({ statusCode: 404, statusMessage: 'Einladung nicht gefunden' })
  }
  if (user.onboarding_status !== 'pending' || user.auth_user_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Diese Einladung kann nicht erneut gesendet werden',
    })
  }

  const email = parseInviteEmail(user.email)
  const previousToken = user.onboarding_token
  const renewal = buildClientOnboardingRenewal({
    now: opts.now,
    token: opts.createToken?.(),
  })
  const saved = await opts.save(user.id, tenantId, renewal)
  if (!saved) {
    throw createError({ statusCode: 409, statusMessage: 'Einladung ist nicht mehr offen' })
  }

  return {
    id: user.id,
    email,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    role: 'client',
    onboarding_status: 'pending',
    token: renewal.onboarding_token,
    previousToken,
    expiresAt: renewal.onboarding_token_expires,
  }
}
