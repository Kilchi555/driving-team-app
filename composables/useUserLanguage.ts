// composables/useUserLanguage.ts
// Secure language loading via API (10-Layer Protection)
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'

export const useUserLanguage = () => {
  const authStore = useAuthStore()
  
  const userLanguage = ref<string>('de') // Default to German
  
  // Helper to get auth token
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch {
      return null
    }
  }
  
  const loadUserLanguage = async (userId?: string) => {
    try {
      // If no userId provided, try to get from auth
      if (!userId && !authStore.user?.id) {
        userLanguage.value = 'de'
        return 'de'
      }
      
      const token = await getAuthToken()
      
      if (!token) {
        userLanguage.value = 'de'
        return 'de'
      }
      
      // Use secure API instead of direct DB query
      const response = await $fetch<{ success: boolean; user?: any }>('/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.success || !response.user) {
        console.warn('Could not load user profile for language, defaulting to de')
        userLanguage.value = 'de'
        return 'de'
      }
      
      userLanguage.value = response.user.language || 'de'
      return response.user.language || 'de'
    } catch (err) {
      console.error('Error loading user language:', err)
      userLanguage.value = 'de'
      return 'de'
    }
  }
  
  return {
    userLanguage: computed(() => userLanguage.value),
    loadUserLanguage
  }
}
