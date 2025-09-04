<!-- pages/staff/cash-control.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-4">
            <NuxtLink
              to="/dashboard"
              class="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
            </NuxtLink>
            <h1 class="text-xl font-semibold text-gray-900">Meine Kassenübersicht</h1>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Lade Kassenübersicht...</p>
        </div>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <svg class="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-medium text-red-800">Fehler beim Laden der Daten</h3>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
        <div class="mt-4">
          <button
            @click="retryLoad"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <div v-else-if="currentUser" class="space-y-6">
        <!-- Staff Cash Balance -->
        <StaffCashBalance :current-user="currentUser" />
      </div>

      <div v-else class="text-center py-12">
        <div class="text-4xl mb-4">👤</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Benutzer nicht gefunden</h3>
        <p class="text-gray-600">Bitte melden Sie sich erneut an.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCurrentUser } from '~/composables/useCurrentUser'

// Page metadata
definePageMeta({
  layout: 'default'
})

// Get current user
const { currentUser, fetchCurrentUser } = useCurrentUser()

// State
const isLoading = ref(true)
const error = ref(null)

// Load user data on mount
onMounted(async () => {
  await loadData()
})

// Load data
const loadData = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    await fetchCurrentUser()
    
    if (!currentUser.value) {
      error.value = 'Benutzer konnte nicht geladen werden'
    }
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = 'Fehler beim Laden der Benutzerdaten: ' + err.message
  } finally {
    isLoading.value = false
  }
}

// Retry loading
const retryLoad = async () => {
  await loadData()
}
</script>
