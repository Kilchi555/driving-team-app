<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2" @click="handleBackdropClick">
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
        
        <!-- 1. FAHRSCHÜLER AUSWAHL (Standard-Ansicht) -->
        <div v-if="formData.eventType === 'lesson'" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex justify-between items-center mb-3">
            <label class="block text-sm font-semibold text-gray-900">
              🎓 Fahrschüler auswählen *
            </label>
            <button 
              @click="switchToOtherEventType" 
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

          <div v-if="availableEventTypes.length === 0" class="text-center py-4">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
            <p class="text-sm text-gray-600">Terminarten werden geladen...</p>
          </div>
          
          <div class="grid grid-cols-2 gap-2 mb-4">
            <button
              v-for="eventType in availableEventTypes" :key="eventType.code"
              @click="selectSpecialEventType(eventType)"
              :class="[
                'p-3 text-sm rounded border text-left',
                formData.selectedSpecialType === eventType.code 
                  ? 'bg-purple-600 text-white border-purple-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              ]"
            >
            {{ eventType.emoji }} {{ eventType.name }}
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
                  <h3 class="font-medium text-blue-900">Team-Einladungen</h3>
                  <p class="text-sm text-blue-600">
                    {{ invitedStaff.length > 0 ? `${invitedStaff.length} Mitarbeiter eingeladen` : 'Optional - Teammitglieder zum Termin einladen' }}
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

            <!-- Location Sektion verbessern -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                📍 Standort *
              </label>
              <select
                v-model="formData.location_id"
                class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Standort wählen</option>
                <option v-for="location in availableLocations" :key="location.id" :value="location.id">
                  {{ location.name }}
                </option>
              </select>
              
              <!-- Standard-Location Hinweis -->
              <p v-if="!formData.location_id" class="text-xs text-gray-500 mt-1">
                ℹ️ Falls kein Standort gewählt wird, wird der Standard-Standort verwendet
              </p>
              
              <!-- Google Maps Link -->
              <div v-if="formData.location_id" class="mt-2">
                <a :href="getGoogleMapsUrl()" target="_blank" 
                    class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  🗺️ In Google Maps öffnen
                </a>
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
import { ref, computed, watch, onMounted, nextTick } from 'vue'
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
  preferred_location_id?: string

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
  default_duration_minutes: number
  default_color?: string
  auto_generate_title?: boolean
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
const showTeamInvites = ref(false)
const studentSearchQuery = ref('')
const showStudentDropdown = ref(false)
const selectedStudent = ref<Student | null>(null)
const availableStudents = ref<Student[]>([])
const filteredStudents = ref<Student[]>([])
const availableLocations = ref<Location[]>([])
const dummyUserId = ref<string | null>(null)
const isDummyUserLoading = ref(false)
const defaultLocationId = ref<string | null>(null)
const availableStaff = ref<Staff[]>([])
const invitedStaff = ref<string[]>([])
const selectedEventType = ref('')  // Separate reactive var
const currentEventTypeData = ref<EventType | null>(null)


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
const availableEventTypes = ref<EventType[]>([])
const isLoadingEventTypes = ref(false)

const loadEventTypes = async () => {
  isLoadingEventTypes.value = true
  
  try {
    console.log('🔄 Loading event types from database...')
    const { data, error } = await supabase
      .from('event_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
    
    if (error) throw error
    
    availableEventTypes.value = (data || []) as EventType[]  // ✅ Type Assertion
    
    console.log('✅ Event types loaded:', {
      count: availableEventTypes.value.length,
      types: availableEventTypes.value.map((et: EventType) => `${et.emoji} ${et.name} (${et.default_duration_minutes}min)`)  // ✅ Type Assertion
    })
    
  } catch (error) {
    console.error('❌ Error loading event types:', error)
    
    // Fallback: Statische Event-Types falls DB-Abfrage fehlschlägt
    availableEventTypes.value = [
      {
        code: 'meeting',
        name: 'Besprechung',
        emoji: '🤝',
        description: 'Team-Meeting, Kundengespräch',
        default_duration_minutes: 60,
        default_color: '#019ee5'
      },
      {
        code: 'break',
        name: 'Pause',
        emoji: '☕',
        description: 'Mittagspause, Kaffeepause',
        default_duration_minutes: 30,
        default_color: '#62b22f'
      },
      {
        code: 'other',
        name: 'Sonstiges',
        emoji: '📝',
        description: 'Individueller Termin',
        default_duration_minutes: 45,
        default_color: '#666666'
      }
    ] as EventType[]  // ✅ Type Assertion
    
    console.log('🔄 Using fallback event types')
    
  } finally {
    isLoadingEventTypes.value = false
  }
}

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

// Automatisch aufklappen falls bereits Einladungen vorhanden
watch(() => invitedStaff.value.length, (newCount) => {
  if (newCount > 0 && !showTeamInvites.value) {
    showTeamInvites.value = true
  }
})

// Hilfsfunktionen für Template (angepasst für DB)
const getSelectedEventType = () => {
  return availableEventTypes.value.find(et => et.code === formData.value.selectedSpecialType)
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

// Methods

const backToStudentSelection = () => {
  formData.value.eventType = 'lesson'
  formData.value.selectedSpecialType = ''
  formData.value.title = ''
}
const selectSpecialEventType = (eventType: EventType) => {  // ✅ Typ ändern: any → EventType
  try {
    console.log('📋 Selecting event type:', eventType)
    
    // Sichere Checks
    if (!eventType || !eventType.code) {
      console.error('❌ Invalid event type:', eventType)
      return
    }
    
    // Formular-Daten sicher setzen
    formData.value.selectedSpecialType = eventType.code
    formData.value.duration_minutes = eventType.default_duration_minutes || 45
    
    // ✅ ÄNDERUNG: Titel IMMER automatisch setzen bei auto_generate_title
    if (eventType.auto_generate_title) {
      formData.value.title = eventType.name || 'Neuer Termin'
      console.log('📝 Title auto-generated:', formData.value.title)
    } else if (!formData.value.title || formData.value.title.trim() === '') {
      // Nur bei manuellen Types und leerem Titel setzen
      formData.value.title = eventType.name || 'Neuer Termin'
    }
    
    // Endzeit SICHER berechnen
    if (formData.value.startTime && formData.value.startTime.includes(':')) {
      try {
        const timeParts = formData.value.startTime.split(':')
        if (timeParts.length === 2) {
          const hours = parseInt(timeParts[0]) || 0
          const minutes = parseInt(timeParts[1]) || 0
          if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            const startDate = new Date()
            startDate.setHours(hours, minutes, 0, 0)
            const endDate = new Date(startDate.getTime() + (formData.value.duration_minutes * 60000))
            const endHours = String(endDate.getHours()).padStart(2, '0')
            const endMinutes = String(endDate.getMinutes()).padStart(2, '0')
            formData.value.endTime = `${endHours}:${endMinutes}`
            console.log('⏰ End time calculated:', formData.value.endTime)
          }
        }
      } catch (timeError) {
        console.error('❌ Error calculating end time:', timeError)
      }
    }
    
    console.log('✅ Event type selected successfully:', {
      code: eventType.code,
      name: eventType.name,
      duration: formData.value.duration_minutes,
      title: formData.value.title
    })
    
  } catch (error) {
    console.error('❌ Error in selectSpecialEventType:', error)
  }
}



const getDefaultTitle = () => {
  const type = getSelectedEventType()
  return type ? type.name : ''
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
    student.email?.toLowerCase().includes(query) ||  // ✅ Optional chaining
    student.phone?.includes(query)                   // ✅ Optional chaining
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

// Funktion wird aufgerufen wenn User auf "Andere Terminart" klickt
const switchToOtherEventType = async () => {
  console.log('🔄 Switching to other event type...')
  
  // Erst Event-Types laden falls noch nicht vorhanden
  if (availableEventTypes.value.length === 0) {
    console.log('📋 Loading event types for other event selection...')
    await loadEventTypes()
  }
  
  // Dann auf "other" umschalten
  formData.value.eventType = 'other'
  
  console.log('✅ Switched to other event type', {
    availableTypes: availableEventTypes.value.length,
    types: availableEventTypes.value.map((t: any) => t.name)
  })
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

// Erweiterte handleSave mit Team-Einladungen
const handleSave = async () => {
  if (!isFormValid.value) return
  
  isLoading.value = true
  
  try {
    // Zeit-Verarbeitung (Ihr bestehender Code)
    const localStartDate = `${formData.value.startDate}T${formData.value.startTime}`
    const localEndDate = `${formData.value.startDate}T${formData.value.endTime}`
    const startDateTime = new Date(localStartDate)
    const endDateTime = new Date(localEndDate)
    const calculatedDuration = Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000)

    // Helper-Funktionen (HINZUFÜGEN)
    const sanitizeUuid = (value: string | null | undefined): string | null => {
      if (!value || value.trim() === '') {
        return null
      }
      return value
    }

    const sanitizeNumber = (value: any): number | null => {
      if (value === null || value === undefined || value === '') {
        return null
      }
      const num = parseFloat(value)
      return isNaN(num) ? null : num
    }

    // User-ID bestimmen
    let appointmentUserId: string
    if (formData.value.eventType === 'lesson' && selectedStudent.value?.id) {
      appointmentUserId = selectedStudent.value.id
    } else {
      appointmentUserId = await loadDummyUser()
    }

    // Location-ID bestimmen
    let appointmentLocationId: string
    if (formData.value.location_id && formData.value.location_id.trim() !== '') {
      appointmentLocationId = formData.value.location_id
    } else {
      appointmentLocationId = await loadDefaultLocation()
    }

    // Appointment-Daten
    const appointmentData = {
      title: formData.value.title || 'Neuer Termin',
      description: formData.value.description || '',
      type: formData.value.type || (formData.value.selectedSpecialType || 'other'),
      
      user_id: appointmentUserId,
      staff_id: props.currentUser?.id,
      location_id: appointmentLocationId,
      
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      duration_minutes: calculatedDuration,
      
      // JETZT FUNKTIONIERT ES:
     price_per_minute: formData.value.eventType === 'lesson' ? 
     sanitizeNumber(formData.value.price_per_minute) || 0 : 0,
      
      status: 'confirmed',
      is_paid: formData.value.eventType === 'lesson' ? false : true
    }

    console.log('💾 Saving main appointment:', appointmentData)

    // Haupt-Termin speichern
    let result
    if (props.mode === 'edit' && props.eventData?.id) {
      result = await supabase
        .from('appointments')
        .update(appointmentData)
        .eq('id', props.eventData.id)
        .select()
    } else {
      result = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
    }

    if (result.error) throw result.error

    const savedAppointment = result.data?.[0]
    console.log('✅ Main appointment saved:', savedAppointment)

    // Team-Termine erstellen (nur bei neuen Terminen und wenn Team eingeladen)
    if (props.mode !== 'edit' && invitedStaff.value.length > 0) {
      await createTeamAppointments(appointmentData, savedAppointment)
    }

    // Erfolg
    emit('appointment-saved')
    emit('save-event', savedAppointment)
    emit('close')

  } catch (error: any) {
    console.error('❌ Error saving appointment:', error)
    
    if (error.code === '23502') {
      if (error.message.includes('location_id')) {
        alert('❌ Standort-Fehler: Bitte wählen Sie einen Standort aus.')
      } else {
        alert('❌ Pflichtfeld fehlt: Bitte überprüfen Sie alle Eingaben.')
      }
    } else {
      alert(`❌ Fehler beim Speichern: ${error.message || 'Unbekannter Fehler'}`)
    }
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


// EventModal.vue - Automatische Termintyp-Erkennung

// In der onMounted oder watch-Funktion (Edit-Mode):
onMounted(async () => {
  console.log('📅 EventModal mounted')
  
  try {
    console.log('🔄 Loading basic data...')
    
    
    if (typeof loadInstructors === 'function') {
      await loadInstructors()
    }
    
    if (typeof loadLocations === 'function') {
      await loadLocations()
    }
    
    // Team-Mitglieder laden
    await loadAvailableStaff()
    
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
    }
    
    console.log('✅ EventModal fully initialized')
    
  } catch (error) {
    console.error('❌ Error in EventModal onMounted:', error)
  }
})

// Initialize data when modal opens
// EventModal.vue - Bestehenden watch erweitern
watch(() => selectedEventType.value, (newType) => {
  console.log('👀 Watching event type change:', newType)
  nextTick(() => {
    console.log('⚡ UI should update now - isLessonType:', isLessonType.value)
  })
})

watch(() => props.isVisible, async (isVisible) => {
  if (isVisible) {
    // Event-Types IMMER laden (nicht nur bei Other)
    console.log('🔄 Loading event types at modal open...')
    await loadEventTypes()
    
    // Studenten laden
    try {
      console.log('🔄 Loading students explicitly...')
      
      const { data: studentsData, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'client')
        .eq('is_active', true)
        .order('first_name')
      
      if (error) throw error
      
      availableStudents.value = studentsData || []
      console.log('✅ Students loaded explicitly:', availableStudents.value.length)
      
    } catch (error) {
      console.error('❌ Error loading students:', error)
    }
    
    // Rest der Lade-Funktionen...
    await Promise.all([loadLocations(), loadInstructors()])
    
    if (typeof loadAvailableStaff === 'function') {
      await loadAvailableStaff()
    }
    
    // Load event data if editing
    if (props.eventData && props.mode !== 'create') {
      const appointment = props.eventData
      
      // Termintyp-Erkennung
      const appointmentType = appointment.extendedProps?.appointment_type || 
                             appointment.extendedProps?.original_type ||
                             appointment.extendedProps?.category ||
                             appointment.type ||
                             appointment.extendedProps?.type
      
      console.log('🔍 Detected appointment type:', appointmentType)
      
      let eventType = 'lesson'
      let selectedSpecialType = ''
      
      const otherEventTypes = [
        'meeting', 'break', 'training', 'maintenance', 'admin', 'team_invite', 'other',
        'office', 'bürozeit', 'pause', 'schulung', 'wartung'
      ]
      
      if (appointmentType && otherEventTypes.includes(appointmentType.toLowerCase())) {
        eventType = 'other'
        selectedSpecialType = appointmentType
        console.log('✅ OTHER event type:', appointmentType)
      } else {
        console.log('✅ LESSON event type for:', appointmentType)
      }
      
      // Schüler-Auswahl für Fahrlektionen
      if (eventType === 'lesson') {
        const userId = appointment.user_id || appointment.extendedProps?.user_id
        
        console.log('🔍 STUDENT LOADING (after explicit load):', {
          userId,
          availableStudents_length: availableStudents.value?.length || 0,
          allStudentIds: availableStudents.value?.map(s => s.id) || []
        })
        
        if (userId && availableStudents.value?.length > 0) {
          const student = availableStudents.value.find(s => s.id === userId)
          
          if (student && typeof selectStudent === 'function') {
            selectStudent(student)
            console.log('👨‍🎓 Student selected successfully:', student.first_name, student.last_name)
          } else {
            console.log('❌ Student not found after explicit load:', {
              searchingFor: userId,
              availableIds: availableStudents.value.map(s => s.id)
            })
          }
        } else {
          console.log('❌ Missing data for student selection:', {
            userId,
            hasStudents: availableStudents.value?.length > 0
          })
        }
      }
      
      // Zeit-Verarbeitung
      let startDate, startTime
      
      if (appointment.start_time) {
        const startDateTime = new Date(appointment.start_time)
        startDate = `${startDateTime.getFullYear()}-${String(startDateTime.getMonth() + 1).padStart(2, '0')}-${String(startDateTime.getDate()).padStart(2, '0')}`
        startTime = `${String(startDateTime.getHours()).padStart(2, '0')}:${String(startDateTime.getMinutes()).padStart(2, '0')}`
      } 
      else if (appointment.start) {
        const startDateTime = new Date(appointment.start)
        startDate = `${startDateTime.getFullYear()}-${String(startDateTime.getMonth() + 1).padStart(2, '0')}-${String(startDateTime.getDate()).padStart(2, '0')}`
        startTime = `${String(startDateTime.getHours()).padStart(2, '0')}:${String(startDateTime.getMinutes()).padStart(2, '0')}`
      } else {
        const now = new Date()
        startDate = now.toISOString().split('T')[0]
        startTime = now.toTimeString().slice(0, 5)
      }
      
      // Form-Daten setzen
      formData.value = {
        title: appointment.title || '',
        description: appointment.description || appointment.extendedProps?.staff_note || '',
        type: appointment.type || appointment.extendedProps?.category || '',
        startDate: startDate,
        startTime: startTime,
        endTime: '',
        duration_minutes: appointment.duration_minutes || appointment.extendedProps?.duration_minutes || 45,
        user_id: appointment.user_id || appointment.extendedProps?.user_id || '',
        staff_id: appointment.staff_id || appointment.extendedProps?.staff_id || '',
        location_id: appointment.location_id || appointment.extendedProps?.location_id || '',
        price_per_minute: appointment.price_per_minute || appointment.extendedProps?.price_per_minute || 0,
        status: appointment.status || appointment.extendedProps?.status || 'booked',
        eventType: eventType,
        selectedSpecialType: selectedSpecialType
      }
      
      console.log('📝 Form data set:', {
        eventType: formData.value.eventType,
        selectedSpecialType: formData.value.selectedSpecialType,
        title: formData.value.title,
        user_id: formData.value.user_id
      })
      
      // Endzeit berechnen
      if (appointment.end_time) {
        const endDateTime = new Date(appointment.end_time)
        const endHours = String(endDateTime.getHours()).padStart(2, '0')
        const endMinutes = String(endDateTime.getMinutes()).padStart(2, '0')
        formData.value.endTime = `${endHours}:${endMinutes}`
        
        console.log('📝 Set endTime from DB:', {
          end_time: appointment.end_time,
          endTime: formData.value.endTime
        })
      } else if (appointment.end) {
        const endDateTime = new Date(appointment.end)
        const endHours = String(endDateTime.getHours()).padStart(2, '0')
        const endMinutes = String(endDateTime.getMinutes()).padStart(2, '0')
        formData.value.endTime = `${endHours}:${endMinutes}`
        
        console.log('📝 Set endTime from event.end:', {
          end: appointment.end,
          endTime: formData.value.endTime
        })
      } else if (formData.value.startTime && formData.value.duration_minutes) {
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
      
      console.log('📝 Editing appointment completed:', {
        original: appointment.title,
        eventType: formData.value.eventType,
        hasStudent: !!selectedStudent.value
      })
      
    } else {
      // New event - use data from calendar click
      let startDate, startTime
      
      if (props.eventData?.parsedDate && props.eventData?.parsedTime) {
        startDate = props.eventData.parsedDate
        startTime = props.eventData.parsedTime
        
        console.log('📅 Creating new appointment from click (using pre-parsed local date/time):', {
          originalEventData: props.eventData,
          parsedDate: startDate,
          parsedTime: startTime,
        })
      } 
      else if (props.eventData?.start) {
        const clickedDateTime = new Date(props.eventData.start)
        
        startDate = `${clickedDateTime.getFullYear()}-${String(clickedDateTime.getMonth() + 1).padStart(2, '0')}-${String(clickedDateTime.getDate()).padStart(2, '0')}`
        startTime = `${String(clickedDateTime.getHours()).padStart(2, '0')}:${String(clickedDateTime.getMinutes()).padStart(2, '0')}`
        
        console.log('📅 Creating new appointment from click (converting ISO start to local):', {
          originalStart: props.eventData.start,
          parsedDate: startDate,
          parsedTime: startTime,
          clickedDateTime: clickedDateTime.toLocaleString('de-CH')
        })
      } else {
        const now = new Date()
        startDate = now.toISOString().split('T')[0]
        startTime = now.toTimeString().slice(0, 5)
        
        console.log('⚠️ No start time provided, using current time:', {
          startDate,
          startTime
        })
      }
      
      // Reset für neue Termine
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

// ✅ NEU: Für Event Type Title Updates
watch(() => formData.value.selectedSpecialType, (newType) => {
  if (newType && formData.value.eventType !== 'lesson') {
    const eventType = availableEventTypes.value.find(et => et.code === newType)
    if (eventType && eventType.auto_generate_title) {
      formData.value.title = eventType.name
    }
  }
})

// ✅ NEU: Für Student Title Updates  
watch(() => selectedStudent.value, (newStudent) => {
  if (newStudent && formData.value.eventType === 'lesson') {
    formData.value.title = `${newStudent.first_name} - ${formData.value.type || newStudent.category || 'B'}`
  }
})

// ✅ NEU: Für Category Title Updates
watch(() => formData.value.type, (newType) => {
  if (selectedStudent.value && formData.value.eventType === 'lesson' && newType) {
    formData.value.title = `${selectedStudent.value.first_name} - ${newType}`
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

// Watch für Event Type Changes
watch(() => formData.value.eventType, (newType) => {
  console.log('👀 Event type changed to:', newType)
  nextTick(() => {
    console.log('⚡ UI should update now')
  })
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