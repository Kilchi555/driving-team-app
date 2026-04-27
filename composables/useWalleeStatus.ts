// composables/useWalleeStatus.ts
// Singleton composable that returns whether Wallee online payments are enabled for the current tenant.
//
// Priority:
//   1. currentTenant.wallee_enabled (from useTenant / branding endpoint) — available in shop & public flows
//   2. Fetch from /api/tenants/wallee-onboarding-status — for admin/customer pages (auth required)
//
// Result is cached globally with useState so only one fetch per page load.

import { computed, watch, readonly } from 'vue'
import { useState, useNuxtApp } from '#app'
import { useTenant } from '~/composables/useTenant'

export const useWalleeStatus = () => {
  // Global singletons — one value per SSR context / client navigation
  const walleeEnabled = useState<boolean>('wallee_enabled_status', () => true)
  const walleeStatusLoaded = useState<boolean>('wallee_status_loaded', () => false)

  const { currentTenant } = useTenant()

  // If tenant branding is already loaded (shop / public flow), derive from it immediately
  watch(
    () => (currentTenant.value as any)?.wallee_enabled,
    (val) => {
      if (val !== undefined && val !== null) {
        walleeEnabled.value = val as boolean
        walleeStatusLoaded.value = true
      }
    },
    { immediate: true },
  )

  // For auth-required pages (admin, customer), fetch from the onboarding-status endpoint
  const loadWalleeStatus = async () => {
    if (walleeStatusLoaded.value) return
    try {
      const data = await $fetch<{ enabled: boolean }>('/api/tenants/wallee-onboarding-status')
      walleeEnabled.value = data.enabled
      walleeStatusLoaded.value = true
    } catch {
      // Non-fatal: keep default (true = show buttons; server will block anyway)
    }
  }

  return {
    walleeEnabled: readonly(walleeEnabled),
    walleeStatusLoaded: readonly(walleeStatusLoaded),
    loadWalleeStatus,
  }
}
