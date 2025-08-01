// composables/useCurrentUser.ts
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'

export const useCurrentUser = () => {
  const currentUser = ref<any>(null)
  const isLoading = ref(false)
  const userError = ref<string | null>(null)
  const profileExists = ref(false) // 🆕 NEU: Profil-Status

  const fetchCurrentUser = async () => {
    // Skip auf Login-Seite
    if (process.client && window.location.pathname === '/') {
      return
    }

    isLoading.value = true
    userError.value = null
    currentUser.value = null
    profileExists.value = false // 🆕 Reset

    try {
      const supabase = getSupabase()
      
      // 1. Auth-User holen
      const { data: authData, error: authError } = await supabase.auth.getUser()
      const user = authData?.user

      if (authError || !user?.email) {
        userError.value = 'Nicht eingeloggt'
        return
      }

      console.log('Auth-User gefunden:', user.email)

      // 2. Database-User per E-Mail suchen
      const { data: usersData, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)

      if (dbError) {
        console.error('Database Error:', dbError)
        userError.value = `Database-Fehler: ${dbError.message}`
        return
      }

      if (!usersData || usersData.length === 0) {
        console.log('Business-User nicht gefunden für:', user.email)
        // 🆕 WICHTIGE ÄNDERUNG: Setze profileExists auf false, aber keinen userError
        profileExists.value = false
        currentUser.value = {
          email: user.email,
          auth_user_id: user.id
        }
        // 🚫 ENTFERNT: userError.value = `Kein Benutzerprofil für ${user.email} gefunden.`
        return
      }

      // ✅ User gefunden
      const userData = usersData[0]
      console.log('✅ Business-User geladen:', userData)
      
      currentUser.value = {
        ...userData,
        auth_user_id: user.id
      }
      profileExists.value = true // 🆕 Profil existiert

    } catch (err: any) {
      console.error('Unerwarteter Fehler:', err)
      userError.value = err?.message || 'Unbekannter Fehler'
    } finally {
      isLoading.value = false
    }
  }

  // 🆕 NEU: Funktion zum Erstellen des User-Profils
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

      console.log('✅ Profil erstellt:', data)
      
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

  return {
    currentUser,
    isLoading,
    userError,
    profileExists, // 🆕 NEU exportiert
    fetchCurrentUser,
    createUserProfile // 🆕 NEU exportiert
  }
}