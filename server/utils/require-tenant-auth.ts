import { createError, type H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthenticatedUser, requireAdminProfile } from '~/server/utils/auth'
import { STAFF_ADMIN_ROLES } from '~/server/utils/require-staff-or-internal'

export type TenantActor = {
  id: string
  tenant_id: string
  role: string
  email: string
  auth_user_id: string
}

function forbidden(message = 'Forbidden'): never {
  throw createError({ statusCode: 403, statusMessage: message })
}

/**
 * 401 if no valid session. Does not require a tenant profile.
 */
export async function requireAuthenticatedUser(event: H3Event) {
  const user = await getAuthenticatedUser(event)
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return user
}

/**
 * 401 if unauthenticated, 403 if no active tenant-bound DB user.
 */
export async function requireTenantActor(event: H3Event): Promise<TenantActor> {
  const user = await requireAuthenticatedUser(event)
  const id = (user.db_user_id || user.profile?.id || '') as string
  const tenant_id = (user.tenant_id || user.profile?.tenant_id || '') as string
  const role = (user.role || user.profile?.role || '') as string
  if (!id || !tenant_id || !role) {
    forbidden()
  }
  if (user.deleted_at || user.is_active === false) {
    forbidden('Forbidden – inactive account')
  }
  return {
    id,
    tenant_id,
    role,
    email: (user.profile?.email || user.email || '') as string,
    auth_user_id: user.id as string,
  }
}

export async function requireTenantStaff(event: H3Event): Promise<TenantActor> {
  return requireAdminProfile(event, [...STAFF_ADMIN_ROLES])
}

export async function requireTenantAdmin(event: H3Event): Promise<TenantActor> {
  return requireAdminProfile(event, ['admin', 'tenant_admin', 'super_admin'])
}

export function assertSameTenant(
  resourceTenantId: string | null | undefined,
  actorTenantId: string,
): void {
  if (!resourceTenantId || resourceTenantId !== actorTenantId) {
    forbidden()
  }
}

/** Staff may only act on themselves; admin/tenant_admin/super_admin may act on any same-tenant staff. */
export function assertSelfOrTenantAdmin(actor: TenantActor, resourceUserId: string): void {
  if (actor.id === resourceUserId) return
  if (actor.role === 'admin' || actor.role === 'tenant_admin' || actor.role === 'super_admin') return
  forbidden()
}

export async function loadUserInTenant(
  admin: SupabaseClient,
  userId: string,
  tenantId: string,
  opts?: { allowInactive?: boolean },
) {
  const { data, error } = await admin
    .from('users')
    .select('id, tenant_id, role, is_active, deleted_at')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error || !data) {
    forbidden()
  }
  if (!opts?.allowInactive && (data.deleted_at || data.is_active === false)) {
    forbidden()
  }
  return data
}

export async function loadStaffInTenant(
  admin: SupabaseClient,
  staffUserId: string,
  tenantId: string,
  opts?: { allowInactive?: boolean },
) {
  const data = await loadUserInTenant(admin, staffUserId, tenantId, opts)
  if (!(STAFF_ADMIN_ROLES as readonly string[]).includes(data.role)) {
    forbidden()
  }
  return data
}
