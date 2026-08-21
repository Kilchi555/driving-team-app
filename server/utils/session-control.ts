import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const USER_COLS = 'id, email, first_name, last_name, role, auth_user_id, tenant_id, is_active'
const TENANT_COLS = 'id, name, slug'

export type SessionUserSummary = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  role: string
  auth_user_id: string | null
  tenant_id: string | null
  is_active: boolean
}

export type AuthSessionRow = {
  id: string
  created_at: string | null
  updated_at: string | null
  refreshed_at: string | null
  user_agent: string | null
  ip: string | null
  aal: string | null
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function actorDbUserId(authUser: Record<string, any>): string | null {
  return authUser.db_user_id || authUser.profile?.id || null
}

function asUserMap(rows: SessionUserSummary[] | null) {
  const map = new Map<string, SessionUserSummary>()
  for (const row of rows || []) map.set(row.id, row)
  return map
}

export async function hydrateImpersonationRows(
  supabase: SupabaseClient,
  rows: any[],
) {
  if (!rows.length) return []

  const userIds = new Set<string>()
  const tenantIds = new Set<string>()
  for (const row of rows) {
    if (row.actor_user_id) userIds.add(row.actor_user_id)
    if (row.target_user_id) userIds.add(row.target_user_id)
    if (row.tenant_id) tenantIds.add(row.tenant_id)
  }

  const [{ data: users }, { data: tenants }] = await Promise.all([
    userIds.size
      ? supabase.from('users').select(USER_COLS).in('id', [...userIds])
      : Promise.resolve({ data: [] as SessionUserSummary[] }),
    tenantIds.size
      ? supabase.from('tenants').select(TENANT_COLS).in('id', [...tenantIds])
      : Promise.resolve({ data: [] as any[] }),
  ])

  const usersById = asUserMap((users || []) as SessionUserSummary[])
  const tenantsById = new Map((tenants || []).map((t: any) => [t.id, t]))

  return rows.map((row) => ({
    id: row.id,
    tenant_id: row.tenant_id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    switch_type: row.switch_type,
    tenant: tenantsById.get(row.tenant_id) || null,
    actor: usersById.get(row.actor_user_id) || null,
    target: usersById.get(row.target_user_id) || null,
  }))
}

export async function loadImpersonationOverview(supabase: SupabaseClient) {
  const [{ data: open, error: openErr }, { data: history, error: histErr }] = await Promise.all([
    supabase
      .from('impersonation_sessions')
      .select('*')
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(100),
    supabase
      .from('impersonation_sessions')
      .select('*')
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(40),
  ])

  if (openErr) {
    throw createError({ statusCode: 500, statusMessage: `Offene Sessions: ${openErr.message}` })
  }
  if (histErr) {
    throw createError({ statusCode: 500, statusMessage: `Verlauf: ${histErr.message}` })
  }

  const [openHydrated, historyHydrated] = await Promise.all([
    hydrateImpersonationRows(supabase, open || []),
    hydrateImpersonationRows(supabase, history || []),
  ])

  return { open: openHydrated, history: historyHydrated }
}

export async function findUsersByEmail(supabase: SupabaseClient, email: string) {
  const { data, error } = await supabase
    .from('users')
    .select(USER_COLS)
    .ilike('email', email)
    .is('deleted_at', null)
    .order('role')
    .limit(10)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Benutzer suche: ${error.message}` })
  }
  return (data || []) as SessionUserSummary[]
}

export async function listAuthSessions(supabase: SupabaseClient, authUserId: string) {
  const { data, error } = await supabase.rpc('sa_list_auth_sessions', {
    p_auth_user_id: authUserId,
  })
  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Auth-Sessions: ${error.message}` })
  }
  return (data || []) as AuthSessionRow[]
}

export async function revokeAuthSessions(
  supabase: SupabaseClient,
  authUserId: string,
  sessionId?: string | null,
) {
  const { data, error } = await supabase.rpc('sa_revoke_auth_sessions', {
    p_auth_user_id: authUserId,
    p_session_id: sessionId || null,
  })
  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Widerruf: ${error.message}` })
  }
  return typeof data === 'number' ? data : Number(data || 0)
}

export async function closeOpenImpersonationsForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('impersonation_sessions')
    .update({ ended_at: now })
    .is('ended_at', null)
    .or(`actor_user_id.eq.${userId},target_user_id.eq.${userId}`)
  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Impersonation beenden: ${error.message}` })
  }
}
