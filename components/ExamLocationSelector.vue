<template><div class="space-y-3"><div class="flex items-center justify-between"><label class="block text-sm font-medium text-gray-700">🏛️ Prüfungsstandort</label><span v-if="activeExamLocations.length === 0 && !isOfflineMode" class="text-xs text-red-600">Keine aktiven Standorte</span><span v-if="isOfflineMode" class="text-xs text-orange-600">Offline-Modus aktiv</span></div><div v-if="isLoading" class="flex items-center justify-center py-4">
  <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
  <span class="ml-2 text-sm text-gray-600">Lade Standorte...</span>
</div>

<div v-else-if="isOfflineMode" class="space-y-2">
  <div class="border border-orange-300 rounded-lg p-3 bg-orange-50">
    <p class="text-sm text-orange-800 font-medium mb-2">
      ⚠️ Verbindungsproblem: Manuelle Eingabe
    </p>
    <input
      type="text"
      v-model="manualLocationInput"
      @input="handleManualInput"
      placeholder="Prüfungsort manuell eingeben (z.B. 'Zürich')"
      class="w-full px-3 py-2 border border-orange-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm"
    />
    <p class="text-xs text-orange-600 mt-2">
      Der eingegebene Ort wird lokal gespeichert und später synchronisiert.
    </p>
  </div>
  <div v-if="selectedLocation && selectedLocation.isManual" class="bg-green-50 border border-green-200 rounded-lg p-3">
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <h4 class="font-medium text-green-800 text-sm">{{ selectedLocation.name }} (Manuell)</h4>
        <p class="text-xs text-green-600 mt-1">
          Dieser Standort wird synchronisiert, sobald die Verbindung wiederhergestellt ist.
        </p>
      </div>
      <button
        @click="clearSelection"
        class="text-green-600 hover:text-green-800 ml-2 flex-shrink-0"
        title="Auswahl aufheben"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
</div>

<div v-else-if="activeExamLocations.length === 0" class="border-2 border-dashed border-red-200 rounded-lg p-4 text-center">
  <div class="text-red-400 text-2xl mb-2">🏛️</div>
  <p class="text-sm text-red-600 font-medium">Keine Prüfungsstandorte aktiviert</p>
  <p class="text-xs text-red-500 mt-1">
    Aktivieren Sie Standorte in den Personaleinstellungen
  </p>
</div>

<div v-else class="space-y-2">
  <div v-if="selectedLocation && !selectedLocation.isManual" class="bg-green-50 border border-green-200 rounded-lg p-3">
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <h4 class="font-medium text-green-800 text-sm">{{ selectedLocation.name }}</h4>
        <p class="text-xs text-green-600 mt-1">
          📍 {{ selectedLocation.address }}
          <span v-if="selectedLocation.postal_code || selectedLocation.city">
            <br>{{ selectedLocation.postal_code }} {{ selectedLocation.city }}
            <span v-if="selectedLocation.canton">({{ selectedLocation.canton }})</span>
          </span>
        </p>
      </div>
      <button
        @click="clearSelection"
        class="text-green-600 hover:text-green-800 ml-2 flex-shrink-0"
        title="Auswahl aufheben"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>

  <div v-else class="space-y-2">
    <div class="text-xs text-gray-500 mb-2">
      {{ activeExamLocations.length }} aktive{{ activeExamLocations.length === 1 ? 'r' : '' }} Standort{{ activeExamLocations.length === 1 ? '' : 'e' }}:
    </div>
    
    <div class="space-y-2 max-h-48 overflow-y-auto">
      <button
        v-for="location in activeExamLocations"
        :key="location.id"
        @click="selectLocation(location)"
        class="w-full text-left border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div class="space-y-1">
          <h4 class="font-medium text-gray-900 text-sm">{{ location.name }}</h4>
          
          <p class="text-xs text-gray-600">
            📍 {{ location.address }}
            <span v-if="location.postal_code || location.city">
              • {{ location.postal_code }} {{ location.city }}
              <span v-if="location.canton">({{ location.canton }})</span>
            </span>
          </p>
          
          <div v-if="location.available_categories && location.available_categories.length > 0" class="flex flex-wrap gap-1 mt-2">
            <span
              v-for="category in location.available_categories"
              :key="category"
              class="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded"
            >
              {{ category }}
            </span>
          </div>
        </div>
      </button>
    </div>
  </div>
</div>

<div v-if="error" class="border border-red-200 rounded-lg p-3 bg-red-50">
  <p class="text-sm text-red-600">
    ❌ {{ error }}
  </p>
</div>
</div></template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface Props {
  currentStaffId: string
  modelValue?: any // Selected location
  disabled?: boolean
}

interface ExamLocation {
  id: string
  name: string
  address?: string // Make optional for manual input
  city?: string
  canton?: string
  postal_code?: string
  available_categories?: string[]
  isManual?: boolean // To identify manually entered locations
}

interface StaffExamLocation {
  id: string
  staff_id: string
  name: string
  address: string
  categories?: string[]
  is_active: boolean
}

// Define keys for local storage
const LOCAL_STORAGE_OFFLINE_LOCATION_KEY = 'offlineExamLocation'
const LOCAL_STORAGE_SELECTED_LOCATION_KEY = 'selectedExamLocation'

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [location: ExamLocation | null]
}>()

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const availableExamLocations = ref<ExamLocation[]>([])
const staffExamLocations = ref<StaffExamLocation[]>([])
const selectedLocation = ref<ExamLocation | null>(null)
const isOfflineMode = ref(false) // New: Flag for offline mode
const manualLocationInput = ref('') // New: Holds manual input value

// Computed property wie in StaffSettings
const activeExamLocations = computed(() => {
  return availableExamLocations.value.filter(examLoc => {
    return staffExamLocations.value.some(staffLoc => 
      staffLoc.name === examLoc.name && staffLoc.is_active
    )
  })
})


// Methods
const loadExamLocations = async () => {
  console.log('🔍 Debug currentStaffId:', props.currentStaffId)
  if (!props.currentStaffId) {
    console.log('❌ No currentStaffId provided, skipping load')
    return
  }

  isLoading.value = true
  error.value = null
  isOfflineMode.value = false

  try {
    const supabase = getSupabase()
    
    // 1. Alle verfügbaren globalen Prüfungsstandorte laden (tenant_id ist null)
    const { data: allLocations, error: locationsError } = await supabase
      .from('locations')
      .select('*')
      .eq('location_type', 'exam')
      .is('tenant_id', null)
      .eq('is_active', true)
      .order('name')

    if (locationsError) throw locationsError
    availableExamLocations.value = allLocations || []
    
    // 2. Staff-spezifische Exam-Preferences laden (wo currentStaffId in staff_ids array ist)
    const { data: allExamLocations, error: allExamError } = await supabase
      .from('locations')
      .select('*')
      .eq('location_type', 'exam')
      .eq('is_active', true)
      .order('name')

    if (allExamError) throw allExamError
    
    // Filter: nur die, wo currentStaffId in staff_ids ist
    staffExamLocations.value = (allExamLocations || []).filter((loc: any) => {
      const staffIds = loc.staff_ids || []
      return Array.isArray(staffIds) && staffIds.includes(props.currentStaffId)
    })

    console.log('✅ Exam locations loaded for selector:', {
      available: availableExamLocations.value.length,
      staffPreferences: staffExamLocations.value.length,
      filtered: activeExamLocations.value.length
    })

  } catch (err: any) {
    console.error('❌ Error loading exam locations:', err)
    error.value = `Fehler beim Laden: ${err.message}`
    isOfflineMode.value = true
  } finally {
    isLoading.value = false
  }
}

const isExamLocationActive = (location: any): boolean => {
  return staffExamLocations.value.some(staffLoc => 
    staffLoc.name === location.name && staffLoc.is_active
  )
}


// New: Handle manual input
const handleManualInput = () => {
    if (manualLocationInput.value.trim() !== '') {
        const manualLoc: ExamLocation = {
            id: 'manual-' + Date.now(), // Unique ID for manual entry
            name: manualLocationInput.value.trim(),
            isManual: true,
            address: 'Manuell eingegeben' // Placeholder address
        };
        selectLocation(manualLoc);
        saveOfflineLocation(manualLoc); // Save to local storage immediately
    } else {
        clearSelection();
        saveOfflineLocation(null); // Clear from local storage
    }
};

// New: Save the selected location (manual or fetched) to local storage
const saveSelectedLocationToCache = (location: ExamLocation | null) => {
    try {
        if (location) {
            localStorage.setItem(LOCAL_STORAGE_SELECTED_LOCATION_KEY, JSON.stringify(location));
        } else {
            localStorage.removeItem(LOCAL_STORAGE_SELECTED_LOCATION_KEY);
        }
    } catch (e) {
        console.error('Error saving selected location to local storage:', e);
    }
};

// New: Load selected location from cache
const loadSelectedLocationFromCache = (): ExamLocation | null => {
    try {
        const cached = localStorage.getItem(LOCAL_STORAGE_SELECTED_LOCATION_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch (e) {
        console.error('Error loading selected location from local storage:', e);
        return null;
    }
};


// New: Save offline/manual location to local storage
const saveOfflineLocation = (location: ExamLocation | null) => {
  try {
    if (location && location.isManual) {
      localStorage.setItem(LOCAL_STORAGE_OFFLINE_LOCATION_KEY, JSON.stringify(location))
      console.log('💾 Manual location saved to local storage:', location.name);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_OFFLINE_LOCATION_KEY)
      console.log('🗑️ Manual location cleared from local storage.');
    }
  } catch (e) {
    console.error('Error saving offline location to local storage:', e)
  }
}

// New: Load offline/manual location from local storage
const loadOfflineLocation = () => {
  try {
    const cachedLocation = localStorage.getItem(LOCAL_STORAGE_OFFLINE_LOCATION_KEY)
    if (cachedLocation) {
      const parsedLocation: ExamLocation = JSON.parse(cachedLocation)
      // Only set if it's a manual location
      if (parsedLocation.isManual) {
        selectedLocation.value = parsedLocation
        manualLocationInput.value = parsedLocation.name || '';
        emit('update:modelValue', parsedLocation)
        console.log('🚀 Manual location loaded from cache:', parsedLocation.name);
      }
    }
  } catch (e) {
    console.error('Error loading offline location from local storage:', e)
  }
}

// New: Synchronize manual location with Supabase
const synchronizeManualLocation = async () => {
  const cachedManualLocation = loadSelectedLocationFromCache(); // Check if the selected one is manual
  
  if (cachedManualLocation && cachedManualLocation.isManual && props.currentStaffId) {
    isLoading.value = true;
    try {
      const supabase = getSupabase();
      
      // Check if this manual location already exists in 'exam_locations'
      const { data: existingLocations, error: existingError } = await supabase
        .from('exam_locations')
        .select('id, name')
        .eq('name', cachedManualLocation.name)
        .limit(1);

      if (existingError) throw existingError;

      let locationIdToUse: string;

      if (existingLocations && existingLocations.length > 0) {
        // Location already exists, use its ID
        locationIdToUse = existingLocations[0].id;
        console.log(`💡 Manual location '${cachedManualLocation.name}' already exists in exam_locations. Using existing ID.`);
      } else {
        // Insert new exam location if it doesn't exist
        const { data: newLocation, error: insertError } = await supabase
          .from('locations')
          .insert({
            name: cachedManualLocation.name,
            address: cachedManualLocation.address || 'Manuell erfasst (Offline)',
            is_active: true,
            location_type: 'exam',
            staff_id: props.currentStaffId, // Hinzufügen der staff_id hier
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        locationIdToUse = newLocation.id;
        console.log(`➕ Manual location '${cachedManualLocation.name}' added to exam_locations.`);
      }

      // Check if staff_exam_location entry already exists for this staff and location
      const { data: existingStaffLocation, error: existingStaffError } = await supabase
        .from('staff_exam_locations')
        .select('*')
        .eq('staff_id', props.currentStaffId)
        .eq('name', cachedManualLocation.name) // Use name for checking against staff_exam_locations
        .limit(1);

      if (existingStaffError) throw existingStaffError;

      if (!existingStaffLocation || existingStaffLocation.length === 0) {
        // Add to staff_exam_locations if not already present
        const { error: staffInsertError } = await supabase
          .from('staff_exam_locations')
          .insert({
            staff_id: props.currentStaffId,
            name: cachedManualLocation.name,
            address: cachedManualLocation.address || 'Manuell erfasst (Offline)',
            is_active: true
          });
        
        if (staffInsertError) throw staffInsertError;
        console.log(`🔗 Manual location '${cachedManualLocation.name}' linked to staff_exam_locations.`);
      } else {
          console.log(`👌 Manual location '${cachedManualLocation.name}' already linked to staff.`);
      }

      // Clear the manual location from cache after successful sync
      saveOfflineLocation(null);
      // Re-load exam locations to reflect changes from database
      await loadExamLocations(); 
      
      // Update the selected location to the newly synced one
      const syncedLocation = availableExamLocations.value.find(loc => loc.name === cachedManualLocation.name);
      if (syncedLocation) {
        selectLocation(syncedLocation);
        console.log('✅ Manual location successfully synchronized and selected.');
      }

    } catch (syncErr: any) {
      console.error('❌ Error synchronizing manual location:', syncErr);
      // Keep manual location in cache if sync fails
      error.value = `Fehler beim Synchronisieren des manuellen Ortes: ${syncErr.message}.`;
    } finally {
      isLoading.value = false;
    }
  }
};


const selectLocation = (location: ExamLocation) => {
  selectedLocation.value = location
  emit('update:modelValue', location)
  saveSelectedLocationToCache(location); // Save selected location to cache
  // If it's a manual location, also save it to the offline specific cache
  if (location.isManual) {
    saveOfflineLocation(location);
  } else {
    // If a database location is selected, clear any pending manual location
    saveOfflineLocation(null);
  }
  console.log('📍 Exam location selected:', location.name, location.isManual ? '(Manual)' : '(DB)');
}

const clearSelection = () => {
  selectedLocation.value = null
  manualLocationInput.value = ''; // Clear manual input as well
  emit('update:modelValue', null)
  saveSelectedLocationToCache(null); // Clear selected location from cache
  saveOfflineLocation(null); // Clear any pending manual location from cache
  console.log('🗑️ Exam location selection cleared');
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  selectedLocation.value = newValue
  if (newValue && newValue.isManual) {
      manualLocationInput.value = newValue.name || '';
  }
}, { immediate: true }); // immediate to handle initial modelValue

watch(() => props.currentStaffId, (newStaffId) => {
  if (newStaffId) {
    loadExamLocations()
  }
})

// Lifecycle
onMounted(() => {
  // Entfernt: Automatisches Laden aus Cache beim Modal-Öffnen
  // Der Benutzer soll bewusst eine Location auswählen
  
  // Nur die verfügbaren Locations von Supabase laden
  if (props.currentStaffId) {
    loadExamLocations();
  }
  
  // Sync-Interval für manuelle Locations (falls offline erstellt)
  setInterval(() => {
    if (isOfflineMode.value && selectedLocation.value?.isManual) {
      console.log('Attempting to re-sync manual location...');
      synchronizeManualLocation();
    }
  }, 30000); // Try every 30 seconds
})
</script>

<style scoped>
/* Custom scrollbar for location list */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>