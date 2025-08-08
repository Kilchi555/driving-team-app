<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] mb-12 overflow-y-auto" @click.stop>
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 rounded-t-lg">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-semibold text-gray-900">
            {{ mode === 'create' ? 'Neuen Termin erstellen' : mode === 'edit' ? 'Termin bearbeiten' : 'Termin anzeigen' }}
          </h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 text-2xl">
            ✕
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-6 space-y-6">
        
               <!-- 1. STUDENT SELECTOR (Neue Komponente) -->
       <StudentSelector
          v-if="eventType === 'lesson' && formData.eventType === 'lesson'"
          ref="studentSelectorRef"
          v-model="selectedStudent"
          :current-user="currentUser"
          :disabled="mode === 'view'"
          @student-selected="onStudentSelected"
          @student-cleared="onStudentCleared"
          @switch-to-other="switchToOtherEventType"
          :show-all-students="false"
        />

        <!-- 2. TERMINART AUSWAHL (wenn gewechselt) -->
         <EventTypeSelector
          v-if="showEventTypeSelection || (props.eventType === 'staff_meeting' && !formData.selectedSpecialType)"
          :selected-type="formData.selectedSpecialType"
          @event-type-selected="handleEventTypeSelected"
          @back-to-student="backToStudentSelection"
        />

          <!-- Individueller Titel -->
          <div v-if="(formData.eventType === 'lesson' && selectedStudent) || (formData.eventType !== 'lesson' && formData.selectedSpecialType)">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              📝 Titel
            </label>
            <input
              v-model="formData.title"
              type="text"
              class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              :placeholder="getDefaultTitle()"
            />
          </div>

        <!-- 3. AUTOMATISCH GENERIERTE DATEN (basierend auf Schüler-Historie) -->
        <div v-if="selectedStudent && formData.eventType === 'lesson'" class="space-y-4">

            <!-- Kategorie (basierend auf Schüler) -->
            <div>
            <CategorySelector
              ref="categoryRef"
              v-model="formData.type"
              :selected-user="selectedStudent"
              :current-user="currentUser"
              :current-user-role="currentUser?.role"
              @category-selected="handleCategorySelected"
              @price-changed="handlePriceChanged"
              @durations-changed="handleDurationsChanged"
            />

                <!-- DurationSelector -->
              <DurationSelector
                v-model="formData.duration_minutes"
                :selected-category="currentSelectedCategory"
                :current-user="currentUser"
                :price-per-minute="formData.price_per_minute"
                @duration-changed="handleDurationChanged"
            />
          </div>
        </div>

        <!-- 4. DATUM & ZEIT (für alle Terminarten) -->
        <div v-if="(formData.eventType === 'lesson' && selectedStudent) || (formData.eventType !== 'lesson' && formData.selectedSpecialType)" class="space-y-4 border-t pt-4">
          
          <!-- Datum & Zeit -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                📅 Datum
              </label>
              <input 
                v-model="formData.startDate"
                type="date" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                🕐 Startzeit
              </label>
              <input 
                v-model="formData.startTime"
                type="time" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                🕐 Endzeit
              </label>
              <input 
                v-model="formData.endTime"
                type="time" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          </div>

          <!-- EventModal.vue Template - Aufklappbare Team-Einladungen -->

          <!-- Team-Einladungen Sektion (nach Datum & Zeit) - ERSETZEN SIE DEN BESTEHENDEN TEAM-BEREICH -->
          <div v-if="formData.eventType !== 'lesson'" class="space-y-4 border-t pt-4">
            
            <!-- Aufklappbarer Header -->
            <div 
              @click="showTeamInvites = !showTeamInvites"
              class="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
            >
              <div class="flex items-center gap-3">
                <span class="text-xl">👥</span>
                <div>
                  <h3 class="font-medium text-blue-900">Team-Mitglieder einladen</h3>
                  <p class="text-sm text-blue-600">
                    {{ invitedStaff.length > 0 ? `${invitedStaff.length} Mitarbeiter eingeladen` : 'Optional' }}
                  </p>
                </div>
              </div>
              
              <!-- Pfeil-Icon -->
              <div 
                :class="[
                  'transform transition-transform duration-200',
                  showTeamInvites ? 'rotate-180' : 'rotate-0'
                ]"
              >
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>

            <!-- Aufklappbarer Inhalt -->
            <Transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 max-h-0 overflow-hidden"
              enter-to-class="opacity-100 max-h-96"
              leave-active-class="transition-all duration-300 ease-in"
              leave-from-class="opacity-100 max-h-96"
              leave-to-class="opacity-0 max-h-0 overflow-hidden"
            >
              <div v-if="showTeamInvites" class="space-y-3">
                
                <!-- Team-Mitglieder Liste -->
                <div v-if="availableStaff.length === 0" class="text-center py-4 text-gray-500">
                  <span class="text-3xl mb-2 block">👤</span>
                  <p class="text-sm">Keine weiteren Teammitglieder verfügbar</p>
                </div>
                
                <div v-else class="space-y-2">
                  <div 
                    v-for="staff in availableStaff" 
                    :key="staff.id"
                    class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div class="flex items-center gap-3">
                      <input
                        :id="`staff-${staff.id}`"
                        type="checkbox"
                        :checked="invitedStaff.includes(staff.id)"
                        @change="toggleStaffInvite(staff.id)"
                        class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label :for="`staff-${staff.id}`" class="cursor-pointer flex-1">
                        <div class="flex items-center gap-3">
                          <!-- Avatar Placeholder -->
                          <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span class="text-sm font-medium text-blue-600">
                              {{ staff.first_name.charAt(0) }}{{ staff.last_name.charAt(0) }}
                            </span>
                          </div>
                          <div>
                            <div class="font-medium text-gray-900">
                              {{ staff.first_name }} {{ staff.last_name }}
                            </div>
                            <div class="text-sm text-gray-500">
                              {{ staff.email }}
                            </div>
                          </div>
                        </div>
                      </label>
                      
                      <!-- Status Badge -->
                      <div v-if="invitedStaff.includes(staff.id)" class="flex items-center gap-1">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          ✓ Eingeladen
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Zusammenfassung der Einladungen -->
                <div v-if="invitedStaff.length > 0" class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div class="flex items-start gap-3">
                    <span class="text-blue-600 text-lg mt-0.5">ℹ️</span>
                    <div class="text-sm text-blue-800">
                      <p class="font-medium mb-1">Team-Einladung wird versendet</p>
                      <p>Die eingeladenen Teammitglieder erhalten eine Kopie dieses Termins in ihrem Kalender. Der Termin wird als "{{ formData.title || 'Termin' }} (Eingeladen)" angezeigt.</p>
                      
                      <!-- Liste der eingeladenen Personen -->
                      <div class="mt-2 flex flex-wrap gap-1">
                        <span 
                          v-for="staffId in invitedStaff" 
                          :key="staffId"
                          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-200 text-blue-900"
                        >
                          {{ getStaffName(staffId) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Schnell-Aktionen -->
                <div class="flex gap-2">
                  <button
                    v-if="invitedStaff.length > 0"
                    @click="clearAllInvites"
                    class="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded border border-red-200 hover:bg-red-50"
                  >
                    Alle entfernen
                  </button>
                  <button
                    v-if="invitedStaff.length < availableStaff.length"
                    @click="inviteAllStaff"
                    class="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
                  >
                    Alle einladen
                  </button>
                </div>
              </div>
            </Transition>
          </div>

            <!-- Location Sektion -->
            <LocationSelector
              v-model="formData.location_id"
              :selected-student-id="formData.user_id"
              :selected-student-name="selectedStudent?.first_name || ''"
              :current-staff-id="formData.staff_id"
              @location-selected="onLocationSelected"
              required
            />

          <!-- Preis Anzeige (nur bei Fahrlektionen) -->
           <PriceDisplay
            :event-type="formData.eventType"
            :duration-minutes="formData.duration_minutes"
            :price-per-minute="formData.price_per_minute"
            :category-code="formData.type"
            :category-info="selectedCategory"
            :selectedDate="formData.startDate"   
            :selectedTime="formData.startTime" 
            :start-time="formData.startTime"  
            :available-durations="availableDurations"
            :is-paid="formData.is_paid"
            :admin-fee="getAdminFeeForCategory()"
            :appointment-number="appointmentNumber"
            :show-admin-fee-by-default="false"
            :discount="formData.discount || 0"
            :discount-type="formData.discount_type || 'fixed'"
            :discount-reason="formData.discount_reason || ''"
            :allow-discount-edit="currentUser?.role === 'staff' || currentUser?.role === 'admin'"
            @discount-changed="handleDiscountChanged"
          />

          <!-- Notizen -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                💬 Beschreibung
              </label>
              <textarea 
                v-model="formData.description"
                rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                :placeholder="formData.eventType === 'lesson' ? 'Notiz für die Fahrstunde...' : 'Notiz für den Termin...'"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Fallback: Kein Schüler/Terminart ausgewählt -->
        <div v-if="formData.eventType === 'lesson' && !selectedStudent" class="text-center py-8 bg-gray-50 rounded-lg">
          <div class="text-4xl mb-2 text-blue-600">↑</div>
          <p class="text-blue-600">Wählen Sie zuerst einen Schüler aus</p>
          <p class="text-sm text-gray-500">Alle anderen Felder werden automatisch vorausgefüllt</p>
        </div>

        <div v-if="formData.eventType !== 'lesson' && !formData.selectedSpecialType" class="text-center py-8 bg-gray-50 rounded-lg">
          <div class="text-4xl mb-2">📋</div>
          <p class="text-gray-600">Wählen Sie eine Terminart aus</p>
          <p class="text-sm text-gray-500">Dann können Sie Datum und Zeit festlegen</p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="px-6 py-4">
        <div class="text-center text-gray-600">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          Termin wird gespeichert...
        </div>
      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 bg-gray-50 px-2 py-2 rounded-b-lg border-t">
        <div class="flex justify-between">
          <div>
            <button 
              v-if="mode === 'edit'" 
              @click="handleDelete"
              class="px-2 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              :disabled="isLoading"
            >
              Löschen
            </button>
          </div>
          <div class="flex space-x-3">
            <button 
              @click="$emit('close')" 
              class="px-2 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-small"
              :disabled="isLoading"
            >
              Abbrechen
            </button>
            <button 
              @click="handleSave"
              :disabled="!isFormValid || isLoading"
              class="px-2 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ mode === 'create' ? '📅 Termin erstellen' : 'Speichern' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'
import LocationSelector from './LocationSelector.vue'
import { useAppointmentStatus } from '~/composables/useAppointmentStatus'
import { usePendingTasks } from '~/composables/usePendingTasks'
import StudentSelector from './StudentSelector.vue'
import EventTypeSelector from './EventTypeSelector.vue'
import CategorySelector from '~/components/CategorySelector.vue'
import DurationSelector from '~/components/DurationSelector.vue'
import PriceDisplay from '~/components/PriceDisplay.vue'


// 1. UPDATED INTERFACE
interface AppointmentData {
  id?: string
  title: string
  description: string
  type: string
  startDate: string
  startTime: string
  endTime: string 
  duration_minutes: number
  user_id: string
  staff_id: string
  location_id: string
  price_per_minute: number
  start_time?: string
  end_time?: string
  status: string
  eventType: string 
  selectedSpecialType: string 
  is_paid: boolean 
  discount?: number
  discount_type?: 'fixed' | 'fixed'
  discount_reason?: string
}

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  category: string
  assigned_staff_id: string
  preferred_location_id?: string
  preferred_duration?: number 
}

// ✅ FIX: Location Interface erweitern (in types/index.ts oder oben in der Datei)
interface Location {
  id: string
  name: string
  address: string
  staff_id?: string  // ✅ Hinzufügen
  latitude?: number
  longitude?: number
  google_place_id?: string
  created_at?: string
}

// Oder falls du das Interface schon hast, erweitere es:
interface ExtendedLocation extends Location {
  staff_id?: string
}

interface Props {
  isVisible: boolean
  eventData: any
  mode: 'view' | 'edit' | 'create'
  currentUser?: any
  eventType?: 'lesson' | 'staff_meeting'
  
}

interface Staff {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface EventType {
  code: string
  name: string
  emoji: string
  description?: string
  default_duration_minutes?: number // ← OPTIONAL machen!
  default_color?: string
  auto_generate_title?: boolean
  price_per_minute?: number
}

// ✅ FIX: Category Interface für Supabase Response
interface CategoryResponse {
  code: string
  price_per_lesson: number
  lesson_duration: number
  name?: string
  is_active?: boolean
}

interface SelectedLocation {
  id?: string
  name: string
  address: string
  place_id?: string
  latitude?: number
  longitude?: number
  source: 'standard' | 'pickup' | 'google'
}


// Props mit Default-Werten:
const props = withDefaults(defineProps<Props>(), {
  isVisible: false,
  mode: 'create',
  eventData: null,
  currentUser: null,
  eventType: 'lesson' // ✅ Default: lesson
})

const emit = defineEmits<{
  close: []
  'save-event': [eventData: any]
  'delete-event': [eventData: any]
  'appointment-saved': []
}>()

const supabase = getSupabase()

// State
const isLoading = ref(false)
const instructorNames = ref<Record<string, string>>({})
const showTeamInvites = ref(false)
const availableLocations = ref<Location[]>([])
const dummyUserId = ref<string | null>(null)
const isDummyUserLoading = ref(false)
const defaultLocationId = ref<string | null>(null)
const availableStaff = ref<Staff[]>([])
const invitedStaff = ref<string[]>([])
const selectedEventType = ref('')  // Separate reactive var
const currentEventTypeData = ref<EventType | null>(null)
const modalJustOpened = ref(false)
const modalError = ref<string | null>(null)
const selectedLocation = ref<SelectedLocation | null>(null)
const error = ref<string | null>(null) // Falls das fehlt
const selectedStudent = ref<Student | null>(null)
const studentSelectorRef = ref<any>(null)
const selectedCategory = ref<any>(null)
const availableDurations = ref<number[]>([45]) // Standard-Dauer
const categoryRef = ref<any>(null)
const appointmentNumber = ref<number>(1)

const getAppointmentNumber = async (userId?: string) => {
  const studentId = userId || formData.value.user_id
  
  // Falls Edit-Mode und Termin bereits existiert
  if (props.mode === 'edit' || !studentId) {
    return 1 // Vereinfacht für bestehende Termine
  }
  
  try {
    console.log('📊 Counting previous appointments for student:', studentId)
    
    // Zähle vorherige Termine dieses Schülers
    const { count, error } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', studentId)
      .in('status', ['completed', 'confirmed'])
    
    if (error) throw error
    
    const nextAppointmentNumber = (count || 0) + 1
    console.log(`📈 Found ${count || 0} previous appointments, this will be #${nextAppointmentNumber}`)
    
    return nextAppointmentNumber
    
  } catch (err) {
    console.error('❌ Error counting appointments:', err)
    return 1
  }
}

const handleCategorySelected = (category: any) => {
  console.log('🎯 EventModal - handleCategorySelected called with:', category)
  
  selectedCategory.value = category
  if (category) {
    formData.value.price_per_minute = category.price_per_lesson / 45
    if (category.availableDurations?.length > 0) {
      formData.value.duration_minutes = category.availableDurations[0]
      calculateEndTime()
      console.log('✅ Set duration from category:', category.availableDurations[0])
    } else {
      console.log('❌ No availableDurations in category:', category)
    }
  }
}

const handlePriceChanged = (pricePerMinute: number) => {
    console.log('🎯 EventModal - handlePriceChanged CALLED with:', pricePerMinute)
  formData.value.price_per_minute = pricePerMinute
}

const handleDurationsChanged = (durations: number[]) => {
  console.log('🎯 EventModal - handleDurationsChanged called with:', durations)
  console.log('🎯 Current formData.type:', formData.value.type)
  
  availableDurations.value = durations
  
  // Validierung: Wenn aktuelle Dauer nicht verfügbar, erste verfügbare wählen
  if (durations.length > 0 && !durations.includes(formData.value.duration_minutes)) {
    formData.value.duration_minutes = durations[0]
    calculateEndTime()
    console.log('✅ Set duration to:', durations[0])
  } else if (durations.length === 0) {
    console.log('❌ No durations received!')
  }
}

// 4. ✅ Event Handler für Rabatt-Änderungen
const handleDiscountChanged = (discount: number, discountType: string, reason: string) => {
  console.log('🏷️ Discount changed:', { discount, discountType, reason })
  
  formData.value.discount = discount
  formData.value.discount_type = discountType as 'fixed' | 'fixed'
  formData.value.discount_reason = reason
  
  console.log('✅ Discount applied to formData')
}

const handleDurationChanged = (duration: number) => {
  console.log('⏱️ Duration changed:', duration)
  calculateEndTime()
}

const getAdminFeeForCategory = () => {
  if (!selectedCategory.value) return 0
  
  const adminFees: Record<string, number> = {
    'B': 120, 'A1': 0, 'A35kW': 0, 'A': 0, 'BE': 120,
    'C1': 200, 'D1': 200, 'C': 200, 'CE': 250, 'D': 300,
    'Motorboot': 120, 'BPT': 120
  }
  
  return adminFees[selectedCategory.value.code] || 0
}

// ✅ HINZUFÜGEN falls nicht vorhanden:
const showEventTypeSelection = computed(() => {
  return formData.value.eventType === 'other'
})

// 3. EVENT HANDLERS FÜR STUDENTSELECTOR
const onStudentSelected = async (student: Student) => {
  console.log('🎯 Student selected via StudentSelector:', student.first_name)
  
  // selectedStudent wird automatisch durch v-model gesetzt
  // Hier nur Auto-Fill Logik ausführen
  await autoFillFromStudentDynamic(student)
}

const autoFillFromStudentDynamic = async (student: Student) => {
  console.log('🤖 Auto-filling form dynamically for:', student.first_name)

    // Im Edit/View Mode nur user_id setzen, kein Auto-fill
  if (props.mode === 'edit' || props.mode === 'view') {
    formData.value.user_id = student.id
    console.log('✏️ Edit mode detected - skipping auto-fill')
    return
  }
  
  // Set category/type
  formData.value.type = student.category
  
  // Set user and staff IDs
  formData.value.user_id = student.id
  formData.value.staff_id = student.assigned_staff_id || props.currentUser?.id || ''
  
  // Set price per minute
  formData.value.price_per_minute = categoryPricing[student.category] || (95/45)
  
  // Set preferred duration
  formData.value.duration_minutes = student.preferred_duration || 45
  console.log('⏱️ Duration set to:', formData.value.duration_minutes, 'minutes')
  
  // Load last appointment duration (async)
  try {
    const lastDuration = await getLastAppointmentDuration(student.id)
    formData.value.duration_minutes = lastDuration
    console.log('⏱️ Updated duration from history:', lastDuration, 'minutes')
  } catch (err) {
    console.log('⚠️ Could not load last duration, using default')
  }
  
  // Set preferred location
  if (student.preferred_location_id) {
    formData.value.location_id = student.preferred_location_id
    console.log('📍 Using student preferred location')
  } else if (availableLocations.value.length > 0) {
    formData.value.location_id = availableLocations.value[0].id
    console.log('📍 Using first available location')
  }
  
  // Auto-generate title NACH location_id
  const selectedLocation = availableLocations.value.find(loc => loc.id === formData.value.location_id)
  const locationName = selectedLocation?.name || 'Ort unbekannt'
  formData.value.title = `${student.first_name} • ${locationName}`
  
  // Endzeit automatisch berechnen
  if (formData.value.startTime) {
    formData.value.endTime = computedEndTime.value
    console.log('🕐 End time calculated:', formData.value.endTime)
  }
  
  console.log('✅ Auto-fill completed for:', student.first_name)
}

// EventModal.vue - Das bleibt hier:
const handleEventTypeSelected = (eventType: EventType) => {
  try {
    console.log('📋 Processing selected event type:', eventType)
    
    // Formular-Daten sicher setzen
    formData.value.selectedSpecialType = eventType.code
    formData.value.duration_minutes = eventType.default_duration_minutes || 45
    formData.value.duration_minutes = eventType.default_duration_minutes ?? 45

    // ✅ Titel automatisch setzen bei auto_generate_title
    if (eventType.auto_generate_title) {
      formData.value.title = eventType.name || 'Neuer Termin'
      console.log('📝 Title auto-generated:', formData.value.title)
    } else if (!formData.value.title || formData.value.title.trim() === '') {
      formData.value.title = eventType.name || 'Neuer Termin'
    }
    
    // Endzeit SICHER berechnen
    calculateEndTime()
    
  } catch (error) {
    console.error('❌ Error in handleEventTypeSelected:', error)
  }
}

// ✅ Korrigierte Version:
const selectedEventTypeObject = computed(() => {
  if (!formData.value.selectedSpecialType) return null
  
  // Fallback Event Type Object erstellen
  return {
    code: formData.value.selectedSpecialType,
    name: getEventTypeName(formData.value.selectedSpecialType),
    emoji: '📝'
  }
})

// Helper Funktion für Event Type Namen
const getEventTypeName = (code: string): string => {
  switch (code) {
    case 'meeting':
      return 'Team-Meeting'
    case 'course':
      return 'Verkehrskunde'
    case 'other':
      return 'Sonstiger Termin'
    default:
      return code || 'Neuer Termin'
  }
}

const getDefaultTitle = () => {
  // Für normale Fahrlektionen
  if (formData.value.eventType === 'lesson' && selectedStudent.value) {
    const studentName = selectedStudent.value.first_name || 'Schüler'
    return `${studentName}`
  }
  
  // Für Special Event Types
  if (formData.value.selectedSpecialType) {
    return getEventTypeName(formData.value.selectedSpecialType)
  }
  
  return 'Neuer Termin'
}

const calculateEndTime = () => {
  if (formData.value.startTime && formData.value.duration_minutes) {
    try {
      // Validate and parse startTime
      if (formData.value.startTime.includes(':')) {
        const timeParts = formData.value.startTime.split(':')
        if (timeParts.length === 2) {
          const hours = parseInt(timeParts[0]) || 0
          const minutes = parseInt(timeParts[1]) || 0

          // Ensure hours and minutes are valid
          if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            const startDate = new Date();
            startDate.setHours(hours, minutes, 0, 0); // Set time, keeping current date

            const endDate = new Date(startDate.getTime() + (formData.value.duration_minutes * 60000));

            const endHours = String(endDate.getHours()).padStart(2, '0');
            const endMinutes = String(endDate.getMinutes()).padStart(2, '0');

            formData.value.endTime = `${endHours}:${endMinutes}`;
            console.log('⏰ End time calculated:', formData.value.endTime);
          } else {
            console.error('❌ Invalid startTime format or values. Hours must be 0-23 and minutes 0-59.');
          }
        } else {
          console.error('❌ Invalid startTime format. Expected "HH:MM".');
        }
      } else {
        console.error('❌ startTime is missing the ":" separator. Expected "HH:MM".');
      }
    } catch (timeError) {
      console.error('❌ Error calculating end time:', timeError);
    }
  } else {
    console.log('⚠️ startTime or duration_minutes are missing, cannot calculate end time.');
  }
};

const backToStudentSelection = () => {
  formData.value.eventType = 'lesson'
  formData.value.selectedSpecialType = ''
  formData.value.title = ''
}

const onStudentCleared = () => {
  console.log('🗑️ Student cleared')
  
  // Reset form
  formData.value.title = ''
  formData.value.type = ''
  formData.value.user_id = ''
  formData.value.staff_id = ''
  formData.value.location_id = ''
  formData.value.price_per_minute = 0
}

const switchToOtherEventType = () => {
  formData.value.eventType = 'other'
  formData.value.selectedSpecialType = ''
  formData.value.title = ''
}

const formData = ref<AppointmentData>({
  title: '',
  description: '',
  type: '',
  startDate: '',
  startTime: '',
  endTime: '', 
  duration_minutes: 45,
  user_id: '',
  staff_id: '',
  location_id: '',
  price_per_minute: 0,
  status: 'booked',
  eventType: 'lesson', 
  selectedSpecialType: '',
  is_paid: false,
  discount: 0,
  discount_type: 'fixed',
  discount_reason: ''
})



// Hilfsfunktionen
const getStaffName = (staffId: string) => {
  const staff = availableStaff.value.find(s => s.id === staffId)
  return staff ? `${staff.first_name} ${staff.last_name}` : 'Unbekannt'
}

const clearAllInvites = () => {
  invitedStaff.value = []
  console.log('🗑️ All team invites cleared')
}

const inviteAllStaff = () => {
  invitedStaff.value = availableStaff.value.map(s => s.id)
  console.log('👥 All staff invited:', invitedStaff.value.length)
}

// Category pricing (aus der Projektdokumentation)
const categoryPricing: Record<string, number> = {
  'A': 95/45,    // CHF 95 pro 45min = ~2.11 pro Minute
  'B': 95/45,    
  'BE': 120/45,  // CHF 120 pro 45min = ~2.67 pro Minute
  'C': 170/45,   
  'CE': 200/45,  
  'D': 200/45,   
  'BPT': 100/45, 
  'BOAT': 95/45  
}

// 4. COMPUTED PROPERTIES

// Neue computed property für selectedCategory
const currentSelectedCategory = computed(() => {
  // Falls CategorySelector eine selectedCategory hat, die verwenden
  if (categoryRef.value?.selectedCategory) {
    return categoryRef.value.selectedCategory
  }
  
  // Fallback: Aus formData.type eine einfache Category-Struktur erstellen
  if (formData.value.type) {
    return { 
      code: formData.value.type,
      name: formData.value.type // Einfacher Fallback
    }
  }
  
  return null
})

const totalPrice = computed(() => {
  const pricePerMinute = categoryPricing[formData.value.type] || (95/45)
  const total = pricePerMinute * (formData.value.duration_minutes || 45)
  return total.toFixed(2)
})

const computedEndTime = computed(() => {
  if (!formData.value.startTime || !formData.value.duration_minutes) return ''
  
  const [hours, minutes] = formData.value.startTime.split(':').map(Number)
  const startDate = new Date()
  startDate.setHours(hours, minutes, 0, 0)
  
  const endDate = new Date(startDate.getTime() + formData.value.duration_minutes * 60000)
  
  const endHours = String(endDate.getHours()).padStart(2, '0')
  const endMinutes = String(endDate.getMinutes()).padStart(2, '0')
  
  return `${endHours}:${endMinutes}`
})

const isLessonType = computed(() => {
  return selectedEventType.value === 'lesson' || 
         (currentEventTypeData.value && currentEventTypeData.value.code === 'lesson')
})

const showTeamInvitesSection = computed(() => {
  return !isLessonType.value && selectedEventType.value !== ''
})

const loadInstructors = async () => {
  try {
    console.log('🔓 Loading ALL instructors (RLS test)')
    const { data: instructorsData, error } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'staff')
      // .eq('is_active', true) // Temporär entfernt
    
    if (error) {
      console.error('❌ Instructors query error:', error)
      throw error
    }
    
    console.log('📊 Raw instructors data:', instructorsData)
    
    // Create lookup object for instructor names
    instructorNames.value = {}
    instructorsData?.forEach(instructor => {
      instructorNames.value[instructor.id] = `${instructor.first_name} ${instructor.last_name}`
    })
    
    console.log('✅ Instructors loaded:', Object.keys(instructorNames.value).length)
  } catch (error) {
    console.error('❌ Error loading instructors:', error)
  }
}

const loadLocations = async () => {
  try {
    const { data: locationsData, error } = await supabase
      .from('locations')
      .select('*')
      .order('name')
    
    if (error) throw error
    
    availableLocations.value = locationsData || []
    console.log('✅ Locations loaded:', availableLocations.value.length)
  } catch (error) {
    console.error('❌ Error loading locations:', error)
  }
}

const handleCategoryPriceUpdate = () => {
  // Update price when category changes
  formData.value.price_per_minute = categoryPricing[formData.value.type] || (95/45)
  // Update title
  if (selectedStudent.value) {
    formData.value.title = `${selectedStudent.value.first_name} - ${formData.value.type}`
  }
}

// Dummy-User laden (nur bei Bedarf)
const loadDummyUser = async () => {
  if (dummyUserId.value) {
    // Bereits geladen
    return dummyUserId.value
  }
  
  if (isDummyUserLoading.value) {
    // Bereits am Laden, warten
    return new Promise((resolve) => {
      const checkLoaded = () => {
        if (dummyUserId.value) {
          resolve(dummyUserId.value)
        } else {
          setTimeout(checkLoaded, 100)
        }
      }
      checkLoaded()
    })
  }
  
  isDummyUserLoading.value = true
  
  try {
    console.log('🔄 Loading dummy user "Driving Team"...')
    
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('first_name', 'Driving')
      .eq('last_name', 'Team')
      .single()
    
    if (error) {
      console.error('❌ Error loading dummy user:', error)
      throw new Error('Dummy-User "Driving Team" nicht gefunden')
    }
    
    dummyUserId.value = data.id
    console.log('✅ Dummy user loaded:', data.id)
    return data.id
    
  } catch (error) {
    console.error('❌ Error in loadDummyUser:', error)
    throw error
  } finally {
    isDummyUserLoading.value = false
  }
}

// EventModal.vue - Standard-Locations + Team-Einladungen

// Standard-Location laden
const loadDefaultLocation = async () => {
  if (defaultLocationId.value) {
    return defaultLocationId.value
  }
  
  try {
    console.log('🔄 Loading default location...')
    
    // Erste verfügbare Location als Standard
    const { data, error } = await supabase
      .from('locations')
      .select('id, name')
      .limit(1)
      .single()
    
    if (error || !data) {
      throw new Error('Keine Standorte verfügbar')
    }
    
    defaultLocationId.value = data.id
    console.log('✅ Default location:', data.name)
    return data.id
    
  } catch (error) {
    console.error('❌ Error loading default location:', error)
    throw error
  }
}

// Alle Staff-Mitglieder laden (für Team-Einladungen)
const loadAvailableStaff = async () => {
  try {
    console.log('🔄 Loading team members...')
    
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('role', 'staff')
      .eq('is_active', true)
      .neq('id', props.currentUser?.id) // Aktueller User ausschließen
    
    if (error) throw error
    
    availableStaff.value = data || []
    console.log('✅ Team members loaded:', availableStaff.value.length)
    
  } catch (error) {
    console.error('❌ Error loading staff:', error)
  }
}

// Team-Mitglied zur Einladung hinzufügen/entfernen
const toggleStaffInvite = (staffId: string) => {
  const index = invitedStaff.value.indexOf(staffId)
  if (index > -1) {
    invitedStaff.value.splice(index, 1)
    console.log('➖ Staff removed from invite:', staffId)
  } else {
    invitedStaff.value.push(staffId)
    console.log('➕ Staff added to invite:', staffId)
  }
}

// Team-Termine erstellen (separate Appointments für jeden eingeladenen Staff)
const createTeamAppointments = async (mainAppointmentData: any, savedMainAppointment: any) => {
  if (invitedStaff.value.length === 0) return
  
  try {
    console.log('👥 Creating team appointments for:', invitedStaff.value.length, 'members')
    
    const teamAppointments = invitedStaff.value.map(staffId => ({
      ...mainAppointmentData,
      staff_id: staffId,
      title: `${mainAppointmentData.title} (Eingeladen)`,
      description: `${mainAppointmentData.description}\n\nEingeladen von: ${props.currentUser?.first_name} ${props.currentUser?.last_name}`,
      type: 'team_invite'
    }))
    
    const { data, error } = await supabase
      .from('appointments')
      .insert(teamAppointments)
      .select()
    
    if (error) throw error
    
    console.log('✅ Team appointments created:', data?.length)
    return data
    
  } catch (error) {
    console.error('❌ Error creating team appointments:', error)
    // Nicht kritisch - Haupttermin wurde bereits gespeichert
  }
}

const onLocationSelected = (location: SelectedLocation) => {
  console.log('📍 Location selected in EventModal:', location)
  selectedLocation.value = location
  
  // Setze location_id nur wenn es eine echte UUID ist (nicht temp_)
  if (location?.id && !location.id.startsWith('temp_')) {
    formData.value.location_id = location.id
    console.log('✅ Real location ID set:', location.id)
  } else {
    formData.value.location_id = '' // Leerer String statt null für TypeScript
    console.log('⚠️ Temporary location, will save on appointment creation')
  }
}

// EventModal.vue - Minimale Korrekturen für bestehenden Code
  
  const startDateTime = new Date(`${formData.value.startDate}T${formData.value.startTime}:00`)
  const endDateTime = new Date(startDateTime.getTime() + (formData.value.duration_minutes * 60 * 1000))

const handleSave = async () => {
  try {
    isLoading.value = true
    console.log('🔥 Starting save...', { eventType: formData.value.eventType })
    
    // 1. VALIDATION
    if (!isFormValid.value) {
      throw new Error('Bitte füllen Sie alle Pflichtfelder aus')
    }

    // 2. ROUTING: Appointments vs Staff Meetings
    if (formData.value.eventType === 'lesson') {
      await saveAppointment() // Deine bestehende Logik
    } else {
      await saveStaffMeeting() // Neue Funktion
    }
    
  } catch (err: unknown) {
    console.error('❌ Error saving:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler'
    error.value = errorMessage
  } finally {
    isLoading.value = false
  }
}

// 1. GEMEINSAME handleLocation Funktion
const handleLocationLogic = async () => {
  let finalLocationId = formData.value.location_id
  
  // Prüfe ob wir eine temporäre Location haben die gespeichert werden muss
  if (!finalLocationId && selectedLocation.value) {
    console.log('🔄 Processing custom location:', selectedLocation.value)
    
    // Falls es eine Google Places Location ist, speichere sie erst
    if (selectedLocation.value.source === 'google' || selectedLocation.value.id?.startsWith('temp_')) {
      
      // Für Staff Meetings: staff_id verwenden statt user_id
      const locationUserId = formData.value.eventType === 'lesson' 
        ? formData.value.user_id 
        : null // Staff meetings brauchen keine user_id für locations
      
      if (formData.value.eventType === 'lesson' && !locationUserId) {
        throw new Error('Schüler muss ausgewählt sein für individuellen Treffpunkt')
      }
      
      // Speichere neue Location
      const { data: savedLocation, error: locationError } = await supabase
        .from('locations')
        .insert({
          location_type: formData.value.eventType === 'lesson' ? 'pickup' : 'custom',
          user_id: locationUserId,
          staff_id: formData.value.eventType === 'lesson' ? null : formData.value.staff_id,
          name: formData.value.eventType === 'lesson' 
            ? `${selectedStudent.value?.first_name || 'Schüler'} - ${selectedLocation.value.name}`
            : selectedLocation.value.name,
          address: selectedLocation.value.address,
          latitude: selectedLocation.value.latitude || null,
          longitude: selectedLocation.value.longitude || null,
          google_place_id: selectedLocation.value.place_id || null,
          is_active: true
        })
        .select()
        .single()

      if (locationError) {
        console.error('❌ Error saving location:', locationError)
        throw new Error(`Fehler beim Speichern des Standorts: ${locationError.message}`)
      }

      finalLocationId = savedLocation.id
      console.log('✅ Location saved with ID:', finalLocationId)
    }
  }

  // Validate final location
  if (!finalLocationId) {
    throw new Error('Standort muss ausgewählt werden')
  }

  return finalLocationId
}

// 3. NEUE FUNKTION für Staff Meetings
const saveStaffMeeting = async () => {
  const finalLocationId = await handleLocationLogic()

  // Staff Meeting Data
  const meetingData = {
    title: formData.value.title.trim(),
    description: formData.value.description?.trim() || '',
    start_time: `${formData.value.startDate}T${formData.value.startTime}:00`,
    end_time: `${formData.value.startDate}T${computedEndTime.value}:00`,
    duration_minutes: Number(formData.value.duration_minutes),
    staff_id: formData.value.staff_id,
    location_id: finalLocationId,
    event_type_code: formData.value.selectedSpecialType,
    status: formData.value.status || 'confirmed'
  }

  console.log('📝 Staff meeting data to save:', meetingData)

  // Save to staff_meetings table
  let result
  if (props.mode === 'edit' && props.eventData?.id) {
    result = await supabase
      .from('staff_meetings')
      .update(meetingData)
      .eq('id', props.eventData.id)
      .select()
      .single()
  } else {
    result = await supabase
      .from('staff_meetings')
      .insert(meetingData)
      .select()
      .single()
  }

  if (result.error) {
    throw new Error(`Datenbank-Fehler: ${result.error.message}`)
  }

  emit('save-event', result.data)
  emit('close')
  console.log('🎉 Staff meeting saved successfully!')
}

// 2. Save Appointment (Fahrstunden)
const saveAppointment = async () => {
  try {
    isLoading.value = true
    console.log('🔥 Starting appointment save...')
    
    const finalLocationId = await handleLocationLogic()

    // 4. PREPARE APPOINTMENT DATA - korrigierte Typen
    const appointmentData = {
      title: formData.value.title.trim(),
      description: formData.value.description?.trim() || '',
      start_time: `${formData.value.startDate}T${formData.value.startTime}:00`,
      end_time: `${formData.value.startDate}T${computedEndTime.value}:00`,
      duration_minutes: Number(formData.value.duration_minutes), // String zu Number
      user_id: formData.value.user_id,
      staff_id: formData.value.staff_id,
      location_id: finalLocationId,
      price_per_minute: Number(formData.value.price_per_minute) || 0, // String zu Number
      type: formData.value.type || 'lesson',
      status: formData.value.status || 'confirmed',
      is_paid: false,
      discount: formData.value.discount || 0,
      discount_type: formData.value.discount_type || 'fixed',
      discount_reason: formData.value.discount_reason || null
    }

    console.log('📝 Appointment data to save:', appointmentData)

    // 5. SAVE OR UPDATE APPOINTMENT
    let result
    if (props.mode === 'edit' && props.eventData?.id) {
      // UPDATE
      const { data, error } = await supabase
        .from('appointments')
        .update(appointmentData)
        .eq('id', props.eventData.id)
        .select()
        .single()

      result = { data, error }
      console.log('🔄 Updated appointment:', data?.id)
    } else {
      // CREATE  
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single()

      result = { data, error }
      console.log('✅ Created appointment:', data?.id)
    }

    if (result.error) {
      console.error('❌ Supabase error:', result.error)
      throw new Error(`Datenbank-Fehler: ${result.error.message}`)
    }

    // 6. CREATE PAYMENT ENTRY FOR NEW APPOINTMENTS
    if (result.data && props.mode === 'create') {
      console.log('💰 Creating payment entry for new appointment...')
      
      // Calculate total price
      const duration = Number(formData.value.duration_minutes)
      const pricePerMinute = Number(formData.value.price_per_minute)
      const basePrice = duration * pricePerMinute
      
      // TODO: Get admin fee from settings or calculate based on business logic
      const adminFeePercentage = 10 // 10% admin fee (example)
      const adminFee = Math.round(basePrice * adminFeePercentage / 100)
      
      const paymentData = {
        appointment_id: result.data.id,
        user_id: formData.value.user_id,
        staff_id: formData.value.staff_id,
        amount_rappen: Math.round(basePrice * 100), // Convert to Rappen
        admin_fee_rappen: Math.round(adminFee * 100), // Convert to Rappen
        total_amount_rappen: Math.round((basePrice + adminFee) * 100), // Convert to Rappen
        payment_method: 'pending', // Will be set when payment is made
        payment_status: 'pending',
        currency: 'CHF',
        description: `${formData.value.title} - ${duration} Min`,
        metadata: {
          category: formData.value.type,
          duration_minutes: duration,
          price_per_minute: pricePerMinute,
          location_id: formData.value.location_id,
          discount: formData.value.discount || 0,
          discount_type: formData.value.discount_type || 'fixed',
          discount_reason: formData.value.discount_reason || null
        }
      }
      
      const { data: paymentResult, error: paymentError } = await supabase
        .from('payments')
        .insert(paymentData)
        .select()
        .single()
      
      if (paymentError) {
        console.error('⚠️ Warning: Could not create payment entry:', paymentError)
        // Don't throw error - appointment is already created
        // You might want to notify the user or log this for admin attention
      } else {
        console.log('✅ Payment entry created:', paymentResult.id)
      }
    }

    console.log('🚨 EMIT save-event:', result.data)

    // 7. SUCCESS - verwende deine bestehenden emit-Namen
    emit('save-event', result.data) // Das ist richtig laut deinen defineEmits
    emit('close')
    
    console.log('🎉 Appointment saved successfully!')

  } catch (err: unknown) {
    console.error('❌ Error saving appointment:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler'
    
    // Verwende bestehende error ref (die du schon hast)
    if (typeof error !== 'undefined') {
      error.value = errorMessage
    } else {
      // Fallback falls error ref nicht existiert
      modalError.value = errorMessage
    }
  } finally {
    isLoading.value = false
  }
}



const handleDelete = async () => {
  if (!confirm(`Termin "${formData.value.title}" wirklich löschen?`)) return
  
  isLoading.value = true
  
  try {
    // 🆕 VORHER: Termin-Daten für Pendenzenmodal speichern
    const deletedAppointmentEnd = new Date(props.eventData?.end || props.eventData?.endStr)
    const now = new Date()
    const wasPastAppointment = deletedAppointmentEnd < now
    
    console.log('🗑️ Deleting appointment:', {
      end: deletedAppointmentEnd.toISOString(),
      wasPast: wasPastAppointment
    })
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', props.eventData.id)
    
    if (error) throw error
    
    console.log('✅ Appointment deleted')

        if (wasPastAppointment) {
      console.log('📅 Deleted past appointment - triggering immediate refresh')
      
      const { updateOverdueAppointments } = useAppointmentStatus()
      const { fetchPendingTasks } = usePendingTasks()
      
      // Status updaten (falls andere Termine betroffen)
      await updateOverdueAppointments()
      
      // Pendenzen neu laden
      if (props.currentUser?.id) {
        await fetchPendingTasks(props.currentUser.id)
      }
      
      console.log('✅ Immediate refresh after delete completed')
    }
    
    console.log('🚨 EMIT delete-event:', props.eventData)

    // HIER IST DER FIX: emit delete-event VOR close
    emit('delete-event', props.eventData)
    emit('appointment-saved') 
    emit('close')
    
  } catch (error) {
    console.error('❌ Error deleting appointment:', error)
    alert('Fehler beim Löschen des Termins.')
  } finally {
    isLoading.value = false
  }
}


// ====================================
// KOMBINIERTE ONMOUNTED FUNKTION
// ====================================
onMounted(async () => {
  console.log('📅 EventModal mounted')
  
  try {
    console.log('🔄 Loading basic data...')
    
    // Basis-Daten laden
    if (typeof loadInstructors === 'function') {
      await loadInstructors()
    }
    if (typeof loadLocations === 'function') {
      await loadLocations()
    }
    
    // Team-Mitglieder laden
    if (typeof loadAvailableStaff === 'function') {
      await loadAvailableStaff()
    }
    
    // Google Maps für LocationSelector initialisieren
    if (typeof window !== 'undefined' && window.google) {
      console.log('🗺️ Google Maps available, will be initialized by LocationSelector')
    }
    
    console.log('✅ All data loaded')
    
    // Termintyp-Erkennung für Edit-Mode
    if (props.mode === 'edit' && props.eventData) {
      console.log('📝 Edit mode: Auto-detecting event type')
      const appointmentType = props.eventData.extendedProps?.appointment_type ||
                            props.eventData.extendedProps?.original_type ||
                            props.eventData.extendedProps?.category
      
      console.log('🔍 Detected appointment type:', appointmentType)
      
      if (appointmentType && appointmentType !== 'lesson') {
        formData.value.eventType = 'other'
        formData.value.selectedSpecialType = appointmentType
        formData.value.title = props.eventData.title || ''
        console.log('✅ Switched to "other" event type for:', appointmentType)
      }
      
      // Locations für Edit-Mode: Falls ein Student bereits ausgewählt ist, 
      // seine Pickup-Locations laden (wird vom LocationSelector-Watcher gemacht)
      if (formData.value.user_id) {
        console.log('👤 Edit mode: Student already selected, LocationSelector will load pickup locations')
      }
    }
    
    // CREATE-Mode Initialisierung
    if (props.mode === 'create') {
      console.log('🆕 Create mode: Ready for user input')
      // LocationSelector wird automatisch Standard-Locations laden
    }
    
    console.log('✅ EventModal fully initialized')
    
  } catch (error) {
    console.error('❌ Error in EventModal onMounted:', error)
  }
})

// ====================================
// 2. DYNAMISCHE DURATION-FUNKTION
// ====================================
const getLastAppointmentDuration = async (studentId: string): Promise<number> => {
  try {
    console.log('⏱️ Loading last appointment duration for:', studentId)
    
    const { data, error } = await supabase
      .from('appointments')
      .select('duration_minutes, end_time, title')
      .eq('user_id', studentId)
      .eq('status', 'completed')
      .order('end_time', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !data?.duration_minutes) {
      console.log('📋 No previous appointments, using default 45min')
      return 45
    }
    
    console.log('✅ Last appointment duration:', data.duration_minutes, 'min')
    return data.duration_minutes
  } catch (err) {
    console.log('❌ Error loading last appointment:', err)
    return 45
  }
}

// ====================================
// EVENTMODAL WATCHERS - Nach StudentSelector Integration
// ====================================

// 1. MODAL LIFECYCLE WATCHER
watch(() => props.isVisible, async (isVisible) => {
  console.log('👀 Modal visibility changed to:', isVisible)
  
  if (isVisible) {
    modalError.value = null
    modalJustOpened.value = true
    console.log('🔄 Modal opening - starting initialization...')
    
    try {
      // Basis-Daten laden (StudentSelector lädt eigene Students)
      await Promise.all([
        loadLocations(),
        loadInstructors(),
        loadAvailableStaff()
      ])
      
      console.log('✅ All base data loaded')
      modalJustOpened.value = false
      
      if (!props.isVisible) {
        console.log('❌ Modal was closed during data loading - aborting')
        return
      }
      
      // Mode-basierte Verarbeitung
      if (props.eventData && (props.mode === 'edit' || props.mode === 'view')) {
        console.log('📝 Processing EDIT/VIEW mode...')
        await handleEditMode()
      } else {
        console.log('📅 Processing CREATE mode...')
        await handleCreateMode()
      }
      
      console.log('✅ Modal initialization completed')
      
    } catch (error: unknown) {
      console.error('❌ Error during modal initialization:', error)
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden der Modal-Daten'
      modalError.value = errorMessage
    }
    
  } else {
    // Modal wird geschlossen - State zurücksetzen
    console.log('❌ Modal closed - resetting state')
    selectedStudent.value = null
    selectedLocation.value = null
    invitedStaff.value = []
    showTeamInvites.value = false
    
    // Form zurücksetzen
    formData.value = {
      title: '',
      description: '',
      type: '',
      startDate: '',
      startTime: '',
      endTime: '',
      duration_minutes: 45,
      user_id: '',
      staff_id: '',
      location_id: '',
      price_per_minute: 0,
      status: 'booked',
      eventType: 'lesson',
      selectedSpecialType: '',
      is_paid: false,
      discount: 0,
      discount_type: 'fixed',
      discount_reason: ''

    }
  }
})

// 2. TITLE GENERATION WATCHER
watch([
  () => selectedStudent.value,
  () => formData.value.location_id,
  () => formData.value.eventType,
  () => formData.value.selectedSpecialType,
  () => formData.value.type
], ([currentStudent, locationId, eventType, specialType, category]) => {

    // Schutz für Edit-Mode - kein Auto-Title-Generation
  if (props.mode === 'edit' || props.mode === 'view') {
    console.log(`📝 ${props.mode} mode detected - skipping auto-title generation`)
    return
  }
  
  if (eventType === 'lesson' && currentStudent) {
    // FAHRLEKTION: Student + Ort + Kategorie
    const selectedLocation = availableLocations.value.find(loc => loc.id === locationId)
    const locationName = selectedLocation?.name || ''
    const currentCategory = category || currentStudent.category || ''
    
    if (locationName && currentCategory) {
      formData.value.title = `${currentStudent.first_name} • ${locationName} (${currentCategory})`
    } else if (locationName) {
      formData.value.title = `${currentStudent.first_name} • ${locationName}`
    } else if (currentCategory) {
      formData.value.title = `${currentStudent.first_name} - ${currentCategory}`
    } else {
      formData.value.title = `${currentStudent.first_name}`
    }
    
    console.log('✏️ Title generated:', formData.value.title)
  }
}, { immediate: true })

// 3. ZEIT-BERECHNUNG WATCHER
watch([() => formData.value.startTime, () => formData.value.duration_minutes], () => {
  if (formData.value.startTime && formData.value.duration_minutes) {
    formData.value.endTime = computedEndTime.value
  }
}, { immediate: true })

// 4. EVENT-TYPE-CHANGES WATCHER
watch(() => formData.value.eventType, (newType) => {
  console.log('👀 Event type changed to:', newType)
  
  // Form-Reset bei Typ-Wechsel
  if (newType !== 'lesson') {
    formData.value.user_id = ''
    formData.value.type = ''
    selectedStudent.value = null
  }
}, { immediate: false })

// 5. LOCATION DEBUGGING WATCHER
watch(() => formData.value.location_id, (newVal, oldVal) => {
  console.log('🔄 location_id changed:', oldVal, '→', newVal)
})

watch(() => selectedLocation.value, (newVal, oldVal) => {
  console.log('🔄 selectedLocation changed:', oldVal?.name, '→', newVal?.name)
})

// 6. STUDENT AUTO-FILL WATCHER (für user_id changes)
watch(() => formData.value.user_id, async (newUserId) => {
  // Schutz für Edit-Mode - kein Auto-Fill
  if (props.mode === 'edit' || props.mode === 'view') {
    console.log(`📝 ${props.mode} mode detected - skipping auto-fill`)
    return
  }
  
  // Nur für CREATE mode und lesson events
  if (newUserId && formData.value.eventType === 'lesson') {
    // Student ist bereits durch selectedStudent.value verfügbar
    // Diese Logik wurde in onStudentSelected() Event Handler verschoben
    console.log('🎯 User ID changed in CREATE mode:', newUserId)
    
    // ✅ NEU: Appointment Number für Preis-Kalkulation laden
    try {
      console.log('🔢 Loading appointment number for pricing...')
      appointmentNumber.value = await getAppointmentNumber(newUserId)
      console.log('✅ Appointment number loaded:', appointmentNumber.value)
    } catch (err) {
      console.error('❌ Error loading appointment number:', err)
      appointmentNumber.value = 1 // Fallback
    }
  } else if (!newUserId) {
    // ✅ NEU: Reset appointment number wenn kein Student ausgewählt
    appointmentNumber.value = 1
    console.log('🔄 Reset appointment number to 1')
  }
}, { immediate: false })

// Watcher hinzufügen
watch(() => formData.value.duration_minutes, calculateEndTime)

// Im EventModal - Watch für formData.type
// Watch für formData.type - aber nur wenn CategorySelector bereit ist
watch(() => formData.value.type, async (newType) => {
  if (newType && categoryRef.value) {
    console.log('👀 Category type changed to:', newType)
    
    // Warte bis CategorySelector vollständig geladen ist
    await nextTick()
    
    // Prüfe ob availableCategoriesForUser verfügbar ist
    if (categoryRef.value.availableCategoriesForUser) {
      const selectedCat = categoryRef.value.availableCategoriesForUser.find((cat: any) => cat.code === newType)
      if (selectedCat) {
        console.log('🔧 Manual trigger for:', selectedCat.code, selectedCat.availableDurations)
        handleCategorySelected(selectedCat)
        handleDurationsChanged(selectedCat.availableDurations)
      }
    } else {
      console.log('⚠️ CategorySelector not ready yet, will retry...')
      // Retry in 100ms
      setTimeout(() => {
        const selectedCat = categoryRef.value?.availableCategoriesForUser?.find((cat: any) => cat.code === newType)
        if (selectedCat) {
          console.log('🔧 Delayed trigger for:', selectedCat.code)
          handleCategorySelected(selectedCat)
          handleDurationsChanged(selectedCat.availableDurations)
        }
      }, 100)
    }
  }
}, { immediate: true })

// Im EventModal - CategorySelector Load Detection
watch(() => categoryRef.value?.staffCategoryDurations?.length, (newLength) => {
  console.log('🎯 Watch triggered! Length:', newLength, 'Type:', formData.value.type)
  if (newLength > 0 && formData.value.type) {
    console.log('🎯 CategorySelector loaded, triggering for:', formData.value.type)
    const selectedCat = categoryRef.value.availableCategoriesForUser?.find((cat: any) => cat.code === formData.value.type)
    if (selectedCat) {
      console.log('🔧 Post-load trigger:', selectedCat)
      handleCategorySelected(selectedCat)
      handleDurationsChanged(selectedCat.availableDurations)
    } else {
      console.log('❌ Category not found in availableCategoriesForUser')
    }
  }
})

// Im EventModal - Debug Watch hinzufügen
watch(() => categoryRef.value, (newRef) => {
  if (newRef) {
    console.log('📊 CategorySelector ref available!')
    console.log('📊 Available properties:', Object.keys(newRef))
    console.log('📊 staffCategoryDurations:', newRef.staffCategoryDurations)
    console.log('📊 availableCategoriesForUser:', newRef.availableCategoriesForUser)
  }
}, { immediate: true })

// ====================================
// HILFSFUNKTIONEN FÜR MODAL-MODES
// ====================================

const handleEditMode = async () => {
  const appointment = props.eventData
  console.log('📝 handleEditMode - Raw appointment data:', appointment)
  
  // Event-Type Detection
  const appointmentType = appointment.extendedProps?.appointment_type || 
                         appointment.extendedProps?.original_type ||
                         appointment.type ||
                         'lesson'
  
  const otherEventTypes = ['meeting', 'break', 'training', 'maintenance', 'admin', 'team_invite', 'other']
  const isOtherEvent = appointmentType && otherEventTypes.includes(appointmentType.toLowerCase())
  
  console.log('🔍 Event type detection:', { appointmentType, isOtherEvent })
  
  // Zeit-Verarbeitung
  const startDateTime = new Date(appointment.start_time || appointment.start)
  const endDateTime = appointment.end_time || appointment.end ? new Date(appointment.end_time || appointment.end) : null
  
  const startDate = startDateTime.toISOString().split('T')[0]
  const startTime = startDateTime.toTimeString().slice(0, 5)
  const endTime = endDateTime ? endDateTime.toTimeString().slice(0, 5) : ''
  
  // Duration berechnen
  let duration = appointment.duration_minutes || appointment.extendedProps?.duration_minutes
  if (!duration && endDateTime) {
    duration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60))
  }
  duration = duration || 45
  
  // Form-Daten setzen
  const newFormData = {
    title: appointment.title || '',
    description: appointment.description || appointment.extendedProps?.description || '',
    type: appointment.type || appointment.extendedProps?.category || '',
    startDate: startDate,
    startTime: startTime,
    endTime: endTime,
    duration_minutes: duration,
    user_id: appointment.user_id || appointment.extendedProps?.user_id || '',
    staff_id: appointment.staff_id || appointment.extendedProps?.staff_id || props.currentUser?.id || '',
    location_id: appointment.location_id || appointment.extendedProps?.location_id || '',
    price_per_minute: appointment.price_per_minute || appointment.extendedProps?.price_per_minute || 0,
    status: appointment.status || appointment.extendedProps?.status || 'confirmed',
    eventType: isOtherEvent ? 'other' : 'lesson',
    selectedSpecialType: isOtherEvent ? appointmentType : '',
    is_paid: appointment.is_paid || false 

  }
  
  console.log('📋 Setting form data:', newFormData)
  formData.value = newFormData
  
  // Schüler für Edit-Mode setzen (über StudentSelector Ref)
  if (newFormData.user_id && newFormData.eventType === 'lesson') {
    await selectStudentForEditMode(newFormData.user_id)
  }
  
  console.log('✅ handleEditMode completed')

  setTimeout(() => {
    if (formData.value.type && props.currentUser?.id) {
      loadCategoryDurations(formData.value.type, props.currentUser.id)
    }
  }, 1000)
}

const loadCategoryDurations = async (categoryCode: string, staffId: string) => {
  console.log('🔄 Loading durations for category:', categoryCode, 'staff:', staffId)
  
  try {
    const supabase = getSupabase()
    
    // Direkte Abfrage der staff_category_durations
    const { data: durationsData, error } = await supabase
      .from('staff_category_durations')
      .select('duration_minutes')
      .eq('staff_id', staffId)
      .eq('category_code', categoryCode)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) throw error

    const durations = durationsData?.map(d => d.duration_minutes) || []
    console.log('✅ Loaded durations from DB:', durations)
    
    if (durations.length > 0) {
      availableDurations.value = durations
      formData.value.duration_minutes = durations[0]
      calculateEndTime()
      console.log('🎯 Set duration to:', durations[0])
    } else {
      console.log('⚠️ No durations found for', categoryCode)
    }

  } catch (err) {
    console.error('❌ Error loading category durations:', err)
  }
}


const handleCreateMode = async () => {
  // Zeit aus Calendar-Click oder jetzt
  let startDate, startTime
  
  if (props.eventData?.parsedDate && props.eventData?.parsedTime) {
    startDate = props.eventData.parsedDate
    startTime = props.eventData.parsedTime
  } else if (props.eventData?.start) {
    const clickedDateTime = new Date(props.eventData.start)
    startDate = clickedDateTime.toISOString().split('T')[0]
    startTime = clickedDateTime.toTimeString().slice(0, 5)
  } else {
    const now = new Date()
    startDate = now.toISOString().split('T')[0]
    startTime = now.toTimeString().slice(0, 5)
  }
  
  // Reset für neue Termine
  selectedStudent.value = null
  
  formData.value = {
    title: '',
    description: '',
    type: '',
    startDate: startDate,
    startTime: startTime,
    endTime: '',
    duration_minutes: 45,
    user_id: '',
    staff_id: props.currentUser?.id || '',
    location_id: '',
    price_per_minute: 0,
    status: 'booked',
    eventType: 'lesson',
    selectedSpecialType: '',
    is_paid: false,
    discount: 0,
    discount_type: 'fixed',
    discount_reason: ''

  }
  
  console.log('📅 Create mode ready')
}

const selectStudentForEditMode = async (userId: string) => {
  console.log('📝 Selecting student for edit mode:', userId)
  
  // ✅ ERWEITERT: Lade Studenten mit spezifischer ID für Edit-Modus
  if (studentSelectorRef.value) {
    // 1. Erst Studenten laden (inkl. der spezifischen ID)
    if (studentSelectorRef.value.loadStudents) {
      await studentSelectorRef.value.loadStudents(userId)
    }
    
    // 2. Dann Student auswählen
    if (studentSelectorRef.value.selectStudentById) {
      const student = await studentSelectorRef.value.selectStudentById(userId)
      if (student) {
        selectedStudent.value = student
        console.log('✅ Student selected for edit mode:', student.first_name)
      }
    }
  } else {
    console.warn('❌ StudentSelector ref not available for edit mode')
  }
}



// 7. UPDATED FORM VALIDATION
const isFormValid = computed(() => {
  const baseValid = formData.value.title && 
                   formData.value.startDate && 
                   formData.value.startTime &&
                   formData.value.endTime

  if (formData.value.eventType === 'lesson') {
    return baseValid && 
           selectedStudent.value && 
           formData.value.type && 
           formData.value.location_id &&
           formData.value.duration_minutes > 0
  } else {
    return baseValid && formData.value.selectedSpecialType
  }
})
</script>