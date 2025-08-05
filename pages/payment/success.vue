<!-- pages/payment/success.vue -->
<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      
      <!-- Success Card -->
      <div class="bg-white rounded-lg shadow-lg p-6 text-center">
        
        <!-- Success Icon -->
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <!-- Success Message -->
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Zahlung erfolgreich!</h1>
        <p class="text-gray-600 mb-6">
          Ihre Zahlung wurde erfolgreich verarbeitet. Sie erhalten in Kürze eine Bestätigung per E-Mail.
        </p>

        <!-- Payment Details -->
        <div v-if="paymentDetails" class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h3 class="font-semibold text-gray-900 mb-3">Zahlungsdetails</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Betrag:</span>
              <span class="font-medium">CHF {{ paymentDetails.amount }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Zahlungsart:</span>
              <span class="font-medium">{{ paymentDetails.method }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Transaktions-ID:</span>
              <span class="font-medium font-mono text-xs">{{ paymentDetails.transactionId }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Datum:</span>
              <span class="font-medium">{{ formatDate(paymentDetails.date) }}</span>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center py-4">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          <span class="ml-2 text-gray-600">Zahlungsdetails werden geladen...</span>
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <button
            @click="goToCalendar"
            class="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Zurück zum Dashboard
          </button>
          
          <button
            v-if="paymentDetails"
            @click="downloadReceipt"
            class="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            📄 Quittung herunterladen
          </button>
        </div>
      </div>

      <!-- Additional Info -->
      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600">
          Bei Fragen zur Zahlung kontaktieren Sie uns unter 
          <a href="mailto:info@drivingteam.ch" class="text-green-600 hover:underline">
            info@drivingteam.ch
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
// Import von Nuxt hinzufügen
import { useRoute, useRouter } from '#app'
import { getSupabase } from '~/utils/supabase'

// Router
const route = useRoute()
const router = useRouter()

// Supabase
const supabase = getSupabase()

// State
const isLoading = ref(true)
const paymentDetails = ref<any>(null)

// Methods
const loadPaymentDetails = async () => {
  try {
    const transactionId = route.query.transaction_id || route.query.id
    
    if (!transactionId) {
      console.error('❌ No transaction ID provided')
      return
    }

    console.log('🔍 Loading payment details for transaction:', transactionId)

    // Fetch payment from database
    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        appointments (
          title,
          start_time,
          duration_minutes
        ),
        users!payments_user_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('wallee_transaction_id', transactionId)
      .single()

    if (error) {
      console.error('❌ Error loading payment:', error)
      return
    }

    if (!payment) {
      console.error('❌ Payment not found')
      return
    }

    paymentDetails.value = {
      id: payment.id,
      amount: (payment.total_amount_rappen / 100).toFixed(2),
      method: getPaymentMethodName(payment.payment_method),
      transactionId: payment.wallee_transaction_id,
      date: payment.paid_at || payment.created_at,
      status: payment.payment_status,
      appointment: payment.appointments,
      user: payment.users
    }

    console.log('✅ Payment details loaded:', paymentDetails.value)

  } catch (err: any) {
    console.error('❌ Error loading payment details:', err)
  } finally {
    isLoading.value = false
  }
}

const getPaymentMethodName = (method: string): string => {
  const methods: Record<string, string> = {
    'twint': 'Twint',
    'wallee_card': 'Kreditkarte',
    'stripe_card': 'Kreditkarte', 
    'debit_card': 'Debitkarte',
    'cash': 'Bar',
    'invoice': 'Rechnung'
  }
  return methods[method] || method
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const goToCalendar = () => {
  router.push('/customer-dashboard')
}

const downloadReceipt = async () => {
  if (!paymentDetails.value) return
  
  try {
    // Type the response properly
    interface ReceiptResponse {
      success: boolean
      pdfUrl?: string
      error?: string
    }
    
    // Generate PDF receipt
    const response = await $fetch<ReceiptResponse>('/api/payments/receipt', {
      method: 'POST',
      body: {
        paymentId: paymentDetails.value.id
      }
    })

    if (response.success && response.pdfUrl) {
      // Download PDF
      const link = document.createElement('a')
      link.href = response.pdfUrl
      link.download = `Quittung_${paymentDetails.value.transactionId}.pdf`
      link.click()
    } else {
      throw new Error(response.error || 'Receipt generation failed')
    }
  } catch (err: any) {
    console.error('❌ Error downloading receipt:', err)
    alert('Fehler beim Herunterladen der Quittung')
  }
}

// Lifecycle
onMounted(() => {
  loadPaymentDetails()
})
</script>