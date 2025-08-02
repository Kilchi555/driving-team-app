// plugins/auth-restore.client.ts
import { defineNuxtPlugin } from '#app'
import { useAuthStore } from '~/stores/auth'
import { getSupabase } from '~/utils/supabase'

export default defineNuxtPlugin(async () => {
  // Nur im Browser
  if (!process.client) return

  const supabase = getSupabase() // ← Verwende getSupabase() statt $supabase
  const authStore = useAuthStore()

  console.log('🔄 Auth restore plugin starting...')

  try {
    // Prüfe sofort ob Session existiert
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (session?.user && !authStore.isLoggedIn) {
      console.log('🔄 Restoring session for:', session.user.email)
      
      // Setze User direkt
      authStore.user = session.user
      
      // Lade User-Profil
      await authStore.fetchUserProfile(supabase, session.user.id)
      
      console.log('✅ Session restored in plugin, role:', authStore.userRole)
    }
    
  } catch (err: any) {
    console.error('❌ Auth restore error:', err)
  }
})