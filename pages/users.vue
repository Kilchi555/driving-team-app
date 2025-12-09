<!-- pages/users.vue - Benutzerverwaltung mit Tabs -->
<template>
  <!-- Loading State -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-[100svh]">
    <LoadingLogo size="2xl" />
  </div>

  <!-- Error State -->
  <div v-else-if="userError" class="min-h-[100svh] flex items-center justify-center">
    <div class="text-center max-w-md p-6 bg-red-50 rounded-lg">
      <h2 class="text-xl font-bold text-red-800 mb-4">Fehler</h2>
      <p class="text-red-600 mb-4">{{ userError }}</p>
      <button 
        @click="navigateTo('/')" 
        class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Zum Login
      </button>
    </div>
  </div>

  <!-- Main Content -->
  <div v-else-if="currentUser" class="h-[100svh] flex flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b p-4">
      <div class="flex items-center justify-between">
        <!-- Back Button & Title -->
        <div class="flex items-center gap-4">
          <button 
            @click="goBack"
            :class="[
              'text-2xl transition-colors duration-200',
              isNavigating 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-600 hover:text-gray-800 cursor-pointer'
            ]"
            :disabled="isNavigating"
          >
            {{ isNavigating ? '⟳' : '←' }}
          </button>
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
            {{ isNavigating ? 'Lade...' : 'Benutzerverwaltung' }}
          </h1>
        </div>

        <!-- Add User Button (nur für Admins) -->
        <button 
          v-if="currentUser.role === 'admin'"
          @click="addNewUser"
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          + Neu
        </button>
      </div>

      <!-- Tab Navigation -->
      <div class="mt-4">
        <div class="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            ]"
          >
            {{ tab.name }}
            <span v-if="tab.count !== undefined" class="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
              {{ tab.count }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Kunden Tab -->
      <div v-if="activeTab === 'customers'" class="h-full">
        <CustomersTab 
          :current-user="currentUser"
          @user-updated="handleUserUpdated"
        />
      </div>

      <!-- Fahrlehrer Tab -->
      <div v-if="activeTab === 'staff'" class="h-full">
        <StaffTab 
          :current-user="currentUser"
          :tenant-settings="tenantSettings"
          @settings-updated="handleSettingsUpdated"
        />
      </div>

      <!-- Admins Tab -->
      <div v-if="activeTab === 'admins'" class="h-full">
        <AdminsTab 
          :current-user="currentUser"
          @user-updated="handleUserUpdated"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, onMounted, computed } from 'vue'
import { navigateTo } from '#app'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { getSupabase } from '~/utils/supabase'
import LoadingLogo from '~/components/LoadingLogo.vue'
import CustomersTab from '~/components/users/CustomersTab.vue'
import StaffTab from '~/components/users/StaffTab.vue'
import AdminsTab from '~/components/users/AdminsTab.vue'

// Supabase client
const supabase = getSupabase()

// Composables
const { currentUser, fetchCurrentUser, isLoading: isUserLoading, userError } = useCurrentUser()

// Local state
const activeTab = ref('customers')
const isNavigating = ref(false)
const tenantSettings = ref<any>({})

// Tab configuration
const tabs = computed(() => {
  const baseTabs = [
    { id: 'customers', name: 'Kunden', count: undefined },
    { id: 'staff', name: 'Fahrlehrer', count: undefined },
  ]
  
  // Admins Tab nur für Admins
  if (currentUser.value?.role === 'admin') {
    baseTabs.push({ id: 'admins', name: 'Admins', count: undefined })
  }
  
  return baseTabs
})

// Navigation functions
const goBack = async () => {
  if (isNavigating.value) return
  
  try {
    isNavigating.value = true
    logger.debug('🔙 Navigating back to dashboard...')
    
    await navigateTo('/dashboard', { replace: true })
  } catch (error) {
    console.error('❌ Navigation failed:', error)
    window.location.href = '/dashboard'
  } finally {
    setTimeout(() => {
      isNavigating.value = false
    }, 1000)
  }
}

const addNewUser = () => {
  logger.debug('🚀 Opening add user modal')
  // TODO: Implement add user modal
}

const handleUserUpdated = (updateData: any) => {
  logger.debug('📡 User updated:', updateData)
  // Refresh data if needed
}

const handleSettingsUpdated = (settings: any) => {
  logger.debug('📡 Settings updated:', settings)
  tenantSettings.value = { ...tenantSettings.value, ...settings }
}

// Load tenant settings
const loadTenantSettings = async () => {
  try {
    if (!currentUser.value) return

    const { data, error } = await supabase
      .from('tenant_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', currentUser.value.tenant_id)

    if (error) throw error

    // Convert array to object for easy access
    const settings: any = {}
    data?.forEach(setting => {
      settings[setting.setting_key] = setting.setting_value
    })

    tenantSettings.value = settings
    logger.debug('✅ Tenant settings loaded:', settings)
  } catch (err) {
    console.error('❌ Error loading tenant settings:', err)
  }
}

// Computed
const isLoading = computed(() => isUserLoading.value)

// Lifecycle
onMounted(async () => {
  await fetchCurrentUser()
  
  if (userError.value || !currentUser.value) {
    await navigateTo('/')
    return
  }

  // Admin-only: Staffs haben hier keine Tabs, weiterleiten
  if (currentUser.value.role !== 'admin') {
    await navigateTo('/dashboard')
    return
  }

  // Load tenant settings
  await loadTenantSettings()
})

// Admin layout and middleware (ensure only admins access this route)
definePageMeta({ middleware: 'admin', layout: 'admin' })
</script>

<style scoped>
/* Tab transitions */
.tab-content {
  transition: all 0.3s ease-in-out;
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .flex-1 {
    min-height: 0;
  }
}
</style>
