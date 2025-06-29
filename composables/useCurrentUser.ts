// composables/useCurrentUser.ts
import { ref, readonly } from 'vue'
import { createClient } from '@supabase/supabase-js'

interface User {
  id: string
  created_at: string
  email: string
  role: string
  first_name: string
  last_name: string
  phone: string | null
  birthdate: string | null
  street: string | null
  street_nr: string | null
  zip: string | null
  city: string | null
  is_active: boolean
  assigned_staff: string | null
  category: string | null
}

const currentUser = ref<User | null>(null)
const isLoading = ref<boolean>(false)

// Supabase Client
const supabaseClient = createClient(
  'https://unyjaetebnaexaflpyoc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWphZXRlYm5hZXhhZmxweW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzOTc0NjAsImV4cCI6MjA2NTk3MzQ2MH0.GH3W1FzpogOG-iTWNv8ckt-TkqboCiB9RYGFlGUzLnU'
)

export const useCurrentUser = () => {
  const fetchCurrentUser = async (): Promise<void> => {
    try {
      isLoading.value = true
      
      // 1. Hole aktuellen Auth-User
      const { data: authData, error: authError } = await supabaseClient.auth.getUser()
      
      if (authError || !authData.user) {
        console.log('Kein eingeloggter User:', authError?.message)
        currentUser.value = null
        return
      }

      console.log('Auth User gefunden:', authData.user.email)

      // 2. Hole User-Details aus der users Tabelle
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', authData.user.email)
        .single() // 👈 Das ist wichtig!

      if (userError) {
        console.error('Fehler beim Laden der User-Daten:', userError.message)
        
        // Prüfe ob User in DB existiert
        const { data: allUsers } = await supabaseClient
          .from('users')
          .select('email, first_name, last_name')
          .eq('email', authData.user.email)
        
        console.log('Users gefunden:', allUsers)
        
        if (!allUsers || allUsers.length === 0) {
          console.error('User nicht in users Tabelle gefunden!')
          // Hier könntest du den User automatisch erstellen
          throw new Error(`User ${authData.user.email} nicht in Datenbank gefunden`)
        }
        
        throw userError
      }

      currentUser.value = userData as User
      console.log('✅ User-Daten geladen:', currentUser.value)

    } catch (error: any) {
      console.error('❌ Fehler beim Laden des Users:', error.message || error)
      currentUser.value = null
    } finally {
      isLoading.value = false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabaseClient.auth.signOut()
      if (error) throw error
      
      currentUser.value = null
      console.log('✅ User ausgeloggt')
    } catch (error: any) {
      console.error('❌ Logout-Fehler:', error.message)
    }
  }

  return {
    currentUser: readonly(currentUser),
    isLoading: readonly(isLoading),
    fetchCurrentUser,
    logout
  }
}