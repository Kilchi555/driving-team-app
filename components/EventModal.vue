
<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div class="fixed top-2 left-2 right-2 bottom-20 bg-white rounded-lg overflow-y-auto z-50" @click.stop>
      
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
        <div v-if="showStudentSelector">
          <StudentSelector
            ref="studentSelectorRef"
            v-model="selectedStudent"
            :current-user="currentUser"
            :disabled="mode === 'view'"
            :auto-load="shouldAutoLoadStudents"
            :is-freeslot-mode="isFreeslotMode"  
           @student-selected="handleStudentSelected"
            @student-cleared="handleStudentCleared"
            @switch-to-other="switchToOtherEventType"
          />
        </div>

        <!-- Lesson Type Selector -->
        <div v-if="selectedStudent && formData.eventType === 'lesson'">
          <LessonTypeSelector
            v-model="selectedLessonType"
            :selected-type="selectedLessonType"
            :disabled="mode === 'view'"
            @lesson-type-selected="handleLessonTypeSelected"
          />
        </div>

        <!-- Prüfungsstandort Auswahl (nur bei Prüfungen) -->
        <div v-if="formData.appointment_type === 'exam'" class="space-y-2">
          <ExamLocationSelector
            :current-staff-id="currentUser?.id || ''"
            v-model="selectedExamLocation"
            @update:modelValue="handleExamLocationSelected"
          />
        </div>

        <!-- Event Type Selector -->
        <div v-if="showEventTypeSelector">
          <EventTypeSelector
            :selected-type="formData.selectedSpecialType"
            @event-type-selected="handleEventTypeSelected"
            @back-to-student="backToStudentSelection"
          />
        </div>

        <!-- Staff Selector für andere Terminarten -->
        <div v-if="formData.eventType === 'other' && formData.selectedSpecialType">
          <StaffSelector
            ref="staffSelectorRef"
            v-model="invitedStaffIds"
            :current-user="currentUser"
            :disabled="mode === 'view'"
            @selection-changed="handleStaffSelectionChanged"
          />
        </div>

        <!-- Customer Invite Selector für andere Terminarten -->
        <div v-if="formData.eventType === 'other' && formData.selectedSpecialType">
          <CustomerInviteSelector
            v-model="invitedCustomers"
            :current-user="currentUser"
            :disabled="mode === 'view'"
            @customers-added="handleCustomersAdded"
            @customers-cleared="handleCustomersCleared"
          />
        </div>

       <!-- Title Input -->
        <TitleInput
          :title="formData.title"
          :event-type="formData.eventType as 'lesson' | 'staff_meeting' | 'other'"
          :selected-student="selectedStudent"
          :selected-special-type="formData.selectedSpecialType"
          :category-code="formData.type"
          :selected-location="selectedLocation"
          :disabled="mode === 'view'"
          @update:title="formData.title = $event"
          @title-generated="handleTitleGenerated"
        />

        <!-- Category & Duration Section -->
        <div v-if="selectedStudent" class="space-y-4">
          <CategorySelector
            v-model="formData.type"
            :selected-user="selectedStudent"
            :current-user="currentUser"
            :current-user-role="currentUser?.role"
            @category-selected="handleCategorySelected"
            @price-changed="handlePriceChanged"
            @durations-changed="handleDurationsChanged"
          />

          <DurationSelector
            v-if="formData.type"
            v-model="formData.duration_minutes"
            :available-durations="availableDurations"
            :price-per-minute="formData.price_per_minute"
            :disabled="mode === 'view'"
            @duration-changed="handleDurationChanged"
          />
        </div>
          <!-- Time Section -->
          <div v-if="showTimeSection">
            <TimeSelector
              :start-date="formData.startDate"
              :start-time="formData.startTime"
              :end-time="formData.endTime"
              :duration-minutes="formData.duration_minutes"
              :event-type="(formData.eventType as 'lesson' | 'staff_meeting' | 'other')"
              :selected-student="selectedStudent"
              :selected-special-type="formData.selectedSpecialType"
              :disabled="mode === 'view'"
              :mode="mode"
              @update:start-date="handleStartDateUpdate"
              @update:start-time="handleStartTimeUpdate"
              @update:end-time="handleEndTimeUpdate"
              @time-changed="handleTimeChanged"
            />
          </div>

          <!-- Location Section -->
          <div v-if="showTimeSection">
            <LocationSelector
              :model-value="formData.location_id"
              :selected-student-id="selectedStudent?.id"
              :current-staff-id="formData.staff_id"
              :disabled="mode === 'view'"
              @update:model-value="updateLocationId"
              @location-selected="handleLocationSelected"
            />
          </div>

        <!-- Price Display - nur für Fahrstunden -->
        <div v-if="selectedStudent && formData.duration_minutes && formData.eventType === 'lesson'">
            <PriceDisplay
              :event-type="formData.eventType"
              :duration-minutes="formData.duration_minutes"
              :price-per-minute="dynamicPricing.pricePerMinute || formData.price_per_minute"
              :is-paid="formData.is_paid"
              :admin-fee="dynamicPricing.adminFeeChf || 0"
              :appointment-number="dynamicPricing.appointmentNumber || 1"
              :is-second-or-later-appointment="dynamicPricing.hasAdminFee || false"
              :discount="formData.discount || 0"
              :discount-type="(formData.discount_type as 'fixed') || 'fixed'"
              :discount-reason="formData.discount_reason || ''"
              :allow-discount-edit="currentUser?.role === 'staff' || currentUser?.role === 'admin'"
              :selected-date="formData.startDate"
              :start-time="formData.startTime"
              :end-time="formData.endTime"
              :current-user="currentUser"
              :selected-student="selectedStudent"
              @discount-changed="handleDiscountChanged"
              @payment-status-changed="handlePaymentStatusChanged"
              @payment-mode-changed="handlePaymentModeChanged"
            />

             <!-- Debug Info (entfernbar) -->
          <div v-if="dynamicPricing.error" class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            ❌ {{ dynamicPricing.error }}
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-sm text-red-800">❌ {{ error }}</p>
        </div>

        <!-- Loading Display -->
        <div v-if="isLoading" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p class="text-sm text-blue-800">💾 Termin wird gespeichert...</p>
          </div>
        </div>

      </div>

        <!-- Footer mit Actions -->
        <div class="bg-gray-50 px-4 py-3 border-t flex justify-between">
          <!-- Links: Löschen-Button (nur bei edit/view mode) -->
          <div>
            <button
              v-if="mode !== 'create' && eventData?.id"
              @click="handleDelete"
              class="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2 transition-colors"
            >
              <span></span>
              <span>Löschen</span>
            </button>
          </div>

          <!-- Rechts: Schließen und Speichern Buttons -->
          <div class="flex gap-2">
            <button
              @click="$emit('close')"
              class="px-3 py-2 mx-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {{ mode === 'view' ? 'Schließen' : 'Abbrechen' }}
            </button>

            <button
              v-if="mode !== 'view'"
              @click="handleSave"
              :disabled="!isFormValid || isLoading"
              class="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
            >
              <span v-if="isLoading">⏳</span>
              <span v-else></span>
              <span>{{ mode === 'create' ? 'Erstellen' : 'Speichern' }}</span>
            </button>
          </div>
        </div>

    </div>
  </div>

          <!-- ConfirmationDialog für Löschen -->
        <ConfirmationDialog
          :is-visible="showDeleteConfirmation"
          title="Termin löschen"
          :message="`Möchten Sie diesen Termin wirklich löschen?`"
          :details="`<strong>Termin:</strong> ${props.eventData?.title || 'Unbenannt'}<br>
                    <strong>Datum:</strong> ${props.eventData?.start ? new Date(props.eventData.start).toLocaleDateString('de-CH') : ''}<br>
                    <strong>Zeit:</strong> ${props.eventData?.start ? new Date(props.eventData.start).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : ''}`"
          icon="🗑️"
          type="danger"
          confirm-text="Löschen"
          cancel-text="Abbrechen"
          @confirm="confirmDelete"
          @cancel="cancelDelete"
          @close="cancelDelete"
        />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Components
import StudentSelector from '~/components/StudentSelector.vue'
import EventTypeSelector from '~/components/EventTypeSelector.vue'
import CategorySelector from '~/components/CategorySelector.vue'
import DurationSelector from '~/components/DurationSelector.vue'
import LocationSelector from '~/components/LocationSelector.vue'
import PriceDisplay from '~/components/PriceDisplay.vue'
import TimeSelector from '~/components/TimeSelector.vue'
import TitleInput from '~/components/TitleInput.vue'
import LessonTypeSelector from '~/components/LessonTypeSelector.vue'
import StaffSelector from '~/components/StaffSelector.vue'
import CustomerInviteSelector from '~/components/CustomerInviteSelector.vue' 
import ExamLocationSelector from '~/components/ExamLocationSelector.vue'
import ConfirmationDialog from './ConfirmationDialog.vue'


// Composables
import { useCompanyBilling } from '~/composables/useCompanyBilling'
import { useEventModalHandlers} from '~/composables/useEventModalHandlers'
import { useTimeCalculations } from '~/composables/useTimeCalculations'
import { useEventModalForm } from '~/composables/useEventModalForm'
import { usePricing } from '~/composables/usePricing'



//Utils
import { saveWithOfflineSupport } from '~/utils/offlineSupport'

// Types
interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  category: string
  assigned_staff_id: string
}

interface Props {
  isVisible: boolean
  eventData: any
  mode: 'view' | 'edit' | 'create'
  currentUser?: any
  eventType?: 'lesson' | 'staff_meeting'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create'
})

const emit = defineEmits<{
  'close': []
  'save': [data: any]
  'save-event': [data: any]
  'appointment-saved': [data: any]
  'appointment-updated': [data: any]
  'appointment-deleted': [id: string]
  'default-billing-address-loaded': [address: any]
  'payment-mode-changed': [paymentMode: string, data?: any]
  'delete-event': [id: string]      // ← Diese Zeile hinzufügen
  'refresh-calendar': [] 
}>()

// ============ REFS ============
const supabase = getSupabase()
const studentSelectorRef = ref()
const error = ref('')
const isLoading = ref(false)
const showEventTypeSelection = ref(false)
const selectedLessonType = ref('lesson') 
const staffSelectorRef = ref() 
const invitedStaffIds = ref<string[]>([])
const invitedCustomers = ref<any[]>([])  
const defaultBillingAddress = ref(null)
const selectedCategory = ref<any | null>(null)
const selectedExamLocation = ref(null)
const modalForm = useEventModalForm(props.currentUser)
const showDeleteConfirmation = ref(false)
const appointmentNumber = ref(1)
const availableDurations = ref([45])


// Neue Dynamic Pricing Integration
const dynamicPricing = ref({
  pricePerMinute: 0,
  adminFeeChf: 0,
  appointmentNumber: 1,
  hasAdminFee: false,
  totalPriceChf: '0.00',
  category: '',
  duration: 45,
  isLoading: false,
  error: ''
})

const { 
  formData, 
  selectedStudent,        
  selectedLocation,
  populateFormFromAppointment,
  calculateEndTime 
} = modalForm

const handlers = useEventModalHandlers(
  formData,
  selectedStudent,
  selectedCategory,
  availableDurations,
  { value: 1 }, // appointmentNumber placeholder
  selectedLocation
)

const {
  handleCategorySelected,
  handleDurationsChanged,
  setDurationForLessonType,
} = handlers

// ============ COMPUTED ============
const modalTitle = computed(() => {
  switch (props.mode) {
    case 'create': return '➕ Neuen Termin erstellen'
    case 'edit': return '✏️ Termin bearbeiten'
    case 'view': return '👁️ Termin anzeigen'
    default: return 'Termin'
  }
})

const shouldAutoLoadStudents = computed(() => {
  if (props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot') {
    console.log('🚫 Free slot click detected - disabling auto student load')
    return false  // ✅ MUSS FALSE SEIN
  }
  
  return formData.value.eventType === 'lesson' && (props.mode === 'create' || !selectedStudent.value)
})

const isFormValid = computed(() => {
  const lessonTypes = ['lesson', 'exam', 'theory']
  if (lessonTypes.includes(formData.value.eventType)) {
    return selectedStudent.value && 
           formData.value.type && 
           formData.value.startDate && 
           formData.value.startTime && 
           formData.value.location_id &&
           formData.value.staff_id
  } else {
    // Für andere Terminarten
    return formData.value.title &&
           formData.value.startDate && 
           formData.value.startTime && 
           formData.value.location_id &&
           formData.value.staff_id
  }
})

// showStudentSelector computed:
const showStudentSelector = computed(() => {
  console.log('🔍 showStudentSelector:', {
    eventType: formData.value.eventType,
    isLessonType: formData.value.eventType === 'lesson',
    showEventTypeSelection: showEventTypeSelection.value,
    mode: props.mode,
    hasUserId: !!formData.value.user_id,
    hasSelectedStudent: !!selectedStudent.value,
    result: formData.value.eventType === 'lesson' && !showEventTypeSelection.value
  })
  
  // ✅ EINFACHE LOGIK: Zeige StudentSelector für alle Lesson Types
  // Egal ob Edit oder Create, egal ob Student bereits geladen oder nicht
  return formData.value.eventType === 'lesson' && !showEventTypeSelection.value
})

const showEventTypeSelector = computed(() => {
  const lessonTypes = ['lesson', 'exam', 'theory']
  const result = !lessonTypes.includes(formData.value.eventType) || showEventTypeSelection.value
  console.log('🔍 showEventTypeSelector:', {
    eventType: formData.value.eventType,
    isLessonType: lessonTypes.includes(formData.value.eventType),
    showEventTypeSelection: showEventTypeSelection.value,
    result
  })
  return result
})

// showTimeSection computed:
// In EventModal.vue - prüfen Sie diese computed property:
const showTimeSection = computed(() => {
  if (formData.value.eventType === 'lesson') {
    return !!selectedStudent.value
  } else {
    return !!formData.value.selectedSpecialType
  }
})

// Irgendwo nach den imports und props, vor dem Template:
const isFreeslotMode = computed(() => {
  const result = !!(props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot')
  console.log('🔍 isFreeslotMode computed:', {
    result,
    isFreeslotClick: props.eventData?.isFreeslotClick,
    clickSource: props.eventData?.clickSource,
    eventData: props.eventData
  })
  return result
})

// ============ HANDLERS ============
// In EventModal.vue - ersetzen Sie die lokale handleStudentSelected Funktion mit:
// EventModal.vue - FÜGEN SIE DIESE FUNKTIONEN HINZU:

// ✅ 1. START DATE HANDLER
const handleStartDateUpdate = (newStartDate: string) => {
  console.log('📅 START DATE DIRECTLY UPDATED:', newStartDate)
  formData.value.startDate = newStartDate
  
  // Trigger time recalculation if we have start/end times
  if (formData.value.startTime && formData.value.endTime) {
    handleEndTimeUpdate(formData.value.endTime)
  }
}

// ✅ 2. START TIME HANDLER
const handleStartTimeUpdate = (newStartTime: string) => {
  console.log('🕐 START TIME DIRECTLY UPDATED:', newStartTime)
  formData.value.startTime = newStartTime
  
  // Trigger duration recalculation if we have end time
  if (formData.value.endTime && newStartTime) {
    handleEndTimeUpdate(formData.value.endTime)
  }
}

// ✅ 3. END TIME HANDLER (mit vollständiger Logik)
const handleEndTimeUpdate = (newEndTime: string) => {
  console.log('🔥 DEBUG: handleEndTimeUpdate called with:', newEndTime)
  console.log('🔥 DEBUG: Current formData.endTime before update:', formData.value.endTime)
  
  formData.value.endTime = newEndTime
  
  console.log('🔥 DEBUG: Current formData after update:', {
    startTime: formData.value.startTime,
    endTime: formData.value.endTime,
    duration: formData.value.duration_minutes
  })
  
  // Test ob Duration-Berechnung funktioniert
  if (formData.value.startTime && newEndTime) {
    const startTime = new Date(`1970-01-01T${formData.value.startTime}:00`)
    const endTime = new Date(`1970-01-01T${newEndTime}:00`)
    
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1)
    }
    
    const newDurationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
    console.log('🔥 DEBUG: Calculated duration:', newDurationMinutes)
    
    if (newDurationMinutes > 0) {
      formData.value.duration_minutes = newDurationMinutes
      console.log('🔥 DEBUG: Duration updated to:', newDurationMinutes)
    }
  }
}

// ✅ 4. ZENTRALE PREISBERECHNUNG (falls noch nicht vorhanden)
const calculatePriceForCurrentData = async () => {
  if (!formData.value.type || !formData.value.duration_minutes || formData.value.eventType !== 'lesson') {
    console.log('🚫 Skipping price calculation - missing data:', {
      type: formData.value.type,
      duration: formData.value.duration_minutes,
      eventType: formData.value.eventType
    })
    return
  }

  const appointmentNum = appointmentNumber?.value || 1
  
  console.log('💰 Calculating price for current data:', {
    category: formData.value.type,
    duration: formData.value.duration_minutes,
    appointmentNumber: appointmentNum,
    online: navigator.onLine
  })

  try {
    if (navigator.onLine) {
      // ✅ Online Berechnung
      const { calculatePrice } = usePricing()
      const priceResult = await calculatePrice(
        formData.value.type, 
        formData.value.duration_minutes, 
        formData.value.user_id || undefined
      )
      
      console.log('✅ Online price calculated:', priceResult)
      
      // Update dynamic pricing
      dynamicPricing.value = {
        pricePerMinute: priceResult.base_price_rappen / formData.value.duration_minutes / 100,
        adminFeeChf: parseFloat(priceResult.admin_fee_chf),
        appointmentNumber: priceResult.appointment_number,
        hasAdminFee: priceResult.admin_fee_rappen > 0,
        totalPriceChf: priceResult.total_chf,
        category: formData.value.type,
        duration: formData.value.duration_minutes,
        isLoading: false,
        error: ''
      }
      
      formData.value.price_per_minute = dynamicPricing.value.pricePerMinute
      
    } else {
      // ✅ Offline Berechnung
      console.log('📱 Using offline calculation')
      calculateOfflinePrice(formData.value.type, formData.value.duration_minutes, appointmentNum)
    }
  } catch (error) {
    console.log('🔄 Price calculation failed, using offline fallback:', error)
    calculateOfflinePrice(formData.value.type, formData.value.duration_minutes, appointmentNum)
  }
}

// ✅ 6. TEST BUTTON (temporär für Debugging)
const testManualTimeChange = () => {
  console.log('🧪 TESTING manual time change...')
  handleEndTimeUpdate('15:30')
}

// ✅ 7. STELLEN SIE SICHER, dass diese Imports vorhanden sind:
// import { usePricing } from '~/composables/usePricing'

const handleExamLocationSelected = (location: any) => {
  selectedExamLocation.value = location
  console.log('🏛️ Exam location selected in modal:', location)
  // Hier können Sie zusätzliche Logik hinzufügen, z.B. in formData speichern
}

const handleStudentSelected = async (student: Student | null) => {
  console.log('👤 Student selected in EventModal:', student?.first_name)
  selectedStudent.value = student
  formData.value.user_id = student?.id || ''
  
  if (student?.category) {
    const primaryCategory = student.category.split(',')[0].trim()
    formData.value.type = primaryCategory
    
    // ✅ NEU: Kategorie-Daten direkt aus DB laden für Dauer-Berechnung
    try {
      console.log('🔄 Loading category data for student:', primaryCategory)
      const { data, error } = await supabase
        .from('categories')
        .select('code, lesson_duration_minutes, exam_duration_minutes')
        .eq('code', primaryCategory)
        .eq('is_active', true)
        .single()
      
      if (error) throw error
      
      if (data) {
        selectedCategory.value = data
        console.log('✅ Category data loaded for selected student:', data)
      }
    } catch (err) {
      console.error('❌ Error loading category data for student:', err)
      // Fallback: leeres Objekt mit Standard-Werten
      selectedCategory.value = {
        code: primaryCategory,
        lesson_duration_minutes: 45,
        exam_duration_minutes: 180
      }
      console.log('✅ Using fallback category data:', selectedCategory.value)
    }
  }
}

const handleStudentCleared = () => {
  console.log('🗑️ Student cleared')
  selectedStudent.value = null
  formData.value.user_id = ''
  formData.value.title = ''
  formData.value.type = ''
  triggerStudentLoad()
}

const switchToOtherEventType = () => {
  console.log('🔄 Switching to other event types')
  console.log('📍 SWITCH EVENTMODAL STACK:', new Error().stack)
  
  formData.value.eventType = 'other' // Wird später überschrieben wenn User wählt
  showEventTypeSelection.value = true
  selectedStudent.value = null
  formData.value.user_id = ''
  formData.value.selectedSpecialType = ''
}



const handleEventTypeSelected = (eventType: any) => {
  console.log('🎯 Event type selected:', eventType)
  formData.value.selectedSpecialType = eventType.code
  formData.value.title = eventType.name
  formData.value.type = eventType.code
  formData.value.duration_minutes = eventType.default_duration_minutes || 60
  calculateEndTime()
}

const backToStudentSelection = () => {
  console.log('⬅️ Back to student selection')
  showEventTypeSelection.value = false
  formData.value.eventType = 'lesson'
  formData.value.selectedSpecialType = ''
  formData.value.title = ''
  formData.value.type = ''
}

// ✅ IN EVENTMODAL.VUE:
const handleLessonTypeSelected = (lessonType: any) => {
  console.log('🎯 Lesson type selected:', lessonType.name)
  selectedLessonType.value = lessonType.code
  formData.value.appointment_type = lessonType.code
  
  // ✅ DEBUG: Prüfen was selectedCategory enthält
  console.log('🔍 DEBUG selectedCategory:', {
    selectedCategory: selectedCategory.value,
    hasCategory: !!selectedCategory.value,
    exam_duration: selectedCategory.value?.exam_duration_minutes,
    lesson_duration: selectedCategory.value?.lesson_duration_minutes
  })
  
  if (selectedCategory.value) {
    console.log('✅ Category found, calling setDurationForLessonType')
    handlers.setDurationForLessonType(lessonType.code)
  } else {
    console.log('❌ No selectedCategory - function not called')
  }
  
  console.log('📝 Appointment type set to:', lessonType.code)
}

const handlePriceChanged = (price: number) => {
  formData.value.price_per_minute = price
}

const handleDurationChanged = (newDuration: number) => {
  console.log('⏱️ Duration changed to:', newDuration)
  formData.value.duration_minutes = newDuration
  calculateEndTime()
}

const handleDiscountChanged = (discount: number, discountType: 'fixed', reason: string) => {
  formData.value.discount = discount
  formData.value.discount_type = discountType
  formData.value.discount_reason = reason
  console.log('💰 Discount changed:', { discount, discountType, reason })
}

const handlePaymentStatusChanged = (isPaid: boolean, paymentMethod?: string) => {
  formData.value.is_paid = isPaid
  console.log('💳 Payment status changed:', { isPaid, paymentMethod })
  
  // Hier können Sie zusätzliche Logik für das Speichern hinzufügen
  // z.B. sofort in der Datenbank aktualisieren
}

const calculateOfflinePrice = (categoryCode: string, durationMinutes: number, appointmentNum: number = 1) => {
  console.log('💰 Calculating offline price:', { categoryCode, durationMinutes, appointmentNum })
  
  const offlinePrices: Record<string, { pricePerLesson: number, adminFee: number, adminFrom: number }> = {
    'B': { pricePerLesson: 95, adminFee: 120, adminFrom: 2 },
    'A1': { pricePerLesson: 95, adminFee: 0, adminFrom: 999 },
    'A35kW': { pricePerLesson: 95, adminFee: 0, adminFrom: 999 },
    'A': { pricePerLesson: 95, adminFee: 0, adminFrom: 999 },
    'BE': { pricePerLesson: 120, adminFee: 120, adminFrom: 2 },
    'C1': { pricePerLesson: 150, adminFee: 200, adminFrom: 2 },
    'D1': { pricePerLesson: 150, adminFee: 200, adminFrom: 2 },
    'C': { pricePerLesson: 170, adminFee: 200, adminFrom: 2 },
    'CE': { pricePerLesson: 200, adminFee: 250, adminFrom: 2 },
    'D': { pricePerLesson: 200, adminFee: 300, adminFrom: 2 },
    'Motorboot': { pricePerLesson: 95, adminFee: 120, adminFrom: 2 },
    'BPT': { pricePerLesson: 100, adminFee: 120, adminFrom: 2 }
  }
  
  const priceData = offlinePrices[categoryCode] || offlinePrices['B']
  const pricePerMinute = priceData.pricePerLesson / 45
  const basePrice = pricePerMinute * durationMinutes
  const adminFee = appointmentNum >= priceData.adminFrom ? priceData.adminFee : 0
  const totalPrice = basePrice + adminFee
  
  // Update dynamic pricing
  dynamicPricing.value = {
    pricePerMinute: pricePerMinute,
    adminFeeChf: adminFee,
    appointmentNumber: appointmentNum,
    hasAdminFee: adminFee > 0,
    totalPriceChf: totalPrice.toFixed(2),
    category: categoryCode,
    duration: durationMinutes,
    isLoading: false,
    error: ''
  }
  
  formData.value.price_per_minute = pricePerMinute
  
  console.log('✅ Offline price calculated:', {
    basePrice: basePrice.toFixed(2),
    adminFee: adminFee.toFixed(2),
    totalPrice: totalPrice.toFixed(2)
  })
}

const handleTimeChanged = (timeData: { startDate: string, startTime: string, endTime: string }) => {
  console.log('🕐 Time manually changed:', timeData)
  
  // ✅ 1. Update form data
  formData.value.startDate = timeData.startDate
  formData.value.startTime = timeData.startTime
  formData.value.endTime = timeData.endTime
  
  // ✅ 2. KRITISCH: Calculate duration from manual time changes
  if (timeData.startTime && timeData.endTime) {
    console.log('⏰ Calculating duration from time change...')
    
    const startTime = new Date(`1970-01-01T${timeData.startTime}:00`)
    const endTime = new Date(`1970-01-01T${timeData.endTime}:00`)
    
    // Handle day overflow (end time next day)
    if (endTime < startTime) {
      endTime.setDate(endTime.getDate() + 1)
    }
    
    const newDurationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
    
    if (newDurationMinutes > 0 && newDurationMinutes !== formData.value.duration_minutes) {
      console.log('⏰ Duration calculated from manual time change:', 
        `${formData.value.duration_minutes}min → ${newDurationMinutes}min`)
      
      // ✅ 3. Update duration (this will trigger price recalculation via watcher)
      formData.value.duration_minutes = newDurationMinutes
      
      // ✅ 4. Add custom duration to available options
      if (!availableDurations.value.includes(newDurationMinutes)) {
        availableDurations.value = [...availableDurations.value, newDurationMinutes].sort((a, b) => a - b)
        console.log('⏱️ Added custom duration to available options:', availableDurations.value)
      }
      
      // ✅ 5. SOFORTIGE Preisberechnung (online + offline)
      if (formData.value.type && formData.value.eventType === 'lesson') {
        const appointmentNum = appointmentNumber?.value || 1
        
        try {
          // ✅ Versuche zuerst online Preisberechnung
          if (navigator.onLine) {
            const { calculatePrice } = usePricing()
            
            calculatePrice(formData.value.type, newDurationMinutes, formData.value.user_id || undefined)
              .then(priceResult => {
                console.log('✅ Online price calculated:', priceResult.total_chf)
                
                // Update dynamic pricing mit online Daten
                dynamicPricing.value = {
                  pricePerMinute: priceResult.base_price_rappen / newDurationMinutes / 100,
                  adminFeeChf: parseFloat(priceResult.admin_fee_chf),
                  appointmentNumber: priceResult.appointment_number,
                  hasAdminFee: priceResult.admin_fee_rappen > 0,
                  totalPriceChf: priceResult.total_chf,
                  category: formData.value.type,
                  duration: newDurationMinutes,
                  isLoading: false,
                  error: ''
                }
                
                formData.value.price_per_minute = dynamicPricing.value.pricePerMinute
              })
              .catch(error => {
                console.log('🔄 Online pricing failed, using offline calculation:', error)
                calculateOfflinePrice(formData.value.type, newDurationMinutes, appointmentNum)
              })
          } else {
            // ✅ Offline: Direkte Offline-Berechnung
            console.log('📱 Offline mode detected, using offline calculation')
            calculateOfflinePrice(formData.value.type, newDurationMinutes, appointmentNum)
          }
        } catch (error) {
          console.log('🔄 Error in price calculation, using offline fallback:', error)
          calculateOfflinePrice(formData.value.type, newDurationMinutes, appointmentNum)
        }
      }
    }
  }
}

const handleTitleGenerated = (title: string) => {
  console.log('📝 Title auto-generated:', title)
  formData.value.title = title
}

const handleOpenPaymentModal = () => {
  console.log('💳 Opening payment modal for online payment')
  // Hier würden Sie das PaymentModal öffnen
  // emit('open-payment-modal') oder ein separates Modal anzeigen
}

const updateLocationId = (locationId: string | null) => {
  formData.value.location_id = locationId || ''
}

const handleLocationSelected = (location: any) => {
  console.log('📍 Location selected:', location)
  selectedLocation.value = location
  formData.value.location_id = location?.id || ''
}

const triggerStudentLoad = () => {
  // ✅ FIX: Nicht bei free slot clicks triggern
  if (props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot') {
    console.log('🚫 Triggering student load blocked - free slot click detected')
    return
  }
  
  console.log('🔄 Triggering student load...')
  if (studentSelectorRef.value) {
    studentSelectorRef.value.loadStudents()
  }
}

const resetForm = () => {
  
  selectedStudent.value = null
  selectedLocation.value = null
  showEventTypeSelection.value = false

    invitedStaffIds.value = []
  if (staffSelectorRef.value?.resetSelection) {
    staffSelectorRef.value.resetSelection()
  }

  formData.value = {
    id: '',
    title: '',
    type: '',
    appointment_type: 'lesson',
    startDate: '',
    startTime: '',
    endTime: '',
    duration_minutes: 45,
    location_id: '',
    staff_id: props.currentUser?.id || '',
    price_per_minute: 95/45,
    user_id: '',
    status: 'confirmed',
    is_paid: false,
    description: '',
    eventType: 'lesson' as 'lesson',
    selectedSpecialType: '',
    discount: 0,
    discount_type: 'fixed' as const,
    discount_reason: '',
    payment_method: props.eventData.payment_method || 'cash',
    payment_data: props.eventData.payment_data || null
  }
  error.value = ''
  isLoading.value = false
}

// Staff Selection Handler
const handleStaffSelectionChanged = (staffIds: string[], staffMembers: any[]) => {
  console.log('👥 Staff selection changed:', { 
    selectedIds: staffIds, 
    selectedMembers: staffMembers.length 
  })
  
  invitedStaffIds.value = staffIds
  
  // Optional: Weitere Logik für Team-Einladungen
  if (staffIds.length > 0) {
    console.log('✅ Team members selected for invitation')
  }
}

// Customer Invite Handlers
const handleCustomersAdded = (customers: any[]) => {
  console.log('📞 Customers added to invite list:', customers.length)
}

const handleCustomersCleared = () => {
  console.log('🗑️ Customer invite list cleared')
  invitedCustomers.value = []
}

const loadCategoryData = async (categoryCode: string) => {
  try {
    console.log('🔄 Loading category data for:', categoryCode)
    const { data, error } = await supabase
      .from('categories')
      .select('code, lesson_duration_minutes, exam_duration_minutes')
      .eq('code', categoryCode)
      .eq('is_active', true)
      .single()
    
    if (error) throw error
    
    selectedCategory.value = data
    console.log('✅ Category data loaded:', data)
    
    return data
  } catch (err) {
    console.error('❌ Error loading category:', err)
    selectedCategory.value = null
    return null
  }
}

// ============ SAVE LOGIC ============
const handleSave = async () => {
  if (!formData.value.title && selectedStudent.value) {
    formData.value.title = `${selectedStudent.value.first_name} ${selectedStudent.value.last_name}`
  }

  console.log('💾 Saving appointment')
  
  if (!isFormValid.value) {
    error.value = 'Bitte füllen Sie alle Felder aus'
    return
  }
  
  isLoading.value = true
  error.value = ''
  
  // ✅ appointmentData hier definieren (außerhalb try-catch für Scope)
  let finalLocationId: string | undefined = formData.value.location_id
  
  // Create proper datetime strings
  const localStart = new Date(`${formData.value.startDate}T${formData.value.startTime}`)
  const localEnd = new Date(`${formData.value.startDate}T${formData.value.endTime}`)
  
  // ✅ appointmentData außerhalb des try-blocks definieren
  const appointmentData: any = {
    title: formData.value.title,
    start_time: localStart.toISOString(),
    end_time: localEnd.toISOString(),
    duration_minutes: formData.value.duration_minutes,
    user_id: formData.value.user_id || formData.value.staff_id,
    staff_id: formData.value.staff_id,
    type: formData.value.eventType === 'lesson' ? (formData.value.appointment_type || formData.value.type) : formData.value.type,
    status: formData.value.status,
    is_paid: formData.value.is_paid,
    price_per_minute: formData.value.price_per_minute,
    description: formData.value.title || ''
  }
  
  try {
    // ✅ CRITICAL FIX: Handle temporary locations BEFORE saving appointment
    if (selectedLocation.value?.id?.startsWith('temp_')) {
      console.log('🔄 Converting temporary location to permanent DB location...')
      console.log('📍 Temporary location data:', selectedLocation.value)
      
      try {
        const locationResult = await saveWithOfflineSupport(
          'locations',
          {
            staff_id: formData.value.staff_id,
            name: selectedLocation.value.name,
            address: selectedLocation.value.address || '',
            location_type: 'custom',
            is_active: true,
            google_place_id: selectedLocation.value.place_id || null,
            latitude: selectedLocation.value.latitude || null,
            longitude: selectedLocation.value.longitude || null
          },
          'insert',
          undefined,  // ✅ undefined statt null
          `Standort "${selectedLocation.value.name}" speichern`
        )
        
        finalLocationId = locationResult?.data?.id
        formData.value.location_id = finalLocationId || ''
        console.log('✅ Temporary location saved with permanent ID:', finalLocationId)
        
      } catch (locationSaveError) {
        console.error('❌ Could not save temporary location:', locationSaveError)
        finalLocationId = undefined
        formData.value.location_id = ''
        console.log('⚠️ Continuing without location due to save error')
      }
    }
    
    // ✅ VALIDATION: Never allow temp_ IDs to reach the database
    if (finalLocationId && String(finalLocationId).startsWith('temp_')) {
      console.error('❌ BLOCKING: Temporary ID detected before save:', finalLocationId)
      finalLocationId = undefined
      formData.value.location_id = ''
    }

    // ✅ FIX: Only add location_id if we have a valid one
    if (finalLocationId) {
      appointmentData.location_id = finalLocationId
    }
    
    console.log('📋 Saving appointment data:', appointmentData)
    console.log('🔍 Final location_id being saved:', finalLocationId || 'none')
    
    let result
    if (props.mode === 'create') {
      result = await saveWithOfflineSupport(
        'appointments',
        appointmentData,
        'insert',
        undefined,  // ✅ undefined statt null
        `Termin "${appointmentData.title}" erstellen`
      )
      console.log('✅ Appointment created:', result?.data?.id || 'offline')
      
    } else if (props.mode === 'edit') {
      result = await saveWithOfflineSupport(
        'appointments',
        appointmentData,
        'update',
        { id: formData.value.id },
        `Termin "${appointmentData.title}" bearbeiten`
      )
      console.log('✅ Appointment updated:', result?.data?.id || 'offline')
    }
    
    // Handle team invitations if any (nur bei echten IDs, nicht temp_)
    if (invitedStaffIds.value.length > 0 && staffSelectorRef.value && result?.data?.id && !String(result.data.id).startsWith('temp_')) {
      console.log('📧 Creating team invites via StaffSelector...')
      try {
        const teamInvites = await staffSelectorRef.value.createTeamInvites(appointmentData)
        console.log('✅ Team invites created:', teamInvites.length)
      } catch (inviteError) {
        console.error('❌ Error creating team invites:', inviteError)
        // Main appointment is saved, continue even if team invites fail
      }
    } else if (invitedStaffIds.value.length > 0 && String(result?.data?.id).startsWith('temp_')) {
      console.log('📦 Team invites will be created when synced online')
    }
    
    // ✅ DIESE ZEILEN MÜSSEN HIER STEHEN (INNERHALB des try-blocks)
    console.log('✅ All save events emitted for mode:', props.mode)
    emit('save-event', result?.data || appointmentData)
    handleClose()
    
  } catch (err: any) {
    console.error('❌ Save error:', err)
    
    // Bei Offline: Benutzerfreundliche Behandlung
    if (err.message?.includes('synchronisiert')) {
      console.log('📦 Appointment will be synced when online')
      // Nicht als Fehler behandeln - optimistic update
      error.value = ''
      
      // ✅ appointmentData ist hier verfügbar, da außerhalb definiert!
      emit('save-event', appointmentData)
      handleClose()
    } else {
      // Echte Fehler normal behandeln
      error.value = err.message || 'Fehler beim Speichern des Termins'
    }
  } finally {
    isLoading.value = false
  }
}

const handleClose = () => {
  console.log('🚪 Closing modal')
  resetForm()
  emit('close')
}

// In EventModal.vue - ersetze die handleDelete Funktion:

const handleDelete = async () => {
  if (!props.eventData?.id) {
    console.log('❌ No event ID found for deletion')
    return
  }
  
  // Zeige Confirmation Dialog anstelle von window.confirm
  showDeleteConfirmation.value = true
}

const confirmDelete = async () => {
  if (!props.eventData?.id) return
  
  console.log('🗑️ Deleting appointment:', props.eventData.id)
  
  try {
    isLoading.value = true
    
    // Appointment aus Datenbank löschen
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', props.eventData.id)
    
    if (error) throw error
    
    console.log('✅ Appointment deleted successfully:', props.eventData.id)
    
    // Events emittieren
    emit('appointment-deleted', props.eventData.id)
    emit('save-event', { type: 'deleted', id: props.eventData.id })
    
    // Modal schließen
    handleClose()
    
  } catch (err: any) {
    console.error('❌ Delete error:', err)
    error.value = err.message || 'Fehler beim Löschen des Termins'
  } finally {
    isLoading.value = false
    showDeleteConfirmation.value = false
  }
}

// 4. Handler für Cancel
const cancelDelete = () => {
  showDeleteConfirmation.value = false
  console.log('🚫 Deletion cancelled by user')
}

// initializeFormData function:
const initializeFormData = async () => {
  console.log('🎯 Initializing form data, mode:', props.mode)
  
  if (props.mode === 'edit' && props.eventData) {
    // ✅ SCHRITT 1: Form populieren
    await populateFormFromAppointment(props.eventData)
    console.log('🔍 AFTER populate - eventType:', formData.value.eventType)
    
    // ✅ SCHRITT 2: LessonType NUR bei Edit-Mode setzen
    if (formData.value.eventType === 'lesson' && formData.value.appointment_type) {
      selectedLessonType.value = formData.value.appointment_type
      console.log('🎯 EDIT MODE: Set selectedLessonType to:', formData.value.appointment_type)
      
      // ✅ KURZE PAUSE damit LessonTypeSelector sich aktualisiert
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
  } else if (props.mode === 'create' && props.eventData?.start) {
    formData.value.eventType = 'lesson'
    showEventTypeSelection.value = false
    
    // ✅ NEU: Bei Create-Mode selectedLessonType auf Standard setzen
    selectedLessonType.value = 'lesson'
    console.log('🎯 CREATE MODE: Set selectedLessonType to default: lesson')
    
    const utcDate = new Date(props.eventData.start)
    const year = utcDate.getFullYear()
    const month = String(utcDate.getMonth() + 1).padStart(2, '0')
    const day = String(utcDate.getDate()).padStart(2, '0')
    const hours = String(utcDate.getHours()).padStart(2, '0')
    const minutes = String(utcDate.getMinutes()).padStart(2, '0')
    formData.value.startDate = `${year}-${month}-${day}`
    formData.value.startTime = `${hours}:${minutes}`
    calculateEndTime()
  }
}

const loadStudentForEdit = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    
    if (data) {
      selectedStudent.value = data
      console.log('👤 Student loaded for edit mode:', data.first_name)
    }
  } catch (err) {
    console.error('❌ Error loading student for edit:', err)
  }
}

const testTimeChange = () => {
  console.log('🧪 Testing time change...')
  handleTimeChanged({
    startDate: formData.value.startDate,
    startTime: '14:00',
    endTime: '15:30'  // 90 Minuten
  })
}

// In EventModal.vue - erweitere die Funktion mit mehr Logs:
const saveStudentPaymentPreferences = async (studentId: string, paymentMode: string, data?: any) => {
 console.log('🔥 saveStudentPaymentPreferences called with:', {
   studentId,
   paymentMode,
   data,
   hasCurrentAddress: !!data?.currentAddress?.id
 })
 
 try {
   const supabase = getSupabase()
   
   // 🔧 KORREKTUR: Richtiges Mapping für payment_methods
   const paymentMethodMapping: Record<string, string> = {
     'cash': 'cash',           // ✅ Existiert
     'invoice': 'invoice',     // ✅ Existiert  
     'online': 'twint'         // ❌ 'online' → 'twint' (Standard Online-Method)
   }
   
   const actualMethodCode = paymentMethodMapping[paymentMode]
   
   if (!actualMethodCode) {
     console.warn('⚠️ Unknown payment mode:', paymentMode)
     return // Speichere nichts bei unbekannter Methode
   }
   
   const updateData: any = {
     preferred_payment_method: actualMethodCode  // ← WICHTIG: actualMethodCode statt paymentMode
   }
   
   // Falls Rechnungsadresse gewählt und Adresse gespeichert
   if (paymentMode === 'invoice' && data?.currentAddress?.id) {
     updateData.default_company_billing_address_id = data.currentAddress.id
     console.log('📋 Adding billing address ID:', data.currentAddress.id)
   }
   
   console.log('💾 Mapping:', paymentMode, '→', actualMethodCode)
   console.log('💾 Updating user with data:', updateData)
   console.log('👤 For student ID:', studentId)
   
   const { error, data: result } = await supabase
     .from('users')
     .update(updateData)
     .eq('id', studentId)
     .select('id, preferred_payment_method') // ← Debug: Zeige was gespeichert wurde
   
   if (error) {
     console.error('❌ Supabase error:', error)
     throw error
   }
   
   console.log('✅ Update result:', result)
   console.log('✅ Payment preferences saved successfully!')
   
 } catch (err) {
   console.error('❌ Error saving payment preferences:', err)
 }
}

const handlePaymentModeChanged = (paymentMode: 'invoice' | 'cash' | 'online', data?: any) => {
  console.log('💳 handlePaymentModeChanged called:', { paymentMode, data, selectedStudentId: selectedStudent.value?.id, selectedStudentName: selectedStudent.value?.first_name })
  
  // Store payment method
  formData.value.payment_method = paymentMode
  
  // NEU: Wenn Invoice-Mode und wir haben eine Standard-Adresse geladen
  if (paymentMode === 'invoice' && defaultBillingAddress.value && !data?.currentAddress) {
    console.log('🏠 Using default billing address for invoice mode')
    const address = defaultBillingAddress.value as any
    data = {
      formData: {
        companyName: address.company_name,
        contactPerson: address.contact_person,
        email: address.email,
        phone: address.phone || '',
        street: address.street,
        streetNumber: address.street_number || '',
        zip: address.zip,
        city: address.city,
        country: address.country,
        vatNumber: address.vat_number || '',
        notes: address.notes || ''
      },
      currentAddress: address,
      isValid: true
    }
  }
  
  // Save preferences if student selected
  if (selectedStudent.value?.id) {
    console.log('🎯 Calling saveStudentPaymentPreferences...')
    saveStudentPaymentPreferences(selectedStudent.value.id, paymentMode, data)
  }
  
  // Emit for PriceDisplay
  emit('payment-mode-changed', paymentMode, data)
}

const handleInvoiceDataChanged = (invoiceData: any, isValid: boolean) => {
  console.log('📄 Invoice data changed:', invoiceData, isValid)
  // Hier kannst du die Rechnungsdaten speichern falls nötig
  // formData.value.invoiceData = invoiceData
  // formData.value.invoiceValid = isValid
}

// ============ WATCHERS ============
watch(() => props.isVisible, (visible) => {
  if (visible) {
    console.log('✅ Modal opened:', {
      mode: props.mode,
      hasEventData: !!props.eventData
    })
    
    if (props.mode === 'create') {
      resetForm()
      triggerStudentLoad()
    }
    
    initializeFormData()
  }
})

watch(() => formData.value.duration_minutes, () => {
  calculateEndTime()
})

watch(() => selectedStudent.value, (newStudent, oldStudent) => {
  if (newStudent && !oldStudent) {
    console.log('🔍 AUTO STUDENT SELECTION DETECTED!')
    console.log('🎯 Student automatically selected:', newStudent.first_name, newStudent.last_name)
    console.log('📍 CALL STACK:', new Error().stack)
    console.log('🔍 Is Free-Slot mode?', props.eventData?.isFreeslotClick)
    console.log('🔍 Event data:', props.eventData)
  }
}, { immediate: true })

watch(selectedStudent, (newStudent, oldStudent) => {
  if (oldStudent && !newStudent && props.mode === 'create') {
    console.log('🔄 Student cleared in create mode - triggering reload')
    setTimeout(() => {
      triggerStudentLoad()
    }, 100)
  }
})

watch(() => selectedStudent.value, (newStudent, oldStudent) => {
  if (newStudent && !oldStudent) {
    console.log('🚨 selectedStudent.value DIRECTLY SET!')
    console.log('📍 WHO SET IT?', new Error().stack)
    console.log('🔍 Is Free-Slot?', props.eventData?.isFreeslotClick)
  }
}, { immediate: false })

// ✅ Im EventModal.vue - bei den anderen Watchers hinzufügen:
watch(() => formData.value.eventType, (newVal, oldVal) => {
  console.log('🚨 formData.eventType CHANGED:', {
    from: oldVal,
    to: newVal,
    stack: new Error().stack
  })
}, { immediate: true })

// ============ LIFECYCLE ============


</script>

<style scoped>
input:focus, select:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

input:disabled, select:disabled {
  background-color: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

button:not(:disabled):hover {
  transform: translateY(-1px);
  transition: all 0.2s ease;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>