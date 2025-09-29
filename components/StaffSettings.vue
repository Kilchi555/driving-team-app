<template>
  <!-- Modal Wrapper -->
  <div class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
      
      <!-- Modal Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
        <div class="flex items-center space-x-3">
          <!-- Cash Control Button -->
          <button
            @click="openCashControl"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <span>💰</span>
            <span>Kasse</span>
          </button>
        </div>
        <button
          @click="$emit('close')"
          class="text-gray-500 hover:text-gray-700 text-2xl leading-none font-bold"
        >
          ×
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-6 space-y-4">
        
        <!-- Loading State -->
        <div v-if="isLoading" class="space-y-4">
          <div v-for="i in 3" :key="i" class="h-16 bg-gray-200 rounded animate-pulse"></div>
        </div>

        <!-- Error State -->
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          ❌ {{ error }}
        </div>

        <!-- Success Message -->
        <div v-if="saveSuccess" class="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          ✅ Einstellungen erfolgreich gespeichert!
        </div>

        <!-- Accordion Sections -->
        <div v-if="!isLoading" class="space-y-3">

        <!-- Externe Kalender Einstellungen -->
        <div class="border border-gray-200 rounded-lg">
          <button  
            @click="toggleSection('externalCalendars')" 
            class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
          >
            <div class="flex items-center space-x-3">
              <span class="text-xl">📅</span>
              <div>
                <h3 class="font-semibold text-gray-900">Externe Kalender</h3>
                <p class="text-sm text-gray-600">Private Kalender verbinden (Google, Microsoft, Apple)</p>
              </div>
            </div>
            <span class="text-gray-400 transform transition-transform" :class="{ 'rotate-180': openSections.externalCalendars }">
              ▼
            </span>
          </button>
          
          <div v-if="openSections.externalCalendars" class="px-4 pb-4 border-t">
            <ExternalCalendarSettings />
          </div>
        </div>

        <!-- Nur Arbeitsstunden für 4 Monate - KEINE lessons mehr! -->
        <div class="border border-gray-200 rounded-lg">
          <button  
            @click="toggleSection('workingStats')" 
            class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
          >
            <span class="font-medium text-gray-900">⏰ Arbeitszeit-Übersicht</span>
            <span class="text-gray-600 font-bold">{{ openSections.workingStats ? '−' : '+' }}</span>
          </button>
          
          <div v-if="openSections.workingStats" class="px-4 pb-4 border-t border-gray-100">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <!-- Kommender Monat - Geplant -->
              <div class="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                <h4 class="font-semibold text-orange-900 mb-3 text-center">{{ nextMonthName }}</h4>
                <div class="text-center">
                  <div class="text-sm text-orange-700 font-medium mb-1">Geplant</div>
                  <div class="text-2xl font-bold text-orange-800">
                    {{ monthlyStats.nextMonth.planned.toFixed(2) }}h
                  </div>
                </div>
              </div>
              
              <!-- Aktueller Monat - Kombiniert -->
              <div class="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border-2 border-blue-200">
                <h4 class="font-semibold text-gray-800 mb-4 text-center">{{ currentMonthName }}</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div class="text-center">
                    <div class="text-sm text-blue-700 font-medium mb-1">Gearbeitet</div>
                    <div class="text-2xl font-bold text-blue-800">
                      {{ monthlyStats.currentMonth.worked.toFixed(2) }}h
                    </div>
                  </div>
                  <div class="text-center">
                    <div class="text-sm text-green-700 font-medium mb-1">Geplant</div>
                    <div class="text-2xl font-bold text-green-800">
                      {{ monthlyStats.currentMonth.planned.toFixed(2) }}h
                    </div>
                  </div>
                </div>
                <div class="mt-3 pt-3 border-t border-gray-300">
                  <div class="text-center">
                    <div class="text-xs text-gray-600 font-medium mb-1">Total</div>
                    <div class="text-lg font-bold text-gray-800">
                      {{ (monthlyStats.currentMonth.worked + monthlyStats.currentMonth.planned).toFixed(2) }}h
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Vormonat -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-700 mb-3">{{ previousMonthName }}</h4>
                <div class="text-2xl font-bold text-gray-800">
                  {{ monthlyStats.previousMonth.worked.toFixed(2) }}h
                </div>
              </div>
              
              <!-- 2 Monate zurück -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-700 mb-3">{{ twoMonthsAgoName }}</h4>
                <div class="text-2xl font-bold text-gray-800">
                  {{ monthlyStats.twoMonthsAgo.worked.toFixed(2) }}h
                </div>
              </div>
              
              <!-- 3 Monate zurück -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-700 mb-3">{{ threeMonthsAgoName }}</h4>
                <div class="text-2xl font-bold text-gray-800">
                  {{ monthlyStats.threeMonthsAgo.worked.toFixed(2) }}h
                </div>
              </div>
              
            </div>
          </div>
        </div>
       
        <!-- 6. Prüfungsstandorte -->
        <div class="border border-gray-200 rounded-lg">
          <button
            @click="toggleSection('examLocations')"
            class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
          >
            <span class="font-medium text-gray-900">🏛️ Prüfungsstandorte</span>
            <span class="text-gray-600 font-bold">{{ openSections.examLocations ? '−' : '+' }}</span>
          </button>
          
          <div v-if="openSections.examLocations" class="px-4 pb-4 border-t border-gray-100">
            <div class="space-y-4 mt-4">

              <!-- New Search Dropdown -->
              <div class="space-y-4">
                <ExamLocationSearchDropdown
                  :current-staff-id="props.currentUser?.id || ''"
                  @locations-changed="handleExamLocationsChanged"
                />
              </div>

            </div>
          </div>
        </div>

          
          <!-- 3. Treffpunkte/Standorte -->
          <div class="border border-gray-200 rounded-lg">
            <button
              @click="toggleSection('locations')"
              class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
            >
              <span class="font-medium text-gray-900">📍 Treffpunkte/Standorte</span>
              <span class="text-gray-600 font-bold">{{ openSections.locations ? '−' : '+' }}</span>
            </button>
            
            <div v-if="openSections.locations" class="px-4 pb-4 border-t border-gray-100">
              <div class="space-y-3 mt-3">
                <!-- Aktuelle Standorte -->
                <div v-if="myLocations.length > 0">
                  <div class="text-sm font-medium text-gray-800 mb-2">Ihre Standorte:</div>
                  <div class="space-y-2">
                    <div 
                      v-for="location in myLocations" 
                      :key="location.id"
                      class="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
                    >
                      <div>
                        <div class="font-medium text-gray-900">{{ location.name }}</div>
                        <div class="text-gray-700 text-xs">{{ location.address }}</div>
                      </div>
                      <button
                        @click="removeLocation(location.id)"
                        class="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Entfernen
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Neuen Standort hinzufügen -->
                <div class="border-t pt-3">
                  <div class="text-sm font-medium text-gray-800 mb-2">Neuen Standort hinzufügen:</div>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      v-model="newLocationName"
                      type="text"
                      placeholder="Name (z.B. Bahnhof Zürich)"
                      class="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                    <input
                      v-model="newLocationAddress"
                      type="text"
                      placeholder="Adresse"
                      class="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                  </div>
                  <button
                    @click="addLocation"
                    :disabled="!newLocationName || !newLocationAddress"
                    class="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. Arbeitszeiten -->
          <div class="border border-gray-200 rounded-lg">
            <button
              @click="toggleSection('worktime')"
              class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
            >
              <span class="font-medium text-gray-900">⏰ Arbeitszeiten</span>
              <span class="text-gray-600 font-bold">{{ openSections.worktime ? '−' : '+' }}</span>
            </button>
            
            <div v-if="openSections.worktime" class="px-4 pb-4 border-t border-gray-100">
              <div class="space-y-4 mt-4">
                
                <!-- Info Text -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p class="text-sm text-blue-800">
                    💡 <strong>Arbeitszeiten:</strong> Diese Zeiten werden automatisch als "gesperrt" im Kalender angezeigt und verhindern Terminbuchungen außerhalb Ihrer Arbeitszeiten.
                  </p>
                </div>

                <!-- Arbeitszeiten pro Wochentag -->
                <div class="space-y-3">
                  <div
                    v-for="day in weekdays"
                    :key="day.value"
                    class="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 p-3 border border-gray-200 rounded-lg"
                  >
                    <!-- Wochentag -->
                    <div class="w-full sm:w-20 text-sm font-medium text-gray-700">
                      {{ day.label }}
                    </div>
                    
                    <!-- Aktiv/Inaktiv Toggle -->
                    <div class="flex items-center space-x-2">
                      <input
                        :id="`active-${day.value}`"
                        v-model="workingHoursForm[day.value].is_active"
                        type="checkbox"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      >
                      <label :for="`active-${day.value}`" class="text-sm text-gray-700">
                        Aktiv
                      </label>
                    </div>
                    
                    <!-- Zeiten Container -->
                    <div class="flex flex-col sm:flex-row sm:flex-1 sm:space-x-3 space-y-3 sm:space-y-0">
                      <!-- Start Zeit -->
                      <div class="flex-1">
                        <label class="block text-xs text-gray-500 mb-1">Von</label>
                        <input
                          v-model="workingHoursForm[day.value].start_time"
                          type="time"
                          :disabled="!workingHoursForm[day.value].is_active"
                          class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                        >
                      </div>
                      
                      <!-- End Zeit -->
                      <div class="flex-1">
                        <label class="block text-xs text-gray-500 mb-1">Bis</label>
                        <input
                          v-model="workingHoursForm[day.value].end_time"
                          type="time"
                          :disabled="!workingHoursForm[day.value].is_active"
                          class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                        >
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Aktionen -->
                <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                  <button
                    @click="saveWorkingHours"
                    :disabled="isSavingWorkingHours"
                    class="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {{ isSavingWorkingHours ? 'Speichern...' : 'Arbeitszeiten speichern' }}
                  </button>
                  
                  <button
                    @click="clearWorkingHours"
                    :disabled="isSavingWorkingHours"
                    class="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    Alle löschen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-between">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors font-medium"
        >
          Abbrechen
        </button>
        <button
          @click="saveAllSettings"
          :disabled="isSaving"
          class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {{ isSaving ? 'Speichern...' : 'Speichern' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { navigateTo } from '#app/composables/router'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'
import ExamLocationSearchDropdown from './ExamLocationSearchDropdown.vue'
import { useStaffWorkingHours, WEEKDAYS } from '~/composables/useStaffWorkingHours'

interface Props {
  currentUser: any
}

interface ExamLocation {
  id: string
  name: string
  address: string
  city?: string
  canton?: string
  postal_code?: string
  available_categories?: string[]
  contact_phone?: string   
  is_active: boolean
  display_order?: number
  created_at?: string
  updated_at?: string
}

interface StaffExamLocation {
  id: string
  staff_id: string
  name: string           
  address: string       
  categories: string[] 
  is_active: boolean
  created_at: string
  updated_at: string    
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'settings-updated': []
}>()

// State
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const saveSuccess = ref(false)
const availableExamLocations = ref<ExamLocation[]>([])
const staffExamLocations = ref<StaffExamLocation[]>([])
const isLoadingExamLocations = ref(false)
const isSavingExamLocation = ref(false)


// Accordion State
const openSections = reactive({
  externalCalendars: false,
  locations: false,
  categories: false,
  durations: false,
  worktime: false,
  notifications: false,
  workingStats: false,    
  examLocations: false 
})

// NEUE STATE für Prüfungsstandorte
const examLocations = ref<any[]>([])
const newExamLocation = ref({
  name: '',
  address: '',
  categories: [] as string[]
})

// NEUE STATE für Arbeitszeit
const monthlyStats = ref({
  currentMonth: { worked: 0, planned: 0 },
  nextMonth: { planned: 0 },
  previousMonth: { worked: 0 },
  twoMonthsAgo: { worked: 0 },
  threeMonthsAgo: { worked: 0 }
})


// Data
const availableCategories = ref<any[]>([])
const selectedCategories = ref<number[]>([])
const myLocations = ref<any[]>([])
const categoryDurations = ref<Record<string, number[]>>({})

// Working Hours Management
const { 
  workingHours: staffWorkingHours,
  isLoading: isLoadingWorkingHours,
  loadWorkingHours,
  saveWorkingHour,
  workingHoursByDay
} = useStaffWorkingHours()

// Working Hours Form (per day)
const workingHoursForm = ref<Record<number, { start_time: string; end_time: string; is_active: boolean }>>({})
const weekdays = WEEKDAYS
const isSavingWorkingHours = ref(false)

// New Location
const newLocationName = ref('')
const newLocationAddress = ref('')
const locationsKey = ref(0);

// Constants
const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

// Computed
const filteredCategoriesForDurations = computed(() => {
  return availableCategories.value.filter(cat => 
    selectedCategories.value.includes(cat.id)
  )
})

const activeExamLocations = computed(() => {
  // Filtere basierend auf Namen-Matching (wie in StaffSettings)
  return availableExamLocations.value.filter(examLoc => {
    return staffExamLocations.value.some(staffLoc => 
      staffLoc.name === examLoc.name && staffLoc.is_active
    )
  })
})

// computed properties:
const currentMonthName = computed(() => {
  const date = new Date()
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
})

const previousMonthName = computed(() => {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
})

const twoMonthsAgoName = computed(() => {
  const date = new Date()
  date.setMonth(date.getMonth() - 2)
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
})

const threeMonthsAgoName = computed(() => {
  const date = new Date()
  date.setMonth(date.getMonth() - 3)
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
})

const nextMonthName = computed(() => {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  return date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
})

// Methods
// In StaffSettings.vue - ersetzen Sie die Funktion mit dieser typisierten Version:
import { saveWithOfflineSupport } from '~/utils/offlineQueue'

const loadExamLocations = async () => {
  if (!props.currentUser?.id) return;

  isLoadingExamLocations.value = true;
  error.value = null;

  try {
    const supabase = getSupabase();
    const staffId = props.currentUser.id;

    // 1. Alle verfügbaren globalen Prüfungsstandorte laden (die der Mitarbeiter wählen kann)
    const { data: allLocations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .eq('location_type', 'exam')
      .is('staff_id', null) // Nur Standorte ohne Mitarbeiter-ID
      .eq('is_active', true)
      .order('name');

    if (locationsError) throw locationsError;
    availableExamLocations.value = allLocations || [];

    // 2. Die spezifischen Präferenzen des aktuellen Mitarbeiters laden
    const { data: staffPreferences, error: staffPreferencesError } = await supabase
      .from('locations')
      .select('*')
      .eq('location_type', 'exam')
      .eq('staff_id', staffId)
      .eq('is_active', true)
      .order('name');

    if (staffPreferencesError) throw staffPreferencesError;
    staffExamLocations.value = staffPreferences || [];

      console.log('✅ Prüfungsstandorte geladen:', {
      verfügbar: availableExamLocations.value.length,
      aktiviert_durch_Mitarbeiter: staffExamLocations.value.length,
      aktive_namen: staffExamLocations.value.map(loc => loc.name)
      });

  } catch (err: any) {
    console.error('❌ Fehler beim Laden der Prüfungsstandorte:', err);
    error.value = `Fehler beim Laden: ${err.message}`;
  } finally {
    isLoadingExamLocations.value = false
    locationsKey.value++ // Schlüssel erhöhen, um eine Neurenderung zu erzwingen
  }
}

// Hilfsfunktionen für localStorage (falls noch nicht vorhanden)
const getStaffExamPreferences = (staffId: string): string[] => {
  const key = `staff_exam_preferences_${staffId}`
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) : []
}

const saveStaffExamPreferences = (staffId: string, locationIds: string[]) => {
  const key = `staff_exam_preferences_${staffId}`
  localStorage.setItem(key, JSON.stringify(locationIds))
}

// Neue Funktion für das Toggling von Exam Locations
const toggleExamLocation = async (location: any) => {
  if (!props.currentUser?.id) {
    console.error('❌ Keine Benutzer-ID vorhanden, kann Standort nicht umschalten.');
    return;
  }

  isSavingExamLocation.value = true;
  error.value = null;

  try {
    const supabase = getSupabase();
    const staffId = props.currentUser.id;

    // Wir identifizieren einen Standort nicht nur über die ID, sondern auch über Name & Adresse
    // Dies ist nötig, da wir für die Präferenzen neue Zeilen erstellen.
    const { data: existingPreference, error: fetchError } = await supabase
      .from('locations')
      .select('id')
      .eq('staff_id', staffId)
      .eq('name', location.name)
      .eq('address', location.address)
      .eq('location_type', 'exam')
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingPreference) {
      // Wenn die Präferenz-Zeile existiert, löschen wir sie
      const { error: deleteError } = await supabase
        .from('locations')
        .delete()
        .eq('id', existingPreference.id);

      if (deleteError) throw deleteError;
      console.log('✅ Prüfungsstandort-Präferenz gelöscht für:', location.name);
    } else {
      // Wenn keine Präferenz-Zeile existiert, erstellen wir eine neue
      const { error: insertError } = await supabase
        .from('locations')
        .insert({
          staff_id: staffId,
          name: location.name,
          address: location.address,
          location_type: 'exam',
          is_active: true,
          city: location.city,
          canton: location.canton,
          postal_code: location.postal_code,
          // Füge hier weitere relevante Spalten aus dem globalen Standort hinzu
        });

      if (insertError) throw insertError;
      console.log('✅ Neue Prüfungsstandort-Präferenz erstellt für:', location.name);
    }

  } catch (err: any) {
    console.error('❌ Fehler beim Umschalten des Prüfungsstandorts:', err);
    error.value = `Fehler beim Speichern der Präferenz: ${err.message}`;
  } finally {
    isSavingExamLocation.value = false;
    // Lade die Daten neu, damit die UI den neuen Status anzeigt
    await loadExamLocations();
  }
}


const loadAllData = async () => {
  isLoading.value = true
  error.value = null

  try {
    // Exam Locations werden nur in der Prüfungsstandorte-Sektion geladen
    // Standard Locations werden separat geladen
    console.log('✅ Basic data loading completed')
  } catch (err: any) {
    console.error('❌ Error loading data:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

const isExamLocationActive = (examLocationId: string): boolean => {
  // Finde die Location anhand der ID in availableExamLocations
  const examLocation = availableExamLocations.value.find(loc => loc.id === examLocationId)
  if (!examLocation) return false
  
  // Prüfe ob ein Staff-Location mit dem gleichen Namen existiert und aktiv ist
  return staffExamLocations.value.some(staffLoc => 
    staffLoc.name === examLocation.name && staffLoc.is_active
  )
}

const getExamLocationMapsUrl = (location: any): string => {
  const query = encodeURIComponent(location.address)
  return `https://maps.google.com/maps?q=${query}`
}

// New function to handle exam locations changes from dropdown
const handleExamLocationsChanged = (locations: any[]) => {
  console.log('🔄 Exam locations changed:', locations.length)
  // Reload the staff exam locations to reflect changes
  loadExamLocations()
}

// New function to remove exam location
const removeExamLocation = async (location: any) => {
  if (!props.currentUser?.id) {
    console.error('❌ Keine Benutzer-ID vorhanden, kann Standort nicht entfernen.')
    return
  }

  isSavingExamLocation.value = true
  error.value = null

  try {
    const supabase = getSupabase()
    const staffId = props.currentUser.id

    // Remove from database
    const { error: deleteError } = await supabase
      .from('locations')
      .delete()
      .eq('staff_id', staffId)
      .eq('name', location.name)
      .eq('address', location.address)
      .eq('location_type', 'exam')

    if (deleteError) throw deleteError

    console.log('✅ Prüfungsstandort entfernt:', location.name)
    
    // Reload the data
    await loadExamLocations()

  } catch (err: any) {
    console.error('❌ Fehler beim Entfernen des Prüfungsstandorts:', err)
    error.value = `Fehler beim Entfernen: ${err.message}`
  } finally {
    isSavingExamLocation.value = false
  }
}


const toggleSection = (section: keyof typeof openSections) => {
  openSections[section] = !openSections[section]
}

const getAllPossibleDurations = () => {
  const durations = [45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240]
  return durations.map(duration => ({
    value: duration,
    label: duration >= 120 
      ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
      : `${duration}min`
  }))
}

const getRelevantDurations = (category: any) => {
  // Zeige nur relevante Dauern basierend auf Kategorie
  const allDurations = getAllPossibleDurations()
  const baseMinutes = category.lesson_duration_minutes || 45
  
  if (baseMinutes <= 45) {
    return allDurations.filter(d => d.value <= 135)
  } else if (baseMinutes <= 90) {
    return allDurations.filter(d => d.value >= 90 && d.value <= 180)
  } else {
    return allDurations.filter(d => d.value >= 135)
  }
}

const isDurationSelectedForCategory = (categoryCode: string, duration: number) => {
  return categoryDurations.value[categoryCode]?.includes(duration) || false
}

const toggleDurationForCategory = (categoryCode: string, duration: number) => {
  if (!categoryDurations.value[categoryCode]) {
    categoryDurations.value[categoryCode] = []
  }
  
  const index = categoryDurations.value[categoryCode].indexOf(duration)
  if (index > -1) {
    categoryDurations.value[categoryCode].splice(index, 1)
  } else {
    categoryDurations.value[categoryCode].push(duration)
    categoryDurations.value[categoryCode].sort((a, b) => a - b)
  }
}

const toggleCategory = (categoryId: number) => {
  const index = selectedCategories.value.indexOf(categoryId)
  if (index > -1) {
    selectedCategories.value.splice(index, 1)
  } else {
    selectedCategories.value.push(categoryId)
  }
}

// Legacy function - not used in new working hours system
// const toggleDay = (dayNumber: number) => {
//   const index = availableDays.value.indexOf(dayNumber)
//   if (index > -1) {
//     availableDays.value.splice(index, 1)
//   } else {
//     availableDays.value.push(dayNumber)
//   }
// }

const addLocation = async () => {
  if (!newLocationName.value || !newLocationAddress.value) return

  try {
    console.log('🔥 Adding new location:', newLocationName.value)
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('locations')
      .insert({
        name: newLocationName.value,
        address: newLocationAddress.value,
        staff_id: props.currentUser.id,
        location_type: 'standard' // Standard-Treffpunkte, nicht Exam Locations
      })
      .select()
      .single()

    if (error) throw error

    myLocations.value.push(data)
    newLocationName.value = ''
    newLocationAddress.value = ''
    console.log('✅ Location added successfully')
  } catch (err: any) {
    console.error('❌ Error adding location:', err)
    error.value = `Fehler beim Hinzufügen: ${err.message}`
  }
}

// Füge diese Funktionen zu deinem StaffSettings.vue Script hinzu:

const addExamLocation = async () => {
  if (!newExamLocation.value.name || !newExamLocation.value.address) return

  try {
    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('locations') // 👈 Tabelle auf 'locations' geändert
      .insert({
        staff_id: props.currentUser.id,
        name: newExamLocation.value.name,
        address: newExamLocation.value.address,
        available_categories: newExamLocation.value.categories, // 👈 Feldname korrigiert
        location_type: 'exam', // 👈 Diese Zeile wurde hinzugefügt
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    examLocations.value.push(data)
    
    // Reset form
    newExamLocation.value = {
      name: '',
      address: '',
      categories: []
    }

    console.log('✅ Exam location added:', data)

  } catch (err: any) {
    console.error('❌ Error adding exam location:', err)
    error.value = `Fehler beim Hinzufügen: ${err.message}`
  }
}


const removeLocation = async (locationId: string) => {
  try {
    console.log('🔥 Removing location:', locationId)
    
    await saveWithOfflineSupport(
      'locations',           // table
      {},                   // data (leer bei delete)
      'delete',             // action
      { id: locationId },   // where
      `Standort löschen`    // operation name
    )
    
    console.log('🔍 Delete response - success')
    
    // Optimistic Update - sofort aus UI entfernen
    myLocations.value = myLocations.value.filter(loc => loc.id !== locationId)
    console.log('✅ Location removed successfully')
    
  } catch (err: any) {
    console.error('❌ Error in removeLocation:', err)
    
    // Spezielle Behandlung für Foreign Key Constraint (behält Ihre Logik bei)
    if (err.code === '23503') {
      error.value = 'Dieser Standort kann nicht gelöscht werden, da er noch von Terminen verwendet wird. Bitte löschen Sie zuerst alle Termine an diesem Standort.'
      return
    }
    
    // Offline-Support: Benutzerfreundliche Meldung
    if (err.message?.includes('synchronisiert')) {
      // Optimistic Update auch bei Offline
      myLocations.value = myLocations.value.filter(loc => loc.id !== locationId)
      error.value = null // Kein Fehler anzeigen
      
      // Optional: Success-Message für Offline
      console.log('📦 Location will be deleted when online')
      // Sie könnten hier eine Notification anzeigen:
      // showMessage("Standort wird gelöscht sobald Internet verfügbar ist")
    } else {
      // Alle anderen Fehler normal behandeln
      error.value = `Fehler beim Löschen: ${err.message}`
    }
  }
}

const loadData = async () => {
  if (!props.currentUser?.id) return

  isLoading.value = true
  error.value = null

  try {
    const supabase = getSupabase()

    console.log('🔥 Loading staff settings data...')

    // Kategorien laden
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (categoriesError) throw categoriesError
    availableCategories.value = categories || []

    // Standard Standorte laden (nur standard locations, nicht exam locations)
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .eq('staff_id', props.currentUser.id)
      .eq('location_type', 'standard') // Nur Standard Locations, keine Exam Locations

    if (locationsError) throw locationsError
    myLocations.value = locations || []

    // Zugewiesene Kategorien laden (temporär deaktiviert - Tabelle existiert nicht)
    // TODO: Implementiere staff_categories Tabelle oder alternative Lösung
    selectedCategories.value = []

    // Lektionsdauern laden (temporär deaktiviert - Tabelle existiert nicht)
    // TODO: Implementiere staff_category_durations Tabelle oder alternative Lösung
    categoryDurations.value = {}

    // Staff Settings laden (temporär deaktiviert - Tabelle existiert nicht)
    // TODO: Implementiere staff_settings Tabelle oder alternative Lösung
    console.log('🔥 Staff settings loading disabled - table does not exist')

    console.log('✅ All data loaded successfully')

  } catch (err: any) {
    console.error('❌ Error loading data:', err)
    error.value = `Fehler beim Laden: ${err.message}`
  } finally {
    isLoading.value = false
  }
   await loadExamLocations() 
}

// Debug-Version der loadWorkingHoursData Funktion:

// Vollständige Debug-Version für alle 4 Monate:

const loadWorkingHoursData = async () => {
  console.log('🔍 DEBUG: Starting loadWorkingHoursData')
  
  if (!props.currentUser?.id) {
    console.log('❌ DEBUG: No currentUser.id found')
    return
  }
  
  try {
    const supabase = getSupabase()
    
    console.log('🔍 DEBUG: Querying appointments for staff_id:', props.currentUser.id)
    
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('staff_id', props.currentUser.id)
    
    if (error) {
      console.error('❌ DEBUG: Database error:', error)
      return
    }
    
    console.log('🔍 DEBUG: Total appointments found:', appointments?.length || 0)
    
    if (!appointments || appointments.length === 0) {
      console.log('⚠️ DEBUG: No appointments found')
      return
    }
    
    // Filter completed/confirmed Termine für gearbeitete Stunden
    const validAppointments = appointments.filter(apt => 
      ['completed', 'confirmed'].includes(apt.status)
    )
    
    // Filter alle Termine im aktuellen Monat für geplante Stunden
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    
    // Filter alle Termine im kommenden Monat für geplante Stunden
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59)
    
    const plannedAppointments = appointments.filter(apt => {
      const appointmentDate = new Date(apt.appointment_datetime || apt.start_time)
      return appointmentDate >= currentMonthStart && appointmentDate <= currentMonthEnd
    })
    
    const nextMonthPlannedAppointments = appointments.filter(apt => {
      const appointmentDate = new Date(apt.appointment_datetime || apt.start_time)
      return appointmentDate >= nextMonthStart && appointmentDate <= nextMonthEnd
    })
    
    console.log('🔍 DEBUG: Valid appointments (worked):', validAppointments.length)
    console.log('🔍 DEBUG: Planned appointments (current month):', plannedAppointments.length)
    
    if (validAppointments.length === 0 && plannedAppointments.length === 0) {
      console.log('⚠️ DEBUG: No valid appointments found')
      return
    }
    
    // Berechne Stunden für jeden Monat
    console.log('🔍 DEBUG: Current date:', now)
    
    // Alle 4 Monate definieren (currentMonthStart und currentMonthEnd bereits oben definiert)
    
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    
    const twoMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59)
    
    const threeMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 3, 1)
    const threeMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 2, 0, 23, 59, 59)
    
    // Hilfsfunktion zum Filtern und Berechnen
    const calculateHoursForPeriod = (startDate: Date, endDate: Date, periodName: string) => {
      console.log(`🔍 DEBUG: Calculating for ${periodName}:`, {
        startDate: startDate,
        endDate: endDate
      })
      
      const filteredAppointments = validAppointments.filter(apt => {
        const appointmentDate = new Date(apt.appointment_datetime || apt.start_time)
        const isInRange = appointmentDate >= startDate && appointmentDate <= endDate
        return isInRange
      })
      
      console.log(`🔍 DEBUG: ${periodName} filtered appointments:`, filteredAppointments.length)
      
      const totalMinutes = filteredAppointments.reduce((sum, apt) => {
        const minutes = apt.duration_minutes || 45
        return sum + minutes
      }, 0)
      
      const hours = Math.round((totalMinutes / 60) * 10) / 10
      console.log(`🔍 DEBUG: ${periodName} total: ${totalMinutes} minutes = ${hours} hours`)
      
      return hours
    }
    
    // Berechne für alle 4 Monate
    const currentHours = calculateHoursForPeriod(currentMonthStart, currentMonthEnd, 'Current Month')
    const previousHours = calculateHoursForPeriod(previousMonthStart, previousMonthEnd, 'Previous Month')
    const twoMonthsAgoHours = calculateHoursForPeriod(twoMonthsAgoStart, twoMonthsAgoEnd, 'Two Months Ago')
    const threeMonthsAgoHours = calculateHoursForPeriod(threeMonthsAgoStart, threeMonthsAgoEnd, 'Three Months Ago')
    
    // Berechne geplante Stunden für aktuellen Monat
    const plannedHours = plannedAppointments.reduce((sum, apt) => {
      const minutes = apt.duration_minutes || 45
      return sum + minutes
    }, 0)
    const plannedHoursFormatted = plannedHours / 60
    
    // Berechne geplante Stunden für kommenden Monat
    const nextMonthPlannedHours = nextMonthPlannedAppointments.reduce((sum, apt) => {
      const minutes = apt.duration_minutes || 45
      return sum + minutes
    }, 0)
    const nextMonthPlannedHoursFormatted = nextMonthPlannedHours / 60
    
    console.log('🔍 DEBUG: Planned hours for current month:', plannedHoursFormatted)
    console.log('🔍 DEBUG: Planned hours for next month:', nextMonthPlannedHoursFormatted)
    
    // Setze alle Werte
    monthlyStats.value.currentMonth.worked = currentHours
    monthlyStats.value.currentMonth.planned = plannedHoursFormatted
    monthlyStats.value.nextMonth.planned = nextMonthPlannedHoursFormatted
    monthlyStats.value.previousMonth.worked = previousHours
    monthlyStats.value.twoMonthsAgo.worked = twoMonthsAgoHours
    monthlyStats.value.threeMonthsAgo.worked = threeMonthsAgoHours
    
  } catch (error) {
    console.error('❌ DEBUG: Unexpected error:', error)
  }
}

const saveAllSettings = async () => {
  if (!props.currentUser?.id) return

  isSaving.value = true
  error.value = null
  saveSuccess.value = false

  try {
    const supabase = getSupabase()

    // 1. Staff-Kategorien speichern (temporär deaktiviert - Tabelle existiert nicht)
    console.log('🔥 Staff categories saving disabled - table does not exist')
    // TODO: Implementiere staff_categories Tabelle oder alternative Lösung

    // 2. Lektionsdauern speichern (temporär deaktiviert - Tabelle existiert nicht)
    console.log('🔥 Lesson durations saving disabled - table does not exist')
    // TODO: Implementiere staff_category_durations Tabelle oder alternative Lösung

    // 3. Staff Settings speichern (temporär deaktiviert - Tabelle existiert nicht)
    console.log('🔥 Staff settings saving disabled - table does not exist')
    // TODO: Implementiere staff_settings Tabelle oder alternative Lösung

    console.log('✅ All settings saved successfully!')
    saveSuccess.value = true
    emit('settings-updated')
    setTimeout(() => emit('close'), 1000)
    
    // Modal automatisch schließen nach erfolgreichem Speichern
    setTimeout(() => {
      saveSuccess.value = false
      emit('close')
    }, 1500)

  } catch (err: any) {
    console.error('❌ Error saving settings:', err)
    error.value = `Fehler beim Speichern: ${err.message}`
  } finally {
    isSaving.value = false
  }
}

// Cash Control Funktion
const openCashControl = () => {
  // Schließe das Staff Settings Modal
  emit('close')
  
  // Navigiere zur Staff Cash Control Seite
  navigateTo('/staff/cash-control')
}

// Working Hours Methods
const initializeWorkingHoursForm = () => {
  // Initialize form for all weekdays
  weekdays.forEach(day => {
    const existingHour = workingHoursByDay.value[day.value]
    workingHoursForm.value[day.value] = {
      start_time: existingHour?.start_time || '08:00',
      end_time: existingHour?.end_time || '18:00',
      is_active: existingHour?.is_active || false
    }
  })
}

const saveWorkingHours = async () => {
  if (!props.currentUser?.id) return
  
  isSavingWorkingHours.value = true
  try {
    // Save each day's working hours
    for (const day of weekdays) {
      const formData = workingHoursForm.value[day.value]
      if (formData.is_active) {
        await saveWorkingHour(props.currentUser.id, {
          day_of_week: day.value,
          start_time: formData.start_time,
          end_time: formData.end_time,
          is_active: formData.is_active
        })
      }
    }
    
    console.log('✅ Working hours saved successfully')
    alert('✅ Arbeitszeiten erfolgreich gespeichert!')
    
  } catch (err: any) {
    console.error('❌ Error saving working hours:', err)
    alert(`❌ Fehler beim Speichern: ${err.message}`)
  } finally {
    isSavingWorkingHours.value = false
  }
}


const clearWorkingHours = async () => {
  if (!props.currentUser?.id) return
  
  if (!confirm('Möchten Sie wirklich alle Arbeitszeiten löschen?')) return
  
  isSavingWorkingHours.value = true
  try {
    const supabase = getSupabase()
    
    // Delete all working hours for this staff
    const { error } = await supabase
      .from('staff_working_hours')
      .delete()
      .eq('staff_id', props.currentUser.id)
    
    if (error) throw error
    
    // Reload and reinitialize form
    await loadWorkingHours(props.currentUser.id)
    initializeWorkingHoursForm()
    
    console.log('✅ All working hours cleared')
    alert('✅ Alle Arbeitszeiten wurden gelöscht!')
    
  } catch (err: any) {
    console.error('❌ Error clearing working hours:', err)
    alert(`❌ Fehler beim Löschen: ${err.message}`)
  } finally {
    isSavingWorkingHours.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await loadData()
  await loadWorkingHoursData()
  await loadExamLocations()
  
  // Initialize working hours form after data is loaded
  initializeWorkingHoursForm()
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Modal backdrop animation */
.modal-backdrop {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Smooth transitions */
.transition-colors {
  transition: all 0.2s ease-in-out;
}

/* Hide default checkbox styling for custom design */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>