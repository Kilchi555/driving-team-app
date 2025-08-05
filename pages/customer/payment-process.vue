<!-- pages/customer/payment-process.vue -->
<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-lg w-full">
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        
        <!-- Header -->
        <div class="flex justify-between items-center bg-blue-600 text-white p-4">
          <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
            </svg>
          </div>
          <h1 class="text-2xl font-bold">Zahlungsübersicht</h1>
        </div>

            <button
                @click="router.push('/customer-dashboard')"
              :disabled="isProcessing"
              class="mt-2 w-full border text-gray-500 py-2 px-4 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <- Zurück
            </button>

        <!-- Loading State -->
        <div v-if="isLoading" class="p-6 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600">Lade Zahlungsdetails...</p>
        </div>

        <!-- Payment Details -->
        <div v-else-if="paymentDetails.length > 0" class="p-4">
          <!-- Summary Card -->
          <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-6 border border-green-200">
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">Gesamtbetrag</h3>
                <p class="text-sm text-gray-600">{{ paymentDetails.length }} {{ paymentDetails.length === 1 ? 'Position' : 'Positionen' }}</p>
              </div>
              <div class="text-right">
                <p class="text-xl font-bold text-gray-900">CHF {{ totalAmount.toFixed(2) }}</p>
              </div>
            </div>
          </div>

          <!-- Payment Items -->
          <div class="space-y-4 mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-3">Positionen</h3>
            
            <div v-for="(payment, index) in paymentDetails" :key="payment.id" 
                 class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              
              <!-- Appointment Info -->
              <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">
                    {{ payment.appointments?.title || 'Fahrstunde' }}
                  </h4>
                  <div class="flex items-center text-sm text-gray-600 mt-1">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    {{ formatAppointmentDate(payment.appointments?.start_time) }}
                  </div>
                  <div class="flex items-center text-sm text-gray-600 mt-1">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {{ payment.metadata?.duration || payment.appointments?.duration_minutes || 45 }} Minuten
                  </div>
                </div>
                <div class="ml-4">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ getCategoryLabel(payment.metadata?.category || 'B') }}
                  </span>
                </div>
              </div>

              <!-- Price Breakdown -->
              <div class="bg-gray-50 rounded-lg p-3 space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Fahrlektion ({{ payment.metadata?.duration || 45 }} Min)</span>
                  <span class="font-medium text-gray-600">CHF {{ (payment.amount_rappen / 100).toFixed(2) }}</span>
                </div>
                
                <div v-if="payment.admin_fee_rappen > 0" class="flex justify-between text-sm">
                  <span class="text-gray-600">Administrationsgebühr</span>
                  <span class="font-medium text-gray-600">CHF {{ (payment.admin_fee_rappen / 100).toFixed(2) }}</span>
                </div>

                <div v-if="payment.discount_rappen > 0" class="flex justify-between text-sm text-green-600">
                  <span>Rabatt{{ payment.discount_reason ? ` (${payment.discount_reason})` : '' }}</span>
                  <span class="font-medium text-gray-600">-CHF {{ (payment.discount_rappen / 100).toFixed(2) }}</span>
                </div>

                <!-- Products (wenn vorhanden) -->
                <div v-if="payment.products && payment.products.length > 0" class="pt-2 border-t border-gray-200">
                  <p class="text-sm font-medium text-gray-700 mb-2">Zusatzprodukte:</p>
                  <div v-for="product in payment.products" :key="product.id" class="flex justify-between text-sm">
                    <span class="text-gray-600">{{ product.name }} ({{ product.quantity }}x)</span>
                    <span class="font-medium text-gray-600">CHF {{ (product.total_price_rappen / 100).toFixed(2) }}</span>
                  </div>
                </div>

                <div class="flex justify-between text-gray-600 text-base font-semibold pt-2 border-t border-gray-300">
                  <span>Zwischensumme</span>
                  <span>CHF {{ (payment.total_amount_rappen / 100).toFixed(2) }}</span>
                </div>
              </div>

              <!-- Status -->
              <div class="mt-3 flex justify-between items-center">
                <span class="text-sm text-gray-500">Position {{ index + 1 }} von {{ paymentDetails.length }}</span>
                <span :class="getStatusClass(payment.payment_status)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium">
                  {{ getStatusLabel(payment.payment_status) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-3">
            <button
              @click="processPayment(true)"
              :disabled="isProcessing || !selectedPaymentMethod"
              class="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isProcessing ? 'Verarbeitung...' : `CHF ${totalAmount.toFixed(2)} bezahlen` }}
            </button>
            
            <button
                @click="router.push('/customer-dashboard')"
              :disabled="isProcessing"
              class="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>
          </div>
          
          <!-- Demo Notice -->
          <div class="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div class="flex items-center space-x-2 text-sm">
              <span class="text-yellow-600">⚠️</span>
              <span class="text-yellow-800">
                <strong>Demo-Modus:</strong> Keine echte Zahlung wird verarbeitet.
              </span>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-6 text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Fehler beim Laden</h3>
          <p class="text-gray-600 mb-4">{{ error }}</p>
          <button
            @click="router.push('/customer-dashboard')"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSupabase } from '~/utils/supabase'

const route = useRoute()
const router = useRouter()
const supabase = getSupabase()

// Props from URL
const paymentIds = computed(() => {
  const payments = route.query.payments as string
  return payments ? payments.split(',') : []
})

// State
const isLoading = ref(true)
const isProcessing = ref(false)
const error = ref('')
const paymentDetails = ref<any[]>([])
const selectedPaymentMethod = ref('twint')

// Computed
const totalAmount = computed(() => {
  return paymentDetails.value.reduce((sum, payment) => {
    return sum + (payment.total_amount_rappen / 100)
  }, 0)
})

// Methods
// pages/customer/payment-process.vue - ändere loadPaymentDetails:
const loadPaymentDetails = async () => {
  try {
    isLoading.value = true
    
    // 1. Lade Payments mit Appointments
    const { data: paymentsData, error: loadError } = await supabase
      .from('payments')
      .select(`
        *,
        appointments (
          id,
          title,
          start_time,
          end_time,
          duration_minutes,
          type
        )
      `)
      .in('id', paymentIds.value)

    if (loadError) throw loadError

    // 2. Lade Produkte separat für jedes Appointment
    const enrichedPayments = []
    
    for (const payment of paymentsData || []) {
      let products = []
      
      if (payment.appointments?.id) {
        const { data: productsData } = await supabase
          .from('appointment_products')
          .select(`
            id,
            quantity,
            unit_price_rappen,
            total_price_rappen,
            products (
              name,
              description
            )
          `)
          .eq('appointment_id', payment.appointments.id)
        
        products = productsData?.map((ap: any) => ({
          ...ap.products,
          id: ap.id,
          quantity: ap.quantity,
          unit_price_rappen: ap.unit_price_rappen,
          total_price_rappen: ap.total_price_rappen
        })) || []
      }
      
      enrichedPayments.push({
        ...payment,
        products
      })
    }

    paymentDetails.value = enrichedPayments
    console.log('✅ Payment details loaded:', paymentDetails.value)

  } catch (err: any) {
    console.error('❌ Error loading payment details:', err)
    error.value = err.message || 'Fehler beim Laden der Zahlungsdetails'
  } finally {
    isLoading.value = false
  }
}

const processPayment = async (success: boolean) => {
  isProcessing.value = true
  
  try {
    console.log('🔄 Processing payment for IDs:', paymentIds.value)
    console.log('💳 Payment method:', selectedPaymentMethod.value)
    console.log('💰 Total amount:', totalAmount.value)
    
    // Simuliere Payment Processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Redirect basierend auf Erfolg
    if (success) {
      await router.push(`/payment/success?transaction_id=${paymentIds.value[0]}&amount=${totalAmount.value}`)
    } else {
      await router.push(`/payment/failed?transaction_id=${paymentIds.value[0]}`)
    }
    
  } catch (error) {
    console.error('Mock payment error:', error)
    await router.push(`/payment/failed?transaction_id=${paymentIds.value[0]}`)
  } finally {
    isProcessing.value = false
  }
}

const formatAppointmentDate = (dateString: string): string => {
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

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    'B': 'Auto B',
    'A1': 'Motorrad A1',
    'A35kW': 'Motorrad A (35kW)',
    'A': 'Motorrad A',
    'BE': 'Auto BE',
    'C1': 'LKW C1',
    'D1': 'Bus D1',
    'C': 'LKW C',
    'CE': 'LKW CE',
    'D': 'Bus D',
    'Motorboot': 'Motorboot',
    'BPT': 'Berufspraxis'
  }
  return labels[category] || category
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'pending': 'Offen',
    'completed': 'Bezahlt',
    'failed': 'Fehlgeschlagen',
    'cancelled': 'Storniert'
  }
  return labels[status] || status
}

const getStatusClass = (status: string): string => {
  const classes: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

// Lifecycle
onMounted(() => {
  if (paymentIds.value.length === 0) {
    error.value = 'Keine Zahlungs-IDs gefunden'
    isLoading.value = false
    return
  }
  
  loadPaymentDetails()
})
</script>