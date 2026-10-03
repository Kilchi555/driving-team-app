import { createError } from 'h3'

/**
 * Roles a tenant admin may write onto public.users.
 * Kept identical to the previous tenant-admin contract.
 */
export const TENANT_ASSIGNABLE_ROLES = new Set([
  'admin',
  'staff',
  'client',
  'customer',
])

/**
 * Closed set a super_admin may write onto public.users.
 * These are the roles the application already stores.
 * `student` is not a valid public.users.role.
 */
export const SUPER_ADMIN_ASSIGNABLE_ROLES = new Set([
  'client',
  'staff',
  'admin',
  'tenant_admin',
  'super_admin',
  'accountant',
  'customer',
  'affiliate',
])

/**
 * Only super_admin may assign super_admin.
 * Tenant admins may only set tenant-local roles.
 * Unknown roles, including `student`, are rejected.
 */
export function sanitizeRoleChange(callerRole: string, requestedRole: unknown): string | undefined {
  if (requestedRole === undefined || requestedRole === null || requestedRole === '') return undefined
  const role = String(requestedRole)

  if (callerRole === 'super_admin') {
    if (!SUPER_ADMIN_ASSIGNABLE_ROLES.has(role)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid role: ${role}`,
      })
    }
    return role
  }

  if (role === 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: cannot assign super_admin' })
  }

  if (!TENANT_ASSIGNABLE_ROLES.has(role)) {
    throw createError({ statusCode: 403, statusMessage: `Forbidden: cannot assign role ${role}` })
  }

  return role
}

const STAFF_CREATE_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'category',
  'birthdate',
  'street',
  'street_nr',
  'zip',
  'city',
  'profession',
  'faberid',
  'language',
] as const

/**
 * create-staff persists a staff profile in the caller tenant.
 * Client role, tenant_id, admin_level, is_primary_admin, auth_user_id,
 * is_active, and deleted_at are ignored, including when nested beside profile fields.
 */
export function staffCreatePayload(userData: unknown, callerTenantId: string): Record<string, unknown> {
  if (!callerTenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenant_id required' })
  }
  const source = userData && typeof userData === 'object' && !Array.isArray(userData)
    ? userData as Record<string, unknown>
    : {}
  const picked: Record<string, unknown> = {}
  for (const key of STAFF_CREATE_FIELDS) {
    if (source[key] !== undefined) picked[key] = source[key]
  }
  return {
    ...picked,
    role: 'staff',
    tenant_id: callerTenantId,
    is_primary_admin: false,
  }
}
