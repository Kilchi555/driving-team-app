/**
 * Redirect to tenant-specific login page instead of generic /login
 * This ensures users are redirected to their correct tenant's login
 * 
 * Priority:
 * 1. Use provided tenant slug parameter
 * 2. Use tenant from URL route
 * 3. Use last visited tenant from localStorage
 * 4. Fallback to /login if no tenant available
 */
export function getLoginPath(tenantSlug?: string | null): string {
  // If tenant slug is provided, use it
  if (tenantSlug) {
    return `/${tenantSlug}`
  }

  // Try to get from localStorage (last visited tenant)
  if (process.client) {
    const lastTenant = localStorage.getItem('last_tenant_slug')
    if (lastTenant) {
      return `/${lastTenant}`
    }
  }

  // Fallback to generic login
  return '/login'
}

/**
 * Navigate to tenant-specific login page
 * This is a wrapper around navigateTo that uses getLoginPath
 */
export async function redirectToTenantLogin(tenantSlug?: string | null) {
  const loginPath = getLoginPath(tenantSlug)
  await navigateTo(loginPath)
}
