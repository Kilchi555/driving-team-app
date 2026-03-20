// composables/useShopCheckout.ts
// Centralized shop checkout state management
// Handles customer resolution, validation, and flow

import { ref, computed } from 'vue'
import { logger } from '~/utils/logger'

export interface ShopCustomer {
  id: string
  type: 'guest' | 'login'
  isNew: boolean
  email: string
  firstName: string
  lastName: string
  phone: string
  street: string
  streetNumber: string
  zip: string
  city: string
}

interface ResolutionState {
  customer: ShopCustomer | null
  isResolving: boolean
  error: string | null
  resolvedAt: string | null
}

// Global state (per session)
const resolutionState = ref<ResolutionState>({
  customer: null,
  isResolving: false,
  error: null,
  resolvedAt: null
})

export const useShopCheckout = () => {
  const currentCustomer = computed(() => resolutionState.value.customer)
  const isResolving = computed(() => resolutionState.value.isResolving)
  const resolutionError = computed(() => resolutionState.value.error)
  const hasResolvedCustomer = computed(() => !!resolutionState.value.customer?.id)
  const isNewGuest = computed(() => resolutionState.value.customer?.isNew === true)
  const isLoginAccount = computed(() => resolutionState.value.customer?.type === 'login')

  async function resolveCustomer(tenantId: string, email: string): Promise<ShopCustomer | null> {
    // Debounce: don't resolve twice in short time
    if (resolutionState.value.resolvedAt) {
      const timeSinceLastResolve = Date.now() - new Date(resolutionState.value.resolvedAt).getTime()
      if (timeSinceLastResolve < 2000) {
        logger.debug('⏱️ Skipping resolve (already resolved recently)')
        return resolutionState.value.customer
      }
    }

    resolutionState.value.isResolving = true
    resolutionState.value.error = null

    try {
      const response = await $fetch('/api/shop/resolve-customer', {
        method: 'POST',
        body: {
          tenant_id: tenantId,
          email
        }
      }) as any

      if (!response?.customer) {
        throw new Error('No customer data in response')
      }

      resolutionState.value.customer = response.customer
      resolutionState.value.resolvedAt = new Date().toISOString()

      logger.debug('✅ Customer resolved:', {
        id: response.customer.id,
        type: response.customer.type,
        isNew: response.customer.isNew
      })

      return response.customer
    } catch (err: any) {
      const message = err?.data?.message || err?.message || 'Failed to resolve customer'
      resolutionState.value.error = message
      logger.error('❌ Customer resolution failed:', message)
      throw err
    } finally {
      resolutionState.value.isResolving = false
    }
  }

  function clearResolution() {
    resolutionState.value = {
      customer: null,
      isResolving: false,
      error: null,
      resolvedAt: null
    }
    logger.debug('🔄 Resolution cleared')
  }

  // Reset state for new checkout session
  function resetCheckout() {
    clearResolution()
  }

  return {
    // State
    currentCustomer,
    isResolving,
    resolutionError,
    hasResolvedCustomer,
    isNewGuest,
    isLoginAccount,

    // Methods
    resolveCustomer,
    clearResolution,
    resetCheckout
  }
}
