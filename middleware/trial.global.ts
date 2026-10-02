// middleware/trial.global.ts
// Runs on every client navigation. Redirects to /upgrade when a tenant's
// subscription has expired (trial ended or paid sub lapsed).
//
// Trial/subscription fields are server-authoritative for this page load.
// app-session-cache must not satisfy the gate. When a logged-in tenant's
// server status is still loading, navigation waits. If the server status
// cannot be loaded, the gate fails closed instead of trusting localStorage.
//
// When trial is expired, these routes remain accessible (read-only orientation):
//   /admin           → Dashboard
//   /admin/users     → Kundenliste
import { decideTrialGate } from '~/utils/trial-gate'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  // Skip public routes where a redirect would be wrong
  const publicPaths = ['/upgrade', '/payment', '/login', '/register', '/tenant-register']
  if (publicPaths.some(p => to.path.startsWith(p))) return

  // Only enforce on tenant-specific protected areas
  const protectedPrefixes = ['/admin', '/staff', '/customer']
  if (!protectedPrefixes.some(p => to.path.startsWith(p))) return

  const auth = useAuthStore()
  const loggedInWithTenant = !!(auth.user && auth.userProfile?.tenant_id)

  // Plugins await this before app:created navigation. Waiting here as well
  // covers a protected navigation that starts before that refresh finishes.
  if (loggedInWithTenant && auth.tenantTrialAuthority !== 'server') {
    await auth.loadTenantTrialInfo()
  }

  const decision = decideTrialGate({
    path: to.path,
    now: new Date(),
    info: auth.tenantTrialAuthority === 'server' ? auth.tenantTrialInfo : null,
    loggedInWithTenant,
    authority: loggedInWithTenant ? auth.tenantTrialAuthority : 'idle',
  })

  if (decision === 'allow') return
  // 'wait' after the await means the server status never arrived.
  return navigateTo('/upgrade')
})
