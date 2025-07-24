
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
            :disabled="mode === 'view'"
            @lesson-type-selected="handleLessonTypeSelected"
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
          :event-type="formData.eventType"
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
        <TimeSelector
          :start-date="formData.startDate"
          :start-time="formData.startTime"
          :end-time="formData.endTime"
          :duration-minutes="formData.duration_minutes"
          :event-type="formData.eventType"
          :selected-student="selectedStudent"
          :selected-special-type="formData.selectedSpecialType"
          :disabled="mode === 'view'"
          :mode="mode"
          @update:start-date="formData.startDate = $event"
          @update:start-time="formData.startTime = $event"
          @update:end-time="formData.endTime = $event"
          @time-changed="handleTimeChanged"
        />

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
              :discount="formData.discount"
              :discount-type="formData.discount_type"
              :discount-reason="formData.discount_reason"
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

// Composables
import { useCompanyBilling } from '~/composables/useCompanyBilling'
import { useEventModalHandlers} from '~/composables/useEventModalHandlers'
import { useTimeCalculations } from '~/composables/useTimeCalculations'


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

}>()

// ============ REFS ============
const supabase = getSupabase()
const studentSelectorRef = ref()
const selectedStudent = ref<Student | null>(null)
const selectedLocation = ref<any | null>(null)
const availableDurations = ref([45])
const error = ref('')
const isLoading = ref(false)
const showEventTypeSelection = ref(false)
const selectedLessonType = ref('lesson') 
const staffSelectorRef = ref() 
const invitedStaffIds = ref<string[]>([])
const invitedCustomers = ref<any[]>([])  
const defaultBillingAddress = ref(null)
const selectedCategory = ref<any | null>(null)


const formData = ref({
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
  eventType: 'lesson' as 'lesson' | 'staff_meeting' | 'other',
  selectedSpecialType: '',
  discount: 0,
  discount_type: 'fixed' as const,
  discount_reason: '',
  payment_method: 'online',
  payment_data: null as any
})


// Neue Dynamic Pricing Integration
const dynamicPricing = ref({
  pricePerMinute: 0,
  adminFeeChf: 0,
  appointmentNumber: 1,
  hasAdminFee: false,
  isLoading: false,
  error: ''
})

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
  if (formData.value.eventType === 'lesson') {
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

const showStudentSelector = computed(() => {
  return formData.value.eventType === 'lesson' && !showEventTypeSelection.value
})

const showEventTypeSelector = computed(() => {
  return showEventTypeSelection.value
})

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
  
  generateTitleIfReady()
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
  
  formData.value.eventType = 'other'
  showEventTypeSelection.value = true
  selectedStudent.value = null
  formData.value.user_id = ''
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

const handleTimeChanged = (timeData: { startDate: string, startTime: string, endTime: string }) => {
  console.log('🕐 Time changed:', timeData)
  formData.value.startDate = timeData.startDate
  formData.value.startTime = timeData.startTime
  formData.value.endTime = timeData.endTime
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
  
  // Auto-generate title if we have student and location
  generateTitleIfReady()
}

const generateTitleIfReady = () => {
  if (formData.value.eventType === 'lesson' && selectedStudent.value && selectedLocation.value) {
    const firstName = selectedStudent.value.first_name
    const lastName = selectedStudent.value.last_name
    const location = selectedLocation.value.name || selectedLocation.value.address || 'Treffpunkt'
    const newTitle = `${firstName} ${lastName} - ${location}`
    
    formData.value.title = newTitle
    console.log('🎯 Auto-generated title:', newTitle)
  }
}

const { calculateEndTime } = useTimeCalculations(formData)


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
// ERSETZEN Sie die handleSave Funktion in EventModal.vue mit dieser korrigierten Version:

// ERSETZEN Sie die handleSave Funktion in EventModal.vue mit dieser korrigierten Version:

// ERSETZEN Sie die handleSave Funktion in EventModal.vue mit dieser korrigierten Version:

const handleSave = async () => {
  console.log('💾 Saving appointment')
  
  if (!isFormValid.value) {
    error.value = 'Bitte füllen Sie alle Felder aus'
    return
  }
  
  isLoading.value = true
  error.value = ''
  
  try {
    // ✅ CRITICAL FIX: Handle temporary locations BEFORE saving appointment
    let finalLocationId: string | undefined = formData.value.location_id

    // Check if we have a temporary location that needs to be saved first
    if (selectedLocation.value?.id?.startsWith('temp_')) {
      console.log('🔄 Converting temporary location to permanent DB location...')
      console.log('📍 Temporary location data:', selectedLocation.value)
      
      try {
        const { data: newLocation, error: locationError } = await supabase
          .from('locations')
          .insert({
            staff_id: formData.value.staff_id,
            name: selectedLocation.value.name,
            address: selectedLocation.value.address || '',
            location_type: 'custom',
            is_active: true,
            // Optional: Add Google Places data if available
            google_place_id: selectedLocation.value.place_id || null,
            latitude: selectedLocation.value.latitude || null,
            longitude: selectedLocation.value.longitude || null
          })
          .select()
          .single()

        if (locationError) {
          console.error('❌ Error saving temporary location:', locationError)
          throw locationError
        }
        
        finalLocationId = newLocation.id
        formData.value.location_id = finalLocationId || '' // ✅ FIX: Fallback to empty string
        console.log('✅ Temporary location saved with permanent ID:', finalLocationId)
        
      } catch (locationSaveError) {
        console.error('❌ Could not save temporary location:', locationSaveError)
        // ✅ FIX: Set to undefined instead of null for TypeScript
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

    // Create proper datetime strings
    const localStart = new Date(`${formData.value.startDate}T${formData.value.startTime}`)
    const localEnd = new Date(`${formData.value.startDate}T${formData.value.endTime}`)
    
    // ✅ FIX: Create appointment data with proper typing
    const appointmentData: any = {
      title: formData.value.title,
      start_time: localStart.toISOString(),
      end_time: localEnd.toISOString(),
      duration_minutes: formData.value.duration_minutes,
      user_id: formData.value.user_id || formData.value.staff_id,
      staff_id: formData.value.staff_id,
      type: formData.value.type,
      status: formData.value.status,
      is_paid: formData.value.is_paid,
      price_per_minute: formData.value.price_per_minute,
      description: formData.value.title || ''
    }
    
    // ✅ FIX: Only add location_id if we have a valid one
    if (finalLocationId) {
      appointmentData.location_id = finalLocationId
    }
    
    console.log('📋 Saving appointment data:', appointmentData)
    console.log('🔍 Final location_id being saved:', finalLocationId || 'none')
    
    let result
    if (props.mode === 'create') {
      const { data, error: saveError } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single()
      
      if (saveError) throw saveError
      result = data
      console.log('✅ Appointment created:', result.id)
      
    } else if (props.mode === 'edit') {
      const { data, error: updateError } = await supabase
        .from('appointments')
        .update(appointmentData)
        .eq('id', formData.value.id)
        .select()
        .single()
      
      if (updateError) throw updateError
      result = data
      console.log('✅ Appointment updated:', result.id)
    }
    
    // Handle team invitations if any
    if (invitedStaffIds.value.length > 0 && staffSelectorRef.value && result?.id) {
      console.log('📧 Creating team invites via StaffSelector...')
      
      try {
        const teamInvites = await staffSelectorRef.value.createTeamInvites(appointmentData)
        console.log('✅ Team invites created:', teamInvites.length)
      } catch (inviteError) {
        console.error('❌ Error creating team invites:', inviteError)
        // Main appointment is saved, continue even if team invites fail
      }
    }
    
    console.log('✅ All save events emitted for mode:', props.mode)
    emit('save-event', result)
    handleClose()
    
  } catch (err: any) {
    console.error('❌ Save error:', err)
    error.value = err.message || 'Fehler beim Speichern des Termins'
  } finally {
    isLoading.value = false
  }
}

const handleClose = () => {
  console.log('🚪 Closing modal')
  resetForm()
  emit('close')
}

// Neue Funktion für das Löschen hinzufügen:
const handleDelete = () => {
  if (!props.eventData?.id) return
  
  // Nutze das bereits existierende appointment-deleted Event
  emit('appointment-deleted', props.eventData.id)
  
  // Modal schließen
  handleClose()
}

// ============ MODAL INITIALIZATION ============
const initializeFormData = () => {
  console.log('🎯 Initializing form data, mode:', props.mode)
  
  if (props.mode === 'edit' && props.eventData) {
    // Edit mode - populate with existing data
    formData.value.id = props.eventData.id || ''
    formData.value.title = props.eventData.title || ''
    formData.value.type = props.eventData.extendedProps?.category || ''
    formData.value.user_id = props.eventData.extendedProps?.user_id || ''
    formData.value.location_id = props.eventData.extendedProps?.location_id || ''
    formData.value.duration_minutes = props.eventData.extendedProps?.duration_minutes || 45
    formData.value.price_per_minute = props.eventData.extendedProps?.price_per_minute || 95/45
    formData.value.status = props.eventData.extendedProps?.status || 'confirmed'
    formData.value.is_paid = props.eventData.extendedProps?.is_paid || false
    formData.value.description = props.eventData.extendedProps?.description || ''
    
    if (props.eventData.start) {
      const startDate = new Date(props.eventData.start)
      formData.value.startDate = startDate.toISOString().split('T')[0]
      formData.value.startTime = startDate.toTimeString().slice(0, 5)
    }
    
    if (props.eventData.end) {
      const endDate = new Date(props.eventData.end)
      formData.value.endTime = endDate.toTimeString().slice(0, 5)
    }
    
    // Load student if available
    if (formData.value.user_id && !props.eventData?.isFreeslotClick) {
          loadStudentForEdit(formData.value.user_id)
        }
    
  } else if (props.mode === 'create' && props.eventData?.start) {
    // Create mode with time data
    formData.value.eventType = 'lesson'  
    showEventTypeSelection.value = false 
    const utcDate = new Date(props.eventData.start)
    const year = utcDate.getFullYear()
    const month = String(utcDate.getMonth() + 1).padStart(2, '0')
    const day = String(utcDate.getDate()).padStart(2, '0')
    const hours = String(utcDate.getHours()).padStart(2, '0')
    const minutes = String(utcDate.getMinutes()).padStart(2, '0')
    
    formData.value.startDate = `${year}-${month}-${day}`
    formData.value.startTime = `${hours}:${minutes}`
    calculateEndTime()
        // Auto-load students für lesson events
    if (!props.eventData?.isFreeslotClick && !props.eventData?.clickSource?.includes('calendar-free-slot')) {
  console.log('🔄 CREATE mode - triggering student load')
  setTimeout(() => {
    triggerStudentLoad()
  }, 100)
} else {
  console.log('🚫 FREE SLOT - skipping auto student load')
}
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