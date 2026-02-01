<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      📍 Standort
    </label>
    
    <!-- Toggle zwischen Standard und Custom (nur für zukünftige Termine) -->
    <div v-if="!props.isPastAppointment" class="flex gap-2 mb-3">
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
        🔍 Adresse eingeben
      </button>
    </div>

    <!-- Offline Manual Input -->
    <div v-if="!useStandardLocations" class="space-y-3">
      <!-- Offline-Indikator nur wenn tatsächlich offline -->
      <div v-if="error && error.includes('Offline')" class="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">
        <span>📴</span>
        <span>{{ error }}</span>
      </div>
      
      <div>
       <input
          v-model="manualLocationInput"
          @input="onLocationSearch"
          @blur="hideLocationSuggestionsDelayed"
          @keyup.enter="handleManualLocationSubmit"
          @focus="showLocationSuggestions = true"
          type="text"
          placeholder="z.B. Zürich HB, Bahnhofstrasse 1, 8001 Zürich"
          class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-black bg-white"
        />
      </div>

      <!-- Google Places Suggestions (online) -->
      <div v-if="showLocationSuggestions && locationSuggestions.length > 0" class="relative">
        <div class="absolute top-0 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          <div
            v-for="suggestion in locationSuggestions"
            :key="suggestion.place_id"
            @mousedown.prevent="selectLocationSuggestion(suggestion)"
            class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
          >
            <div class="font-medium text-gray-900">
              {{ suggestion.structured_formatting?.main_text || suggestion.description }}
            </div>
            <div class="text-sm text-gray-600">
              {{ suggestion.structured_formatting?.secondary_text || '' }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Current manual location display -->
      <div v-if="selectedCustomLocation && selectedCustomLocation.id && selectedCustomLocation.id.includes('manual')" 
           class="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="font-medium text-green-800">✅ {{ selectedCustomLocation.name }}</div>
            <div class="text-sm text-green-600">{{ selectedCustomLocation.address }}</div>
          </div>
          <button @click="clearManualLocation" class="text-red-500 hover:text-red-700">
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- Kombinierter Dropdown für Standard + Pickup Locations -->
    <select
      v-if="useStandardLocations"
      v-model="selectedLocationId"
      @change="onLocationChange"
      :disabled="isLoadingLocations || props.isPastAppointment"
      :class="[
        'w-full p-3 border rounded-lg focus:outline-none',
        props.isPastAppointment
          ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
          : 'border-gray-300 bg-white text-black focus:ring-2 focus:ring-green-500'
      ]"
      :required="required"
    >
      <option value="" class="text-black bg-white">Standort wählen</option>
      
      <!-- Standard Locations -->
      <optgroup label="Standorte" v-if="standardLocations.length > 0" class="text-black bg-white">
        <option v-for="location in standardLocations" :key="`standard-${location.id}`" :value="location.id" class="text-black bg-white">
          {{ location.address }}
        </option>
      </optgroup>
      
      <!-- Pickup Locations (Schüler) -->
      <optgroup label="📍 Gespeicherte Treffpunkte" v-if="studentPickupLocations.length > 0 && selectedStudentId" class="text-black bg-white">
          <option v-for="location in studentPickupLocations" :key="`pickup-${location.id}`" :value="location.id" class="text-black bg-white">
          {{ location.address }}
        </option>
      </optgroup>
      
      <!-- Loading State -->
      <option v-if="isLoadingLocations" disabled class="text-black bg-white">Lade Standorte...</option>
    </select>

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

import { ref, watch, onMounted, computed, nextTick } from 'vue'

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
  latitude?: number | null
  longitude?: number | null
  place_id?: string
  location_type: 'standard' | 'pickup'
  staff_id?: string | null
  user_id?: string | null
  google_place_id?: string | null
  source?: 'standard' | 'pickup' | 'google'
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
    type: String,
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
  },
  disableAutoSelection: {  // ✅ NEU: Verhindert automatische Location-Auswahl
    type: Boolean,
    default: false
  },
  isPastAppointment: {  // ✅ NEU: Verhindert Änderungen für vergangene Termine
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'locationSelected'])

// Supabase

// Reactive state
const useStandardLocations = ref(true)
const selectedLocationId = ref('')
const manualLocationInput = ref('')
const locationSearchQuery = ref('')
const showLocationSuggestions = ref(false)
const isLoadingGooglePlaces = ref(false)
const isLoadingLocations = ref(false)
const locationSuggestions = ref<GooglePlaceSuggestion[]>([])
const selectedCustomLocation = ref<any>(null)
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

// === MANUAL LOCATION FUNCTIONS ===

const handleOfflineError = (error: any) => {
  logger.debug('🔍 Checking if error is offline-related:', error)
  
  const isOfflineError = 
    error.message?.includes('Failed to fetch') ||
    error.message?.includes('ERR_INTERNET_DISCONNECTED') ||
    error.message?.includes('ERR_NETWORK') ||
    !navigator.onLine

  if (isOfflineError) {
    logger.debug('📴 Offline detected - switching to manual mode')
    useStandardLocations.value = false
    error.value = '📴 Offline-Modus: Bitte Treffpunkt manuell eingeben'
    return true
  }
  
  return false
}

const handleManualLocationSubmit = () => {
  const input = manualLocationInput.value.trim()
  
  if (!input) return
  
  const tempLocation = {
    id: `temp_manual_${Date.now()}`,
    name: input.split(',')[0].trim() || input,
    address: input,
    place_id: `manual_${Date.now()}`,
    latitude: null,
    longitude: null,
    location_type: 'pickup' as const,
    source: 'google' as const
  }
  
  selectedCustomLocation.value = tempLocation
  locationSearchQuery.value = input
  
  emit('update:modelValue', null)
  emit('locationSelected', tempLocation)
  
  logger.debug('📝 Manual location created:', tempLocation)
}

const clearManualLocation = () => {
  manualLocationInput.value = ''
  selectedCustomLocation.value = null
  locationSearchQuery.value = ''
  emit('update:modelValue', null)
  emit('locationSelected', null)
}

// === DATABASE FUNCTIONS ===

const loadStandardLocations = async () => {
  try {
    logger.debug('🔍 Loading standard locations...')
    
    // Build query parameters
    const queryParams: any = {}
    
    // If a student/client is selected, send the client ID
    // so staff can see their own locations + the client's pickup locations
    if (props.selectedStudentId) {
      queryParams.selected_client_id = props.selectedStudentId
      logger.debug('📍 Loading locations for client:', props.selectedStudentId)
    }
    
    // Use secure API to load standard locations (handles auth server-side)
    const response = await $fetch('/api/staff/get-locations', {
      query: queryParams
    }) as any
    
    if (response?.data) {
      const filteredLocations = response.data.map((item: any) => ({
        ...item,
        address: item.address || '',
        source: 'standard' as const
      }))
      
      standardLocations.value = filteredLocations
      logger.debug('✅ Standard locations loaded:', filteredLocations.length)
    }
    
  } catch (err: any) {
    console.error('❌ Error loading standard locations:', err)
    
    if (!handleOfflineError(err)) {
      error.value = `Fehler beim Laden der Standard-Standorte: ${err.message}`
    }
  }
}

const loadLastUsedLocation = async (userId: string, staffId: string): Promise<any> => {
  try {
    logger.debug('🔍 Loading last used location for student:', userId, 'staff:', staffId)
    
    if (!userId || !staffId || staffId === '') {
      logger.debug('⚠️ Missing or empty staffId, skipping last location load')
      return null
    }
    
    // Use secure API to load last used location (handles auth server-side)
    const response = await $fetch('/api/staff/get-last-used-location', {
      query: {
        user_id: userId,
        staff_id: staffId
      }
    }) as any
    
    if (response?.data) {
      logger.debug('✅ Last used location data:', response.data)
      return response.data
    }
    
    logger.debug('ℹ️ No completed appointments found')
    return null
    
  } catch (err: any) {
    logger.debug('❌ Error loading last location:', err)
    return null
  }
}

const loadStudentPickupLocations = async (studentId: string) => {
  if (!studentId) {
    studentPickupLocations.value = []
    return
  }

  try {
    logger.debug('🔍 Loading student pickup locations for:', studentId)
    
    // Use secure API to load pickup locations (handles auth server-side)
    const response = await $fetch('/api/staff/get-locations', {
      query: {
        location_type: 'pickup',
        user_id: studentId
      }
    }) as any
    
    if (response?.data) {
      studentPickupLocations.value = response.data.map((item: any) => ({
        ...item,
        address: item.address || '',
        source: 'pickup' as const
      }))
      logger.debug('✅ Student pickup locations loaded:', response.data.length)
    } else {
      studentPickupLocations.value = []
    }
    
    // 2. Lade letzten verwendeten Standort nur wenn staffId vorhanden UND keine Location bereits gesetzt ist
    if (props.currentStaffId && !props.modelValue && !props.disableAutoSelection) {
      const lastLocation = await loadLastUsedLocation(studentId, props.currentStaffId)
      
      if (lastLocation && !selectedLocationId.value) {
        // Suche die entsprechende Location in den geladenen Locations
        const matchingLocation = [...standardLocations.value, ...studentPickupLocations.value]
          .find(loc => loc.id === lastLocation.location_id)
        
        if (matchingLocation) {
          selectedLocationId.value = matchingLocation.id
          emit('update:modelValue', matchingLocation.id)
          emit('locationSelected', matchingLocation)
          logger.debug('🎯 Auto-selected last used location:', matchingLocation.name)
        }
      }
    }
    
    // ✅ NEU: Wenn eine Location bereits gesetzt ist (modelValue), zeige sie an
    if (props.modelValue && !selectedLocationId.value) {
      logger.debug('🎯 Location bereits gesetzt, zeige sie an:', props.modelValue)
      selectedLocationId.value = props.modelValue
      return
    }
    
    // 3. Fallback: Ersten verfügbaren Standort wählen (Pickup oder Standard)
    if (!selectedLocationId.value && !props.modelValue && !props.disableAutoSelection) {
      logger.debug('🔍 Auto-selection logic:', {
        selectedLocationId: selectedLocationId.value,
        modelValue: props.modelValue,
        disableAutoSelection: props.disableAutoSelection,
        pickupsAvailable: studentPickupLocations.value.length,
        standardsAvailable: standardLocations.value.length
      })
      
      if (studentPickupLocations.value.length > 0) {
        // Erste Pickup-Location wählen
        const firstPickup = studentPickupLocations.value[0]
        selectedLocationId.value = firstPickup.id
        useStandardLocations.value = false
        emit('update:modelValue', firstPickup.id)
        emit('locationSelected', firstPickup)
        logger.debug('📍 Auto-selected first pickup location:', firstPickup.name)
      } else if (standardLocations.value.length > 0) {
        // ✅ FALLBACK: Erste Standard-Location wählen wenn keine Pickup-Locations vorhanden
        const firstStandard = standardLocations.value[0]
        selectedLocationId.value = firstStandard.id
        useStandardLocations.value = true
        emit('update:modelValue', firstStandard.id)
        emit('locationSelected', firstStandard)
        logger.debug('📍 Auto-selected first standard location (no pickup locations):', firstStandard.name)
      } else {
        logger.debug('⚠️ No locations available for auto-selection')
      }
    }
    
  } catch (err: any) {
    console.error('❌ Error loading pickup locations:', err)
    
    if (!handleOfflineError(err)) {
      error.value = `Fehler beim Laden der Treffpunkte: ${err.message}`
    }
  }
}

const savePickupLocation = async (locationData: any, userId: string) => {
  try {
    logger.debug('📤 Calling secure API to save pickup location', {
      userId,
      locationName: locationData.name,
      address: locationData.address
    })
    
    // ✅ Validate userId before sending
    if (!userId || typeof userId !== 'string') {
      throw new Error(`Invalid userId: ${userId} (type: ${typeof userId})`)
    }
    
    if (!userId.match(/^[0-9a-f\-]{36}$/i)) {
      throw new Error(`userId does not match UUID format: ${userId}`)
    }
    
    // ✅ For students: "StudentName - LocationName", for staff: just "LocationName"
    const locationName = props.selectedStudentName 
      ? `${props.selectedStudentName} - ${locationData.name}`.trim()
      : locationData.name
    
    // ✅ Call secure API - Auth is handled via HTTP-Only cookies automatically
    const response = await $fetch('/api/locations/create-pickup', {
      method: 'POST',
      body: {
        name: locationName,
        address: locationData.address,
        latitude: locationData.latitude || null,
        longitude: locationData.longitude || null,
        place_id: locationData.place_id || null,
        userId: userId // Works for both students and staff
      }
    }).catch((err: any) => {
      // $fetch throws errors for non-2xx responses
      console.error('❌ API request failed:', {
        statusCode: err.statusCode,
        message: err.message,
        data: err.data
      })
      throw err
    })

    if (!response || response.error) {
      console.error('❌ API Error response:', response?.error)
      throw new Error(response?.error?.message || 'Failed to save location')
    }

    const savedLocation = {
      ...response,
      address: response.address || '',
      source: 'pickup' as const
    }
    
    studentPickupLocations.value.push(savedLocation)
    logger.debug('✅ Pickup location saved successfully via API:', savedLocation)
    return savedLocation

  } catch (err: any) {
    // Log detailed error information
    console.error('❌ Error saving pickup location:', {
      error: err,
      message: err?.message,
      statusCode: err?.statusCode,
      status: err?.status,
      data: err?.data,
      responseText: err?.responseText
    })
    
    // Try to extract better error message from response
    let errorMessage = err?.message || 'Failed to save location'
    
    // Check various error message locations
    if (err?.data?.message) {
      errorMessage = err.data.message
    } else if (err?.data?.statusMessage) {
      errorMessage = err.data.statusMessage
    } else if (typeof err?.data === 'string') {
      errorMessage = err.data
    } else if (err?.response?.status === 400) {
      errorMessage = 'Invalid location data. Please check the address and try again.'
    } else if (err?.response?.status === 403) {
      errorMessage = 'You do not have permission to save locations for this student.'
    }
    
    error.value = `Fehler beim Speichern des Treffpunkts: ${errorMessage}`
    throw err
  }
}

// === GOOGLE PLACES FUNCTIONS ===

const initializeGooglePlaces = async () => {
  if (typeof window !== 'undefined' && window.google && window.google.maps) {
    try {
      const { Place, AutocompleteSuggestion } = await window.google.maps.importLibrary('places')
      placesLibrary = { Place, AutocompleteSuggestion }
      logger.debug('✅ Google Places (New API) initialized')
    } catch (error) {
      console.warn('⚠️ New Places API failed, using legacy API:', error)
      // ✅ WICHTIG: placesLibrary auf null setzen damit Legacy API verwendet wird
      placesLibrary = null
      if (window.google.maps.places) {
        logger.debug('✅ Google Places (Legacy) initialized')
      }
    }
  }
}

// ✅ Fügen Sie diese Variable am Anfang der Datei hinzu (neben placesLibrary):
let newApiBlocked = false

const onLocationSearch = async () => {
  const query = manualLocationInput.value.trim()
  
  if (query.length < 3) {
    locationSuggestions.value = []
    showLocationSuggestions.value = false
    return
  }

  isLoadingGooglePlaces.value = true
  error.value = null
  
  try {
    // ✅ PRÜFE OB NEUE API BEREITS ALS BLOCKIERT MARKIERT IST
    if (placesLibrary && placesLibrary.AutocompleteSuggestion && !newApiBlocked) {
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
        // ✅ MARKIERE NEUE API ALS BLOCKIERT FÜR ZUKÜNFTIGE REQUESTS
        newApiBlocked = true
        logger.debug('🚫 New API marked as blocked, switching to legacy API permanently')
      }
    }

    // ✅ Legacy API (wird jetzt verwendet)
    if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places && window.google.maps.places.AutocompleteService) {
      logger.debug('🔄 Using Legacy Google Places API')
      
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
          logger.debug('✅ Legacy API suggestions loaded:', locationSuggestions.value.length)
        } else {
          locationSuggestions.value = []
          error.value = 'Keine Vorschläge von Google Places gefunden'
        }
      })
    } else {
      logger.debug('📴 Google Places not available - using manual input')
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
    // 🔥 FIX: Input-Feld sofort mit der vollständigen Adresse füllen
    manualLocationInput.value = suggestion.description
    
    const locationData = {
      name: suggestion.structured_formatting?.main_text || suggestion.description,
      address: suggestion.description,
      place_id: suggestion.place_id,
      latitude: null,
      longitude: null
    }
    
    // Check if this location already exists for this student
    const existingLocation = studentPickupLocations.value.find(
      loc => loc.google_place_id === suggestion.place_id
    )
    
    if (existingLocation) {
      // Use existing pickup location - Input-Feld mit bestehender Location aktualisieren
      selectedLocationId.value = existingLocation.id
      // ✅ Input-Feld mit der bestehenden Location aktualisieren
      manualLocationInput.value = existingLocation.address || existingLocation.name
      selectedCustomLocation.value = existingLocation
      
      emit('update:modelValue', existingLocation.id)
      emit('locationSelected', existingLocation)
      
      logger.debug('🔄 Using existing pickup location:', existingLocation.name)
    } else if (props.selectedStudentId) {
      // ✅ LOADING STATE WÄHREND SPEICHERN:
      isLoadingGooglePlaces.value = true
      
      // Save as new pickup location - ABER BEI ADRESSEINGABE BLEIBEN
      const savedLocation = await savePickupLocation(locationData, props.selectedStudentId)
      
      // ✅ WARTE EINEN MOMENT FÜR UI-UPDATE:
      await nextTick()
      selectedLocationId.value = savedLocation.id
      // ✅ Input-Feld mit der gespeicherten Location aktualisieren
      manualLocationInput.value = savedLocation.address || savedLocation.name
      selectedCustomLocation.value = savedLocation
      
      emit('update:modelValue', savedLocation.id)
      emit('locationSelected', savedLocation)
      
      // ✅ SUCCESS MESSAGE:
      logger.debug('✅ Neue Adresse gespeichert:', savedLocation.name)
      // ✅ LOADING STATE BEENDEN:
      isLoadingGooglePlaces.value = false
      logger.debug('💾 Saved and selected new pickup location:', savedLocation.name)
    } else if (props.currentStaffId) {
      // Kein Student, aber Staff vorhanden - speichere als pickup location für Staff
      try {
        isLoadingGooglePlaces.value = true
        
        const staffLocationName = locationData.name
        const savedLocation = await savePickupLocation(locationData, props.currentStaffId)
        
        await nextTick()
        selectedLocationId.value = savedLocation.id
        manualLocationInput.value = savedLocation.address || savedLocation.name
        selectedCustomLocation.value = savedLocation
        
        emit('update:modelValue', savedLocation.id)
        emit('locationSelected', savedLocation)
        
        logger.debug('✅ Staff pickup location saved:', savedLocation.name)
        isLoadingGooglePlaces.value = false
        
      } catch (err: any) {
        console.error('❌ Error saving staff location:', err)
        error.value = `Fehler beim Speichern des Standorts: ${err.message}`
        isLoadingGooglePlaces.value = false
        
        // Fallback: temporäre Location
        const tempLocation = {
          id: `temp_${Date.now()}`,
          name: locationData.name,
          address: locationData.address,
          place_id: locationData.place_id,
          latitude: locationData.latitude || null,
          longitude: locationData.longitude || null,
          location_type: 'pickup',
          source: 'google'
        }
        
        selectedLocationId.value = tempLocation.id
        manualLocationInput.value = tempLocation.address || tempLocation.name
        selectedCustomLocation.value = tempLocation
        
        emit('update:modelValue', null)
        emit('locationSelected', tempLocation)
        
        logger.debug('⚠️ Fallback to temporary location:', tempLocation)
      }
    } else {
      // Kein Student UND kein Staff - zeige nur temporäre Location an
      try {
        isLoadingGooglePlaces.value = true
        
        // ✅ Nur temporäre Location anzeigen, NICHT speichern (kein Student = keine pickup location möglich)
        const tempLocation = {
          id: `temp_${Date.now()}`,
          name: locationData.name,
          address: locationData.address,
          place_id: locationData.place_id,
          latitude: locationData.latitude || null,
          longitude: locationData.longitude || null,
          location_type: 'pickup',
          source: 'google'
        }
        
        selectedLocationId.value = tempLocation.id
        manualLocationInput.value = tempLocation.address || tempLocation.name
        selectedCustomLocation.value = tempLocation
        
        emit('update:modelValue', null)
        emit('locationSelected', tempLocation)
        
        logger.debug('⚠️ Using temporary location (no student selected):', tempLocation)
        isLoadingGooglePlaces.value = false
        
      } catch (err: any) {
        console.error('❌ Error in temporary location:', err)
        error.value = `Fehler bei der Adresse: ${err.message}`
        isLoadingGooglePlaces.value = false
      }
    }
    
    showLocationSuggestions.value = false
    
  } catch (err: any) {
    error.value = `Fehler beim Speichern des Treffpunkts: ${err.message}`
    isLoadingGooglePlaces.value = false
    console.error('❌ Error selecting location:', err)
  }
}

const hideLocationSuggestionsDelayed = () => {
  // Verzögerung damit mousedown auf Suggestion vor blur ausgeführt wird
  setTimeout(() => {
    showLocationSuggestions.value = false
  }, 200)
}

// === EVENT HANDLERS ===

const onLocationChange = () => {
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (props.isPastAppointment) {
    logger.debug('🚫 Cannot change location for past appointment')
    return
  }
  
  const location = [...standardLocations.value, ...studentPickupLocations.value]
    .find(l => l.id === selectedLocationId.value)
    
  if (location) {
    emit('update:modelValue', location.id)
    emit('locationSelected', location)
    logger.debug('📍 Location selected:', location.name)
  }
}

const clearCustomLocation = () => {
  selectedCustomLocation.value = null
  manualLocationInput.value = ''
  emit('update:modelValue', null)
  emit('locationSelected', null)
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

// ✅ Load staff pickup locations when currentStaffId changes (for other event types)
watch(() => props.currentStaffId, async (newStaffId, oldStaffId) => {
  // Only load if no student is selected (other event types)
  if (newStaffId && newStaffId !== oldStaffId && !props.selectedStudentId) {
    isLoadingLocations.value = true
    
    // Reset current selection when staff changes
    selectedLocationId.value = ''
    selectedCustomLocation.value = null
    emit('update:modelValue', null)
    
    // Load staff's own pickup locations
    await loadStudentPickupLocations(newStaffId)
    isLoadingLocations.value = false
    
    logger.debug('✅ Staff pickup locations loaded:', studentPickupLocations.value.length)
  }
}, { immediate: false })

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

watch(() => props.modelValue, (newValue) => {
  logger.debug('🔍 LocationSelector: modelValue changed:', newValue)
  if (newValue && newValue !== selectedLocationId.value) {
    selectedLocationId.value = newValue
    useStandardLocations.value = true
    selectedCustomLocation.value = null
    logger.debug('✅ LocationSelector: Location updated from modelValue:', newValue)
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
    // ✅ IMMER Standard-Locations laden (für alle Benutzer)
    await loadStandardLocations()
    logger.debug('📍 Standard locations loaded on mount:', standardLocations.value.length)
    
    // ✅ Zusätzlich Pickup-Locations laden wenn Student ausgewählt
    if (props.selectedStudentId) {
      await loadStudentPickupLocations(props.selectedStudentId)
      logger.debug('📍 Pickup locations loaded on mount:', studentPickupLocations.value.length)
    } else {
      logger.debug('ℹ️ No student selected - only standard locations available')
    }
    
    // ✅ NEU: Wenn bereits eine Location gesetzt ist, zeige sie an
    if (props.modelValue && !selectedLocationId.value) {
      logger.debug('🎯 onMounted: Location bereits gesetzt, zeige sie an:', props.modelValue)
      selectedLocationId.value = props.modelValue
    }
    
    // ✅ AUTO-SELECT DEFAULT LOCATION:
    // 1. Wenn kein Student ausgewählt -> erste Standard-Location
    // 2. Wenn Student ausgewählt ABER keine Pickups -> erste Standard-Location
    if (!selectedLocationId.value && !props.modelValue && !props.disableAutoSelection && standardLocations.value.length > 0) {
      const hasPickups = studentPickupLocations.value.length > 0
      
      if (!props.selectedStudentId || (props.selectedStudentId && !hasPickups)) {
        const firstStandard = standardLocations.value[0]
        selectedLocationId.value = firstStandard.id
        useStandardLocations.value = true
        emit('update:modelValue', firstStandard.id)
        emit('locationSelected', firstStandard)
        logger.debug('📍 Auto-selected first standard location:', {
          reason: !props.selectedStudentId ? 'no student' : 'student has no pickups',
          location: firstStandard.name
        })
      }
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

input::placeholder {
  color: #9ca3af;
}
</style>