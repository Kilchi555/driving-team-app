import { H3Event, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'

/**
 * Verifies the current user has the super_admin role.
 * Throws 403 otherwise.
 * getAuthenticatedUser already resolves the role from the users table.
 */
export async function requireSuperAdmin(event: H3Event) {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const role = (authUser as any).role ?? (authUser as any).profile?.role
  if (role !== 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Super admin access required' })
  }

  return authUser
}

/**
 * Returns the fixed tenant_id used for simy.ch's own GBP connection.
 * Stored in SIMY_GBP_TENANT_ID env var — set to any stable UUID.
 */
export function getSimyGbpTenantId(): string {
  const id = process.env.SIMY_GBP_TENANT_ID
  if (!id) throw createError({ statusCode: 500, statusMessage: 'SIMY_GBP_TENANT_ID not configured' })
  return id
}
