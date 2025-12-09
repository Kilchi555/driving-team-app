<template>
  <div class="relative">
    <!-- Search Input -->
    <div class="relative">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        placeholder="Prüfungsstandort suchen (z.B. Zürich, Basel, Bern...)"
        class="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        @focus="isOpen = true"
        @blur="handleBlur"
        @keydown.arrow-down="highlightNext"
        @keydown.arrow-up="highlightPrevious"
        @keydown.enter="selectHighlighted"
        @keydown.escape="closeDropdown"
      />
      <div class="absolute inset-y-0 right-0 flex items-center pr-3">
        <svg v-if="isLoading" class="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <svg v-else class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
    </div>

    <!-- Dropdown Results -->
    <div
      v-if="isOpen && (filteredLocations.length > 0 || searchQuery.length > 0)"
      class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto"
    >
      <!-- No Results -->
      <div v-if="filteredLocations.length === 0 && searchQuery.length > 0" class="px-4 py-3 text-gray-500 text-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span>🔍</span>
            <span>Keine Prüfungsstandorte gefunden für "{{ searchQuery }}"</span>
          </div>
          <button
            @click="showAddForm = true"
            class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
          >
            + Hinzufügen
          </button>
        </div>
      </div>

      <!-- Results List -->
      <div v-else class="py-1">
        <div
          v-for="(location, index) in filteredLocations"
          :key="location.id"
          :class="[
            'px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors',
            index === highlightedIndex ? 'bg-blue-50' : '',
            isLocationSelected(location) ? 'bg-green-50' : ''
          ]"
          @click="selectLocation(location)"
          @mouseenter="highlightedIndex = index"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2">
                <h4 class="font-medium text-gray-900 text-sm truncate">{{ location.name }}</h4>
                <span v-if="isLocationSelected(location)" class="text-green-600 text-xs">✓ Ausgewählt</span>
              </div>
              <p class="text-xs text-gray-600 mt-1 truncate">{{ location.address }}</p>
              <div v-if="location.city || location.canton || location.postal_code" class="flex items-center space-x-2 mt-1">
                <span v-if="location.city" class="text-xs text-gray-500">{{ location.city }}</span>
                <span v-if="location.canton" class="text-xs text-gray-500">• {{ location.canton }}</span>
                <span v-if="location.postal_code" class="text-xs text-gray-500">• {{ location.postal_code }}</span>
              </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex gap-1 ml-3">
              <!-- Edit Button -->
              <button
                @click.stop="editLocation(location)"
                class="p-1.5 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                title="Standort bearbeiten"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              
              <!-- Add/Remove Button -->
              <button
                :class="[
                  'p-1.5 rounded-full transition-colors',
                  isLocationSelected(location)
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                ]"
                @click.stop="toggleLocation(location)"
                :title="isLocationSelected(location) ? 'Entfernen' : 'Hinzufügen'"
              >
                <svg v-if="isLocationSelected(location)" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Locations Summary -->
    <div v-if="selectedLocations.length > 0" class="mt-3">
      <div class="text-sm text-gray-600 mb-2">
        Ausgewählte Prüfungsstandorte ({{ selectedLocations.length }}):
      </div>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="location in selectedLocations"
          :key="location.id"
          class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
        >
          {{ location.name }}
          <button
            @click="removeLocation(location)"
            class="ml-2 hover:text-green-600"
          >
            ×
          </button>
        </span>
      </div>
    </div>

    <!-- Add/Edit Location Modal -->
    <div v-if="showAddForm || editingLocation" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">
              {{ editingLocation ? 'Prüfungsstandort bearbeiten' : 'Neuen Prüfungsstandort hinzufügen' }}
            </h3>
            <button @click="closeAddForm" class="text-gray-500 hover:text-gray-700">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                v-model="newLocationForm.name"
                type="text"
                placeholder="z.B. Strassenverkehrsamt Zürich"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
              <input
                v-model="newLocationForm.address"
                type="text"
                placeholder="Vollständige Adresse mit PLZ und Stadt"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Stadt</label>
                <input
                  v-model="newLocationForm.city"
                  type="text"
                  placeholder="z.B. Zürich"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Kanton</label>
                <select
                  v-model="newLocationForm.canton"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Kanton wählen</option>
                  <option value="ZH">Zürich</option>
                  <option value="BE">Bern</option>
                  <option value="LU">Luzern</option>
                  <option value="AG">Aargau</option>
                  <option value="SG">St. Gallen</option>
                  <option value="GR">Graubünden</option>
                  <option value="TI">Tessin</option>
                  <option value="VD">Waadt</option>
                  <option value="VS">Wallis</option>
                  <option value="GE">Genf</option>
                  <option value="FR">Freiburg</option>
                  <option value="SO">Solothurn</option>
                  <option value="BS">Basel-Stadt</option>
                  <option value="BL">Basel-Landschaft</option>
                  <option value="SH">Schaffhausen</option>
                  <option value="AR">Appenzell Ausserrhoden</option>
                  <option value="AI">Appenzell Innerrhoden</option>
                  <option value="NW">Nidwalden</option>
                  <option value="OW">Obwalden</option>
                  <option value="GL">Glarus</option>
                  <option value="ZG">Zug</option>
                  <option value="UR">Uri</option>
                  <option value="SZ">Schwyz</option>
                  <option value="JU">Jura</option>
                  <option value="NE">Neuenburg</option>
                </select>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">PLZ</label>
              <input
                v-model="newLocationForm.postal_code"
                type="text"
                placeholder="z.B. 8001"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
            </div>
            
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p class="text-sm text-blue-800">
                💡 <strong>Hinweis:</strong> Dieser Standort wird global für alle Staff verfügbar sein.
              </p>
            </div>
          </div>
          
          <div class="mt-6 flex gap-3">
            <button
              @click="editingLocation ? updateLocation() : addNewLocation()"
              :disabled="isAdding || !newLocationForm.name || !newLocationForm.address"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {{ isAdding ? (editingLocation ? 'Aktualisieren...' : 'Hinzufügen...') : (editingLocation ? 'Aktualisieren' : 'Hinzufügen') }}
            </button>
            <button
              @click="closeAddForm"
              class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Abbrechen
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

interface ExamLocation {
  id: string
  name: string
  address: string
  city?: string
  canton?: string
  postal_code?: string
  location_type: string
  is_active: boolean
}

interface Props {
  currentStaffId: string
  selectedLocationIds?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  selectedLocationIds: () => []
})

const emit = defineEmits<{
  'location-selected': [location: ExamLocation]
  'location-removed': [location: ExamLocation]
  'locations-changed': [locations: ExamLocation[]]
}>()

// State
const searchInput = ref<HTMLInputElement>()
const searchQuery = ref('')
const isOpen = ref(false)
const isLoading = ref(false)
const highlightedIndex = ref(-1)
const allLocations = ref<ExamLocation[]>([])
const selectedLocations = ref<ExamLocation[]>([])

// Add/Edit location form
const showAddForm = ref(false)
const isAdding = ref(false)
const editingLocation = ref<ExamLocation | null>(null)
const newLocationForm = ref({
  name: '',
  address: '',
  city: '',
  canton: '',
  postal_code: ''
})

// Computed
const filteredLocations = computed(() => {
  if (!searchQuery.value) return allLocations.value.slice(0, 50) // Show first 50 when no search
  
  const query = searchQuery.value.toLowerCase()
  return allLocations.value.filter(location => 
    location.name.toLowerCase().includes(query) ||
    location.address.toLowerCase().includes(query) ||
    (location.city && location.city.toLowerCase().includes(query)) ||
    (location.canton && location.canton.toLowerCase().includes(query)) ||
    (location.postal_code && location.postal_code.includes(query))
  ).slice(0, 50) // Limit to 50 results for performance
})

// Methods
const loadAllExamLocations = async () => {
  isLoading.value = true
  try {
    const supabase = getSupabase()
    
    logger.debug('🔍 Loading all Swiss exam locations (global)')

    // Load all exam locations from Switzerland (global locations - no tenant filtering needed)
    const { data: locations, error } = await supabase
      .from('locations')
      .select('*')
      .eq('location_type', 'exam')
      .is('tenant_id', null) // Global locations (no tenant assigned)
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    allLocations.value = locations || []
    logger.debug('✅ Loaded exam locations:', allLocations.value.length)
    logger.debug('🔍 First few locations:', allLocations.value.slice(0, 5))
    
    // Debug: Check if we have any locations at all
    if (allLocations.value.length === 0) {
      console.warn('⚠️ No exam locations found in database!')
      logger.debug('🔍 Checking if locations table has any exam locations...')
      
      // Check total locations in table
      const { data: allLocationsCheck, error: checkError } = await supabase
        .from('locations')
        .select('id, name, location_type, staff_ids, is_active')
        .limit(10)
      
      if (checkError) {
        console.error('❌ Error checking locations table:', checkError)
      } else {
        logger.debug('🔍 All locations in table (first 10):', allLocationsCheck)
      }
    }

    // Load currently selected locations for this staff member
    await loadSelectedLocations()

  } catch (err: any) {
    console.error('❌ Error loading exam locations:', err)
  } finally {
    isLoading.value = false
  }
}

const loadSelectedLocations = async () => {
  try {
    const supabase = getSupabase()
    
    // Load staff-specific exam location preferences (where currentStaffId is in staff_ids)
    const { data: allExamLocs, error } = await supabase
      .from('locations')
      .select('*')
      .eq('location_type', 'exam')
      .eq('is_active', true)
    
    // Filter: nur die, wo currentStaffId in staff_ids ist
    const staffLocations = (allExamLocs || []).filter((loc: any) => {
      const staffIds = loc.staff_ids || []
      return Array.isArray(staffIds) && staffIds.includes(props.currentStaffId)
    })

    if (error) throw error

    selectedLocations.value = staffLocations || []
    logger.debug('✅ Loaded selected locations:', selectedLocations.value.length)

  } catch (err: any) {
    console.error('❌ Error loading selected locations:', err)
  }
}

const isLocationSelected = (location: ExamLocation): boolean => {
  return selectedLocations.value.some(selected => 
    selected.name === location.name && selected.address === location.address
  )
}

const selectLocation = (location: ExamLocation) => {
  if (!isLocationSelected(location)) {
    addLocation(location)
  }
  closeDropdown()
}

const addLocation = async (location: ExamLocation) => {
  try {
    const supabase = getSupabase()
    
    // Add to staff preferences by creating new location with staff_ids array
    const { error } = await supabase
      .from('locations')
      .insert({
        staff_ids: [props.currentStaffId],
        name: location.name,
        address: location.address,
        location_type: 'exam',
        is_active: true
      })

    if (error) throw error

    // Add to local state
    selectedLocations.value.push(location)
    
    emit('location-selected', location)
    emit('locations-changed', selectedLocations.value)
    
    logger.debug('✅ Location added:', location.name)

  } catch (err: any) {
    console.error('❌ Error adding location:', err)
  }
}

const removeLocation = async (location: ExamLocation) => {
  try {
    const supabase = getSupabase()
    
    // Find the location and remove staff_id from staff_ids array
    const { data: locationsToUpdate, error: findError } = await supabase
      .from('locations')
      .select('*')
      .eq('name', location.name)
      .eq('address', location.address)
      .eq('location_type', 'exam')

    if (findError) throw findError

    // Update staff_ids array for each location found
    for (const loc of locationsToUpdate || []) {
      const staffIds = (loc.staff_ids || []).filter((id: string) => id !== props.currentStaffId)
      
      // If no staff left, delete the location; otherwise update staff_ids
      if (staffIds.length === 0) {
        await supabase
          .from('locations')
          .delete()
          .eq('id', loc.id)
      } else {
        await supabase
          .from('locations')
          .update({ staff_ids: staffIds })
          .eq('id', loc.id)
      }
    }

    // Remove from local state
    const index = selectedLocations.value.findIndex(selected => 
      selected.name === location.name && selected.address === location.address
    )
    if (index > -1) {
      selectedLocations.value.splice(index, 1)
    }
    
    emit('location-removed', location)
    emit('locations-changed', selectedLocations.value)
    
    logger.debug('✅ Location removed:', location.name)

  } catch (err: any) {
    console.error('❌ Error removing location:', err)
  }
}

const toggleLocation = (location: ExamLocation) => {
  if (isLocationSelected(location)) {
    removeLocation(location)
  } else {
    addLocation(location)
  }
}

const closeDropdown = () => {
  isOpen.value = false
  highlightedIndex.value = -1
}

const handleBlur = () => {
  // Delay closing to allow click events to fire
  setTimeout(() => {
    closeDropdown()
  }, 150)
}

const highlightNext = () => {
  if (filteredLocations.value.length > 0) {
    highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredLocations.value.length - 1)
  }
}

const highlightPrevious = () => {
  if (filteredLocations.value.length > 0) {
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
  }
}

const selectHighlighted = () => {
  if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredLocations.value.length) {
    selectLocation(filteredLocations.value[highlightedIndex.value])
  }
}

// Watch for search query changes
watch(searchQuery, () => {
  highlightedIndex.value = -1
})

// Add new location methods
const addNewLocation = async () => {
  if (!newLocationForm.value.name || !newLocationForm.value.address) {
    alert('Name und Adresse sind erforderlich')
    return
  }

  isAdding.value = true
  try {
    const supabase = getSupabase()
    
    const locationData = {
      name: newLocationForm.value.name.trim(),
      address: newLocationForm.value.address.trim(),
      city: newLocationForm.value.city.trim() || null,
      canton: newLocationForm.value.canton || null,
      postal_code: newLocationForm.value.postal_code.trim() || null,
      location_type: 'exam',
      is_active: true,
      staff_ids: [], // Global location (empty array = no specific staff)
      tenant_id: null, // Global location (no tenant assigned)
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('locations')
      .insert([locationData])
      .select()
      .single()

    if (error) throw error

    logger.debug('✅ New exam location added globally:', data)
    
    // Reload all locations to include the new one
    await loadAllExamLocations()
    
    // Close form and reset
    closeAddForm()
    
    // Show success message
    alert(`✅ "${newLocationForm.value.name}" wurde erfolgreich hinzugefügt und ist jetzt für alle Staff verfügbar!`)
    
  } catch (err: any) {
    console.error('❌ Error adding new location:', err)
    alert(`❌ Fehler beim Hinzufügen: ${err.message}`)
  } finally {
    isAdding.value = false
  }
}

const editLocation = (location: ExamLocation) => {
  editingLocation.value = location
  newLocationForm.value = {
    name: location.name,
    address: location.address,
    city: location.city || '',
    canton: location.canton || '',
    postal_code: location.postal_code || ''
  }
  showAddForm.value = true
}

const updateLocation = async () => {
  if (!editingLocation.value || !newLocationForm.value.name || !newLocationForm.value.address) {
    alert('Name und Adresse sind erforderlich')
    return
  }

  isAdding.value = true
  try {
    const supabase = getSupabase()
    
    const locationData = {
      name: newLocationForm.value.name.trim(),
      address: newLocationForm.value.address.trim(),
      city: newLocationForm.value.city.trim() || null,
      canton: newLocationForm.value.canton || null,
      postal_code: newLocationForm.value.postal_code.trim() || null,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('locations')
      .update(locationData)
      .eq('id', editingLocation.value.id)

    if (error) throw error

    logger.debug('✅ Exam location updated globally:', editingLocation.value.id)
    
    // Reload all locations to include the updated one
    await loadAllExamLocations()
    
    // Close form and reset
    closeAddForm()
    
    // Show success message
    alert(`✅ "${newLocationForm.value.name}" wurde erfolgreich aktualisiert!`)
    
  } catch (err: any) {
    console.error('❌ Error updating location:', err)
    alert(`❌ Fehler beim Aktualisieren: ${err.message}`)
  } finally {
    isAdding.value = false
  }
}

const closeAddForm = () => {
  showAddForm.value = false
  editingLocation.value = null
  newLocationForm.value = {
    name: '',
    address: '',
    city: '',
    canton: '',
    postal_code: ''
  }
}

// Lifecycle
onMounted(() => {
  loadAllExamLocations()
})
</script>

<style scoped>
/* Custom scrollbar for dropdown */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
