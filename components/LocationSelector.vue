<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      📍 Standort
    </label>
    
    <!-- Toggle zwischen Standard, Zuhause und Custom (nur für zukünftige Termine) -->
    <div v-if="!props.isPastAppointment" class="flex gap-1.5 mb-3">
      <button
        type="button"
        @click="switchToStandardLocations"
        :class="['flex-1 min-w-0 px-2 py-1.5 text-sm rounded-xl border font-medium transition-colors text-center', useStandardLocations && !homeAddressActive ? 'border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50']"
        :style="useStandardLocations && !homeAddressActive ? primaryBg : {}"
      >
        Standard
      </button>
      <button
        type="button"
        @click="applyHomeAddress"
        :disabled="!canUseHomeAddress || isApplyingHomeAddress"
        :title="homeAddressButtonTitle"
        :class="[
          'flex-1 min-w-0 px-2 py-1.5 text-sm rounded-xl border font-medium transition-colors text-center',
          homeAddressActive ? 'border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
          (!canUseHomeAddress || isApplyingHomeAddress) ? 'opacity-50 cursor-not-allowed' : ''
        ]"
        :style="homeAddressActive ? primaryBg : {}"
      >
        {{ isApplyingHomeAddress ? '…' : 'Zuhause' }}
      </button>
      <button
        type="button"
        @click="() => {
          useStandardLocations = false
          homeAddressActive = false
          selectedLocationId = ''
          clearManualLocation()
          emit('update:modelValue', null)
          emit('locationSelected', null)
        }"
        :class="['flex-1 min-w-0 px-2 py-1.5 text-sm rounded-xl border font-medium transition-colors text-center', !useStandardLocations && !homeAddressActive ? 'border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50']"
        :style="!useStandardLocations && !homeAddressActive ? primaryBg : {}"
      >
        Neue
      </button>
    </div>

    <!-- Offline Manual Input -->
    <div v-if="!useStandardLocations" class="space-y-3">
      <!-- Offline-Indikator nur wenn tatsächlich offline -->
      <div v-if="error && error.includes('Offline')" class="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded">
        <span>📴</span>
        <span>{{ error }}</span>
      </div>
      
      <!-- Read-only display (view/past mode) -->
      <div v-if="props.isPastAppointment && selectedCustomLocation" class="p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <div class="font-medium text-gray-900">{{ selectedCustomLocation.name }}</div>
        <div v-if="selectedCustomLocation.address !== selectedCustomLocation.name" class="text-sm text-gray-500">{{ selectedCustomLocation.address }}</div>
      </div>

      <!-- Editable input (create/edit mode) -->
      <div v-if="!props.isPastAppointment">
        <input
          v-model="manualLocationInput"
          @input="onLocationSearch"
          @blur="hideLocationSuggestionsDelayed"
          @focus="showLocationSuggestions = true"
          type="text"
          placeholder="z.B. Zürich HB, Weiher, Bahnhofstrasse 1, 8001 Zürich"
          class="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400 text-black bg-white"
        />
        <div v-if="manualLocationInput && !showLocationSuggestions && !selectedCustomLocation" class="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
          ✅ Adresse wird gespeichert: <strong>{{ manualLocationInput }}</strong>
        </div>
      </div>

      <!-- Google Places Suggestions (online) -->
      <div v-if="!props.isPastAppointment && showLocationSuggestions && locationSuggestions.length > 0" class="relative">
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

      <!-- ✅ Fallback: bereits gespeicherte Location, die nicht Teil der Standard-/Pickup-Listen ist -->
      <optgroup label="Gespeicherter Standort" v-if="directLookupLocations.length > 0" class="text-black bg-white">
        <option v-for="location in directLookupLocations" :key="`direct-${location.id}`" :value="location.id" class="text-black bg-white">
          {{ location.address }}
        </option>
      </optgroup>

      <!-- Loading State -->
      <option v-if="isLoadingLocations" disabled class="text-black bg-white">Lade Standorte...</option>
    </select>

    <!-- Selected Custom Location Preview (nur wenn nicht im read-only mode, da read-only direkt oben angezeigt wird) -->
    <div v-if="!useStandardLocations && selectedCustomLocation && !props.isPastAppointment" class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div class="flex items-start gap-3">
        <span class="text-green-600 text-lg mt-0.5">✅</span>
        <div class="flex-1">
          <div class="font-medium text-green-800">{{ selectedCustomLocation.name }}</div>
          <div v-if="selectedCustomLocation.address !== selectedCustomLocation.name" class="text-sm text-green-600">{{ selectedCustomLocation.address }}</div>
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
const { primaryBg } = usePrimaryColor()

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
  },
  customLocationAddress: {  // ✅ NEW: Custom address for manual locations
    type: String,
    default: null
  },
  homeStreet: {
    type: String,
    default: null
  },
  homeStreetNr: {
    type: String,
    default: null
  },
  homeZip: {
    type: String,
    default: null
  },
  homeCity: {
    type: String,
    default: null
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'locationSelected', 'manual-input-changed'])

// Supabase

// Reactive state
const useStandardLocations = ref(true)
const homeAddressActive = ref(false)
const isApplyingHomeAddress = ref(false)
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
// ✅ Fallback: previously saved location (standard OR pickup) that isn't part of
// the current role-based lists above, e.g. an appointment's location loaded in
// edit mode before the matching pickup/standard list has finished loading.
const directLookupLocations = ref<Location[]>([])

// Computed
const allKnownLocations = computed(() => [
  ...standardLocations.value,
  ...studentPickupLocations.value,
  ...directLookupLocations.value
])

const currentSelectedLocation = computed(() => {
  if (!selectedLocationId.value) return null

  return allKnownLocations.value.find(loc => loc.id === selectedLocationId.value)
})

const homeAddressFormatted = computed(() => {
  const street = [props.homeStreet, props.homeStreetNr].filter(Boolean).join(' ').trim()
  const cityLine = [props.homeZip, props.homeCity].filter(Boolean).join(' ').trim()
  if (!street && !cityLine) return ''
  return [street, cityLine].filter(Boolean).join(', ')
})

const canUseHomeAddress = computed(() => {
  // Allow click whenever a student is selected — address is refreshed from DB on click
  return !!props.selectedStudentId && !props.isPastAppointment
})

const homeAddressButtonTitle = computed(() => {
  if (!props.selectedStudentId) return 'Zuerst einen Kunden auswählen'
  if (homeAddressFormatted.value) return homeAddressFormatted.value
  return 'Heimadresse aus Kundenprofil laden'
})

const mapLocationItem = (item: any, source: 'standard' | 'pickup'): Location => ({
  ...item,
  address: item.address || item.formatted_address || '',
  location_type: item.location_type || source,
  source
})

const splitLocationsResponse = (data: any[]) => {
  const standards = data
    .filter((item: any) => item.location_type !== 'pickup')
    .map((item: any) => mapLocationItem(item, 'standard'))
  const pickups = data
    .filter((item: any) => item.location_type === 'pickup')
    .map((item: any) => mapLocationItem(item, 'pickup'))
  return { standards, pickups }
}

// ✅ Ensures a previously selected location (props.modelValue) is always shown
// correctly, even if it isn't present in standardLocations/studentPickupLocations
// (e.g. due to load timing, or because it belongs to a different owner than the
// currently loaded lists cover). Fetches the location directly by ID as a fallback.
const ensureSelectedLocationLoaded = async (locationId: string | null) => {
  if (!locationId || locationId.includes('temp_') || locationId.includes('manual_')) {
    return
  }

  const alreadyKnown = allKnownLocations.value.some(loc => loc.id === locationId)
  if (alreadyKnown) return

  try {
    const response = await $fetch('/api/staff/get-locations', {
      query: { location_ids: locationId }
    }) as any

    if (response?.data?.length) {
      directLookupLocations.value = [
        ...directLookupLocations.value.filter((loc: Location) => loc.id !== locationId),
        ...response.data.map((item: any) => ({ ...item, address: item.address || '', source: 'standard' as const }))
      ]
      logger.debug('✅ Fallback: directly loaded previously saved location:', locationId)
    } else {
      logger.debug('⚠️ Fallback: could not resolve previously saved location by id:', locationId)
    }
  } catch (err: any) {
    logger.debug('⚠️ Error in fallback location lookup:', err.message)
  }
}

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
  homeAddressActive.value = false
  emit('update:modelValue', null)
  emit('locationSelected', null)
  emit('manual-input-changed', '')
}

const switchToStandardLocations = () => {
  useStandardLocations.value = true
  homeAddressActive.value = false
  // Keep an already selected standard/pickup; only clear free-text manual state
  if (!selectedLocationId.value || selectedLocationId.value.includes('temp_') || selectedLocationId.value.includes('manual_')) {
    manualLocationInput.value = ''
    selectedCustomLocation.value = null
    locationSearchQuery.value = ''
  } else {
    manualLocationInput.value = ''
    selectedCustomLocation.value = null
  }
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
      const { standards, pickups } = splitLocationsResponse(response.data)
      standardLocations.value = standards
      // When client is selected, API returns pickups in the same payload —
      // keep Treffpunkte in sync so we don't rely on the separate (previously broken) query.
      if (props.selectedStudentId) {
        studentPickupLocations.value = pickups
      }
      logger.debug('✅ Locations loaded:', {
        standards: standards.length,
        pickups: props.selectedStudentId ? pickups.length : 'n/a'
      })
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
    
    // Must use selected_client_id — get-locations ignores user_id / location_type for staff
    const response = await $fetch('/api/staff/get-locations', {
      query: {
        selected_client_id: studentId
      }
    }) as any
    
    if (response?.data) {
      const { standards, pickups } = splitLocationsResponse(response.data)
      // Keep standards in sync when reloading for a student switch
      if (standards.length > 0) {
        standardLocations.value = standards
      }
      studentPickupLocations.value = pickups
      logger.debug('✅ Student pickup locations loaded:', pickups.length)
    } else {
      studentPickupLocations.value = []
    }
    
    // 2. Lade letzten verwendeten Standort nur wenn staffId vorhanden UND keine Location bereits gesetzt ist
    let lastLocationWasFound = false
    if (props.currentStaffId && !props.modelValue && !props.disableAutoSelection) {
      const lastLocation = await loadLastUsedLocation(studentId, props.currentStaffId)
      
      if (lastLocation?.location_id && !selectedLocationId.value) {
        // Suche die entsprechende Location in den geladenen Locations
        const matchingLocation = [...standardLocations.value, ...studentPickupLocations.value]
          .find(loc => loc.id === lastLocation.location_id)
        
        if (matchingLocation) {
          selectedLocationId.value = matchingLocation.id
          useStandardLocations.value = true
          homeAddressActive.value = matchingLocation.location_type === 'pickup' &&
            /zuhause/i.test(matchingLocation.name || '')
          lastLocationWasFound = true
          emit('update:modelValue', matchingLocation.id)
          emit('locationSelected', matchingLocation)
          logger.debug('🎯 Auto-selected last used location:', matchingLocation.name)
        } else {
          logger.debug('⚠️ Last location found in DB but not in current lists:', lastLocation.location_id)
        }
      }
    }
    
    // ✅ NEU: Wenn eine Location bereits gesetzt ist (modelValue), zeige sie an
    if (props.modelValue && !selectedLocationId.value) {
      logger.debug('🎯 Location bereits gesetzt, zeige sie an:', props.modelValue)
      selectedLocationId.value = props.modelValue
      return
    }
    
    // 3. Fallback priority: client pickup → first standard
    if (!selectedLocationId.value && !props.modelValue && !props.disableAutoSelection) {
      logger.debug('🔍 Auto-selection decision:', {
        selectedLocationId: selectedLocationId.value,
        modelValue: props.modelValue,
        disableAutoSelection: props.disableAutoSelection,
        lastLocationWasFound: lastLocationWasFound,
        pickupsAvailable: studentPickupLocations.value.length,
        standardsAvailable: standardLocations.value.length
      })
      
      if (!lastLocationWasFound && studentPickupLocations.value.length > 0) {
        const firstPickup = studentPickupLocations.value[0]
        selectedLocationId.value = firstPickup.id
        useStandardLocations.value = true
        homeAddressActive.value = /zuhause/i.test(firstPickup.name || '')
        emit('update:modelValue', firstPickup.id)
        emit('locationSelected', firstPickup)
        logger.debug('📍 Auto-selected first client pickup:', firstPickup.name)
      } else if (!lastLocationWasFound && standardLocations.value.length > 0) {
        const firstStandard = standardLocations.value[0]
        selectedLocationId.value = firstStandard.id
        useStandardLocations.value = true
        homeAddressActive.value = false
        emit('update:modelValue', firstStandard.id)
        emit('locationSelected', firstStandard)
        logger.debug('📍 Auto-selected first standard location (no last location found):', firstStandard.name)
      } else if (!lastLocationWasFound) {
        logger.debug('⚠️ CREATE MODE: No last location and no standard locations available - user must choose manually')
      }
    }
    
  } catch (err: any) {
    console.error('❌ Error loading pickup locations:', err)
    
    if (!handleOfflineError(err)) {
      error.value = `Fehler beim Laden der Treffpunkte: ${err.message}`
    }
  }
}

const applyHomeAddress = async () => {
  if (props.isPastAppointment) return

  if (!props.selectedStudentId) {
    error.value = 'Bitte zuerst einen Kunden auswählen'
    return
  }

  try {
    isApplyingHomeAddress.value = true
    error.value = null

    // Always load current profile address from DB (props may be stale after an edit)
    let address = homeAddressFormatted.value
    let postalCode = props.homeZip || null
    let city = props.homeCity || null

    try {
      const profileRes = await $fetch('/api/admin/get-user-for-edit', {
        query: { user_id: props.selectedStudentId }
      }) as { user?: any }
      const u = profileRes?.user
      if (u) {
        const street = [u.street, u.street_nr].filter(Boolean).join(' ').trim()
        const cityLine = [u.zip, u.city].filter(Boolean).join(' ').trim()
        const fresh = [street, cityLine].filter(Boolean).join(', ')
        if (fresh) {
          address = fresh
          postalCode = u.zip || null
          city = u.city || null
        }
      }
    } catch (profileErr: any) {
      logger.debug('⚠️ Could not refresh home address from profile, using props:', profileErr?.message)
    }

    if (!address) {
      error.value = 'Keine Heimadresse beim Kunden hinterlegt'
      return
    }

    const locationName = props.selectedStudentName
      ? `${props.selectedStudentName} - Zuhause`.trim()
      : 'Zuhause'

    // Sync pickup to current profile address (updates stale "Zuhause" pickups)
    const savedLocation = await $fetch('/api/locations/upsert-home-pickup', {
      method: 'POST',
      body: {
        userId: props.selectedStudentId,
        name: locationName,
        address,
        postal_code: postalCode,
        city
      }
    }) as any

    const mapped = mapLocationItem(savedLocation, 'pickup')
    studentPickupLocations.value = [
      mapped,
      ...studentPickupLocations.value.filter((loc) => loc.id !== mapped.id)
    ]

    useStandardLocations.value = true
    homeAddressActive.value = true
    selectedCustomLocation.value = null
    manualLocationInput.value = ''
    selectedLocationId.value = mapped.id
    emit('update:modelValue', mapped.id)
    emit('locationSelected', mapped)
    logger.debug('🏠 Applied current home address:', mapped.address)
  } catch (err: any) {
    console.error('❌ Error applying home address:', err)
    error.value = `Zuhause konnte nicht geladen werden: ${err.message || err?.data?.message || 'Unbekannter Fehler'}`
  } finally {
    isApplyingHomeAddress.value = false
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
        postal_code: locationData.postal_code || null,
        city: locationData.city || null,
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
    // ✅ NEW: Clear error wenn User anfängt zu tippen
    error.value = null
    // ✅ NEW: Emit dass User tippt (aber noch < 3 Zeichen)
    if (query.length > 0) {
      emit('manual-input-changed', query)
    }
    return
  }

  // ✅ NEW: Emit dass User tippt (genug Zeichen)
  emit('manual-input-changed', query)

  isLoadingGooglePlaces.value = true
  
  try {
    // Lazy-initialize Places if Maps has loaded since mount (handles loading=async race condition)
    if (typeof window !== 'undefined' && window.google && window.google.maps && !placesLibrary) {
      await initializeGooglePlaces()
    }

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
          // ✅ NEW: Fallback to manual entry on Google API error
          useStandardLocations.value = false
          error.value = '⚠️ Google-Adresssuche nicht verfügbar. Bitte Adresse manuell eingeben.'
          logger.debug('🔄 Fallback to manual entry - Google API not responding')
        }
      })
    } else {
      logger.debug('📴 Google Places not available - switching to manual entry')
      isLoadingGooglePlaces.value = false
      useStandardLocations.value = false
      error.value = '⚠️ Google-Adresssuche nicht verfügbar. Bitte Adresse manuell eingeben.'
    }
  } catch (err: any) {
    console.error('Error searching places:', err)
    // ✅ NEW: Fallback to manual entry on error
    useStandardLocations.value = false
    error.value = '⚠️ Google-Adresssuche fehlgeschlagen. Bitte Adresse manuell eingeben.'
    isLoadingGooglePlaces.value = false
    locationSuggestions.value = []
    logger.debug('🔄 Fallback to manual entry - search error')
  }
}

const selectLocationSuggestion = async (suggestion: GooglePlaceSuggestion) => {
  try {
    // 🔥 FIX: Input-Feld sofort mit der vollständigen Adresse füllen
    manualLocationInput.value = suggestion.description
    
    // ✅ NEW: Fetch full place details including postal code
    isLoadingGooglePlaces.value = true
    
    let placeDetails: any = {
      latitude: null,
      longitude: null,
      postal_code: null,
      city: null,
      formatted_address: suggestion.description
    }
    
    try {
      const response = await $fetch('/api/locations/get-place-details', {
        method: 'POST',
        body: {
          place_id: suggestion.place_id
        }
      })
      
      if (response.success) {
        placeDetails = {
          latitude: response.latitude,
          longitude: response.longitude,
          postal_code: response.postal_code,
          city: response.city,
          formatted_address: response.formatted_address || suggestion.description
        }
        logger.debug('✅ Fetched place details:', placeDetails)
      } else {
        logger.warn('⚠️ Could not fetch place details:', response.error)
        // ✅ NEW: Fallback to manual entry on error
        useStandardLocations.value = false
        error.value = '⚠️ Google-Adressdetails nicht verfügbar. Speichern mit manueller Adresse möglich.'
        logger.debug('🔄 Fallback to manual entry')
      }
    } catch (err: any) {
      logger.warn('⚠️ Error fetching place details:', err.message)
      // ✅ NEW: Fallback to manual entry on error
      useStandardLocations.value = false
      error.value = '⚠️ Google-Adressdetails nicht verfügbar. Speichern mit manueller Adresse möglich.'
      logger.debug('🔄 Fallback to manual entry')
      isLoadingGooglePlaces.value = false
      showLocationSuggestions.value = false
      return
    }
    
    const locationData = {
      name: suggestion.structured_formatting?.main_text || suggestion.description,
      address: placeDetails.formatted_address?.replace(', Switzerland', '') || suggestion.description,
      place_id: suggestion.place_id,
      latitude: placeDetails.latitude,
      longitude: placeDetails.longitude,
      postal_code: placeDetails.postal_code,
      city: placeDetails.city
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
      isLoadingGooglePlaces.value = false
    } else if (props.selectedStudentId) {
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
  homeAddressActive.value = false
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
    homeAddressActive.value = false
    emit('update:modelValue', null)
    
    await loadStudentPickupLocations(newStudentId)
    isLoadingLocations.value = false
  } else if (!newStudentId) {
    studentPickupLocations.value = []
    selectedLocationId.value = ''
    selectedCustomLocation.value = null
    homeAddressActive.value = false
    emit('update:modelValue', null)
    // Reload staff-only standards without client pickups
    await loadStandardLocations()
  }
})

watch(() => props.modelValue, (newValue) => {
  logger.debug('🔍 LocationSelector: modelValue changed:', newValue)
  if (newValue && newValue !== selectedLocationId.value) {
    selectedLocationId.value = newValue
    
    // ✅ Prüfe ob diese Location eine Custom/Manual Location ist
    const isCustomLocation = newValue && (
      newValue.includes('temp_') || 
      newValue.includes('manual_') ||
      selectedCustomLocation.value?.id === newValue
    )
    
    if (isCustomLocation) {
      useStandardLocations.value = false
      logger.debug('🔍 LocationSelector: Custom location detected, showing custom tab')
    } else {
      useStandardLocations.value = true
      selectedCustomLocation.value = null
      logger.debug('🔍 LocationSelector: Standard location, showing standard tab')
      ensureSelectedLocationLoaded(newValue)
    }
    
    logger.debug('✅ LocationSelector: Location updated from modelValue:', newValue)
  }
}, { immediate: true })

// ✅ NEW: Watch for customLocationAddress prop changes
watch(() => props.customLocationAddress, (newAddress) => {
  logger.debug('🔍 LocationSelector: customLocationAddress changed:', newAddress)
  if (newAddress && newAddress.trim().length > 0) {
    // Switch to manual tab and populate the field
    useStandardLocations.value = false
    manualLocationInput.value = newAddress
    
    // Create a temporary location object for display
    selectedCustomLocation.value = {
      id: `manual_${Date.now()}`,
      name: newAddress.split(',')[0].trim() || newAddress,
      address: newAddress,
      place_id: `manual_${Date.now()}`,
      latitude: null,
      longitude: null,
      location_type: 'pickup',
      source: 'manual'
    }
    
    emit('manual-input-changed', newAddress)
    logger.debug('✅ LocationSelector: Loaded custom location from prop:', newAddress)
  }
}, { immediate: true })

// === LIFECYCLE ===

onMounted(async () => {
  // Initialize Google Maps (if already loaded)
  if (typeof window !== 'undefined' && window.google && window.google.maps) {
    await initializeGooglePlaces()
  } else if (typeof window !== 'undefined') {
    // Maps script loads asynchronously — initialize Places once it's ready
    const onMapsLoaded = async () => {
      await initializeGooglePlaces()
      window.removeEventListener('google-maps-loaded', onMapsLoaded)
    }
    window.addEventListener('google-maps-loaded', onMapsLoaded)
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

    // ✅ Defensive fallback: falls die gesetzte Location (noch) nicht in den
    // geladenen Listen ist (z.B. Timing, andere Ownership als aktuell geladen),
    // direkt per ID nachladen, damit sie im Dropdown korrekt angezeigt wird.
    if (selectedLocationId.value) {
      await ensureSelectedLocationLoaded(selectedLocationId.value)
    }
    
    // ✅ AUTO-SELECT DEFAULT LOCATION:
    // Prefer client pickups when available, otherwise first standard
    if (!selectedLocationId.value && !props.modelValue && !props.disableAutoSelection) {
      if (props.selectedStudentId && studentPickupLocations.value.length > 0) {
        const firstPickup = studentPickupLocations.value[0]
        selectedLocationId.value = firstPickup.id
        useStandardLocations.value = true
        homeAddressActive.value = /zuhause/i.test(firstPickup.name || '')
        emit('update:modelValue', firstPickup.id)
        emit('locationSelected', firstPickup)
        logger.debug('📍 Auto-selected first client pickup on mount:', firstPickup.name)
      } else if (standardLocations.value.length > 0) {
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