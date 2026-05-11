// middleware/trial.global.ts
// Runs on every navigation. Redirects to /upgrade when a tenant's
// subscription has expired (trial ended or paid sub lapsed).
//
// When trial is expired, these routes remain accessible (read-only orientation):
//   /admin           → Dashboard
//   /admin/users     → Kundenliste
const TRIAL_EXPIRED_ALLOWED = ['/admin', '/admin/users']

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  // Skip public routes where a redirect would be wrong
  const publicPaths = ['/upgrade', '/payment', '/login', '/register', '/tenant-register']
  if (publicPaths.some(p => to.path.startsWith(p))) return

  // Only enforce on tenant-specific protected areas
  const protectedPrefixes = ['/admin', '/staff', '/customer']
  if (!protectedPrefixes.some(p => to.path.startsWith(p))) return

  const auth = useAuthStore()
  const info = auth.tenantTrialInfo

  // If trial data hasn't loaded yet (e.g. before login), allow navigation
  if (!info) return

  const now = new Date()

  // ── Active paid subscription → always allow ────────────────────────────────
  if (!info.is_trial && info.subscription_plan && info.subscription_plan !== 'trial') {
    // No period end = legacy/manual subscription (e.g. old "premium" plan) → always allow
    if (!info.current_period_end) return
    if (now < new Date(info.current_period_end)) return
    // Paid subscription exists but period has ended → redirect to upgrade
    return navigateTo('/upgrade')
  }

  // ── Trial: check if expired ────────────────────────────────────────────────
  if (info.is_trial && info.trial_ends_at) {
    const trialEnd = new Date(info.trial_ends_at)
    if (now > trialEnd) {
      // Allow only exact matches or explicit sub-paths (e.g. /admin/users/[id])
      const allowed = TRIAL_EXPIRED_ALLOWED.some(p =>
        to.path === p || (p !== '/admin' && to.path.startsWith(p + '/'))
      )
      if (!allowed) return navigateTo('/upgrade')
    }
  }
})
