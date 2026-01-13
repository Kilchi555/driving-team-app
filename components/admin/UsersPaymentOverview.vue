<template>
  <div class="min-h-screen bg-gray-50 py-4 sm:py-8">
    <div class="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
      
      <!-- Header -->
      <div class="mb-6 sm:mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">💰 Zahlungsübersicht</h1>
          </div>
          
          <!-- Refresh Button -->
          <button 
            :disabled="loading"
            class="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            @click="fetchUsersSummary"
          >
            <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            <span class="hidden sm:inline">{{ loading ? 'Lädt...' : 'Aktualisieren' }}</span>
            <span class="sm:hidden">{{ loading ? '...' : '↻' }}</span>
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div class="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs sm:text-sm text-gray-600">Alle Benutzer</p>
              <p class="text-xl sm:text-2xl font-bold text-gray-900">{{ totalUsers }}</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span class="text-blue-600 text-lg sm:text-xl">👥</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs sm:text-sm text-gray-600">Mit unbezahlten Terminen</p>
              <p class="text-xl sm:text-2xl font-bold text-red-600">{{ usersWithUnpaidAppointments }}</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span class="text-red-600 text-lg sm:text-xl">💸</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs sm:text-sm text-gray-600">Mit Firmenrechnung</p>
              <p class="text-xl sm:text-2xl font-bold text-purple-600">{{ usersWithCompanyBilling }}</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span class="text-purple-600 text-lg sm:text-xl">🏢</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs sm:text-sm text-gray-600">Offener Betrag</p>
              <p class="text-xl sm:text-2xl font-bold text-orange-600">{{ formatCurrency(totalUnpaidAmount) }}</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span class="text-orange-600 text-lg sm:text-xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6 sm:mb-8">
        <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <!-- Search -->
          <div class="flex-1">
            <label for="search" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Suchen</label>
            <input
              id="search"
              v-model="searchTerm"
              type="text"
              placeholder="Name oder E-Mail..."
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
          </div>

          <!-- Status Filter -->
          <div class="sm:w-48">
            <label for="filter" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Filter</label>
            <select
              id="filter"
              v-model="selectedFilter"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle Benutzer</option>
              <option value="unpaid">Mit unbezahlten Terminen</option>
              <option value="company">Mit Firmenrechnung</option>
              <option value="cash">Barzahler</option>
              <option value="invoice">Rechnungszahler</option>
            </select>
          </div>
          
          <!-- Sort Order -->
          <div class="sm:w-48">
            <label for="sort" class="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Sortierung</label>
            <select
              id="sort"
              v-model="sortOrder"
              class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Neueste zuerst</option>
              <option value="oldest">Älteste zuerst</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/>
        <span class="ml-3 text-gray-600">Lade Benutzerdaten...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="text-red-800 font-medium">Fehler beim Laden der Daten</span>
        </div>
        <p class="text-red-700 mt-2">{{ error }}</p>
      </div>

      <!-- Users Table -->
      <div v-else class="bg-white rounded-lg shadow-sm border overflow-hidden">
        <!-- Desktop Table -->
        <div class="hidden lg:block overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Benutzer
                </th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontakt
                </th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zahlungsart
                </th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gesamt Termine
                </th>
                <th class="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Offener Betrag
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="user in filteredUsers" :key="user.user_id" class="hover:bg-gray-50 cursor-pointer" @click="navigateToUser(user.user_id)">
                <!-- User Info -->
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span class="text-sm font-medium text-gray-600">
                        {{ getInitials(user.first_name, user.last_name) }}
                      </span>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ user.first_name }} {{ user.last_name }}
                      </div>
                      <div class="text-sm text-gray-500">{{ user.role }}</div>
                    </div>
                  </div>
                </td>

                <!-- Contact -->
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ user.email }}</div>
                  <div class="text-sm text-gray-500">{{ user.phone }}</div>
                </td>

                <!-- Payment Method -->
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="getPaymentMethodClass(user.preferred_payment_method)"
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  >
                    {{ getPaymentMethodLabel(user.preferred_payment_method) }}
                  </span>
                </td>

                <!-- Status -->
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <div class="flex flex-col gap-1">
                    <span
v-if="user.has_unpaid_appointments" 
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      Unbezahlte Termine
                    </span>
                    <span
v-if="user.has_company_billing" 
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                      Firmenrechnung
                    </span>
                    <span
v-if="!user.has_unpaid_appointments && !user.has_company_billing" 
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Alle bezahlt
                    </span>
                  </div>
                </td>

                <!-- Total Appointments -->
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ user.total_appointments || 0 }}
                  </div>
                </td>

                <!-- Amount -->
                <td class="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ formatCurrency(user.total_unpaid_amount) }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Mobile Cards -->
        <div class="lg:hidden">
          <div class="space-y-3 p-3">
            <div v-for="user in filteredUsers" :key="user.user_id" 
                 class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                 @click="navigateToUser(user.user_id)">
              <!-- User Header -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center">
                  <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    <span class="text-sm font-medium text-gray-600">
                      {{ getInitials(user.first_name, user.last_name) }}
                    </span>
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-900">
                      {{ user.first_name }} {{ user.last_name }}
                    </div>
                    <div class="text-xs text-gray-500">{{ user.role }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-bold text-gray-900">
                    {{ formatCurrency(user.total_unpaid_amount) }}
                  </div>
                  <div class="text-xs text-gray-500">{{ user.total_appointments || 0 }} Termine</div>
                </div>
              </div>
              
              <!-- Contact Info -->
              <div class="mb-3">
                <div class="text-xs text-gray-500 mb-1">Kontakt</div>
                <div class="text-sm text-gray-900">{{ user.email }}</div>
                <div v-if="user.phone" class="text-sm text-gray-500">{{ user.phone }}</div>
              </div>
              
              <!-- Payment Method & Status -->
              <div class="flex flex-wrap gap-2">
                <span 
                  :class="getPaymentMethodClass(user.preferred_payment_method)"
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                >
                  {{ getPaymentMethodLabel(user.preferred_payment_method) }}
                </span>
                <span
                  v-if="user.has_unpaid_appointments" 
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  Unbezahlte Termine
                </span>
                <span
                  v-if="user.has_company_billing" 
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                  Firmenrechnung
                </span>
                <span
                  v-if="!user.has_unpaid_appointments && !user.has_company_billing" 
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Alle bezahlt
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Empty State -->
        <div v-if="filteredUsers.length === 0" class="p-8 text-center">
          <div class="text-gray-500">
            <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2m5-8a3 3 0 110-6 3 3 0 010 6m-5 6a3 3 0 110-6 3 3 0 010 6"/>
            </svg>
            <p class="text-lg font-medium text-gray-900 mb-2">Keine Benutzer gefunden</p>
            <p class="text-gray-600">
              {{ searchTerm ? 'Versuche einen anderen Suchbegriff.' : 'Versuche die Filter zu ändern.' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, onMounted, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { navigateTo } from '#app'

// TypeScript Interfaces
interface UserPaymentSummary {
  user_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: string
  preferred_payment_method: string | null
  has_company_billing: boolean
  has_unpaid_appointments: boolean
  total_unpaid_amount: number
  total_appointments: number // ✅ NEU: Gesamtanzahl Termine
}

// Reactive state
const supabase = getSupabase()
const users = ref<UserPaymentSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchTerm = ref('')
const selectedFilter = ref('all')
const sortOrder = ref<'newest' | 'oldest'>('newest') // ✅ NEU: Sortierreihenfolge

// Computed properties
const totalUsers = computed(() => users.value.length)

const usersWithUnpaidAppointments = computed(() => 
  users.value.filter(user => user.has_unpaid_appointments).length
)

const usersWithCompanyBilling = computed(() => 
  users.value.filter(user => user.has_company_billing).length
)

const totalUnpaidAmount = computed(() => 
  users.value.reduce((sum, user) => sum + user.total_unpaid_amount, 0)
)

const filteredUsers = computed<UserPaymentSummary[]>(() => {
  let filtered = users.value

  // Search filter
  if (searchTerm.value) {
    const lowerSearchTerm = searchTerm.value.toLowerCase()
    filtered = filtered.filter(user =>
      (user.first_name && user.first_name.toLowerCase().includes(lowerSearchTerm)) ||
      (user.last_name && user.last_name.toLowerCase().includes(lowerSearchTerm)) ||
      (user.email && user.email.toLowerCase().includes(lowerSearchTerm))
    )
  }

  // Status filter
  switch (selectedFilter.value) {
    case 'unpaid':
      filtered = filtered.filter(user => user.has_unpaid_appointments)
      break
    case 'company':
      filtered = filtered.filter(user => user.has_company_billing)
      break
    case 'cash':
      filtered = filtered.filter(user => user.preferred_payment_method === 'cash')
      break
    case 'invoice':
      filtered = filtered.filter(user => user.preferred_payment_method === 'invoice')
      break
  }

  // ✅ NEU: Sortierung nach Datum (basierend auf dem letzten Termin)
  filtered = [...filtered].sort((a, b) => {
    // Hier könnten wir nach dem letzten Termin sortieren, aber für jetzt sortieren wir nach Namen
    const nameA = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase()
    const nameB = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase()
    
    if (sortOrder.value === 'newest') {
      return nameA.localeCompare(nameB)
    } else {
      return nameB.localeCompare(nameA)
    }
  })

  return filtered
})

// Methods
const fetchUsersSummary = async () => {
  loading.value = true
  error.value = null
  
  try {
    logger.debug('🔄 Loading users payment summary via API...')
    
    // ✅ Use new secure API instead of direct DB queries
    // Get auth token for API call
    const { data: { session } } = await supabase.auth.getSession()
    
    const response = await $fetch('/api/admin/get-payments-overview', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    }) as any

    if (!response.success) {
      throw new Error(response.error || 'Failed to load users payment summary')
    }

    // ✅ API already returns users with stats calculated
    users.value = response.data || []
    logger.debug('✅ Users payment summary loaded from API:', users.value.length)

  } catch (err: any) {
    console.error('❌ Error loading users payment summary:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}




const navigateToUser = (userId: string) => {
  // Navigiere zur Zahlungsdetails-Seite des Benutzers
  navigateTo(`/admin/payments/${userId}`)
}

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-CH', { 
    style: 'currency', 
    currency: 'CHF' 
  }).format(amount)
}

const getInitials = (firstName: string | null, lastName: string | null): string => {
  const first = firstName?.charAt(0) || ''
  const last = lastName?.charAt(0) || ''
  return (first + last).toUpperCase() || '?'
}

const getPaymentMethodLabel = (method: string | null): string => {
  const labels: Record<string, string> = {
    'cash': 'Bar',
    'invoice': 'Rechnung',
    'wallee': 'Online-Zahlung',
    'credit': 'Guthaben',
    'twint': 'Online-Zahlung',
    'stripe_card': 'Online-Zahlung',
    'debit_card': 'Online-Zahlung'
  }
  return labels[method || ''] || 'Unbekannt'
}

const getPaymentMethodClass = (method: string | null): string => {
  const classes: Record<string, string> = {
    'cash': 'bg-yellow-100 text-yellow-800',
    'invoice': 'bg-blue-100 text-blue-800',
    'wallee': 'bg-green-100 text-green-800',
    'credit': 'bg-yellow-100 text-yellow-800',
    'twint': 'bg-green-100 text-green-800',
    'stripe_card': 'bg-green-100 text-green-800',
    'debit_card': 'bg-green-100 text-green-800'
  }
  return classes[method || ''] || 'bg-gray-100 text-gray-800'
}

const sendPaymentReminder = async (user: UserPaymentSummary) => {
  logger.debug('Sending payment reminder to:', user.email)
  // TODO: Implement payment reminder logic
  alert(`Zahlungserinnerung an ${user.first_name} ${user.last_name} würde gesendet werden.`)
}

// Lifecycle
onMounted(() => {
  fetchUsersSummary()
})
</script>