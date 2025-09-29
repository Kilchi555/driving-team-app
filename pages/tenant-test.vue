<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900">
          Tenant Registration Test
        </h1>
        <p class="mt-2 text-lg text-gray-600">
          Testen Sie den kompletten Multi-Tenant-Setup
        </p>
      </div>

      <!-- Test Steps -->
      <div class="bg-white shadow rounded-lg p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          Test-Schritte
        </h2>
        <ol class="list-decimal list-inside space-y-2 text-gray-700">
          <li>Führen Sie die SQL-Migrationen aus (falls noch nicht geschehen)</li>
          <li>Erstellen Sie einen neuen Tenant über die Registrierung</li>
          <li>Testen Sie die Tenant-Isolation</li>
          <li>Wechseln Sie zwischen Tenants</li>
          <li>Überprüfen Sie, dass Daten korrekt gefiltert werden</li>
        </ol>
      </div>

      <!-- Current Status -->
      <div class="bg-white shadow rounded-lg p-6 mb-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">
          Aktueller Status
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 bg-blue-50 rounded-lg">
            <h3 class="font-medium text-blue-900">Datenbank-Migration</h3>
            <p class="text-sm text-blue-700">
              {{ migrationStatus }}
            </p>
          </div>
          <div class="p-4 bg-green-50 rounded-lg">
            <h3 class="font-medium text-green-900">Frontend-Code</h3>
            <p class="text-sm text-green-700">
              Alle Composables aktualisiert
            </p>
          </div>
        </div>
      </div>

      <!-- Test Actions -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Tenant Registration -->
        <div class="bg-white shadow rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Tenant Registrierung
          </h3>
          <p class="text-gray-600 mb-4">
            Erstellen Sie einen neuen Tenant und testen Sie die vollständige Funktionalität.
          </p>
          <NuxtLink
            to="/tenant-register"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            Neue Firma registrieren
          </NuxtLink>
        </div>

        <!-- Tenant List -->
        <div class="bg-white shadow rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Tenant-Verwaltung
          </h3>
          <p class="text-gray-600 mb-4">
            Zeigen Sie alle verfügbaren Tenants an und wechseln Sie zwischen ihnen.
          </p>
          <button
            @click="loadTenants"
            :disabled="isLoading"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <svg class="h-4 w-4 mr-2" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Tenants laden
          </button>
        </div>
      </div>

      <!-- Tenants List -->
      <div v-if="tenants.length > 0" class="mt-8 bg-white shadow rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          Verfügbare Tenants
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="tenant in tenants"
            :key="tenant.id"
            class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium text-gray-900">{{ tenant.name }}</h4>
                <p class="text-sm text-gray-500">{{ tenant.slug }}</p>
                <p class="text-xs text-gray-400">
                  {{ tenant.subscription_plan }} • {{ tenant.subscription_status }}
                </p>
              </div>
              <div class="flex space-x-2">
                <button
                  @click="switchToTenant(tenant)"
                  class="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Wechseln
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Test Results -->
      <div v-if="testResults" class="mt-8 bg-white shadow rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          Test-Ergebnisse
        </h3>
        <div class="space-y-2">
          <div
            v-for="(result, index) in testResults"
            :key="index"
            class="flex items-center space-x-2"
          >
            <div
              :class="[
                'w-4 h-4 rounded-full',
                result.success ? 'bg-green-500' : 'bg-red-500'
              ]"
            ></div>
            <span class="text-sm text-gray-700">{{ result.message }}</span>
          </div>
        </div>
      </div>

      <!-- SQL Commands -->
      <div class="mt-8 bg-white shadow rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">
          SQL-Migrationen (falls noch nicht ausgeführt)
        </h3>
        <div class="space-y-4">
          <div>
            <h4 class="font-medium text-gray-700 mb-2">1. Tenant-ID Spalten hinzufügen:</h4>
            <code class="block bg-gray-100 p-2 rounded text-sm">
              Führen Sie add_tenant_id_remaining_tables.sql aus
            </code>
          </div>
          <div>
            <h4 class="font-medium text-gray-700 mb-2">2. RLS Policies erstellen:</h4>
            <code class="block bg-gray-100 p-2 rounded text-sm">
              Führen Sie create_tenant_rls_policies.sql aus
            </code>
          </div>
          <div>
            <h4 class="font-medium text-gray-700 mb-2">3. Standard-Daten kopieren:</h4>
            <code class="block bg-gray-100 p-2 rounded text-sm">
              Führen Sie copy_default_data_to_tenant.sql aus
            </code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
// Icons werden direkt im Template verwendet

// Meta
definePageMeta({
  layout: 'minimal'
  // Kein middleware - Seite ist öffentlich zugänglich für Tests
})

// State
const tenants = ref([])
const isLoading = ref(false)
const testResults = ref([])
const migrationStatus = ref('Unbekannt')

// Methods
const loadTenants = async () => {
  try {
    isLoading.value = true
    const response = await $fetch('/api/tenants/list')
    
    if (response.success) {
      tenants.value = response.data || []
      testResults.value.push({
        success: true,
        message: `Tenants erfolgreich geladen: ${tenants.value.length} gefunden`
      })
    } else {
      testResults.value.push({
        success: false,
        message: `Fehler beim Laden der Tenants: ${response.error}`
      })
    }
  } catch (err) {
    console.error('Error loading tenants:', err)
    testResults.value.push({
      success: false,
      message: `Fehler beim Laden der Tenants: ${err.message}`
    })
  } finally {
    isLoading.value = false
  }
}

const switchToTenant = async (tenant) => {
  try {
    // Store in localStorage
    localStorage.setItem('currentTenant', JSON.stringify(tenant))
    
    testResults.value.push({
      success: true,
      message: `Zu Tenant gewechselt: ${tenant.name}`
    })
    
    // Refresh the page to load tenant-specific data
    await navigateTo('/dashboard')
  } catch (err) {
    console.error('Error switching tenant:', err)
    testResults.value.push({
      success: false,
      message: `Fehler beim Wechseln zu Tenant: ${err.message}`
    })
  }
}

const checkMigrationStatus = async () => {
  try {
    // Check if tenant_id columns exist
    const response = await $fetch('/api/debug/tenants')
    if (response.success) {
      migrationStatus.value = 'Migration erfolgreich ausgeführt'
    } else {
      migrationStatus.value = 'Migration noch nicht ausgeführt'
    }
  } catch (err) {
    migrationStatus.value = 'Status unbekannt'
  }
}

// Lifecycle
onMounted(async () => {
  await checkMigrationStatus()
  await loadTenants()
})
</script>
