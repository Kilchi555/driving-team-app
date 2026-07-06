/**
 * useCashPaymentSettings
 *
 * Fetches cash payment settings on each component mount (no stale cache).
 * Pass the caller role to get the correct visibility:
 *   - 'staff'    → visible when cash_payments_enabled (regardless of visibility setting)
 *   - 'customer' → visible only when cash_payments_enabled AND visibility = 'customers_and_staff'
 */
import { ref, computed, onMounted } from 'vue'

export function useCashPaymentSettings(role: 'staff' | 'customer' = 'staff') {
  const enabled = ref(true)
  const visibility = ref<'staff_only' | 'customers_and_staff'>('staff_only')
  const loaded = ref(false)

  async function load() {
    try {
      const res = await $fetch<{ cash_payments_enabled: boolean; cash_payment_visibility: string }>(
        '/api/settings/cash-payment-settings'
      )
      enabled.value = res.cash_payments_enabled
      visibility.value = (res.cash_payment_visibility as any) ?? 'staff_only'
    } catch {
      // keep defaults (cash visible for staff) if request fails
    } finally {
      loaded.value = true
    }
  }

  onMounted(load)

  const cashVisible = computed(() => {
    if (!loaded.value) return false // hide until we know the setting
    if (!enabled.value) return false
    if (role === 'customer') return visibility.value === 'customers_and_staff'
    return true
  })

  return { cashVisible, cashEnabled: enabled, cashVisibility: visibility }
}
