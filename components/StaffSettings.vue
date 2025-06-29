<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Meine Einstellungen</h2>
          <p class="text-gray-600">{{ currentUser?.first_name }} {{ currentUser?.last_name }}</p>
        </div>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700 text-2xl">
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-8">
        
        <!-- Kategorien verwalten -->
        <section>
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            🎓 Meine Unterrichtskategorien
          </h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div 
              v-for="category in availableCategories" 
              :key="category.id"
              class="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50"
            >
              <input
                type="checkbox"
                :id="`cat-${category.id}`"
                :checked="selectedCategories.includes(category.id)"
                @change="toggleCategory(category.id)"
                class="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <label :for="`cat-${category.id}`" class="text-sm font-medium cursor-pointer flex-1">
                {{ category.code }} - {{ category.name }}
                <span class="block text-xs text-gray-500">CHF {{ category.price_per_lesson }}/45min</span>
              </label>
            </div>
          </div>
        </section>

        <!-- Abholorte verwalten -->
        <section>
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            📍 Meine Abholorte
          </h3>
          
          <!-- Bestehende Orte -->
          <div class="space-y-3 mb-4">
            <div 
              v-for="(location, index) in myLocations" 
              :key="location.id || `new-${index}`"
              class="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50"
            >
              <div class="flex-1">
                <input
                  v-model="location.name"
                  type="text"
                  placeholder="Ort Name"
                  class="w-full p-2 border rounded text-sm font-medium mb-1"
                />
                <input
                  v-model="location.address"
                  type="text"
                  placeholder="Vollständige Adresse"
                  class="w-full p-2 border rounded text-sm"
                />
              </div>
              <button 
                @click="removeLocation(index)"
                class="text-red-500 hover:text-red-700 p-1"
              >
                🗑️
              </button>
            </div>
          </div>
          
          <!-- Neuen Ort hinzufügen -->
          <div class="flex space-x-3">
            <input
              v-model="newLocationName"
              type="text"
              placeholder="Neuer Ort (z.B. Bahnhof Zürich)"
              class="flex-1 p-2 border rounded"
            />
            <input
              v-model="newLocationAddress"
              type="text"
              placeholder="Vollständige Adresse"
              class="flex-1 p-2 border rounded"
            />
            <button 
              @click="addLocation"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              :disabled="!newLocationName || !newLocationAddress"
            >
              ➕ Hinzufügen
            </button>
          </div>
        </section>

        <!-- Bevorzugte Lektionsdauern -->
        <section>
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            ⏱️ Bevorzugte Lektionsdauern
          </h3>
          <div class="grid grid-cols-3 md:grid-cols-5 gap-3">
            <div 
              v-for="duration in availableDurations" 
              :key="duration"
              class="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50"
            >
              <input
                type="checkbox"
                :id="`dur-${duration}`"
                :checked="preferredDurations.includes(duration)"
                @change="toggleDuration(duration)"
                class="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <label :for="`dur-${duration}`" class="text-sm cursor-pointer">
                {{ duration }}min
              </label>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            Diese Dauern werden standardmäßig in der Terminbuchung angezeigt
          </p>
        </section>

        <!-- Arbeitszeiten -->
        <section>
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            🕐 Arbeitszeiten & Verfügbarkeit
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <!-- Arbeitszeiten -->
            <div>
              <label class="block text-sm font-medium mb-2">Arbeitszeiten</label>
              <div class="flex items-center space-x-2">
                <input
                  v-model="workingHours.start"
                  type="time"
                  class="p-2 border rounded"
                />
                <span class="text-gray-500">bis</span>
                <input
                  v-model="workingHours.end"
                  type="time"
                  class="p-2 border rounded"
                />
              </div>
            </div>

            <!-- Verfügbare Tage -->
            <div>
              <label class="block text-sm font-medium mb-2">Verfügbare Wochentage</label>
              <div class="grid grid-cols-4 gap-2">
                <div v-for="(day, index) in weekDays" :key="day" class="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    :id="`day-${index}`"
                    :checked="availableDays.includes(index)"
                    @change="toggleDay(index)"
                    class="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <label :for="`day-${index}`" class="text-xs cursor-pointer">
                    {{ day }}
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Benachrichtigungen -->
        <section>
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            🔔 Benachrichtigungen
          </h3>
          <div class="space-y-3">
            <label class="flex items-center space-x-3">
              <input
                v-model="notifications.sms"
                type="checkbox"
                class="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <span class="text-sm">SMS bei neuen Buchungen</span>
            </label>
            <label class="flex items-center space-x-3">
              <input
                v-model="notifications.email"
                type="checkbox"
                class="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <span class="text-sm">E-Mail bei Änderungen</span>
            </label>
            <label class="flex items-center space-x-3">
              <input
                v-model="autoConfirm"
                type="checkbox"
                class="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <span class="text-sm">Buchungen automatisch bestätigen</span>
            </label>
          </div>
        </section>

      </div>

      <!-- Footer -->
      <div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end space-x-3 rounded-b-xl">
        <button @click="$emit('close')" class="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">
          Abbrechen
        </button>
        <button @click="saveSettings" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          💾 Speichern
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createClient } from '@supabase/supabase-js'

// Types
interface User {
  id: string
  first_name: string
  last_name: string
  role: string
}

interface Category {
  id: number
  name: string
  code: string
  price_per_lesson: number
}

interface Location {
  id: number | null
  name: string
  address: string
}

interface WorkingHours {
  start: string
  end: string
}

interface Notifications {
  sms: boolean
  email: boolean
}

// Props & Emits
interface Props {
  currentUser: User
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

// Supabase Client
const supabaseClient = createClient(
  'https://unyjaetebnaexaflpyoc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVueWphZXRlYm5hZXhhZmxweW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzOTc0NjAsImV4cCI6MjA2NTk3MzQ2MH0.GH3W1FzpogOG-iTWNv8ckt-TkqboCiB9RYGFlGUzLnU'
)

// Reactive Data
const availableCategories = ref<Category[]>([])
const selectedCategories = ref<number[]>([])
const myLocations = ref<Location[]>([])
const preferredDurations = ref<number[]>([45, 90])
const workingHours = ref<WorkingHours>({ start: '08:00', end: '18:00' })
const availableDays = ref<number[]>([1, 2, 3, 4, 5]) // Mo-Fr
const notifications = ref<Notifications>({ sms: true, email: true })
const autoConfirm = ref<boolean>(false)

// New location form
const newLocationName = ref<string>('')
const newLocationAddress = ref<string>('')

// Constants
const availableDurations = [45, 60, 75, 90, 120, 135, 150, 165, 180, 195, 210]
const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

// Methods
const loadData = async () => {
  try {
    // Load available categories
    const { data: categoriesData } = await supabaseClient
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
    
    availableCategories.value = categoriesData || []

    // Load staff categories (selected ones)
    const { data: staffCategoriesData } = await supabaseClient
      .from('staff_categories')
      .select('category_id')
      .eq('staff_id', props.currentUser.id)
      .eq('is_active', true)
    
    selectedCategories.value = staffCategoriesData?.map(sc => sc.category_id) || []

    // Load staff locations
    const { data: locationsData } = await supabaseClient
      .from('locations')
      .select('*')
      .eq('staff_id', props.currentUser.id)
    
    myLocations.value = locationsData?.map(loc => ({
      id: loc.id,
      name: loc.name,
      address: loc.address || ''
    })) || []

    // Load staff settings if exists
    const { data: settingsData } = await supabaseClient
      .from('staff_settings')
      .select('*')
      .eq('staff_id', props.currentUser.id)
      .single()
    
    if (settingsData) {
      preferredDurations.value = JSON.parse(settingsData.preferred_durations || '[45,90]')
      workingHours.value = JSON.parse(settingsData.working_hours || '{"start":"08:00","end":"18:00"}')
      availableDays.value = JSON.parse(settingsData.available_days || '[1,2,3,4,5]')
      notifications.value = JSON.parse(settingsData.notifications || '{"sms":true,"email":true}')
      autoConfirm.value = settingsData.auto_confirm || false
    }

  } catch (error) {
    console.error('Error loading staff settings:', error)
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

const toggleDuration = (duration: number) => {
  const index = preferredDurations.value.indexOf(duration)
  if (index > -1) {
    preferredDurations.value.splice(index, 1)
  } else {
    preferredDurations.value.push(duration)
  }
}

const toggleDay = (dayIndex: number) => {
  const index = availableDays.value.indexOf(dayIndex)
  if (index > -1) {
    availableDays.value.splice(index, 1)
  } else {
    availableDays.value.push(dayIndex)
  }
}

const addLocation = () => {
  if (newLocationName.value && newLocationAddress.value) {
    myLocations.value.push({
      id: null,
      name: newLocationName.value,
      address: newLocationAddress.value
    })
    newLocationName.value = ''
    newLocationAddress.value = ''
  }
}

const removeLocation = async (index: number) => {
  const locationToRemove = myLocations.value[index]
  
  // Wenn es eine existierende Location ist (hat ID), aus DB löschen
  if (locationToRemove?.id) {
    try {
      await supabaseClient
        .from('locations')
        .delete()
        .eq('id', locationToRemove.id)
      
      console.log('Location deleted from database')
    } catch (error: any) {
      console.error('Error deleting location:', error)
    }
  }
  
  // Aus lokalem Array entfernen
  myLocations.value.splice(index, 1)
}

const saveSettings = async () => {
  try {
    // Update staff categories
    await supabaseClient
      .from('staff_categories')
      .delete()
      .eq('staff_id', props.currentUser.id)
    
    if (selectedCategories.value.length > 0) {
      const staffCategoriesInsert = selectedCategories.value.map(categoryId => ({
        staff_id: props.currentUser.id,
        category_id: categoryId,
        is_active: true
      }))
      
      await supabaseClient
        .from('staff_categories')
        .insert(staffCategoriesInsert)
    }

    // Update locations - Nur neue/geänderte speichern
    const existingLocations = myLocations.value.filter(loc => loc.id !== null)
    const newLocations = myLocations.value.filter(loc => loc.id === null)
    
    // Existierende Locations updaten
    for (const loc of existingLocations) {
      if (loc.id) {
        await supabaseClient
          .from('locations')
          .update({
            name: loc.name,
            address: loc.address
          })
          .eq('id', loc.id)
      }
    }
    
    // Neue Locations hinzufügen
    if (newLocations.length > 0) {
      const locationsInsert = newLocations.map(loc => ({
        staff_id: props.currentUser.id,
        name: loc.name,
        address: loc.address
      }))
      
      await supabaseClient
        .from('locations')
        .insert(locationsInsert)
    }

    // Update staff settings
    const settingsData = {
      staff_id: props.currentUser.id,
      preferred_durations: JSON.stringify(preferredDurations.value),
      working_hours: JSON.stringify(workingHours.value),
      available_days: JSON.stringify(availableDays.value),
      notifications: JSON.stringify(notifications.value),
      auto_confirm: autoConfirm.value
    }

    const { error } = await supabaseClient
      .from('staff_settings')
      .upsert(settingsData)
    
    if (error) throw error

    alert('✅ Einstellungen erfolgreich gespeichert!')
    emit('close')

  } catch (error) {
    console.error('Error saving settings:', error)
    alert('❌ Fehler beim Speichern der Einstellungen')
  }
}

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* Custom scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>