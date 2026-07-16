<!-- components/customer/CustomerCancellationModal.vue -->
<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
    <div class="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center">
          <div class="text-3xl mr-3">🗑️</div>
          <h3 class="text-lg font-semibold text-gray-900">Termin absagen</h3>
        </div>
        <button @click="close" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Appointment Info -->
      <div v-if="appointment" class="bg-gray-50 rounded-lg p-3 mb-4">
        <div class="text-sm">
          <div class="font-medium text-gray-900">{{ getAppointmentTitle(appointment) }}</div>
          <div class="text-gray-600">{{ formatAppointmentDate(appointment.start_time) }}</div>
          <div v-if="hoursUntilAppointment !== null" class="text-xs text-gray-500 mt-1">
            {{ hoursUntilAppointment > 0 ? `in ${Math.round(hoursUntilAppointment)} Stunden` : 'Bereits vorbei' }}
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="bg-red-50 border-l-4 border-red-400 p-3 mb-4">
        <p class="text-sm text-red-700">{{ errorMessage }}</p>
      </div>

      <!-- Step 1: Select Reason -->
      <div v-if="!isLoading">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Absage-Grund wählen *
        </label>
        <select
          v-model="selectedReasonId"
          @change="onReasonSelected"
          class="tenant-focus w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2"
        >
          <option value="">-- Bitte wählen --</option>
          <option 
            v-for="reason in studentReasons" 
            :key="reason.id" 
            :value="reason.id"
          >
            {{ reason.name_de }}
          </option>
        </select>

        <!-- Policy Info -->
        <p v-if="selectedReason && !policyInfo" class="text-xs text-gray-400 mb-4">Kostenfolge wird berechnet…</p>
        <div
          v-if="selectedReason && policyInfo"
          class="rounded-lg p-3 mb-4 border"
          :style="{ background: `${primaryColor}15`, borderColor: `${primaryColor}33` }"
        >
          <p class="text-sm font-medium mb-1" :style="{ color: primaryColor }">Kostenfolge:</p>
          <p class="text-sm" :style="{ color: primaryColor }">
            {{ policyInfo.description }}
          </p>
          <p v-if="payment && policyInfo.chargePercentage > 0" class="text-sm font-medium mt-1" :style="{ color: primaryColor }">
            Gebühr: CHF {{ chargeAmountChf.toFixed(2) }}
          </p>
          <p v-if="payment?.payment_status === 'completed' && policyInfo.chargePercentage < 100" class="text-xs mt-1" :style="{ color: primaryColor }">
            Rückerstattung: CHF {{ refundAmountChf.toFixed(2) }}
          </p>
        </div>

        <!-- Refund Destination Choice (shown whenever a refund applies to a completed payment) -->
        <div
          v-if="selectedReason && chargePercentage !== null && chargePercentage < 100 && canChooseWalleeRefund"
          class="mb-4"
        >
          <p class="text-sm font-medium text-gray-700 mb-2">Wohin soll die Rückerstattung gehen?</p>
          <div class="space-y-2">
            <label class="flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-colors"
              :class="refundDestination === 'wallet' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'"
            >
              <input type="radio" value="wallet" v-model="refundDestination" class="mt-0.5 text-blue-600 focus:ring-blue-400" />
              <div>
                <span class="text-sm font-medium text-gray-900">Guthaben aufladen</span>
                <p class="text-xs text-gray-500 mt-0.5">CHF {{ refundAmountChf.toFixed(2) }} werden sofort Ihrem Fahrstunden-Guthaben gutgeschrieben</p>
              </div>
            </label>
            <label class="flex items-start gap-3 cursor-pointer p-3 rounded-lg border transition-colors"
              :class="refundDestination === 'wallee' ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:bg-gray-50'"
            >
              <input type="radio" value="wallee" v-model="refundDestination" class="mt-0.5 text-green-600 focus:ring-green-400" />
              <div>
                <span class="text-sm font-medium text-gray-900">Auf Zahlungsmittel zurückerstatten</span>
                <p class="text-xs text-gray-500 mt-0.5">CHF {{ refundAmountChf.toFixed(2) }} werden auf Ihre originale Zahlungsmethode zurückerstattet (3–5 Werktage)</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Medical Certificate Upload Section - only show when there's an actual fee for this reason -->
        <div v-if="selectedReason && selectedReason.requires_proof && chargePercentage !== null && chargePercentage > 0" class="mb-4">
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-yellow-700 font-medium">
                  {{ selectedReason.proof_description || 'Arztzeugnis erforderlich' }}
                </p>
                <p class="text-xs text-yellow-600 mt-1">
                  {{ selectedReason.proof_instructions }}
                </p>
              </div>
            </div>
          </div>

          <!-- Upload Area -->
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div v-if="!uploadedFile">
              <label class="block cursor-pointer">
                <input
                  type="file"
                  @change="handleFileSelect"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  class="hidden"
                  ref="fileInput"
                />
                <div class="text-center">
                  <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <p class="mt-2 text-sm text-gray-600">
                    <span class="font-medium hover:opacity-80" :style="{ color: primaryColor }">Datei auswählen</span> oder hierher ziehen
                  </p>
                  <p class="text-xs text-gray-500 mt-1">PDF, JPG, PNG (max. 5MB)</p>
                </div>
              </label>
            </div>
            
            <!-- Selected File -->
            <div v-else class="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
              <div class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ uploadedFile.name }}</p>
                  <p class="text-xs text-gray-500">{{ formatFileSize(uploadedFile.size) }}</p>
                </div>
              </div>
              <button
                @click="removeFile"
                class="text-red-600 hover:text-red-800"
              >
                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Upload Later Option -->
          <div class="mt-2 text-xs text-gray-600">
            Sie können das Arztzeugnis auch später hochladen. Deadline: {{ getUploadDeadline() }}
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-8">
        <div
          class="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent mx-auto mb-3"
          :style="{ borderColor: primaryColor, borderTopColor: 'transparent' }"
        ></div>
        <p class="text-gray-600">{{ uploadingFile ? 'Arztzeugnis wird hochgeladen...' : 'Termin wird abgesagt...' }}</p>
      </div>

      <!-- Actions -->
      <div v-if="!isLoading" class="flex space-x-3 mt-6">
        <button
          @click="close"
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Abbrechen
        </button>
        <button
          @click="confirmCancellation"
          :disabled="!selectedReasonId || isLoading"
          class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Termin absagen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, watch } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { useCancellationPolicies } from '~/composables/useCancellationPolicies'
import { calculateCancellationCharges } from '~/utils/policyCalculations'

const { primaryColor } = useTenantBranding()
const { defaultPolicy, fetchPolicies } = useCancellationPolicies()

const props = defineProps<{
  isVisible: boolean
  appointment: any
  payment: any
}>()

const emit = defineEmits<{
  close: []
  cancelled: [appointmentId: string]
}>()


// State
const selectedReasonId = ref('')
const selectedReason = ref<any>(null)
const studentReasons = ref<any[]>([])
const uploadedFile = ref<File | null>(null)
const isLoading = ref(false)
const uploadingFile = ref(false)
const errorMessage = ref('')
// 'wallet' = Guthaben gutschreiben | 'wallee' = direkt auf Zahlungsmittel
const refundDestination = ref<'wallet' | 'wallee'>('wallet')

// Result of the real cancellation-policy calculation for the selected reason —
// replaces the previous hardcoded 24h/0%-100% logic so the preview shown here
// always matches what the backend (cancel-customer.post.ts) actually charges.
const cancellationCharge = ref<{ chargePercentage: number; description: string } | null>(null)

const chargePercentage = computed(() => cancellationCharge.value?.chargePercentage ?? null)

// Whether the current situation allows a direct Wallee refund
const canChooseWalleeRefund = computed(() => {
  if (!props.payment) return false
  if (props.payment.payment_status !== 'completed') return false
  if (!props.payment.wallee_transaction_id) return false
  const walleeCapture = (props.payment.total_amount_rappen || 0) - (props.payment.credit_used_rappen || 0)
  return walleeCapture > 0
})

// Amount that will be charged/refunded, scaled by the actual chargePercentage
// (0%, 100%, or anything in between — not just a binary free/full case)
const chargeAmountChf = computed(() => {
  if (chargePercentage.value === null || !props.payment) return 0
  return ((props.payment.total_amount_rappen || 0) * chargePercentage.value / 100) / 100
})

const refundAmountChf = computed(() => {
  if (chargePercentage.value === null || !props.payment || props.payment.payment_status !== 'completed') return 0
  return ((props.payment.total_amount_rappen || 0) * (100 - chargePercentage.value) / 100) / 100
})

const policyInfo = computed(() => {
  if (!selectedReason.value || chargePercentage.value === null) return null
  const pct = chargePercentage.value
  let description: string
  if (pct === 0) {
    description = 'Kostenlose Stornierung'
  } else if (pct === 100) {
    description = 'Volle Kosten werden verrechnet (100%)'
  } else {
    description = `Teilweise Verrechnung: ${pct}% der Kosten`
  }
  if (selectedReason.value.requires_proof && pct > 0) {
    description += ' — mit Arztzeugnis kostenlos, sonst wie angegeben'
  }
  return { chargePercentage: pct, description }
})

// Computed
const hoursUntilAppointment = computed(() => {
  if (!props.appointment?.start_time) return null
  const appointmentTime = new Date(props.appointment.start_time)
  const now = new Date()
  
  // Convert to Zurich timezone for accurate hour calculation
  const appointmentZurich = new Date(appointmentTime.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))
  const nowZurich = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }))
  
  const hours = (appointmentZurich.getTime() - nowZurich.getTime()) / (1000 * 60 * 60)
  logger.debug('🕐 Hours until appointment (Zurich TZ):', hours.toFixed(2), {
    appointment: props.appointment.start_time,
    appointmentZurich: appointmentZurich.toISOString(),
    nowZurich: nowZurich.toISOString()
  })
  return hours
})

// Methods
const loadCancellationReasons = async () => {
  try {
    // Use secure API instead of direct DB query
    const response = await $fetch('/api/customer/get-cancellation-reasons')

    if (!response.success) {
      throw new Error('Failed to load cancellation reasons')
    }

    // Filter for student reasons (API returns all tenant reasons)
    studentReasons.value = (response.reasons || []).filter(
      (r: any) => r.cancellation_type === 'student' || !r.cancellation_type
    )
  } catch (err: any) {
    console.error('Error loading cancellation reasons:', err)
    errorMessage.value = 'Fehler beim Laden der Absage-Gründe'
  }
}

const onReasonSelected = async () => {
  selectedReason.value = studentReasons.value.find(r => r.id === selectedReasonId.value)
  errorMessage.value = ''
  
  if (!selectedReason.value) {
    cancellationCharge.value = null
    return
  }

  await computeCancellationCharge()
}

// Computes the real charge percentage for the selected reason, using the same
// engine (and the same force_charge_percentage override) as the staff-facing
// EventModal and the backend cancel-customer.post.ts — so what the customer
// sees here is guaranteed to match what actually gets charged/refunded.
const computeCancellationCharge = async () => {
  const reason = selectedReason.value
  if (!reason || !props.appointment) return

  const forceChargePercentage = reason.force_charge_percentage
  if (forceChargePercentage !== null && forceChargePercentage !== undefined) {
    cancellationCharge.value = {
      chargePercentage: forceChargePercentage,
      description: forceChargePercentage === 0
        ? `Kostenlose Stornierung (fester Absage-Grund: ${reason.name_de})`
        : `Feste Stornogebühr für diesen Absage-Grund (${forceChargePercentage}%)`
    }
    return
  }

  if (!defaultPolicy.value) {
    await fetchPolicies('appointments')
  }

  if (!defaultPolicy.value) {
    console.error('⚠️ No cancellation policy available for preview')
    cancellationCharge.value = null
    return
  }

  const appointmentDataForPolicy = {
    id: props.appointment.id,
    start_time: props.appointment.start_time,
    duration_minutes: props.appointment.duration_minutes || 45,
    price_rappen: props.payment?.total_amount_rappen || 0,
    user_id: props.appointment.user_id,
    staff_id: props.appointment.staff_id,
  }

  const result = calculateCancellationCharges(defaultPolicy.value, appointmentDataForPolicy, new Date(), 'student')
  cancellationCharge.value = {
    chargePercentage: result.calculation.chargePercentage,
    description: result.calculation.description
  }
}

const handleFileSelect = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    errorMessage.value = 'Datei zu gross (max. 5MB)'
    return
  }

  // Validate file type
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    errorMessage.value = 'Ungültiger Dateityp (nur PDF, JPG, PNG, WebP)'
    return
  }

  uploadedFile.value = file
  errorMessage.value = ''
}

const removeFile = () => {
  uploadedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const confirmCancellation = async () => {
  if (!selectedReasonId.value || !props.appointment?.id) return

  try {
    isLoading.value = true
    errorMessage.value = ''

    // Step 1: Cancel appointment via API
    const response = await $fetch('/api/appointments/cancel-customer', {
      method: 'POST',
      body: {
        appointmentId: props.appointment.id,
        cancellationReasonId: selectedReasonId.value,
        refundDestination: refundDestination.value,
      }
    })

    // Step 2: Upload medical certificate if provided
    if (uploadedFile.value && selectedReason.value?.requires_proof) {
      uploadingFile.value = true
      await uploadMedicalCertificate(props.appointment.id)
    }

    emit('cancelled', props.appointment.id)
    close()

  } catch (err: any) {
    console.error('Error cancelling appointment:', err)
    errorMessage.value = err.data?.message || err.message || 'Fehler beim Absagen des Termins'
  } finally {
    isLoading.value = false
    uploadingFile.value = false
  }
}

const uploadMedicalCertificate = async (appointmentId: string) => {
  if (!uploadedFile.value) return

  const formData = new FormData()
  formData.append('file', uploadedFile.value)
  formData.append('appointmentId', appointmentId)

  await $fetch('/api/medical-certificate/upload', {
    method: 'POST',
    body: formData
  })
}

const close = () => {
  selectedReasonId.value = ''
  selectedReason.value = null
  uploadedFile.value = null
  errorMessage.value = ''
  cancellationCharge.value = null
  refundDestination.value = 'wallet'
  emit('close')
}

const getAppointmentTitle = (appointment: any) => {
  const EVENT_LABELS: Record<string, string> = {
    lesson: 'Fahrlektion',
    exam: 'Prüfung',
    theory: 'Theorie',
    other: 'Termin',
  }
  const eventLabel = EVENT_LABELS[appointment.event_type_code] || 'Fahrlektion'
  const category = appointment.type || ''
  return category ? `${eventLabel} • ${category}` : eventLabel
}

const formatAppointmentDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const getUploadDeadline = () => {
  if (!selectedReason.value?.proof_deadline_days) return '7 Tage'
  return `${selectedReason.value.proof_deadline_days} Tage nach Absage`
}

const fileInput = ref<HTMLInputElement | null>(null)

// Watch for modal visibility
watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    loadCancellationReasons()
    // Prefetch so the policy is already available by the time the user picks a reason
    if (!defaultPolicy.value) {
      fetchPolicies('appointments')
    }
  }
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.tenant-focus:focus {
  border-color: var(--color-primary, #1E40AF);
  --tw-ring-color: var(--color-primary, #1E40AF);
}
</style>

