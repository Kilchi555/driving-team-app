// plugins/tenant-consistency.client.ts
// Überwacht Tenant-Konsistenz und verhindert ungewollte Tenant-Wechsel

import { defineNuxtPlugin } from '#app'
import { useTenantConsistency } from "~/composables/useTenantConsistency"

export default defineNuxtPlugin((nuxtApp) => {
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
  
  // Setup router guard using Nuxt hook instead of useRouter
  nuxtApp.hook('app:created', () => {
    const router = nuxtApp.$router
    
    if (router && router.beforeEach) {
      router.beforeEach(async (to: any, from: any) => {
        if (to.path.startsWith('/admin')) {
          const isConsistent = await validateTenantConsistency()
          if (!isConsistent) {
            console.error('🚨 Blocking admin navigation due to tenant inconsistency')
            return false
          }
        }
      })
      console.log('✅ Router guard for tenant consistency registered')
    } else {
      console.warn('⚠️ Router not available in app:created hook')
    }
  })
  
  console.log('✅ Tenant consistency monitoring initialized')
})




