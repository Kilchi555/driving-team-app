/**
 * AUTH-P0-01: Public POST /api/auth/register-client must never mint a privileged role.
 *
 * First-tenant bootstrap is a separate HMAC-gated flow:
 * POST /api/tenants/register → POST /api/tenants/create-admin
 *
 * Client-supplied isAdmin / role / query flags are not authorization.
 */

export const PUBLIC_REGISTRATION_ROLE = 'client' as const

export const PRIVILEGED_USER_ROLES = [
  'tenant_admin',
  'admin',
  'staff',
  'super_admin',
] as const

export type PrivilegedUserRole = (typeof PRIVILEGED_USER_ROLES)[number]

export function isPrivilegedUserRole(role: unknown): role is PrivilegedUserRole {
  return typeof role === 'string' && (PRIVILEGED_USER_ROLES as readonly string[]).includes(role)
}

/**
 * Always returns the unprivileged customer role for this public endpoint.
 * Requested values from body/query/header are ignored.
 */
export function resolvePublicRegistrationRole(_requested?: unknown): typeof PUBLIC_REGISTRATION_ROLE {
  return PUBLIC_REGISTRATION_ROLE
}
