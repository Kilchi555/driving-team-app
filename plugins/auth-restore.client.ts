// plugins/auth-restore.client.ts
import { defineNuxtPlugin } from '#app'
import { useAuthStore } from '~/stores/auth'
import { getSupabase } from '~/utils/supabase'

export default defineNuxtPlugin(async () => {
  // Nur im Browser
  if (!process.client) return

  console.log('🔄 Auth restore plugin starting...')

  try {
    const supabase = getSupabase()
    const authStore = useAuthStore()

    console.log('🔄 Getting session...')
    
    // Prüfe sofort ob Session existiert
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Session error:', error)
    }
    
    if (session?.user) {
      console.log('🔄 Session found for:', session.user.email)
      
      // Setze User direkt
      authStore.user = session.user
      
      // Lade User-Profil
      await authStore.fetchUserProfile(supabase, session.user.id)
      
      console.log('✅ Session restored in plugin, role:', authStore.userRole)
    } else {
      console.log('🔄 No session found')
    }
    
  } catch (err: any) {
    console.error('❌ Auth restore error:', err)
  } finally {
    // Setze isInitialized auf true, egal was passiert ist
    const authStore = useAuthStore()
    authStore.isInitialized = true
    console.log('✅ Auth store initialized (forced)')
  }
})