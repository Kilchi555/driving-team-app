// stores/auth.ts
import { ref, computed, watch, readonly } from 'vue'
import { defineStore } from 'pinia'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import type { Ref } from 'vue'
import { toLocalTimeString } from '~/utils/dateUtils'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'

// Types
interface UserProfile {
  id: string
  email: string
  role: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  tenant_id: string | null
  is_active: boolean
  preferred_payment_method?: string | null
}

export const useAuthStore = defineStore('authV2', () => {
  // State
  const user = ref<User | null>(null)
  const userProfile = ref<UserProfile | null>(null)
  const userRole = ref<string>('')
  const errorMessage = ref<string | null>(null)
  const loading = ref<boolean>(false)
  const isInitialized = ref<boolean>(false)

  // Computed Properties
const isLoggedIn = computed(() => !!user.value && !!userProfile.value)

const isAdmin = computed(() => {
  const result = userRole.value === 'admin'
  logger.debug('🔍 Auth Store - isAdmin:', result, 'Role:', userRole.value)
  return result
})
  const isStaff = computed(() => userRole.value === 'staff')
  const isClient = computed(() => userRole.value === 'client')
  const isSuperAdmin = computed(() => userRole.value === 'super_admin')
  const hasProfile = computed(() => !!userProfile.value)
  
  const userDisplayName = computed(() => {
    if (!userProfile.value) return 'Unbekannt'
    const first = userProfile.value.first_name || ''
    const last = userProfile.value.last_name || ''
    return `${first} ${last}`.trim() || userProfile.value.email || 'Unbekannt'
  })

  const userInitials = computed(() => {
    if (!userProfile.value) return '??'
    const first = userProfile.value.first_name?.charAt(0)?.toUpperCase() || ''
    const last = userProfile.value.last_name?.charAt(0)?.toUpperCase() || ''
    return first + last || userProfile.value.email?.charAt(0)?.toUpperCase() || '??'
  })

  // Actions

  const initializeAuthStore = async () => {
    logger.debug('🔥 Initializing Auth Store')

    // SECURITY: Session is stored in HTTP-Only cookies
    // We need to ask the server if we have a valid session
    if (process.client) {
      try {
        // Check if we have a valid session via HTTP-Only cookies
        const response = await $fetch('/api/auth/current-user') as any
        
        if (response?.user && !user.value) {
          logger.debug('🔄 Restoring session from HTTP-Only cookie for:', response.user.email)
          user.value = response.user
          
          // If profile was returned, use it directly
          if (response.profile) {
            userProfile.value = response.profile
            userRole.value = response.profile.role || ''
            logger.debug('✅ Profile restored:', response.profile.email)
          } else {
            // Fallback: fetch profile separately
            await fetchUserProfile(response.user.id)
          }
        }
      } catch (error) {
        console.error('❌ Error restoring session from cookies:', error)
      }
    }

    isInitialized.value = true
    logger.debug('✅ Auth Store initialization completed, isInitialized:', isInitialized.value)
  }

  // Restore session from HTTP-Only cookies
  const restoreSession = async () => {
    try {
      logger.debug('🔄 Restoring session from HTTP-Only cookies...')
      
      // Ask the server if we have a valid session (via HTTP-Only cookies)
      const response = await $fetch('/api/auth/current-user') as any
      
      if (response?.user) {
        logger.debug('✅ Session restored for:', response.user.email)
        user.value = response.user
        
        if (response.profile) {
          userProfile.value = response.profile
          userRole.value = response.profile.role || ''
        } else {
          await fetchUserProfile(response.user.id)
        }
        return true
      } else {
        logger.debug('❌ No valid session cookie found')
        return false
      }
    } catch (err: any) {
      console.error('❌ Session restore failed:', err)
      return false
    }
  }

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    loading.value = true
    errorMessage.value = null

    try {
      logger.debug('🔑 Attempting login for:', email, 'Remember Me:', rememberMe)
      
      // Call backend endpoint which handles rate limiting, authentication, and MFA
      const backendResponse = await $fetch('/api/auth/login', {
        method: 'POST',
        body: {
          email: email.toLowerCase().trim(),
          password,
          rememberMe
        }
      }) as any

      if (!backendResponse?.success) {
        throw new Error(backendResponse?.message || 'Login fehlgeschlagen')
      }

      // Check if MFA is required
      if (backendResponse.requiresMFA) {
        logger.debug('🔐 MFA erforderlich für:', backendResponse.email)
        return { requiresMFA: true, email: backendResponse.email }
      }

      // Session tokens are in HTTP-Only cookies (for server API calls)
      // AND returned in response (for client-side Supabase)
        if (backendResponse.user) {
        user.value = {
          id: backendResponse.user.id,
          email: backendResponse.user.email,
          user_metadata: backendResponse.user.user_metadata
        } as any
        
        // Use profile from login response (avoids extra API call)
        if (backendResponse.profile) {
          userProfile.value = backendResponse.profile
          userRole.value = backendResponse.profile.role || ''
          logger.debug('✅ Login successful with profile:', backendResponse.profile.email)
        } else {
          // Fallback: fetch profile via API
          await fetchUserProfile(backendResponse.user.id)
        }
        
        // 🔐 DEBUG: Log what we got from backend
        console.log('🔐 DEBUG backendResponse.session:', backendResponse.session)
        console.log('🔐 DEBUG backendResponse.rememberMe:', backendResponse.rememberMe)
        
        // ✅ KRITISCH: Setze die Supabase Client Session mit den echten Tokens
        logger.debug('🔐 Backend session response:', {
          hasAccessToken: !!backendResponse.session?.access_token,
          hasRefreshToken: !!backendResponse.session?.refresh_token,
          accessTokenLength: backendResponse.session?.access_token?.length || 0
        })
        
        if (backendResponse.session?.access_token && backendResponse.session?.refresh_token) {
          try {
            const supabaseClient = getSupabase()
            if (supabaseClient) {
              // Save to localStorage for token refresh interceptor
              try {
                if (typeof localStorage !== 'undefined') {
                  const sessionData = {
                    access_token: backendResponse.session.access_token,
                    refresh_token: backendResponse.session.refresh_token,
                    timestamp: Date.now()
                  }
                  localStorage.setItem('supabase-session-cache', JSON.stringify(sessionData))
                  logger.debug('💾 Supabase session saved to localStorage')
                }
              } catch (storageErr) {
                logger.warn('⚠️ Failed to save session to localStorage:', storageErr)
              }

              const { error: sessionError } = await supabaseClient.auth.setSession({
                access_token: backendResponse.session.access_token,
                refresh_token: backendResponse.session.refresh_token
              })
              
              if (sessionError) {
                logger.debug('⚠️ Error setting Supabase session:', sessionError)
              } else {
                logger.debug('✅ Supabase client session set successfully')
                
                // Verify session was set
                const { data: verifySession } = await supabaseClient.auth.getSession()
                const { data: verifyUser } = await supabaseClient.auth.getUser()
                logger.debug('🔐 Session verification:', {
                  hasSession: !!verifySession?.session,
                  hasUser: !!verifyUser?.user,
                  userId: verifyUser?.user?.id || 'none'
                })
              }
            }
          } catch (err) {
            logger.debug('⚠️ Could not set Supabase session:', err)
          }
        }
        
        logger.debug('✅ Login successful (session in HTTP-Only cookies + Supabase client)')
        return true
      }

      return false
    } catch (err: any) {
      console.error('❌ Login error:', err.message)
      errorMessage.value = err.message || 'Login fehlgeschlagen.'
      // Re-throw the error so it can be caught by the page component
      throw err
    } finally {
      loading.value = false
    }
  }

  const register = async (email: string, password: string) => {
    loading.value = true
    errorMessage.value = null

    try {
      logger.debug('📝 Attempting registration for:', email)
      
      const supabaseClient = getSupabase()
      if (!supabaseClient) {
        throw new Error('Failed to get Supabase client')
      }
      
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
      })

      if (error) throw error
      logger.debug('✅ Registration successful')
      return true
    } catch (err: any) {
      console.error('❌ Registration error:', err.message)
      errorMessage.value = err.message || 'Registrierung fehlgeschlagen.'
      return false
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    loading.value = true
    errorMessage.value = null

    try {
      logger.debug('🚪 Logging out')
      
      // Save tenant_id and get slug BEFORE clearing auth state
      let tenantSlug: string | null = null
      if (userProfile.value?.tenant_id) {
        try {
          const supabaseClient = getSupabase()
          if (supabaseClient) {
            const { data: tenantData } = await supabaseClient
              .from('tenants')
              .select('slug')
              .eq('id', userProfile.value.tenant_id)
              .single()
            tenantSlug = tenantData?.slug || null
          }
        } catch (slugError) {
          console.warn('⚠️ Could not fetch tenant slug:', slugError)
        }
      }
      
      // Call backend logout API to clear httpOnly cookies
      try {
        await $fetch('/api/auth/logout', { method: 'POST' })
        logger.debug('✅ Backend logout successful (cookies cleared)')
      } catch (logoutError) {
        logger.warn('⚠️ Backend logout failed, continuing with local logout:', logoutError)
      }
      
      const supabaseClient = getSupabase()
      if (!supabaseClient) {
        throw new Error('Failed to get Supabase client')
      }
      
      const { error } = await supabaseClient.auth.signOut()
      if (error) throw error
      
      // Clear session cache from localStorage
      if (process.client) {
        try {
          localStorage.removeItem('app-session-cache')
          logger.debug('🗑️ Session cache cleared from localStorage')
        } catch (err) {
          logger.debug('⚠️ Could not clear session cache:', err)
        }
      }
      
      clearAuthState()
      logger.debug('✅ Logout successful')
      
      // Save tenant slug to localStorage for redirect after logout
      if (process.client && tenantSlug) {
        try {
          localStorage.setItem('last_tenant_slug', tenantSlug)
        } catch (e) {
          console.warn('⚠️ Could not save tenant slug to localStorage:', e)
        }
      }
      
      // Redirect to tenant login page
      if (process.client) {
        const { navigateTo } = await import('#app')
        if (tenantSlug) {
          await navigateTo(`/${tenantSlug}`)
        } else {
          await navigateTo('/login')
        }
      }
    } catch (err: any) {
      console.error('❌ Logout error:', err.message)
      errorMessage.value = err.message || 'Abmeldung fehlgeschlagen.'
      
      // Redirect anyway if we have tenant slug
      if (process.client && userProfile.value?.tenant_id) {
        try {
          const supabaseClient = getSupabase()
          if (supabaseClient) {
            const { data: tenantData } = await supabaseClient
              .from('tenants')
              .select('slug')
              .eq('id', userProfile.value.tenant_id)
              .single()
            const slug = tenantData?.slug || null
            if (slug) {
              const { navigateTo } = await import('#app')
              await navigateTo(`/${slug}`)
            }
          }
        } catch {
          // Ignore errors in fallback redirect
        }
      }
    } finally {
      loading.value = false
    }
  }

  const fetchUserProfile = async (userId: string) => {
    try {
      logger.debug('👤 Fetching user profile via API for:', userId)
      
      // Use API endpoint instead of direct Supabase (tokens are in HTTP-Only cookies)
      const response = await $fetch('/api/auth/current-user') as any
      
      if (response?.profile) {
        userProfile.value = response.profile
        userRole.value = response.profile.role || ''
        
        logger.debug('✅ User profile loaded via API:', {
          role: response.profile.role,
          tenant_id: response.profile.tenant_id,
          email: response.profile.email,
          user_id: response.profile.id
        })
      } else {
        logger.debug('📝 No user profile found via API')
        userProfile.value = null
        userRole.value = ''
      }
    } catch (err: any) {
      console.error('❌ Error fetching user profile:', err.message)
      errorMessage.value = 'Konnte Benutzerprofil nicht laden.'
      userProfile.value = null
      userRole.value = ''
    }
  }

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user.value?.id) return false

    try {
      logger.debug('📝 Updating user profile')
      
      const supabaseClient = getSupabase()
      if (!supabaseClient) {
        throw new Error('Failed to get Supabase client')
      }
      
      const { data, error } = await supabaseClient
        .from('users')
        .update(updates)
        .eq('id', user.value.id)
        .select()
        .single()

      if (error) throw error

      userProfile.value = { ...userProfile.value, ...data } as UserProfile
      userRole.value = data.role || userRole.value
      
      logger.debug('✅ Profile updated')
      return true
    } catch (err: any) {
      console.error('❌ Error updating profile:', err.message)
      errorMessage.value = 'Profil konnte nicht aktualisiert werden.'
      return false
    }
  }

  const createUserProfile = async (profileData: {
    role: string
    first_name?: string
    last_name?: string
    phone?: string
  }) => {
    if (!user.value?.id || !user.value?.email) return false

    try {
      logger.debug('🆕 Creating user profile')
      
      const supabaseClient = getSupabase()
      if (!supabaseClient) {
        throw new Error('Failed to get Supabase client')
      }
      
      const { data, error } = await supabaseClient
        .from('users')
        .insert({
          id: user.value.id,
          email: user.value.email,
          ...profileData,
          is_active: true,
          created_at: toLocalTimeString(new Date)
        })
        .select()
        .single()

      if (error) throw error

      userProfile.value = data
      userRole.value = data.role
      
      logger.debug('✅ Profile created')
      return true
    } catch (err: any) {
      console.error('❌ Error creating profile:', err.message)
      errorMessage.value = 'Profil konnte nicht erstellt werden.'
      return false
    }
  }

  const clearAuthState = () => {
    logger.debug('🧹 Clearing auth state')
    user.value = null
    userProfile.value = null
    userRole.value = ''
    errorMessage.value = null
    loading.value = false // ✅ WICHTIG: Loading zurücksetzen damit Login-Seite nicht hängen bleibt
  }

  const clearError = () => {
    errorMessage.value = null
  }

  // Route Guards
  const requireAuth = () => {
    if (!isLoggedIn.value) {
      throw new Error('Authentication required')
    }
  }

  const requireAdmin = () => {
    requireAuth()
    if (!isAdmin.value && !isStaff.value && !isSuperAdmin.value) {
      throw new Error('Admin access required')
    }
  }

  const requireStaff = () => {
    requireAuth()
    if (!isStaff.value && !isAdmin.value && !isSuperAdmin.value) {
      throw new Error('Staff access required')
    }
  }

  return {
    // State
    user,
    userProfile,
    userRole,
    errorMessage,
    loading,
    isInitialized,

    // Computed
    isLoggedIn,
    isAdmin,
    isStaff,
    isClient,
    isSuperAdmin,
    hasProfile,
    userDisplayName,
    userInitials,

    // Actions
    initializeAuthStore,
    restoreSession,
    login,
    register,
    logout,
    fetchUserProfile,
    updateUserProfile,
    createUserProfile,
    clearAuthState,
    clearError,

    // Guards
    requireAuth,
    requireAdmin,
    requireStaff,

    // Legacy compatibility
    fetchUserRole: (userId: string) => 
      fetchUserProfile(userId)
  }
})