<template>
  <!-- Modal Wrapper -->
  <div class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
      
      <!-- Modal Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
        <h2 class="text-xl font-semibold text-gray-900">⚙️ Personaleinstellungen</h2>
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
              
              <!-- Aktueller Monat -->
              <div class="bg-blue-50 p-4 rounded-lg">
                <h4 class="font-semibold text-blue-900 mb-3">{{ currentMonthName }}</h4>
                <div class="text-2xl font-bold text-blue-800">
                  {{ monthlyStats.currentMonth.worked }}h
                </div>
              </div>
              
              <!-- Vormonat -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-700 mb-3">{{ previousMonthName }}</h4>
                <div class="text-2xl font-bold text-gray-800">
                  {{ monthlyStats.previousMonth.worked }}h
                </div>
              </div>
              
              <!-- 2 Monate zurück -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-700 mb-3">{{ twoMonthsAgoName }}</h4>
                <div class="text-2xl font-bold text-gray-800">
                  {{ monthlyStats.twoMonthsAgo.worked }}h
                </div>
              </div>
              
              <!-- 3 Monate zurück -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-700 mb-3">{{ threeMonthsAgoName }}</h4>
                <div class="text-2xl font-bold text-gray-800">
                  {{ monthlyStats.threeMonthsAgo.worked }}h
                </div>
              </div>
              
            </div>
          </div>
        </div>
       
      <!-- 2. Prüfungsstandorte -->
      <div class="border border-gray-200 rounded-lg">
        <button
          @click="toggleSection('examLocations')"
          class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
        >
          <span class="font-medium text-gray-900">🏛️ Prüfungsstandorte</span>
          <span class="text-gray-600 font-bold">{{ openSections.examLocations ? '−' : '+' }}</span>
        </button>
      <div v-if="openSections.examLocations" class="px-4 pb-4 border-t border-gray-100">
        <!-- Neue Prüfungsstandort hinzufügen -->
        <div class="border border-gray-200 rounded-lg p-4 mb-4">
          <h4 class="font-medium text-gray-900 mb-3">Neuen Prüfungsstandort hinzufügen</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              v-model="newExamLocation.name"
              type="text"
              placeholder="Standort-Name (z.B. TCS Zürich)"
              class="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
            <input
              v-model="newExamLocation.address"
              type="text"
              placeholder="Adresse"
              class="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
            <select
              v-model="newExamLocation.categories"
              multiple
              class="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="B">Kategorie B</option>
              <option value="A1">Kategorie A1</option>
              <option value="A">Kategorie A</option>
              <option value="BE">Kategorie BE</option>
              <option value="C1">Kategorie C1</option>
              <option value="C">Kategorie C</option>
            </select>
          </div>
          <button
            @click="addExamLocation"
            :disabled="!newExamLocation.name || !newExamLocation.address"
            class="mt-3 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prüfungsstandort hinzufügen
          </button>
        </div>

        <!-- Liste der Prüfungsstandorte -->
        <div class="space-y-3">
          <div v-if="examLocations.length === 0" class="text-center py-8 text-gray-500">
            Noch keine Prüfungsstandorte definiert
          </div>
          
          <div
            v-for="location in examLocations"
            :key="location.id"
            class="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <h4 class="font-medium text-gray-900">{{ location.name }}</h4>
                  <button
                    @click="toggleExamLocationStatus(location)"
                    :class="[
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                      location.is_active ? 'bg-green-600' : 'bg-gray-200'
                    ]"
                  >
                    <span
                      :class="[
                        'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                        location.is_active ? 'translate-x-5' : 'translate-x-1'
                      ]"
                    />
                  </button>
                  <span :class="[
                    'text-xs px-2 py-1 rounded-full',
                    location.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  ]">
                    {{ location.is_active ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                </div>
                
                <p class="text-sm text-gray-600 mt-1">{{ location.address }}</p>
                
                <div v-if="location.categories && location.categories.length > 0" class="flex gap-1 mt-2">
                  <span
                    v-for="category in location.categories"
                    :key="category"
                    class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                  >
                    {{ category }}
                  </span>
                </div>
              </div>

              <button
                @click="removeExamLocation(location.id)"
                class="ml-4 text-red-500 hover:text-red-700 text-sm"
              >
                🗑️ Entfernen
              </button>
            </div>
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

          <!-- 2. Fahrzeugkategorien -->
          <div class="border border-gray-200 rounded-lg">
            <button
              @click="toggleSection('categories')"
              class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
            >
              <span class="font-medium text-gray-900">🚗 Fahrzeugkategorien</span>
              <span class="text-gray-600 font-bold">{{ openSections.categories ? '−' : '+' }}</span>
            </button>
            
            <div v-if="openSections.categories" class="px-4 pb-4 border-t border-gray-100">
              <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                <label 
                  v-for="category in availableCategories"
                  :key="category.id"
                  class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50 text-sm"
                  :class="{
                    'border-green-500 bg-green-50': selectedCategories.includes(category.id),
                    'border-gray-300': !selectedCategories.includes(category.id)
                  }"
                >
                  <input
                    type="checkbox"
                    :checked="selectedCategories.includes(category.id)"
                    @change="toggleCategory(category.id)"
                    class="w-3 h-3 text-green-600 border-gray-300 rounded focus:ring-green-500 mr-2"
                  >
                  <div>
                    <div class="font-medium text-gray-900">{{ category.code }}</div>
                    <div class="text-xs text-gray-700">CHF {{ category.price_per_lesson }}/45min</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- 3. Lektionsdauern pro Kategorie -->
          <div class="border border-gray-200 rounded-lg">
            <button
              @click="toggleSection('durations')"
              class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
            >
              <span class="font-medium text-gray-900">⏱️ Lektionsdauern</span>
              <span class="text-gray-600 font-bold">{{ openSections.durations ? '−' : '+' }}</span>
            </button>
            
            <div v-if="openSections.durations" class="px-4 pb-4 border-t border-gray-100">
              <div class="space-y-4 mt-3">
                <div 
                  v-for="category in filteredCategoriesForDurations"
                  :key="category.code"
                  class="border border-gray-100 rounded p-3"
                >
                  <div class="flex items-center gap-2 mb-2">
                    <div 
                      class="w-3 h-3 rounded-full"
                      :style="{ backgroundColor: category.color || '#gray' }"
                    ></div>
                    <span class="font-medium text-sm text-gray-900">{{ category.code }} - {{ category.name }}</span>
                  </div>

                  <div class="grid grid-cols-4 md:grid-cols-6 gap-1">
                    <label 
                      v-for="duration in getRelevantDurations(category)"
                      :key="`${category.code}-${duration.value}`"
                      class="flex items-center justify-center p-1 border rounded cursor-pointer hover:bg-gray-50 text-xs"
                      :class="{
                        'border-green-500 bg-green-50': isDurationSelectedForCategory(category.code, duration.value),
                        'border-gray-300': !isDurationSelectedForCategory(category.code, duration.value)
                      }"
                    >
                      <input
                        type="checkbox"
                        :checked="isDurationSelectedForCategory(category.code, duration.value)"
                        @change="toggleDurationForCategory(category.code, duration.value)"
                        class="sr-only"
                      >
                      <span class="text-gray-900 font-medium">{{ duration.label }}</span>
                    </label>
                  </div>
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
              <span class="font-medium text-gray-900">🕒 Arbeitszeiten</span>
              <span class="text-gray-600 font-bold">{{ openSections.worktime ? '−' : '+' }}</span>
            </button>
            
            <div v-if="openSections.worktime" class="px-4 pb-4 border-t border-gray-100">
              <div class="space-y-3 mt-3">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-800 mb-1">Von:</label>
                    <input
                      v-model="workingHours.start"
                      type="time"
                      class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-800 mb-1">Bis:</label>
                    <input
                      v-model="workingHours.end"
                      type="time"
                      class="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-800 mb-2">Arbeitstage:</label>
                  <div class="flex flex-wrap gap-2">
                    <label 
                      v-for="(day, index) in weekDays"
                      :key="day"
                      class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50 text-sm"
                      :class="{
                        'border-green-500 bg-green-50': availableDays.includes(index + 1),
                        'border-gray-300': !availableDays.includes(index + 1)
                      }"
                    >
                      <input
                        type="checkbox"
                        :checked="availableDays.includes(index + 1)"
                        @change="toggleDay(index + 1)"
                        class="sr-only"
                      >
                      <span class="text-gray-900 font-medium">{{ day }}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 5. Benachrichtigungen -->
          <div class="border border-gray-200 rounded-lg">
            <button
              @click="toggleSection('notifications')"
              class="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none"
            >
              <span class="font-medium text-gray-900">🔔 Benachrichtigungen</span>
              <span class="text-gray-600 font-bold">{{ openSections.notifications ? '−' : '+' }}</span>
            </button>
            
            <div v-if="openSections.notifications" class="px-4 pb-4 border-t border-gray-100">
              <div class="space-y-3 mt-3">
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    v-model="notifications.sms"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  >
                  <span class="ml-2 text-sm text-gray-800">SMS-Benachrichtigungen</span>
                </label>
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    v-model="notifications.email"
                    class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  >
                  <span class="ml-2 text-sm text-gray-800">E-Mail-Benachrichtigungen</span>
                </label>
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
import { getSupabase } from '~/utils/supabase'

interface Props {
  currentUser: any
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

// Accordion State
const openSections = reactive({
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
  currentMonth: { worked: 0 },
  previousMonth: { worked: 0 },
  twoMonthsAgo: { worked: 0 },
  threeMonthsAgo: { worked: 0 }
})


// Data
const availableCategories = ref<any[]>([])
const selectedCategories = ref<number[]>([])
const myLocations = ref<any[]>([])
const categoryDurations = ref<Record<string, number[]>>({})
const workingHours = ref({ start: '08:00', end: '18:00' })
const availableDays = ref<number[]>([1, 2, 3, 4, 5]) // Mo-Fr
const notifications = ref({ sms: true, email: true })

// New Location
const newLocationName = ref('')
const newLocationAddress = ref('')

// Constants
const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

// Computed
const filteredCategoriesForDurations = computed(() => {
  return availableCategories.value.filter(cat => 
    selectedCategories.value.includes(cat.id)
  )
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

// Methods


// NEUE FUNKTIONEN für Prüfungsstandorte
const loadExamLocations = async () => {
  if (!props.currentUser?.id) return

  try {
    const supabase = getSupabase()
    
    // Prüfungsstandorte aus einer neuen Tabelle laden (oder bestehende erweitern)
    const { data: locations, error } = await supabase
      .from('staff_exam_locations')
      .select('*')
      .eq('staff_id', props.currentUser.id)
      .order('name')

    if (error && !error.message.includes('does not exist')) {
      throw error
    }

    examLocations.value = locations || []

  } catch (err: any) {
    console.error('❌ Error loading exam locations:', err)
    // Fallback für fehlende Tabelle
    examLocations.value = []
  }
}

const addExamLocation = async () => {
  if (!newExamLocation.value.name || !newExamLocation.value.address) return

  try {
    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('staff_exam_locations')
      .insert({
        staff_id: props.currentUser.id,
        name: newExamLocation.value.name,
        address: newExamLocation.value.address,
        categories: newExamLocation.value.categories,
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

  } catch (err: any) {
    console.error('❌ Error adding exam location:', err)
    error.value = `Fehler beim Hinzufügen: ${err.message}`
  }
}

const toggleExamLocationStatus = async (location: any) => {
  try {
    const supabase = getSupabase()
    
    const { error } = await supabase
      .from('staff_exam_locations')
      .update({ is_active: !location.is_active })
      .eq('id', location.id)

    if (error) throw error

    location.is_active = !location.is_active

  } catch (err: any) {
    console.error('❌ Error toggling exam location:', err)
    error.value = `Fehler beim Ändern des Status: ${err.message}`
  }
}

const removeExamLocation = async (locationId: string) => {
  try {
    const supabase = getSupabase()
    
    const { error } = await supabase
      .from('staff_exam_locations')
      .delete()
      .eq('id', locationId)

    if (error) throw error

    examLocations.value = examLocations.value.filter(loc => loc.id !== locationId)

  } catch (err: any) {
    console.error('❌ Error removing exam location:', err)
    error.value = `Fehler beim Entfernen: ${err.message}`
  }
}

// Data Loading
const loadAllData = async () => {
  isLoading.value = true
  error.value = null

  try {
    await Promise.all([
      loadExamLocations()
      // + bestehende Load-Funktionen
    ])
  } catch (err: any) {
    console.error('❌ Error loading data:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
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

const toggleDay = (dayNumber: number) => {
  const index = availableDays.value.indexOf(dayNumber)
  if (index > -1) {
    availableDays.value.splice(index, 1)
  } else {
    availableDays.value.push(dayNumber)
  }
}

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
        staff_id: props.currentUser.id
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

const removeLocation = async (locationId: string) => {
  try {
    console.log('🔥 Removing location:', locationId)
    const supabase = getSupabase()
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', locationId)

    if (error) throw error

    myLocations.value = myLocations.value.filter(loc => loc.id !== locationId)
    console.log('✅ Location removed successfully')
  } catch (err: any) {
    console.error('❌ Error removing location:', err)
    error.value = `Fehler beim Entfernen: ${err.message}`
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
      .order('display_order')

    if (categoriesError) throw categoriesError
    availableCategories.value = categories || []

    // Standorte laden
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .eq('staff_id', props.currentUser.id)

    if (locationsError) throw locationsError
    myLocations.value = locations || []

    // Zugewiesene Kategorien laden
    const { data: staffCategories, error: staffCatError } = await supabase
      .from('staff_categories')
      .select('category_id')
      .eq('staff_id', props.currentUser.id)
      .eq('is_active', true)

    if (staffCatError) throw staffCatError
    selectedCategories.value = staffCategories?.map(sc => sc.category_id) || []

    // Lektionsdauern laden
    const { data: durations, error: durationsError } = await supabase
      .from('staff_category_durations')
      .select('category_code, duration_minutes')
      .eq('staff_id', props.currentUser.id)
      .eq('is_active', true)

    if (durationsError) throw durationsError

    const grouped: Record<string, number[]> = {}
    durations?.forEach(item => {
      if (!grouped[item.category_code]) {
        grouped[item.category_code] = []
      }
      grouped[item.category_code].push(item.duration_minutes)
    })
    categoryDurations.value = grouped

    // Staff Settings laden (falls vorhanden)
    const { data: settings, error: settingsError } = await supabase
      .from('staff_settings')
      .select('*')
      .eq('staff_id', props.currentUser.id)
      .maybeSingle()

    if (settingsError && !settingsError.message.includes('does not exist')) {
      console.warn('⚠️ Staff settings error:', settingsError.message)
    }

    if (settings) {
      workingHours.value = {
        start: settings.work_start_time || '08:00',
        end: settings.work_end_time || '18:00'
      }
      availableDays.value = settings.available_weekdays 
        ? settings.available_weekdays.split(',').map(Number)
        : [1, 2, 3, 4, 5]
      notifications.value = {
        sms: settings.sms_notifications ?? true,
        email: settings.email_notifications ?? true
      }
    }

    console.log('✅ All data loaded successfully')

  } catch (err: any) {
    console.error('❌ Error loading data:', err)
    error.value = `Fehler beim Laden: ${err.message}`
  } finally {
    isLoading.value = false
  }
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
    
    // Filter nur completed/confirmed Termine
    const validAppointments = appointments.filter(apt => 
      ['completed', 'confirmed'].includes(apt.status)
    )
    
    console.log('🔍 DEBUG: Valid appointments:', validAppointments.length)
    
    if (validAppointments.length === 0) {
      console.log('⚠️ DEBUG: No valid appointments found')
      return
    }
    
    // Berechne Stunden für jeden Monat
    const now = new Date()
    console.log('🔍 DEBUG: Current date:', now)
    
    // Alle 4 Monate definieren
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    
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
    
    // Setze alle Werte
    monthlyStats.value.currentMonth.worked = currentHours
    monthlyStats.value.previousMonth.worked = previousHours
    monthlyStats.value.twoMonthsAgo.worked = twoMonthsAgoHours
    monthlyStats.value.threeMonthsAgo.worked = threeMonthsAgoHours
    
    console.log('✅ DEBUG: Final working hours set:', {
      current: monthlyStats.value.currentMonth.worked,
      previous: monthlyStats.value.previousMonth.worked,
      twoAgo: monthlyStats.value.twoMonthsAgo.worked,
      threeAgo: monthlyStats.value.threeMonthsAgo.worked
    })
    
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

    // 1. Staff-Kategorien speichern
    console.log('🔥 Saving staff categories...', selectedCategories.value)
    
    // Erst alle alten löschen
    const { error: deleteError } = await supabase
      .from('staff_categories')
      .delete()
      .eq('staff_id', props.currentUser.id)

    if (deleteError) throw deleteError

    // Dann neue einfügen
    if (selectedCategories.value.length > 0) {
      const categoryData = selectedCategories.value.map(categoryId => ({
        staff_id: props.currentUser.id,
        category_id: categoryId,
        is_active: true
      }))

      const { error: insertError } = await supabase
        .from('staff_categories')
        .insert(categoryData)

      if (insertError) throw insertError
      console.log('✅ Staff categories saved:', categoryData.length)
    }

    // 2. Lektionsdauern speichern
    console.log('🔥 Saving lesson durations...', categoryDurations.value)
    
    // Erst alle alten löschen
    const { error: deleteDurationsError } = await supabase
      .from('staff_category_durations')
      .delete()
      .eq('staff_id', props.currentUser.id)

    if (deleteDurationsError) throw deleteDurationsError

    // Dann neue einfügen
    const durationData = []
    for (const [categoryCode, durations] of Object.entries(categoryDurations.value)) {
      for (const duration of durations) {
        durationData.push({
          staff_id: props.currentUser.id,
          category_code: categoryCode,
          duration_minutes: duration,
          is_active: true
        })
      }
    }

    if (durationData.length > 0) {
      const { error: insertDurationsError } = await supabase
        .from('staff_category_durations')
        .insert(durationData)

      if (insertDurationsError) throw insertDurationsError
      console.log('✅ Lesson durations saved:', durationData.length)
    }

    // 3. Staff Settings speichern (falls Tabelle existiert)
    console.log('🔥 Saving staff settings...')
    
    const settingsData = {
      staff_id: props.currentUser.id,
      work_start_time: workingHours.value.start,
      work_end_time: workingHours.value.end,
      available_weekdays: availableDays.value.join(','),
      sms_notifications: notifications.value.sms,
      email_notifications: notifications.value.email,
      updated_at: new Date().toISOString()
    }

    // Erst prüfen ob Eintrag existiert
    const { data: existingSettings } = await supabase
      .from('staff_settings')
      .select('id')
      .eq('staff_id', props.currentUser.id)
      .maybeSingle()

    if (existingSettings) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('staff_settings')
        .update({
          work_start_time: workingHours.value.start,
          work_end_time: workingHours.value.end,
          available_weekdays: availableDays.value.join(','),
          sms_notifications: notifications.value.sms,
          email_notifications: notifications.value.email,
          updated_at: new Date().toISOString()
        })
        .eq('staff_id', props.currentUser.id)

      if (updateError) throw updateError
      console.log('✅ Staff settings updated')
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('staff_settings')
        .insert(settingsData)

      if (insertError) throw insertError
      console.log('✅ Staff settings created')
    }

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

// Lifecycle
onMounted(() => {
  loadData()
  loadWorkingHoursData()

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