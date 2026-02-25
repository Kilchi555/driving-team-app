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
                (pendingCount + unconfirmedNext24hCount) > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              ]">
                {{ pendingCount + unconfirmedNext24hCount }}
              </span>
            </h1>
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
      </div>

      <!-- Tabs -->
      <div class="bg-gray-50 border-b px-4 overflow-x-auto flex-shrink-0">
        <div class="flex space-x-4 min-w-min">
          <button
            :class="[
              'py-3 border-b-2 whitespace-nowrap transition-all font-medium',
              activeTab === 'pendenzen' ? 'border-b-2 font-bold' : 'border-transparent',
              activeTab === 'pendenzen' && pendenciesCount > 0 ? 'border-red-600 text-red-600' : activeTab === 'pendenzen' ? 'border-green-600 text-green-700' : pendenciesCount > 0 ? 'text-red-600' : 'text-green-600'
            ]"
            @click="activeTab = 'pendenzen'"
          >
            Allgemein
          </button>
          <button
            :class="[
              'py-3 border-b-2 whitespace-nowrap transition-all font-medium',
              activeTab === 'bewertungen' ? 'border-b-2 font-bold' : 'border-transparent',
              activeTab === 'bewertungen' && pendingCount > 0 ? 'border-red-600 text-red-600' : activeTab === 'bewertungen' ? 'border-green-600 text-green-700' : pendingCount > 0 ? 'text-red-600' : 'text-green-600'
            ]"
            @click="activeTab = 'bewertungen'"
          >
            Bewertungen
          </button>
          <button
            :class="[
              'py-3 border-b-2 whitespace-nowrap transition-all font-medium',
              activeTab === 'unconfirmed' ? 'border-b-2 font-bold' : 'border-transparent',
              activeTab === 'unconfirmed' && unconfirmedNext24hCount > 0 ? 'border-red-600 text-red-600' : activeTab === 'unconfirmed' ? 'border-green-600 text-green-700' : unconfirmedNext24hCount > 0 ? 'text-red-600' : 'text-green-600'
            ]"
            @click="activeTab = 'unconfirmed'"
          >
            Unbestätigt
          </button>
        </div>
      </div>

      <!-- Content - Scrollable -->
      <div class="flex-1 overflow-y-auto">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <LoadingLogo size="xl" />
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
        <div v-else-if="pendingCount === 0 && unconfirmedNext24hCount === 0" class="flex items-center justify-center py-8">
          <div class="text-center px-4">
            <div class="text-6xl mb-4">🎉</div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Keine Pendenzen!</h3>
            <button 
              @click="closeModal"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Super! Schliessen
            </button>
          </div>
        </div>

        <!-- Pendenzen Tab -->
        <div v-else-if="activeTab === 'pendenzen'" class="p-4 space-y-3">
          <div v-if="userPendencies.length === 0" class="flex items-center justify-center py-8">
            <div class="text-center px-4">
              <div class="text-6xl mb-4">✅</div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Keine Pendenzen!</h3>
              <p class="text-gray-600 mb-4">Alle Aufgaben erledigt</p>
            </div>
          </div>

          <div v-else>
            <div
              v-for="pendency in userPendencies"
              :key="pendency.id"
              :class="[
                'rounded-lg border p-4 hover:shadow-md transition-all',
                pendency.status === 'abgeschlossen' ? 'border-green-300 bg-green-50' :
                pendency.status === 'überfällig' ? 'border-red-300 bg-red-50' :
                pendency.status === 'in_bearbeitung' ? 'border-yellow-300 bg-yellow-50' :
                'border-blue-300 bg-blue-50'
              ]"
            >
              <!-- Titel und Priority Badge nebeneinander -->
              <div class="flex items-center space-x-2 mb-3">
                <h4 class="font-semibold text-gray-900">{{ pendency.title }}</h4>
                <span :class="[
                  'text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap',
                  pendency.priority === 'kritisch' ? 'bg-red-200 text-red-800' :
                  pendency.priority === 'hoch' ? 'bg-orange-200 text-orange-800' :
                  pendency.priority === 'mittel' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-gray-200 text-gray-800'
                ]">
                  {{ pendency.priority }}
                </span>
              </div>

              <!-- Beschreibung -->
              <p v-if="pendency.description" class="text-sm text-gray-600 mb-3">{{ pendency.description }}</p>

              <!-- Datum und Dropdown auf gleicher Zeile -->
              <div class="flex items-center gap-3">
                <div class="text-xs text-gray-500">
                  <span>📅 {{ new Date(pendency.due_date).toLocaleDateString('de-CH') }}</span>
                </div>
                <div class="relative">
                  <select 
                    :value="pendency.status"
                    @change="(e) => changeStatus(pendency.id, (e.target as any).value)"
                    :class="[
                      'px-3 py-1.5 text-sm border rounded font-medium flex-shrink-0 appearance-none pr-8 cursor-pointer transition-colors',
                      pendency.status === 'abgeschlossen' ? 'bg-green-50 border-green-300 text-green-800 hover:bg-green-100' :
                      pendency.status === 'überfällig' ? 'bg-red-50 border-red-300 text-red-800 hover:bg-red-100' :
                      pendency.status === 'in_bearbeitung' ? 'bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100' :
                      'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100'
                    ]"
                    style="width: auto; min-width: 130px;"
                  >
                    <option value="pendent">Pendent</option>
                    <option value="in_bearbeitung">In Bearbeitung</option>
                    <option value="abgeschlossen">Abgeschlossen</option>
                  </select>
                  <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" :class="[
                    pendency.status === 'abgeschlossen' ? 'text-green-800' :
                    pendency.status === 'überfällig' ? 'text-red-800' :
                    pendency.status === 'in_bearbeitung' ? 'text-yellow-800' :
                    'text-blue-800'
                  ]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pending Appointments List (Bewertungen) -->
        <div v-else-if="activeTab === 'bewertungen'" class="p-3">
          <div v-if="evaluationAppointments.length === 0" class="flex items-center justify-center py-8">
            <div class="text-center px-4">
              <div class="text-6xl mb-4">✅</div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Keine Bewertungen ausstehend!</h3>
              <p class="text-gray-600 mb-4">Alle Lektionen bewertet</p>
            </div>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="appointment in evaluationAppointments"
            :key="appointment.id"
            :class="[
              'rounded-lg border p-3 hover:shadow-md transition-all cursor-pointer relative',
              getAppointmentBackgroundClass(appointment),
              appointment.status === 'pending_confirmation' ? 'border-red-300 bg-red-50' : ''
            ]"
            @click="openEvaluation(appointment)"
          >
            <!-- Vereinfachtes Layout -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <!-- Links: Name & Info -->
              <div class="flex-1">
                <h3 class="font-semibold text-gray-900">
                  {{ appointment.studentName }}
                </h3>
                
                <!-- Datum & Zeit - über den Badges auf Mobile -->
                <div class="mt-1 sm:hidden flex items-center gap-2">
                  <p class="text-sm text-gray-600 font-medium">
                    {{ appointment.formattedDate }}
                  </p>
                  <p class="text-sm text-gray-600 font-medium">
                    {{ appointment.formattedStartTime }} - {{ appointment.formattedEndTime }}
                  </p>
                </div>
                
                <!-- Zwei Spalten: Terminart (40%) & Zahlung (60%) -->
                <div class="mt-2 grid grid-cols-5 gap-4">
                  <!-- Linke Spalte: Terminart (40% = 2/5) -->
                  <div class="col-span-2">
                    <p class="text-xs text-gray-500 mb-1">Terminart</p>
                    <div class="flex items-center gap-1 flex-wrap">
                      <span 
                        :class="['text-xs px-2 py-1 rounded-full font-medium', getCategoryClass(appointment.type)]"
                        :style="getCategoryStyle(appointment.type)"
                      >
                        {{ getCategoryText(appointment.type) }}
                      </span>
                      <span :class="[
                        'text-xs px-2 py-1 rounded-full font-medium',
                        getEventTypeClass(appointment.event_type_code)
                      ]">
                        {{ getEventTypeText(appointment.event_type_code) }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- Rechte Spalte: Zahlung (60% = 3/5) -->
                  <div class="col-span-3">
                    <p class="text-xs text-gray-500 mb-1">Zahlung</p>
                    <div class="flex items-center gap-1 flex-wrap">
                      <span :class="[
                        'text-xs px-2 py-1 rounded-full font-medium',
                        getPaymentMethodClass(appointment.paymentMethod)
                      ]">
                        {{ getPaymentMethodText(appointment.paymentMethod) }}
                      </span>
                      <span v-if="appointment.hasPayment" :class="[
                        'text-xs px-2 py-1 rounded-full font-medium',
                        getPaymentStatusClass(appointment.paymentStatus)
                      ]">
                        {{ getPaymentStatusText(appointment.paymentStatus) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Rechts: Datum & Zeit - nur auf Desktop -->
              <div class="hidden sm:block text-right">
                <!-- Datum & Zeit -->
                <div class="flex items-center gap-2 justify-end">
                  <p class="text-sm text-gray-600 font-medium">
                    {{ appointment.formattedDate }}
                  </p>
                  <p class="text-sm text-gray-600 font-medium">
                    {{ appointment.formattedStartTime }} - {{ appointment.formattedEndTime }}
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Bewertungsstatus Badge oben rechts -->
            <div class="absolute top-2 right-2">
              <span :class="[
                'text-xs px-2 py-1 rounded-full font-medium',
                getPriorityClass(appointment)
              ]">
                {{ getPriorityText(appointment) }}
              </span>
            </div>
          </div>
          </div>
        </div>

        <!-- Unconfirmed Appointments -->
        <div v-else-if="activeTab === 'unconfirmed'" class="p-4 space-y-3">
          <!-- Termine Liste -->
          <div v-if="filteredUnconfirmedAppointments.length === 0" class="text-center py-8 text-gray-500">
            <p>Keine unbestätigten Termine</p>
          </div>
          
          <div
            v-for="appointment in filteredUnconfirmedAppointments"
            :key="appointment.id"
            :class="[
              'rounded-lg border p-4 hover:shadow-md transition-all relative',
              appointment.dueStatus === 'overdue_past' ? 'border-red-500 bg-red-50' :
              appointment.dueStatus === 'overdue_24h' ? 'border-orange-400 bg-orange-50' :
              appointment.dueStatus === 'due' ? 'border-yellow-400 bg-yellow-50' :
              'border-green-300 bg-green-50'
            ]"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-1">
                  <span class="text-sm font-semibold text-gray-700">Nicht bestätigt</span>
                  <span :class="['text-xs px-2 py-1 rounded-full font-medium', getDueStatusLabel(appointment.dueStatus).color]">
                    {{ getDueStatusLabel(appointment.dueStatus).label }}
                  </span>
                </div>
                <div class="text-gray-900 font-medium">{{ appointment.users?.first_name }} {{ appointment.users?.last_name }}</div>
                <div class="text-sm text-gray-600 mt-1">
                  {{ getAppointmentFormattedDate(appointment) }} • 
                  {{ getAppointmentFormattedTime(appointment, 'start') }} - 
                  {{ getAppointmentFormattedTime(appointment, 'end') }}
                </div>
              </div>
            </div>
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
      :student-category="getStudentCategory(selectedAppointment)"
      :current-user="props.currentUser"
      @close="closeEvaluationModal"
      @saved="onEvaluationSaved"
      @cancel="onCancelAppointment"
  />
  
  <!-- ✅ EXAM RESULT MODAL -->
  <ExamResultModal
    v-if="showExamResultModal"
    :is-visible="showExamResultModal"
    :appointment="currentExamAppointment"
    :current-user="currentUser"
    @close="closeExamResultModal"
    @exam-result-saved="onExamResultSaved"
  />

  <!-- Cash Payment Confirmation Modal -->
  <CashPaymentConfirmation
    v-if="showCashPaymentModal"
    :is-visible="showCashPaymentModal"
    :payment="currentPayment"
    :current-user-id="props.currentUser?.id"
    @close="showCashPaymentModal = false"
    @payment-confirmed="onCashPaymentConfirmed"
  />

  <!-- ✅ NEU: Appointment Cancellation Modal -->
  <AppointmentCancellationDetailsModal
    v-if="showCancellationModal"
    :is-open="showCancellationModal"
    :appointment="cancellationAppointment"
    @close="closeCancellationModal"
    @confirm="onCancellationCompleted"
  />
</template>

<script setup lang="ts">

import { logger } from '~/utils/logger'
import { ref, computed, watch, onMounted } from 'vue'
import { nextTick } from 'vue'
import { usePendingTasks } from '~/composables/usePendingTasks'
import { usePendencies } from '~/composables/usePendencies'
import { useCategoryData } from '~/composables/useCategoryData'
import { useCurrentUser } from '~/composables/useCurrentUser'
import EvaluationModal from '~/components/EvaluationModal.vue'
import CashPaymentConfirmation from '~/components/CashPaymentConfirmation.vue'
import ExamResultModal from '~/components/ExamResultModal.vue'
import AppointmentCancellationDetailsModal from '~/components/AppointmentCancellationDetailsModal.vue'
import LoadingLogo from '~/components/LoadingLogo.vue'

// Props
interface Props {
  isOpen: boolean
  currentUser: any
  defaultTab?: 'pendenzen' | 'bewertungen' | 'unconfirmed'
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
  unconfirmedNext24h,
  unconfirmedNext24hCount,
  unconfirmedWithStatus, // ✅ NEU: Mit Fälligkeits-Status
  isLoading,
  error,
  fetchPendingTasks,
  clearError
} = usePendingTasks()

// Category Data Composable
const { allCategories, loadCategories } = useCategoryData()

// Get current user
const { currentUser } = useCurrentUser()

// Pendencies composable
const { 
  pendencies, 
  loadPendencies, 
  changeStatus,
  isLoading: pendenciesLoading
} = usePendencies()

// Modal state
const showEvaluationModal = ref(false)
const selectedAppointment = ref<any>(null)
const activeTab = ref<'pendenzen' | 'bewertungen' | 'unconfirmed'>(props.defaultTab || 'pendenzen')


// Cash Payment Confirmation Modal
const showCashPaymentModal = ref(false)
const currentPayment = ref<any>(null)

// ✅ NEUE REFS FÜR EXAM RESULT
const showExamResultModal = ref(false)
const currentExamAppointment = ref<any>(null)

// Ref für gefilterte Pendenzen (wird von watch aktualisiert)
const userPendencies = ref<any[]>([])

// Watch: Update userPendencies whenever pendencies or currentUser changes
watch(
  () => [pendencies.value, props.currentUser?.id] as const,
  ([newPendencies, userId]) => {
    console.log('🔧 userPendencies watch triggered:', {
      currentUserId: userId,
      totalPendencies: newPendencies?.length,
      propsCurrentUserId: props.currentUser?.id
    })
    
    if (!userId) {
      userPendencies.value = []
      console.log('🔧 No userId, skipping filter')
      return
    }
    
    const filtered = (newPendencies || []).filter((p: any) => {
      const isAssignedToMe = p.assigned_to === userId
      const isCreatedByMe = p.created_by === userId
      const passes = (isAssignedToMe || isCreatedByMe) && p.status !== 'gelöscht'
      
      if (p.title.includes('Rechnungsadresse')) {
        console.log('🔧 Pendency filter debug:', {
          pendencyId: p.id,
          pendencyTitle: p.title,
          assigned_to: p.assigned_to,
          created_by: p.created_by,
          currentUserId: userId,
          isAssignedToMe,
          isCreatedByMe,
          passes
        })
      }
      
      return passes
    })
    
    console.log('🔧 userPendencies updated:', {
      totalPendencies: newPendencies?.length,
      currentUserId: userId,
      filteredCount: filtered.length,
      filtered: filtered.map(p => ({ id: p.id, title: p.title }))
    })
    
    userPendencies.value = filtered
  },
  { deep: true, immediate: true }
)

// Ref für Anzahl aktiver Pendenzen
const pendenciesCount = computed(() => {
  return userPendencies.value.filter((p: any) => p.status !== 'abgeschlossen').length
})

// Debug log für pendenciesCount
watch(pendenciesCount, (newCount) => {
  console.log('🔧 pendenciesCount changed:', newCount)
}, { immediate: true })

// Computed: Alle Bewertungen (inkl. pending_confirmation)
const evaluationAppointments = computed(() => {
  return formattedAppointments.value || []
})

// ✅ NEU: Gefilterte unbestätigte Termine - zeige ALLE unbestätigten Termine (Vergangenheit und Zukunft)
const filteredUnconfirmedAppointments = computed(() => {
  const all = unconfirmedWithStatus.value || []
  // Zeige ALLE unbestätigten Termine - keine Filterung nach dueStatus
  return all
})

// ✅ Hilfsfunktion: Status-Label und Farbe
const getDueStatusLabel = (status: string) => {
  switch (status) {
    case 'overdue_past':
      return { label: 'Termin vorbei', color: 'text-red-700 bg-red-100' }
    case 'overdue_24h':
      return { label: '< 24h', color: 'text-orange-700 bg-orange-100' }
    case 'due':
      return { label: 'Fällig', color: 'text-yellow-700 bg-yellow-100' }
    case 'upcoming':
      return { label: 'Noch Zeit', color: 'text-green-700 bg-green-100' }
    default:
      return { label: 'Unbekannt', color: 'text-gray-700 bg-gray-100' }
  }
}

// Computed: Formatierte unconfirmed appointments
const formattedUnconfirmedAppointments = computed(() => {
  return (unconfirmedNext24h.value || []).map((apt: any) => {
    return {
      ...apt,
      studentName: `${apt.users?.first_name || ''} ${apt.users?.last_name || ''}`.trim() || 'Unbekannt',
      formattedDate: formatLocalDate(apt.start_time),
      formattedStartTime: formatLocalTime(apt.start_time),
      formattedEndTime: formatLocalTime(apt.end_time)
    }
  })
})

// Methods
const closeModal = () => {
  logger.debug('🔥 PendenzenModal closing...')
  emit('close')
}

const parseUTCTime = (utcTimeString: string) => {
  // Parse UTC ISO string and convert to local time (same logic as CalendarComponent)
  let timeStr = utcTimeString
  // Normalize format: convert space format to ISO if needed
  if (timeStr.includes(' ') && !timeStr.includes('T')) {
    timeStr = timeStr.replace(' ', 'T')
  }
  // Ensure timezone suffix is properly formatted
  if (timeStr.includes('+00') && !timeStr.includes('+00:00')) {
    timeStr = timeStr.replace('+00', '+00:00')
  }
  if (!timeStr.includes('+') && !timeStr.includes('Z')) {
    timeStr += '+00:00'
  }
  
  const utcDate = new Date(timeStr)
  // Use toLocaleString to convert UTC to local timezone (Europe/Zurich)
  const localDateStr = utcDate.toLocaleString('sv-SE', { timeZone: 'Europe/Zurich' })
  const localDate = new Date(localDateStr)
  
  return localDate
}

const formatLocalDate = (dateTimeStr: string) => {
  const date = parseUTCTime(dateTimeStr)
  return date.toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const formatLocalTime = (dateTimeStr: string) => {
  const date = parseUTCTime(dateTimeStr)
  return date.toLocaleTimeString('de-CH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getAppointmentFormattedDate = (appointment: any) => {
  return appointment?.formattedDate || formatLocalDate(appointment?.start_time)
}

const getAppointmentFormattedTime = (appointment: any, type: 'start' | 'end') => {
  if (type === 'start') {
    return appointment?.formattedStartTime || formatLocalTime(appointment?.start_time)
  }
  return appointment?.formattedEndTime || formatLocalTime(appointment?.end_time)
}

// Hilfsfunktion für Student Category
const getStudentCategory = (appointment: any) => {
  // Priorität: 1. appointment_type, 2. type, 3. Erste Kategorie aus User-Kategorien, 4. Fallback 'A'
  let category = appointment?.appointment_type || appointment?.type || 'A'
  
  // Wenn der User mehrere Kategorien hat (z.B. 'B,A'), verwende den Termin-Typ
  // oder die erste Kategorie aus der User-Kategorie-Liste
  if (!category || category === 'A') {
    if (appointment?.users?.category) {
      const userCategories = appointment.users.category.split(',')
      category = userCategories[0] // Verwende die erste Kategorie
    }
  }
  
  logger.debug('🔥 getStudentCategory called:', {
    userCategory: appointment?.users?.category,
    appointmentType: appointment?.appointment_type,
    appointmentTypeField: appointment?.type,
    eventTypeCode: appointment?.event_type_code,
    finalCategory: category
  })
  return category
}

const openEvaluation = (appointment: any) => {
  logger.debug('🔥 PendenzenModal - opening evaluation for:', appointment.id)
  
  logger.debug('🔥 Student category debug:', {
    userCategory: appointment.users?.category,
    appointmentType: appointment.type,
    eventTypeCode: appointment.event_type_code,
    appointmentTypeField: appointment.appointment_type,
    finalCategory: getStudentCategory(appointment)
  })
  
  // ✅ PRÜFE OB ES EINE PRÜFUNG IST
  if (appointment.event_type_code === 'exam') {
    logger.debug('📝 Exam detected - showing exam result modal')
    showExamResultModal.value = true
    currentExamAppointment.value = appointment
  } 
  // ✅ PRÜFE OB ES EINE THEORIELEKTION IST
  else if (appointment.appointment_type === 'theory' || appointment.event_type_code === 'theory') {
    logger.debug('📚 Theory lesson detected - showing evaluation modal with theory criteria')
    showEvaluationModal.value = true
    selectedAppointment.value = appointment
  } 
  else {
    // Normale Lektion - zeige normale Bewertung
    logger.debug('📚 Lesson detected - showing evaluation modal')
    showEvaluationModal.value = true
    selectedAppointment.value = appointment
  }
}

const closeEvaluationModal = () => {
  logger.debug('🔥 PendenzenModal - closing evaluation modal')
  showEvaluationModal.value = false
  selectedAppointment.value = null
}

// ✅ EXAM RESULT MODAL FUNKTIONEN
const closeExamResultModal = () => {
  logger.debug('📝 PendenzenModal - closing exam result modal')
  showExamResultModal.value = false
  currentExamAppointment.value = null
}

const onExamResultSaved = async (appointmentId: string) => {
  logger.debug('🎉 PendenzenModal - exam result saved for:', appointmentId)
  
  // Lade Pendenzen neu um die aktualisierten Daten zu sehen
  await refreshData()
  logger.debug('✅ New pending count after exam result:', pendingCount.value)
  
  // Prüfe ob es eine Barzahlung gibt, die bestätigt werden muss
  await checkAndShowCashPaymentConfirmation(appointmentId)
  
  // Schließe das Exam Result Modal erst nach der Cash-Payment-Prüfung
  closeExamResultModal()
}

// Neue Hilfsfunktionen für Zahlungsinformationen
const getPaymentMethodClass = (method: string) => {
  const classes: Record<string, string> = {
    'cash': 'bg-yellow-100 text-yellow-800',
    'invoice': 'bg-gray-100 text-gray-800',
    'wallee': 'bg-blue-100 text-blue-800',
    'keine': 'bg-red-100 text-red-800'
  }
  return classes[method] || 'bg-gray-100 text-gray-800'
}

const getPaymentMethodText = (method: string) => {
  const texts: Record<string, string> = {
    'cash': 'Bar',
    'invoice': 'Rechn.',
    'wallee': 'Online',
    'credit': 'Guthaben',
    'keine': '-'
  }
  return texts[method] || method
}

const getPaymentStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    'pending': 'bg-orange-100 text-orange-800',
    'completed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800',
    'keine': 'bg-gray-100 text-gray-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getPaymentStatusText = (status: string) => {
  const texts: Record<string, string> = {
    'pending': 'Offen',
    'completed': 'Bezahlt',
    'failed': 'Fehler',
    'keine': '-'
  }
  return texts[status] || status
}

// ✅ KATEGORIE FUNKTIONEN - Dynamisch aus DB
const getCategoryClass = (categoryCode: string) => {
  const category = allCategories.value.find(cat => cat.code === categoryCode)
  
  // Wenn Farbe aus DB vorhanden, keine Tailwind-Klasse verwenden
  if (category?.color) {
    return 'text-gray-800'
  }
  
  // Fallback colors
  const classes: Record<string, string> = {
    'A': 'bg-blue-100 text-blue-800',
    'B': 'bg-green-100 text-green-800',
    'A1': 'bg-purple-100 text-purple-800',
    'A2': 'bg-indigo-100 text-indigo-800',
    'B1': 'bg-teal-100 text-teal-800',
    'C': 'bg-orange-100 text-orange-800',
    'D': 'bg-red-100 text-red-800'
  }
  return classes[categoryCode] || 'bg-gray-100 text-gray-800'
}

const getCategoryStyle = (categoryCode: string) => {
  const category = allCategories.value.find(cat => cat.code === categoryCode)
  
  if (category?.color) {
    // Verwende die Farbe aus der DB mit leichter Transparenz für den Hintergrund
    return {
      backgroundColor: `${category.color}40`, // 40 = 25% opacity in hex
      color: '#1f2937' // gray-800
    }
  }
  
  return {}
}

const getCategoryText = (categoryCode: string) => {
  // Zeige nur den Code, nicht die Beschreibung
  return categoryCode || 'Unbekannt'
}

// ✅ EVENT TYPE FUNKTIONEN
const getEventTypeClass = (eventType: string) => {
  const classes: Record<string, string> = {
    'exam': 'bg-red-100 text-red-800',
    'lesson': 'bg-blue-100 text-blue-800',
    'theory': 'bg-purple-100 text-purple-800',
    'practical': 'bg-green-100 text-green-800',
    'meeting': 'bg-yellow-100 text-yellow-800',
    'other': 'bg-gray-100 text-gray-800'
  }
  return classes[eventType] || 'bg-gray-100 text-gray-800'
}

const getEventTypeText = (eventType: string) => {
  const texts: Record<string, string> = {
    'exam': 'Prüfung',
    'lesson': 'Fahren',
    'theory': 'Theorie',
    'practical': 'Fahren',
    'meeting': 'Meeting',
    'other': 'Andere'
  }
  
  // Fallback: Wenn eventType null/undefined ist, versuche es aus dem type Feld
  if (!eventType) {
    return '?'
  }
  
  return texts[eventType] || eventType || '?'
}

const onEvaluationSaved = async (appointmentId: string) => {
  logger.debug('🎉 PendenzenModal - evaluation saved for:', appointmentId)
  
  // ✅ NEU: Wenn Termin pending_confirmation ist, setze ihn auf confirmed
  if (selectedAppointment.value?.status === 'pending_confirmation') {
    logger.debug('🔄 Updating appointment status from pending_confirmation to confirmed')
    await updateAppointmentStatus(appointmentId, 'confirmed')
  }
  
  // Lade Pendenzen neu um die aktualisierten Daten zu sehen
  await refreshData()
  logger.debug('✅ New pending count after evaluation:', pendingCount.value)
  
  // Prüfe ob es eine Barzahlung gibt, die bestätigt werden muss
  await checkAndShowCashPaymentConfirmation(appointmentId)
  
  // Schließe das Evaluation Modal erst nach der Cash-Payment-Prüfung
  closeEvaluationModal()
}

const refreshData = async () => {
  if (!props.currentUser?.id) {
    console.warn('⚠️ No current user ID available for refresh')
    return
  }
  
  logger.debug('🔄 PendenzenModal - refreshing data...')
  clearError()
  
  // Lade Kategorien aus der DB
  await loadCategories()
  
  // Lade Pending Tasks (Bewertungen + Unbestätigte)
  await fetchPendingTasks(props.currentUser.id, props.currentUser.role)
  
  // Lade Pendenzen für diesen User
  // Nutze tenant_id vom currentUser
  if (props.currentUser.tenant_id) {
    console.log('🔧 PendenzenModal.refreshData - calling loadPendencies with tenantId:', props.currentUser.tenant_id)
    await loadPendencies(props.currentUser.tenant_id)
    console.log('🔧 PendenzenModal.refreshData - loadPendencies completed, pendencies.value:', pendencies.value)
  } else {
    console.warn('⚠️ PendenzenModal.refreshData - no tenant_id available!')
  }
  
  logger.debug('✅ PendenzenModal - data refreshed, count:', pendingCount.value)
}

// ✅ NEU: Handler für Cancel-Event vom EvaluationModal
const showCancellationModal = ref(false)
const cancellationAppointment = ref<any>(null)

const onCancelAppointment = async (appointment: any) => {
  logger.debug('🚫 PendenzenModal - cancel requested for appointment:', appointment?.id)
  closeEvaluationModal()
  
  // ✅ Prüfe ob es eine Lektion/Exam/Theory ist (bezahlbar)
  const isLessonType = (eventType: string) => {
    return ['lesson', 'exam', 'theory'].includes(eventType)
  }
  
  const appointmentType = appointment.event_type_code || appointment.type || 'unknown'
  const isPayableAppointment = isLessonType(appointmentType)
  
  logger.debug('🗑️ Appointment type:', appointmentType, 'isPayable:', isPayableAppointment)
  
  if (isPayableAppointment) {
    // Für Lektionen: Öffne das Cancellation-Modal (mit Zahlungs-Details)
    cancellationAppointment.value = appointment
    showCancellationModal.value = true
  } else {
    // Für andere Events: Direkt löschen
    logger.debug('🗑️ Other event type - direct delete')
    await deleteAppointmentDirectly(appointment.id)
  }
}

const closeCancellationModal = () => {
  showCancellationModal.value = false
  cancellationAppointment.value = null
}

const onCancellationCompleted = async () => {
  logger.debug('✅ Appointment cancellation completed')
  closeCancellationModal()
  await refreshData()
}

// ✅ NEU: Direktes Löschen für nicht-zahlbare Events
const deleteAppointmentDirectly = async (appointmentId: string) => {
  try {
    logger.debug('🗑️ Deleting appointment directly:', appointmentId)
    
    const response = await $fetch('/api/staff/delete-appointment', {
      method: 'POST',
      body: {
        appointment_id: appointmentId,
        reason: 'Nicht stattgefunden / von Instruktor abgesagt'
      }
    }) as any
    
    if (response?.success) {
      logger.debug('✅ Appointment deleted successfully')
      await refreshData()
    } else {
      logger.warn('⚠️ Failed to delete appointment:', response?.error)
    }
  } catch (err) {
    logger.warn('⚠️ Error deleting appointment:', err)
  }
}

// ✅ NEU: Funktion um Termin-Status zu aktualisieren
const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
  try {
    logger.debug('🔄 Updating appointment', appointmentId, 'to status:', newStatus)
    
    const response = await $fetch('/api/staff/update-appointment', {
      method: 'POST',
      body: {
        appointment_id: appointmentId,
        status: newStatus
      }
    }) as any
    
    if (response?.success) {
      logger.debug('✅ Appointment status updated successfully')
    } else {
      logger.warn('⚠️ Failed to update appointment status:', response?.error)
    }
  } catch (err) {
    logger.warn('⚠️ Error updating appointment status:', err)
  }
}

/**
 * Prüft ob es eine Barzahlung gibt, die nach der Bewertung bestätigt werden muss
 */
const checkAndShowCashPaymentConfirmation = async (appointmentId: string) => {
  try {
    logger.debug('💰 [PendenzenModal] Checking for cash payment confirmation for appointment:', appointmentId)
    
    // ✅ ZUERST: Prüfe die Zahlungsmethode aus der payments Tabelle
    const supabase = getSupabase()
    logger.debug('💰 [PendenzenModal] Supabase client ready')
    
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('payment_method, payment_status')
      .eq('appointment_id', appointmentId)
      .maybeSingle() // ← .maybeSingle() da möglicherweise noch kein Payment existiert
    
    logger.debug('💰 [PendenzenModal] First query result:', { payment, error: paymentError })
    
    if (paymentError) {
      logger.debug('💰 [PendenzenModal] Error checking payment:', paymentError.message)
      return
    }
    
    if (!payment) {
      logger.debug('💰 [PendenzenModal] No payment record found for appointment - skipping cash payment check')
      return
    }
    
    logger.debug('💰 [PendenzenModal] Payment method:', payment.payment_method, 'status:', payment.payment_status)
    
    // ✅ NUR bei Barzahlung nach pending payment suchen
    if (payment.payment_method === 'cash' && payment.payment_status === 'pending') {
      logger.debug('💰 [PendenzenModal] Looking for pending cash payment...')
      
      const { data: payments, error } = await supabase
        .from('payments')
        .select('id, payment_method, payment_status, total_amount_rappen, metadata, tenant_id')
        .eq('appointment_id', appointmentId)
        .eq('payment_method', 'cash')
        .eq('payment_status', 'pending')
        .maybeSingle() // ← .maybeSingle() statt .single() um 406 Fehler zu vermeiden
      
      logger.debug('💰 [PendenzenModal] Cash payment query result:', { payments, error })
      
      if (payments) {
        logger.debug('💰 [PendenzenModal] Found pending cash payment:', payments)
        logger.debug('💰 [PendenzenModal] tenant_id in payment:', payments.tenant_id)
        currentPayment.value = payments
        showCashPaymentModal.value = true
        logger.debug('💰 [PendenzenModal] Modal shown, currentPayment set')
      } else {
        logger.debug('💰 [PendenzenModal] No pending cash payment found in payments table')
      }
    } else {
      logger.debug('💰 [PendenzenModal] No cash payment confirmation needed - method:', payment.payment_method, 'status:', payment.payment_status)
    }
    
  } catch (err: any) {
    console.error('❌ [PendenzenModal] Error checking cash payment:', err)
    console.error('❌ [PendenzenModal] Error details:', err.message)
  }
}

/**
 * Wird aufgerufen, wenn die Barzahlung bestätigt wurde
 */
const onCashPaymentConfirmed = async (payment: any) => {
  try {
    logger.debug('✅ [PendenzenModal] Cash payment confirmed for:', payment.id)
    logger.debug('✅ [PendenzenModal] Payment details:', payment)
    showCashPaymentModal.value = false
    logger.debug('✅ [PendenzenModal] Modal closed')
    currentPayment.value = null
    logger.debug('✅ [PendenzenModal] currentPayment cleared')
    
    // Lade Pendenzen neu um die aktualisierten Zahlungsinformationen zu sehen
    logger.debug('✅ [PendenzenModal] Refreshing data...')
    await refreshData()
    logger.debug('✅ [PendenzenModal] Data refreshed')
    
  } catch (err: any) {
    console.error('❌ [PendenzenModal] Error handling cash payment confirmation:', err)
  }
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
  // ✅ Nicht-bestätigte Termine haben höchste Priorität
  if (appointment.status === 'pending_confirmation') {
    return 'bg-red-100 text-red-800'
  }
  
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
  // ✅ Nicht-bestätigte Termine
  if (appointment.status === 'pending_confirmation') {
    const appointmentTime = new Date(appointment.start_time)
    const now = new Date()
    const hoursUntil = Math.ceil((appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (hoursUntil < 24) {
      return '⚠️ Nicht bestätigt (<24h)'
    } else {
      return '⚠️ Nicht bestätigt'
    }
  }
  
  const appointmentDate = new Date(appointment.start_time).toDateString()
  const today = new Date().toDateString()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayString = yesterday.toDateString()
  
  if (appointmentDate === today) {
    return 'Bewertung: Offen'
  } else if (appointmentDate === yesterdayString) {
    return 'Bewertung: Fällig'
  } else {
    return 'Bewertung: Überfällig'
  }
}

// Hilfsfunktion für Unbestätigt-Badge
const hoursUntil = (appointment: any) => {
  const start = new Date(appointment.start_time)
  const now = new Date()
  return Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60))
}

// Watch für Modal-Öffnung
watch(() => props.isOpen, async (newIsOpen) => {
  logger.debug('🔥 PendenzenModal isOpen changed:', newIsOpen)
  logger.debug('🔥 Current user in modal:', props.currentUser)
  
  if (newIsOpen && props.currentUser?.id) {
    logger.debug('🔄 PendenzenModal opened - loading data...')
    try {
      await refreshData()
      logger.debug('✅ refreshData completed')
    } catch (error) {
      console.error('❌ Error in refreshData:', error)
    }
    
    // Nutze MEHRERE nextTick um sicherzustellen, dass alle computed values aktualisiert sind
    logger.debug('⏳ Waiting for nextTick...')
    await nextTick()
    logger.debug('⏳ Waiting for timeout...')
    await new Promise(resolve => setTimeout(resolve, 100)) // Extra delay
    logger.debug('⏳ Waiting for second nextTick...')
    await nextTick()
    logger.debug('✅ All nextTicks completed')
    
    // Setze Tab anhand defaultTab, falls übergeben
    if (props.defaultTab) {
      activeTab.value = props.defaultTab
      logger.debug('📌 Using defaultTab:', props.defaultTab)
    } else {
      logger.debug('🔄 Starting tab selection logic...')
      try {
        // Debug: Direct access to pendencies.value
        console.log('🔧 Tab selection debug - pendencies.value:', pendencies.value)
        console.log('🔧 Tab selection debug - userPendencies.value:', userPendencies.value)
        console.log('🔧 Tab selection debug - currentUser.value?.id:', currentUser.value?.id)
        
        // Priorisiere den Tab mit den meisten Pendenzen
        const bewertungenCount = pendingCount.value || 0
        const unbestätigtCount = unconfirmedNext24hCount.value || 0
        const pendenzenCount = userPendencies.value?.length || 0
        
        logger.debug('📊 Tab selection - Final counts:', { 
          bewertungenCount, 
          unbestätigtCount,
          pendenzenCount,
          pendenciesValueLength: pendencies.value?.length
        })
        
        // Wähle den Tab mit den meisten Items
        if (pendenzenCount > 0 && pendenzenCount >= bewertungenCount && pendenzenCount >= unbestätigtCount) {
          activeTab.value = 'pendenzen'
          logger.debug('📌 Switching to Pendenzen tab (most pending)')
        } else if (unbestätigtCount > 0 && unbestätigtCount > bewertungenCount) {
          activeTab.value = 'unconfirmed'
          logger.debug('📌 Switching to Unbestätigt tab (more pending)')
        } else {
          activeTab.value = 'bewertungen'
          logger.debug('📌 Switching to Bewertungen tab')
        }
      } catch (error) {
        console.error('❌ Error in tab selection:', error)
        activeTab.value = 'pendenzen'  // Default to pendenzen now
      }
    }
  } else if (!newIsOpen) {
    logger.debug('ℹ️ PendenzenModal closed')
  } else {
    console.warn('⚠️ Modal opened but no user ID available')
  }
}, { immediate: true })

// Debug: Watch pendingCount changes
watch(pendingCount, (newCount, oldCount) => {
  logger.debug(`🔄 PendenzenModal - pending count changed: ${oldCount} → ${newCount}`)
}, { immediate: true })

// Debug: Watch pendencies and userPendencies
watch(() => pendencies.value, (newVal) => {
  console.log('🔧 pendencies.value changed:', {
    length: newVal?.length,
    items: newVal?.map(p => ({ id: p.id, assigned_to: p.assigned_to, created_by: p.created_by }))
  })
}, { deep: true })

watch(() => userPendencies.value, (newVal) => {
  console.log('🔧 userPendencies.value changed:', {
    length: newVal?.length,
    currentUserId: currentUser.value?.id,
    items: newVal?.map(p => ({ id: p.id, title: p.title, assigned_to: p.assigned_to }))
  })
}, { deep: true })

// Initial load wenn Component gemounted wird UND Modal bereits offen ist
onMounted(() => {
  if (props.isOpen && props.currentUser?.id) {
    logger.debug('🔄 PendenzenModal mounted with open state - loading data...')
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