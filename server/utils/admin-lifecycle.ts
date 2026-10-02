import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revokeAuthSessions } from '~/server/utils/session-control'
import { logAudit } from '~/server/utils/audit'
import { toLocalTimeString } from '~/utils/dateUtils'

export type LifecycleUser = {
  id: string
  tenant_id: string | null
  role: string | null
  is_primary_admin?: boolean | null
  is_active?: boolean | null
  deleted_at?: string | null
  auth_user_id?: string | null
}

const TARGET_COLS =
  'id, tenant_id, role, is_primary_admin, is_active, deleted_at, auth_user_id'

export function isActiveAdmin(user: Pick<LifecycleUser, 'role' | 'is_active' | 'deleted_at'>): boolean {
  return user.role === 'admin' && user.is_active === true && user.deleted_at == null
}

export function isActivePrimaryAdmin(user: Pick<LifecycleUser, 'role' | 'is_primary_admin' | 'is_active' | 'deleted_at'>): boolean {
  return isActiveAdmin(user) && user.is_primary_admin === true
}

/** Normal tenant-admin check. `superadmin` and `super_admin` do not pass. */
export function passesNormalAdminCheck(role: string | null | undefined): boolean {
  return role === 'admin'
}

/**
 * Tenant for service-role user queries.
 * Non-super-admins always use their own public.users.tenant_id.
 * A supplied foreign tenant_id is rejected. Nested user_data.tenant_id is not an input.
 */
export function resolveScopedTenantId(
  callerRole: string | null | undefined,
  callerTenantId: string | null | undefined,
  requestedTenantId: unknown,
): string {
  if (callerRole === 'super_admin') {
    if (typeof requestedTenantId === 'string' && requestedTenantId) return requestedTenantId
    if (callerTenantId) return callerTenantId
    throw createError({ statusCode: 400, statusMessage: 'tenant_id required' })
  }

  if (
    requestedTenantId !== undefined &&
    requestedTenantId !== null &&
    requestedTenantId !== '' &&
    requestedTenantId !== callerTenantId
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Tenant mismatch' })
  }

  if (!callerTenantId) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Tenant mismatch' })
  }

  return callerTenantId
}

export function evaluateDeactivation(opts: {
  caller: LifecycleUser
  target: LifecycleUser
  activeAdminCount: number
}): { ok: true } | { ok: false; statusCode: 403 | 409; statusMessage: string } {
  if (opts.caller.role !== 'super_admin' && opts.caller.tenant_id !== opts.target.tenant_id) {
    return {
      ok: false,
      statusCode: 403,
      statusMessage: 'Cannot deactivate user from different tenant',
    }
  }

  if (opts.target.role !== 'admin') return { ok: true }

  if (opts.activeAdminCount <= 1 && isActiveAdmin(opts.target)) {
    return {
      ok: false,
      statusCode: 409,
      statusMessage: 'Letzter aktiver Administrator kann nicht entfernt werden',
    }
  }

  if (isActivePrimaryAdmin(opts.caller) && opts.caller.id === opts.target.id) {
    return {
      ok: false,
      statusCode: 403,
      statusMessage: 'Der Hauptadministrator kann sich nicht selbst deaktivieren',
    }
  }

  if (
    opts.caller.role !== 'super_admin' &&
    !isActivePrimaryAdmin(opts.caller) &&
    isActiveAdmin(opts.target) &&
    opts.target.is_primary_admin === true
  ) {
    return {
      ok: false,
      statusCode: 403,
      statusMessage: 'Nur der Hauptadministrator kann den Hauptadministrator deaktivieren',
    }
  }

  return { ok: true }
}

export function evaluateReactivation(caller: LifecycleUser): { ok: true } | { ok: false; statusCode: 403; statusMessage: string } {
  if (caller.role === 'super_admin') return { ok: true }
  if (isActivePrimaryAdmin(caller)) return { ok: true }
  return {
    ok: false,
    statusCode: 403,
    statusMessage: 'Nur der Hauptadministrator kann Benutzer reaktivieren',
  }
}

export async function countActiveAdmins(supabase: SupabaseClient, tenantId: string | null): Promise<number> {
  if (!tenantId) return 0
  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('role', 'admin')
    .eq('is_active', true)
    .is('deleted_at', null)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Administratoren konnten nicht geprüft werden' })
  }
  return count || 0
}

export async function deactivateTenantUser(opts: {
  supabase: SupabaseClient
  caller: LifecycleUser
  targetUserId: string
  reason?: string | null
  authUserId?: string | null
  ipAddress?: string | null
}): Promise<{ success: true }> {
  if (!opts.targetUserId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required field: user_id' })
  }

  const { data: target, error } = await opts.supabase
    .from('users')
    .select(TARGET_COLS)
    .eq('id', opts.targetUserId)
    .maybeSingle()

  if (error || !target) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const activeAdminCount = target.role === 'admin'
    ? await countActiveAdmins(opts.supabase, target.tenant_id)
    : 0

  const decision = evaluateDeactivation({
    caller: opts.caller,
    target: target as LifecycleUser,
    activeAdminCount,
  })
  if (!decision.ok) {
    throw createError({ statusCode: decision.statusCode, statusMessage: decision.statusMessage })
  }

  const { error: updateError } = await opts.supabase
    .from('users')
    .update({
      is_active: false,
      deleted_at: toLocalTimeString(new Date()),
      deletion_reason: opts.reason || 'Deaktiviert',
    })
    .eq('id', target.id)
    .eq('tenant_id', target.tenant_id)

  if (updateError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to deactivate user' })
  }

  if (target.auth_user_id) {
    await revokeAuthSessions(opts.supabase, target.auth_user_id)
  }

  await logAudit({
    user_id: opts.caller.id,
    auth_user_id: opts.authUserId || undefined,
    action: 'user_deactivated',
    resource_type: 'user',
    resource_id: target.id,
    status: 'success',
    ip_address: opts.ipAddress || undefined,
    tenant_id: target.tenant_id || undefined,
    details: {
      reason: opts.reason || 'Deaktiviert',
      target_role: target.role,
    },
  })

  return { success: true }
}
