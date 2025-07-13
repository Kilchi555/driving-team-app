// middleware/auth-check.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase' // Annahme: Du hast diese Hilfsfunktion
// import { useAuthStore } from '~/stores/auth' // Pinia Store nicht direkt in dieser Middleware verwenden
// import { storeToRefs } from 'pinia' // Auch nicht nötig, wenn direkt supabase.auth genutzt wird
import type { RouteLocationNormalized } from 'vue-router'

export default defineNuxtRouteMiddleware(async (to: RouteLocationNormalized, from: RouteLocationNormalized) => { // <<< WICHTIG: async hinzufügen!
  console.log('🔥 Auth middleware triggered for:', to.path)

  if (process.server) return

  const supabase = getSupabase() // Supabase Client initialisieren

  // Den aktuellen User-Status direkt von Supabase holen
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    console.error('❌ Supabase getUser error in middleware:', error.message)
    // Im Fehlerfall trotzdem umleiten, wenn kein User
    if (!user) {
        console.log('❌ No authenticated user (error in getUser), redirecting to /')
        return navigateTo('/')
    }
  }

  // Wenn kein User gefunden wurde (nach erfolgreichem get-Aufruf oder Fehler mit null-User)
  if (!user) {
    console.log('❌ No authenticated user, redirecting to /')
    // Stelle sicher, dass die Login-Seite nicht geschützt ist, um eine Redirect-Schleife zu vermeiden
    if (to.path !== '/') { // Wenn '/' deine Login-Seite ist
      return navigateTo('/')
    }
    return // Bleibt auf der Login-Seite
  }

  console.log('✅ User authenticated in middleware:', user.email)
  // Hier könntest du jetzt weitere Logik basierend auf der Rolle des Benutzers implementieren
  // Wenn du weiterhin den Pinia Store verwenden möchtest, stelle sicher, dass er hier aktualisiert wird
  // oder die Navigationsentscheidung primär auf der Role-Property des 'user'-Objekts basiert.
  // Beispiel:
  // const authStore = useAuthStore();
  // authStore.setUser(user); // Optional: Pinia Store hier aktualisieren
})