/**
 * Account switch / impersonation.
 * All privilege checks live here — endpoints must not bypass them.
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { createError, deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import { getSupabaseAdmin, getSupabaseAnon } from '~/server/utils/supabase-admin'
import { setAuthCookies } from '~/server/utils/cookies'

export const IMPERSONATOR_COOKIE = 'sb-impersonator'
const IMPERSONATION_MAX_MS = 8 * 60 * 60 * 1000

export type SwitchUserRow = {
  id: string
  tenant_id: string | null
  auth_user_id: string | null
  role: string
  email: string | null
  first_name: string | null
  last_name: string | null
  is_active: boolean
  deleted_at?: string | null
  admin_level?: string | null
  is_primary_admin?: boolean | null
  linked_admin_user_id?: string | null
  can_switch_all_staff?: boolean | null
}

export type ImpersonatorContext = {
  sessionId: string
  actorUserId: string
  actorAuthUserId: string
  iat: number
}

export type SwitchTarget = {
  id: string
  first_name: string | null
  last_name: string | null
  role: 'admin' | 'staff'
  kind: 'admin' | 'own_staff' | 'staff'
}

const USER_SWITCH_COLS =
  'id, tenant_id, auth_user_id, role, email, first_name, last_name, is_active, deleted_at, admin_level, is_primary_admin, linked_admin_user_id, can_switch_all_staff'

function switchSecret(): string {
  const dedicated = process.env.ACCOUNT_SWITCH_COOKIE_SECRET
  if (dedicated && dedicated.length >= 32) return dedicated
  const fallback = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!fallback) throw new Error('Missing account-switch cookie secret')
  return fallback
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function isSubAdmin(user: Pick<SwitchUserRow, 'role' | 'admin_level'>): boolean {
  return user.role === 'admin' && user.admin_level === 'sub_admin'
}

export function isTenantAdmin(user: Pick<SwitchUserRow, 'role'>): boolean {
  return user.role === 'admin'
}

/** Hauptadmin or unmarked tenant admin (not sub_admin). Super-admin is excluded. */
export function isPrimaryTenantAdmin(user: Pick<SwitchUserRow, 'role' | 'admin_level' | 'is_primary_admin'>): boolean {
  if (user.role !== 'admin') return false
  if (user.admin_level === 'sub_admin') return false
  return true
}

export function isSwitchableStaff(user: SwitchUserRow): boolean {
  return (
    user.role === 'staff' &&
    user.is_active === true &&
    !user.deleted_at &&
    !!user.auth_user_id &&
    !!user.email
  )
}

function deny(message = 'Wechsel nicht erlaubt'): never {
  throw createError({ statusCode: 403, statusMessage: message })
}

function signImpersonator(payload: ImpersonatorContext): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sig = createHmac('sha256', switchSecret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

function verifyImpersonatorToken(token: string | undefined): ImpersonatorContext | null {
  try {
    if (!token || !token.includes('.')) return null
    const [body, sig] = token.split('.')
    if (!body || !sig) return null
    const expected = createHmac('sha256', switchSecret()).update(body).digest('base64url')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ImpersonatorContext
    if (!payload?.sessionId || !payload?.actorUserId || !payload?.actorAuthUserId) return null
    if (typeof payload.iat !== 'number' || Date.now() - payload.iat > IMPERSONATION_MAX_MS) return null
    return payload
  } catch {
    return null
  }
}

export function readImpersonatorCookie(event: H3Event): ImpersonatorContext | null {
  return verifyImpersonatorToken(getCookie(event, IMPERSONATOR_COOKIE))
}

export function setImpersonatorCookie(event: H3Event, ctx: ImpersonatorContext) {
  setCookie(event, IMPERSONATOR_COOKIE, signImpersonator(ctx), {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(IMPERSONATION_MAX_MS / 1000),
  })
}

export function clearImpersonatorCookie(event: H3Event) {
  deleteCookie(event, IMPERSONATOR_COOKIE, { path: '/' })
}

export async function loadSwitchUser(id: string): Promise<SwitchUserRow | null> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('users')
    .select(USER_SWITCH_COLS)
    .eq('id', id)
    .maybeSingle()
  return (data as SwitchUserRow | null) ?? null
}

export async function loadSwitchUserByAuthId(authUserId: string): Promise<SwitchUserRow | null> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('users')
    .select(USER_SWITCH_COLS)
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  return (data as SwitchUserRow | null) ?? null
}

async function loadValidImpersonator(
  event: H3Event,
  tenantId: string,
): Promise<{ ctx: ImpersonatorContext; actor: SwitchUserRow } | null> {
  const ctx = readImpersonatorCookie(event)
  if (!ctx) return null

  const supabase = getSupabaseAdmin()
  const { data: session } = await supabase
    .from('impersonation_sessions')
    .select('id, tenant_id, actor_user_id, ended_at, started_at')
    .eq('id', ctx.sessionId)
    .maybeSingle()

  if (!session || session.ended_at || session.tenant_id !== tenantId) return null
  if (session.actor_user_id !== ctx.actorUserId) return null
  if (Date.now() - new Date(session.started_at).getTime() > IMPERSONATION_MAX_MS) return null

  const actor = await loadSwitchUser(ctx.actorUserId)
  if (!actor || !isTenantAdmin(actor) || actor.tenant_id !== tenantId || !actor.is_active || actor.deleted_at) {
    return null
  }
  if (actor.auth_user_id !== ctx.actorAuthUserId) return null
  return { ctx, actor }
}

async function actorHasGrant(actorId: string, targetStaffId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('account_switch_grants')
    .select('id')
    .eq('actor_user_id', actorId)
    .eq('target_user_id', targetStaffId)
    .maybeSingle()
  return !!data
}

async function actorHasAnyGrant(actorId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const { count } = await supabase
    .from('account_switch_grants')
    .select('id', { count: 'exact', head: true })
    .eq('actor_user_id', actorId)
  return (count || 0) > 0
}

/**
 * Who is allowed to pick a staff target: the current user, or the admin
 * behind a valid impersonation cookie (never the staff being helped).
 */
export async function resolveGrantActor(
  event: H3Event,
  current: SwitchUserRow,
): Promise<SwitchUserRow> {
  if (!current.tenant_id) deny()
  const impersonator = await loadValidImpersonator(event, current.tenant_id)
  return impersonator?.actor ?? current
}

export async function canSwitchToStaff(
  event: H3Event,
  current: SwitchUserRow,
  target: SwitchUserRow,
): Promise<boolean> {
  if (!current.tenant_id || current.tenant_id !== target.tenant_id) return false
  if (!isSwitchableStaff(target)) return false
  if (target.id === current.id) return false
  if (target.role !== 'staff') return false

  const actor = await resolveGrantActor(event, current)
  if (actor.role === 'super_admin') return false
  if (actor.tenant_id !== target.tenant_id) return false

  if (isPrimaryTenantAdmin(actor)) return true

  if (actor.role === 'staff' && actor.linked_admin_user_id) {
    const linked = await loadSwitchUser(actor.linked_admin_user_id)
    if (linked && isPrimaryTenantAdmin(linked) && linked.tenant_id === actor.tenant_id && linked.is_active) {
      return true
    }
  }

  if (actor.can_switch_all_staff === true && (isSubAdmin(actor) || actor.role === 'staff')) {
    return true
  }

  return actorHasGrant(actor.id, target.id)
}

export async function canReturnToAdmin(
  event: H3Event,
  current: SwitchUserRow,
  admin: SwitchUserRow,
): Promise<boolean> {
  if (!current.tenant_id || current.tenant_id !== admin.tenant_id) return false
  if (!isTenantAdmin(admin) || admin.role === 'super_admin') return false
  if (!admin.is_active || admin.deleted_at || !admin.auth_user_id || !admin.email) return false

  const impersonator = current.tenant_id
    ? await loadValidImpersonator(event, current.tenant_id)
    : null
  if (impersonator && impersonator.actor.id === admin.id) return true
  if (current.linked_admin_user_id && current.linked_admin_user_id === admin.id) return true
  return false
}

export async function userCanOpenSwitcher(
  event: H3Event,
  user: SwitchUserRow,
  websiteOnly: boolean,
): Promise<boolean> {
  const flags = await switchFlagsForUser(event, user, websiteOnly)
  return flags.can_switch_accounts
}

export async function switchFlagsForUser(
  event: H3Event,
  user: SwitchUserRow,
  websiteOnly: boolean,
): Promise<{ can_switch_accounts: boolean; impersonating: boolean }> {
  if (websiteOnly || user.role === 'super_admin' || !user.tenant_id) {
    return { can_switch_accounts: false, impersonating: false }
  }
  const impersonator = await loadValidImpersonator(event, user.tenant_id)
  if (impersonator) return { can_switch_accounts: true, impersonating: true }
  if (isTenantAdmin(user)) return { can_switch_accounts: true, impersonating: false }
  if (user.linked_admin_user_id) return { can_switch_accounts: true, impersonating: false }
  if (user.can_switch_all_staff === true) return { can_switch_accounts: true, impersonating: false }
  if (await actorHasAnyGrant(user.id)) return { can_switch_accounts: true, impersonating: false }
  return { can_switch_accounts: false, impersonating: false }
}

export async function listAllowedStaffTargets(
  event: H3Event,
  current: SwitchUserRow,
): Promise<SwitchUserRow[]> {
  if (!current.tenant_id) return []
  const supabase = getSupabaseAdmin()
  const { data: staffRows } = await supabase
    .from('users')
    .select(USER_SWITCH_COLS)
    .eq('tenant_id', current.tenant_id)
    .eq('role', 'staff')
    .eq('is_active', true)
    .is('deleted_at', null)
    .not('auth_user_id', 'is', null)
    .order('first_name', { ascending: true })

  const staff = ((staffRows || []) as SwitchUserRow[]).filter(isSwitchableStaff)
  const allowed: SwitchUserRow[] = []
  for (const row of staff) {
    if (await canSwitchToStaff(event, current, row)) allowed.push(row)
  }
  return allowed
}

export async function buildSwitchTargets(
  event: H3Event,
  current: SwitchUserRow,
  websiteOnly: boolean,
): Promise<{ canSwitch: boolean; impersonating: boolean; admin: SwitchTarget | null; ownStaff: SwitchTarget | null; staff: SwitchTarget[] }> {
  if (websiteOnly || current.role === 'super_admin' || !current.tenant_id) {
    return { canSwitch: false, impersonating: false, admin: null, ownStaff: null, staff: [] }
  }

  const impersonator = await loadValidImpersonator(event, current.tenant_id)
  let admin: SwitchTarget | null = null
  if (impersonator) {
    const a = impersonator.actor
    admin = { id: a.id, first_name: a.first_name, last_name: a.last_name, role: 'admin', kind: 'admin' }
  } else if (current.role === 'staff' && current.linked_admin_user_id) {
    const linked = await loadSwitchUser(current.linked_admin_user_id)
    if (linked && (await canReturnToAdmin(event, current, linked))) {
      admin = { id: linked.id, first_name: linked.first_name, last_name: linked.last_name, role: 'admin', kind: 'admin' }
    }
  }

  const grantActor = impersonator?.actor ?? current
  let ownStaff: SwitchTarget | null = null
  if (isTenantAdmin(grantActor)) {
    const { data: own } = await getSupabaseAdmin()
      .from('users')
      .select(USER_SWITCH_COLS)
      .eq('linked_admin_user_id', grantActor.id)
      .eq('role', 'staff')
      .maybeSingle()
    if (own && isSwitchableStaff(own as SwitchUserRow)) {
      ownStaff = {
        id: own.id,
        first_name: own.first_name,
        last_name: own.last_name,
        role: 'staff',
        kind: 'own_staff',
      }
    }
  } else if (current.role === 'staff') {
    ownStaff = {
      id: current.id,
      first_name: current.first_name,
      last_name: current.last_name,
      role: 'staff',
      kind: 'own_staff',
    }
  }

  const staffRows = await listAllowedStaffTargets(event, current)
  const staff = staffRows
    .filter((s) => s.id !== ownStaff?.id && s.id !== current.id)
    .map((s) => ({
      id: s.id,
      first_name: s.first_name,
      last_name: s.last_name,
      role: 'staff' as const,
      kind: 'staff' as const,
    }))

  if (admin?.id === current.id) admin = null
  if (ownStaff?.id === current.id) ownStaff = null

  const canSwitch = !!(admin || ownStaff || staff.length > 0 || isTenantAdmin(current))
  return { canSwitch, impersonating: !!impersonator, admin, ownStaff, staff }
}

export async function mintSessionForUser(user: SwitchUserRow): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }
}> {
  if (!user.email || !user.auth_user_id) deny('Konto hat keinen Login')

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !serviceKey || !anonKey) {
    throw createError({ statusCode: 500, statusMessage: 'Server configuration error' })
  }

  const adminClient = getSupabaseAdmin()

  const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: user.email,
  })

  if (linkErr || !linkData?.properties?.hashed_token) {
    throw createError({ statusCode: 500, statusMessage: 'Session konnte nicht erstellt werden' })
  }

  const publicClient = getSupabaseAnon()
  const { data: sessionData, error: sessionErr } = await publicClient.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })

  if (sessionErr || !sessionData?.session || !sessionData.user) {
    throw createError({ statusCode: 500, statusMessage: 'Session konnte nicht erstellt werden' })
  }

  if (sessionData.user.id !== user.auth_user_id) {
    deny()
  }

  const expiresIn = sessionData.session.expires_in || 86400
  return {
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    authUser: {
      id: sessionData.user.id,
      email: sessionData.user.email,
      user_metadata: sessionData.user.user_metadata || {},
    },
  }
}

export async function startOrUpdateImpersonation(opts: {
  event: H3Event
  actor: SwitchUserRow
  target: SwitchUserRow
  switchType: 'linked' | 'support' | 'staff_switch'
  ipAddress?: string
  userAgent?: string
}): Promise<string> {
  const supabase = getSupabaseAdmin()
  const existing = await loadValidImpersonator(opts.event, opts.actor.tenant_id!)

  if (existing) {
    await supabase
      .from('impersonation_sessions')
      .update({ target_user_id: opts.target.id, switch_type: opts.switchType })
      .eq('id', existing.ctx.sessionId)
      .is('ended_at', null)
    setImpersonatorCookie(opts.event, existing.ctx)
    return existing.ctx.sessionId
  }

  const { data, error } = await supabase
    .from('impersonation_sessions')
    .insert({
      tenant_id: opts.actor.tenant_id,
      actor_user_id: opts.actor.id,
      target_user_id: opts.target.id,
      ip_address: opts.ipAddress || null,
      user_agent: opts.userAgent?.slice(0, 300) || null,
      switch_type: opts.switchType,
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    throw createError({ statusCode: 500, statusMessage: 'Impersonation konnte nicht gestartet werden' })
  }

  setImpersonatorCookie(opts.event, {
    sessionId: data.id,
    actorUserId: opts.actor.id,
    actorAuthUserId: opts.actor.auth_user_id!,
    iat: Date.now(),
  })
  return data.id
}

export async function endImpersonation(event: H3Event, tenantId: string) {
  const existing = await loadValidImpersonator(event, tenantId)
  if (existing) {
    await getSupabaseAdmin()
      .from('impersonation_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', existing.ctx.sessionId)
      .is('ended_at', null)
  }
  clearImpersonatorCookie(event)
}

export function applySessionCookies(
  event: H3Event,
  session: { access_token: string; refresh_token: string },
) {
  setAuthCookies(event, session.access_token, session.refresh_token)
}

export async function assertCallerMayManageGrants(caller: SwitchUserRow): Promise<void> {
  if (caller.role === 'super_admin') return
  if (!isPrimaryTenantAdmin(caller) || !caller.is_active || caller.deleted_at) deny()
}

export { USER_SWITCH_COLS }
