// composables/useCustomerPayments.ts
import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'

export const useCustomerPayments = () => {
  const authStore = useAuthStore()
  const { user: currentUser } = storeToRefs(authStore)
  const supabase = getSupabase()

  const payments = ref<any[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const pendingPayments = computed(() => 
    payments.value.filter(p => p.payment_status === 'pending')
  )

  // Methods
  const loadPayments = async () => {
    if (!currentUser.value?.id) return

    try {
      isLoading.value = true
      
      // Get user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', currentUser.value.id)
        .single()
      
      if (userError) throw userError
      if (!userData) throw new Error('User nicht in Datenbank gefunden')

      console.log('🔍 Loading payments for user:', userData.id)

      // Load payments using the detailed view
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('v_payments_detailed')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })

      if (paymentsError) throw paymentsError
      console.log('✅ Payments loaded:', paymentsData?.length || 0)

      payments.value = paymentsData || []

    } catch (err: any) {
      console.error('❌ Error loading payments:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  return {
    payments,
    pendingPayments,
    isLoading,
    error,
    loadPayments
  }
}