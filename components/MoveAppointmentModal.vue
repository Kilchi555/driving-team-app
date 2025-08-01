<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg max-w-md w-full shadow-xl">
      <!-- Header -->
      <div class="bg-green-600 text-white p-4 rounded-t-lg">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            Termin verschieben
          </h3>
          <button @click="closeModal" class="text-white hover:text-green-200 transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Aktueller Termin Info -->
        <div v-if="appointment" class="bg-gray-50 rounded-lg p-4">
          <h4 class="font-semibold text-gray-900 mb-2">Aktueller Termin</h4>
          <div class="space-y-1 text-sm">
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              <span class="font-medium">{{ appointment.title || getStudentName() }}</span>
            </div>
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{{ formatDateTime(appointment.start_time) }}</span>
            </div>
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              </svg>
              <span>{{ appointment.extendedProps?.location || 'Standort nicht definiert' }}</span>
            </div>
            <div v-if="appointment.extendedProps?.duration_minutes" class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>{{ appointment.extendedProps.duration_minutes }} Minuten</span>
            </div>
          </div>
        </div>

        <!-- Neues Datum/Zeit -->
        <div class="space-y-4">
          <h4 class="font-semibold text-gray-900">Neuer Termin</h4>
          
          <!-- Datum -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Neues Datum
            </label>
            <input
              v-model="newDate"
              type="date"
              :min="minDate"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <!-- Startzeit -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Startzeit
            </label>
            <input
              v-model="newStartTime"
              type="time"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <!-- Endzeit (automatisch berechnet oder manuell) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Endzeit
            </label>
            <input
              v-model="newEndTime"
              type="time"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <!-- Vorschau des neuen Termins -->
          <div v-if="isValidTime" class="bg-green-50 border border-green-200 rounded-lg p-3">
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm text-green-800 font-medium">
                Neuer Termin: {{ formatNewDateTime() }}
              </span>
            </div>
          </div>

          <!-- Fehlermeldung -->
          <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-3">
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm text-red-800">{{ errorMessage }}</span>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="border-t pt-4">
          <h5 class="text-sm font-medium text-gray-700 mb-2">Schnell verschieben:</h5>
          <div class="flex flex-wrap gap-2">
            <button
              @click="shiftByDays(1)"
              class="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              +1 Tag
            </button>
            <button
              @click="shiftByDays(7)"
              class="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              +1 Woche
            </button>
            <button
              @click="shiftByDays(-1)"
              class="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              -1 Tag
            </button>
            <button
              @click="shiftByHours(1)"
              class="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              +1 Stunde
            </button>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="bg-gray-50 px-6 py-4 rounded-b-lg">
        <div class="flex gap-3">
          <button
            @click="closeModal"
            class="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Abbrechen
          </button>
          <button
            @click="moveAppointment"
            :disabled="!isValidTime || isLoading"
            class="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isLoading ? 'Wird verschoben...' : 'Verschieben' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { formatDateTime } from '~/utils/dateUtils'
import { toLocalTimeString } from '~/utils/dateUtils'

// Props
interface Props {
  isVisible: boolean
  appointment: any
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits(['close', 'moved', 'error'])

// Supabase
const supabase = getSupabase()

// State
const newDate = ref('')
const newStartTime = ref('')
const newEndTime = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

// Computed
const minDate = computed(() => {
  const today = new Date()
return toLocalTimeString(today).split('T')[0]})

const isValidTime = computed(() => {
  if (!newDate.value || !newStartTime.value || !newEndTime.value) return false
  
  const startDateTime = new Date(`${newDate.value}T${newStartTime.value}`)
  const endDateTime = new Date(`${newDate.value}T${newEndTime.value}`)
  
  return endDateTime > startDateTime
})

// Methods
const closeModal = () => {
  resetForm()
  emit('close')
}

const resetForm = () => {
  newDate.value = ''
  newStartTime.value = ''
  newEndTime.value = ''
  errorMessage.value = ''
  isLoading.value = false
}

const initializeForm = () => {
  if (!props.appointment) return
  
  const startDate = new Date(props.appointment.start)
  const endDate = new Date(props.appointment.end)
  
  newDate.value = toLocalTimeString(startDate).split('T')[0]
  newStartTime.value = startDate.toTimeString().slice(0, 5)
  newEndTime.value = endDate.toTimeString().slice(0, 5)
}

const getStudentName = () => {
  const extendedProps = props.appointment?.extendedProps
  return extendedProps?.student || extendedProps?.user_name || 'Unbekannter Schüler'
}

const formatNewDateTime = () => {
  if (!newDate.value || !newStartTime.value) return ''
  
  const dateTime = new Date(`${newDate.value}T${newStartTime.value}`)
  return formatDateTime(toLocalTimeString(dateTime))
}

const shiftByDays = (days: number) => {
  if (!newDate.value) return
  
  const currentDate = new Date(newDate.value)
  currentDate.setDate(currentDate.getDate() + days)
  newDate.value = toLocalTimeString(currentDate).split('T')[0]
}

const shiftByHours = (hours: number) => {
  if (!newStartTime.value || !newEndTime.value) return
  
  const [startHour, startMin] = newStartTime.value.split(':').map(Number)
  const [endHour, endMin] = newEndTime.value.split(':').map(Number)
  
  const newStartHour = Math.max(0, Math.min(23, startHour + hours))
  const newEndHour = Math.max(0, Math.min(23, endHour + hours))
  
  newStartTime.value = `${newStartHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`
  newEndTime.value = `${newEndHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
}

const moveAppointment = async () => {
  if (!isValidTime.value || !props.appointment) return
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const newStartDateTime = new Date(`${newDate.value}T${newStartTime.value}`)
    const newEndDateTime = new Date(`${newDate.value}T${newEndTime.value}`)
    
    console.log('🔄 Moving appointment:', props.appointment.id)
    console.log('📅 New times:', newStartDateTime, newEndDateTime)
    
    const { error } = await supabase
      .from('appointments')
      .update({
        start_time: toLocalTimeString(newStartDateTime),
        end_time: toLocalTimeString(newEndDateTime)
      })
      .eq('id', props.appointment.id)
    
    if (error) {
      console.error('❌ Error moving appointment:', error)
      throw error
    }
    
    console.log('✅ Appointment moved successfully')
    
    // Emit success
    emit('moved', {
      appointmentId: props.appointment.id,
      newStart: toLocalTimeString(newStartDateTime),
      newEnd: toLocalTimeString(newEndDateTime)
    })
    
    closeModal()
    
  } catch (err: any) {
    console.error('❌ Error in moveAppointment:', err)
    errorMessage.value = err.message || 'Fehler beim Verschieben des Termins'
    emit('error', err.message)
  } finally {
    isLoading.value = false
  }
}

// Watchers
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    initializeForm()
  }
})

watch([newStartTime, () => props.appointment], () => {
  // Auto-calculate end time based on original duration
  if (newStartTime.value && props.appointment) {
    const originalStart = new Date(props.appointment.start)
    const originalEnd = new Date(props.appointment.end)
    const durationMs = originalEnd.getTime() - originalStart.getTime()
    
    const newStart = new Date(`${newDate.value}T${newStartTime.value}`)
    const newEnd = new Date(newStart.getTime() + durationMs)
    
    newEndTime.value = newEnd.toTimeString().slice(0, 5)
  }
})
</script>