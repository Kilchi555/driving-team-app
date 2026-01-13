// composables/useTenantConsistency.ts
// Überwacht und verhindert ungewollte Tenant-Wechsel

import { ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { getSupabase } from '~/utils/supabase'

export const useTenantConsistency = () => {
  // Use the Nuxt Supabase client composable instead of getSupabase
  const supabase = getSupabase()
  const authStore = useAuthStore()
  
  const currentTenantId = ref<string | null>(null)
  const lastKnownTenantId = ref<string | null>(null)
  const tenantSwitchDetected = ref(false)
  const inconsistencyLog = ref<Array<{
    timestamp: string
    event: string
    oldTenantId: string | null
    newTenantId: string | null
    userEmail: string | null
  }>>([])

  // Initialize tenant tracking
  const initializeTenantTracking = () => {
    if (!process.client) return

    // Watch for changes in user profile
    watch(() => authStore.userProfile, (newProfile, oldProfile) => {
      if (!newProfile) {
        currentTenantId.value = null
        return
      }

      const newTenantId = newProfile.tenant_id
      const oldTenantId = oldProfile?.tenant_id

      // Log tenant changes
      if (newTenantId !== oldTenantId) {
        logTenantEvent('tenant_change', oldTenantId, newTenantId, newProfile.email)
        
        // Detect unwanted tenant switches
        if (lastKnownTenantId.value && lastKnownTenantId.value !== newTenantId) {
          tenantSwitchDetected.value = true
          logTenantEvent('unwanted_switch', lastKnownTenantId.value, newTenantId, newProfile.email)
          
          console.error('🚨 UNWANTED TENANT SWITCH DETECTED!', {
            from: lastKnownTenantId.value,
            to: newTenantId,
            user: newProfile.email
          })
          
          // Attempt to restore correct tenant
          attemptTenantRestore(newProfile.email)
        }
      }

      currentTenantId.value = newTenantId
      if (newTenantId) {
        lastKnownTenantId.value = newTenantId
      }
    }, { immediate: true, deep: true })

    // Watch for auth state changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        currentTenantId.value = null
        lastKnownTenantId.value = null
        tenantSwitchDetected.value = false
      }
      
      logTenantEvent(`auth_${event}`, currentTenantId.value, null, session?.user?.email || null)
    })
  }

  // Log tenant-related events
  const logTenantEvent = (
    event: string, 
    oldTenantId: string | null, 
    newTenantId: string | null, 
    userEmail: string | null
  ) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      oldTenantId,
      newTenantId,
      userEmail
    }
    
    inconsistencyLog.value.push(logEntry)
    logger.debug('🏢 Tenant Event:', logEntry)
    
    // Keep only last 50 entries
    if (inconsistencyLog.value.length > 50) {
      inconsistencyLog.value = inconsistencyLog.value.slice(-50)
    }
  }

  // Attempt to restore the correct tenant for a user
  const attemptTenantRestore = async (userEmail: string) => {
    try {
      logger.debug('🔄 Attempting to restore correct tenant for:', userEmail)
      
      // Get session for API call
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('❌ No session for tenant restore')
        return false
      }

      // ✅ Use secure API instead of direct DB query
      const response = await $fetch<{ success: boolean; tenant_id?: string | null }>('/api/user/tenant', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        query: {
          email: userEmail
        }
      })

      if (!response?.success || !response.tenant_id) {
        console.error('❌ Failed to fetch tenant or user has no tenant_id')
        return false
      }

      logger.debug('✅ Correct tenant_id found:', response.tenant_id)
      
      // Force refresh of user profile
      await authStore.fetchUserProfile(authStore.user?.id || '')
      
      logTenantEvent('tenant_restore_attempt', currentTenantId.value, response.tenant_id, userEmail)
      
      return true

    } catch (err) {
      console.error('❌ Error during tenant restore:', err)
      return false
    }
  }

  // Validate current tenant consistency
  const validateTenantConsistency = async (): Promise<boolean> => {
    if (!authStore.userProfile?.email) {
      return true // No user, no inconsistency
    }

    try {
      // Skip validation if user is not authenticated
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        logger.debug('⚠️ No authenticated session, skipping tenant consistency check')
        return true
      }

      // ✅ Use secure API instead of direct DB query
      const response = await $fetch<{ success: boolean; tenant_id?: string | null }>('/api/user/tenant', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        query: {
          email: authStore.userProfile.email
        }
      })

      if (!response?.success) {
        logger.debug('⚠️ Failed to fetch tenant from API, skipping validation')
        return true
      }

      const dbTenantId = response.tenant_id
      const storeTenantId = authStore.userProfile.tenant_id

      if (dbTenantId !== storeTenantId) {
        console.error('🚨 TENANT INCONSISTENCY DETECTED!', {
          database: dbTenantId,
          store: storeTenantId,
          user: authStore.userProfile.email
        })
        
        logTenantEvent('inconsistency_detected', storeTenantId, dbTenantId, authStore.userProfile.email)
        return false
      }

      return true

    } catch (err) {
      console.error('❌ Error validating tenant consistency:', err)
      // Return true to avoid blocking the app on validation errors
      return true
    }
  }

  // Get tenant consistency report
  const getTenantReport = () => {
    return {
      currentTenantId: currentTenantId.value,
      lastKnownTenantId: lastKnownTenantId.value,
      tenantSwitchDetected: tenantSwitchDetected.value,
      inconsistencyLog: inconsistencyLog.value.slice(-10), // Last 10 entries
      userProfile: authStore.userProfile
    }
  }

  // Clear tenant switch detection
  const clearTenantSwitchFlag = () => {
    tenantSwitchDetected.value = false
    logTenantEvent('switch_flag_cleared', currentTenantId.value, null, authStore.userProfile?.email || null)
  }

  return {
    // State
    currentTenantId: readonly(currentTenantId),
    tenantSwitchDetected: readonly(tenantSwitchDetected),
    inconsistencyLog: readonly(inconsistencyLog),

    // Methods
    initializeTenantTracking,
    validateTenantConsistency,
    attemptTenantRestore,
    getTenantReport,
    clearTenantSwitchFlag
  }
}



















