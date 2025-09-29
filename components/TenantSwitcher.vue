<template>
  <div class="relative">
    <!-- Tenant Switcher Button -->
    <button
      @click="showDropdown = !showDropdown"
      class="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
      </svg>
      <span>{{ currentTenant?.name || 'Fahrschule wählen' }}</span>
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="showDropdown"
      class="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50"
    >
      <div class="py-1">
        <!-- Current Tenant Info -->
        <div class="px-4 py-2 border-b border-gray-100">
          <div class="text-sm font-medium text-gray-900">
            {{ currentTenant?.name || 'Kein Tenant' }}
          </div>
          <div class="text-xs text-gray-500">
            {{ currentTenant?.slug || '' }}
          </div>
        </div>

        <!-- Tenant List -->
        <div class="max-h-64 overflow-y-auto">
          <button
            v-for="tenant in tenants"
            :key="tenant.id"
            @click="switchTenant(tenant)"
            :class="[
              'w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between',
              currentTenant?.id === tenant.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
            ]"
          >
            <div>
              <div class="font-medium">{{ tenant.name }}</div>
              <div class="text-xs text-gray-500">{{ tenant.slug }}</div>
            </div>
            <svg v-if="currentTenant?.id === tenant.id" class="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </button>
        </div>

        <!-- Actions -->
        <div class="border-t border-gray-100 py-1">
          <button
            @click="createNewTenant"
            class="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center"
          >
            <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Neuer Account erstellen
          </button>
          
          <button
            @click="refreshTenants"
            class="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center"
          >
            <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Aktualisieren
          </button>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div
      v-if="isLoading"
      class="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-md"
    >
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
// Icons werden direkt im Template verwendet

const router = useRouter()

// State
const showDropdown = ref(false)
const tenants = ref([])
const currentTenant = ref(null)
const isLoading = ref(false)

// Computed
const isAdmin = computed(() => {
  // Check if current user is admin
  return true // For now, assume admin
})

// Methods
const loadTenants = async () => {
  try {
    isLoading.value = true
    
    // For tenant admins, only load their own tenant
    const { data: userData } = await $fetch('/api/debug/auth-test')
    if (userData?.user?.role === 'admin' && userData?.user?.tenant_id) {
      // Load only the current tenant
      const { data, error } = await $fetch(`/api/tenants/${userData.user.tenant_id}`)
      if (error) throw new Error(error)
      
      tenants.value = data ? [data] : []
      currentTenant.value = data
    } else {
      // For super admins, load all tenants
      const { data, error } = await $fetch('/api/tenants/list')
      if (error) throw new Error(error)
      
      tenants.value = data || []
      
      // Set current tenant if not set
      if (!currentTenant.value && tenants.value.length > 0) {
        currentTenant.value = tenants.value[0]
      }
    }
    
  } catch (err) {
    console.error('Error loading tenants:', err)
    // Show error message to user
    tenants.value = []
    currentTenant.value = null
  } finally {
    isLoading.value = false
  }
}

const switchTenant = async (tenant) => {
  try {
    isLoading.value = true
    
    // Update current tenant
    currentTenant.value = tenant
    
    // Store in localStorage for persistence
    localStorage.setItem('currentTenant', JSON.stringify(tenant))
    
    // Close dropdown
    showDropdown.value = false
    
    // Refresh the page to load tenant-specific data
    await router.push(router.currentRoute.value.path)
    
  } catch (err) {
    console.error('Error switching tenant:', err)
  } finally {
    isLoading.value = false
  }
}

const createNewTenant = () => {
  showDropdown.value = false
  router.push('/tenant-register')
}

const refreshTenants = async () => {
  await loadTenants()
}

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  if (!event.target.closest('.relative')) {
    showDropdown.value = false
  }
}

// Lifecycle
onMounted(async () => {
  // Load current tenant from localStorage
  const storedTenant = localStorage.getItem('currentTenant')
  if (storedTenant) {
    try {
      currentTenant.value = JSON.parse(storedTenant)
    } catch (err) {
      console.warn('Error parsing stored tenant:', err)
    }
  }
  
  await loadTenants()
  
  // Add click outside listener
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>