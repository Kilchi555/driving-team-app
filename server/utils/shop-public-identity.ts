const PUBLIC_SHOP_SESSION_ROLES = new Set(['client', 'student'])

/**
 * Public shop checkout binds a session only for same-tenant customers.
 * Staff/admin sessions are treated as anonymous on this path.
 * Browser user_id / email / phone are never an authorization source.
 */
export function publicShopSessionPrincipalId(
  sessionUser: { id?: string | null, tenant_id?: string | null, role?: string | null } | null | undefined,
  shopTenantId: string,
): string | null {
  if (!sessionUser?.id) return null
  if (sessionUser.tenant_id !== shopTenantId) return null
  if (!sessionUser.role || !PUBLIC_SHOP_SESSION_ROLES.has(sessionUser.role)) return null
  return sessionUser.id
}
