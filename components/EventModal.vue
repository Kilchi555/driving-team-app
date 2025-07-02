<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2" @click="handleBackdropClick">
    <div class="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] mb-12 overflow-y-auto" @click.stop>
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 rounded-t-lg">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-semibold text-gray-900">
            {{ modalTitle }}
          </h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 text-2xl">
            ✕
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-6 space-y-6">
        
        <!-- 1. FAHRSCHÜLER AUSWAHL (Standard-Ansicht) -->
        <div v-if="formData.eventType === 'lesson'" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex justify-between items-center mb-3">
            <label class="block text-sm font-semibold text-gray-900">
              🎓 Fahrschüler auswählen *
            </label>
            <button 
              @click="formData.eventType = 'other'" 
              class="text-xs text-blue-600 hover:text-blue-800 border-solid border-blue-500"
            >
              Andere Terminart
            </button>
          </div>
          
          <!-- Schüler Suche/Dropdown -->
          <div class="relative">
            <input
              v-model="studentSearchQuery"
              @input="filterStudents"
              @focus="showStudentDropdown = true"
              @blur="hideStudentDropdownDelayed"
              type="text"
              placeholder="Schüler suchen (Name, E-Mail oder Telefon)..."
              autocomplete="off"
              class="w-full p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <!-- Dropdown mit Schülern -->
            <div v-if="showStudentDropdown && filteredStudents.length > 0" 
                 class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              <div 
                v-for="student in filteredStudents" 
                :key="student.id"
                @mousedown="selectStudent(student)"
                class="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div class="font-semibold text-gray-900">{{ student.first_name }} {{ student.last_name }}</div>
              </div>
            </div>
          </div>

          <!-- Ausgewählter Schüler Anzeige -->
          <div v-if="selectedStudent" class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div class="flex justify-between items-start">
              <div>
                <div class="font-semibold text-green-800">
                  ✅ {{ selectedStudent.first_name }} {{ selectedStudent.last_name }}
                </div>
                <div class="text-sm text-green-600">
                  {{ selectedStudent.category }} • {{ selectedStudent.phone }}
                </div>
                <div class="text-xs text-gray-500">
                  Fahrlehrer: {{ getAssignedInstructorName(selectedStudent.assigned_staff_id) }}
                </div>
              </div>
              <button @click="clearStudent()" class="text-red-500 hover:text-red-700">
                ✕
              </button>
            </div>
          </div>
        </div>

        <!-- 2. TERMINART AUSWAHL (wenn gewechselt) -->
        <div v-else class="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div class="flex justify-between items-center mb-3">
            <label class="block text-sm font-semibold text-gray-900">
              📋 Terminart auswählen *
            </label>
            <button 
              @click="backToStudentSelection" 
              class="text-xs text-purple-600 hover:text-purple-800 underline"
            >
              ← Zurück zu Fahrlektion
            </button>
          </div>
          
          <div class="grid grid-cols-2 gap-2 mb-4">
            <button
              v-for="eventType in specialEventTypes.filter(t => t.value !== 'lesson')"
              :key="eventType.value"
              @click="selectSpecialEventType(eventType)"
              :class="[
                'p-3 text-sm rounded border text-left',
                formData.selectedSpecialType === eventType.value 
                  ? 'bg-purple-600 text-white border-purple-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              ]"
            >
              {{ eventType.label }}
            </button>
          </div>

          <!-- Individueller Titel -->
          <div v-if="formData.selectedSpecialType">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              📝 Titel *
            </label>
            <input
              v-model="formData.title"
              type="text"
              class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              :placeholder="formData.selectedSpecialType === 'custom' ? 'Individueller Titel...' : getDefaultTitle()"
            />
          </div>
        </div>

        <!-- 3. AUTOMATISCH GENERIERTE DATEN (basierend auf Schüler-Historie) -->
        <div v-if="selectedStudent && formData.eventType === 'lesson'" class="space-y-4">
          
          <!-- Titel (automatisch generiert) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              📝 Titel *
            </label>
            <input
              v-model="formData.title"
              type="text"
              class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="z.B. Sandra - Kategorie B"
            />
            <p class="text-xs text-gray-500 mt-1">
              🤖 Automatisch generiert: {{ selectedStudent.first_name }} - {{ selectedStudent.category }}
            </p>
          </div>

          <!-- Kategorie (basierend auf Schüler) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              🚗 Kategorie *
            </label>
            <select 
              v-model="formData.type"
              @change="handleCategoryChange"
              class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Kategorie wählen</option>
              <option value="A">A - CHF 95/45min</option>
              <option value="B">B - CHF 95/45min</option>
              <option value="BE">BE - CHF 120/45min</option>
              <option value="C">C - CHF 170/45min</option>
              <option value="CE">CE - CHF 200/45min</option>
              <option value="D">D - CHF 200/45min</option>
              <option value="BPT">BPT - CHF 100/45min</option>
              <option value="BOAT">BOAT - CHF 95/45min</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">
              🤖 Vorschlag: {{ selectedStudent.category }} (basierend auf Schüler-Profil)
            </p>
          </div>

          <!-- Dauer (intelligent vorgeschlagen) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              ⏱️ Dauer
            </label>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="duration in getRecommendedDurations()"
                :key="duration.value"
                @click="formData.duration_minutes = duration.value"
                :class="[
                  'p-2 text-sm rounded border',
                  formData.duration_minutes === duration.value 
                    ? 'bg-green-600 text-white border-green-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                ]"
              >
                {{ duration.label }}
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              🤖 Empfehlung: {{ getLastLessonDuration() }}min (letzte Lektion)
            </p>
          </div>

          <!-- Abholort (basierend auf Historie) -->
         <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            📍 Abholort *
          </label>
          <select
            v-model="formData.location_id"
            class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Ort wählen</option>
            <option v-for="location in availableLocations" :key="location.id" :value="location.id">
              {{ location.name }}
            </option>
          </select>
          
          <!-- NEU: Google Maps Link -->
          <div v-if="formData.location_id" class="mt-2">
            <a :href="getGoogleMapsUrl()" target="_blank" 
                class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
              🗺️ In Google Maps öffnen
            </a>
          </div>
          
          <p class="text-xs text-gray-500 mt-1">
            🤖 Häufigster Ort: {{ getMostUsedLocation() }}
          </p>
          </div>
        </div>

        <!-- 4. DATUM & ZEIT (für alle Terminarten) -->
        <div v-if="(formData.eventType === 'lesson' && selectedStudent) || (formData.eventType !== 'lesson' && formData.selectedSpecialType)" class="space-y-4 border-t pt-4">
          
          <!-- Datum & Zeit -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                📅 Datum *
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
                🕐 Startzeit *
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
                🕐 Endzeit *
              </label>
              <input 
                v-model="formData.endTime"
                type="time" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
              <p class="text-xs text-gray-500 mt-1">
                🤖 Berechnet: {{ computedEndTime }} ({{ formData.duration_minutes }}min)
              </p>
            </div>
          </div>

          <!-- Preis Anzeige (nur bei Fahrlektionen) -->
          <div v-if="formData.eventType === 'lesson' && parseFloat(totalPrice) > 0" class="bg-green-50 border border-green-200 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-green-800">Preis für diesen Termin:</span>
              <span class="text-lg font-bold text-green-900">CHF {{ totalPrice }}</span>
            </div>
          </div>

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
          <div class="text-4xl mb-2">👆</div>
          <p class="text-gray-600">Wählen Sie zuerst einen Schüler aus</p>
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
import { ref, computed, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'

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
}

interface Student {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  category: string
  assigned_staff_id: string
}

interface Location {
  id: string
  name: string
  address: string
}

interface Props {
  isVisible: boolean
  eventData: any
  mode: 'view' | 'edit' | 'create'
  currentUser?: any
}

const props = defineProps<Props>()
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
  selectedSpecialType: ''
})

// 3. SPECIAL EVENT TYPES
const specialEventTypes = [
  { value: 'lesson', label: '🚗 Fahrlektion', requiresStudent: true },
  { value: 'meeting', label: '🏢 Team-Sitzung', requiresStudent: false },
  { value: 'course', label: '📚 Theoriekurs', requiresStudent: false },
  { value: 'office', label: '💼 Bürozeit', requiresStudent: false },
  { value: 'break', label: '☕ Pause', requiresStudent: false },
  { value: 'custom', label: '✏️ Individuell...', requiresStudent: false }
]

// Student selection
const studentSearchQuery = ref('')
const showStudentDropdown = ref(false)
const selectedStudent = ref<Student | null>(null)
const availableStudents = ref<Student[]>([])
const filteredStudents = ref<Student[]>([])
const availableLocations = ref<Location[]>([])

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
const modalTitle = computed(() => {
  if (props.mode === 'create') return '🆕 Neuer Termin'
  if (props.mode === 'edit') return '✏️ Termin bearbeiten'
  return '👁️ Termin anzeigen'
})

const totalPrice = computed(() => {
  const pricePerMinute = categoryPricing[formData.value.type] || (95/45)
  const total = pricePerMinute * (formData.value.duration_minutes || 45)
  return total.toFixed(2)
})

const requiresStudent = computed(() => {
  return formData.value.eventType === 'lesson'
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

// Methods
const loadStudents = async () => {
  try {
    console.log('🔓 Loading ALL students (RLS test)')
    const { data: studentsData, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'client')
      // .eq('is_active', true) // Temporär entfernt
      .order('first_name')
    
    if (error) {
      console.error('❌ Students query error:', error)
      throw error
    }
    
    console.log('📊 Raw students data:', studentsData)
    availableStudents.value = studentsData || []
    filteredStudents.value = studentsData || []
    console.log('✅ Students loaded:', availableStudents.value.length)
  } catch (error) {
    console.error('❌ Error loading students:', error)
  }
}

const backToStudentSelection = () => {
  formData.value.eventType = 'lesson'
  formData.value.selectedSpecialType = ''
  formData.value.title = ''
}

const selectSpecialEventType = (eventType: any) => {
  formData.value.selectedSpecialType = eventType.value
  
  if (eventType.value !== 'custom') {
    // Entferne Emoji und nimm nur den Text
    const cleanLabel = eventType.label.split(' ').slice(1).join(' ')
    formData.value.title = cleanLabel
  } else {
    formData.value.title = ''
  }
}

const getDefaultTitle = () => {
  const type = specialEventTypes.find(t => t.value === formData.value.selectedSpecialType)
  if (!type) return ''
  
  // Entferne Emoji und nimm nur den Text
  return type.label.split(' ').slice(1).join(' ')
}

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

const filterStudents = () => {
  const query = studentSearchQuery.value.toLowerCase()
  if (!query) {
    filteredStudents.value = availableStudents.value
    return
  }
  
  filteredStudents.value = availableStudents.value.filter(student => 
    student.first_name.toLowerCase().includes(query) ||
    student.last_name.toLowerCase().includes(query) ||
    student.email.toLowerCase().includes(query) ||
    student.phone.includes(query)
  )
}

const selectStudent = (student: Student) => {
  selectedStudent.value = student
  studentSearchQuery.value = `${student.first_name} ${student.last_name}`
  showStudentDropdown.value = false
  
  // Auto-fill based on student
  autoFillFromStudent(student)
}

const clearStudent = () => {
  selectedStudent.value = null
  studentSearchQuery.value = ''
  
  // Reset form
  formData.value.title = ''
  formData.value.type = ''
  formData.value.user_id = ''
  formData.value.staff_id = ''
  formData.value.location_id = ''
  formData.value.price_per_minute = 0
}

const autoFillFromStudent = (student: Student) => {
  // Set category/type
  formData.value.type = student.category
  
  // Set user and staff IDs
  formData.value.user_id = student.id
  formData.value.staff_id = student.assigned_staff_id || props.currentUser?.id || ''
  
  // Set price per minute
  formData.value.price_per_minute = categoryPricing[student.category] || (95/45)
  
  // Set default location (first available)
  if (availableLocations.value.length > 0) {
    formData.value.location_id = availableLocations.value[0].id
  }
  
  // Auto-generate title NACH location_id
  const selectedLocation = availableLocations.value.find(loc => loc.id === formData.value.location_id)
  const locationName = selectedLocation?.name || 'Ort unbekannt'
  formData.value.title = `${student.first_name}  ${locationName}`
  
  console.log('🤖 Auto-filled form for:', student.first_name)
}

const getStudentCategories = () => {
  if (!selectedStudent.value) return []
  
  // Split categories if multiple (e.g., "B,BE")
  const categories = selectedStudent.value.category.split(',')
  
  return categories.map(cat => ({
    value: cat.trim(),
    label: `${cat.trim()} - CHF ${Math.round((categoryPricing[cat.trim()] || (95/45)) * 45)}/45min`
  }))
}

const getRecommendedDurations = () => {
  return [
    { value: 45, label: '45min' },
    { value: 60, label: '60min' },
    { value: 90, label: '90min' },
    { value: 135, label: '135min' }
  ]
}

const getLastLessonDuration = () => {
  // TODO: Fetch from appointment history
  return 45 // Placeholder
}

const getMostUsedLocation = () => {
  // TODO: Calculate from appointment history
  return availableLocations.value[0]?.name || 'Kein Standort verfügbar'
}

const getAssignedInstructorName = (staffId: string) => {
  if (staffId === props.currentUser?.id) return 'Sie'
  return instructorNames.value[staffId] || 'Unbekannter Fahrlehrer'
}

const hideStudentDropdownDelayed = () => {
  setTimeout(() => {
    showStudentDropdown.value = false
  }, 200)
}

const handleCategoryChange = () => {
  // Update price when category changes
  formData.value.price_per_minute = categoryPricing[formData.value.type] || (95/45)
  
  // Update title
  if (selectedStudent.value) {
    formData.value.title = `${selectedStudent.value.first_name} - ${formData.value.type}`
  }
}

const handleSave = async () => {
  if (!isFormValid.value) return

  isLoading.value = true
  
  try {
  const localStartDate = `${formData.value.startDate}T${formData.value.startTime}`
  const localEndDate = `${formData.value.startDate}T${formData.value.endTime}`

  const startDateTime = new Date(localStartDate)
  const endDateTime = new Date(localEndDate)

  // Berechne duration_minutes aus der Differenz (für DB-Konsistenz)
  const calculatedDuration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000)

    console.log('🕐 Time processing:', {
      inputDate: formData.value.startDate,
      inputTime: formData.value.startTime,
      combined: localStartDate,
      localStart: startDateTime.toLocaleString('de-CH'),
      utcStart: startDateTime.toISOString(),
      localEnd: endDateTime.toLocaleString('de-CH'),
      utcEnd: endDateTime.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })

    const appointmentData = {
      title: formData.value.title,
      description: formData.value.description || '',
      type: formData.value.type,
      user_id: formData.value.user_id,
      staff_id: formData.value.staff_id,
      location_id: formData.value.location_id,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      duration_minutes: calculatedDuration,
      price_per_minute: formData.value.price_per_minute,
      status: formData.value.status,
      is_paid: false
    }

    let result
    if (props.mode === 'edit' && props.eventData?.id) {
      // Update existing appointment
      result = await supabase
        .from('appointments')
        .update(appointmentData)
        .eq('id', props.eventData.id)
        .select()
    } else {
      // Create new appointment
      result = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
    }

    if (result.error) {
      throw result.error
    }

    console.log('✅ Appointment saved:', result.data?.[0])
    console.log('📅 Saved times:', {
      start_db: result.data?.[0]?.start_time,
      end_db: result.data?.[0]?.end_time,
      start_local: new Date(result.data?.[0]?.start_time).toLocaleString('de-CH'),
      end_local: new Date(result.data?.[0]?.end_time).toLocaleString('de-CH')
    })
    
    // Emit success events to update calendar
    emit('appointment-saved')
    emit('save-event', result.data?.[0]) // Pass the saved appointment data
    emit('close')
    
  } catch (error) {
    console.error('❌ Error saving appointment:', error)
    alert('Fehler beim Speichern des Termins. Bitte versuchen Sie es erneut.')
  } finally {
    isLoading.value = false
  }
}

const handleDelete = async () => {
  if (!confirm(`Termin "${formData.value.title}" wirklich löschen?`)) return
  
  isLoading.value = true
  
  try {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', props.eventData.id)
    
    if (error) throw error
    
    console.log('✅ Appointment deleted')
    
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

const handleBackdropClick = () => {
  emit('close')
}

const getGoogleMapsUrl = () => {
  const selectedLocation = availableLocations.value.find(loc => loc.id === formData.value.location_id)
  const locationName = selectedLocation?.name || selectedLocation?.address || ''
  return `https://maps.google.com/maps?q=${encodeURIComponent(locationName)}`
}

// Initialize data when modal opens
watch(() => props.isVisible, async (isVisible) => {
  if (isVisible) {
    await Promise.all([loadStudents(), loadLocations(), loadInstructors()])
    
    // Load event data if editing
    if (props.eventData && props.mode !== 'create') {
      const appointment = props.eventData
      
      // Find and select student
      const student = availableStudents.value.find(s => s.id === appointment.user_id || s.id === appointment.extendedProps?.user_id)
      if (student) {
        selectStudent(student)
      }
      
      // Fill form with appointment data
      let startDate, startTime
      
      // Bevorzugen Sie start_time (aus der Datenbank)
      if (appointment.start_time) {
        const startDateTime = new Date(appointment.start_time)
        // Lokale Komponenten extrahieren
        startDate = `${startDateTime.getFullYear()}-${String(startDateTime.getMonth() + 1).padStart(2, '0')}-${String(startDateTime.getDate()).padStart(2, '0')}`
        startTime = `${String(startDateTime.getHours()).padStart(2, '0')}:${String(startDateTime.getMinutes()).padStart(2, '0')}`
      } 
      // Dann das 'start' Event-Property (vom Kalender)
      else if (appointment.start) {
        const startDateTime = new Date(appointment.start)
        // Lokale Komponenten extrahieren
        startDate = `${startDateTime.getFullYear()}-${String(startDateTime.getMonth() + 1).padStart(2, '0')}-${String(startDateTime.getDate()).padStart(2, '0')}`
        startTime = `${String(startDateTime.getHours()).padStart(2, '0')}:${String(startDateTime.getMinutes()).padStart(2, '0')}`
      } else {
        // Fallback auf aktuelle Zeit
        const now = new Date()
        startDate = now.toISOString().split('T')[0]
        startTime = now.toTimeString().slice(0, 5)
      }
      
      formData.value = {
        title: appointment.title || '',
        description: appointment.description || appointment.extendedProps?.staff_note || '',
        type: appointment.type || appointment.extendedProps?.category || '',
        startDate: startDate,
        startTime: startTime,
        endTime: '', // Wird gleich berechnet
        duration_minutes: appointment.duration_minutes || appointment.extendedProps?.duration_minutes || 45,
        user_id: appointment.user_id || appointment.extendedProps?.user_id || '',
        staff_id: appointment.staff_id || appointment.extendedProps?.staff_id || '',
        location_id: appointment.location_id || appointment.extendedProps?.location_id || '',
        price_per_minute: appointment.price_per_minute || appointment.extendedProps?.price_per_minute || 0,
        status: appointment.status || appointment.extendedProps?.status || 'booked',
        eventType: 'lesson',
        selectedSpecialType: ''
      }
      
      // NACH der formData-Zuweisung: Endzeit berechnen
      if (appointment.end_time) {
        // Verwende direkt die end_time aus der DB
        const endDateTime = new Date(appointment.end_time)
        const endHours = String(endDateTime.getHours()).padStart(2, '0')
        const endMinutes = String(endDateTime.getMinutes()).padStart(2, '0')
        formData.value.endTime = `${endHours}:${endMinutes}`
        
        console.log('📝 Set endTime from DB:', {
          end_time: appointment.end_time,
          endTime: formData.value.endTime
        })
      } else if (appointment.end) {
        // Fallback: Verwende 'end' Property vom Event
        const endDateTime = new Date(appointment.end)
        const endHours = String(endDateTime.getHours()).padStart(2, '0')
        const endMinutes = String(endDateTime.getMinutes()).padStart(2, '0')
        formData.value.endTime = `${endHours}:${endMinutes}`
        
        console.log('📝 Set endTime from event.end:', {
          end: appointment.end,
          endTime: formData.value.endTime
        })
      } else if (formData.value.startTime && formData.value.duration_minutes) {
        // Fallback: Berechne aus startTime + duration
        const [hours, minutes] = formData.value.startTime.split(':').map(Number)
        const startDate = new Date()
        startDate.setHours(hours, minutes, 0, 0)
        const endDate = new Date(startDate.getTime() + formData.value.duration_minutes * 60000)
        
        const endHours = String(endDate.getHours()).padStart(2, '0')
        const endMinutes = String(endDate.getMinutes()).padStart(2, '0')
        formData.value.endTime = `${endHours}:${endMinutes}`
        
        console.log('📝 Calculated endTime from duration:', {
          startTime: formData.value.startTime,
          duration: formData.value.duration_minutes,
          endTime: formData.value.endTime
        })
      }
      
      console.log('📝 Editing appointment:', {
        original: appointment,
        parsed: formData.value
      })
      
    } else {
      // New event - use data from calendar click
      let startDate, startTime
      
      // **Dies ist der angepasste Teil für den 'create'-Modus:**
      // Überprüfen Sie zuerst, ob `parsedDate` und `parsedTime` vom `dateClick`-Handler gesendet wurden.
      // (Wie im vorherigen Schritt im FullCalendar-Code hinzugefügt)
      if (props.eventData?.parsedDate && props.eventData?.parsedTime) {
        startDate = props.eventData.parsedDate
        startTime = props.eventData.parsedTime
        
        console.log('📅 Creating new appointment from click (using pre-parsed local date/time):', {
          originalEventData: props.eventData,
          parsedDate: startDate,
          parsedTime: startTime,
        })
      } 
      // Fallback: Wenn nur `start` verfügbar ist (immer noch ein ISO-String),
      // konvertieren Sie ihn in die lokale Zeit.
      else if (props.eventData?.start) {
        const clickedDateTime = new Date(props.eventData.start)
        
        // **Wichtig:** Verwenden Sie hier lokale Methoden, um die Stunden, Minuten etc. zu bekommen.
        startDate = `${clickedDateTime.getFullYear()}-${String(clickedDateTime.getMonth() + 1).padStart(2, '0')}-${String(clickedDateTime.getDate()).padStart(2, '0')}`
        startTime = `${String(clickedDateTime.getHours()).padStart(2, '0')}:${String(clickedDateTime.getMinutes()).padStart(2, '0')}`
        
        console.log('📅 Creating new appointment from click (converting ISO start to local):', {
          originalStart: props.eventData.start,
          parsedDate: startDate,
          parsedTime: startTime,
          clickedDateTime: clickedDateTime.toLocaleString('de-CH')
        })
      } else {
        // Fallback auf aktuelle Zeit, wenn keine Startzeit vom Kalender kommt
        const now = new Date()
        startDate = now.toISOString().split('T')[0]
        startTime = now.toTimeString().slice(0, 5)
        
        console.log('⚠️ No start time provided, using current time:', {
          startDate,
          startTime
        })
      }
      
      // NEU: Explizit alle Felder für neue Events zurücksetzen
      selectedStudent.value = null
      studentSearchQuery.value = ''
      
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
        selectedSpecialType: ''
      }
      
      console.log('📅 Reset form for new appointment')
    }
  }
})

// Fügen Sie das zu den anderen Watchern hinzu (nach dem endTime Watcher):
watch(() => formData.value.location_id, () => {
  // Nur bei Fahrlektionen und wenn ein Schüler ausgewählt ist
  if (formData.value.eventType === 'lesson' && selectedStudent.value) {
    const selectedLocation = availableLocations.value.find(loc => loc.id === formData.value.location_id)
    const locationName = selectedLocation?.name || 'Ort unbekannt'
    formData.value.title = `${selectedStudent.value.first_name} • ${locationName}`
  }
})

watch([() => formData.value.startTime, () => formData.value.duration_minutes], () => {
  formData.value.endTime = computedEndTime.value
})

watch([() => formData.value.startTime, () => formData.value.duration_minutes], () => {
  // Nur automatisch setzen wenn Endzeit noch leer ist ODER wenn es eine Fahrlektion ist
  if (!formData.value.endTime || formData.value.eventType === 'lesson') {
    formData.value.endTime = computedEndTime.value
  }
})

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