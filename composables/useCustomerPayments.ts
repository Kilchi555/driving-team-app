// composables/useCustomerPayments.ts
import { ref, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'
import { logger } from '~/utils/logger'

export const useCustomerPayments = () => {
  const authStore = useAuthStore()
  const { user: currentUser } = storeToRefs(authStore)

  const payments = ref<any[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  // ✅ Exclude payments for pending_confirmation and cancelled appointments (these are handled separately)
  const pendingPayments = computed(() => {
    return payments.value.filter(p => {
      // Nur Payments mit status 'pending' berücksichtigen
      if (p.payment_status !== 'pending') return false
      
      // ✅ WICHTIG: Exclude payments für pending_confirmation Appointments
      // Diese werden im Bestätigungs-Banner angezeigt, nicht als "offene Zahlung"
      const appointment = Array.isArray(p.appointments) ? p.appointments[0] : p.appointments
      if (appointment && appointment.status === 'pending_confirmation') {
        return false // Nicht als "offene Zahlung" anzeigen
      }
      
      // ✅ WICHTIG: Exclude payments für cancelled Appointments
      // Diese sollten nicht als "offene Zahlung" angezeigt werden
      if (appointment && appointment.status === 'cancelled') {
        return false // Nicht als "offene Zahlung" anzeigen
      }
      
      return true
    })
  })

  // Methods
  const loadPayments = async () => {
    if (!currentUser.value?.id) return

    try {
      isLoading.value = true
      
      // ✅ Use backend API to fetch payments with staff data (bypasses RLS)
      logger.debug('🔍 Loading payments via API for user:', currentUser.value.id)

      const response = await $fetch('/api/customer/get-payments', {
        method: 'GET'
      }) as any

      if (!response?.success || !response?.data) {
        throw new Error('Failed to load payments from API')
      }

      const allPayments = response.data || []

      logger.debug('✅ Total payments loaded:', allPayments.length)
      logger.debug('📊 Payments summary:', allPayments.map((p: any) => ({
        id: p.id,
        appointment_id: p.appointment_id,
        lesson_price: p.lesson_price_rappen / 100,
        admin_fee: p.admin_fee_rappen / 100,
        total: p.total_amount_rappen / 100,
        status: p.payment_status,
        paid_at: p.paid_at
      })))
      payments.value = allPayments

    } catch (err: any) {
      console.error('❌ Error loading payments:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  return {
    payments,
    isLoading,
    error,
    pendingPayments,
    loadPayments
  }
}