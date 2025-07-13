<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      📍 Standort
    </label>
    
    <!-- Toggle zwischen Standard und Custom -->
    <div class="flex gap-2 mb-3">
      <button
        @click="useStandardLocations = true"
        :class="[
          'px-3 py-1 text-sm rounded border',
          useStandardLocations 
            ? 'bg-blue-600 text-white border-blue-600' 
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        ]"
      >
        📋 Standard-Orte
      </button>
      <button
        @click="useStandardLocations = false"
        :class="[
          'px-3 py-1 text-sm rounded border',
          !useStandardLocations 
            ? 'bg-purple-600 text-white border-purple-600' 
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        ]"
      >
        🔍 Google Suche
      </button>
    </div>

    <!-- Kombinierter Dropdown für Standard + Pickup Locations -->
    <select
      v-if="useStandardLocations"
      v-model="selectedLocationId"
      @change="onLocationChange"
      class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
      :required="required"
      :disabled="isLoadingLocations"
    >
      <option value="">Standort wählen</option>
      
      <!-- Standard Locations (Fahrschule) -->
      <optgroup label="🏢 Fahrschule-Standorte" v-if="standardLocations.length > 0">
        <option v-for="location in standardLocations" :key="`standard-${location.id}`" :value="location.id">
          {{ location.name }} - {{ location.address }}
        </option>
      </optgroup>
      
      <!-- Pickup Locations (Schüler) -->
      <optgroup label="📍 Gespeicherte Treffpunkte" v-if="studentPickupLocations.length > 0 && selectedStudentId">
        <option v-for="location in studentPickupLocations" :key="`pickup-${location.id}`" :value="location.id">
          {{ location.name }} - {{ location.address }}
        </option>
      </optgroup>
      
      <!-- Loading State -->
      <option v-if="isLoadingLocations" disabled>Lade Standorte...</option>
    </select>

    <!-- Google Places Input -->
    <div v-else class="relative">
      <input
        ref="googlePlacesInput"
        v-model="locationSearchQuery"
        @input="onLocationSearch"
        @focus="showLocationSuggestions = true"
        @blur="hideLocationSuggestionsDelayed"
        type="text"
        placeholder="Adresse eingeben... (z.B. Bahnhofstrasse 1, Zürich)"
        class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        autocomplete="off"
      />
      
      <!-- Loading -->
      <div v-if="isLoadingGooglePlaces" class="absolute right-3 top-3">
        <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
      </div>

      <!-- Google Suggestions -->
      <div 
        v-if="showLocationSuggestions && locationSuggestions.length > 0" 
        class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto"
      >
        <div
          v-for="suggestion in locationSuggestions"
          :key="suggestion.place_id"
          @mousedown="selectLocationSuggestion(suggestion)"
          class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
        >
          <div class="flex items-start gap-3">
            <span class="text-lg mt-0.5">📍</span>
            <div class="flex-1">
              <div class="font-medium text-gray-900">
                {{ suggestion.structured_formatting?.main_text || suggestion.description }}
              </div>
              <div class="text-sm text-gray-500">
                {{ suggestion.structured_formatting?.secondary_text || '' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Results -->
      <div 
        v-if="showLocationSuggestions && locationSearchQuery.length > 2 && locationSuggestions.length === 0 && !isLoadingGooglePlaces"
        class="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500"
      >
        <span class="text-2xl block mb-2">🔍</span>
        <p>Keine Ergebnisse für "{{ locationSearchQuery }}"</p>
      </div>
    </div>

    <!-- Selected Custom Location Preview -->
    <div v-if="!useStandardLocations && selectedCustomLocation" class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div class="flex items-start gap-3">
        <span class="text-green-600 text-lg mt-0.5">✅</span>
        <div class="flex-1">
          <div class="font-medium text-green-800">{{ selectedCustomLocation.name }}</div>
          <div class="text-sm text-green-600">{{ selectedCustomLocation.address }}</div>
          <div class="flex gap-2 mt-2">
            <a :href="getLocationMapsUrl(selectedCustomLocation)" target="_blank" 
               class="text-xs text-blue-600 hover:text-blue-800">
              🗺️ In Google Maps öffnen
            </a>
            <button @click="clearCustomLocation" class="text-xs text-red-600 hover:text-red-800">
              ✕ Entfernen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Standard/Pickup Location Preview -->
    <div v-if="useStandardLocations && selectedLocationId && currentSelectedLocation" class="mt-2">
      <div class="flex items-center gap-2 text-sm text-gray-600">
        <a :href="getLocationMapsUrl(currentSelectedLocation)" target="_blank" 
           class="text-blue-600 hover:text-blue-800 ml-auto">
          🗺️ Google Maps
        </a>
      </div>
    </div>
    <!-- Loading Indicator -->
    <div v-if="isLoadingLocations" class="flex items-center gap-2 mt-2 text-sm text-gray-500">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
      <span>Lade Standorte...</span>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
      ⚠️ {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Google Maps Types Declaration
declare global {
  interface Window {
    google: any
  }
  const google: any
}

// Types
interface Location {
  id: string
  name: string
  address: string
  latitude?: undefined
  longitude?: undefined
  place_id?: string // Für temporäre Locations
  location_type: 'standard' | 'pickup'
  staff_id?: string
  user_id?: string
  google_place_id?: string
  source?: 'standard' | 'pickup' | 'google' // ✅ HINZUFÜGEN
}

interface GooglePlaceSuggestion {
  place_id: string
  description: string
  structured_formatting?: {
    main_text: string
    secondary_text: string
  }
}

// Props
const props = defineProps({
  modelValue: {
    type: String, // location_id
    default: null
  },
  required: {
    type: Boolean,
    default: false
  },
  selectedStudentId: {
    type: String,
    default: null
  },
  selectedStudentName: {
    type: String,
    default: ''
  },
  currentStaffId: {
    type: String,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'locationSelected'])

// Supabase
const supabase = getSupabase()

// Reactive state
const useStandardLocations = ref(true)
const selectedLocationId = ref('')
const locationSearchQuery = ref('')
const showLocationSuggestions = ref(false)
const isLoadingGooglePlaces = ref(false)
const isLoadingLocations = ref(false)
const locationSuggestions = ref<GooglePlaceSuggestion[]>([])
const selectedCustomLocation = ref<Location | null>(null)
const googlePlacesInput = ref<HTMLInputElement | null>(null)
const error = ref<string | null>(null)

// Location Data
const standardLocations = ref<Location[]>([])
const studentPickupLocations = ref<Location[]>([])

// Computed
const currentSelectedLocation = computed(() => {
  if (!selectedLocationId.value) return null
  
  return [...standardLocations.value, ...studentPickupLocations.value]
    .find(loc => loc.id === selectedLocationId.value)
})

// Google Places Service
let placesLibrary: any = null

// === DATABASE FUNCTIONS ===

const loadStandardLocations = async () => {
  try {
    let query = supabase
      .from('locations')
      .select('id, name, address, latitude, longitude, location_type, staff_id')
      .eq('location_type', 'standard')
      .eq('is_active', true)
      .order('name')

    // Filter by current staff if provided
    if (props.currentStaffId) {
      query = query.eq('staff_id', props.currentStaffId)
    }

    const { data, error: fetchError } = await query

    if (fetchError) throw fetchError
    
    standardLocations.value = data || []
    console.log('✅ Standard locations loaded:', data?.length)
    
  } catch (err: any) {
    error.value = `Fehler beim Laden der Standard-Standorte: ${err.message}`
    console.error('❌ Error loading standard locations:', err)
  }
}

// Erweiterte loadStudentPickupLocations Funktion
const loadStudentPickupLocations = async (studentId: string) => {
  if (!studentId) {
    studentPickupLocations.value = []
    return
  }

  try {
    // 1. Lade alle Pickup-Locations des Schülers
    const { data, error: fetchError } = await supabase
      .from('locations')
      .select('id, name, address, latitude, longitude, location_type, user_id, google_place_id')
      .eq('location_type', 'pickup')
      .eq('user_id', studentId)
      .eq('is_active', true)
      .order('name')

    if (fetchError) throw fetchError
    
    studentPickupLocations.value = data || []
    console.log('✅ Student pickup locations loaded:', data?.length)
    
    // 2. Lade letzten verwendeten Standort
    const lastLocation = await loadLastUsedLocation(studentId)
    
    if (lastLocation && !selectedLocationId.value) {
      // 3. Setze letzten Standort als Standard (nur wenn noch nichts ausgewählt)
      selectedLocationId.value = lastLocation.id
      
      emit('update:modelValue', lastLocation.id)
      emit('locationSelected', {
        ...lastLocation,
        source: lastLocation.location_type === 'standard' ? 'standard' : 'pickup'
      })
      
      console.log('🎯 Auto-selected last used location:', lastLocation.name)
    } else if (!lastLocation && studentPickupLocations.value.length > 0 && !selectedLocationId.value) {
      // 4. Fallback: Ersten Pickup-Location wählen falls kein letzter Standort gefunden
      const firstPickup = studentPickupLocations.value[0]
      selectedLocationId.value = firstPickup.id
      
      emit('update:modelValue', firstPickup.id)
      emit('locationSelected', {
        ...firstPickup,
        source: 'pickup'
      })
      
      console.log('📍 Auto-selected first pickup location:', firstPickup.name)
    }
    
  } catch (err: any) {
    error.value = `Fehler beim Laden der Treffpunkte: ${err.message}`
    console.error('❌ Error loading pickup locations:', err)
  }
}

// 🔧 LOCATION SELECTOR - KORREKTE CONSTRAINT LOGIC
const savePickupLocation = async (locationData: any, studentId: string) => {
  try {
    const locationName = `${props.selectedStudentName} - ${locationData.name}`.trim()
    
    // ✅ RICHTIGE CONSTRAINT LOGIC FÜR PICKUP:
    // location_type = 'pickup' AND user_id NOT NULL AND staff_id IS NULL
    const locationToSave = {
      location_type: 'pickup',    // ✅ pickup type
      user_id: studentId,         // ✅ MUSS gesetzt sein
      staff_id: null,             // ✅ MUSS null sein für pickup!
      name: locationName,
      address: locationData.address,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      google_place_id: locationData.place_id,
      is_active: true
    }
    
    console.log('📤 Sending pickup location (staff_id=null):', locationToSave)
    
    const { data, error: saveError } = await supabase
      .from('locations')
      .insert(locationToSave)
      .select()
      .single()

    if (saveError) {
      console.error('❌ Supabase Error:', saveError)
      throw saveError
    }

    studentPickupLocations.value.push(data)
    console.log('✅ Pickup location saved successfully:', data)
    return data

  } catch (err: any) {
    console.error('❌ Error saving pickup location:', err)
    error.value = `Fehler beim Speichern des Treffpunkts: ${err.message}`
    throw err
  }
}

// Neue Funktion für letzten Treffpunkt
// LocationSelector.vue - Ersetze die loadLastUsedLocation Funktion komplett

const loadLastUsedLocation = async (studentId: string) => {
  if (!studentId) return null
  
  try {
    console.log('🔍 Loading last used location for student:', studentId)
    
    // Schritt 1: Letzten Termin finden
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .select('location_id, start_time')
      .eq('user_id', studentId)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })
      .limit(1)
      .single()

    if (appointmentError) {
      if (appointmentError.code === 'PGRST116') {
        console.log('ℹ️ No previous appointments found for student')
        return null
      }
      throw appointmentError
    }

    if (!appointmentData?.location_id) {
      console.log('ℹ️ No location_id in last appointment')
      return null
    }

    // Schritt 2: Location-Details laden
    const { data: locationData, error: locationError } = await supabase
      .from('locations')
      .select('id, name, address, location_type, user_id, staff_id, google_place_id, is_active')
      .eq('id', appointmentData.location_id)
      .single()

    if (locationError) {
      console.error('❌ Error loading location details:', locationError)
      return null
    }

    if (locationData) {
      console.log('✅ Found last used location:', locationData.name)
      return locationData
    }

    return null
    
  } catch (err: any) {
    console.error('❌ Error loading last used location:', err)
    return null
  }
}

// === GOOGLE PLACES FUNCTIONS ===

const initializeGooglePlaces = async () => {
  if (typeof window !== 'undefined' && window.google && window.google.maps) {
    try {
      const { Place, AutocompleteSuggestion } = await window.google.maps.importLibrary('places')
      placesLibrary = { Place, AutocompleteSuggestion }
      console.log('✅ Google Places (New API) initialized')
    } catch (error) {
      console.warn('⚠️ New Places API failed, using legacy API:', error)
      if (window.google.maps.places) {
        console.log('✅ Google Places (Legacy) initialized')
      }
    }
  }
}

const onLocationSearch = async () => {
  const query = locationSearchQuery.value.trim()
  
  if (query.length < 3) {
    locationSuggestions.value = []
    showLocationSuggestions.value = false
    return
  }

  isLoadingGooglePlaces.value = true
  error.value = null
  
  try {
    // Try new API first
    if (placesLibrary && placesLibrary.AutocompleteSuggestion) {
      try {
        const request = {
          input: query,
          includedRegionCodes: ['CH'],
          language: 'de'
        }

        const { suggestions } = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
        
        if (suggestions && suggestions.length > 0) {
          locationSuggestions.value = suggestions.map((suggestion: any) => ({
            place_id: suggestion.placePrediction?.placeId || `new_${Date.now()}_${Math.random()}`,
            description: suggestion.placePrediction?.text?.text || 'Unbekannter Ort',
            structured_formatting: {
              main_text: suggestion.placePrediction?.mainText?.text || '',
              secondary_text: suggestion.placePrediction?.secondaryText?.text || ''
            }
          }))
          showLocationSuggestions.value = true
          isLoadingGooglePlaces.value = false
          return
        }
      } catch (newApiError) {
        console.warn('New Places API failed:', newApiError)
      }
    }

    // Fallback to legacy API
    if (window.google && window.google.maps && window.google.maps.places && window.google.maps.places.AutocompleteService) {
      const autocompleteService = new window.google.maps.places.AutocompleteService()
      
      const request = {
        input: query,
        types: ['establishment', 'geocode'],
        componentRestrictions: { country: 'ch' },
        language: 'de'
      }

      autocompleteService.getPlacePredictions(request, (predictions: any, status: any) => {
        isLoadingGooglePlaces.value = false
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          locationSuggestions.value = predictions.map((prediction: any) => ({
            place_id: prediction.place_id,
            description: prediction.description,
            structured_formatting: prediction.structured_formatting
          }))
          showLocationSuggestions.value = true
        } else {
          locationSuggestions.value = []
          error.value = 'Keine Vorschläge von Google Places gefunden'
        }
      })
    } else {
      // Final fallback
      locationSuggestions.value = [
        {
          place_id: `fallback_${Date.now()}`,
          description: `${query}, Zürich, Schweiz`,
          structured_formatting: {
            main_text: query,
            secondary_text: 'Zürich, Schweiz'
          }
        }
      ]
      showLocationSuggestions.value = true
      isLoadingGooglePlaces.value = false
    }
  } catch (err: any) {
    console.error('Error searching places:', err)
    error.value = 'Fehler bei der Adresssuche'
    isLoadingGooglePlaces.value = false
    locationSuggestions.value = []
  }
}

const selectLocationSuggestion = async (suggestion: GooglePlaceSuggestion) => {
  try {
    const locationData = {
      name: suggestion.structured_formatting?.main_text || suggestion.description,
      address: suggestion.description,
      place_id: suggestion.place_id
    }
    
    // Check if this location already exists for this student
    const existingLocation = studentPickupLocations.value.find(
      loc => loc.google_place_id === suggestion.place_id
    )
    
    if (existingLocation) {
      // Use existing pickup location
      selectedLocationId.value = existingLocation.id
      useStandardLocations.value = true
      locationSearchQuery.value = ''
      selectedCustomLocation.value = null
      
      emit('update:modelValue', existingLocation.id)
      emit('locationSelected', existingLocation)
      
      console.log('🔄 Using existing pickup location:', existingLocation.name)
    } else if (props.selectedStudentId) {
      // Save as new pickup location
      const savedLocation = await savePickupLocation(locationData, props.selectedStudentId)
      
      selectedLocationId.value = savedLocation.id
      useStandardLocations.value = true
      locationSearchQuery.value = ''
      selectedCustomLocation.value = null
      
      emit('update:modelValue', savedLocation.id)
      emit('locationSelected', savedLocation)
      
      console.log('💾 Saved and selected new pickup location:', savedLocation.name)
    } else {
      // ✅ FIX: Kein Student selected - emitte temporäre Location mit korrektem Format
      const tempLocation = {
         id: `temp_${Date.now()}`,
        name: locationData.name,
        address: locationData.address,
        place_id: locationData.place_id,
        latitude: undefined, // ✅ FIX: undefined statt null
        longitude: undefined, // ✅ FIX: undefined statt null
        source: 'google' as const, // ✅ FIX: as const für bessere Typisierung
        location_type: 'pickup' as const // ✅ FIX: as const
      }
      
      selectedCustomLocation.value = tempLocation as Location
      locationSearchQuery.value = suggestion.description
      
      // ✅ FIX: Emitte null für modelValue aber vollständige Location für locationSelected
      emit('update:modelValue', null) // Keine echte ID
      emit('locationSelected', tempLocation) // ✅ Vollständige temp Location für EventModal
      
      console.log('⚠️ Temporary location (no student selected):', tempLocation)
    }
    
    showLocationSuggestions.value = false
    
  } catch (err: any) {
    error.value = `Fehler beim Speichern des Treffpunkts: ${err.message}`
    console.error('❌ Error selecting location:', err)
  }
}

// === EVENT HANDLERS ===

const onLocationChange = () => {
  const location = [...standardLocations.value, ...studentPickupLocations.value]
    .find(l => l.id === selectedLocationId.value)
    
  if (location) {
    emit('update:modelValue', location.id)
    
    // ✅ FIX: Emitte vollständige Location mit source
    const locationWithSource = {
      ...location,
      source: location.location_type === 'standard' ? 'standard' : 'pickup'
    }
    
    emit('locationSelected', locationWithSource)
    console.log('📍 Location selected:', location.name)
  }
}

const clearCustomLocation = () => {
  selectedCustomLocation.value = null
  locationSearchQuery.value = ''
  emit('update:modelValue', null)
  emit('locationSelected', null) // ✅ FIX: Auch locationSelected auf null setzen
}

const hideLocationSuggestionsDelayed = () => {
  setTimeout(() => {
    showLocationSuggestions.value = false
  }, 150)
}

const getLocationMapsUrl = (location: Location) => {
  if (!location) return '#'
  
  if (location.latitude && location.longitude) {
    return `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`
  } else {
    const query = encodeURIComponent(location.address)
    return `https://maps.google.com/maps?q=${query}`
  }
}

// === WATCHERS ===

// Aktualisierter Watcher für Student-Änderungen
watch(() => props.selectedStudentId, async (newStudentId, oldStudentId) => {
  if (newStudentId && newStudentId !== oldStudentId) {
    isLoadingLocations.value = true
    
    // Reset current selection when student changes
    selectedLocationId.value = ''
    selectedCustomLocation.value = null
    emit('update:modelValue', null)
    
    await loadStudentPickupLocations(newStudentId)
    isLoadingLocations.value = false
  } else if (!newStudentId) {
    studentPickupLocations.value = []
    selectedLocationId.value = ''
    selectedCustomLocation.value = null
    emit('update:modelValue', null)
  }
})

// Watch for staff changes
watch(() => props.currentStaffId, async (newStaffId) => {
  if (newStaffId) {
    isLoadingLocations.value = true
    await loadStandardLocations()
    isLoadingLocations.value = false
  }
})

// Watch for external model value changes
watch(() => props.modelValue, (newValue) => {
  if (newValue && newValue !== selectedLocationId.value) {
    selectedLocationId.value = newValue
    useStandardLocations.value = true
    selectedCustomLocation.value = null
  }
})

// === LIFECYCLE ===

onMounted(async () => {
  // Initialize Google Maps
  if (typeof window !== 'undefined' && window.google) {
    await initializeGooglePlaces()
  }
  
  // Load initial data
  isLoadingLocations.value = true
  
  try {
    await loadStandardLocations()
    
    if (props.selectedStudentId) {
      await loadStudentPickupLocations(props.selectedStudentId)
    }
  } catch (err) {
    console.error('Error loading initial location data:', err)
  } finally {
    isLoadingLocations.value = false
  }
})
</script>

<style scoped>
.relative .absolute {
  z-index: 50;
}
</style>