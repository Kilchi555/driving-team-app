<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 z-50">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-auto mt-20 overflow-hidden">
      
      <!-- Header -->
      <div class="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900">
            Termin nach dem Termin verwalten
          </h2>
          <button
            @click="closeModal"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-sm text-gray-600 mt-1">
          {{ appointment?.title }} - {{ formatDateTime(appointment?.start_time) }}
        </p>
      </div>

      <!-- Content -->
      <div class="px-6 py-6 space-y-6">
        
        <!-- Termin-Status -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-3">
            Termin-Status nach dem Termin *
          </label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input
                type="radio"
                v-model="postAppointmentData.status"
                value="completed"
                class="mr-3 text-blue-600 focus:ring-blue-500"
              >
              <span class="text-sm text-gray-700">✅ Termin hat stattgefunden (Bewertung/Prüfungsergebnis vorhanden)</span>
            </label>
            
            <label class="flex items-center">
              <input
                type="radio"
                v-model="postAppointmentData.status"
                value="cancelled"
                class="mr-3 text-blue-600 focus:ring-blue-500"
              >
              <span class="text-sm text-gray-700">❌ Kurzfristig abgesagt</span>
            </label>
            
            <label class="flex items-center">
              <input
                type="radio"
                v-model="postAppointmentData.status"
                value="no_show"
                class="mr-3 text-blue-600 focus:ring-blue-500"
              >
              <span class="text-sm text-gray-700">🚫 Nicht erschienen</span>
            </label>
            
            <label class="flex items-center">
              <input
                type="radio"
                v-model="postAppointmentData.status"
                value="rescheduled"
                class="mr-3 text-blue-600 focus:ring-blue-500"
              >
              <span class="text-sm text-gray-700">📅 Verschoben</span>
            </label>
          </div>
        </div>

        <!-- Zahlungsverwaltung (nur bei abgesagt/nicht erschienen) -->
        <div v-if="['cancelled', 'no_show'].includes(postAppointmentData.status)" class="border-t pt-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Zahlungsverwaltung</h3>
          
          <div class="space-y-4">
            <!-- Aktuelle Zahlung anzeigen -->
            <div v-if="currentPayment" class="bg-gray-50 p-4 rounded-md">
              <h4 class="font-medium text-gray-900 mb-2">Aktuelle Zahlung:</h4>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-600">Methode:</span>
                  <span class="ml-2 font-medium">{{ getPaymentMethodText(currentPayment.payment_method) }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Status:</span>
                  <span class="ml-2 font-medium">{{ getPaymentStatusText(currentPayment.payment_status) }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Betrag:</span>
                  <span class="ml-2 font-medium">CHF {{ (currentPayment.total_amount_rappen / 100).toFixed(2) }}</span>
                </div>
              </div>
            </div>

            <!-- Zahlungsoptionen -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-3">
                Was soll mit der Zahlung passieren? *
              </label>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    type="radio"
                    v-model="postAppointmentData.paymentAction"
                    value="refund"
                    class="mr-3 text-blue-600 focus:ring-blue-500"
                  >
                  <span class="text-sm text-gray-700">💰 Rückerstattung (falls bereits bezahlt)</span>
                </label>
                
                <label class="flex items-center">
                  <input
                    type="radio"
                    v-model="postAppointmentData.paymentAction"
                    value="credit"
                    class="mr-3 text-blue-600 focus:ring-blue-500"
                  >
                  <span class="text-sm text-gray-700">💳 Als Guthaben beim Fahrschüler verbuchen</span>
                </label>
                
                <label class="flex items-center">
                  <input
                    type="radio"
                    v-model="postAppointmentData.paymentAction"
                    value="still_due"
                    class="mr-3 text-blue-600 focus:ring-blue-500"
                  >
                  <span class="text-sm text-gray-700">⚠️ Zahlung bleibt fällig (z.B. bei kurzfristiger Absage)</span>
                </label>
              </div>
            </div>

            <!-- Guthaben-Info -->
            <div v-if="postAppointmentData.paymentAction === 'credit'" class="bg-blue-50 p-4 rounded-md">
              <div class="flex items-center">
                <svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-sm text-blue-800">
                  Der Betrag wird dem Guthaben des Fahrschülers gutgeschrieben und kann für zukünftige Termine verwendet werden.
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Kommentar -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Kommentar (optional)
          </label>
          <textarea
            v-model="postAppointmentData.comment"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Zusätzliche Informationen zum Termin..."
          ></textarea>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          @click="closeModal"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Abbrechen
        </button>
        <button
          @click="savePostAppointmentData"
          :disabled="!isFormValid || isSaving"
          :class="[
            'px-4 py-2 rounded-md transition-colors',
            isFormValid && !isSaving
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          ]"
        >
          <span v-if="isSaving" class="flex items-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Speichern...
          </span>
          <span v-else>Speichern</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Props
interface Props {
  isVisible: boolean
  appointment: any
  currentUser: any
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'close': []
  'saved': [data: any]
}>()

// Reactive data
const postAppointmentData = ref({
  status: 'completed',
  paymentAction: 'credit',
  comment: ''
})

const isSaving = ref(false)

// Computed
const isFormValid = computed(() => {
  if (!postAppointmentData.value.status) return false
  
  if (['cancelled', 'no_show'].includes(postAppointmentData.value.status)) {
    return !!postAppointmentData.value.paymentAction
  }
  
  return true
})

const currentPayment = computed(() => {
  if (!props.appointment?.payments) return null
  return props.appointment.payments[0] || null
})

// Methods
const formatDateTime = (dateTime: string) => {
  if (!dateTime) return ''
  const date = new Date(dateTime)
  return date.toLocaleDateString('de-CH') + ' ' + date.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
}

const getPaymentMethodText = (method: string) => {
  const texts: Record<string, string> = {
    'cash': 'Bar',
    'invoice': 'Rechnung',
    'wallee': 'Online',
    'credit': 'Guthaben',
    'keine': 'Keine'
  }
  return texts[method] || method
}

const getPaymentStatusText = (status: string) => {
  const texts: Record<string, string> = {
    'pending': 'Ausstehend',
    'completed': 'Bezahlt',
    'failed': 'Fehlgeschlagen',
    'keine': 'Keine'
  }
  return texts[status] || status
}

const closeModal = () => {
  emit('close')
}

const savePostAppointmentData = async () => {
  if (!isFormValid.value) return
  
  isSaving.value = true
  
  try {
    const supabase = getSupabase()
    
    // 1. Termin-Status aktualisieren
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        post_appointment_status: postAppointmentData.value.status,
        notes: postAppointmentData.value.comment || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', props.appointment.id)
    
    if (updateError) throw updateError
    
    // 2. Zahlungsverwaltung (falls abgesagt/nicht erschienen)
    if (['cancelled', 'no_show'].includes(postAppointmentData.value.status) && currentPayment.value) {
      if (postAppointmentData.value.paymentAction === 'refund') {
        // Rückerstattung verarbeiten
        await processRefund()
      } else if (postAppointmentData.value.paymentAction === 'credit') {
        // Guthaben gutschreiben
        await processCredit()
      } else if (postAppointmentData.value.paymentAction === 'still_due') {
        // Zahlung bleibt fällig - nichts zu tun
      }
    }
    
    logger.debug('✅ Post-appointment data saved successfully')
    emit('saved', postAppointmentData.value)
    closeModal()
    
  } catch (error: any) {
    console.error('❌ Error saving post-appointment data:', error)
    alert(`Fehler beim Speichern: ${error.message}`)
  } finally {
    isSaving.value = false
  }
}

const processRefund = async () => {
  // TODO: Implementierung der Rückerstattung
  logger.debug('💰 Processing refund for payment:', currentPayment.value?.id)
}

const processCredit = async () => {
  // TODO: Implementierung der Guthaben-Gutschrift
  logger.debug('💳 Processing credit for user:', props.appointment.user_id)
}

// Watch for appointment changes
watch(() => props.appointment, (newAppointment) => {
  if (newAppointment) {
    // Reset form
    postAppointmentData.value = {
      status: 'completed',
      paymentAction: 'credit',
      comment: ''
    }
  }
}, { immediate: true })
</script>
