<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="bg-green-600 text-white p-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">Bargeld erfassen</h3>
          <button @click="closeModal" class="text-white hover:text-green-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <form @submit.prevent="submitTransaction" class="space-y-4">
          <!-- Student Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Schüler *</label>
            <select
              v-model="formData.student_id"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Schüler auswählen...</option>
              <option
                v-for="student in availableStudents"
                :key="student.id"
                :value="student.id"
              >
                {{ student.first_name }} {{ student.last_name }}
              </option>
            </select>
          </div>

          <!-- Appointment Selection -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Termin *</label>
            <select
              v-model="formData.appointment_id"
              required
              :disabled="!formData.student_id"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Termin auswählen...</option>
              <option
                v-for="appointment in availableAppointments"
                :key="appointment.id"
                :value="appointment.id"
              >
                {{ formatDateTime(appointment.start_time) }} 
                ({{ appointment.duration_minutes }} Min)
              </option>
            </select>
          </div>

          <!-- Amount -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Betrag (CHF) *</label>
            <input
              v-model="formData.amount"
              type="number"
              step="0.01"
              min="0"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="0.00"
            />
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Notizen</label>
            <textarea
              v-model="formData.notes"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Details zur Bargeldzahlung (z.B. Scheine, Münzen)..."
            ></textarea>
          </div>

          <!-- Summary -->
          <div v-if="formData.student_id && formData.appointment_id && formData.amount" class="bg-gray-50 p-3 rounded-lg">
            <h4 class="text-sm font-medium text-gray-900 mb-2">Zusammenfassung:</h4>
            <div class="text-sm text-gray-600 space-y-1">
              <p><strong>Schüler:</strong> {{ getStudentName(formData.student_id) }}</p>
              <p><strong>Termin:</strong> {{ getAppointmentInfo(formData.appointment_id) }}</p>
              <p><strong>Betrag:</strong> CHF {{ parseFloat(formData.amount).toFixed(2) }}</p>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-3">
            <p class="text-sm text-red-800">{{ error }}</p>
          </div>

          <!-- Action Buttons -->
          <div class="flex space-x-3 pt-4">
            <button
              type="button"
              @click="closeModal"
              class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              :disabled="!isFormValid || isSubmitting"
              class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isSubmitting">Erfasse...</span>
              <span v-else>Bargeld erfassen</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { formatDateTime } from '~/utils/dateUtils'

// Props
interface Props {
  isVisible: boolean
  currentUser: any
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits(['close', 'transaction-created'])

// Supabase
const supabase = getSupabase()

// State
const formData = ref({
  student_id: '',
  appointment_id: '',
  amount: '',
  notes: ''
})

const availableStudents = ref<any[]>([])
const availableAppointments = ref<any[]>([])
const error = ref<string | null>(null)
const isSubmitting = ref(false)

// Computed
const isFormValid = computed(() => {
  return formData.value.student_id && 
         formData.value.appointment_id && 
         formData.value.amount && 
         parseFloat(formData.value.amount) > 0
})

// Methods
const loadStudents = async () => {
  try {
    const { data, error: queryError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'student')
      .order('first_name')

    if (queryError) throw queryError
    availableStudents.value = data || []
  } catch (err: any) {
    console.error('Error loading students:', err)
    error.value = 'Fehler beim Laden der Schüler'
  }
}

const loadAppointments = async () => {
  if (!formData.value.student_id) {
    availableAppointments.value = []
    return
  }

  try {
    const { data, error: queryError } = await supabase
      .from('appointments')
      .select('id, start_time, duration_minutes, status')
      .eq('user_id', formData.value.student_id)
      .in('status', ['completed', 'cancelled'])
      .order('start_time', { ascending: false })

    if (queryError) throw queryError
    availableAppointments.value = data || []
  } catch (err: any) {
    console.error('Error loading appointments:', err)
    error.value = 'Fehler beim Laden der Termine'
  }
}

const getStudentName = (studentId: string) => {
  const student = availableStudents.value.find(s => s.id === studentId)
  return student ? `${student.first_name} ${student.last_name}` : ''
}

const getAppointmentInfo = (appointmentId: string) => {
  const appointment = availableAppointments.value.find(a => a.id === appointmentId)
  if (!appointment) return ''
  
  return `${formatDateTime(appointment.start_time)} (${appointment.duration_minutes} Min)`
}

const submitTransaction = async () => {
  if (!isFormValid.value) return

  isSubmitting.value = true
  error.value = null

  try {
    const amountRappen = Math.round(parseFloat(formData.value.amount) * 100)

    // Verwende die Datenbankfunktion für bessere Sicherheit
    const { data, error: insertError } = await supabase
      .rpc('create_cash_transaction', {
        p_instructor_id: props.currentUser.id,
        p_student_id: formData.value.student_id,
        p_appointment_id: formData.value.appointment_id,
        p_amount_rappen: amountRappen,
        p_notes: formData.value.notes || null
      })

    if (insertError) throw insertError

    // Erfolg
    emit('transaction-created', data)
    closeModal()

  } catch (err: any) {
    console.error('Error creating cash transaction:', err)
    error.value = err.message || 'Fehler beim Erfassen der Bargeldtransaktion'
  } finally {
    isSubmitting.value = false
  }
}

const closeModal = () => {
  // Reset form
  formData.value = {
    student_id: '',
    appointment_id: '',
    amount: '',
    notes: ''
  }
  error.value = null
  emit('close')
}

// Watchers
watch(() => formData.value.student_id, () => {
  formData.value.appointment_id = ''
  loadAppointments()
})

// Lifecycle
onMounted(() => {
  loadStudents()
})
</script>
