<!-- pages/auswahl.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
    <!-- Loading State -->
    <div v-if="isLoadingTenant" class="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-8 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
           :style="{ borderBottomColor: getPrimaryColorStyle() }"></div>
      <p class="text-gray-600">Lade Fahrschul-Informationen...</p>
    </div>
    
    <!-- Error State -->
    <div v-else-if="tenantError" class="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-8 text-center">
      <div class="text-red-600 mb-4">
        <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-gray-800 mb-2">Account nicht gefunden</h2>
      <p class="text-gray-600 mb-4">{{ tenantError }}</p>
      <button @click="retryLoadTenant" class="text-white px-4 py-2 rounded-lg transition-colors hover:opacity-80"
              :style="{ backgroundColor: getPrimaryColorStyle() }"
      >
        Erneut versuchen
      </button>
    </div>
    
    <!-- Main Content -->
    <div v-else class="bg-white rounded-xl shadow-2xl w-full max-w-4xl">
      
      <!-- Header -->
      <div 
        class="text-white p-8 rounded-t-xl text-center"
        :style="{ backgroundColor: tenantPrimaryColor }"
      >
        <img 
          :src="brandingLogoWide || ''"
          class="h-16 w-auto mx-auto mb-4" 
          :alt="brandingName || 'Logo'"
        >
        <h1 class="text-3xl font-bold mb-2">Willkommen bei {{ brandingName }}</h1>
        <p v-if="currentTenant?.address" class="text-sm opacity-90">{{ currentTenant.address }}</p>
      </div>

      <!-- Auswahl Buttons -->
      <div class="p-8">
        <p class="text-center text-gray-600 mb-8 text-lg">Wählen Sie den gewünschten Service:</p>
        
        <div class="grid md:grid-cols-2 gap-6">
          <!-- Dynamische, öffentlich buchbare Eventtypen -->
          <div class="group" v-for="et in publicEventTypes" :key="et.code">
            <button
              @click="goToService(et.code)"
              class="w-full h-full p-6 border-2 rounded-xl hover:shadow-lg transition-all duration-300 group-hover:scale-105"
              :style="{ borderColor: et.default_color || getPrimaryColorStyle() }"
            >
              <div class="text-center">
                <div class="text-4xl mb-4">{{ et.emoji || '📋' }}</div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">{{ et.name }}</h3>
                <p v-if="et.description" class="text-gray-600 text-sm mb-4">{{ et.description }}</p>
                <div>
                  <span 
                    class="inline-block text-white px-6 py-3 rounded-lg font-semibold transition-colors hover:opacity-80"
                    :style="{ backgroundColor: et.default_color || getPrimaryColorStyle() }"
                  >
                    Jetzt buchen →
                  </span>
                </div>
              </div>
            </button>
          </div>

          <!-- Produkte & Gutschein Option -->
          <div class="group" v-if="isProductSalesEnabled">
            <button
              @click="goToShop"
              class="w-full h-full p-6 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:shadow-lg transition-all duration-300 group-hover:scale-105"
            >
              <div class="text-center">
                <div class="text-4xl mb-4">🎁</div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">Produkte & Gutschein</h3>
                <p class="text-gray-600 text-sm mb-4">Lernmaterial, Gutscheine und Fahrschul-Produkte</p>
                <div>
                  <span class="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold group-hover:bg-orange-700 transition-colors">
                    Shop besuchen →
                  </span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <!-- Bereits registriert Link -->
        <div class="text-center mt-8 pt-6 border-t border-gray-200">
          <p class="text-gray-600 mb-3">Bereits registriert?</p>
          <button
            @click="goToLogin"
            class="font-semibold text-lg hover:underline transition-colors"
            :style="{ color: getPrimaryColorStyle() }"
          >
            → Hier anmelden
          </button>
        </div>
        
        <!-- Debug Info (nur in Development) -->
        <div v-if="isDevelopment" class="mt-4 space-y-4">
          <!-- Tenant Switcher für Development -->
          <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 class="text-sm font-semibold text-blue-800 mb-3">🔧 Development: Tenant Switcher</h3>
            <div class="flex flex-col space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-blue-700">Aktueller Tenant:</span>
                <span class="text-sm font-medium text-blue-900">{{ brandingName }} ({{ tenantSlug }})</span>
              </div>
              
              <!-- Tenant Dropdown -->
              <div class="relative">
                <button
                  @click="showTenantDropdown = !showTenantDropdown"
                  class="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span class="text-sm font-medium text-blue-900">Tenant wechseln</span>
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                
                <!-- Dropdown Menu -->
                <div
                  v-if="showTenantDropdown"
                  class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto"
                >
                  <button
                    v-for="tenant in availableTenants"
                    :key="tenant.id"
                    @click="switchToTenant(tenant)"
                    :class="[
                      'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between',
                      tenantId === tenant.id ? 'bg-blue-100 text-blue-900 font-semibold' : 'text-gray-700'
                    ]"
                  >
                    <div>
                      <div class="font-medium">{{ tenant.name }}</div>
                      <div 
                        class="text-xs"
                        :class="tenantId === tenant.id ? 'text-blue-700' : 'text-gray-500'"
                      >
                        {{ tenant.slug }}
                      </div>
                    </div>
                    <svg v-if="tenantId === tenant.id" class="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Debug Info -->
          <div class="p-4 bg-gray-100 rounded-lg text-xs text-gray-600">
            <p><strong>Debug Info:</strong></p>
            <p>Tenant: {{ brandingName }} ({{ tenantSlug }})</p>
            <p>ID: {{ tenantId }}</p>
            <p>URL: {{ currentUrl }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { navigateTo, useRoute } from '#app'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useTenant } from '~/composables/useTenant'
import { useDynamicBranding } from '~/composables/useDynamicBranding'
import { useFeatures } from '~/composables/useFeatures'
import { useEventTypes } from '~/composables/useEventTypes'

// Tenant Management
const {
  currentTenant,
  isLoading: isLoadingTenant,
  error: tenantError,
  tenantName,
  tenantSlug,
  tenantId,
  tenantLogo,
  tenantLogoWide,
  tenantPrimaryColor,
  tenantSecondaryColor,
  loadTenant,
  getTenantUrl,
  getAllTenants,
  setTenant
} = useTenant()

// Development Tenant Switcher
const showTenantDropdown = ref(false)
const availableTenants = ref<any[]>([])

// Dynamic Branding
const {
  brandingName,
  brandingLogo,
  brandingLogoWide,
  getPrimaryColorStyle,
  getSecondaryColorStyle
} = useDynamicBranding()

// Development check
const isDevelopment = process.dev

// Current URL for debug
const route = useRoute()
const currentUrl = computed(() => {
  if (process.server) return ''
  return window.location.href
})

// Feature flags
const { isLoading: isLoadingFeatures, load: loadFeatures, isEnabled } = useFeatures()
const isProductSalesEnabled = computed(() => isEnabled('product_sales_enabled', false))
const { loadEventTypes } = useEventTypes()
const publicEventTypes = ref<any[]>([])

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    showTenantDropdown.value = false
  }
}

// Load tenant on mount
onMounted(async () => {
  await loadTenant()
  await loadFeatures(tenantId.value)
  // Lade öffentlich buchbare Eventtypen (public_bookable=true)
  const all = await loadEventTypes([], true)
  publicEventTypes.value = (all as any[]).filter(et => et.public_bookable)
  
  // Load available tenants for development switcher
  if (isDevelopment) {
    availableTenants.value = await getAllTenants()
  }
  
  // Add click outside listener for dropdown
  if (process.client) {
    document.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (process.client) {
    document.removeEventListener('click', handleClickOutside)
  }
})

// Retry function
const retryLoadTenant = async () => {
  await loadTenant()
}

// Development: Switch to different tenant
const switchToTenant = async (tenant: any) => {
  console.log('🔄 Switching to tenant:', tenant.name)
  
  // Close dropdown
  showTenantDropdown.value = false
  
  // Set new tenant
  setTenant(tenant)
  
  // Reload the page with new tenant parameter
  const newUrl = new URL(window.location.href)
  newUrl.searchParams.set('tenant', tenant.slug)
  
  // Navigate to new URL
  window.location.href = newUrl.toString()
}

// Navigation functions with tenant context
const goToFahrlektionen = () => {
  const tenantParam = tenantSlug.value || 'driving-team'
  const url = `/register?service=fahrlektion&tenant=${tenantParam}`
  console.log('🚗 Navigating to:', url)
  navigateTo(url)
}

const goToService = (code: string) => {
  const tenantParam = tenantSlug.value || 'driving-team'
  const url = `/register?service=${encodeURIComponent(code)}&tenant=${tenantParam}`
  navigateTo(url)
}

const goToTheorie = () => {
  const tenantParam = tenantSlug.value || 'driving-team'
  const url = `/register?service=theorie&tenant=${tenantParam}`
  console.log('📚 Navigating to:', url)
  navigateTo(url)
}

const goToBeratung = () => {
  const tenantParam = tenantSlug.value || 'driving-team'
  const url = `/register?service=beratung&tenant=${tenantParam}`
  console.log('💬 Navigating to:', url)
  navigateTo(url)
}

const goToShop = () => {
  const tenantParam = tenantSlug.value || 'driving-team'
  const url = `/shop?tenant=${tenantParam}`
  console.log('🎁 Navigating to:', url)
  navigateTo(url)
}

const goToLogin = () => {
  const tenantParam = tenantSlug.value || 'driving-team'
  const url = `/login/${tenantParam}`
  console.log('🔐 Navigating to:', url)
  navigateTo(url)
}
</script>