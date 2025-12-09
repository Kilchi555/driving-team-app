<!-- components/PaymentRetryModal.vue -->
<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg max-w-md w-full shadow-xl">
      
      <!-- Header -->
      <div class="bg-orange-600 text-white p-6 rounded-t-lg">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <svg class="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <h3 class="text-xl font-semibold">Zahlung wiederholen</h3>
          </div>
          <button @click="closeModal" class="text-white hover:text-orange-200 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6">
        
        <!-- Failed Payment Info -->
        <div v-if="failedPayment" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h4 class="font-semibold text-red-800 mb-2">Fehlgeschlagene Zahlung</h4>
          <div class="text-sm text-red-700 space-y-1">
            <p><strong>Betrag:</strong> CHF {{ (failedPayment.total_amount_rappen / 100).toFixed(2) }}</p>
            <p><strong>Datum:</strong> {{ formatDate(failedPayment.created_at) }}</p>
            <p v-if="failedPayment.error_message"><strong>Grund:</strong> {{ failedPayment.error_message }}</p>
          </div>
        </div>

        <!-- Appointment Info -->
        <div v-if="appointment" class="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 class="font-semibold text-gray-900 mb-3">Termin</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Datum & Zeit:</span>
              <span class="font-medium">{{ formatAppointmentDate(appointment.start_time) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Dauer:</span>
              <span class="font-medium">{{ appointment.duration_minutes }} Minuten</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Kategorie:</span>
              <span class="font-medium">{{ appointment.category || 'B' }}</span>
            </div>
          </div>
        </div>

        <!-- Payment Method Selection -->
        <div class="mb-6">
          <h4 class="font-semibold text-gray-900 mb-3">Zahlungsart wählen</h4>
          <div class="space-y-2">
            <label v-for="method in availablePaymentMethods" :key="method.method_code" 
                   class="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                   :class="{ 'border-orange-500 bg-orange-50': selectedPaymentMethod === method.method_code }">
              <input 
                v-model="selectedPaymentMethod" 
                :value="method.method_code"
                type="radio" 
                class="mr-3 text-orange-600"
              />
              <div class="flex items-center flex-1">
                <div class="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                     :class="getMethodIconClass(method.method_code)">
                  <component :is="getMethodIcon(method.icon_name)" class="w-4 h-4" />
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ method.display_name }}</p>
                  <p class="text-sm text-gray-600">{{ method.description }}</p>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex space-x-3">
          <button 
            @click="closeModal" 
            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
          <button 
            @click="retryPayment"
            :disabled="!selectedPaymentMethod || isProcessing"
            class="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ isProcessing ? 'Wird verarbeitet...' : 'Zahlung wiederholen' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, computed, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Props
const props = defineProps<{
  isVisible: boolean
  paymentId?: string
  appointmentId?: string
}>()

// Emits
const emit = defineEmits<{
  close: []
  'payment-success': [result: any]
  'payment-error': [error: string]
}>()

// State
const supabase = getSupabase()
const isProcessing = ref(false)
const selectedPaymentMethod = ref('wallee')
const failedPayment = ref<any>(null)
const appointment = ref<any>(null)

// Available payment methods
const availablePaymentMethods = ref([
  {
    method_code: 'wallee',
    display_name: 'Online-Zahlung',
    description: 'Kreditkarte, Twint, etc.',
    icon_name: 'CreditCard',
    is_active: true,
    is_online: true
  },
  {
    method_code: 'cash',
    display_name: 'Barzahlung',
    description: 'Zahlung beim Fahrlehrer',
    icon_name: 'Banknotes',
    is_active: true,
    is_online: false
  },
  {
    method_code: 'invoice',
    display_name: 'Rechnung',
    description: 'Rechnung per E-Mail',
    icon_name: 'DocumentText',
    is_active: true,
    is_online: false
  }
])

// Methods
const loadPaymentDetails = async () => {
  if (!props.paymentId && !props.appointmentId) return
  
  try {
    let query = supabase
      .from('payments')
      .select(`
        *,
        appointments (
          id,
          title,
          start_time,
          duration_minutes,
          category,
          location
        )
      `)
    
    if (props.paymentId) {
      query = query.eq('id', props.paymentId)
    } else if (props.appointmentId) {
      query = query.eq('appointment_id', props.appointmentId)
    }
    
    const { data: payment, error } = await query.single()
    
    if (error || !payment) {
      console.error('❌ Failed to load payment:', error)
      return
    }
    
    failedPayment.value = payment
    appointment.value = payment.appointments
    
  } catch (error: any) {
    console.error('❌ Error loading payment details:', error)
  }
}

const retryPayment = async () => {
  if (!selectedPaymentMethod.value || !failedPayment.value) return
  
  isProcessing.value = true
  
  try {
    logger.debug('🔄 Retrying payment with method:', selectedPaymentMethod.value)
    
    // Create new payment record
    const newPaymentData = {
      appointment_id: failedPayment.value.appointment_id,
      user_id: failedPayment.value.user_id,
      staff_id: failedPayment.value.staff_id,
      amount_rappen: failedPayment.value.amount_rappen,
      admin_fee_rappen: failedPayment.value.admin_fee_rappen,
      discount_rappen: failedPayment.value.discount_rappen,
      total_amount_rappen: failedPayment.value.total_amount_rappen,
      payment_method: selectedPaymentMethod.value,
      payment_status: 'pending',
      description: failedPayment.value.description,
      metadata: {
        ...failedPayment.value.metadata,
        retry_of_payment_id: failedPayment.value.id,
        retry_timestamp: new Date().toISOString()
      }
    }
    
    const { data: newPayment, error: createError } = await supabase
      .from('payments')
      .insert(newPaymentData)
      .select()
      .single()
    
    if (createError || !newPayment) {
      throw new Error('Failed to create retry payment')
    }
    
    // Handle different payment methods
    if (selectedPaymentMethod.value === 'wallee') {
      // Create Wallee payment
      const result = await $fetch('/api/wallee/create-transaction', {
        method: 'POST',
        body: {
          orderId: `retry-${newPayment.id}`,
          amount: newPayment.total_amount_rappen / 100,
          currency: 'CHF',
          customerEmail: failedPayment.value.metadata?.customer_email || 'test@example.com',
          description: newPayment.description
        }
      })
      
      if (result.success && result.paymentUrl) {
        // Update payment with Wallee transaction ID
        await supabase
          .from('payments')
          .update({
            wallee_transaction_id: result.transactionId,
            payment_status: 'processing'
          })
          .eq('id', newPayment.id)
        
        // Redirect to payment
        window.location.href = result.paymentUrl
      } else {
        throw new Error(result.error || 'Failed to create Wallee payment')
      }
      
    } else if (selectedPaymentMethod.value === 'cash') {
      // Mark as cash payment
      await supabase
        .from('payments')
        .update({ payment_status: 'pending' })
        .eq('id', newPayment.id)
      
      emit('payment-success', {
        type: 'cash',
        message: 'Barzahlung erfasst - Zahlung erfolgt beim Fahrlehrer'
      })
      
    } else if (selectedPaymentMethod.value === 'invoice') {
      // Mark as invoice payment
      await supabase
        .from('payments')
        .update({ payment_status: 'pending' })
        .eq('id', newPayment.id)
      
      emit('payment-success', {
        type: 'invoice',
        message: 'Rechnung wird erstellt und per E-Mail versendet'
      })
    }
    
    closeModal()
    
  } catch (error: any) {
    console.error('❌ Payment retry error:', error)
    emit('payment-error', error.message || 'Fehler beim Wiederholen der Zahlung')
  } finally {
    isProcessing.value = false
  }
}

const closeModal = () => {
  emit('close')
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatAppointmentDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getMethodIcon = (iconName: string) => {
  // Return appropriate icon component
  return 'div'
}

const getMethodIconClass = (methodCode: string) => {
  const classes: Record<string, string> = {
    wallee: 'bg-blue-100 text-blue-600',
    cash: 'bg-yellow-100 text-yellow-600',
    invoice: 'bg-gray-100 text-gray-600'
  }
  return classes[methodCode] || 'bg-gray-100 text-gray-600'
}

// Watch for modal visibility
watch(() => props.isVisible, (visible) => {
  if (visible) {
    loadPaymentDetails()
  }
})

onMounted(() => {
  if (props.isVisible) {
    loadPaymentDetails()
  }
})
</script>
