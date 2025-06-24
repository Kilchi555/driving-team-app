// plugins/auth.client.ts
import { defineNuxtPlugin } from '#app'
import { useSupabaseClient, useSupabaseUser } from '#imports' // HIER importieren wir sie, wo es passt
import { useAuthStore } from '~/stores/authV2'

export default defineNuxtPlugin(async () => {
  const authStore = useAuthStore()

  // Rufe useSupabaseClient und useSupabaseUser HIER auf (im Plugin-Kontext)
  const supabaseClient = useSupabaseClient()
  const supabaseUser = useSupabaseUser() // Dies ist ein Ref<User | null>

  console.log('✅ Plugin gestartet – initialisiere Auth...')

  // Rufe die initializeAuthStore-Funktion mit den Clients auf
  await authStore.initializeAuthStore(supabaseClient, supabaseUser)

  // ###############################################################
  // # DIE FOLGENDE ZEILE WURDE ENTFERNT:
  // # authStore.initAuth()
  // ###############################################################

  console.log('✅ Auth-Plugin geladen, User:', authStore.user?.email || 'kein User')
})