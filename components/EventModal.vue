<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" @click.stop>
      
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 rounded-t-lg">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-semibold text-gray-900">
            {{ modalTitle }}
          </h3>
          <button @click="handleClose" class="text-gray-400 hover:text-gray-600 text-2xl">
            ✕
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-6 space-y-6">
        
        <!-- Student Selector -->
        <StudentSelector
          v-if="showStudentSelector"
          v-model="selectedStudent"
          :current-user="currentUser"
          :disabled="mode === 'view'"
          @student-selected="StudentSelected"
          @student-cleared="StudentCleared"
          @switch-to-other="switchToOtherEventType"
        />

        <!-- Event Type Selector -->
        <EventTypeSelector
          v-if="showEventTypeSelectionComputed"
          :selected-type="formData.selectedSpecialType"
          @event-type-selected="EventTypeSelected"
          @back-to-student="backToStudentSelection"
        />

        <!-- Title Input -->
        <div v-if="showTitleInput">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            📝 Titel
          </label>
          <input
            v-model="formData.title"
            type="text"
            class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            :placeholder="getDefaultTitle?.() || 'Titel eingeben...'"
            :disabled="mode === 'view'"
          />
        </div>

        <!-- Category & Duration Section -->
        <div v-if="showCategorySection" class="space-y-4">
          <CategorySelector
            v-model="formData.type"
            :selected-user="selectedStudent"
            :current-user="currentUser"
            :current-user-role="currentUser?.role"
            @category-selected="CategorySelected"
            @price-changed="handlePriceChanged"
            @durations-changed="handleDurationsChanged"
          />

          <DurationSelector
            v-model="formData.duration_minutes"
            :selected-category="selectedCategory"
            :current-user="currentUser"
            :available-durations="availableDurations"
            :price-per-minute="formData.price_per_minute"
            :disabled="mode === 'view'"
            @durations-changed="(durations: number[]) => {
              console.log('🔥 DIRECT TEST: EventModal received durations:', durations)
              availableDurations = durations  // ✅ OHNE .value
              handleDurationsChanged?.(durations)  // ✅ Optional chaining
            }"
          />
        </div>

        <!-- Date & Time Section -->
        <div v-if="showTimeSection" class="space-y-4 border-t pt-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">📅 Datum</label>
              <input 
                v-model="formData.startDate"
                type="date" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                :disabled="mode === 'view'"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">🕐 Startzeit</label>
              <input 
                v-model="formData.startTime"
                type="time" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                :disabled="mode === 'view'"
                @change="calculateEndTime"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">🕐 Endzeit</label>
              <input 
                v-model="formData.endTime"
                type="time" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                :disabled="mode === 'view'"
                required
              />
            </div>
          </div>
        </div>

        <!-- Location Section -->
        <LocationSelector
            v-if="showLocationSection"
            :model-value="formData.location_id"
            :selected-student-id="formData.user_id"
            :selected-student-name="selectedStudent?.first_name || ''"
            :current-staff-id="formData.staff_id"
            :disabled="mode === 'view'"
            @update:model-value="updateLocationId"
            @location-selected="handleLocationSelected"
            required
        />

        <!-- Staff Assignment (nur für Admins) -->
        <div v-if="showStaffSection">
          <label class="block text-sm font-medium text-gray-700 mb-2">👨‍🏫 Fahrlehrer</label>
          <select 
            v-model="formData.staff_id"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            :disabled="mode === 'view'"
            required
          >
            <option value="">Fahrlehrer wählen...</option>
            <option v-for="staff in availableStaff" :key="staff.id" :value="staff.id">
              {{ staff.first_name }} {{ staff.last_name }}
            </option>
          </select>
        </div>

           <PaymentDisplay
            :appointment-data="mode === 'edit' ? selectedAppointment : null"
            :category="formData.type"
            :duration="formData.duration_minutes"
            :user-id="formData.user_id"
            :staff-id="currentUser.id"
            :appointment-number="appointmentNumber"
            :show-payment-methods="ShowPaymentMethods"
            :discount="formData.discount ? {
              amount: formData.discount,
              type: (formData.discount_type || 'fixed') as 'fixed' | 'percentage',
              reason: formData.discount_reason
            } : undefined"
            @payment-success="handlePaymentSuccess"
            @payment-error="handlePaymentError"
            @payment-started="handlePaymentStarted"
            @payment-method-selected="handlePaymentMethodSelected"
          />

        <!-- Description -->
        <div v-if="showDescriptionField">
          <label class="block text-sm font-medium text-gray-700 mb-2">📝 Beschreibung/Notizen</label>
          <textarea
            v-model="formData.description"
            rows="3"
            class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            :placeholder="mode === 'view' ? 'Keine Beschreibung vorhanden' : 'Optional: Zusätzliche Informationen zum Termin'"
            :disabled="mode === 'view'"
          ></textarea>
        </div>

    

        <!-- Error Display -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <span class="text-red-400">❌</span>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-800">{{ error }}</p>
            </div>
          </div>
        </div>

        <!-- Validation Messages -->
        <div v-if="validationErrors.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <span class="text-yellow-400">⚠️</span>
            </div>
            <div class="ml-3">
              <h4 class="text-sm font-medium text-yellow-800">Bitte vervollständigen Sie folgende Felder:</h4>
              <ul class="mt-2 text-sm text-yellow-700 list-disc list-inside">
                <li v-for="validationError in validationErrors" :key="validationError">{{ validationError }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="sticky bottom-0 bg-gray-50 px-6 py-4 border-t rounded-b-lg">
        <div class="flex justify-between items-center">
          <div class="flex space-x-3">
            <button
              v-if="mode !== 'create' && canDelete"
              @click="handleDelete"
              :disabled="isLoading"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <span>🗑️</span>
              <span>Löschen</span>
            </button>
          </div>

          <div class="flex space-x-3">
            <button
              @click="handleClose"
              :disabled="isLoading"
              class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
            >
              {{ mode === 'view' ? 'Schließen' : 'Abbrechen' }}
            </button>

            <button
              v-if="mode !== 'view'"
              @click="handleSave"
              :disabled="isLoading || !isFormValid"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <span v-if="isLoading">⏳</span>
              <span v-else>💾</span>
              <span>{{ mode === 'create' ? 'Erstellen' : 'Speichern' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Composables
import { useEventModalForm } from '~/composables/useEventModalForm'
import { useEventModalHandlers } from '~/composables/useEventModalHandlers'
import { useEventModalWatchers } from '~/composables/useEventModalWatchers'

// Components
import StudentSelector from '~/components/StudentSelector.vue'
import EventTypeSelector from '~/components/EventTypeSelector.vue'
import CategorySelector from '~/components/CategorySelector.vue'
import DurationSelector from '~/components/DurationSelector.vue'
import LocationSelector from '~/components/LocationSelector.vue'
import PaymentDisplay from '~/components/PaymentDisplay.vue'


// Types & Interfaces
interface Props {
  isVisible: boolean
  eventData: any
  mode: 'view' | 'edit' | 'create'
  currentUser?: any
}

// Props & Emits
const props = withDefaults(defineProps<Props>(), {
  mode: 'create'
})


const emit = defineEmits<{
  'close': []
  'save': [data: any]
  'delete': [id: string]
  'appointment-saved': [appointment: any]    
  'appointment-updated': [appointment: any]  
  'appointment-deleted': [appointmentId: string] 
}>()

// ============ COMPOSABLES ============
// Form State Management
const {
  formData,
  selectedStudent,
  selectedCategory,
  selectedLocation,
  availableDurations,
  appointmentNumber,
  isLoading,
  error,
  // computed
  isFormValid,
  computedEndTime,
  totalPrice,
  // actions
  resetForm,
  populateFormFromAppointment,
  saveAppointment,
  deleteAppointment,
  getAppointmentNumber
} = useEventModalForm(props.currentUser)

// Event Handlers
// Destrukturiere die Funktionen direkt aus useEventModalHandlers
const {
  StudentSelected,
  StudentCleared,
  switchToOtherEventType,
  EventTypeSelected,
  backToStudentSelection,
  CategorySelected,
  handlePriceChanged,
  handleDurationsChanged,
  handleDurationChanged,
  handleLocationSelected,
  handleDiscountChanged,
  handlePaymentSuccess,
  handlePaymentError,
  handleSaveRequired,
  getDefaultTitle,
  calculateEndTime
} = useEventModalHandlers(
  formData,
  selectedStudent,
  selectedCategory,
  availableDurations, // Stelle sicher, dass availableDurations ein Ref ist, wenn es in useEventModalHandlers mutiert wird
  appointmentNumber
);

// Erstelle ein Objekt mit allen Handlern, die an useEventModalWatchers übergeben werden sollen.
// Dies ist wichtig, da useEventModalWatchers diese Funktionen "braucht", um sie in seinen Watchern auszuführen.
const handlerActions = {
  StudentSelected,
  StudentCleared,
  switchToOtherEventType,
  EventTypeSelected,
  backToStudentSelection,
  CategorySelected,
  handlePriceChanged,
  handleDurationsChanged,
  handleDurationChanged,
  handleLocationSelected,
  handleDiscountChanged,
  handlePaymentSuccess,
  handlePaymentError,
  handleSaveRequired,
  getDefaultTitle,
  calculateEndTime,
  // Füge hier auch die Methoden aus useEventModalForm hinzu, die Watchers eventuell benötigen könnten,
  // wie z.B. populateFormFromAppointment oder resetForm, wenn sie nicht direkt von den Handlern aufgerufen werden.
  populateFormFromAppointment,
  resetForm,
  getAppointmentNumber // Füge diese hinzu, falls sie direkt von Watchern benötigt wird
};

// ... (Rest deines Codes, z.B. die useEventModalWatchers-Initialisierung)

// Beispiel, wie useEventModalWatchers aufgerufen wird (Annahme):
const watchers = useEventModalWatchers(
  props,
  formData,
  selectedStudent,
  // Füge hier weitere benötigte Refs hinzu, die die Watcher direkt überwachen müssen
  availableLocations, // Annahme: availableLocations ist ein Ref, das von Watchern überwacht wird
  appointmentNumber,  // Annahme: appointmentNumber ist ein Ref, das von Watchern überwacht wird
  handlerActions      // Übergebe das Aktionen-Objekt
);

// Initialisiere die Watcher
watchers.setupAllWatchers();

// Additional EventModal-specific state
const availableStaff = ref<any[]>([])
const showEventTypeSelection = ref(false)
const availableLocations = ref<any[]>([])


// ============ COMPUTED PROPERTIES ============
const modalTitle = computed(() => {
  switch (props.mode) {
    case 'create': return '➕ Neuen Termin erstellen'
    case 'edit': return '✏️ Termin bearbeiten'
    case 'view': return '👁️ Termin anzeigen'
    default: return 'Termin'
  }
})

// Show/Hide Logic
const showStudentSelector = computed(() => {
  return formData.value.eventType === 'lesson' && !showEventTypeSelection.value
})

const showEventTypeSelectionComputed = computed(() => {
  return showEventTypeSelection.value
})

const showTitleInput = computed(() => {
  // Für "andere Terminarten" - immer anzeigen
  if (formData.value.eventType !== 'lesson' || formData.value.selectedSpecialType !== '') {
    return true
  }
  
  // Für Fahrstunden - nur anzeigen wenn Schüler ausgewählt wurde
  if (formData.value.eventType === 'lesson') {
    return !!selectedStudent.value
  }
  
  return false
})

const showCategorySection = computed(() => {
  return formData.value.eventType === 'lesson' && selectedStudent.value
})

const showTimeSection = computed(() => {
  return formData.value.eventType === 'lesson' ? 
         !!selectedStudent.value : 
         !!formData.value.selectedSpecialType
})

const showLocationSection = computed(() => {
  return showTimeSection.value
})

const showStaffSection = computed(() => {
  return showTimeSection.value && props.currentUser?.role === 'admin'
})

const showPriceSection = computed(() => {
  return showTimeSection.value && formData.value.eventType === 'lesson'
})

const showPaymentSection = computed(() => {
  return showPriceSection.value && props.mode !== 'view'
})

const showDescriptionField = computed(() => {
  return showTimeSection.value
})

const showStatusField = computed(() => {
  return props.mode !== 'create' && 
         (props.currentUser?.role === 'staff' || props.currentUser?.role === 'admin')
})

const canDelete = computed(() => {
  return props.currentUser?.role === 'admin' || 
         (props.currentUser?.role === 'staff' && formData.value.staff_id === props.currentUser?.id)
})

// ✅ Korrigierte Validierung - nur nach Schüler-Auswahl
const validationErrors = computed(() => {
  const errors: string[] = []
  
  // ✅ Keine Validierung anzeigen wenn noch kein Schüler/Terminart ausgewählt
  if (formData.value.eventType === 'lesson' && !selectedStudent.value) {
    return []
  }
  
  if (formData.value.eventType !== 'lesson' && !formData.value.selectedSpecialType) {
    return []
  }
  
  // ✅ Ab hier normale Validierung
  if (!formData.value.title.trim()) {
    errors.push('Titel ist erforderlich')
  }
  
  if (formData.value.eventType === 'lesson') {
    if (!selectedStudent.value) errors.push('Schüler muss ausgewählt werden')
    if (!formData.value.type) errors.push('Kategorie muss ausgewählt werden')
  }
  
  if (!formData.value.startDate) errors.push('Datum ist erforderlich')
  if (!formData.value.startTime) errors.push('Startzeit ist erforderlich')
  if (!formData.value.endTime) errors.push('Endzeit ist erforderlich')
  
  // ✅ FIX: Korrekte Location-Validierung mit der richtigen Variable
  // ✅ Erweiterte Location-Validierung
    const hasRealLocation = formData.value.location_id && formData.value.location_id !== ''
    const hasTemporaryLocation = selectedLocation.value?.id?.startsWith('temp_')

    if (!hasRealLocation && !hasTemporaryLocation) {
      errors.push('Standort ist erforderlich')
    }
  
  // ✅ FIX 2: Staff-Validierung nur für Admins, Staff wird automatisch gesetzt
  if (props.currentUser?.role === 'admin' && !formData.value.staff_id) {
    errors.push('Fahrlehrer ist erforderlich')
  }
  // Für Staff: Automatisch setzen falls nicht vorhanden
  else if (props.currentUser?.role === 'staff' && !formData.value.staff_id) {
    formData.value.staff_id = props.currentUser.id
  }
  
  return errors
})

const selectedAppointment = computed(() => props.eventData)


// ============ METHODS ============
const initializeFormData = () => {
  console.log('🎯 EventModal - Initializing form data, mode:', props.mode)
  
  if (props.mode === 'create') {
    // Set defaults for new appointment
    let startDate = ''
    let startTime = '08:00'
    let preselectedUserId = ''
    
    // Check if we have calendar data
    if (props.eventData) {
      if (props.eventData.clickedDate) {
        const clickedDate = new Date(props.eventData.clickedDate)
        startDate = clickedDate.toISOString().split('T')[0]
        startTime = clickedDate.toTimeString().slice(0, 5)
      } else if (props.eventData.start) {
        const startDateTime = new Date(props.eventData.start)
        startDate = startDateTime.toISOString().split('T')[0]
        startTime = startDateTime.toTimeString().slice(0, 5)
      }
      
      // Check for preselected student
      if (props.eventData.user_id) {
        preselectedUserId = props.eventData.user_id
      } else if (props.eventData.extendedProps?.user_id) {
        preselectedUserId = props.eventData.extendedProps.user_id
      }
    }
    
    // Fallback to current date
    if (!startDate) {
      startDate = new Date().toISOString().split('T')[0]
    }
    
    formData.value.startDate = startDate
    formData.value.startTime = startTime
    formData.value.endTime = calculateEndTimeFromStart(startTime, 45)
    formData.value.user_id = preselectedUserId
    
    // Set default staff
    if (props.currentUser?.role === 'staff' && !formData.value.staff_id) {
    formData.value.staff_id = props.currentUser.id
    console.log('🎯 Auto-set staff_id for logged-in staff:', props.currentUser.id)
  }
    
    // Load student if preselected
    if (preselectedUserId) {
      loadStudentData(preselectedUserId)
    }
    
  } else if (props.eventData) {
    // Load existing appointment data
    populateFormFromAppointment(props.eventData)
    
    if (formData.value.user_id) {
      loadStudentData(formData.value.user_id)
    }
  }
}

const calculateEndTimeFromStart = (startTime: string, durationMinutes: number): string => {
  if (!startTime) return ''
  
  const [hours, minutes] = startTime.split(':').map(Number)
  const startDate = new Date()
  startDate.setHours(hours, minutes, 0, 0)
  
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
  return endDate.toTimeString().slice(0, 5)
}

const loadStudentData = async (userId: string) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    
    if (data) {
      selectedStudent.value = data
      
      // Auto-set category and price
      if (data.category) {
        const primaryCategory = data.category.split(',')[0].trim()
        formData.value.type = primaryCategory
      }
    }
  } catch (err) {
    console.error('❌ Error loading student data:', err)
  }
}

const loadStaff = async () => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('role', 'staff')
      .eq('is_active', true)
      .order('first_name')
    
    if (error) throw error
    availableStaff.value = data || []
  } catch (err) {
    console.error('❌ Error loading staff:', err)
  }
}

const updateLocationId = (locationId: string | null) => {
  formData.value.location_id = locationId || ''
  console.log('📍 Location ID updated via model-value:', locationId)
}

const handlePaymentStatusChanged = (isPaid: boolean) => {
  formData.value.is_paid = isPaid
}

// ============ EVENT HANDLERS ============
const handleClose = () => {
  console.log('🚪 EventModal - Closing')
  resetForm()
  showEventTypeSelection.value = false
  emit('close')
}

const handleSave = async () => {
  console.log('💾 EventModal - Saving appointment')
  if (!isFormValid.value) {
    error.value = 'Bitte füllen Sie alle erforderlichen Felder aus'
    return
  }
  
  try {
    const mode = props.mode === 'edit' ? 'edit' : 'create'
    const eventId = props.mode === 'edit' ? formData.value.id : undefined
    const result = await saveAppointment(mode, eventId)
    
    console.log('✅ EventModal - Save successful, emitting events:', { mode, resultId: result?.id })
    
    // Bestehende Emits
    emit('save', result)
    
    // 🔥 NEU: Calendar Refresh Emits
    if (mode === 'edit') {
      console.log('📤 Emitting appointment-updated')
      emit('appointment-updated', result)
    } else {
      console.log('📤 Emitting appointment-saved')
      emit('appointment-saved', result)
    }
    
    handleClose()
  } catch (err: any) {
    console.error('❌ EventModal - Save error:', err)
    // Error is already set in the composable
  }
}

const handleDelete = async () => {
  try {
    const eventId = props.eventData?.id
    await deleteAppointment(eventId)
    
    // Bestehende Emits
    emit('delete', eventId)
    
    // 🔥 NEU: Calendar Refresh Emit
    emit('appointment-deleted', eventId)
    
    handleClose()
  } catch (err: any) {
    console.error('❌ EventModal - Delete error:', err)
  }
}

const handlePaymentStarted = (method: string) => {
  console.log('🔄 Payment started:', method)
}

// ============ WATCHERS ============
// Setup watchers using the composable
const watchers = useEventModalWatchers(
  props,
  formData,
  selectedStudent,
  availableLocations,
  appointmentNumber,
  {
    handleStudentSelected: handleStudentSelected || (() => {}),
    handleCategorySelected: handleCategorySelected || (() => {}),
    handleDurationChanged: handleDurationChanged || (() => {}),
    handleLocationSelected: handleLocationSelected || (() => {}),
    calculateEndTime: calculateEndTime || (() => {}),
    getDefaultTitle: getDefaultTitle || (() => 'Neuer Termin')
  }
)

// Initialize watchers
watchers.setupAllWatchers()

// Modal visibility watcher
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    console.log('👁️ EventModal - Modal opened')
    resetForm()
    initializeFormData()
    loadStaff()
  }
})

// Auto-generate title when student changes
watch(selectedStudent, () => {
  if (formData.value.eventType === 'lesson' && selectedStudent.value) {
    formData.value.title = getDefaultTitle?.() || `${selectedStudent.value.first_name} - Fahrstunde`
    formData.value.user_id = selectedStudent.value.id
  }
})

// In EventModal.vue - neuer Watcher
watch([() => formData.value.type, () => selectedCategory.value], ([categoryCode, category]) => {
  if (categoryCode && category?.availableDurations) {
    console.log('🔥 DIRECT FIX: Setting durations from category:', category.availableDurations)
    availableDurations.value = [...category.availableDurations]
  }
}, { immediate: true, deep: true })
// ============ LIFECYCLE ============
onMounted(() => {
  console.log('🔥 EventModal - Component mounted')
})
</script>

<style scoped>
input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

input:disabled, select:disabled, textarea:disabled {
  background-color: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

button:not(:disabled):hover {
  transform: translateY(-1px);
  transition: all 0.2s ease;
}
</style>