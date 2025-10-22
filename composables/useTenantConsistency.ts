// composables/useTenantConsistency.ts
// Überwacht und verhindert ungewollte Tenant-Wechsel

import { ref, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'

export const useTenantConsistency = () => {
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
    console.log('🏢 Tenant Event:', logEntry)
    
    // Keep only last 50 entries
    if (inconsistencyLog.value.length > 50) {
      inconsistencyLog.value = inconsistencyLog.value.slice(-50)
    }
  }

  // Attempt to restore the correct tenant for a user
  const attemptTenantRestore = async (userEmail: string) => {
    try {
      console.log('🔄 Attempting to restore correct tenant for:', userEmail)
      
      // Get the user's actual tenant_id from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, tenant_id, email, role')
        .eq('email', userEmail)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('❌ Failed to fetch user data for tenant restore:', error)
        return false
      }

      if (!userData.tenant_id) {
        console.error('❌ User has no tenant_id in database')
        return false
      }

      console.log('✅ Correct tenant_id found:', userData.tenant_id)
      
      // Force refresh of user profile
      await authStore.fetchUserProfile(supabase, authStore.user?.id || '')
      
      logTenantEvent('tenant_restore_attempt', currentTenantId.value, userData.tenant_id, userEmail)
      
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
      const { data: userData, error } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('email', authStore.userProfile.email)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('❌ Failed to validate tenant consistency:', error)
        return false
      }

      const dbTenantId = userData.tenant_id
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
      return false
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

















