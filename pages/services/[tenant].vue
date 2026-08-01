<!-- pages/[slug]/services.vue - Service selection page -->
<template>
  <div 
    class="min-h-screen flex items-center justify-center p-4 transition-colors duration-300"
    :style="{ 
      background: `linear-gradient(to bottom right, ${tenantPrimaryColor}, ${tenantSecondaryColor})` 
    }"
  >
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
      <!-- Header -->
      <div class="bg-gray-100 text-white p-6 rounded-t-xl">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-700">{{ serviceHeader }}</h1>
        </div>
      </div>
      
      <!-- Navigation Back -->
      <div class="px-6 py-3 bg-gray-50 border-b">
        <button
          @click="goBack"
          class="text-gray-600 hover:text-gray-800 flex items-center text-sm"
        >
          ← Zurück
        </button>
      </div>

      <!-- Service Selection -->
      <div class="p-6">
        <!-- Loading State -->
        <div v-if="isLoading" class="space-y-4">
          <div class="w-full p-6 bg-gray-100 rounded-lg animate-pulse">
            <div class="h-20"></div>
          </div>
          <div class="w-full p-6 bg-gray-100 rounded-lg animate-pulse">
            <div class="h-20"></div>
          </div>
          <div class="w-full p-6 bg-gray-100 rounded-lg animate-pulse">
            <div class="h-20"></div>
          </div>
        </div>

        <!-- Service Buttons -->
        <div v-else class="space-y-4">
          <!-- Non-driving: single CTA into registration -->
          <template v-if="!isDrivingSchool">
            <button
              @click="goToGenericRegister"
              class="w-full p-6 bg-white border-2 rounded-lg hover:bg-blue-50 transition-all duration-200 text-left group"
              :style="{ borderColor: tenantPrimaryColor }"
            >
              <div class="flex items-center space-x-4">
                <div class="text-4xl">✨</div>
                <div class="flex-1">
                  <h3 class="text-xl font-semibold text-gray-900">Als {{ labels.client }} registrieren</h3>
                  <p class="text-sm text-gray-500 mt-1">{{ labels.bookAction }} und mehr</p>
                </div>
                <div class="text-2xl text-gray-400">→</div>
              </div>
            </button>
          </template>

          <template v-else>
          <!-- Fahrlektionen -->
          <button
            v-if="availableServices.includes('fahrlektion')"
            @click="selectService('fahrlektion')"
            class="w-full p-6 bg-white border-2 rounded-lg hover:bg-blue-50 transition-all duration-200 text-left group"
            :style="{ borderColor: tenantPrimaryColor }"
          >
            <div class="flex items-center space-x-4">
              <div class="text-4xl">🚗</div>
              <div class="flex-1">
                <h3 class="text-xl font-semibold text-gray-900">{{ labels.appointmentsPlural }}</h3>
              </div>
              <div class="text-2xl text-gray-400">→</div>
            </div>
          </button>

          <!-- Theorielektionen -->
          <button
            v-if="availableServices.includes('theorie')"
            @click="selectService('theorie')"
            class="w-full p-6 bg-white border-2 rounded-lg hover:bg-green-50 transition-all duration-200 text-left group"
            :style="{ borderColor: tenantSecondaryColor }"
          >
            <div class="flex items-center space-x-4">
              <div class="text-4xl">📚</div>
              <div class="flex-1">
                <h3 class="text-xl font-semibold text-gray-900">Theorielektionen</h3>
              </div>
              <div class="text-2xl text-gray-400">→</div>
            </div>
          </button>

          <!-- Beratung -->
          <button
            v-if="availableServices.includes('beratung')"
            @click="selectService('beratung')"
            class="w-full p-6 bg-white border-2 rounded-lg hover:bg-purple-50 transition-all duration-200 text-left group"
            :style="{ borderColor: tenantPrimaryColor }"
          >
            <div class="flex items-center space-x-4">
              <div class="text-4xl">💬</div>
              <div class="flex-1">
                <h3 class="text-xl font-semibold text-gray-900">Beratung</h3>
              </div>
              <div class="text-2xl text-gray-400">→</div>
            </div>
          </button>
          </template>

          <!-- No Services Available -->
          <div v-if="isDrivingSchool && availableServices.length === 0" class="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div class="flex items-start space-x-3">
              <div class="text-yellow-500 text-xl">⚠️</div>
              <div class="text-sm text-yellow-800">
                <p class="font-medium">Keine Dienstleistungen verfügbar</p>
                <p class="mt-1">Derzeit sind keine Services für {{ labels.businessNoun }} aktiv. Bitte kontaktiere {{ labels.businessNoun }} direkt.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'
import { navigateTo, useRoute } from '#app'
import { useTenant } from '~/composables/useTenant'
import { logger } from '~/utils/logger'
import { mergeTerminology, isDrivingSchoolBusinessType } from '~/composables/useTerminology'

// Ensure no auth middleware runs on this page
definePageMeta({
  middleware: []
})

const route = useRoute()

// Get tenant slug from URL parameter
const tenantSlug = computed(() => route.params.tenant as string)

// Tenant Management
const { loadTenant, tenantId, currentTenant, tenantPrimaryColor, tenantSecondaryColor } = useTenant()

const businessType = computed(() => currentTenant.value?.business_type || 'driving_school')
const isDrivingSchool = computed(() => isDrivingSchoolBusinessType(businessType.value))
const labels = computed(() => mergeTerminology(businessType.value))

// State for available services
const availableServices = ref<string[]>([])
const isLoading = ref(true)

// Computed
const activeTenantId = computed(() => {
  return tenantId.value || currentTenant.value?.id || null
})

const tenantName = computed(() => {
  return currentTenant.value?.name || tenantSlug.value?.replace('-', ' ') || labels.value.businessNoun
})

// Build dynamic service header text
const serviceHeader = computed(() => {
  return `Dienstleistungen von ${tenantName.value}`
})

// Methods
const selectService = (serviceType: string) => {
  logger.debug('🎯 Service selected:', serviceType)
  const url = `/register/${tenantSlug.value}?service=${serviceType}`
  logger.debug('🔗 Navigating to:', url)
  navigateTo(url)
}

const goToGenericRegister = () => {
  navigateTo(`/register/${tenantSlug.value}`)
}

const goBack = () => {
  // Try to go back in browser history
  // If there's no history (e.g., direct link), fall back to /auswahl
  const referrer = document.referrer
  
  if (referrer && referrer.includes(window.location.hostname)) {
    // Safe to use history.back() if referrer is from our domain
    window.history.back()
  } else if (window.history.length > 1) {
    // If there's history but no trusted referrer, still try back
    window.history.back()
  } else {
    // No history, fall back to selection page
    navigateTo('/auswahl')
  }
}

// Initialize
onMounted(async () => {
  logger.debug('🚀 Service page mounted!')
  logger.debug('📍 Current route:', route.path)
  logger.debug('🏷️ Tenant slug:', tenantSlug.value)
  
  isLoading.value = true
  
  // Load available services for the tenant identified by slug
  if (tenantSlug.value) {
    logger.debug('🏢 Loading services for tenant slug:', tenantSlug.value)
    try {
      await loadTenant(tenantSlug.value)

      // Non-driving schools: skip Fahrlektion/Theorie chooser → direct register
      if (!isDrivingSchool.value) {
        navigateTo(`/register/${tenantSlug.value}`)
        return
      }

      // Use API to get available services for this tenant
      const services = await $fetch('/api/tenants/available-services', {
        query: { slug: tenantSlug.value }
      }) as string[]
      
      logger.debug('✅ Available services:', services)
      
      // Auto-skip if only one service is available
      if (services.length === 1) {
        logger.debug('🎯 Only one service available, auto-redirecting to registration...')
        const url = `/register/${tenantSlug.value}?service=${services[0]}`
        logger.debug('🔗 Navigating to:', url)
        navigateTo(url)
        return
      }
      
      availableServices.value = services
      
    } catch (error) {
      logger.warn('⚠️ Error loading services:', error)
    } finally {
      isLoading.value = false
    }
  } else {
    isLoading.value = false
  }

  logger.debug('✅ Service selection page ready for:', tenantSlug.value)
})
</script>

