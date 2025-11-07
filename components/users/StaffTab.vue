<!-- components/users/StaffTab.vue - Fahrlehrer-Tab mit Verfügbarkeits-Einstellungen -->
<template>
  <div v-if="isOnlineBookingEnabled" class="h-full flex flex-col">
    <!-- Header mit Add Button -->
    <div class="bg-white border-b p-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-medium text-gray-900">Verfügbarkeit & Online-Terminbuchung</h2>
        <button 
          v-if="currentUser.role === 'admin'"
          @click="addNewStaff"
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          + Neuer Fahrlehrer
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Loading State -->
      <div v-if="isLoading" class="h-full flex items-center justify-center">
        <div class="text-center">
          <LoadingLogo size="xl" />
          <p class="text-gray-600 mt-4">Lade Fahrlehrer...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="h-full flex items-center justify-center">
        <div class="text-center max-w-md p-6 bg-red-50 rounded-lg">
          <h3 class="text-lg font-bold text-red-800 mb-2">Fehler beim Laden</h3>
          <p class="text-red-600 mb-4">{{ error }}</p>
          <button 
            @click="loadStaff" 
            class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="staffList.length === 0" class="h-full flex items-center justify-center">
        <div class="text-center px-4">
          <div class="text-6xl mb-4">👨‍🏫</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Noch keine Fahrlehrer</h3>
          <p class="text-gray-600 mb-4">Fügen Sie den ersten Fahrlehrer hinzu</p>
          <button 
            v-if="currentUser.role === 'admin'"
            @click="addNewStaff"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Ersten Fahrlehrer hinzufügen
          </button>
        </div>
      </div>

      <!-- Staff Grid -->
      <div v-else class="h-full overflow-y-auto">
        <div class="p-4 space-y-6">
          <div
            v-for="staff in staffList"
            :key="staff.id"
            class="bg-white rounded-lg shadow-sm border p-6"
          >
            <!-- Staff Header -->
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <span class="text-lg font-semibold text-gray-600">
                    {{ staff.first_name.charAt(0) }}{{ staff.last_name.charAt(0) }}
                  </span>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">
                    {{ staff.first_name }} {{ staff.last_name }}
                  </h3>
                  <p class="text-sm text-gray-600">{{ staff.email }}</p>
                </div>
              </div>
              
              <!-- Status Badge -->
              <span :class="[
                'px-3 py-1 rounded-full text-sm font-medium',
                staff.is_active 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              ]">
                {{ staff.is_active ? 'Aktiv' : 'Inaktiv' }}
              </span>
            </div>

            <!-- Verfügbarkeits-Einstellungen -->
            <div class="space-y-4">
              <!-- Verfügbarkeitsmodus -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Verfügbarkeitsmodus
                </label>
                <select 
                  v-model="staff.availability_mode"
                  @change="updateStaffAvailability(staff)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="standard">Nur Standard-Locations</option>
                  <option value="pickup">Umkreis-Abholung</option>
                  <option value="hybrid">Beide Optionen</option>
                </select>
                <p class="text-xs text-gray-500 mt-1">
                  {{ getAvailabilityModeDescription(staff.availability_mode) }}
                </p>
              </div>

              <!-- Pickup-Radius (nur wenn Pickup aktiviert) -->
              <div v-if="staff.availability_mode !== 'standard'">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Pickup-Radius (Minuten)
                </label>
                <div class="flex items-center gap-3">
                  <input 
                    type="number" 
                    v-model="staff.pickup_radius_minutes"
                    @change="updateStaffAvailability(staff)"
                    min="5" 
                    max="60" 
                    class="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                  <span class="text-sm text-gray-600">Minuten Fahrzeit</span>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  Maximale Fahrzeit für Abholung von Kunden
                </p>
              </div>

              <!-- Pickup pro Kategorie -->
              <div v-if="staff.availability_mode !== 'standard'">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Pickup je Kategorie
                </label>
                <div class="space-y-2">
                  <div 
                    v-for="category in availableCategories" 
                    :key="category.code"
                    class="flex items-center justify-between gap-3 p-2 border border-gray-200 rounded-lg"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-sm font-medium text-gray-800 w-24">{{ category.code }}</span>
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          :checked="getCategoryPickup(staff, category.code)?.pickup_enabled || false"
                          @change="onCategoryToggle($event, staff, category.code)"
                          class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        >
                        <span class="text-sm text-gray-700">Pickup erlaubt</span>
                      </label>
                    </div>
                    <div class="flex items-center gap-2">
                      <input 
                        type="number"
                        :value="getCategoryPickup(staff, category.code)?.pickup_radius_minutes ?? staff.pickup_radius_minutes"
                        @change="updateCategoryRadius(staff, category.code, ($event.target as HTMLInputElement).value)"
                        :disabled="!(getCategoryPickup(staff, category.code)?.pickup_enabled)"
                        min="5" max="60"
                        class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                      <span class="text-xs text-gray-600">Min</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Locations pro Kategorie -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Standorte pro Kategorie
                </label>
                <div class="space-y-3">
                  <div 
                    v-for="location in staff.locations" 
                    :key="location.id"
                    class="border border-gray-200 rounded-lg p-3"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <h4 class="font-medium text-gray-900">{{ location.name }}</h4>
                      <span class="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {{ location.location_type }}
                      </span>
                    </div>
                    
                    <!-- Kategorie-Zuordnung -->
                    <div class="space-y-2">
                      <label class="text-sm text-gray-600">Verfügbar für Kategorien:</label>
                      <div class="flex flex-wrap gap-2">
                        <label 
                          v-for="category in availableCategories" 
                          :key="category.code"
                          class="flex items-center gap-2 cursor-pointer"
                        >
                          <input 
                            type="checkbox" 
                            :value="category.code"
                            v-model="location.available_categories"
                            @change="updateLocationCategories(location)"
                            class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          >
                          <span class="text-sm text-gray-700">
                            {{ category.code }} - {{ category.name }}
                          </span>
                        </label>
                      </div>
                    </div>

                    <!-- Pickup-Einstellungen für Location -->
                    <div v-if="staff.availability_mode !== 'standard'" class="mt-3 pt-3 border-t border-gray-100">
                      <div class="flex items-center gap-3">
                        <label class="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            v-model="location.pickup_enabled"
                            @change="updateLocationPickup(location)"
                            class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          >
                          <span class="text-sm text-gray-700">Pickup an diesem Standort</span>
                        </label>
                      </div>
                      
                      <div v-if="location.pickup_enabled" class="mt-2">
                        <label class="block text-sm text-gray-600 mb-1">
                          Pickup-Radius für diesen Standort:
                        </label>
                        <div class="flex items-center gap-3">
                          <input 
                            type="number" 
                            v-model="location.pickup_radius_minutes"
                            @change="updateLocationPickup(location)"
                            min="5" 
                            max="60" 
                            class="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                          <span class="text-xs text-gray-600">Min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Arbeitszeiten Button -->
              <div class="pt-4 border-t border-gray-100">
                <button 
                  @click="editWorkingHours(staff)"
                  class="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  📅 Arbeitszeiten bearbeiten
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Staff Modal -->
    <div v-if="showAddStaffModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="showAddStaffModal = false"></div>
      
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Neuen Fahrlehrer hinzufügen</h3>
          
          <form @submit.prevent="createStaff">
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Vorname</label>
                <input 
                  v-model="newStaff.first_name"
                  type="text" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nachname</label>
                <input 
                  v-model="newStaff.last_name"
                  type="text" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                <input 
                  v-model="newStaff.email"
                  type="email" 
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
              </div>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button 
                type="button"
                @click="showAddStaffModal = false"
                class="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button 
                type="submit"
                :disabled="isCreatingStaff"
                class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {{ isCreatingStaff ? 'Erstelle...' : 'Erstellen' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="h-full flex items-center justify-center p-6">
    <div class="text-center max-w-md">
      <div class="text-4xl mb-4">🚫</div>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Online-Terminbuchung ist deaktiviert</h3>
      <p class="text-sm text-gray-600">Diese Funktion wurde vom Administrator deaktiviert.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { useUIStore } from '~/stores/ui'
import LoadingLogo from '~/components/LoadingLogo.vue'
import { useFeatures } from '~/composables/useFeatures'

// Props
const props = defineProps<{
  currentUser: any
  tenantSettings: any
}>()

// Emits
const emit = defineEmits<{
  settingsUpdated: [settings: any]
}>()

// Supabase client
const supabase = getSupabase()

// Composables
const uiStore = useUIStore()
const { isEnabled, load: loadFeatures } = useFeatures()

// Prüfe ob Online-Buchung aktiviert ist
const isOnlineBookingEnabled = computed(() => {
  return isEnabled('allow_online_booking', true) // Default: true für Rückwärtskompatibilität
})

// Local state
const staffList = ref<any[]>([])
const availableCategories = ref<any[]>([])
const staffCategoryAvailability = ref<Record<string, any[]>>({}) // key: staffId -> rows
const isLoading = ref(false)
const error = ref<string | null>(null)
const showAddStaffModal = ref(false)
const isCreatingStaff = ref(false)
const newStaff = ref({
  first_name: '',
  last_name: '',
  email: ''
})

// Optional Filter: Wenn in Detailansicht eines Staffs verwendet, nur diesen laden
const staffIdFilter = computed<string | null>(() => {
  const id = (props as any)?.currentUser?.id
  return typeof id === 'string' ? id : null
})

// Computed
const getAvailabilityModeDescription = (mode: string) => {
  const descriptions = {
    standard: 'Nur an vordefinierten Standorten verfügbar',
    pickup: 'Kann Kunden im definierten Umkreis abholen',
    hybrid: 'Kann sowohl an Standorten als auch durch Abholung verfügbar sein'
  }
  return descriptions[mode as keyof typeof descriptions] || ''
}

// Methods
const loadStaff = async () => {
  if (!props.currentUser) return
  
  isLoading.value = true
  error.value = null
  
  try {
    console.log('🔄 Loading staff from database...')
    
    // Get current user's tenant_id
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser?.id)
      .single()
    const tenantId = userProfile?.tenant_id
    
    if (!tenantId) {
      throw new Error('User has no tenant assigned')
    }

    // Load staff (optional: nur spezifischen Staff)
    let staffData: any[] = []
    let staffError: any = null
    if (staffIdFilter.value) {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          is_active,
          created_at
        `)
        .eq('role', 'staff')
        .eq('tenant_id', tenantId)
        .eq('id', staffIdFilter.value)
        .maybeSingle()
      staffError = error
      if (data) staffData = [data]
    } else {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          is_active,
          created_at
        `)
        .eq('role', 'staff')
        .eq('tenant_id', tenantId)
        .order('first_name', { ascending: true })
      staffError = error
      staffData = data || []
    }

    if (staffError) {
      throw new Error(`Database error: ${staffError.message}`)
    }

    // Load categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('code, name')
      .eq('tenant_id', tenantId)
      .order('code', { ascending: true })

    if (categoriesError) {
      console.warn('⚠️ Could not load categories:', categoriesError)
    } else {
      availableCategories.value = categoriesData || []
    }

    // Load staff availability settings
    const { data: availabilityData, error: availabilityError } = await supabase
      .from('staff_availability_settings')
      .select('*')
      .in('staff_id', staffData.map(s => s.id))

    if (availabilityError) {
      console.warn('⚠️ Could not load availability settings:', availabilityError)
    }

    // Load staff locations
    const { data: locationsData, error: locationsError } = await supabase
      .from('locations')
      .select(`
        id,
        staff_id,
        name,
        address,
        location_type,
        available_categories,
        pickup_enabled,
        pickup_radius_minutes
      `)
      .in('staff_id', staffData.map(s => s.id))
      .eq('is_active', true)

    if (locationsError) {
      console.warn('⚠️ Could not load locations:', locationsError)
    }

    // Load per-category pickup availability
    const { data: scaData, error: scaError } = await supabase
      .from('staff_category_availability')
      .select('*')
      .in('staff_id', staffData.map(s => s.id))

    if (scaError) {
      console.warn('⚠️ Could not load staff_category_availability:', scaError)
    }

    const byStaff: Record<string, any[]> = {}
    ;(scaData || []).forEach(row => {
      if (!byStaff[row.staff_id]) byStaff[row.staff_id] = []
      byStaff[row.staff_id].push(row)
    })
    staffCategoryAvailability.value = byStaff

    // Combine data
    const enrichedStaff = (staffData || []).map(staff => {
      const availability = availabilityData?.find(a => a.staff_id === staff.id)
      const locations = locationsData?.filter(l => l.staff_id === staff.id) || []
      const categoryPickup = staffCategoryAvailability.value[staff.id] || []
      
      return {
        ...staff,
        availability_mode: availability?.availability_mode || 'standard',
        pickup_radius_minutes: availability?.pickup_radius_minutes || 10,
        category_pickup: categoryPickup,
        locations: locations.map(location => ({
          ...location,
          available_categories: location.available_categories || [],
          pickup_enabled: location.pickup_enabled || false,
          pickup_radius_minutes: location.pickup_radius_minutes || 10
        }))
      }
    })

    staffList.value = enrichedStaff
    console.log('✅ Staff loaded successfully:', staffList.value.length)

  } catch (err: any) {
    console.error('❌ Error loading staff:', err)
    error.value = err.message || 'Fehler beim Laden der Fahrlehrer'
    staffList.value = []
  } finally {
    isLoading.value = false
  }
}

const getCategoryPickup = (staff: any, categoryCode: string) => {
  const rows = staff.category_pickup as any[] | undefined
  return rows?.find(r => r.category_code === categoryCode) || null
}

const ensureCategoryRow = async (staff: any, categoryCode: string) => {
  const existing = getCategoryPickup(staff, categoryCode)
  if (existing) return existing
  const defaultRow = { staff_id: staff.id, category_code: categoryCode, pickup_enabled: false, pickup_radius_minutes: staff.pickup_radius_minutes || 10 }
  // Optimistic local insert
  staff.category_pickup = [...(staff.category_pickup || []), defaultRow]
  return defaultRow
}

const toggleCategoryPickup = async (staff: any, categoryCode: string, enabled: boolean) => {
  try {
    const row = await ensureCategoryRow(staff, categoryCode)
    row.pickup_enabled = enabled
    const { error } = await supabase
      .from('staff_category_availability')
      .upsert({
        staff_id: staff.id,
        category_code: categoryCode,
        pickup_enabled: enabled,
        pickup_radius_minutes: row.pickup_radius_minutes || staff.pickup_radius_minutes || 10
      })
    if (error) throw error
    uiStore.addNotification({
      type: 'success',
      title: 'Gespeichert',
      message: `Pickup für Kategorie ${categoryCode} ${enabled ? 'aktiviert' : 'deaktiviert'}.`
    })
  } catch (err: any) {
    console.error('❌ Error toggling category pickup:', err)
    uiStore.addNotification({ type: 'error', title: 'Fehler', message: 'Kategorie-Pickup konnte nicht gespeichert werden.' })
  }
}

const updateCategoryRadius = async (staff: any, categoryCode: string, value: string | number) => {
  try {
    const radius = Math.max(5, Math.min(60, Number(value) || 10))
    const row = await ensureCategoryRow(staff, categoryCode)
    row.pickup_radius_minutes = radius
    const { error } = await supabase
      .from('staff_category_availability')
      .upsert({
        staff_id: staff.id,
        category_code: categoryCode,
        pickup_enabled: row.pickup_enabled || false,
        pickup_radius_minutes: radius
      })
    if (error) throw error
    uiStore.addNotification({ type: 'success', title: 'Radius gespeichert', message: `Pickup-Radius für ${categoryCode} aktualisiert.` })
  } catch (err: any) {
    console.error('❌ Error updating category radius:', err)
    uiStore.addNotification({ type: 'error', title: 'Fehler', message: 'Pickup-Radius konnte nicht gespeichert werden.' })
  }
}

const updateStaffAvailability = async (staff: any) => {
  try {
    console.log('🔄 Updating staff availability:', staff.id, staff.availability_mode)
    
    const { error } = await supabase
      .from('staff_availability_settings')
      .upsert({
        staff_id: staff.id,
        availability_mode: staff.availability_mode,
        pickup_radius_minutes: staff.pickup_radius_minutes
      })

    if (error) throw error

    uiStore.addNotification({
      type: 'success',
      title: 'Einstellungen gespeichert',
      message: `Verfügbarkeitsmodus für ${staff.first_name} ${staff.last_name} wurde aktualisiert.`
    })

  } catch (err: any) {
    console.error('❌ Error updating staff availability:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: 'Einstellungen konnten nicht gespeichert werden.'
    })
  }
}

const updateLocationCategories = async (location: any) => {
  try {
    console.log('🔄 Updating location categories:', location.id, location.available_categories)
    
    const { error } = await supabase
      .from('locations')
      .update({
        available_categories: location.available_categories
      })
      .eq('id', location.id)

    if (error) throw error

    uiStore.addNotification({
      type: 'success',
      title: 'Kategorien aktualisiert',
      message: `Kategorie-Zuordnung für ${location.name} wurde gespeichert.`
    })

  } catch (err: any) {
    console.error('❌ Error updating location categories:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: 'Kategorie-Zuordnung konnte nicht gespeichert werden.'
    })
  }
}

const updateLocationPickup = async (location: any) => {
  try {
    console.log('🔄 Updating location pickup:', location.id, location.pickup_enabled)
    
    const { error } = await supabase
      .from('locations')
      .update({
        pickup_enabled: location.pickup_enabled,
        pickup_radius_minutes: location.pickup_radius_minutes
      })
      .eq('id', location.id)

    if (error) throw error

    uiStore.addNotification({
      type: 'success',
      title: 'Pickup-Einstellungen gespeichert',
      message: `Pickup-Einstellungen für ${location.name} wurden aktualisiert.`
    })

  } catch (err: any) {
    console.error('❌ Error updating location pickup:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: 'Pickup-Einstellungen konnten nicht gespeichert werden.'
    })
  }
}

const addNewStaff = () => {
  newStaff.value = {
    first_name: '',
    last_name: '',
    email: ''
  }
  showAddStaffModal.value = true
}

const createStaff = async () => {
  if (!props.currentUser) return
  
  isCreatingStaff.value = true
  
  try {
    console.log('🔄 Creating new staff member...')
    
    // Get current user's tenant_id
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', authUser?.id)
      .single()
    const tenantId = userProfile?.tenant_id
    
    if (!tenantId) {
      throw new Error('User has no tenant assigned')
    }

    // Create staff user
    const { data: newStaffData, error: staffError } = await supabase
      .from('users')
      .insert({
        first_name: newStaff.value.first_name,
        last_name: newStaff.value.last_name,
        email: newStaff.value.email,
        role: 'staff',
        tenant_id: tenantId,
        is_active: true
      })
      .select()
      .single()

    if (staffError) throw staffError

    // Create default availability settings
    const { error: availabilityError } = await supabase
      .from('staff_availability_settings')
      .insert({
        staff_id: newStaffData.id,
        availability_mode: 'standard',
        pickup_radius_minutes: 10
      })

    if (availabilityError) {
      console.warn('⚠️ Could not create default availability settings:', availabilityError)
    }

    uiStore.addNotification({
      type: 'success',
      title: 'Fahrlehrer erstellt',
      message: `${newStaff.value.first_name} ${newStaff.value.last_name} wurde erfolgreich hinzugefügt.`
    })

    showAddStaffModal.value = false
    await loadStaff()

  } catch (err: any) {
    console.error('❌ Error creating staff:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: 'Fahrlehrer konnte nicht erstellt werden.'
    })
  } finally {
    isCreatingStaff.value = false
  }
}

const editWorkingHours = (staff: any) => {
  console.log('Edit working hours for:', staff)
  // TODO: Implement working hours modal
}

// Typisierter Change-Handler für Checkbox (verhindert TS-Fehler mit $event.target)
const onCategoryToggle = (event: Event, staff: any, categoryCode: string) => {
  const input = event.target as HTMLInputElement | null
  const enabled = !!(input && input.checked)
  toggleCategoryPickup(staff, categoryCode, enabled)
}

// Lifecycle
onMounted(async () => {
  // Lade Features um Prüfung durchführen zu können
  await loadFeatures()
  await loadStaff()
})
</script>

<style scoped>
/* Custom styles for better UX */
.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.space-y-3 > * + * {
  margin-top: 0.75rem;
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}
</style>
