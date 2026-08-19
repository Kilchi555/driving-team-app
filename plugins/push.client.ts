import { watch } from 'vue'
import { defineNuxtPlugin } from '#imports'

/**
 * Native push: bind listeners, then request OS permission after login.
 * Do not ask on the login screen (Play review). Do ask as soon as a session exists.
 */

export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const tryRegister = () => {
    void ensureNativePushRegistration({ request: true })
  }

  void (async () => {
    if (!(await isCapacitorNative())) return

    try {
      const { getSupabase } = await import('~/utils/supabase')
      const supabase = getSupabase()

      const { data: { session } } = await supabase.auth.getSession()
      if (session) tryRegister()

      supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (nextSession) tryRegister()
      })

      const authStore = useAuthStore()
      watch(
        () => authStore.isLoggedIn,
        (loggedIn) => {
          if (loggedIn) tryRegister()
        },
        { immediate: true },
      )
    } catch (e) {
      console.warn('[Push] Setup failed:', e)
    }
  })()
})
