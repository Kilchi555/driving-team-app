import { watch } from 'vue'
import { defineNuxtPlugin } from '#imports'

/**
 * Native push: bind listeners, then request OS permission after login.
 * Do not ask on the login screen (Play review). Do ask as soon as a session exists.
 */

export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  const isLoggedIn = () => {
    try {
      return Boolean(useAuthStore().isLoggedIn)
    } catch {
      return false
    }
  }

  const tryRegister = () => {
    void flushPendingPushToken()
    // Never show the OS dialog on the login screen.
    void ensureNativePushRegistration({ request: isLoggedIn() })
  }

  let setupStarted = false
  let iv: number | undefined
  const stopPolling = () => {
    if (iv !== undefined) {
      window.clearInterval(iv)
      iv = undefined
    }
  }

  const setup = async () => {
    if (setupStarted) return
    setupStarted = true
    if (!(await isCapacitorNative())) {
      stopPolling()
      return
    }

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
  }

  void setup()
  // Hosted WebView can inject Capacitor after the first JS tick; cookie
  // login hydrates supabase-js a moment later. Keep trying briefly.
  let attempts = 0
  iv = window.setInterval(() => {
    attempts += 1
    void setup()
    if (isLoggedIn()) tryRegister()
    if (setupStarted && attempts >= 8) stopPolling()
    if (attempts >= 15) stopPolling()
  }, 1000)
})
