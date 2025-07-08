<!-- components/PendenzenModal.vue -->
<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <!-- MODAL CONTAINER -->
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
      
      <!-- Header -->
      <div class="bg-green-600 text-white p-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold">
              Pendenzen
              <span :class="[
                'ml-2 px-2 py-1 rounded-full text-sm font-medium',
                pendingCount > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              ]">
                {{ pendingCount }}
              </span>
            </h1>
            <p class="text-sm text-green-100">Unbewertete Fahrlektionen</p>
          </div>
          
          <!-- Close Button -->
          <button 
            @click="closeModal"
            class="text-white hover:text-green-200 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Smart Stats mit Farbkodierung -->
        <div class="mt-4 flex gap-4 items-center text-sm">
          <span class="text-green-200">
            <span class="inline-block w-2 h-2 bg-green-300 rounded-full mr-1"></span>
            Offen: {{ getOpenCount() }}
          </span>
          <span class="text-orange-200">
            <span class="inline-block w-2 h-2 bg-orange-300 rounded-full mr-1"></span>
            Fällig: {{ getDueCount() }}
          </span>
          <span class="text-red-200">
            <span class="inline-block w-2 h-2 bg-red-300 rounded-full mr-1"></span>
            Überfällig: {{ getOverdueCount() }}
          </span>
        </div>
      </div>

      <!-- Content - Scrollable -->
      <div class="flex-1 overflow-y-auto">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <div class="text-center">
            <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
            <p class="mt-4 text-gray-600">Lade Pendenzen...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-4">
          <div class="bg-red-50 border border-red-200 rounded p-4 text-red-700">
            <h3 class="font-bold mb-2">Fehler beim Laden</h3>
            <p class="mb-4">{{ error }}</p>
            <button 
              @click="refreshData" 
              class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Erneut versuchen
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="pendingCount === 0" class="flex items-center justify-center py-8">
          <div class="text-center px-4">
            <div class="text-6xl mb-4">🎉</div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Keine Pendenzen!</h3>
            <p class="text-gray-600 mb-4">
              Alle Lektionen sind bewertet und kommentiert.
            </p>
            <button 
              @click="closeModal"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Super! Schließen
            </button>
          </div>
        </div>

        <!-- Pending Appointments List -->
        <div v-else class="p-4 space-y-3">
          <div
            v-for="appointment in formattedAppointments"
            :key="appointment.id"
            :class="[
              'rounded-lg border p-4 hover:shadow-md transition-all cursor-pointer',
              getAppointmentBackgroundClass(appointment)
            ]"
            @click="openEvaluation(appointment)"
          >
            <!-- Vereinfachtes Layout -->
            <div class="flex items-center justify-between">
              <!-- Links: Name & Kategorie -->
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900">
                  {{ appointment.studentName }}
                </h3>
                <p class="text-sm text-gray-600">
                  {{ appointment.title }}
                </p>
              </div>
              
              <!-- Rechts: Status & Datum -->
              <div class="text-right">
                <!-- Status Badge -->
                <span :class="[
                  'text-xs px-2 py-1 rounded-full font-medium block mb-1',
                  getPriorityClass(appointment)
                ]">
                  {{ getPriorityText(appointment) }}
                </span>
                
                <!-- Datum & Zeit -->
                <p class="text-xs text-gray-500">
                  {{ appointment.formattedDate }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ appointment.formattedStartTime }} - {{ appointment.formattedEndTime }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    <!-- Evaluation Modal (außerhalb des Hauptmodals) -->
    <EvaluationModal
      v-if="showEvaluationModal"
      :is-open="showEvaluationModal"
      :appointment="selectedAppointment"
      :student-category="selectedAppointment?.users?.category || 'B'"
      :current-user="currentUser"
      @close="closeEvaluationModal"
      @saved="onEvaluationSaved"
    />
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePendingTasks } from '~/composables/usePendingTasks'
import EvaluationModal from '~/components/EvaluationModal.vue'

// Props
interface Props {
  isOpen: boolean
  currentUser: any
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  close: []
  'evaluate-lesson': [appointment: any]
}>()

// WICHTIG: Verwende das zentrale usePendingTasks Composable
const {
  pendingAppointments,
  formattedAppointments,
  pendingCount,
  isLoading,
  error,
  fetchPendingTasks,
  clearError
} = usePendingTasks()

// Modal state
const showEvaluationModal = ref(false)
const selectedAppointment = ref<any>(null)


// Methods
const closeModal = () => {
  console.log('🔥 PendenzenModal closing...')
  emit('close')
}

const openEvaluation = (appointment: any) => {
  console.log('🔥 PendenzenModal - opening evaluation for:', appointment.id)
  selectedAppointment.value = appointment
  showEvaluationModal.value = true
}

const closeEvaluationModal = () => {
  console.log('🔥 PendenzenModal - closing evaluation modal')
  showEvaluationModal.value = false
  selectedAppointment.value = null
}

const onEvaluationSaved = async (appointmentId: string) => {
  console.log('🎉 PendenzenModal - evaluation saved for:', appointmentId)
  
  // Das Composable wird automatisch aktualisiert durch markAsCompleted
  console.log('✅ New pending count after evaluation:', pendingCount.value)
  
  closeEvaluationModal()
}

const refreshData = async () => {
  if (!props.currentUser?.id) {
    console.warn('⚠️ No current user ID available for refresh')
    return
  }
  
  console.log('🔄 PendenzenModal - refreshing data...')
  clearError()
  await fetchPendingTasks(props.currentUser.id)
  console.log('✅ PendenzenModal - data refreshed, count:', pendingCount.value)
}

// Smart Count Funktionen
const getOpenCount = () => {
  const today = new Date().toDateString()
  return pendingAppointments.value.filter(apt => 
    new Date(apt.start_time).toDateString() === today
  ).length
}

const getDueCount = () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayString = yesterday.toDateString()
  
  return pendingAppointments.value.filter(apt => 
    new Date(apt.start_time).toDateString() === yesterdayString
  ).length
}

const getOverdueCount = () => {
  const dayBeforeYesterday = new Date()
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2)
  
  return pendingAppointments.value.filter(apt => 
    new Date(apt.start_time) <= dayBeforeYesterday
  ).length
}

// Background-Klassen für Termine
const getAppointmentBackgroundClass = (appointment: any) => {
  const appointmentDate = new Date(appointment.start_time).toDateString()
  const today = new Date().toDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayString = yesterday.toDateString()
  
  if (appointmentDate === today) {
    return 'bg-green-50 border-green-200 hover:bg-green-100'
  } else if (appointmentDate === yesterdayString) {
    return 'bg-orange-50 border-orange-200 hover:bg-orange-100'
  } else {
    return 'bg-red-50 border-red-200 hover:bg-red-100'
  }
}

const getPriorityClass = (appointment: any) => {
  const appointmentDate = new Date(appointment.start_time).toDateString()
  const today = new Date().toDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayString = yesterday.toDateString()
  
  if (appointmentDate === today) {
    return 'bg-green-100 text-green-800'
  } else if (appointmentDate === yesterdayString) {
    return 'bg-orange-100 text-orange-800'
  } else {
    return 'bg-red-100 text-red-800'
  }
}

const getPriorityText = (appointment: any) => {
  const appointmentDate = new Date(appointment.start_time).toDateString()
  const today = new Date().toDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayString = yesterday.toDateString()
  
  if (appointmentDate === today) {
    return 'Offen'
  } else if (appointmentDate === yesterdayString) {
    return 'Fällig'
  } else {
    return 'Überfällig'
  }
}

// Watch für Modal-Öffnung
watch(() => props.isOpen, async (newIsOpen) => {
  console.log('🔥 PendenzenModal isOpen changed:', newIsOpen)
  console.log('🔥 Current user in modal:', props.currentUser)
  
  if (newIsOpen && props.currentUser?.id) {
    console.log('🔄 PendenzenModal opened - loading data...')
    await refreshData()
  } else if (!newIsOpen) {
    console.log('ℹ️ PendenzenModal closed')
  } else {
    console.warn('⚠️ Modal opened but no user ID available')
  }
}, { immediate: true })

// Debug: Watch pendingCount changes
watch(pendingCount, (newCount, oldCount) => {
  console.log(`🔄 PendenzenModal - pending count changed: ${oldCount} → ${newCount}`)
}, { immediate: true })

// Initial load wenn Component gemounted wird UND Modal bereits offen ist
onMounted(() => {
  if (props.isOpen && props.currentUser?.id) {
    console.log('🔄 PendenzenModal mounted with open state - loading data...')
    refreshData()
  }
})
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
}

/* Mobile optimizations */
@media (hover: none) and (pointer: coarse) {
  .hover\:bg-gray-100:hover {
    background-color: #f3f4f6;
  }
}

/* Ensure text doesn't break layout on small screens */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>