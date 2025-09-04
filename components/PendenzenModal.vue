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
              'rounded-lg border p-4 hover:shadow-md transition-all cursor-pointer relative',
              getAppointmentBackgroundClass(appointment)
            ]"
            @click="openEvaluation(appointment)"
          >
            <!-- Vereinfachtes Layout -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <!-- Links: Name & Kategorie -->
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
                
                <!-- Alle Badges in einer Reihe -->
                <div class="mt-2 flex items-center gap-2 flex-wrap">
                  <!-- Kategorie Badge -->
                  <span :class="[
                    'text-xs px-2 py-1 rounded-full font-medium',
                    getCategoryClass(appointment.type)
                  ]">
                    {{ getCategoryText(appointment.type) }}
                  </span>
                  
                  <!-- Event Type Badge -->
                  <span :class="[
                    'text-xs px-2 py-1 rounded-full font-medium',
                    getEventTypeClass(appointment.event_type_code)
                  ]">
                    {{ getEventTypeText(appointment.event_type_code) }}
                  </span>
                  
                  <!-- Zahlungsmethode Badge -->
                  <span :class="[
                    'text-xs px-2 py-1 rounded-full font-medium',
                    getPaymentMethodClass(appointment.paymentMethod)
                  ]">
                    {{ getPaymentMethodText(appointment.paymentMethod) }}
                  </span>
                  
                  <!-- Zahlungsstatus Badge -->
                  <span v-if="appointment.hasPayment" :class="[
                    'text-xs px-2 py-1 rounded-full font-medium',
                    getPaymentStatusClass(appointment.paymentStatus)
                  ]">
                    {{ getPaymentStatusText(appointment.paymentStatus) }}
                  </span>
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
      </div>

    <!-- Evaluation Modal (außerhalb des Hauptmodals) -->
    <EvaluationModal
      v-if="showEvaluationModal"
      :is-open="showEvaluationModal"
      :appointment="selectedAppointment"
      :student-category="getStudentCategory(selectedAppointment)"
      :current-user="currentUser"
      @close="closeEvaluationModal"
      @saved="onEvaluationSaved"
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
      :current-user-id="currentUser?.id"
      @close="showCashPaymentModal = false"
      @payment-confirmed="onCashPaymentConfirmed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePendingTasks } from '~/composables/usePendingTasks'
import EvaluationModal from '~/components/EvaluationModal.vue'
import CashPaymentConfirmation from '~/components/CashPaymentConfirmation.vue'
import ExamResultModal from '~/components/ExamResultModal.vue'
import LoadingLogo from '~/components/LoadingLogo.vue'
import { getSupabase } from '~/utils/supabase'

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

// Cash Payment Confirmation Modal
const showCashPaymentModal = ref(false)
const currentPayment = ref<any>(null)

// ✅ NEUE REFS FÜR EXAM RESULT
const showExamResultModal = ref(false)
const currentExamAppointment = ref<any>(null)


// Methods
const closeModal = () => {
  console.log('🔥 PendenzenModal closing...')
  emit('close')
}

// Hilfsfunktion für Student Category
const getStudentCategory = (appointment: any) => {
  // Priorität: 1. Termin-Typ, 2. Erste Kategorie aus User-Kategorien, 3. Fallback 'A'
  let category = appointment?.type || 'A'
  
  // Wenn der User mehrere Kategorien hat (z.B. 'B,A'), verwende den Termin-Typ
  // oder die erste Kategorie aus der User-Kategorie-Liste
  if (appointment?.users?.category && !appointment?.type) {
    const userCategories = appointment.users.category.split(',')
    category = userCategories[0] // Verwende die erste Kategorie
  }
  
  console.log('🔥 getStudentCategory called:', {
    userCategory: appointment?.users?.category,
    appointmentType: appointment?.type,
    finalCategory: category
  })
  return category
}

const openEvaluation = (appointment: any) => {
  console.log('🔥 PendenzenModal - opening evaluation for:', appointment.id)
  console.log('🔥 Student category debug:', {
    userCategory: appointment.users?.category,
    appointmentType: appointment.type,
    eventTypeCode: appointment.event_type_code,
    finalCategory: getStudentCategory(appointment)
  })
  
  // ✅ PRÜFE OB ES EINE PRÜFUNG IST
  if (appointment.event_type_code === 'exam') {
    console.log('📝 Exam detected - showing exam result modal')
    showExamResultModal.value = true
    currentExamAppointment.value = appointment
  } else {
    // Normale Lektion - zeige normale Bewertung
    console.log('📚 Lesson detected - showing evaluation modal')
    showEvaluationModal.value = true
    selectedAppointment.value = appointment
  }
}

const closeEvaluationModal = () => {
  console.log('🔥 PendenzenModal - closing evaluation modal')
  showEvaluationModal.value = false
  selectedAppointment.value = null
}

// ✅ EXAM RESULT MODAL FUNKTIONEN
const closeExamResultModal = () => {
  console.log('📝 PendenzenModal - closing exam result modal')
  showExamResultModal.value = false
  currentExamAppointment.value = null
}

const onExamResultSaved = async (appointmentId: string) => {
  console.log('🎉 PendenzenModal - exam result saved for:', appointmentId)
  
  // Pendenzen-Liste aktualisieren
  await fetchPendingTasks(props.currentUser.id)
  
  // Das Composable wird automatisch aktualisiert
  console.log('✅ New pending count after exam result:', pendingCount.value)
  
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
    'invoice': 'Rechnung',
    'wallee': 'Online',
    'keine': 'Keine'
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
    'pending': 'Ausstehend',
    'completed': 'Bezahlt',
    'failed': 'Fehlgeschlagen',
    'keine': 'Keine'
  }
  return texts[status] || status
}

// ✅ KATEGORIE FUNKTIONEN
const getCategoryClass = (category: string) => {
  const classes: Record<string, string> = {
    'A': 'bg-blue-100 text-blue-800',
    'B': 'bg-green-100 text-green-800',
    'A1': 'bg-purple-100 text-purple-800',
    'A2': 'bg-indigo-100 text-indigo-800',
    'B1': 'bg-teal-100 text-teal-800',
    'C': 'bg-orange-100 text-orange-800',
    'D': 'bg-red-100 text-red-800'
  }
  return classes[category] || 'bg-gray-100 text-gray-800'
}

const getCategoryText = (category: string) => {
  const texts: Record<string, string> = {
    'A': 'Auto',
    'B': 'Motorrad',
    'A1': 'Motorrad A1',
    'A2': 'Motorrad A2',
    'B1': 'Motorrad B1',
    'C': 'LKW',
    'D': 'Bus'
  }
  return texts[category] || category || 'Unbekannt'
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
    'lesson': 'Fahrlektion',
    'theory': 'Theorie',
    'practical': 'Praxis',
    'meeting': 'Meeting',
    'other': 'Sonstiges'
  }
  
  // Fallback: Wenn eventType null/undefined ist, versuche es aus dem type Feld
  if (!eventType) {
    return 'Unbekannt'
  }
  
  return texts[eventType] || eventType || 'Unbekannt'
}

const onEvaluationSaved = async (appointmentId: string) => {
  console.log('🎉 PendenzenModal - evaluation saved for:', appointmentId)
  
  // Das Composable wird automatisch aktualisiert durch markAsCompleted
  console.log('✅ New pending count after evaluation:', pendingCount.value)
  
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
  
  console.log('🔄 PendenzenModal - refreshing data...')
  clearError()
  await fetchPendingTasks(props.currentUser.id, props.currentUser.role)
  console.log('✅ PendenzenModal - data refreshed, count:', pendingCount.value)
}

/**
 * Prüft ob es eine Barzahlung gibt, die nach der Bewertung bestätigt werden muss
 */
const checkAndShowCashPaymentConfirmation = async (appointmentId: string) => {
  try {
    console.log('💰 Checking for cash payment confirmation...')
    
    // ✅ ZUERST: Prüfe die Zahlungsmethode aus der payments Tabelle
    const supabase = getSupabase()
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('payment_method, payment_status')
      .eq('appointment_id', appointmentId)
      .maybeSingle() // ← .maybeSingle() da möglicherweise noch kein Payment existiert
    
    if (paymentError) {
      console.log('💰 Error checking payment:', paymentError.message)
      return
    }
    
    if (!payment) {
      console.log('💰 No payment record found for appointment - skipping cash payment check')
      return
    }
    
    console.log('💰 Payment method:', payment.payment_method, 'status:', payment.payment_status)
    
    // ✅ NUR bei Barzahlung nach pending payment suchen
    if (payment.payment_method === 'cash' && payment.payment_status === 'pending') {
      console.log('💰 Looking for pending cash payment...')
      
      const { data: payments, error } = await supabase
        .from('payments')
        .select('id, payment_method, payment_status, total_amount_rappen, metadata')
        .eq('appointment_id', appointmentId)
        .eq('payment_method', 'cash')
        .eq('payment_status', 'pending')
        .maybeSingle() // ← .maybeSingle() statt .single() um 406 Fehler zu vermeiden
      
      if (payments) {
        console.log('💰 Found pending cash payment:', payments)
        currentPayment.value = payments
        showCashPaymentModal.value = true
      } else {
        console.log('💰 No pending cash payment found in payments table')
      }
    } else {
      console.log('💰 No cash payment confirmation needed - method:', payment.payment_method, 'status:', payment.payment_status)
    }
    
  } catch (err: any) {
    console.error('❌ Error checking cash payment:', err)
  }
}

/**
 * Wird aufgerufen, wenn die Barzahlung bestätigt wurde
 */
const onCashPaymentConfirmed = async (payment: any) => {
  try {
    console.log('✅ Cash payment confirmed for:', payment.id)
    showCashPaymentModal.value = false
    currentPayment.value = null
    
    // Optional: Zeige eine Bestätigungsnachricht
    // Hier könnte man ein Toast oder eine andere Benachrichtigung anzeigen
    
  } catch (err: any) {
    console.error('❌ Error handling cash payment confirmation:', err)
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
    return 'Bewertung: Offen'
  } else if (appointmentDate === yesterdayString) {
    return 'Bewertung: Fällig'
  } else {
    return 'Bewertung: Überfällig'
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