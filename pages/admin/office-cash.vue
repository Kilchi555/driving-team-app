<template>
  <div class="p-6">
    <!-- Page Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            🏦 Bürokassen-Verwaltung
          </h1>
          <p class="text-sm text-gray-600">
            Verwalten Sie mehrere Bürokassen und weisen Sie Staff-Verantwortlichkeiten zu
          </p>
        </div>
        
        <!-- Quick Actions -->
        <div class="flex space-x-3">
          <NuxtLink
            to="/admin/cash-control"
            class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            📊 Fahrlehrer-Kassen
          </NuxtLink>
          <button
            @click="refreshData"
            :disabled="isLoading"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            🔄 Aktualisieren
          </button>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="flex items-center">
        <svg class="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div>
          <h3 class="text-sm font-medium text-red-800">Fehler beim Laden</h3>
          <p class="text-sm text-red-700 mt-1">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <OfficeCashRegistersManager />

    <!-- Help Section -->
    <div class="mt-12 bg-blue-50 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-blue-900 mb-3">💡 Bürokassen-System</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
        <div>
          <h4 class="font-medium mb-2">Kassentypen:</h4>
          <ul class="space-y-1">
            <li>🏦 <strong>Hauptkasse:</strong> Zentrale Verwaltung aller Barzahlungen</li>
            <li>🏪 <strong>Empfangskasse:</strong> Für Anmeldungen und Nachzahlungen</li>
            <li>📋 <strong>Prüfungskasse:</strong> Spezielle Gebühren und Prüfungskosten</li>
            <li>🚨 <strong>Notfallkasse:</strong> Backup bei Fahrlehrer-Ausfall</li>
          </ul>
        </div>
        <div>
          <h4 class="font-medium mb-2">Berechtigungen:</h4>
          <ul class="space-y-1">
            <li>👑 <strong>Manager:</strong> Vollzugriff, Staff-Zuweisung</li>
            <li>⚙️ <strong>Operator:</strong> Ein-/Auszahlungen, Transaktionen</li>
            <li>👁️ <strong>Viewer:</strong> Nur Einsicht, keine Änderungen</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'

// Layout
definePageMeta({
  layout: 'admin'
  // Temporär ohne Middleware für Debugging
})

// Auth check
const authStore = useAuthStore()

// Composables
const { error, isLoading, loadOfficeRegisters } = useOfficeCashRegisters()

// Lifecycle
onMounted(async () => {
  console.log('🔍 Office cash page mounted, checking auth...')
  
  // Warte kurz auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  console.log('🔍 Auth state:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    hasProfile: authStore.hasProfile
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    console.log('❌ User not logged in, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Prüfe ob User Admin ist
  if (!authStore.isAdmin) {
    console.log('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  console.log('✅ Auth check passed, loading office cash...')
})

// Methods
const refreshData = async () => {
  await loadOfficeRegisters()
}
</script>

<style scoped>
/* Add any specific styles here */
</style>




