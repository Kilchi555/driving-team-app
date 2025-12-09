<template>
  <div class="min-h-screen bg-gray-50">

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Page Header -->
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">
          Kassen
        </h2>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <LoadingLogo size="lg" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
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

      <!-- Tab Navigation -->
      <div v-else class="mb-6">
        <nav class="flex space-x-8" aria-label="Tabs">
          <button
            @click="activeTab = 'overview'"
            :class="[
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            📊 Gesamtübersicht
          </button>
          <button
            @click="activeTab = 'office'"
            :class="[
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'office'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            🏢 Bürokassen
            <span v-if="officeRegisters.length > 0" class="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
              {{ officeRegisters.length }}
            </span>
          </button>
          <button
            @click="activeTab = 'instructor'"
            :class="[
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'instructor'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            👨‍🏫 Fahrlehrer-Kassen
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div v-if="!isLoading && !error" class="tab-content">
        
        <!-- Gesamtübersicht Tab -->
        <div v-if="activeTab === 'overview'" class="tab-panel">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <!-- Total Balance Card -->
            <div class="bg-white rounded-lg shadow-sm border p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Bürokassen</p>
                  <p class="text-2xl font-bold text-blue-600">{{ officeRegisters.length }}</p>
                  <p class="text-xs text-gray-500">Aktive Kassen</p>
                </div>
                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span class="text-blue-600 text-xl">🏢</span>
                </div>
              </div>
            </div>

            <!-- Debug Info Card -->
            <div class="bg-white rounded-lg shadow-sm border p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Debug Info</p>
                  <p class="text-lg font-bold text-gray-900">{{ currentUser?.email || 'Kein User' }}</p>
                  <p class="text-xs text-gray-500">{{ currentUser?.tenant_id || 'Keine Tenant-ID' }}</p>
                </div>
                <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span class="text-yellow-600 text-xl">🔍</span>
                </div>
              </div>
            </div>

            <!-- Status Card -->
            <div class="bg-white rounded-lg shadow-sm border p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">System Status</p>
                  <p class="text-lg font-bold text-green-600">{{ isLoading ? 'Lädt...' : 'Bereit' }}</p>
                  <p class="text-xs text-gray-500">{{ error || 'Keine Fehler' }}</p>
                </div>
                <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span class="text-green-600 text-xl">✅</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bürokassen Tab -->
        <div v-if="activeTab === 'office'" class="tab-panel">
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-gray-900">Bürokassen</h3>
            </div>
            
            <div v-if="officeRegisters.length === 0" class="text-center py-12">
              <div class="text-gray-400 text-6xl mb-4">🏢</div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Noch keine Bürokassen</h3>
              <p class="text-gray-600 mb-4">
                Führen Sie zuerst die SQL-Migration aus: database_migration_multi_office_cash.sql
              </p>
            </div>
            
            <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div v-for="register in officeRegisters" :key="register.id" class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h4 class="font-medium text-gray-900">{{ register.name }}</h4>
                    <p class="text-sm text-gray-500">{{ register.location }}</p>
                  </div>
                  <div class="text-right">
                    <div class="text-xl font-bold text-gray-900">{{ formatCurrency(register.current_balance_rappen) }}</div>
                    <div class="text-xs text-gray-500">{{ register.register_type }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Fahrlehrer-Kassen Tab -->
        <div v-if="activeTab === 'instructor'" class="tab-panel">
          <AdminCashBalanceManager 
            v-if="currentUser"
            :current-user="currentUser"
          />
          
          <div v-else class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">Benutzer nicht gefunden</h3>
                <div class="mt-2 text-sm text-red-700">
                  Bitte loggen Sie sich erneut ein.
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>

import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useCurrentUser } from '~/composables/useCurrentUser'
import AdminCashBalanceManager from '~/components/admin/CashBalanceManager.vue'

// Layout
definePageMeta({
  middleware: 'admin',
  layout: 'admin'
})

// Composables
const { currentUser } = useCurrentUser()
const { 
  officeRegisters,
  totalBalance: totalOfficeBalance,
  isLoading: isLoadingOffice,
  error: officeError,
  loadOfficeRegisters
} = useOfficeCashRegisters()

// State
const activeTab = ref('overview')
const isLoading = ref(false)
const error = ref(null)

// Methods
const refreshAllData = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    await loadOfficeRegisters()
  } catch (err) {
    error.value = err.message || 'Fehler beim Laden der Daten'
    console.error('❌ Error refreshing cash data:', err)
  } finally {
    isLoading.value = false
  }
}

const formatCurrency = (rappen) => {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

// Debug current user and tenant
const debugCurrentState = async () => {
  logger.debug('🔍 DEBUG: Current state check')
  logger.debug('👤 Current user:', currentUser.value)
  
  if (currentUser.value) {
    logger.debug('🏢 User tenant_id:', currentUser.value.tenant_id)
    logger.debug('📧 User email:', currentUser.value.email)
    logger.debug('🎭 User role:', currentUser.value.role)
  }
  
  // Check what's in the database
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  logger.debug('🔑 Auth user:', user?.email)
  
  if (user) {
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('id, email, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()
    
    logger.debug('📊 DB user profile:', userProfile)
    logger.debug('❌ DB error:', error)
  }
}

// Auth check
const authStore = useAuthStore()

// Lifecycle
onMounted(async () => {
  logger.debug('🔍 Cash management fixed page mounted, checking auth...')
  
  // Warte kurz auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  logger.debug('🔍 Auth state:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    hasProfile: authStore.hasProfile
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    logger.debug('❌ User not logged in, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Prüfe ob User Admin ist
  if (!authStore.isAdmin) {
    logger.debug('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  logger.debug('✅ Auth check passed, loading cash management...')
  
  // Original onMounted logic
  await debugCurrentState()
  await refreshAllData()
})
</script>

<style scoped>
.tab-panel {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>




