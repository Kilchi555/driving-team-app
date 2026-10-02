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

/** create-staff always persists a staff user. Caller-supplied roles are ignored. */
export function staffCreatePayload(userData: unknown): Record<string, unknown> {
  const base = userData && typeof userData === 'object' && !Array.isArray(userData)
    ? { ...(userData as Record<string, unknown>) }
    : {}
  return {
    ...base,
    role: 'staff',
  }
}
