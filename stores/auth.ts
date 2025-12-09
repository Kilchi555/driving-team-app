// stores/auth.ts
import { ref, computed, watch, readonly } from 'vue'
import { defineStore } from 'pinia'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import type { Ref } from 'vue'
import { toLocalTimeString } from '~/utils/dateUtils'
import { getSupabase } from '~/utils/supabase'

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

    // Get Supabase client
    const supabaseClient = getSupabase()
    if (!supabaseClient) {
      console.error('❌ Failed to get Supabase client')
      return
    }

    // ✅ NEU: Session beim Start wiederherstellen
    if (process.client) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session?.user && !user.value) {
          logger.debug('🔄 Restoring session for:', session.user.email)
          user.value = session.user
          await fetchUserProfile(session.user.id)
        }
      } catch (error) {
        console.error('❌ Error restoring session:', error)
      }
    }

    // Auth State Change Listener
    supabaseClient.auth.onAuthStateChange(async (event: any, session: any) => {
      logger.debug('🔄 Auth state changed:', event, !!session)
      
      if (session?.user) {
        user.value = session.user
        await fetchUserProfile(session.user.id)
      } else {
        clearAuthState()
      }
    })

    isInitialized.value = true
      logger.debug('✅ Auth Store initialization completed, isInitialized:', isInitialized.value)

  }

  // stores/auth.ts - nach Zeile wo initializeAuthStore steht
    const restoreSession = async () => {
      try {
        logger.debug('🔄 Restoring session...')
        
        const supabaseClient = getSupabase()
        if (!supabaseClient) {
          console.error('❌ Failed to get Supabase client')
          return false
        }
        
        const { data: { session }, error } = await supabaseClient.auth.getSession()
        
        if (error) {
          console.error('❌ Session restore error:', error)
          return false
        }
        
        if (session?.user) {
          logger.debug('✅ Session restored for:', session.user.email)
          user.value = session.user
          await fetchUserProfile(session.user.id)
          return true
        } else {
          logger.debug('❌ No session found to restore')
          return false
        }
      } catch (err: any) {
        console.error('❌ Session restore failed:', err)
        return false
      }
    }

  const login = async (email: string, password: string) => {
    loading.value = true
    errorMessage.value = null

    try {
      logger.debug('🔑 Attempting login for:', email)
      
      const supabaseClient = getSupabase()
      if (!supabaseClient) {
        throw new Error('Failed to get Supabase client')
      }
      
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        user.value = data.user
        await fetchUserProfile(data.user.id)
        logger.debug('✅ Login successful')
        return true
      }

      return false
    } catch (err: any) {
      console.error('❌ Login error:', err.message)
      errorMessage.value = err.message || 'Login fehlgeschlagen.'
      return false
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
      
      const supabaseClient = getSupabase()
      if (!supabaseClient) {
        throw new Error('Failed to get Supabase client')
      }
      
      const { error } = await supabaseClient.auth.signOut()
      if (error) throw error
      
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
      logger.debug('👤 Fetching user profile for:', userId)
      
      const supabaseClient = getSupabase()
      if (!supabaseClient) {
        console.error('❌ Failed to get Supabase client')
        return
      }
      
      const { data, error } = await supabaseClient
        .from('users')
        .select(`
          id,
          auth_user_id,
          email,
          role,
          first_name,
          last_name,
          phone,
          tenant_id,
          is_active,
          preferred_payment_method
        `)
        .eq('auth_user_id', userId) 
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          logger.debug('📝 No user profile found, needs setup')
          userProfile.value = null
          userRole.value = ''
          return
        }
        throw error
      }

      userProfile.value = data
      userRole.value = data.role || ''
      
      logger.debug('✅ User profile loaded:', {
        role: data.role,
        tenant_id: data.tenant_id,
        email: data.email,
        user_id: data.id
      })
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
    if (!isAdmin.value && !isStaff.value) {
      throw new Error('Admin access required')
    }
  }

  const requireStaff = () => {
    requireAuth()
    if (!isStaff.value && !isAdmin.value) {
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