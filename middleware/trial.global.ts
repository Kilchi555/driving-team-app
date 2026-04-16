// middleware/trial.global.ts
// Runs on every navigation. Redirects to /upgrade when a tenant's
// subscription has expired (trial ended and no active subscription).
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  // Skip public routes where a redirect would be wrong
  const publicPaths = ['/upgrade', '/payment', '/login', '/register', '/tenant-register']
  if (publicPaths.some(p => to.path.startsWith(p))) return

  // Only enforce on tenant-specific protected areas
  const protectedPrefixes = ['/admin', '/staff', '/customer']
  if (!protectedPrefixes.some(p => to.path.startsWith(p))) return

  const { getTrialStatus } = useTrialFeatures()
  const status = getTrialStatus()

  if (status.status === 'expired') {
    return navigateTo('/upgrade')
  }
})
