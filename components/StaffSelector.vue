<template>
  <div class="staff-selector">
    <!-- Kollapsible Header -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg">
      
      <!-- Klickbarer Header -->
      <div 
        class="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-100 transition-colors"
        @click="toggleExpanded"
      >
        <div class="flex items-center gap-2">
          <span class="text-lg">👥</span>
          <label class="text-sm font-semibold text-gray-900 cursor-pointer">
            Team-Mitglieder einladen
          </label>
          <span v-if="invitedStaffIds.length > 0" class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
            {{ invitedStaffIds.length }}
          </span>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- Schnell-Aktionen (nur wenn expanded und Staff verfügbar) -->
          <div v-if="isExpanded && availableStaff.length > 0" class="flex gap-1">
            <button
              @click.stop="inviteAll"
              :disabled="disabled"
              class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
            >
              Alle
            </button>
            <button
              @click.stop="clearAll"
              :disabled="disabled"
              class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Keine
            </button>
          </div>
          
          <!-- Expand/Collapse Icon -->
          <svg 
            class="w-4 h-4 text-gray-600 transition-transform duration-200"
            :class="{ 'rotate-180': isExpanded }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

    <!-- Ausklappbarer Inhalt -->
    <div 
      v-if="isExpanded"
      class="border-t border-blue-200 transition-all duration-300 ease-in-out"
    >
      
      <!-- Loading State -->
      <div v-if="isLoading" class="p-4 animate-pulse">
        <div class="h-10 bg-gray-200 rounded mb-3"></div>
        <div class="space-y-2">
          <div v-for="i in 3" :key="i" class="h-8 bg-gray-100 rounded"></div>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 m-3">
        ❌ {{ error }}
      </div>

      <!-- Hauptbereich -->
      <div v-if="!isLoading" class="bg-white">
        
        <!-- Suchfeld -->
        <div v-if="availableStaff.length > 0" class="p-3 border-b border-gray-200">
          <div class="relative">
            <input
              ref="searchInput"
              v-model="searchQuery"
              type="text"
              :placeholder="placeholder"
              :disabled="disabled"
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
            />
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Staff Liste -->
        <div class="max-h-64 overflow-y-auto">
          
          <!-- Keine Staff-Mitglieder verfügbar -->
          <div v-if="availableStaff.length === 0" class="p-4 text-center text-gray-500 text-sm">
            <div class="mb-2">👥</div>
            <div>Keine verfügbaren Team-Mitglieder</div>
          </div>

          <!-- Staff-Liste -->
          <div v-else-if="staffList.length === 0 && searchQuery" class="p-4 text-center text-gray-500 text-sm">
            <div class="mb-2">🔍</div>
            <div>Keine Team-Mitglieder gefunden für "{{ searchQuery }}"</div>
          </div>

          <!-- Staff Items -->
          <div v-else class="divide-y divide-gray-100">
            <div
              v-for="staff in staffList"
              :key="staff.id"
              class="flex items-center p-3 hover:bg-gray-50 transition-colors cursor-pointer"
              @click="toggleStaff(staff.id)"
            >
              <!-- Checkbox -->
              <div class="flex-shrink-0 mr-3">
                <input
                  type="checkbox"
                  :checked="invitedStaffIds.includes(staff.id)"
                  :disabled="disabled"
                  @click.stop="toggleStaff(staff.id)"
                  class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
              </div>

              <!-- Staff Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="text-sm font-medium text-gray-900 truncate">
                      {{ staff.first_name }} {{ staff.last_name }}
                    </div>
                    <div class="text-xs text-gray-500 truncate">
                      {{ staff.email }}
                    </div>
                  </div>
                  
                  <!-- Status Badge - nur Staff -->
                  <div class="flex-shrink-0 ml-2">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Staff
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Liste Statistiken -->
          <div v-if="availableStaff.length > 0" class="bg-gray-50 border-t border-gray-200 px-3 py-2">
            <div class="text-xs text-gray-500 text-center">
              <span class="font-medium">{{ invitedStaffIds.length }}</span> von {{ staffList.length }} ausgewählt
              <span v-if="searchQuery"> • Gefiltert nach "{{ searchQuery }}"</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Ausgewählte Staff-Mitglieder Übersicht -->
    <div v-if="invitedStaffIds.length > 0" class="mt-3">
      <div class="text-xs font-medium text-gray-700 m-2">
        Eingeladene Team-Mitglieder ({{ invitedStaffIds.length }}):
      </div>
      <div class="flex flex-wrap gap-1 m-2">
        <span
          v-for="staffId in invitedStaffIds"
          :key="staffId"
          class="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
        >
          {{ getStaffName(staffId) }}
          <button
            v-if="!disabled"
            @click="toggleStaff(staffId)"
            class="ml-1 hover:text-blue-600"
          >
            ×
          </button>
        </span>
      </div>
    </div>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Staff Interface - nur Staff, keine Admins
interface Staff {
  id: string
  first_name: string
  last_name: string
  email: string
  role: 'staff' // Nur Staff
  is_active: boolean
}

// Props
interface Props {
  modelValue?: string[] // Array of staff IDs
  currentUser?: any
  disabled?: boolean
  placeholder?: string
  autoLoad?: boolean
  excludeCurrentUser?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  disabled: false,
  placeholder: 'Team-Mitglied suchen (Name oder E-Mail)...',
  autoLoad: true,
  excludeCurrentUser: true
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [staffIds: string[]]
  'staff-selected': [staff: Staff]
  'staff-removed': [staffId: string]
  'selection-changed': [staffIds: string[], staffMembers: Staff[]]
}>()

// State
const searchQuery = ref('')
const availableStaff = ref<Staff[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const searchInput = ref<HTMLInputElement>()
const isExpanded = ref(false) // NEU: Expanded State

// Computed
const invitedStaffIds = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value)
})

const staffList = computed(() => {
  if (!searchQuery.value) {
    return availableStaff.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return availableStaff.value.filter(staff =>
    staff.first_name?.toLowerCase().includes(query) ||
    staff.last_name?.toLowerCase().includes(query) ||
    staff.email?.toLowerCase().includes(query)
  )
})

// Supabase Types
interface UserFromDB {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: 'client' | 'staff' | 'admin'
  is_active: boolean
}

// Methods
const loadStaff = async () => {
  if (isLoading.value) return
  isLoading.value = true
  error.value = null
  
  try {
    console.log('👥 StaffSelector: Loading staff members...')
    const supabase = getSupabase()

    // Get current user's tenant_id
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', currentUser?.id)
      .single()
    const tenantId = userProfile?.tenant_id
    
    if (!tenantId) {
      throw new Error('User has no tenant assigned')
    }

    console.log('🔍 StaffSelector - Current tenant_id:', tenantId)

    let query = supabase
      .from('users')
      .select('id, first_name, last_name, email, role, is_active')
      .eq('role', 'staff')  // Nur Staff, keine Admins
      .eq('is_active', true)
      .eq('tenant_id', tenantId) // Filter by current tenant
      .order('first_name')

    // Aktuellen User ausschließen falls gewünscht
    if (props.excludeCurrentUser && props.currentUser?.id) {
      query = query.neq('id', props.currentUser.id)
    }

    const { data, error: fetchError } = await query

    if (fetchError) throw fetchError
    
    const typedStaff: Staff[] = (data || []).map((user: UserFromDB) => ({
      id: user.id,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      role: 'staff', // Immer 'staff' da wir nur Staff laden
      is_active: user.is_active
    }))
    
    availableStaff.value = typedStaff
    console.log('✅ Staff members loaded for tenant:', availableStaff.value.length)

  } catch (err: any) {
    console.error('❌ StaffSelector: Error loading staff:', err)
    error.value = err.message || 'Fehler beim Laden der Team-Mitglieder'
    availableStaff.value = []
  } finally {
    isLoading.value = false
  }
}

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  console.log('🔄 StaffSelector expanded:', isExpanded.value)
  
  // Auto-load when expanded for the first time
  if (isExpanded.value && props.autoLoad && availableStaff.value.length === 0) {
    console.log('📚 Auto-loading staff on first expand')
    loadStaff()
  }
}

const toggleStaff = (staffId: string) => {
  if (props.disabled) return
  
  const currentIds = [...invitedStaffIds.value]
  const index = currentIds.indexOf(staffId)
  
  if (index > -1) {
    // Entfernen
    currentIds.splice(index, 1)
    console.log('➖ Staff removed from invite list:', staffId)
    emit('staff-removed', staffId)
  } else {
    // Hinzufügen
    currentIds.push(staffId)
    const staff = availableStaff.value.find(s => s.id === staffId)
    console.log('➕ Staff added to invite list:', staffId)
    if (staff) {
      emit('staff-selected', staff)
    }
  }
  
  invitedStaffIds.value = currentIds
  
  // Ausgewählte Staff-Objekte für Event
  const selectedStaff = availableStaff.value.filter(s => currentIds.includes(s.id))
  emit('selection-changed', currentIds, selectedStaff)
}

const inviteAll = () => {
  if (props.disabled) return
  
  const allIds = staffList.value.map(s => s.id)
  invitedStaffIds.value = allIds
  
  console.log('👥 All staff invited:', allIds.length, 'staff members')
  emit('selection-changed', allIds, staffList.value)
}

const clearAll = () => {
  if (props.disabled) return
  
  invitedStaffIds.value = []
  console.log('🗑️ All team invites cleared')
  emit('selection-changed', [], [])
}

const getStaffName = (staffId: string): string => {
  const staff = availableStaff.value.find(s => s.id === staffId)
  if (!staff) return 'Unbekannt'
  return `${staff.first_name} ${staff.last_name}`.trim()
}

const resetSelection = () => {
  invitedStaffIds.value = []
  searchQuery.value = ''
  isExpanded.value = false
  console.log('🔄 StaffSelector: Selection reset')
}

// Watchers
watch(() => props.currentUser, async (newUser) => {
  if (newUser && props.autoLoad) {
    await loadStaff()
  }
}, { immediate: true })

// Lifecycle
onMounted(() => {
  console.log('👥 StaffSelector mounted, autoLoad:', props.autoLoad)
  
  if (props.autoLoad) {
    console.log('🔄 Auto-loading staff on mount')
    loadStaff()
  } else {
    console.log('🚫 Auto-load disabled, waiting for user action')
  }
})

// Expose methods for parent components
defineExpose({
  loadStaff,
  inviteAll,
  clearAll,
  toggleStaff
})
</script>

<style scoped>
/* Custom scrollbar */
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

/* Smooth transitions */
.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
}

/* Focus states for accessibility */
input:focus {
  outline: none;
}

/* Checkbox styling */
input[type="checkbox"]:checked {
  background-color: #3b82f6;
  border-color: #3b82f6;
}

input[type="checkbox"]:focus {
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}
</style>