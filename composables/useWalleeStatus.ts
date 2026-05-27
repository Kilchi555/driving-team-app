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
  // Global singletons — one value per SSR context / client navigation.
  //
  // SECURITY: We default to `false` so that any UI which conditionally
  // renders online-payment affordances stays hidden until the tenant's
  // Wallee status has been confirmed. This avoids a window where buttons
  // are shown to users even though the server would reject the payment.
  // Pages that explicitly know Wallee is enabled (e.g. the public course
  // page, which receives `wallee_enabled` via the branding endpoint) flip
  // this on via the watcher below.
  const walleeEnabled = useState<boolean>('wallee_enabled_status', () => false)
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
      // Non-fatal: keep default (false). Affordances stay hidden so users
      // never see online-payment buttons that would fail server-side.
    }
  }

  return {
    walleeEnabled: readonly(walleeEnabled),
    walleeStatusLoaded: readonly(walleeStatusLoaded),
    loadWalleeStatus,
  }
}
