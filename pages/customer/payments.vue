<!-- pages/customer/payments.vue -->
<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
    <!-- Header -->
    <div class="bg-white shadow-lg border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-4">
          <div class="flex items-center space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold text-gray-900">Zahlungen</h1>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-4 border-green-500 border-t-transparent mx-auto"></div>
        <p class="mt-4 text-gray-600 text-lg">Zahlungsdaten werden geladen...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-red-50 border-l-4 border-red-400 rounded-lg p-6">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-6 w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-lg font-medium text-red-800">Fehler beim Laden</h3>
            <p class="mt-2 text-red-700">{{ error }}</p>
            <button 
              @click="retryLoad" 
              class="mt-4 bg-red-100 text-red-800 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Payment Status Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        <!-- Offene Rechnungen -->
        <div class="bg-white rounded-xl shadow-lg border relative"
            :class="unpaidPayments.length > 0 ? 'border-red-200' : 'border-green-200'">
          <div class="p-6">
            <div class="flex mb-2">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                  :class="unpaidPayments.length > 0 ? 'bg-red-100' : 'bg-green-100'">
                <svg v-if="unpaidPayments.length > 0" class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <svg v-else class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-sm font-medium text-gray-500">
                {{ unpaidPayments.length > 0 ? 'Offene Rechnungen' : 'Zahlungsstatus' }}
              </h3>
            </div>
            
            <div v-if="unpaidPayments.length > 0">
              <p class="text-3xl font-bold text-red-600">{{ unpaidPayments.length }}</p>
              <p class="text-sm text-red-500 mt-1">CHF {{ totalUnpaidAmount.toFixed(2) }}</p>
            </div>
            <div v-else>
              <p class="text-3xl font-bold text-green-600">Alles bezahlt</p>
              <p class="text-sm text-green-500 mt-1">✓ Keine offenen Beträge</p>
            </div>
            
            <!-- Action Button -->
            <button
              v-if="unpaidPayments.length > 0"
              @click="payAllUnpaid"
              :disabled="isProcessingPayment"
              class="mt-4 w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
            >
              <span v-if="isProcessingPayment" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Wird verarbeitet...
              </span>
              <span v-else>Alle bezahlen</span>
            </button>
          </div>
        </div>

        <!-- Bezahlte Rechnungen -->
        <div class="bg-white rounded-xl shadow-lg border border-blue-200 relative">
          <div class="p-6">
            <div class="flex items-center mb-2">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-sm font-medium text-gray-500">Vergangene Zahlungen</h3>
            </div>
            <p class="text-3xl font-bold text-gray-900">{{ paidPayments.length }}</p>
            <p class="text-sm text-gray-500 mt-1">CHF {{ totalPaidAmount.toFixed(2) }}</p>
          </div>
          <button 
            @click="showSettings = true"
            class="absolute bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50"
          >
            Details
          </button>
        </div>

        <!-- Bevorzugte Zahlungsart -->
        <div class="bg-white rounded-xl shadow-lg border border-purple-200 relative">
          <div class="p-6">
            <div class="flex items-center mb-2">
              <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <svg class="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 class="text-sm font-medium text-gray-500">Bevorzugte Zahlungsart</h3>
            </div>
            <p class="text-lg font-bold text-gray-900">{{ preferredPaymentMethodLabel }}</p>
            <button 
              @click="showSettings = true"
              class="absolute bottom-4 right-4 bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors font-medium disabled:opacity-50"
            >
              Ändern
            </button>
          </div>
        </div>
      </div>

      <!-- Payment List -->
      <div class="bg-white rounded-xl shadow-lg border border-gray-200">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold text-gray-900">Zahlungsdetails</h2>
            <div class="flex space-x-2">
              <select v-model="statusFilter" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">Alle Status</option>
                <option value="pending">Offen</option>
                <option value="completed">Bezahlt</option>
              </select>
              <select v-model="methodFilter" class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="all">Alle Methoden</option>
                <option value="cash">Bar</option>
                <option value="twint">Twint</option>
                <option value="invoice">Rechnung</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Payment Items -->
        <div v-if="filteredPayments.length === 0" class="px-6 py-12 text-center">
          <div class="text-gray-500">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Keine Zahlungen gefunden</h3>
            <p class="mt-1 text-sm text-gray-500">Es wurden keine Zahlungen mit den aktuellen Filtern gefunden.</p>
          </div>
        </div>

        <div v-else class="divide-y divide-gray-200">
          <div v-for="(payment, index) in filteredPayments" :key="payment.id" 
               class="px-6 py-6 hover:bg-gray-50 transition-colors">
            
            <!-- Payment Header -->
            <div class="flex justify-between items-start mb-4">
              <div class="flex-1">
                <div class="flex items-center space-x-3 mb-2">
                  <span class="text-sm text-gray-500">Position {{ index + 1 }} von {{ filteredPayments.length }}</span>
                  <span :class="getStatusClass(payment.payment_status)" 
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {{ getStatusLabel(payment.payment_status) }}
                  </span>
                </div>
                
                <!-- Payment Description -->
                <h3 class="text-lg font-semibold text-gray-900 mb-1">
                  {{ payment.description || 'Zahlung' }}
                </h3>
                
                <!-- Date and Time -->
                <div class="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                  <span>{{ formatDateTime(payment.created_at) }}</span>
                </div>
                
                <!-- Payment Type -->
                <div class="flex items-center space-x-3 text-sm text-gray-600">
                  <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-md">
                    {{ payment.payment_method || 'Unbekannt' }}
                  </span>

                </div>
              </div>
              
              <!-- Payment Amount -->
              <div class="text-right ml-6">
                <div class="text-2xl font-bold text-gray-900">
                  CHF {{ (payment.total_amount_rappen / 100).toFixed(2) }}
                </div>
                <div class="text-sm text-gray-500">
                  {{ getPaymentMethodLabel(payment.payment_method) }}
                </div>
              </div>
            </div>
            
            <!-- Payment Details -->
            <div class="bg-gray-50 rounded-lg p-4 mb-4">
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Fahrlektion</span>
                  <span class="font-medium text-gray-600">CHF {{ (payment.lesson_price_rappen / 100).toFixed(2) }}</span>
                </div>
                
                <div v-if="payment.admin_fee_rappen > 0" class="flex justify-between">
                  <span class="text-gray-600">Administrationsgebühr</span>
                  <span class="font-medium text-gray-600">CHF {{ (payment.admin_fee_rappen / 100).toFixed(2) }}</span>
                </div>
                
                <div v-if="payment.products_price_rappen > 0" class="flex justify-between">
                  <span class="text-gray-600">Produkte</span>
                  <span class="font-medium text-gray-600">CHF {{ (payment.products_price_rappen / 100).toFixed(2) }}</span>
                </div>
                
                <div v-if="payment.discount_amount_rappen > 0" class="flex justify-between">
                  <span class="text-gray-600">Rabatt</span>
                  <span class="font-medium text-green-600">- CHF {{ (payment.discount_amount_rappen / 100).toFixed(2) }}</span>
                </div>
                
                <div class="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                  <span>Gesamtbetrag</span>
                  <span>CHF {{ (payment.total_amount_rappen / 100).toFixed(2) }}</span>
                </div>
              </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex justify-end space-x-3">
              <button v-if="payment.payment_status === 'pending'"
                      @click="payIndividual(payment)"
                      :disabled="isProcessingPayment"
                      class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50">
                {{ isProcessingPayment ? 'Verarbeitung...' : 'Jetzt bezahlen' }}
              </button>
              
              <button v-if="payment.payment_status === 'completed'"
                      @click="downloadReceipt(payment)"
                      class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors font-medium">
                Quittung herunterladen
              </button>
              
              <button @click="showPaymentDetails(payment)"
                      class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium">
                Details anzeigen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'
import { definePageMeta } from '#imports'
import { useCustomerPayments } from '~/composables/useCustomerPayments'


// Components (these would need to be created)
// import PaymentDetailsModal from '~/components/customer/PaymentDetailsModal.vue'
// import PaymentSettingsModal from '~/components/customer/PaymentSettingsModal.vue'

// Define page meta
definePageMeta({
  middleware: 'auth',
  layout: false
})

// Composables
const authStore = useAuthStore()
const { user: currentUser, isClient } = storeToRefs(authStore)

// ✅ Verwende das neue useCustomerPayments Composable
const {
  payments: customerPayments,
  pendingPayments,
  loadPayments: loadCustomerPayments,
  isLoading: paymentsLoading,
  error: paymentsError
} = useCustomerPayments()

// State
const isLoading = ref(true)
const error = ref<string | null>(null)
const isProcessingPayment = ref(false)
const statusFilter = ref('all')
const methodFilter = ref('all')
const showDetailsModal = ref(false)
const showSettings = ref(false)
const selectedPayment = ref<any>(null)
const preferredPaymentMethod = ref<string | null>(null)

// Computed properties
const unpaidPayments = computed(() => 
  customerPayments.value.filter(p => p.payment_status === 'pending' || !p.paid_at)
)

const paidPayments = computed(() => 
  customerPayments.value.filter(p => p.payment_status === 'completed' && p.paid_at)
)

const totalUnpaidAmount = computed(() => 
  unpaidPayments.value.reduce((sum, p) => {
    let totalAmount = 0
    if (p.total_amount_rappen) {
      totalAmount += p.total_amount_rappen / 100
    }
    if (p.admin_fee_rappen) {
      totalAmount += p.admin_fee_rappen / 100
    }
    return sum + totalAmount
  }, 0)
)

const totalPaidAmount = computed(() => 
  paidPayments.value.reduce((sum, p) => {
    let totalAmount = 0
    if (p.total_amount_rappen) {
      totalAmount += p.total_amount_rappen / 100
    }
    if (p.admin_fee_rappen) {
      totalAmount += p.admin_fee_rappen / 100
    }
    return sum + totalAmount
  }, 0)
)

const preferredPaymentMethodLabel = computed(() => {
  const labels: Record<string, string> = {
    'cash': 'Bar',
    'invoice': 'Rechnung',
    'twint': 'Twint',
    'stripe_card': 'Kreditkarte',
    'debit_card': 'Debitkarte'
  }
  return labels[preferredPaymentMethod.value || ''] || 'Nicht festgelegt'
})

const filteredPayments = computed(() => {
  let filtered = customerPayments.value

  // Status filter
  if (statusFilter.value !== 'all') {
    switch (statusFilter.value) {
      case 'unpaid':
        filtered = filtered.filter(p => p.payment_status === 'pending' || !p.paid_at)
        break
      case 'paid':
        filtered = filtered.filter(p => p.payment_status === 'completed' && p.paid_at)
        break
      case 'pending':
        filtered = filtered.filter(p => p.payment_status === 'pending')
        break
    }
  }

  // Method filter
  if (methodFilter.value !== 'all') {
    filtered = filtered.filter(p => p.payment_method === methodFilter.value)
  }

  return filtered.sort((a, b) => {
    const dateA = new Date(a.created_at || a.start_time || 0)
    const dateB = new Date(b.created_at || b.start_time || 0)
    return dateB.getTime() - dateA.getTime()
  })
})

// Methods
const goBack = async () => {
  await navigateTo('/customer-dashboard')
}

const retryLoad = async () => {
  error.value = null
  isLoading.value = true
  await loadAllData()
}

const loadAllData = async () => {
  if (!currentUser.value?.id) return

  try {
    const supabase = getSupabase()
    
    // Get user data from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, preferred_payment_method')
      .eq('auth_user_id', currentUser.value.id)
      .single()
    
    if (userError) throw userError
    if (!userData) throw new Error('User nicht in Datenbank gefunden')

    preferredPaymentMethod.value = userData.preferred_payment_method

    console.log('🔍 Loading data for user:', userData.id)

    // ✅ Verwende das neue useCustomerPayments Composable
    await loadCustomerPayments()

  } catch (err: any) {
    console.error('❌ Error loading data:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

const payAllUnpaid = async () => {
  if (unpaidPayments.value.length === 0) return

  isProcessingPayment.value = true
  
  try {
    // Redirect to payment processing with all unpaid payment IDs
    const paymentIds = unpaidPayments.value.map(p => p.id).join(',')
    await navigateTo(`/customer/payment-process?payments=${paymentIds}`)
    
  } catch (err: any) {
    console.error('❌ Error initiating bulk payment:', err)
    alert('Fehler beim Initialisieren der Zahlung. Bitte versuchen Sie es erneut.')
  } finally {
    isProcessingPayment.value = false
  }
}

const payIndividual = async (payment: any) => {
  isProcessingPayment.value = true
  
  try {
    await navigateTo(`/customer/payment-process?payments=${payment.id}`)
    
  } catch (err: any) {
    console.error('❌ Error initiating individual payment:', err)
    alert('Fehler beim Initialisieren der Zahlung. Bitte versuchen Sie es erneut.')
  } finally {
    isProcessingPayment.value = false
  }
}

const downloadReceipt = async (payment: any) => {
  try {
    // Generate receipt download URL
    const receiptUrl = `/api/payments/${payment.id}/receipt`
    
    // Create download link
    const link = document.createElement('a')
    link.href = receiptUrl
    link.download = `Quittung_${payment.invoice_number || payment.id}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
  } catch (err: any) {
    console.error('❌ Error downloading receipt:', err)
    alert('Fehler beim Herunterladen der Quittung. Bitte versuchen Sie es erneut.')
  }
}

const showPaymentDetails = (payment: any) => {
  selectedPayment.value = payment
  showDetailsModal.value = true
}

const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    'cash': 'Bar',
    'invoice': 'Rechnung',
    'wallee': 'Online-Zahlung',
    'twint': 'Online-Zahlung',
    'stripe_card': 'Online-Zahlung',
    'debit_card': 'Online-Zahlung'
  }
  return labels[method] || method
}

const getPaymentMethodClass = (method: string): string => {
  const classes: Record<string, string> = {
    'cash': 'bg-yellow-100 text-yellow-800',
    'invoice': 'bg-blue-100 text-blue-800',
    'wallee': 'bg-green-100 text-green-800',
    'twint': 'bg-green-100 text-green-800',
    'stripe_card': 'bg-green-100 text-green-800',
    'debit_card': 'bg-green-100 text-green-800'
  }
  return classes[method] || 'bg-gray-100 text-gray-800'
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'pending': 'Offen',
    'completed': 'Bezahlt',
    'failed': 'Fehlgeschlagen',
    'cancelled': 'Storniert',
    'refunded': 'Rückerstattet'
  }
  return labels[status] || status
}

const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-800',
    'refunded': 'bg-orange-100 text-orange-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const formatDateTime = (dateString: string): string => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Watch for user role changes
watch([currentUser], ([newUser]) => {
  if (newUser && !isClient.value) {
    console.log('🔄 User is not a client, redirecting to main dashboard')
    navigateTo('/')
  }
}, { immediate: true })

// Lifecycle
onMounted(async () => {
  console.log('🔥 Customer Payments mounted')
  
  if (!isClient.value) {
    console.warn('⚠️ User is not a client, redirecting...')
    await navigateTo('/')
    return
  }

  await loadAllData()
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.transition-colors {
  transition: all 0.2s ease-in-out;
}

.transition-all {
  transition: all 0.3s ease-in-out;
}

/* Table hover effects */
tbody tr:hover {
  background-color: #f9fafb;
}

/* Enhanced shadows */
.hover\:shadow-xl:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* Input focus states */
input:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

/* Gradient backgrounds */
.bg-gradient-to-br {
  background-image: linear-gradient(to bottom right, var(--tw-gradient-stops));
}

.bg-gradient-to-r {
  background-image: linear-gradient(to right, var(--tw-gradient-stops));
}
</style>