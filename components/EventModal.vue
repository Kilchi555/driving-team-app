<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 z-50">
    <!-- Modal Container - Ganzer verfügbarer Raum -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[calc(100vh-80px)] flex flex-col overflow-hidden absolute top-4 left-1/2 transform -translate-x-1/2" @click.stop>

      <!-- ✅ FIXED HEADER -->
      <div class="bg-white px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <!-- Links: Titel oder Action-Buttons -->
        <div class="flex items-center space-x-3">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ mode === 'create' ? 'Neuer Termin' : mode === 'edit' ? 'Termin' : 'Termin anzeigen' }}
          </h2>
          
          <!-- Action-Buttons (nur bei edit/view mode) -->
          <div v-if="mode !== 'create' && eventData?.id" class="flex items-center space-x-2">
            <!-- Kopieren Button -->
            <button
              @click="handleCopy"
              class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              title="Termin kopieren"
            >
              Kopieren
            </button>
            
            <!-- Löschen Button -->
            <button
              @click="handleDelete"
              class="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              title="Termin löschen"
            >
              Löschen
            </button>
          </div>
        </div>

        <!-- Rechts: Schließen Button -->
        <button
          @click="$emit('close')"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- ✅ SCROLLABLE CONTENT AREA -->
      <div class="flex-1 overflow-y-auto">
        <div class="px-6 py-6 space-y-6">
          
          <!-- Student Selector -->
          <div v-if="showStudentSelector">
            <StudentSelector
              ref="studentSelectorRef"
              v-model="selectedStudent"
              :current-user="props.currentUser"
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
          <div v-if="formData.eventType === 'lesson' && formData.appointment_type === 'exam' && selectedStudent" class="space-y-2">
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
              ref="customerInviteSelectorRef" 
              v-model="invitedCustomers"
              :current-user="currentUser"
              :disabled="mode === 'view'"
              @customers-added="handleCustomersAdded"
              @customers-cleared="handleCustomersCleared"
            />
          </div>

          <!-- Title Input -->
          <div> 
            <TitleInput
              :title="formData.title"
              @update:title="handleTitleUpdate"
              :event-type="eventTypeForTitle"
              :selected-student="selectedStudent"
              :selected-special-type="formData.selectedSpecialType"
              :category-code="formData.type"
              :selected-location="selectedLocation"
              :disabled="mode === 'view'"
              :auto-generate="true"
              @title-generated="handleTitleGenerated"
            />
          </div>

          <!-- Category & Duration Section -->
          <div v-if="selectedStudent" class="space-y-4">
            <CategorySelector
              v-model="formData.type"
              :selected-user="selectedStudent"
              :current-user="currentUser"
              :current-user-role="currentUser?.role"
              :appointment-type="formData.appointment_type || selectedLessonType || 'lesson'"
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
            ref="priceDisplayRef"
            :event-type="formData.eventType"
            :duration-minutes="formData.duration_minutes"
            :price-per-minute="handlers.pricing.dynamicPricing.value.pricePerMinute || formData.price_per_minute"
            :is-paid="formData.is_paid"
            :admin-fee="handlers.pricing.dynamicPricing.value.adminFeeChf || 0"
            :appointment-number="handlers.pricing.dynamicPricing.value.appointmentNumber || 1"
            :is-second-or-later-appointment="handlers.pricing.dynamicPricing.value.hasAdminFee || false"
            :discount="formData.discount || 0"
            :discount-type="(formData.discount_type as 'fixed') || 'fixed'"
            :discount-reason="formData.discount_reason || ''"
            :allow-discount-edit="currentUser?.role === 'staff' || currentUser?.role === 'admin'"
            :selected-date="formData.startDate"
            :start-time="formData.startTime"
            :end-time="formData.endTime"
            :current-user="currentUser"
            :selected-student="selectedStudent"
            :event-data="props.eventData"
            @discount-changed="handleDiscountChanged"
            @payment-status-changed="handlePaymentStatusChanged"
            @payment-method-changed="handlePaymentModeChanged"
            :allow-product-sale="true"
            @products-changed="handleProductsChanged"
            @price-changed="handlePriceChanged"
          />
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
      </div>

      <!-- ✅ FIXED FOOTER -->
      <div class="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
        <button
          @click="$emit('close')"
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          {{ mode === 'view' ? 'Schließen' : 'Abbrechen' }}
        </button>

        <button
          v-if="mode !== 'view'"
          @click="() => saveAppointment(mode as 'create' | 'edit', eventData?.id)"  
          :disabled="!isFormValid || isLoading"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
        >
          <span v-if="isLoading">⏳</span>
          <span v-else>{{ mode === 'create' ? 'Termin erstellen' : 'Speichern' }}</span>
        </button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useSmsService } from '~/composables/useSmsService'

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
import { useCurrentUser } from '~/composables/useCurrentUser'
import { useProductSale } from '~/composables/useProductSale'


import { useAuthStore } from '~/stores/auth'

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

interface SmsPayload {
  phoneNumber: string;
  message: string;
  onSuccess: (msg?: string) => void;
  onError: (err?: string) => void;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create'
})

const { currentUser: composableCurrentUser } = useCurrentUser()


const emit = defineEmits<{
  'close': []
  'save': [data: any]
  'save-event': [data: any]
  'appointment-saved': [data: any]
  'appointment-updated': [data: any]
  'appointment-deleted': [id: string]
  'default-billing-address-loaded': [address: any]
  'payment-method-changed': [paymentMode: string, data?: any]
  'delete-event': [id: string]     
  'refresh-calendar': [] 
   'copy-appointment': [data: any]
}>()

// ============ REFS ============
const supabase = getSupabase()
const studentSelectorRef = ref()
const error = ref('')
const isLoading = ref(false)
const showEventTypeSelection = ref(false)
const selectedLessonType = ref('lesson') 
const staffSelectorRef = ref() 
const invitedStaffIds = ref([] as string[])
const defaultBillingAddress = ref(null)
const selectedCategory = ref<any | null>(null)
const selectedExamLocation = ref(null)
const showDeleteConfirmation = ref(false)
const appointmentNumber = ref(1)
const availableDurations = ref([45] as number[])
const customerInviteSelectorRef = ref()
const authStore = useAuthStore()
const selectedProducts = ref([] as any[])
const invitedCustomers = ref([] as any[])
const priceDisplayRef = ref()

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

const currentUser = computed(() => props.currentUser || composableCurrentUser.value)

// 3. Callback-Funktion für SMS-Integration erstellen
const handleCustomerInvites = async (appointmentData: any) => {
  if (invitedCustomers.value.length > 0 && customerInviteSelectorRef.value) {
    console.log('📱 Creating customer invites with SMS...')
    try {
      const customerInvites = await customerInviteSelectorRef.value.createInvitedCustomers(appointmentData)
      console.log('✅ Customer invites created with SMS:', customerInvites.length)
      return customerInvites
    } catch (error) {
      console.error('❌ Error creating customer invites:', error)
      throw error
    }
  }
  return []
}

// EventModal.vue - im script setup:

const setOnlineManually = () => {
  console.log('🔧 Setting payment method to online manually')
  formData.value.payment_method = 'online'
  console.log('✅ Payment method now:', formData.value.payment_method)
}

const modalForm = useEventModalForm(currentUser, {
  customerInviteSelectorRef,
  staffSelectorRef,
  invitedCustomers,
  invitedStaffIds,
  priceDisplayRef,
  emit,
  props,
})

const { 
  formData, 
  selectedStudent,        
  selectedLocation,
  isFormValid,  
  populateFormFromAppointment,
  calculateEndTime,
  saveAppointment
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

const prefilledNumber = ref('+41797157027'); // Kannst du anpassen für deine Testnummer
const customMessagePlaceholder = ref('Hallo, vielen Dank für deine Anmeldung. Beste Grüsse Dein Driving Team');
const { sendSms } = useSmsService();

const handleSendSmsRequest = async ({
  phoneNumber,
  message,
  onSuccess,
  onError
}: SmsPayload) => {
  // Rufe die eigentliche Sendelogik auf
  const result = await sendSms(phoneNumber, message);

  if (result.success) {
    onSuccess('SMS erfolgreich gesendet!'); // Callback an die Child-Komponente
  } else {
    // Übergebe detailliertere Fehlermeldung, falls vorhanden
    onError(`Fehler: ${result.error || 'Unbekannter Fehler'}`);
  }
}

const handleProductsChanged = (products: any[]) => {
  console.log('📦 Products changed:', products.length)
  // Die Produkte werden im productSale composable verwaltet
}

// ============ COMPUTED ============
const eventTypeForTitle = computed(() => {
  const eventType = formData.value.eventType
  
  // Nur gültige Typen zurückgeben
  if (eventType === 'lesson' || eventType === 'staff_meeting' || eventType === 'other') {
    return eventType
  }
  
  // Fallback für ungültige Werte
  return 'lesson' as const
})

const shouldAutoLoadStudents = computed(() => {
  if (props.eventData?.isFreeslotClick || props.eventData?.clickSource === 'calendar-free-slot') {
    console.log('🚫 Free slot click detected - disabling auto student load')
    return false  // ✅ MUSS FALSE SEIN
  }
  
  return formData.value.eventType === 'lesson' && (props.mode === 'create' || !selectedStudent.value)
})


// showStudentSelector computed:
const showStudentSelector = computed(() => {
  console.log('🔍 showStudentSelector check:', {
    eventType: formData.value.eventType,
    showEventTypeSelection: showEventTypeSelection.value,
    appointmentType: formData.value.appointment_type,  // ✅ RICHTIG
    selectedLessonType: selectedLessonType.value,      // ✅ LOKALE VARIABLE
    type: formData.value.type
  })
  
  // ✅ Zeige StudentSelector für lessons, ABER nicht für exam
  if (formData.value.eventType === 'lesson') {
    // Für EXAM-Termine zeigen wir den StudentSelector nicht sofort
    if (formData.value.appointment_type === 'exam' || selectedLessonType.value === 'exam') {
      return false  // ✅ Bei Prüfungen ist Student optional
    }
    
    return !showEventTypeSelection.value
  }
  
  return false
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
  console.log('🔍 showTimeSection computed:', {
    eventType: formData.value.eventType,
    selectedStudent: !!selectedStudent.value,
    appointmentType: formData.value.appointment_type,  // ✅ RICHTIG
    selectedLessonType: selectedLessonType.value,      // ✅ LOKALE VARIABLE
    type: formData.value.type,
    mode: props.mode
  })
  
  if (formData.value.eventType === 'lesson') {
    // ✅ FIX: Bei EXAM-Terminen brauchen wir nicht zwingend einen selectedStudent
    if (formData.value.appointment_type === 'exam' || selectedLessonType.value === 'exam') {
      console.log('📋 EXAM detected - showing time section even without selected student')
      return true  // ✅ Zeige auch ohne Student bei Prüfungen
    }
    
    // Für normale Fahrstunden brauchen wir einen Student
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
const handleTitleUpdate = (newTitle: string) => {
  formData.value.title = newTitle
}

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
  
  // 🔧 FIX: staff_id setzen wenn Student ausgewählt wird
  if (currentUser.value?.id) {
    formData.value.staff_id = currentUser.value.id
    console.log('✅ staff_id gesetzt bei Student-Auswahl:', currentUser.value.id)
  }
  
  // ✅ ZEIT NACH STUDENT-AUSWAHL SETZEN:
  if (props.mode === 'create' && props.eventData?.start && !formData.value.startTime) {
    const startTimeString = props.eventData.start
    const [datePart, timePart] = startTimeString.split('T')
    const timeOnly = timePart.split(':').slice(0, 2).join(':')
    
    formData.value.startDate = datePart
    formData.value.startTime = timeOnly
    calculateEndTime()
    
    console.log('🕐 Zeit nach Student-Auswahl gesetzt:', {
      startDate: formData.value.startDate,
      startTime: formData.value.startTime,
      endTime: formData.value.endTime
    })
  }
  
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
    console.log('💰 Price changed in EventModal:', price)
  formData.value.price_per_minute = price
}

const handleDurationChanged = (newDuration: number) => {
  console.log('⏱️ Duration changed to:', newDuration)
  formData.value.duration_minutes = newDuration
  calculateEndTime()
}

const handleDiscountChanged = (discount: number, discountType: "fixed" | "percentage", reason: string) => {
  console.log('💰 Discount changed:', { discount, discountType, reason })
  formData.value.discount = discount
  formData.value.discount_type = discountType
  formData.value.discount_reason = reason
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
  console.log('📝 BEFORE setting title:', formData.value.title)
  formData.value.title = title
  console.log('📝 AFTER setting title:', formData.value.title)
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

const handleClose = () => {
  console.log('🚪 Closing modal')
  resetForm()
  emit('close')
}

const handleCopy = () => {
  if (!props.eventData?.id) return
  
  console.log('📋 Copying appointment:', props.eventData.id)
  
  // Alle aktuellen Daten kopieren, aber ID entfernen und Zeit anpassen
  const copiedData = {
    ...formData.value,
    // Neue Zeit: 1 Stunde später oder nächster Tag
    startTime: getNextAvailableTime(formData.value.startTime),
    startDate: shouldMoveToNextDay(formData.value.startTime) 
      ? getNextDay(formData.value.startDate) 
      : formData.value.startDate
  }
   // Endzeit basierend auf Dauer neu berechnen
  const startDateTime = new Date(`${copiedData.startDate}T${copiedData.startTime}`)
  const endDateTime = new Date(startDateTime.getTime() + formData.value.duration_minutes * 60000)
  copiedData.endTime = endDateTime.toTimeString().slice(0, 5)
  
  // Modal in CREATE-Mode öffnen mit kopierten Daten
  emit('copy-appointment', {
    mode: 'create',
    eventData: {
      ...copiedData,
      title: `${formData.value.title} (Kopie)`,
      start: `${copiedData.startDate}T${copiedData.startTime}:00`,
      end: `${copiedData.startDate}T${copiedData.endTime}:00`,
      isFreeslotClick: false,
      extendedProps: {
        // Nur gewünschte Eigenschaften kopieren
        location: props.eventData?.extendedProps?.location || '',
        staff_note: props.eventData?.extendedProps?.staff_note || '',
        client_note: props.eventData?.extendedProps?.client_note || '',
        eventType: props.eventData?.extendedProps?.eventType,
        appointment_type: props.eventData?.extendedProps?.appointment_type,
        category: props.eventData?.extendedProps?.category,
        original_type: props.eventData?.extendedProps?.original_type,
      }
    }
  })
  // Aktuelles Modal schließen
  emit('close')
}

// Hilfsfunktionen für intelligente Zeitberechnung
const getNextAvailableTime = (currentTime: string): string => {
  const [hours, minutes] = currentTime.split(':').map(Number)
  const nextHour = hours + 1
  
  // Wenn nach 20 Uhr, dann nächster Tag um 8 Uhr
  if (nextHour > 20) return '08:00'
  
  return `${nextHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

const shouldMoveToNextDay = (currentTime: string): boolean => {
  const [hours] = currentTime.split(':').map(Number)
  return hours >= 20
}

const getNextDay = (currentDate: string): string => {
  const date = new Date(currentDate)
  date.setDate(date.getDate() + 1)
  return date.toISOString().split('T')[0]
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
// In EventModal.vue - ersetzen Sie die initializeFormData Funktion:

const initializeFormData = async () => {
  console.log('🎯 Initializing form data, mode:', props.mode)
    console.log('🎯 props.eventData:', props.eventData) 

      // ✅ NEUE ZEILE: Staff ID automatisch auf currentUser setzen
  if (props.currentUser?.id) {
    formData.value.staff_id = props.currentUser.id
    console.log('👤 Staff ID automatically set to currentUser:', props.currentUser.id)
  }

    // ✅ NEUER CODE: Free slot → Student explizit clearen
  if (props.eventData?.isFreeslotClick && props.mode === 'create') {
    console.log('🧹 FREE SLOT detected - clearing any cached student')
    selectedStudent.value = null
    formData.value.user_id = ''
    formData.value.type = ''
    formData.value.title = ''
  }

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
    
    // ✅ KORRIGIERT: Direkt den ISO-String verwenden, nicht new Date()!
    const startTimeString = props.eventData.start // "2025-08-24T07:00:00"
        if (typeof startTimeString === 'string' && startTimeString.includes('T')) {

    const [datePart, timePart] = startTimeString.split('T')
    const timeOnly = timePart.split(':').slice(0, 2).join(':') // "07:00"
    
    formData.value.startDate = datePart  // "2025-08-24"
    formData.value.startTime = timeOnly  // "07:00"
    
    console.log('✅ CREATE MODE - Zeit gesetzt:', {
      startDate: formData.value.startDate,
      startTime: formData.value.startTime
    })
    
    calculateEndTime()
        } else {
      console.error('❌ Invalid startTimeString:', startTimeString)
    }
  }
}

const triggerInitialCalculations = async () => {
  console.log('🚀 Triggering initial calculations...')
  
  // Warte bis alle Daten geladen sind
  await nextTick()
  
  // Nur triggern wenn alle Daten da sind
  if (formData.value.type && 
      formData.value.duration_minutes && 
      selectedStudent.value?.id && 
      formData.value.eventType === 'lesson') {
    
    console.log('💰 Initial price calculation')
    try {
      await handlers.pricing.updateDynamicPricing(
        formData.value.type,
        formData.value.duration_minutes,
        selectedStudent.value.id
      )
    } catch (error) {
      console.error('❌ Initial price calculation failed:', error)
    }
  }
  
  // End time berechnen
  if (formData.value.startTime && formData.value.duration_minutes) {
    calculateEndTime()
  }
}

// Triggere nach Modal-Öffnung und Daten-Laden
watch(() => props.isVisible, async (isVisible) => {
  if (isVisible) {
    console.log('📂 Modal opened, initializing...')
    
    // Erst Daten laden...
    await initializeFormData()
    
    // Dann Berechnungen triggern
    await triggerInitialCalculations()
  }
})

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

// In EventModal.vue - Console logs hinzufügen:


// 1. Watcher für formData.title
watch(() => formData.value.title, (newTitle, oldTitle) => {
  console.log('🔍 TITEL CHANGED:', {
    from: oldTitle,
    to: newTitle,
    stack: new Error().stack?.split('\n')[1] || 'Stack not available' // ← Sicherer Zugriff
  })
}, { immediate: true })

// 3. Beim Speichern loggen
// In der saveAppointment Funktion:
console.log('💾 SAVING WITH TITLE:', formData.value.title)

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

const handlePaymentModeChanged = (paymentMode: string, data?: any) => { // ← string statt 'invoice' | 'cash' | 'online'
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
  emit('payment-method-changed', paymentMode, data)
}

const handleInvoiceDataChanged = (invoiceData: any, isValid: boolean) => {
  console.log('📄 Invoice data changed:', invoiceData, isValid)
  // Hier kannst du die Rechnungsdaten speichern falls nötig
  // formData.value.invoiceData = invoiceData
  // formData.value.invoiceValid = isValid
}

// Debug staff_id Problem
console.log('🔍 Staff ID Debug:', {
  currentUserValue: currentUser.value,
  formDataStaffId: formData.value.staff_id,
  shouldAutoSet: !!currentUser.value?.id && !formData.value.staff_id
})

// Force staff_id setzen als Test
if (currentUser.value?.id) {
  formData.value.staff_id = currentUser.value.id
  console.log('🔧 FORCE SET staff_id:', currentUser.value.id)
}

// Watch currentUser changes
watch(currentUser, (newUser) => {
  console.log('🔄 EventModal: currentUser changed:', newUser)
  if (newUser?.id && !formData.value.staff_id) {
    formData.value.staff_id = newUser.id
    console.log('✅ Staff ID auto-set:', newUser.id)
  }
}, { immediate: true })

// ============ WATCHERS ============
// Direkt nach initializeFormData in der watch-Funktion:
watch(() => props.isVisible, async (newVisible) => {
  if (newVisible && props.eventData) {
    console.log('✅ Modal opened:', { mode: props.mode, hasEventData: !!props.eventData })
    
    await initializeFormData()
    
    // ✅ DEBUG NACH initializeFormData:
    console.log('🔍 AFTER initializeFormData:', {
      eventType: formData.value.eventType,
      showEventTypeSelection: showEventTypeSelection.value,
      selectedLessonType: selectedLessonType.value
    })
    
    nextTick(() => {
      if (shouldAutoLoadStudents.value) {
        triggerStudentLoad()
      }
    })
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

.sms-container {
  max-width: 960px;
}
</style>