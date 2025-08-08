<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">💰 Zahlungsübersicht</h1>
          </div>
          
          <!-- Refresh Button -->
          <button 
            @click="fetchUsersSummary"
            :disabled="loading"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ loading ? 'Lädt...' : 'Aktualisieren' }}
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Alle Benutzer</p>
              <p class="text-2xl font-bold text-gray-900">{{ totalUsers }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span class="text-blue-600 text-xl">👥</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Mit unbezahlten Terminen</p>
              <p class="text-2xl font-bold text-red-600">{{ usersWithUnpaidAppointments }}</p>
            </div>
            <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <span class="text-red-600 text-xl">💸</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Mit Firmenrechnung</p>
              <p class="text-2xl font-bold text-purple-600">{{ usersWithCompanyBilling }}</p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span class="text-purple-600 text-xl">🏢</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Offener Betrag</p>
              <p class="text-2xl font-bold text-orange-600">{{ formatCurrency(totalUnpaidAmount) }}</p>
            </div>
            <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span class="text-orange-600 text-xl">💰</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div class="flex flex-col sm:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1">
            <label for="search" class="block text-sm font-medium text-gray-700 mb-2">Suchen</label>
            <input
              id="search"
              v-model="searchTerm"
              type="text"
              placeholder="Name oder E-Mail..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Status Filter -->
          <div class="sm:w-48">
            <label for="filter" class="block text-sm font-medium text-gray-700 mb-2">Filter</label>
            <select
              id="filter"
              v-model="selectedFilter"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle Benutzer</option>
              <option value="unpaid">Mit unbezahlten Terminen</option>
              <option value="company">Mit Firmenrechnung</option>
              <option value="cash">Barzahler</option>
              <option value="invoice">Rechnungszahler</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-3 text-gray-600">Lade Benutzerdaten...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-red-800 font-medium">Fehler beim Laden der Daten</span>
        </div>
        <p class="text-red-700 mt-2">{{ error }}</p>
      </div>

      <!-- Users Table -->
      <div v-else class="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Benutzer
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kontakt
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zahlungsart
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Offener Betrag
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="user in filteredUsers" :key="user.user_id" class="hover:bg-gray-50 cursor-pointer" @click="navigateToUser(user.user_id)">
                <!-- User Info -->
                <td class="px-6 py-4 whitespace-nowrap">
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
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ user.email }}</div>
                  <div class="text-sm text-gray-500">{{ user.phone }}</div>
                </td>

                <!-- Payment Method -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="getPaymentMethodClass(user.preferred_payment_method)"
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  >
                    {{ getPaymentMethodLabel(user.preferred_payment_method) }}
                  </span>
                </td>

                <!-- Status -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex flex-col gap-1">
                    <span v-if="user.has_unpaid_appointments" 
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      Unbezahlte Termine
                    </span>
                    <span v-if="user.has_company_billing" 
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                      Firmenrechnung
                    </span>
                    <span v-if="!user.has_unpaid_appointments && !user.has_company_billing" 
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Alle bezahlt
                    </span>
                  </div>
                </td>

                <!-- Amount -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ formatCurrency(user.total_unpaid_amount) }}
                  </div>
                </td>
              </tr>

              <!-- Empty State -->
              <tr v-if="filteredUsers.length === 0">
                <td colspan="6" class="px-6 py-12 text-center">
                  <div class="text-gray-500">
                    <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2m5-8a3 3 0 110-6 3 3 0 010 6m-5 6a3 3 0 110-6 3 3 0 010 6"></path>
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
    console.log('🔄 Loading users payment summary...')
    
    // Lade alle aktiven Benutzer (außer Admins)
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
      .neq('role', 'admin')
    
    if (usersError) {
      throw new Error(usersError.message)
    }

    // Lade alle unbezahlten Zahlungen aus v_payments_detailed
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('v_payments_detailed')
      .select(`
        user_id,
        payment_status,
        paid_at,
        total_amount_chf,
        description
      `)
      .or('payment_status.eq.pending,paid_at.is.null')

    if (paymentsError) {
      console.error('❌ Error loading payments:', paymentsError)
      throw new Error(`Payments error: ${paymentsError.message}`)
    }

    // Lade Company Billing Adressen
    const { data: billingData, error: billingError } = await supabase
      .from('company_billing_addresses')
      .select('created_by')

    if (billingError) {
      console.warn('Warning loading billing addresses:', billingError.message)
    }

    // Verarbeite die Daten
    const processedUsers = (usersData || []).map(user => {
      // Finde unbezahlte Payments für diesen User
      const userUnpaidPayments = (paymentsData || []).filter(payment => 
        payment.user_id === user.id && 
        (payment.payment_status === 'pending' || !payment.paid_at)
      )
      
      console.log(`📊 User ${user.first_name} ${user.last_name}:`, {
        totalUnpaidPayments: userUnpaidPayments.length,
        paymentsSample: userUnpaidPayments.slice(0, 2)
      })
      
      // Berechne Gesamtbetrag aus total_amount_chf (bereits in CHF)
      const totalUnpaidAmount = userUnpaidPayments.reduce((sum, payment) => {
        return sum + (Number(payment.total_amount_chf) || 0)
      }, 0)

      console.log(`💰 Total unpaid amount for ${user.first_name}: ${totalUnpaidAmount} CHF`)

      // Prüfe Company Billing
      const hasCompanyBilling = billingData?.some(billing => billing.created_by === user.id) || 
                               !!user.default_company_billing_address_id

      return {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        preferred_payment_method: user.preferred_payment_method,
        has_company_billing: hasCompanyBilling,
        has_unpaid_appointments: userUnpaidPayments.length > 0,
        total_unpaid_amount: totalUnpaidAmount
      }
    })

    users.value = processedUsers
    console.log('✅ Users payment summary loaded:', users.value.length)

  } catch (err: any) {
    console.error('❌ Error loading users payment summary:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}




const navigateToUser = (userId: string) => {
  navigateTo(`/admin/users/${userId}`)
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
  console.log('Sending payment reminder to:', user.email)
  // TODO: Implement payment reminder logic
  alert(`Zahlungserinnerung an ${user.first_name} ${user.last_name} würde gesendet werden.`)
}

// Lifecycle
onMounted(() => {
  fetchUsersSummary()
})
</script>