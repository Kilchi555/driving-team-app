<!-- pages/[slug]/services.vue - Service selection page -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
      <!-- Header -->
      <div class="bg-gray-100 text-white p-6 rounded-t-xl">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-700">Dienstleistung von {{ tenantName }} auswählen</h1>
        </div>
      </div>
      
      <!-- Navigation Back -->
      <div class="px-6 py-3 bg-gray-50 border-b">
        <button
          @click="goBack"
          class="text-gray-600 hover:text-gray-800 flex items-center text-sm"
        >
          ← Zurück zur Auswahl
        </button>
      </div>

      <!-- Service Selection -->
      <div class="p-6">
        <div class="space-y-4">
          <!-- Fahrlektionen -->
          <button
            @click="selectService('fahrlektion')"
            class="w-full p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-left group"
          >
            <div class="flex items-center space-x-4">
              <div class="text-4xl">🚗</div>
              <div class="flex-1">
                <h3 class="text-xl font-semibold text-gray-900 group-hover:text-blue-700">Fahrlektionen</h3>
                <p class="text-gray-600 mt-1">Praktische Fahrlektionen für alle Kategorien</p>
              </div>
              <div class="text-2xl text-gray-400 group-hover:text-blue-500">→</div>
            </div>
          </button>

          <!-- Theorielektionen -->
          <button
            @click="selectService('theorie')"
            class="w-full p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all duration-200 text-left group"
          >
            <div class="flex items-center space-x-4">
              <div class="text-4xl">📚</div>
              <div class="flex-1">
                <h3 class="text-xl font-semibold text-gray-900 group-hover:text-green-700">Theorielektionen</h3>
                <p class="text-gray-600 mt-1">Theorelektionen für effizientes Lernen</p>
              </div>
              <div class="text-2xl text-gray-400 group-hover:text-green-500">→</div>
            </div>
          </button>

          <!-- Beratung -->
          <button
            @click="selectService('beratung')"
            class="w-full p-6 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 text-left group"
          >
            <div class="flex items-center space-x-4">
              <div class="text-4xl">💬</div>
              <div class="flex-1">
                <h3 class="text-xl font-semibold text-gray-900 group-hover:text-purple-700">Beratung</h3>
                <p class="text-gray-600 mt-1">Persönliche Beratung zur Fahrausbildung</p>
              </div>
              <div class="text-2xl text-gray-400 group-hover:text-purple-500">→</div>
            </div>
          </button>
        </div>

        <!-- Info Box -->
        <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-start space-x-3">
            <div class="text-blue-500 text-xl">ℹ️</div>
            <div class="text-sm text-blue-800">
              <p class="font-medium">Hinweis:</p>
              <p>Nach der Service-Auswahl werden Sie zur Registrierung weitergeleitet. Dort können Sie Ihre persönlichen Daten eingeben und einen Account erstellen.</p>
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

// Ensure no auth middleware runs on this page
definePageMeta({
  middleware: []
})

const route = useRoute()

// Get tenant slug from URL parameter
const tenantSlug = computed(() => route.params.tenant as string)

// Tenant Management
const { loadTenant, tenantId, currentTenant } = useTenant()

// Computed
const activeTenantId = computed(() => {
  return tenantId.value || currentTenant.value?.id || null
})

const tenantName = computed(() => {
  return currentTenant.value?.name || tenantSlug.value?.replace('-', ' ') || 'dieser Fahrschule'
})

// Methods
const selectService = (serviceType: string) => {
  console.log('🎯 Service selected:', serviceType)
  const url = `/register/${tenantSlug.value}?service=${serviceType}`
  console.log('🔗 Navigating to:', url)
  navigateTo(url)
}

const goBack = () => {
  navigateTo('/auswahl')
}

// Initialize
onMounted(async () => {
  console.log('🚀 Service page mounted!')
  console.log('📍 Current route:', route.path)
  console.log('🏷️ Tenant slug:', tenantSlug.value)
  
  // Load tenant if tenant slug is provided
  if (tenantSlug.value) {
    console.log('🏢 Loading tenant from URL parameter:', tenantSlug.value)
    try {
      await loadTenant(tenantSlug.value)
      console.log('✅ Tenant loaded successfully')
    } catch (error) {
      console.warn('⚠️ Failed to load tenant, but continuing with slug:', error)
      // Don't redirect - just continue with the slug
      // The register page will handle tenant loading properly
    }
  }

  console.log('✅ Service selection page ready for:', tenantSlug.value)
})
</script>
