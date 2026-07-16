/**
 * useInvoicePaymentSettings
 *
 * Fetches whether the tenant allows customers to choose "Rechnung" (invoice)
 * as a self-service payment method (online lesson booking + course
 * enrollment). Off by default — this mirrors useCashPaymentSettings but
 * fails CLOSED (not visible) on error/no-auth, since showing an invoice
 * option that isn't actually admin-enabled would let a customer avoid
 * paying online.
 */
import { ref, computed, onMounted, type Ref } from 'vue'

/**
 * @param slug Optional tenant slug (or ref/getter). Pass this on public pages
 *   where the caller may not be authenticated yet (e.g. the guest booking
 *   flow), so the server can resolve the tenant without a login.
 */
export function useInvoicePaymentSettings(slug?: string | Ref<string | undefined | null> | (() => string | undefined | null)) {
  const enabled = ref(false)
  const loaded = ref(false)

  function resolveSlug(): string | undefined {
    const value = typeof slug === 'function' ? slug() : (slug && 'value' in slug ? slug.value : slug)
    return value || undefined
  }

  async function load() {
    try {
      const res = await $fetch<{ invoice_payments_enabled: boolean }>(
        '/api/settings/invoice-payment-settings',
        { query: { slug: resolveSlug() } }
      )
      enabled.value = !!res.invoice_payments_enabled
    } catch {
      // keep default (invoice not offered) if request fails or user isn't authenticated
      enabled.value = false
    } finally {
      loaded.value = true
    }
  }

  onMounted(load)

  const invoiceVisible = computed(() => loaded.value && enabled.value)

  return { invoiceVisible, invoiceEnabled: enabled, reload: load }
}
