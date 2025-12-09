<!-- components/customer/CustomerCancellationModal.vue -->
<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
          class="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        <div v-if="selectedReason && policyInfo" class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p class="text-sm text-blue-800 font-medium mb-1">Kostenfolge:</p>
          <p class="text-sm text-blue-700">
            {{ policyInfo.description }}
          </p>
        </div>

        <!-- Medical Certificate Upload Section -->
        <div v-if="selectedReason && selectedReason.requires_proof" class="mb-4">
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
                    <span class="text-blue-600 hover:text-blue-500 font-medium">Datei auswählen</span> oder hierher ziehen
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
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-3"></div>
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
import { logger } from '~/utils/logger'

import { ref, computed, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'

const props = defineProps<{
  isVisible: boolean
  appointment: any
  payment: any
}>()

const emit = defineEmits<{
  close: []
  cancelled: [appointmentId: string]
}>()

const supabase = getSupabase()

// State
const selectedReasonId = ref('')
const selectedReason = ref<any>(null)
const studentReasons = ref<any[]>([])
const policyInfo = ref<any>(null)
const uploadedFile = ref<File | null>(null)
const isLoading = ref(false)
const uploadingFile = ref(false)
const errorMessage = ref('')

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
    const { data, error } = await supabase
      .from('cancellation_reasons')
      .select('*')
      .eq('cancellation_type', 'student')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error
    studentReasons.value = data || []
  } catch (err: any) {
    console.error('Error loading cancellation reasons:', err)
    errorMessage.value = 'Fehler beim Laden der Absage-Gründe'
  }
}

const onReasonSelected = async () => {
  selectedReason.value = studentReasons.value.find(r => r.id === selectedReasonId.value)
  errorMessage.value = ''
  
  if (!selectedReason.value) {
    policyInfo.value = null
    return
  }

  // Calculate policy info
  if (hoursUntilAppointment.value !== null) {
    const hours = hoursUntilAppointment.value
    if (hours >= 24) {
      policyInfo.value = {
        description: 'Kostenlose Stornierung (mehr als 24h vor Termin)'
      }
    } else if (hours >= 0) {
      policyInfo.value = {
        description: selectedReason.value.requires_proof 
          ? 'Mit Arztzeugnis kostenlos, sonst 100% Kosten'
          : '100% Kosten (weniger als 24h vor Termin)'
      }
    } else {
      policyInfo.value = {
        description: selectedReason.value.requires_proof
          ? 'Mit Arztzeugnis kostenlos, sonst 100% Kosten'
          : '100% Kosten (Termin bereits vorbei)'
      }
    }
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

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Nicht angemeldet')
    }

    // Step 1: Cancel appointment via API
    const response = await $fetch('/api/appointments/cancel-customer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      },
      body: {
        appointmentId: props.appointment.id,
        cancellationReasonId: selectedReasonId.value
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

  // Get auth token
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Nicht angemeldet')
  }

  const formData = new FormData()
  formData.append('file', uploadedFile.value)
  formData.append('appointmentId', appointmentId)

  await $fetch('/api/medical-certificate/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    },
    body: formData
  })
}

const close = () => {
  selectedReasonId.value = ''
  selectedReason.value = null
  uploadedFile.value = null
  errorMessage.value = ''
  policyInfo.value = null
  emit('close')
}

const getAppointmentTitle = (appointment: any) => {
  return appointment.type || 'Fahrlektion'
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
</style>

