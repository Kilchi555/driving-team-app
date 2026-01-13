// composables/useCurrentUser.ts
// Secure user profile loading via API (10-Layer Protection)
import { ref, computed } from 'vue'
import { toLocalTimeString } from '~/utils/dateUtils'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export const useCurrentUser = () => {
  const currentUser = ref<any>(null)
  const isLoading = ref(false)
  const userError = ref<string | null>(null)
  const profileExists = ref(false)

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

  const fetchCurrentUser = async () => {
    // Skip auf Login-Seite
    if (process.client && window.location.pathname === '/') {
      return
    }

    isLoading.value = true
    userError.value = null
    currentUser.value = null
    profileExists.value = false

    try {
      const token = await getAuthToken()
      
      if (!token) {
        userError.value = 'Nicht eingeloggt'
        return
      }

      // Use secure API instead of direct DB query
      const response = await $fetch<{ success: boolean; user?: any; error?: string }>('/api/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.success || !response.user) {
        userError.value = response.error || 'Profil nicht gefunden'
        return
      }

      const userData = response.user

      if (!userData.profile_exists) {
        // User authenticated but no profile yet
        logger.debug('Business-User nicht gefunden für:', userData.email)
        profileExists.value = false
        currentUser.value = {
          email: userData.email,
          auth_user_id: userData.auth_user_id
        }
        return
      }

      if (!userData.tenant_id) {
        console.warn('⚠️ User nicht zugewiesen:', userData.email)
        userError.value = 'Benutzer nicht zugewiesen'
        return
      }

      logger.debug('✅ Business-User geladen via API:', userData.email)
      currentUser.value = userData
      profileExists.value = true

    } catch (err: any) {
      console.error('Unerwarteter Fehler:', err)
      userError.value = err?.message || 'Unbekannter Fehler'
    } finally {
      isLoading.value = false
    }
  }

  // Funktion zum Erstellen des User-Profils (bleibt mit direkter DB-Interaktion für jetzt)
  // TODO: Migrate to API in future
  const createUserProfile = async (profileData: { company_name: string, role: string }) => {
    isLoading.value = true
    userError.value = null

    try {
      const supabase = getSupabase()
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user

      if (!user?.email) {
        throw new Error('Kein authentifizierter Benutzer')
      }

      // Erstelle neuen User in der Datenbank
      const { data, error } = await supabase
        .from('users')
        .insert({
          email: user.email,
          auth_user_id: user.id,
          company_name: profileData.company_name,
          role: profileData.role,
          is_active: true,
          created_at: toLocalTimeString(new Date)
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      logger.debug('✅ Profil erstellt:', data)
      
      // Update lokaler State
      currentUser.value = {
        ...data,
        auth_user_id: user.id
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
    profileExists,
    isClient,
    isAdmin,
    isStaff,
    fetchCurrentUser,
    createUserProfile
  }
}
