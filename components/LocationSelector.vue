<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      📍 Standort *
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

    <!-- Standard Dropdown -->
    <select
      v-if="useStandardLocations"
      v-model="selectedLocationId"
      @change="onStandardLocationChange"
      class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
      :required="required"
    >
      <option value="">Standort wählen</option>
      <option v-for="location in standardLocations" :key="location.id" :value="location.id">
        {{ location.name }} - {{ location.address }}
      </option>
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
      <div v-if="isLoadingLocations" class="absolute right-3 top-3">
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
        v-if="showLocationSuggestions && locationSearchQuery.length > 2 && locationSuggestions.length === 0 && !isLoadingLocations"
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
            <a :href="getCustomLocationMapsUrl()" target="_blank" 
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

    <!-- Standard Location Google Maps Link -->
    <div v-if="useStandardLocations && selectedLocationId" class="mt-2">
      <a :href="getStandardLocationMapsUrl()" target="_blank" 
         class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
        🗺️ In Google Maps öffnen
      </a>
    </div>

    <!-- Hint Text -->
    <p class="text-xs text-gray-500 mt-2">
      {{ useStandardLocations 
          ? 'ℹ️ Wählen Sie einen vorkonfigurierten Treffpunkt' 
          : '🔍 Tippen Sie mindestens 3 Zeichen für Vorschläge'
      }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

// Google Maps Types Declaration
declare global {
  interface Window {
    google: any
  }
  const google: any
}

// Types
interface StandardLocation {
  id: string
  name: string
  address: string
  latitude?: number
  longitude?: number
}

interface GooglePlaceSuggestion {
  place_id: string
  description: string
  structured_formatting?: {
    main_text: string
    secondary_text: string
  }
}

interface SelectedLocation {
  id?: string
  name: string
  address: string
  place_id?: string
  latitude?: number
  longitude?: number
  source: 'standard' | 'google'
}

// Props
const props = defineProps({
  modelValue: {
    type: [String, Object],
    default: null
  },
  required: {
    type: Boolean,
    default: false
  },
  standardLocations: {
    type: Array as () => StandardLocation[],
    default: () => [
      { 
        id: '1', 
        name: 'Hauptbahnhof Zürich', 
        address: 'Bahnhofstrasse 1, 8001 Zürich',
        latitude: 47.3781,
        longitude: 8.5396
      },
      { 
        id: '2', 
        name: 'Flughafen Zürich', 
        address: 'Flughafenstrasse 1, 8058 Zürich-Flughafen',
        latitude: 47.4647,
        longitude: 8.5492
      },
      { 
        id: '3', 
        name: 'ETH Zentrum', 
        address: 'Rämistrasse 101, 8092 Zürich',
        latitude: 47.3769,
        longitude: 8.5482
      }
    ]
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'locationSelected'])

// Reactive state
const useStandardLocations = ref(true)
const selectedLocationId = ref('')
const locationSearchQuery = ref('')
const showLocationSuggestions = ref(false)
const isLoadingLocations = ref(false)
const locationSuggestions = ref<GooglePlaceSuggestion[]>([])
const selectedCustomLocation = ref<SelectedLocation | null>(null)
const googlePlacesInput = ref<HTMLInputElement | null>(null)

// Google Places Service - Updated for new API
let placesLibrary: any = null

// Google Places Functions - Updated for new API
const initializeGooglePlaces = async () => {
  if (typeof window !== 'undefined' && window.google && window.google.maps) {
    try {
      // Use new Places Library (v3.56+)
      const { Place, AutocompleteSuggestion } = await window.google.maps.importLibrary('places')
      placesLibrary = { Place, AutocompleteSuggestion }
      console.log('✅ Google Places (New API) initialized')
    } catch (error) {
      // Fallback to old API if new one fails
      console.warn('⚠️ New Places API failed, using legacy API:', error)
      if (window.google.maps.places) {
        console.log('✅ Google Places (Legacy) initialized')
      }
    }
  } else {
    console.warn('⚠️ Google Maps not loaded')
  }
}

const onLocationSearch = async () => {
  const query = locationSearchQuery.value.trim()
  
  if (query.length < 3) {
    locationSuggestions.value = []
    showLocationSuggestions.value = false
    return
  }

  isLoadingLocations.value = true
  
  try {
    // Try new API first
    if (placesLibrary && placesLibrary.AutocompleteSuggestion) {
      try {
        const request = {
          input: query,
          includedRegionCodes: ['CH'], // Switzerland
          language: 'de'
        }

        const { suggestions } = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
        
        if (suggestions && suggestions.length > 0) {
          locationSuggestions.value = suggestions.map((suggestion: any) => ({
            place_id: suggestion.placePrediction?.placeId || `new_${Date.now()}_${Math.random()}`,
            description: suggestion.placePrediction?.text?.text || suggestion.placePrediction?.mainText?.text || 'Unbekannter Ort',
            structured_formatting: {
              main_text: suggestion.placePrediction?.mainText?.text || '',
              secondary_text: suggestion.placePrediction?.secondaryText?.text || ''
            }
          }))
          showLocationSuggestions.value = true
          isLoadingLocations.value = false
          console.log('✅ New Places API suggestions:', locationSuggestions.value.length)
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
        isLoadingLocations.value = false
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          locationSuggestions.value = predictions.map((prediction: any) => ({
            place_id: prediction.place_id,
            description: prediction.description,
            structured_formatting: prediction.structured_formatting
          }))
          showLocationSuggestions.value = true
          console.log('✅ Legacy API suggestions:', locationSuggestions.value.length)
        } else {
          locationSuggestions.value = []
          console.warn('Google Places API error:', status)
        }
      })
    } else {
      // Final fallback: Simple text suggestions
      await new Promise(resolve => setTimeout(resolve, 300))
      locationSuggestions.value = [
        {
          place_id: `fallback_${Date.now()}`,
          description: `${query}, Zürich, Schweiz`,
          structured_formatting: {
            main_text: query,
            secondary_text: 'Zürich, Schweiz'
          }
        },
        {
          place_id: `fallback_${Date.now()}_2`,
          description: `${query}, Schweiz`,
          structured_formatting: {
            main_text: query,
            secondary_text: 'Schweiz'
          }
        }
      ]
      showLocationSuggestions.value = true
      isLoadingLocations.value = false
      console.log('✅ Fallback suggestions provided')
    }
  } catch (error) {
    console.error('Error searching places:', error)
    isLoadingLocations.value = false
    locationSuggestions.value = []
  }
}

const selectLocationSuggestion = (suggestion: GooglePlaceSuggestion) => {
  const location: SelectedLocation = {
    name: suggestion.structured_formatting?.main_text || suggestion.description,
    address: suggestion.description,
    place_id: suggestion.place_id,
    source: 'google'
  }
  
  selectedCustomLocation.value = location
  locationSearchQuery.value = suggestion.description
  showLocationSuggestions.value = false
  
  emit('update:modelValue', location)
  emit('locationSelected', location)
  
  console.log('📍 Custom location selected:', location)
}

const onStandardLocationChange = () => {
  const location = props.standardLocations.find(l => l.id === selectedLocationId.value)
  if (location) {
    const selectedLoc: SelectedLocation = {
      id: location.id,
      name: location.name,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      source: 'standard'
    }
    
    emit('update:modelValue', selectedLoc)
    emit('locationSelected', selectedLoc)
    
    console.log('📍 Standard location selected:', selectedLoc)
  }
}

const clearCustomLocation = () => {
  selectedCustomLocation.value = null
  locationSearchQuery.value = ''
  emit('update:modelValue', null)
}

const hideLocationSuggestionsDelayed = () => {
  setTimeout(() => {
    showLocationSuggestions.value = false
  }, 150)
}

const getCustomLocationMapsUrl = () => {
  if (!selectedCustomLocation.value) return '#'
  const query = encodeURIComponent(selectedCustomLocation.value.address)
  return `https://maps.google.com/maps?q=${query}`
}

const getStandardLocationMapsUrl = () => {
  const location = props.standardLocations.find(l => l.id === selectedLocationId.value)
  if (!location) return '#'
  
  if (location.latitude && location.longitude) {
    return `https://maps.google.com/maps?q=${location.latitude},${location.longitude}`
  } else {
    const query = encodeURIComponent(location.address)
    return `https://maps.google.com/maps?q=${query}`
  }
}

// Initialize Google Maps
onMounted(async () => {
  // Check if Google Maps is already loaded
  if (typeof window !== 'undefined' && window.google) {
    await initializeGooglePlaces()
  } else {
    // Listen for Google Maps to load
    if (typeof window !== 'undefined') {
      const handleGoogleMapsLoad = async () => {
        await initializeGooglePlaces()
      }
      
      window.addEventListener('load', handleGoogleMapsLoad)
      
      // Or load Google Maps if not included globally
      if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        const script = document.createElement('script')
        // Get API key from environment or use a placeholder
        const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=de&region=CH&v=beta`
        script.async = true
        script.defer = true
        script.onload = handleGoogleMapsLoad
        script.onerror = () => {
          console.error('❌ Failed to load Google Maps API')
        }
        document.head.appendChild(script)
      }
    }
  }
})

// Watch for external changes
watch(() => props.modelValue, (newValue: any) => {
  if (newValue && typeof newValue === 'object') {
    const location = newValue as SelectedLocation
    if (location.source === 'standard') {
      useStandardLocations.value = true
      selectedLocationId.value = location.id || ''
    } else {
      useStandardLocations.value = false
      selectedCustomLocation.value = location
      locationSearchQuery.value = location.address || ''
    }
  } else if (typeof newValue === 'string') {
    // Legacy string location_id
    const location = props.standardLocations.find(l => l.id === newValue)
    if (location) {
      useStandardLocations.value = true
      selectedLocationId.value = newValue
    }
  }
})
</script>

<style scoped>
/* Ensure dropdown appears above other elements */
.relative .absolute {
  z-index: 50;
}
</style>