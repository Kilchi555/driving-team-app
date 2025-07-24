// stores/auth.ts
import { ref, computed, watch, readonly } from 'vue'
import { defineStore } from 'pinia'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import type { Ref } from 'vue'

// Types
interface UserProfile {
  id: string
  email: string
  role: string
  first_name: string | null
  last_name: string | null
  phone: string | null
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
  console.log('🔍 Auth Store - isAdmin:', result, 'Role:', userRole.value)
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

  const initializeAuthStore = (
    supabaseClient: SupabaseClient,
    supabaseUserRef: Ref<User | null>
  ) => {
    console.log('🔥 Initializing Auth Store')
    
    // Setze den initialen Benutzerwert
    user.value = supabaseUserRef.value

    // Auth State Change Listener
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, !!session)
      
      if (session?.user) {
        user.value = session.user
        await fetchUserProfile(supabaseClient, session.user.id)
      } else {
        clearAuthState()
      }
    })

    // Watcher für Supabase User
    if (process.client) {
      watch(supabaseUserRef, async (newUser) => {
        console.log('👤 User ref changed:', !!newUser)
        user.value = newUser
        
        if (newUser) {
          await fetchUserProfile(supabaseClient, newUser.id)
        } else {
          clearAuthState()
        }
      }, { immediate: true })
    }

    isInitialized.value = true
      console.log('✅ Auth Store initialization completed, isInitialized:', isInitialized.value)

  }

  const login = async (email: string, password: string, supabaseClient: SupabaseClient) => {
    loading.value = true
    errorMessage.value = null

    try {
      console.log('🔑 Attempting login for:', email)
      
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        user.value = data.user
        await fetchUserProfile(supabaseClient, data.user.id)
        console.log('✅ Login successful')
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

  const register = async (email: string, password: string, supabaseClient: SupabaseClient) => {
    loading.value = true
    errorMessage.value = null

    try {
      console.log('📝 Attempting registration for:', email)
      
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
      })

      if (error) throw error
      console.log('✅ Registration successful')
      return true
    } catch (err: any) {
      console.error('❌ Registration error:', err.message)
      errorMessage.value = err.message || 'Registrierung fehlgeschlagen.'
      return false
    } finally {
      loading.value = false
    }
  }

  const logout = async (supabaseClient: SupabaseClient) => {
    loading.value = true
    errorMessage.value = null

    try {
      console.log('🚪 Logging out')
      
      const { error } = await supabaseClient.auth.signOut()
      if (error) throw error
      
      clearAuthState()
      console.log('✅ Logout successful')
    } catch (err: any) {
      console.error('❌ Logout error:', err.message)
      errorMessage.value = err.message || 'Abmeldung fehlgeschlagen.'
    } finally {
      loading.value = false
    }
  }

  const fetchUserProfile = async (supabaseClient: SupabaseClient, userId: string) => {
    try {
      console.log('👤 Fetching user profile for:', userId)
      
      const { data, error } = await supabaseClient
        .from('users')
        .select(`
          id,
          email,
          role,
          first_name,
          last_name,
          phone,
          is_active,
          preferred_payment_method
        `)
        .eq('id', userId)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('📝 No user profile found, needs setup')
          userProfile.value = null
          userRole.value = ''
          return
        }
        throw error
      }

      userProfile.value = data
      userRole.value = data.role || ''
      
      console.log('✅ User profile loaded:', data.role)
    } catch (err: any) {
      console.error('❌ Error fetching user profile:', err.message)
      errorMessage.value = 'Konnte Benutzerprofil nicht laden.'
      userProfile.value = null
      userRole.value = ''
    }
  }

  const updateUserProfile = async (supabaseClient: SupabaseClient, updates: Partial<UserProfile>) => {
    if (!user.value?.id) return false

    try {
      console.log('📝 Updating user profile')
      
      const { data, error } = await supabaseClient
        .from('users')
        .update(updates)
        .eq('id', user.value.id)
        .select()
        .single()

      if (error) throw error

      userProfile.value = { ...userProfile.value, ...data } as UserProfile
      userRole.value = data.role || userRole.value
      
      console.log('✅ Profile updated')
      return true
    } catch (err: any) {
      console.error('❌ Error updating profile:', err.message)
      errorMessage.value = 'Profil konnte nicht aktualisiert werden.'
      return false
    }
  }

  const createUserProfile = async (supabaseClient: SupabaseClient, profileData: {
    role: string
    first_name?: string
    last_name?: string
    phone?: string
  }) => {
    if (!user.value?.id || !user.value?.email) return false

    try {
      console.log('🆕 Creating user profile')
      
      const { data, error } = await supabaseClient
        .from('users')
        .insert({
          id: user.value.id,
          email: user.value.email,
          ...profileData,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      userProfile.value = data
      userRole.value = data.role
      
      console.log('✅ Profile created')
      return true
    } catch (err: any) {
      console.error('❌ Error creating profile:', err.message)
      errorMessage.value = 'Profil konnte nicht erstellt werden.'
      return false
    }
  }

  const clearAuthState = () => {
    console.log('🧹 Clearing auth state')
    user.value = null
    userProfile.value = null
    userRole.value = ''
    errorMessage.value = null
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
    fetchUserRole: (supabaseClient: SupabaseClient, userId: string) => 
      fetchUserProfile(supabaseClient, userId)
  }
})