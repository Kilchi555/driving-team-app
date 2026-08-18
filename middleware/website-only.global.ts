// After login: website_only tenants only see the slim website admin.
// After the 30-day setup window without a hosting plan, only billing/profile stay open.
// Default Simy tenants are untouched (flag false / missing).
import { isWebsiteOnlyAllowedAdminPath, isWebsiteOnlyTenant } from '~/utils/website-only'
import { isWebsiteHostingLocked, isWebsiteLockedAllowedAdminPath } from '~/utils/website-billing'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return
  if (!to.path.startsWith('/admin')) return

  const auth = useAuthStore()
  if (!isWebsiteOnlyTenant(auth.tenantTrialInfo)) return

  if (isWebsiteHostingLocked(auth.tenantTrialInfo)) {
    if (isWebsiteLockedAllowedAdminPath(to.path)) return
    return navigateTo('/admin/billing')
  }

  if (to.path === '/admin' || to.path === '/admin/') {
    return navigateTo('/admin/website')
  }

  if (isWebsiteOnlyAllowedAdminPath(to.path)) return

  return navigateTo('/admin/website')
})
