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
  
  // Validate before navigation - wrapped in try/catch to handle router initialization
  try {
    const router = useRouter()
    if (router) {
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
    }
  } catch (err) {
    console.log('⚠️ Router not ready yet for tenant consistency checks')
  }
  
  console.log('✅ Tenant consistency monitoring initialized')
})




