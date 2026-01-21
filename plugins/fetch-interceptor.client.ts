/**
 * Global fetch interceptor for handling API errors
 * Automatically logs out users when session expires (401 Unauthorized)
 */

export default defineNuxtPlugin((nuxtApp) => {
  const authStore = useAuthStore()

  // Hook into $fetch to intercept responses
  nuxtApp.$fetch = $fetch.create({
    onError: async (error: any) => {
      const status = error.response?.status || error.status
      
      console.log('🔍 Fetch error intercepted:', { status, message: error.message })

      // Handle 401 - Session expired or invalid token
      if (status === 401) {
        console.warn('⚠️ Session expired (401 Unauthorized) - Logging out user')
        
        // Clear auth store
        authStore.logout()
        
        // Clear any stored session data
        try {
          const supabase = getSupabase()
          await supabase.auth.signOut()
        } catch (err) {
          console.error('Error signing out from Supabase:', err)
        }
        
        // Redirect to login
        await navigateTo('/login')
      }
    }
  })
})


