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
  // ✅ Exclude payments for pending_confirmation appointments (these are handled separately)
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
      
      return true
    })
  })

  // Methods
  const loadPayments = async () => {
    if (!currentUser.value?.id) return

    try {
      isLoading.value = true
      
      // Get user data from users table with tenant_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, auth_user_id, tenant_id')
        .eq('auth_user_id', currentUser.value.id)
        .single()
      
      if (userError) throw userError
      if (!userData) throw new Error('User nicht in Datenbank gefunden')
      if (!userData.tenant_id) throw new Error('User has no tenant assigned')

      console.log('🔍 Loading payments for user:', userData.id, 'tenant:', userData.tenant_id)
      console.log('🔍 Current auth user ID:', currentUser.value?.id)
      console.log('🔍 User table auth_user_id:', userData.auth_user_id)

      // ✅ Lade nur echte payments aus der payments Tabelle
      let allPayments: any[] = []

      // 1. Lade alle payments für diesen User (nur für nicht gelöschte Termine)
      try {
        // ✅ Lade alle payments für den User mit Tenant-Filter + Appointments für Überfälligkeitsprüfung
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select(`
            id,
            created_at,
            updated_at,
            appointment_id,
            user_id,
            staff_id,
            lesson_price_rappen,
            admin_fee_rappen,
            products_price_rappen,
            discount_amount_rappen,
            total_amount_rappen,
            payment_method,
            payment_status,
            paid_at,
            description,
            metadata,
            tenant_id,
            automatic_payment_consent,
            automatic_payment_consent_at,
            scheduled_payment_date,
            payment_method_id,
            automatic_payment_processed,
            automatic_payment_processed_at,
            appointments (
              id,
              start_time,
              end_time,
              duration_minutes,
              status,
              confirmation_token,
              staff_id,
              staff:users!staff_id (
                id,
                first_name,
                last_name
              )
            )
          `)
          .eq('tenant_id', userData.tenant_id) // Filter by tenant
          .or(`user_id.eq.${userData.id},user_id.eq.${currentUser.value.id}`)
          .order('created_at', { ascending: false })

        console.log('🔍 Searching payments with user_id:', userData.id, 'tenant:', userData.tenant_id)

        if (paymentsError) {
          console.warn('⚠️ Error loading payments:', paymentsError)
          console.error('⚠️ Full error details:', paymentsError)
        } else {
          console.log('✅ Payments loaded:', paymentsData?.length || 0)
          console.log('📊 Payments details:', paymentsData?.map(p => ({
            id: p.id,
            appointment_id: p.appointment_id,
            lesson_price: p.lesson_price_rappen / 100,
            total: p.total_amount_rappen / 100,
            status: p.payment_status
          })))
          allPayments = paymentsData || []
        }
      } catch (error: any) {
        console.warn('⚠️ Could not load payments table:', error.message)
      }

      // ✅ Verwende nur echte Payments aus der Datenbank - keine Appointment-Konvertierung mehr

      // ✅ Sortiere payments nach Datum (neueste zuerst)
      allPayments.sort((a, b) => {
        const dateA = new Date(a.created_at || 0)
        const dateB = new Date(b.created_at || 0)
        return dateB.getTime() - dateA.getTime()
      })

      console.log('✅ Total payments loaded:', allPayments.length)
      console.log('📊 Payments summary:', allPayments.map(p => ({
        id: p.id,
        appointment_id: p.appointment_id,
        lesson_price: p.lesson_price_rappen / 100,
        admin_fee: p.admin_fee_rappen / 100,
        total: p.total_amount_rappen / 100,
        status: p.payment_status
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