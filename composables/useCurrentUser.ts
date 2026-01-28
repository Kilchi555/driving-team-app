// composables/useCurrentUser.ts
// Uses API endpoint to get current user (tokens are in HTTP-Only cookies)
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { logger } from '~/utils/logger'

export const useCurrentUser = () => {
  const currentUser = ref<any>(null)
  const isLoading = ref(false)
  const userError = ref<string | null>(null)
  const profileExists = ref(false)

  const fetchCurrentUser = async () => {
    // Skip on login page
    if (process.client && window.location.pathname === '/') {
      return
    }

    isLoading.value = true
    userError.value = null
    currentUser.value = null
    profileExists.value = false

    try {
      // First check auth store (might already have the user from login)
      const authStore = useAuthStore()
      if (authStore.userProfile) {
        logger.debug('✅ User from auth store:', authStore.userProfile.email)
        currentUser.value = {
          ...authStore.userProfile,
          auth_user_id: authStore.user?.id
        }
        profileExists.value = true
        return
      }

      // Fallback: fetch from API (uses HTTP-Only cookies)
      const response = await $fetch('/api/auth/current-user') as any
      
      if (!response?.user) {
        userError.value = 'Nicht eingeloggt'
        return
      }

      logger.debug('Auth-User gefunden via API:', response.user.email)

      if (!response.profile) {
        logger.debug('Business-User nicht gefunden für:', response.user.email)
        profileExists.value = false
        currentUser.value = {
          email: response.user.email,
          auth_user_id: response.user.id
        }
        return
      }

      // User found
      const userData = response.profile
      logger.debug('✅ Business-User geladen via API:', userData.email)
      
      if (!userData.tenant_id) {
        console.warn('⚠️ User nicht zugewiesen:', userData.email)
        userError.value = 'Benutzer nicht zugewiesen'
        return
      }
      
      currentUser.value = {
        ...userData,
        auth_user_id: response.user.id
      }
      profileExists.value = true

    } catch (err: any) {
      console.error('Unerwarteter Fehler:', err)
      userError.value = err?.message || 'Unbekannter Fehler'
    } finally {
      isLoading.value = false
    }
  }

  // Create user profile via API
  const createUserProfile = async (profileData: { company_name: string, role: string }) => {
    isLoading.value = true
    userError.value = null

    try {
      // Get current user from API (uses HTTP-Only cookies)
      const userResponse = await $fetch('/api/auth/current-user') as any
      
      if (!userResponse?.user?.email) {
        throw new Error('Kein authentifizierter Benutzer')
      }

      // Create profile via API endpoint
      const data = await $fetch('/api/users/create-profile', {
        method: 'POST',
        body: {
          company_name: profileData.company_name,
          role: profileData.role
        }
      }) as any

      logger.debug('✅ Profil erstellt:', data)
      
      // Update local state
      currentUser.value = {
        ...data,
        auth_user_id: userResponse.user.id
      }
      profileExists.value = true

      return data

    } catch (err: any) {
      console.error('Fehler beim Erstellen des Profils:', err)
      userError.value = err?.message || 'Fehler beim Erstellen des Profils'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Computed properties
  const isClient = computed(() => currentUser.value?.role === 'client')
  const isAdmin = computed(() => currentUser.value?.role === 'admin')
  const isStaff = computed(() => currentUser.value?.role === 'staff')

  return {
    currentUser,
    isLoading,
    userError,
    profileExists, // 🆕 NEU exportiert
    isClient,
    isAdmin,
    isStaff,
    fetchCurrentUser,
    createUserProfile // 🆕 NEU exportiert
  }
}