// composables/usePaymentStatus.ts
// ✅ VERBESSERTES PAYMENT STATUS TRACKING

import { ref, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

export type PaymentStatus = 
  | 'pending'     // Zahlung erstellt, warten auf Verarbeitung
  | 'processing'  // Zahlung wird verarbeitet (bei Wallee)
  | 'completed'   // Zahlung erfolgreich abgeschlossen
  | 'failed'      // Zahlung fehlgeschlagen
  | 'cancelled'   // Zahlung abgebrochen
  | 'refunded'    // Zahlung rückerstattet
  | 'expired'     // Zahlung abgelaufen

export interface PaymentStatusUpdate {
  payment_id: string
  status: PaymentStatus
  wallee_transaction_id?: string
  wallee_transaction_state?: string
  error_message?: string
  processed_at?: string
  metadata?: Record<string, any>
}

export const usePaymentStatus = () => {
  const supabase = getSupabase()
  
  // State
  const isUpdating = ref(false)
  const statusHistory = ref<PaymentStatusUpdate[]>([])
  
  // Status Descriptions
  const statusDescriptions: Record<PaymentStatus, { label: string; description: string; color: string }> = {
    pending: {
      label: 'Ausstehend',
      description: 'Zahlung wurde erstellt und wartet auf Verarbeitung',
      color: 'yellow'
    },
    processing: {
      label: 'In Bearbeitung',
      description: 'Zahlung wird gerade verarbeitet',
      color: 'blue'
    },
    completed: {
      label: 'Abgeschlossen',
      description: 'Zahlung wurde erfolgreich abgeschlossen',
      color: 'green'
    },
    failed: {
      label: 'Fehlgeschlagen',
      description: 'Zahlung konnte nicht verarbeitet werden',
      color: 'red'
    },
    cancelled: {
      label: 'Abgebrochen',
      description: 'Zahlung wurde vom Kunden abgebrochen',
      color: 'gray'
    },
    refunded: {
      label: 'Rückerstattet',
      description: 'Zahlung wurde rückerstattet',
      color: 'orange'
    },
    expired: {
      label: 'Abgelaufen',
      description: 'Zahlungslink ist abgelaufen',
      color: 'gray'
    }
  }
  
  // Update payment status
  const updatePaymentStatus = async (update: PaymentStatusUpdate) => {
    isUpdating.value = true
    
    try {
      console.log('🔄 Updating payment status:', update)
      
      // Update payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          payment_status: update.status,
          wallee_transaction_id: update.wallee_transaction_id,
          error_message: update.error_message,
          processed_at: update.processed_at || new Date().toISOString(),
          metadata: update.metadata
        })
        .eq('id', update.payment_id)
      
      if (paymentError) throw paymentError
      
      // Create status history entry (only if table exists)
      try {
        const { error: historyError } = await supabase
          .from('payment_status_history')
          .insert({
            payment_id: update.payment_id,
            status: update.status,
            wallee_transaction_state: update.wallee_transaction_state,
            error_message: update.error_message,
            metadata: update.metadata,
            created_at: new Date().toISOString()
          })
        
        if (historyError) {
          console.warn('⚠️ Could not create status history entry (table may not exist):', historyError)
          // Don't throw - payment update succeeded
        }
      } catch (historyErr) {
        console.warn('⚠️ Status history table may not exist yet:', historyErr)
        // Continue without history - main payment update was successful
      }
      
      // Update appointment if payment completed
      if (update.status === 'completed') {
        await updateAppointmentPaymentStatus(update.payment_id, true)
      }
      
      console.log('✅ Payment status updated successfully')
      return true
      
    } catch (error: any) {
      console.error('❌ Error updating payment status:', error)
      throw error
    } finally {
      isUpdating.value = false
    }
  }
  
  // Update appointment payment status
  const updateAppointmentPaymentStatus = async (paymentId: string, isPaid: boolean) => {
    try {
      // Get payment to find appointment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('appointment_id')
        .eq('id', paymentId)
        .single()
      
      if (paymentError || !payment?.appointment_id) {
        console.warn('⚠️ Could not find appointment for payment:', paymentId)
        return
      }
      
      // Update appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({
          is_paid: isPaid,
          payment_status: isPaid ? 'paid' : 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.appointment_id)
      
      if (appointmentError) {
        console.error('❌ Error updating appointment payment status:', appointmentError)
      } else {
        console.log('✅ Appointment payment status updated')
      }
      
    } catch (error: any) {
      console.error('❌ Error updating appointment:', error)
    }
  }
  
  // Get payment status history
  const getPaymentStatusHistory = async (paymentId: string) => {
    try {
      const { data, error } = await supabase
        .from('payment_status_history')
        .select('*')
        .eq('payment_id', paymentId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      statusHistory.value = data || []
      return data
      
    } catch (error: any) {
      console.error('❌ Error loading payment status history:', error)
      return []
    }
  }
  
  // Get status info
  const getStatusInfo = (status: PaymentStatus) => {
    return statusDescriptions[status] || statusDescriptions.pending
  }
  
  // Check if status allows refund
  const canRefund = computed(() => (status: PaymentStatus) => {
    return status === 'completed'
  })
  
  // Check if status allows retry
  const canRetry = computed(() => (status: PaymentStatus) => {
    return status === 'failed' || status === 'cancelled' || status === 'expired'
  })
  
  // Get status color classes
  const getStatusClasses = (status: PaymentStatus) => {
    const info = getStatusInfo(status)
    const colorMap = {
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      blue: 'bg-blue-100 text-blue-800',
      orange: 'bg-orange-100 text-orange-800',
      gray: 'bg-gray-100 text-gray-800'
    }
    return colorMap[info.color as keyof typeof colorMap] || colorMap.gray
  }
  
  return {
    // State
    isUpdating,
    statusHistory,
    
    // Methods
    updatePaymentStatus,
    updateAppointmentPaymentStatus,
    getPaymentStatusHistory,
    getStatusInfo,
    getStatusClasses,
    
    // Computed
    canRefund,
    canRetry,
    
    // Constants
    statusDescriptions
  }
}
