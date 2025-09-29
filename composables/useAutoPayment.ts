// composables/useAutoPayment.ts - Automatische Zahlungsabwicklung
import { ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

export const useAutoPayment = () => {
  const supabase = getSupabase()
  const isProcessing = ref(false)
  const error = ref<string | null>(null)

  /**
   * Automatische Zahlungsabwicklung nach Termin-Bestätigung
   * Wird aufgerufen, wenn ein Termin von 'pending_confirmation' zu 'confirmed' wechselt
   */
  const processAutomaticPayment = async (appointmentId: string) => {
    isProcessing.value = true
    error.value = null

    try {
      console.log('💳 Starting automatic payment for appointment:', appointmentId)

      // 1. Lade Payment-Daten
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          appointments (
            id,
            title,
            start_time,
            user_id,
            staff_id
          )
        `)
        .eq('appointment_id', appointmentId)
        .eq('payment_status', 'pending')
        .single()

      if (paymentError) throw paymentError
      if (!payment) throw new Error('Payment not found')

      console.log('✅ Payment loaded:', payment)

      // 2. Lade User-Daten für Zahlung
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, auth_user_id')
        .eq('id', payment.user_id)
        .single()

      if (userError) throw userError
      if (!userData) throw new Error('User not found')

      console.log('✅ User data loaded:', userData)

      // 3. Erstelle Wallee-Transaction
      const walleeResponse = await $fetch('/api/wallee/create-transaction', {
        method: 'POST',
        body: {
          orderId: `auto-payment-${appointmentId}-${Date.now()}`,
          amount: payment.total_amount_rappen / 100,
          currency: 'CHF',
          customerEmail: userData.email,
          customerName: `${userData.first_name} ${userData.last_name}`,
          description: `Automatische Zahlung für ${payment.appointments?.title || 'Termin'}`,
          successUrl: `${window.location.origin}/payment/success?auto=true`,
          failedUrl: `${window.location.origin}/payment/failed?auto=true&appointment=${appointmentId}`
        }
      })

      if (!walleeResponse.success || !walleeResponse.paymentUrl) {
        throw new Error(walleeResponse.error || 'Wallee transaction failed')
      }

      console.log('✅ Wallee transaction created:', walleeResponse)

      // 4. Update Payment mit Wallee-Daten
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payment_method: 'wallee',
          payment_status: 'processing',
          wallee_transaction_id: walleeResponse.transactionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id)

      if (updateError) throw updateError

      console.log('✅ Payment updated with Wallee data')

      // 5. Update Appointment Status
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          status: 'payment_processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)

      if (appointmentError) throw appointmentError

      console.log('✅ Appointment status updated to payment_processing')

      // 6. Redirect zu Wallee (im Browser)
      if (typeof window !== 'undefined') {
        window.location.href = walleeResponse.paymentUrl
      }

      return {
        success: true,
        paymentUrl: walleeResponse.paymentUrl,
        transactionId: walleeResponse.transactionId
      }

    } catch (err: any) {
      console.error('❌ Automatic payment error:', err)
      error.value = err.message

      // Update Payment Status auf failed
      try {
        await supabase
          .from('payments')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('appointment_id', appointmentId)
      } catch (updateErr) {
        console.error('❌ Could not update payment status to failed:', updateErr)
      }

      throw err
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * Manuelle Zahlungsabwicklung (für Fallback)
   */
  const processManualPayment = async (appointmentId: string) => {
    try {
      console.log('💳 Processing manual payment for appointment:', appointmentId)

      // Lade Payment-Daten
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('appointment_id', appointmentId)
        .eq('payment_status', 'pending')
        .single()

      if (paymentError) throw paymentError
      if (!payment) throw new Error('Payment not found')

      // Redirect zu Payment-Process Seite
      if (typeof window !== 'undefined') {
        await navigateTo(`/customer/payment-process?payments=${payment.id}`)
      }

    } catch (err: any) {
      console.error('❌ Manual payment error:', err)
      throw err
    }
  }

  /**
   * Check if user has saved payment methods
   */
  const hasSavedPaymentMethods = async (userId: string): Promise<boolean> => {
    try {
      // TODO: Implementiere gespeicherte Zahlungsmethoden
      // Für jetzt immer false zurückgeben (keine gespeicherten Methoden)
      return false
    } catch (err) {
      console.error('❌ Error checking saved payment methods:', err)
      return false
    }
  }

  /**
   * Get user's preferred payment method
   */
  const getUserPreferredPaymentMethod = async (userId: string): Promise<string> => {
    try {
      // TODO: Implementiere Zahlungspräferenzen
      // Für jetzt immer 'wallee' zurückgeben
      return 'wallee'
    } catch (err) {
      console.error('❌ Error getting preferred payment method:', err)
      return 'wallee'
    }
  }

  return {
    // State
    isProcessing,
    error,
    
    // Core Functions
    processAutomaticPayment,
    processManualPayment,
    
    // Utility Functions
    hasSavedPaymentMethods,
    getUserPreferredPaymentMethod
  }
}
