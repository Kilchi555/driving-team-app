// plugins/tenant-consistency.client.ts
// Überwacht Tenant-Konsistenz und verhindert ungewollte Tenant-Wechsel

import { defineNuxtPlugin } from '#app'
import { useTenantConsistency } from "~/composables/useTenantConsistency"
import { logger } from '~/utils/logger'

export default defineNuxtPlugin((nuxtApp) => {
  // Only run on client side
  if (!process.client) return

  const { initializeTenantTracking, validateTenantConsistency } = useTenantConsistency()
  
  // Initialize tenant tracking
  initializeTenantTracking()
  
  // ✅ OPTIMIZED: Removed periodic checks (every 30s)
  // The auth store is the source of truth and is kept consistent by the server
  // RLS policies enforce tenant isolation on the backend
  
  // Validate on page focus (when user returns to tab)
  if (process.client) {
    window.addEventListener('focus', async () => {
      logger.debug('👁️ Page focused, validating tenant consistency')
      await validateTenantConsistency()
    })
  }
  
  // Setup router guard using app:mounted hook when router is ready
  if (process.client) {
    nuxtApp.hook('app:mounted', () => {
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
        logger.debug('✅ Router guard for tenant consistency registered')
      } else {
        console.warn('⚠️ Router not available in app:mounted hook')
      }
    })
  }
  
  logger.debug('✅ Tenant consistency monitoring initialized (optimized)')
})




