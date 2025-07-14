<!-- components/PaymentComponent.vue - KORRIGIERTE VERSION -->
<template>
  <div class="payment-section mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
    <h4 class="font-semibold text-gray-900 mb-4">💳 Zahlung</h4>
    
    <!-- Preis Anzeige -->
    <div class="mb-4">
      <div class="flex justify-between items-center p-3 bg-white rounded border">
        <span class="text-sm text-gray-600">Lektionspreis:</span>
        <span class="font-semibold">CHF {{ calculatedPrice.lessonPrice.toFixed(2) }}</span>
      </div>
      <div v-if="calculatedPrice.adminFee > 0" class="flex justify-between items-center p-3 bg-yellow-50 rounded border border-yellow-200 mt-2">
        <span class="text-sm text-gray-600">Versicherungspauschale:</span>
        <span class="font-semibold text-yellow-800">CHF {{ calculatedPrice.adminFee.toFixed(2) }}</span>
      </div>
      <div class="flex justify-between items-center p-3 bg-blue-50 rounded border border-blue-200 mt-2">
        <span class="font-semibold text-blue-900">Gesamtpreis:</span>
        <span class="font-bold text-lg text-blue-900">CHF {{ calculatedPrice.total.toFixed(2) }}</span>
      </div>
    </div>

    <!-- Zahlungsstatus -->
    <UFormGroup label="Zahlungsstatus">
      <div class="flex items-center space-x-3">
        <UToggle 
          :model-value="isPaid" 
          @update:model-value="updatePaymentStatus"
          :disabled="paymentProcessing"
        />
        <span :class="isPaid ? 'text-green-600' : 'text-gray-500'">
          {{ isPaid ? '✅ Bezahlt' : '⏳ Ausstehend' }}
        </span>
      </div>
    </UFormGroup>

    <!-- Payment Actions -->
    <div v-if="!isPaid && !readonly" class="mt-4 space-y-3">
      <!-- Wallee Payment Button -->
      <UButton 
        v-if="walleeAvailable && student"
        @click="processWalleePayment"
        :loading="paymentProcessing"
        :disabled="!canProcessPayment || paymentProcessing"
        color="blue"
        size="lg"
        class="w-full"
      >
        <template #leading>
          <Icon name="i-heroicons-credit-card" />
        </template>
        {{ paymentProcessing ? 'Zahlung wird verarbeitet...' : 'Online bezahlen (Wallee)' }}
      </UButton>

      <!-- Manual Payment Options -->
      <div class="grid grid-cols-2 gap-2">
        <UButton 
          @click="markAsPaidCash"
          :disabled="paymentProcessing"
          color="green"
          variant="outline"
        >
          💵 Bar bezahlt
        </UButton>
        <UButton 
          @click="markAsPaidInvoice"
          :disabled="paymentProcessing"
          color="orange"
          variant="outline"
        >
          🧾 Rechnung
        </UButton>
      </div>
    </div>

    <!-- Payment Error Display -->
    <div v-if="paymentError" class="mt-3 p-3 bg-red-50 border border-red-200 rounded">
      <div class="flex justify-between items-start">
        <p class="text-sm text-red-600">❌ {{ paymentError }}</p>
        <UButton 
          @click="clearPaymentError" 
          variant="ghost" 
          size="xs"
          class="text-red-400 hover:text-red-600"
        >
          ✕
        </UButton>
      </div>
    </div>

    <!-- Payment Success Display -->
    <div v-if="paymentSuccess" class="mt-3 p-3 bg-green-50 border border-green-200 rounded">
      <div class="flex justify-between items-start">
        <p class="text-sm text-green-600">✅ {{ paymentSuccess }}</p>
        <UButton 
          @click="clearPaymentSuccess" 
          variant="ghost" 
          size="xs"
          class="text-green-400 hover:text-green-600"
        >
          ✕
        </UButton>
      </div>
    </div>

    <!-- Payment History (if appointment exists) -->
    <div v-if="appointmentId && showHistory" class="mt-4 border-t pt-4">
      <UButton 
        @click="togglePaymentHistory"
        variant="ghost"
        size="sm"
        class="w-full"
      >
        {{ showPaymentHistory ? 'Zahlungshistorie ausblenden' : 'Zahlungshistorie anzeigen' }}
      </UButton>
      
      <div v-if="showPaymentHistory" class="mt-3 space-y-2">
        <div 
          v-for="payment in paymentHistory" 
          :key="payment.id"
          class="p-2 bg-white rounded border text-sm"
        >
          <div class="flex justify-between">
            <span>{{ payment.method }}</span>
            <span>CHF {{ payment.amount }}</span>
          </div>
          <div class="text-xs text-gray-500">
            {{ formatDate(payment.created_at) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWallee } from '~/composables/useWallee'
import { getSupabase } from '~/utils/supabase'

// Props Interface
interface Props {
  appointmentId?: string
  category: string
  duration: number
  isPaid: boolean
  student?: any
  readonly?: boolean
  showHistory?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
  showHistory: false
})

// Emits
const emit = defineEmits<{
  'update:isPaid': [value: boolean]
  'payment-success': [data: any]
  'payment-error': [error: string]
  'save-required': [appointmentData: any]
}>()

// Reactive State
const paymentProcessing = ref(false)
const paymentError = ref<string | null>(null)
const paymentSuccess = ref<string | null>(null)
const showPaymentHistory = ref(false)
const paymentHistory = ref<any[]>([])

// Wallee Composable
const { 
  createAppointmentPayment, 
  calculateAppointmentPrice, 
  isWalleeAvailable 
} = useWallee()

const walleeAvailable = computed(() => isWalleeAvailable())

// Computed
const calculatedPrice = computed(() => {
  if (!props.category || !props.duration) {
    return { lessonPrice: 0, adminFee: 0, total: 0 }
  }

  // TODO: Implement logic to check if this is second appointment
  const isSecondAppointment = false

  const lessonPrice = calculateAppointmentPrice(
    props.category,
    props.duration,
    false
  )

  const adminFee = isSecondAppointment ? calculateAppointmentPrice(
    props.category,
    props.duration,
    true
  ) - lessonPrice : 0

  return {
    lessonPrice,
    adminFee,
    total: lessonPrice + adminFee
  }
})

const canProcessPayment = computed(() => {
  return props.student && props.category && props.duration > 0
})

// Methods
const updatePaymentStatus = (value: boolean) => {
  emit('update:isPaid', value)
  
  if (value && props.appointmentId) {
    updateAppointmentPaymentStatus(props.appointmentId, true)
  }
}

const processWalleePayment = async () => {
  if (!props.student) {
    setPaymentError('Bitte wählen Sie zuerst einen Schüler aus')
    return
  }

  paymentProcessing.value = true
  clearMessages()

  try {
    let appointmentId = props.appointmentId

    // If no appointment ID, request parent to save first
    if (!appointmentId) {
      const appointmentData = {
        category: props.category,
        duration: props.duration,
        total_price: calculatedPrice.value.total
      }
      
      emit('save-required', appointmentData)
      setPaymentError('Bitte speichern Sie zuerst den Termin')
      return
    }

    // Check if this is second appointment
    const isSecondAppointment = await checkIsSecondAppointment(props.student.id)

    // Create Wallee payment
    const result = await createAppointmentPayment(
      {
        id: appointmentId,
        type: props.category,
        duration_minutes: props.duration
      },
      props.student,
      isSecondAppointment
    )

    if (result.success && result.paymentUrl) {
      // Open payment page in new window
      const paymentWindow = window.open(
        result.paymentUrl, 
        '_blank', 
        'width=800,height=600,scrollbars=yes,resizable=yes'
      )
      
      if (!paymentWindow) {
        setPaymentError('Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite.')
        return
      }

      setPaymentSuccess('Zahlungsseite wurde geöffnet. Bitte schließen Sie die Zahlung ab.')
      
      // Emit success event
      emit('payment-success', {
        transactionId: result.transactionId,
        paymentUrl: result.paymentUrl
      })
      
    } else {
      throw new Error(result.error || 'Unbekannter Fehler bei der Zahlungsverarbeitung')
    }

  } catch (error: any) {
    console.error('Payment Error:', error)
    setPaymentError(error.message || 'Fehler bei der Zahlungsverarbeitung')
    emit('payment-error', error.message)
  } finally {
    paymentProcessing.value = false
  }
}

const markAsPaidCash = async () => {
  emit('update:isPaid', true)
  setPaymentSuccess('Als bar bezahlt markiert')
  
  if (props.appointmentId) {
    await updateAppointmentPaymentStatus(props.appointmentId, true, 'cash')
    await recordPayment('cash')
  }
}

const markAsPaidInvoice = async () => {
  // For invoices, keep isPaid as false until actually paid
  setPaymentSuccess('Rechnung wird erstellt')
  
  if (props.appointmentId) {
    await recordPayment('invoice')
  }
  
  // TODO: Implement invoice generation
  console.log('TODO: Generate invoice for appointment')
}

const checkIsSecondAppointment = async (studentId: string): Promise<boolean> => {
  try {
    const supabase = getSupabase()
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', studentId)
      .eq('status', 'completed')

    return (count || 0) >= 1
  } catch (error) {
    console.error('Error checking appointment count:', error)
    return false
  }
}

const updateAppointmentPaymentStatus = async (
  appointmentId: string, 
  isPaid: boolean, 
  method?: string
) => {
  try {
    const supabase = getSupabase()
    const updateData: any = { is_paid: isPaid }
    
    if (method) {
      updateData.payment_method = method
    }

    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)

    if (error) throw error
  } catch (error) {
    console.error('Error updating payment status:', error)
  }
}

const recordPayment = async (method: string) => {
  if (!props.appointmentId) return

  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('payments')
      .insert({
        appointment_id: props.appointmentId,
        amount: calculatedPrice.value.total,
        currency: 'CHF',
        payment_method: method,
        status: 'completed'
      })

    if (error) throw error
  } catch (error) {
    console.error('Error recording payment:', error)
  }
}

const loadPaymentHistory = async () => {
  if (!props.appointmentId) return

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('appointment_id', props.appointmentId)
      .order('created_at', { ascending: false })

    if (error) throw error
    paymentHistory.value = data || []
  } catch (error) {
    console.error('Error loading payment history:', error)
  }
}

const togglePaymentHistory = () => {
  showPaymentHistory.value = !showPaymentHistory.value
  if (showPaymentHistory.value && paymentHistory.value.length === 0) {
    loadPaymentHistory()
  }
}

// Utility Methods
const setPaymentError = (message: string) => {
  paymentError.value = message
  paymentSuccess.value = null
}

const setPaymentSuccess = (message: string) => {
  paymentSuccess.value = message
  paymentError.value = null
}

const clearMessages = () => {
  paymentError.value = null
  paymentSuccess.value = null
}

const clearPaymentError = () => {
  paymentError.value = null
}

const clearPaymentSuccess = () => {
  paymentSuccess.value = null
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Watch for prop changes
watch(() => props.appointmentId, (newId: string | undefined) => {
  if (newId && props.showHistory) {
    loadPaymentHistory()
  }
})
</script>