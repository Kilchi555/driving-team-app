
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
        <div v-if="showStudentSelector">
          <StudentSelector
            ref="studentSelectorRef"
            v-model="selectedStudent"
            :current-user="currentUser"
            :disabled="mode === 'view'"
            :auto-load="shouldAutoLoadStudents"
            @student-selected="handleStudentSelected"
            @student-cleared="handleStudentCleared"
            @switch-to-other="switchToOtherEventType"
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
        <div v-if="formData.startDate && formData.startTime">
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
            :price-per-minute="formData.price_per_minute"
            :category-code="formData.type"
            :is-paid="formData.is_paid"
            :discount="formData.discount"
            :discount-type="formData.discount_type"
            :discount-reason="formData.discount_reason"
            :allow-discount-edit="currentUser?.role === 'staff' || currentUser?.role === 'admin'"
            :current-user="currentUser"
            :selected-date="formData.startDate"
            :start-time="formData.startTime"
            @discount-changed="handleDiscountChanged"
            @payment-status-changed="handlePaymentStatusChanged"
            @open-payment-modal="handleOpenPaymentModal"
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

      <!-- Footer -->
      <div class="sticky bottom-0 bg-gray-50 px-6 py-4 border-t rounded-b-lg">
        <div class="flex justify-end space-x-3">
          <button
            @click="handleClose"
            class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            :disabled="isLoading"
          >
            {{ mode === 'view' ? 'Schließen' : 'Abbrechen' }}
          </button>

          <button
            v-if="mode !== 'view'"
            @click="handleSave"
            :disabled="!isFormValid || isLoading"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
          >
            <span v-if="isLoading">⏳</span>
            <span v-else>💾</span>
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

const formData = ref({
  id: '',
  title: '',
  type: '',
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
  discount_reason: ''
})

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

const totalPrice = computed(() => {
  const total = formData.value.price_per_minute * formData.value.duration_minutes
  return total.toFixed(2)
})

// ============ HANDLERS ============
const handleStudentSelected = (student: Student | null) => {
  console.log('👤 Student selected:', student?.first_name)
  selectedStudent.value = student
  formData.value.user_id = student?.id || ''
  
  if (student?.category) {
    const primaryCategory = student.category.split(',')[0].trim()
    formData.value.type = primaryCategory
  }
  
  // Auto-generate title if we have student and location
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

const handleCategorySelected = (category: any) => {
  console.log('🎯 Category selected:', category?.code)
  if (category) {
    formData.value.price_per_minute = category.price_per_lesson / 45
  }
}

const handlePriceChanged = (price: number) => {
  formData.value.price_per_minute = price
}

const handleDurationsChanged = (durations: number[]) => {
  console.log('⏱️ Durations changed:', durations)
  availableDurations.value = durations
  
  if (!durations.includes(formData.value.duration_minutes)) {
    formData.value.duration_minutes = durations[0] || 45
  }
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

const calculateEndTime = () => {
  if (formData.value.startTime && formData.value.duration_minutes) {
    const [hours, minutes] = formData.value.startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    
    const endDate = new Date(startDate.getTime() + formData.value.duration_minutes * 60000)
    formData.value.endTime = endDate.toTimeString().slice(0, 5)
  }
}

const triggerStudentLoad = () => {
  console.log('🔄 Triggering student load...')
  if (studentSelectorRef.value?.loadStudents) {
    studentSelectorRef.value.loadStudents()
  }
}

const resetForm = () => {
  selectedStudent.value = null
  selectedLocation.value = null
  showEventTypeSelection.value = false
  formData.value = {
    id: '',
    title: '',
    type: '',
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
    discount_reason: ''
  }
  error.value = ''
  isLoading.value = false
}

// ============ SAVE LOGIC ============
const handleSave = async () => {
  console.log('💾 Saving appointment')
  
  if (!isFormValid.value) {
    error.value = 'Bitte füllen Sie alle Felder aus'
    return
  }
  
  isLoading.value = true
  error.value = ''
  
  try {
    // Create proper datetime strings
    const localStart = new Date(`${formData.value.startDate}T${formData.value.startTime}`)
    const localEnd = new Date(`${formData.value.startDate}T${formData.value.endTime}`)
    
    const appointmentData = {
      title: formData.value.title,
      start_time: localStart.toISOString(),
      end_time: localEnd.toISOString(),
      duration_minutes: formData.value.duration_minutes,
      user_id: formData.value.user_id || formData.value.staff_id, // 🔥 FIX: Staff-ID als Fallback
      staff_id: formData.value.staff_id,
      location_id: formData.value.location_id,
      type: formData.value.type,
      status: formData.value.status,
      is_paid: formData.value.is_paid,
      price_per_minute: formData.value.price_per_minute,
      description: formData.value.title || ''
    }
    
    console.log('📋 Saving appointment data:', appointmentData)
    
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
      emit('appointment-saved', result)
      
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
      emit('appointment-updated', result)
    }
    
    // Emit additional events for compatibility
    emit('save', result)
    emit('save-event', result)
    
    console.log('✅ All save events emitted for mode:', props.mode)
    
    // Show success message briefly
    setTimeout(() => {
      handleClose()
    }, 500)
    
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
    if (formData.value.user_id) {
      loadStudentForEdit(formData.value.user_id)
    }
    
  } else if (props.mode === 'create' && props.eventData?.start) {
    // Create mode with time data
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

watch(selectedStudent, (newStudent, oldStudent) => {
  if (oldStudent && !newStudent && props.mode === 'create') {
    console.log('🔄 Student cleared in create mode - triggering reload')
    setTimeout(() => {
      triggerStudentLoad()
    }, 100)
  }
})

// ============ LIFECYCLE ============
onMounted(() => {
  console.log('🔥 EventModal - Component mounted')
})
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