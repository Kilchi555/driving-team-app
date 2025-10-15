// composables/useFeatureValidation.ts
import { ref } from 'vue'
import { getRequiredFeatureForRoute } from '~/utils/featureFlags'
import { useAuthStore } from '~/stores/auth'

export function useFeatureValidation() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const checkRouteAccess = async (route: string) => {
    isLoading.value = true
    error.value = null

    try {
      // Get required feature for this route
      const requiredFeature = getRequiredFeatureForRoute(route)
      if (!requiredFeature) {
        return { allowed: true, message: 'Route does not require feature flag' }
      }

      const authStore = useAuthStore()
      
      // Wait for auth initialization
      let attempts = 0
      while (!authStore.isInitialized && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      if (!authStore.isLoggedIn || !authStore.hasProfile) {
        return { 
          allowed: false, 
          message: 'User not authenticated',
          redirectTo: '/dashboard'
        }
      }

      // Use features composable for client-side feature checking
      const { useFeatures } = await import('~/composables/useFeatures')
      const { load, isEnabled } = useFeatures()
      
      // Load features for current tenant
      await load()
      
      // Check if feature is enabled
      const featureEnabled = isEnabled(requiredFeature, false)

      return {
        allowed: featureEnabled,
        message: featureEnabled ? `Feature ${requiredFeature} is enabled` : `Feature ${requiredFeature} is disabled`,
        redirectTo: featureEnabled ? null : '/admin'
      }

    } catch (err: any) {
      error.value = err.message
      return { 
        allowed: false, 
        message: `Validation failed: ${err.message}`,
        redirectTo: '/admin'
      }
    } finally {
      isLoading.value = false
    }
  }

  const canAccessRoute = async (route: string) => {
    const result = await checkRouteAccess(route)
    return result.allowed
  }

  const requireFeatureAccess = async (route: string) => {
    const result = await checkRouteAccess(route)
    
    if (!result.allowed) {
      const { navigateTo } = await import('#imports')
      await navigateTo(result.redirectTo || '/admin')
      return false
    }
    
    return true
  }

  return {
    isLoading,
    error,
    checkRouteAccess,
    canAccessRoute,
    requireFeatureAccess
  }
}
