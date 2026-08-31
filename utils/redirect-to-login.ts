import { isTenantLoginPath } from '~/utils/public-paths'

/**
 * Redirect to tenant-specific login page instead of generic /login
 * This ensures users are redirected to their correct tenant's login
 * 
 * Priority:
 * 1. Use provided tenant slug parameter
 * 2. Use last visited tenant from localStorage
 * 3. Use tenant slug already in the URL
 * 4. Fallback to /login if no tenant available
 */
export function getLoginPath(tenantSlug?: string | null): string {
  // If tenant slug is provided, use it
  if (tenantSlug) {
    return `/${tenantSlug}`
  }

  if (process.client) {
    try {
      const lastTenant = localStorage.getItem('last_tenant_slug')
      if (lastTenant) {
        return `/${lastTenant}`
      }
    } catch { /* ignore */ }

    try {
      const path = window.location?.pathname || ''
      const first = path.split('/').filter(Boolean)[0]
      if (first && isTenantLoginPath(path)) {
        return `/${first}`
      }
    } catch { /* ignore */ }
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
