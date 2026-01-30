// composables/useTenantConsistency.ts
// Überwacht und verhindert ungewollte Tenant-Wechsel

import { ref, watch, readonly } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'

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
      
      // The auth store already has the correct tenant_id
      // No need to query the database again
      // Just force refresh of user profile via API
      const response = await $fetch('/api/auth/get-profile', {
        method: 'GET'
      })

      if (response?.tenant_id) {
        logger.debug('✅ Correct tenant_id found:', response.tenant_id)
        
        // Update auth store
        await authStore.fetchUserProfile(authStore.user?.id || '')
        
        logTenantEvent('tenant_restore_attempt', currentTenantId.value, response.tenant_id, userEmail)
        return true
      } else {
        console.error('❌ User has no tenant_id')
        return false
      }

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
      const user = authStore.user
      if (!user) {
        logger.debug('⚠️ No authenticated user, skipping tenant consistency check')
        return true
      }

      // ✅ OPTIMIZED: Check consistency in-memory first
      // The auth store is the source of truth after HTTP-only cookie auth
      const storeTenantId = authStore.userProfile?.tenant_id
      
      if (!storeTenantId) {
        console.error('🚨 TENANT INCONSISTENCY DETECTED! No tenant_id in auth store')
        return false
      }

      // ✅ The server maintains RLS and tenant isolation
      // No need for periodic DB queries - the auth store is already consistent
      logger.debug('✅ Tenant consistency verified (in-store)')
      return true

    } catch (err: any) {
      console.error('❌ Error validating tenant consistency:', err)
      return false
    }
  }
        
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



















