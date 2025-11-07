<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Verfügbarkeits-System Test</h1>
        <p class="text-gray-600 mt-2">Testen Sie das neue Verfügbarkeits-System für Terminbuchungen</p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Verfügbare Termine werden geladen...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Fehler beim Laden der Verfügbarkeit</h3>
            <div class="mt-2 text-sm text-red-700">{{ error }}</div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div v-else class="space-y-8">
        
        <!-- Filter Section -->
        <div class="bg-white shadow rounded-lg p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">📋 Verfügbarkeit suchen</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <!-- Tenant Info (Read-only) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Fahrschule</label>
              <div class="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                {{ currentTenant?.name || 'Wird geladen...' }}
              </div>
            </div>
            
            <!-- Kategorie -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Fahrkategorie</label>
              <select
                v-model="filters.category_code"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                @change="loadStaffForCategory"
                :disabled="!currentTenant"
              >
                <option value="">Kategorie wählen</option>
                <option v-for="category in filteredCategories" :key="category.code" :value="category.code">
                  {{ category.code }} - {{ category.name }}
                </option>
              </select>
            </div>
            
            <!-- Dauer -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Dauer (Minuten)</label>
              <select
                v-model="filters.duration_minutes"
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                @change="loadStaffForCategory"
              >
                <option value="45">45 Minuten</option>
                <option value="60">60 Minuten</option>
                <option value="90">90 Minuten</option>
                <option value="120">120 Minuten</option>
              </select>
            </div>
            
          </div>
          
          <!-- Search Button -->
          <div class="mt-4">
            <button
              @click="loadStaffForCategory"
              :disabled="!canSearch"
              class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-md transition-colors"
            >
              🔍 Staff für Kategorie laden
            </button>
          </div>
        </div>

        <!-- Staff Selection Section -->
        <div v-if="availableStaff.length > 0" class="bg-white shadow rounded-lg p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">
            👨‍🏫 Verfügbare Fahrlehrer für {{ filters.category_code }} ({{ availableStaff.length }} gefunden)
          </h2>
          
          <div class="space-y-4">
            <div
              v-for="staff in availableStaff"
              :key="staff.id"
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="flex justify-between items-start mb-3">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">{{ staff.first_name }} {{ staff.last_name }}</h3>
                  <p class="text-sm text-gray-600">{{ staff.email }}</p>
                  <p class="text-sm text-gray-500">{{ filters.category_code }} - {{ filters.duration_minutes }} Min</p>
                </div>
                <button
                  @click="loadLocationsForStaff(staff)"
                  :disabled="staff.available_locations.length > 0"
                  class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                >
                  {{ staff.available_locations.length > 0 ? 'Standorte geladen' : 'Standorte laden' }}
                </button>
              </div>
              
              <!-- Available Locations -->
              <div v-if="staff.available_locations.length > 0" class="mt-4">
                <h4 class="text-md font-semibold text-gray-800 mb-2">
                  Verfügbare Standorte ({{ staff.available_locations.length }})
                </h4>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  <div
                    v-for="location in staff.available_locations"
                    :key="`${staff.id}-${location.id}`"
                    class="border border-gray-200 rounded-lg p-2 hover:shadow-md transition-shadow bg-gray-50"
                  >
                    <div class="flex justify-between items-center">
                      <div>
                        <p class="font-medium text-gray-900">{{ location.name }}</p>
                        <p class="text-sm text-gray-600">{{ location.address }}</p>
                      </div>
                      <button
                        @click="loadTimeSlotsForStaffLocation(staff, location)"
                        class="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1 px-2 rounded transition-colors"
                      >
                        Zeitslots laden
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No Results -->
        <div v-else-if="hasSearched && availableStaff.length === 0" class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-yellow-800">Keine Fahrlehrer für diese Kategorie gefunden</h3>
              <div class="mt-2 text-sm text-yellow-700">
                <p>Für die gewählte Kategorie {{ filters.category_code }} wurden keine verfügbaren Fahrlehrer gefunden. Versuchen Sie:</p>
                <ul class="list-disc list-inside mt-1">
                  <li>Eine andere Fahrkategorie zu wählen</li>
                  <li>Einen anderen Tenant zu wählen</li>
                  <li>Die Dauer anzupassen</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected Slot Info -->
        <div v-if="selectedSlot" class="bg-green-50 border border-green-200 rounded-md p-4">
          <h3 class="text-lg font-medium text-green-800 mb-2">✅ Termin ausgewählt</h3>
          <div class="text-sm text-green-700">
            <p><strong>Fahrlehrer:</strong> {{ selectedSlot.staff_name }}</p>
            <p><strong>Standort:</strong> {{ selectedSlot.location_name }}</p>
            <p><strong>Zeit:</strong> {{ formatDate(selectedSlot.start_time) }} um {{ formatTime(selectedSlot.start_time) }}</p>
            <p><strong>Dauer:</strong> {{ selectedSlot.duration_minutes }} Minuten</p>
            <p><strong>Kategorie:</strong> {{ selectedSlot.category_code }}</p>
          </div>
          <div class="mt-4">
            <button
              @click="proceedToRegistration"
              class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
            >
              🚀 Zur Registrierung
            </button>
          </div>
        </div>

        <!-- System Info -->
        <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 class="text-lg font-medium text-blue-800 mb-2">ℹ️ System-Informationen</h3>
          <div class="text-sm text-blue-700 space-y-1">
            <p><strong>Fahrschule:</strong> {{ currentTenant?.name || 'Nicht geladen' }}</p>
            <p><strong>Staff-Mitglieder:</strong> {{ staffCount }}</p>
            <p><strong>Verfügbare Staff:</strong> {{ availableStaff.length }}</p>
            <p><strong>Kategorien:</strong> {{ categories.length }} für gewählten Tenant</p>
            <p><strong>Standorte:</strong> {{ locationsCount }}</p>
            <p><strong>Letzte Suche:</strong> {{ lastSearchTime || 'Noch keine Suche' }}</p>
            <p><strong>System:</strong> Nutzt bestehende Tabellen (users, staff_working_hours)</p>
            <p><strong>Wochentage:</strong> 1=Montag, 7=Sonntag</p>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAvailabilitySystem } from '~/composables/useAvailabilitySystem'
import { getSupabase } from '~/utils/supabase'

// Page Meta
definePageMeta({
  layout: 'default'
})

// Composables
const { 
  isLoading, 
  error, 
  availableSlots, 
  staffLocationCategories,
  getAvailableSlots,
  getAllAvailableSlots,
  getStaffLocationCategories,
  getAvailableSlotsForCombination,
  loadBaseData,
  activeStaff 
} = useAvailabilitySystem()

const supabase = getSupabase()

// State
const categories = ref([])
const locationsCount = ref(0)
const selectedSlot = ref(null)
const hasSearched = ref(false)
const lastSearchTime = ref('')
const currentTenant = ref(null)
const availableStaff = ref([])

const filters = ref({
  category_code: '',
  duration_minutes: 45,
  buffer_minutes: 15,
  location_id: null
})

// Computed
const today = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const canSearch = computed(() => {
  return currentTenant.value && filters.value.category_code
})

const staffCount = computed(() => activeStaff.value.length)

const filteredCategories = computed(() => {
  return categories.value
})

const groupedSlots = computed(() => {
  const grouped: { [key: string]: any[] } = {}
  
  availableSlots.value.forEach(slot => {
    const date = slot.start_time.split('T')[0]
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(slot)
  })
  
  // Sort slots within each day by time
  Object.keys(grouped).forEach(date => {
    grouped[date].sort((a, b) => a.start_time.localeCompare(b.start_time))
  })
  
  return grouped
})

// Methods
const formatTime = (dateTimeString: string) => {
  const date = new Date(dateTimeString)
  return date.toLocaleTimeString('de-DE', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const formatDate = (dateTimeString: string) => {
  const date = new Date(dateTimeString)
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const loadStaffForCategory = async () => {
  if (!canSearch.value) return
  
  hasSearched.value = true
  lastSearchTime.value = new Date().toLocaleTimeString('de-DE')
  
  try {
    // Load base data first with tenant filtering
    await loadBaseData(currentTenant.value.id)
    
    // Filter staff who can teach the selected category
    const capableStaff = activeStaff.value.filter(staff => {
      // Check if staff has the selected category in their category array
      const staffCategories = Array.isArray(staff.category) ? staff.category : []
      return staffCategories.includes(filters.value.category_code)
    })
    
    // Add available_locations array to each staff
    availableStaff.value = capableStaff.map(staff => ({
      ...staff,
      available_locations: []
    }))
    
    console.log('✅ Staff for category', filters.value.category_code, ':', availableStaff.value.length)
    console.log('🔍 Capable staff:', capableStaff.map(s => ({ 
      id: s.id, 
      name: `${s.first_name} ${s.last_name}`, 
      categories: s.category 
    })))
    console.log('🔍 All active staff:', activeStaff.value.map(s => ({ 
      id: s.id, 
      name: `${s.first_name} ${s.last_name}`, 
      categories: s.category 
    })))
  } catch (err) {
    console.error('❌ Error loading staff for category:', err)
  }
}

const loadLocationsForStaff = async (staff: any) => {
  try {
    // Get locations where this staff can teach using locations table directly
    const { data: staffLocations, error: slError } = await supabase
      .from('locations')
      .select('*')
      .eq('staff_id', staff.id)
      .eq('is_active', true)
      .eq('location_type', 'standard')
    
    if (slError) {
      console.error('❌ Error loading staff locations:', slError)
      return
    }
    
    // Update the staff with locations
    const index = availableStaff.value.findIndex(s => s.id === staff.id)
    if (index !== -1) {
      availableStaff.value[index].available_locations = (staffLocations || []).map(location => ({
        ...location,
        time_slots: []
      }))
    }
    
    console.log('✅ Loaded', staffLocations?.length || 0, 'locations for', staff.first_name, staff.last_name)
  } catch (err) {
    console.error('❌ Error loading locations for staff:', err)
  }
}

const loadTimeSlotsForStaffLocation = async (staff: any, location: any) => {
  try {
    // This would load actual time slots for the staff-location combination
    // For now, we'll just show a placeholder
    console.log('🕒 Loading time slots for', staff.first_name, 'at', location.name)
    
    // TODO: Implement actual time slot loading
    alert(`Zeitslots für ${staff.first_name} ${staff.last_name} an ${location.name} würden hier geladen werden.`)
  } catch (err) {
    console.error('❌ Error loading time slots:', err)
  }
}

const selectSlot = (slot: any) => {
  selectedSlot.value = slot
  console.log('✅ Slot selected:', slot)
}

const proceedToRegistration = () => {
  if (!selectedSlot.value) return
  
  // TODO: Navigate to registration page with selected slot
  alert(`Termin ausgewählt: ${selectedSlot.value.staff_name} am ${formatDate(selectedSlot.value.start_time)} um ${formatTime(selectedSlot.value.start_time)}`)
}

const setTenantFromSlug = async (slugOrId: string) => {
  try {
    // First try to find tenant by slug
    let { data: tenantData, error } = await supabase
      .from('tenants')
      .select('id, name, slug, business_type')
      .eq('slug', slugOrId)
      .eq('is_active', true)
      .single()
    
    // If not found by slug, try by id (UUID format)
    if (error && error.code === 'PGRST116') {
      console.log('🔍 Tenant not found by slug, trying by ID:', slugOrId)
      const result = await supabase
        .from('tenants')
        .select('id, name, slug, business_type')
        .eq('id', slugOrId)
        .eq('is_active', true)
        .single()
      
      tenantData = result.data
      error = result.error
    }
    
    if (error) {
      console.error('❌ Error finding tenant by slug/ID:', error)
      return
    }
    
    currentTenant.value = tenantData
    
    // Reset category when tenant changes
    filters.value.category_code = ''
    // Clear search results
    availableStaff.value = []
    hasSearched.value = false
    
    // Load categories for the tenant
    await loadCategories()
    
    console.log('✅ Tenant set from slug/ID:', tenantData.name)
  } catch (err) {
    console.error('❌ Error setting tenant from slug/ID:', err)
  }
}


const loadCategories = async () => {
  try {
    if (!currentTenant.value) {
      console.log('🚫 No current tenant selected')
      categories.value = []
      return
    }

    // Only load categories if business_type is driving_school
    if (currentTenant.value.business_type !== 'driving_school') {
      console.log('🚫 Categories not available for business_type:', currentTenant.value.business_type)
      categories.value = []
      return
    }

    const { data, error } = await supabase
      .from('categories')
      .select('id, code, name, description, lesson_duration_minutes, tenant_id')
      .eq('is_active', true)
      .eq('tenant_id', currentTenant.value.id)
      .order('code')
    
    if (error) throw error
    categories.value = data || []
    
    // Load locations count (nur standard locations)
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('id', { count: 'exact' })
      .eq('is_active', true)
      .eq('location_type', 'standard')
      .eq('tenant_id', currentTenant.value.id)
    
    if (locationsError) throw locationsError
    locationsCount.value = locations?.length || 0
    
  } catch (err) {
    console.error('❌ Error loading categories:', err)
  }
}

// Lifecycle
onMounted(async () => {
  try {
    // Get tenant slug or ID from URL
    const route = useRoute()
    const tenantParam = route.query.tenant as string
    
    if (tenantParam) {
      // Set the tenant from slug or ID
      await setTenantFromSlug(tenantParam)
      console.log('✅ Tenant set from parameter:', tenantParam)
    } else {
      console.error('❌ No tenant parameter provided in URL')
    }
    
    console.log('✅ Availability test page loaded')
  } catch (err) {
    console.error('❌ Error initializing availability test page:', err)
  }
})
</script>
