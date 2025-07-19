<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">💰 Zahlungsübersicht</h1>
            <p class="mt-2 text-gray-600">Übersicht aller Schüler mit Zahlungsstatus und offenen Beträgen</p>
          </div>
          
          <!-- Refresh Button -->
          <button 
            @click="fetchUsersSummary"
            :disabled="loading"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            {{ loading ? 'Laden...' : 'Aktualisieren' }}
          </button>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div v-if="!loading && !error" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Gesamt Schüler</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ totalUsers }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Unbezahlte Lektionen</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ usersWithUnpaidAppointments }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Firmenrechnungen</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ usersWithCompanyBilling }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z" clip-rule="evenodd"></path>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Offener Betrag</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ formatCurrency(totalUnpaidAmount) }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="bg-white shadow rounded-lg mb-6">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div class="flex-1 min-w-0">
              <div class="relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  v-model="searchTerm"
                  placeholder="Nach Name oder E-Mail suchen..."
                  class="focus:ring-green-500 focus:border-green-500 block w-full pl-10 pr-3 py-2 border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            
            <div class="mt-4 sm:mt-0 sm:ml-4 flex space-x-3">
              <!-- Filter Buttons -->
              <select 
                v-model="selectedFilter"
                class="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
              >
                <option value="all">Alle anzeigen</option>
                <option value="unpaid">Nur unbezahlte</option>
                <option value="company">Nur Firmenrechnungen</option>
                <option value="cash">Nur Barzahlungen</option>
                <option value="invoice">Nur Rechnungen</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white shadow rounded-lg">
        <div class="px-6 py-12 text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Daten werden geladen...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-white shadow rounded-lg">
        <div class="px-6 py-12 text-center">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Fehler beim Laden</h3>
          <p class="text-gray-600 mb-4">{{ error }}</p>
          <button 
            @click="fetchUsersSummary"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <!-- Data Table -->
      <div v-else class="bg-white shadow rounded-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg leading-6 font-medium text-gray-900">
            Schülerliste ({{ filteredUsers.length }} von {{ totalUsers }})
          </h3>
        </div>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schüler
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontakt
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zahlmethode
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Offener Betrag
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="user in filteredUsers" :key="user.user_id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span class="text-sm font-medium text-gray-700">
                          {{ getInitials(user.first_name, user.last_name) }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ user.first_name }} {{ user.last_name }}
                      </div>
                      <div class="text-sm text-gray-500">
                        {{ user.role }}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ user.email }}</div>
                  <div class="text-sm text-gray-500">{{ user.phone }}</div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="getPaymentMethodClass(user.preferred_payment_method)">
                    {{ getPaymentMethodLabel(user.preferred_payment_method) }}
                  </span>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex flex-col space-y-1">
                    <!-- Company Billing Status -->
                    <span v-if="user.has_company_billing" 
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"></path>
                      </svg>
                      Firmenrechnung
                    </span>
                    
                    <!-- Unpaid Status -->
                    <span v-if="user.has_unpaid_appointments" 
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                      </svg>
                      Unbezahlt
                    </span>
                    
                    <span v-if="!user.has_unpaid_appointments" 
                          class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                      </svg>
                      Bezahlt
                    </span>
                  </div>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <span class="font-medium" :class="user.total_unpaid_amount > 0 ? 'text-red-600' : 'text-green-600'">
                    {{ formatCurrency(user.total_unpaid_amount) }}
                  </span>
                </td>
                
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex space-x-2">
                    <NuxtLink 
                      :to="`/admin/users/${user.user_id}`"
                      class="text-green-600 hover:text-green-900 inline-flex items-center"
                    >
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                      Details
                    </NuxtLink>
                    
                    <button 
                      v-if="user.has_unpaid_appointments"
                      @click="sendPaymentReminder(user)"
                      class="text-orange-600 hover:text-orange-900 inline-flex items-center"
                    >
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>
                      Erinnerung
                    </button>
                  </div>
                </td>
              </tr>
              
              <!-- Empty State -->
              <tr v-if="filteredUsers.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                  <div class="flex flex-col items-center">
                    <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-lg font-medium text-gray-900 mb-2">Keine Benutzer gefunden</p>
                    <p class="text-gray-600">
                      {{ searchTerm ? 'Versuche einen anderen Suchbegriff.' : 'Versuche die Filter zu ändern.' }}
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getSupabase } from '~/utils/supabase'

// TypeScript Interface
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
}

// Reactive state
const supabase = getSupabase()
const users = ref<UserPaymentSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchTerm = ref('')
const selectedFilter = ref('all')

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

  return filtered
})

// Methods
const fetchUsersSummary = async () => {
  loading.value = true
  error.value = null
  
  try {
    // Lade alle Benutzer mit ihren Zahlungsinformationen
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        role,
        preferred_payment_method,
        default_company_billing_address_id,
        is_active
      `)
      .eq('is_active', true)
      .neq('role', 'admin') // Admins ausschließen
    
    if (usersError) {
      throw new Error(usersError.message)
    }

    // Lade alle Termine mit Zahlungsstatus
    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        user_id,
        is_paid,
        price_per_minute,
        duration_minutes,
        discount
      `)

    if (appointmentsError) {
      throw new Error(appointmentsError.message)
    }

    // Lade Company Billing Adressen
    const { data: billingData, error: billingError } = await supabase
      .from('company_billing_addresses')
      .select('created_by')

    if (billingError) {
      console.warn('Warning loading billing addresses:', billingError.message)
    }

    // Verarbeite die Daten
    const processedUsers: UserPaymentSummary[] = (usersData || []).map(user => {
      // Finde alle Termine für diesen User
      const userAppointments = (appointmentsData || []).filter(apt => apt.user_id === user.id)
      
      // Berechne unbezahlte Termine
      const unpaidAppointments = userAppointments.filter(apt => !apt.is_paid)
      
      // Berechne offenen Betrag (in CHF)
      const totalUnpaidAmount = unpaidAppointments.reduce((sum, apt) => {
        const basePrice = (apt.price_per_minute || 0) * (apt.duration_minutes || 0)
        const discountedPrice = basePrice - (apt.discount || 0)
        return sum + discountedPrice
      }, 0)

      // Prüfe ob User Company Billing hat
      const hasCompanyBilling = billingData?.some(billing => billing.created_by === user.id) || 
                               !!user.default_company_billing_address_id

      return {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role || 'client',
        preferred_payment_method: user.preferred_payment_method,
        has_company_billing: hasCompanyBilling,
        has_unpaid_appointments: unpaidAppointments.length > 0,
        total_unpaid_amount: totalUnpaidAmount
      }
    })
    
    users.value = processedUsers
    console.log('✅ Loaded user payment summary:', users.value.length, 'users')
    
  } catch (err: any) {
    console.error('❌ Error loading user summary:', err.message)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-CH', { 
    style: 'currency', 
    currency: 'CHF' 
  }).format(amount)
}

const getInitials = (firstName: string | null, lastName: string | null): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  return first + last || '??'
}

const getPaymentMethodLabel = (method: string | null): string => {
  const labels: Record<string, string> = {
    'cash': 'Bar',
    'invoice': 'Rechnung',
    'twint': 'Twint',
    'stripe_card': 'Karte',
    'debit_card': 'Debit'
  }
  return labels[method || ''] || 'Unbekannt'
}

const getPaymentMethodClass = (method: string | null): string => {
  const classes: Record<string, string> = {
    'cash': 'bg-yellow-100 text-yellow-800',
    'invoice': 'bg-blue-100 text-blue-800',
    'twint': 'bg-purple-100 text-purple-800',
    'stripe_card': 'bg-green-100 text-green-800',
    'debit_card': 'bg-gray-100 text-gray-800'
  }
  return classes[method || ''] || 'bg-gray-100 text-gray-800'
}

const sendPaymentReminder = async (user: UserPaymentSummary) => {
  // Placeholder for payment reminder functionality
  console.log('Sending payment reminder to:', user.email)
  // TODO: Implement payment reminder logic
  alert(`Zahlungserinnerung an ${user.first_name} ${user.last_name} würde gesendet werden.`)
}

// Lifecycle
onMounted(() => {
  fetchUsersSummary()
})
</script>