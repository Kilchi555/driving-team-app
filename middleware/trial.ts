// middleware/trial.ts
export default defineNuxtRouteMiddleware((to) => {
  // Nur auf geschützten Routen prüfen
  if (to.path.startsWith('/admin') || to.path.startsWith('/staff') || to.path.startsWith('/customer')) {
    const { tenant } = useAuth()
    
    if (tenant?.value?.is_trial) {
      const trialEndsAt = new Date(tenant.value.trial_ends_at)
      const now = new Date()
      const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      console.log(`🔍 Trial check: ${daysLeft} days left`)
      
      if (daysLeft <= 0) {
        // Trial abgelaufen - zu Upgrade weiterleiten
        console.log('❌ Trial expired, redirecting to upgrade')
        return navigateTo('/upgrade')
      }
    }
  }
})


