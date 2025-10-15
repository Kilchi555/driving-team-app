// middleware/features.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { getRequiredFeatureForRoute } from '~/utils/featureFlags'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // Skip auf Server
  if (process.server) return
  
  // Skip if not in admin area
  if (!to.path.startsWith('/admin/')) return
  
  // Get required feature for this route
  const requiredFeature = getRequiredFeatureForRoute(to.path)
  if (!requiredFeature) return // Route doesn't require feature flag
  
  try {
    // Get tenant ID from auth store
    const { useAuthStore } = await import('~/stores/auth')
    const authStore = useAuthStore()
    
    // Wait for auth initialization
    let attempts = 0
    while (!authStore.isInitialized && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    // Check if user is authenticated and has profile
    if (!authStore.isLoggedIn || !authStore.hasProfile) {
      console.log('Feature middleware: User not authenticated')
      return navigateTo('/dashboard')
    }
    
    // Use features composable for client-side feature checking
    const { useFeatures } = await import('~/composables/useFeatures')
    const { load, isEnabled } = useFeatures()
    
    // Load features for current tenant
    await load()
    
    // Check if feature is enabled
    const featureEnabled = isEnabled(requiredFeature, false)
    
    if (!featureEnabled) {
      console.log(`Feature middleware: Feature ${requiredFeature} disabled for route ${to.path}`)
      
      // Show error message and redirect to admin dashboard
      const { useUIStore } = await import('~/stores/ui')
      const uiStore = useUIStore()
      uiStore.showError('Zugriff verweigert', `Die Funktion "${requiredFeature}" ist aktuell deaktiviert.`)
      
      return navigateTo('/admin')
    }
    
    console.log(`Feature middleware: Access granted for route ${to.path} (feature: ${requiredFeature})`)
    
  } catch (error) {
    console.error('Feature middleware error:', error)
    // On error, allow access but log the issue
    console.warn('Feature middleware: Allowing access due to error')
  }
})
