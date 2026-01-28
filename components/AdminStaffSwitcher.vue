<template>
  <div v-if="canUseStaffSwitcher" class="admin-staff-switcher bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 p-2 shadow-lg backdrop-blur-sm">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
      <!-- Admin Navigation - nur für Admins -->
      <div v-if="isAdmin" class="flex items-center justify-center lg:justify-start">
        <NuxtLink
          to="/admin"
          class="group inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <svg class="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          Admin Dashboard
        </NuxtLink>
      </div>

      <!-- Staff Switcher -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex items-center justify-center">
          <div class="relative">
            <div class="relative">
              <select
                id="staff-select"
                v-model="selectedStaffId"
                @change="onStaffChange"
                class="appearance-none px-2 py-1 pr-10 bg-white border-2 border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 shadow-sm hover:shadow-md transition-all duration-200 min-w-[220px] cursor-pointer"
              >
                <option value="all">Alle Staff</option>
                <option
                  v-for="staff in staffList"
                  :key="staff.id"
                  :value="staff.id"
                >
                  {{ staff.first_name }} {{ staff.last_name }}
                </option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, watch } from 'vue'
import { useDatabaseQuery } from '~/composables/useDatabaseQuery'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { logger } from '~/utils/logger'

interface Staff {
  id: string
  first_name: string
  last_name: string
  email: string
}

// Props
const props = defineProps<{
  currentUser?: any
  currentStaffId?: string
}>()

// Emits
const emit = defineEmits<{
  staffChanged: [staffId: string | null]
}>()

// Composables - verwende currentUser aus Props oder fallback zu useCurrentUser
const { currentUser: fallbackCurrentUser } = useCurrentUser()
const currentUser = computed(() => props.currentUser || fallbackCurrentUser.value)

// State
const staffList = ref<Staff[]>([])
const selectedStaffId = ref<string>('all')
const isLoading = ref(false)

// Computed
const isAdmin = computed(() => currentUser.value?.role === 'admin')
const canUseStaffSwitcher = computed(() => 
  currentUser.value?.role === 'admin' || currentUser.value?.role === 'staff'
)

const selectedStaffName = computed(() => {
  if (selectedStaffId.value === 'all') return 'Alle'
  const staff = staffList.value.find(s => s.id === selectedStaffId.value)
  return staff ? `${staff.first_name} ${staff.last_name}` : 'Unbekannt'
})

const selectedStaffEmail = computed(() => {
  if (selectedStaffId.value === 'all') return ''
  const staff = staffList.value.find(s => s.id === selectedStaffId.value)
  return staff?.email || ''
})

// Methods
const loadStaffList = async () => {
  if (!canUseStaffSwitcher.value) return

  isLoading.value = true
  try {
    const { query } = useDatabaseQuery()
    
    // Get current user's tenant_id from props
    const tenantId = currentUser.value?.tenant_id
    
    if (!tenantId) {
      throw new Error('User has no tenant assigned')
    }

    logger.debug('🔍 AdminStaffSwitcher - Current tenant_id:', tenantId)

    const data = await query({
      action: 'select',
      table: 'users',
      select: 'id, first_name, last_name, email',
      filters: [
        { column: 'role', operator: 'eq', value: 'staff' },
        { column: 'is_active', operator: 'eq', value: true },
        { column: 'tenant_id', operator: 'eq', value: tenantId }
      ],
      order: { column: 'first_name', ascending: true }
    })

    staffList.value = data || []
    logger.debug('✅ Staff list loaded for tenant:', staffList.value.length, 'staff members')
  } catch (err) {
    console.error('❌ Error loading staff list:', err)
  } finally {
    isLoading.value = false
  }
}

const onStaffChange = () => {
  const staffId = selectedStaffId.value === 'all' ? null : selectedStaffId.value
  emit('staffChanged', staffId)
}

// Initialize
onMounted(() => {
  logger.debug('🔍 AdminStaffSwitcher mounted:', {
    isAdmin: isAdmin.value,
    canUseStaffSwitcher: canUseStaffSwitcher.value,
    currentUser: currentUser.value,
    userRole: currentUser.value?.role
  })
  
  // Wait for user to be loaded
  if (currentUser.value) {
    if (canUseStaffSwitcher.value) {
      logger.debug('🔥 Loading staff list for admin/staff')
      loadStaffList()
      
      // Set initial selection based on user role
      if (currentUser.value.role === 'staff') {
        // For staff users, select themselves by default
        selectedStaffId.value = currentUser.value.id
        emit('staffChanged', currentUser.value.id)
      } else if (currentUser.value.role === 'admin') {
        // For admin users, use provided currentStaffId or default to 'all'
        if (props.currentStaffId) {
          selectedStaffId.value = props.currentStaffId
        } else {
          selectedStaffId.value = 'all'
          emit('staffChanged', null)
        }
      }
    } else {
      logger.debug('⚠️ AdminStaffSwitcher: User cannot use staff switcher, not loading staff list')
    }
  } else {
    logger.debug('⏳ AdminStaffSwitcher: User not loaded yet, waiting...')
  }
})

// Watch for currentUser changes
watch(() => currentUser.value, (newUser) => {
  logger.debug('🔄 AdminStaffSwitcher - currentUser changed:', newUser)
  if (newUser && canUseStaffSwitcher.value) {
    logger.debug('🔥 User loaded, loading staff list for admin/staff')
    loadStaffList()
    
    // Set initial selection based on user role
    if (newUser.role === 'staff') {
      // For staff users, select themselves by default
      selectedStaffId.value = newUser.id
      emit('staffChanged', newUser.id)
    } else if (newUser.role === 'admin') {
      // For admin users, use provided currentStaffId or default to 'all'
      if (props.currentStaffId) {
        selectedStaffId.value = props.currentStaffId
      } else {
        selectedStaffId.value = 'all'
        emit('staffChanged', null)
      }
    }
  }
}, { immediate: true })

// Watch for currentStaffId changes
watch(() => props.currentStaffId, (newId) => {
  if (newId) {
    selectedStaffId.value = newId
  }
})
</script>

<style scoped>
.admin-staff-switcher {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

select:focus {
  outline: none;
}
</style>
