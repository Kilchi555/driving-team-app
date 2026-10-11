/**
 * useInvoicePaymentSettings
 *
 * Fetches whether the tenant allows customers to choose "Rechnung" (invoice)
 * as a self-service payment method for:
 *   - public course enrollment (course_invoice_payments_enabled)
 *   - public individual appointment booking (individual_appointment_invoice_payments_enabled)
 *
 * Each flag resolves with legacy invoice_payments_enabled fallback when the
 * scoped key is absent. Off / fail CLOSED on error (never show invoice when
 * the server did not confirm enablement).
 */
import { ref, computed, onMounted, type Ref } from 'vue'

export type InvoicePaymentSettingsResponse = {
  invoice_payments_enabled?: boolean
  course_invoice_payments_enabled?: boolean
  individual_appointment_invoice_payments_enabled?: boolean
}

/**
 * @param slug Optional tenant slug (or ref/getter). Pass this on public pages
 *   where the caller may not be authenticated yet (e.g. the guest booking
 *   flow), so the server can resolve the tenant without a login.
 */
export function useInvoicePaymentSettings(slug?: string | Ref<string | undefined | null> | (() => string | undefined | null)) {
  const courseEnabled = ref(false)
  const appointmentEnabled = ref(false)
  const loaded = ref(false)

  function resolveSlug(): string | undefined {
    const value = typeof slug === 'function' ? slug() : (slug && 'value' in slug ? slug.value : slug)
    return value || undefined
  }

  async function load() {
    try {
      const res = await $fetch<InvoicePaymentSettingsResponse>(
        '/api/settings/invoice-payment-settings',
        { query: { slug: resolveSlug() } }
      )
      courseEnabled.value = !!res.course_invoice_payments_enabled
      appointmentEnabled.value = !!res.individual_appointment_invoice_payments_enabled
    } catch {
      // keep default (invoice not offered) if request fails or user isn't authenticated
      courseEnabled.value = false
      appointmentEnabled.value = false
    } finally {
      loaded.value = true
    }
  }

  onMounted(load)

  /** Course enrollment visibility (primary consumer of this composable). */
  const invoiceVisible = computed(() => loaded.value && courseEnabled.value)

  return {
    invoiceVisible,
    /** @deprecated Prefer courseInvoiceEnabled — alias for course scope. */
    invoiceEnabled: courseEnabled,
    courseInvoiceEnabled: courseEnabled,
    appointmentInvoiceEnabled: appointmentEnabled,
    loaded,
    reload: load,
  }
}
