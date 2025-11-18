// plugins/tenant-consistency.client.ts
// Überwacht Tenant-Konsistenz und verhindert ungewollte Tenant-Wechsel

import { defineNuxtPlugin } from '#app'
import { useRouter } from 'vue-router'
import { useTenantConsistency } from "~/composables/useTenantConsistency"

export default defineNuxtPlugin(() => {
  // Only run on client side
  if (!process.client) return

  const { initializeTenantTracking, validateTenantConsistency } = useTenantConsistency()
  
  // Initialize tenant tracking
  initializeTenantTracking()
  
  // Validate tenant consistency every 30 seconds
  setInterval(async () => {
    const isConsistent = await validateTenantConsistency()
    if (!isConsistent) {
      console.warn('🚨 Tenant inconsistency detected during periodic check')
    }
  }, 30000)
  
  // Validate on page focus (when user returns to tab)
  window.addEventListener('focus', async () => {
    console.log('👁️ Page focused, validating tenant consistency')
    await validateTenantConsistency()
  })
  
  // Validate before navigation - wait for router to be ready
  const setupRouterGuard = () => {
    try {
      // Try to get router, but don't throw if not available yet
      let router: any = null
      try {
        router = useRouter()
      } catch (e) {
        // Router composable not available yet
        console.log('⚠️ useRouter() not available yet for tenant consistency, scheduling retry...')
        setTimeout(setupRouterGuard, 100)
        return
      }
      
      if (router && router.beforeEach) {
        router.beforeEach(async (to: any, from: any) => {
          if (to.path.startsWith('/admin')) {
            const isConsistent = await validateTenantConsistency()
            if (!isConsistent) {
              console.error('🚨 Blocking admin navigation due to tenant inconsistency')
              // Could redirect to login or show error
              return false
            }
          }
        })
        console.log('✅ Router guard for tenant consistency registered')
      } else {
        // Router not ready yet, try again later
        setTimeout(setupRouterGuard, 100)
      }
    } catch (err) {
      console.log('⚠️ Error setting up tenant consistency router guard:', err)
      setTimeout(setupRouterGuard, 100)
    }
  }
  
  // Start trying to setup router guard with a slight delay to ensure router is initialized
  setTimeout(setupRouterGuard, 50)
  
  console.log('✅ Tenant consistency monitoring initialized')
})




