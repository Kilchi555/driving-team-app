/**
 * Global fetch interceptor for handling API errors
 * Automatically logs out users when session expires (401 Unauthorized)
 */

export default defineNuxtPlugin((nuxtApp) => {
  const authStore = useAuthStore()

  // Intercept all $fetch calls
  $fetch.create({
    onError: async (error) => {
      const status = error.response?.status

      // Handle 401 - Session expired or invalid token
      if (status === 401) {
        console.warn('⚠️ Session expired (401 Unauthorized) - Logging out user')
        
        // Clear auth store
        authStore.logout()
        
        // Clear any stored session data
        const supabase = getSupabase()
        await supabase.auth.signOut()
        
        // Redirect to login
        await navigateTo('/login')
      }
    }
  })
})

