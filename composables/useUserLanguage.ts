// composables/useUserLanguage.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'

export const useUserLanguage = () => {
  const supabase = getSupabase()
  const authStore = useAuthStore()
  
  const userLanguage = ref<string>('de') // Default to German
  
  const loadUserLanguage = async (userId?: string) => {
    try {
      const targetUserId = userId || authStore.user?.id
      if (!targetUserId) {
        userLanguage.value = 'de'
        return 'de'
      }
      
      const { data, error } = await supabase
        .from('users')
        .select('language')
        .eq('id', targetUserId)
        .single()
      
      if (error || !data) {
        console.warn('Could not load user language, defaulting to de:', error)
        userLanguage.value = 'de'
        return 'de'
      }
      
      userLanguage.value = data.language || 'de'
      return data.language || 'de'
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

