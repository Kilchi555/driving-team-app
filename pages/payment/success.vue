<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
      <!-- Loading State -->
      <div v-if="isLoading" class="text-center">
        <div class="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mb-4"></div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Zahlung wird verarbeitet...</h2>
        <p class="text-gray-600">Bitte warten Sie einen Moment.</p>
      </div>

      <!-- Success State -->
      <div v-else-if="paymentStatus === 'completed'" class="text-center">
        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <svg class="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Zahlung erfolgreich!</h2>
        <p class="text-gray-600 mb-6">Ihre Zahlung wurde erfolgreich verarbeitet.</p>
        
        <div v-if="paymentDetails" class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <div class="flex justify-between mb-2">
            <span class="text-gray-600">Betrag:</span>
            <span class="font-semibold text-gray-900">CHF {{ (paymentDetails.total_amount_rappen / 100).toFixed(2) }}</span>
          </div>
          <div v-if="paymentDetails.appointment" class="flex justify-between">
            <span class="text-gray-600">Termin:</span>
            <span class="font-semibold text-gray-900">{{ formatDate(paymentDetails.appointment.start_time) }}</span>
          </div>
        </div>

        <p class="text-sm text-gray-500 mb-6">
          Sie werden in {{ countdown }} Sekunden automatisch weitergeleitet...
        </p>

        <button
          @click="redirectToDashboard"
          class="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
        >
          Zum Dashboard
        </button>
      </div>

      <!-- Failed State -->
      <div v-else-if="paymentStatus === 'failed'" class="text-center">
        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
          <svg class="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Zahlung fehlgeschlagen</h2>
        <p class="text-gray-600 mb-6">Ihre Zahlung konnte nicht verarbeitet werden.</p>

        <button
          @click="redirectToDashboard"
          class="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
        >
          Zurück zum Dashboard
        </button>
      </div>

      <!-- Pending State -->
      <div v-else-if="paymentStatus === 'pending'" class="text-center">
        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
          <svg class="h-10 w-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Zahlung wird verarbeitet</h2>
        <p class="text-gray-600 mb-6">Ihre Zahlung wird noch verarbeitet. Dies kann einige Minuten dauern.</p>

        <button
          @click="checkStatus"
          class="w-full bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-colors font-semibold mb-3"
        >
          Status aktualisieren
        </button>

        <button
          @click="redirectToDashboard"
          class="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
        >
          Zum Dashboard
        </button>
      </div>

      <!-- Error State -->
      <div v-else class="text-center">
        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
          <svg class="h-10 w-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Zahlung nicht gefunden</h2>
        <p class="text-gray-600 mb-6">Die Zahlungsinformationen konnten nicht geladen werden.</p>

        <button
          @click="redirectToDashboard"
          class="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
        >
          Zum Dashboard
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSupabase } from '~/utils/supabase'

const route = useRoute()
const router = useRouter()

const isLoading = ref(true)
const paymentStatus = ref<string | null>(null)
const paymentDetails = ref<any>(null)
const countdown = ref(5)
let countdownInterval: NodeJS.Timeout | null = null
let statusCheckInterval: NodeJS.Timeout | null = null

const transactionId = route.query.transactionId as string
const paymentId = route.query.paymentId as string

const formatDate = (dateStr: string) => {
  const parts = dateStr.replace('T', ' ').replace('Z', '').split(/[-: ]/)
  const d = new Date(
    parseInt(parts[0]),
    parseInt(parts[1]) - 1,
    parseInt(parts[2]),
    parseInt(parts[3] || '0'),
    parseInt(parts[4] || '0'),
    parseInt(parts[5] || '0')
  )
  return `${d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`
}

const checkStatus = async () => {
  try {
    const supabase = getSupabase()
    
    let query = supabase
      .from('payments')
      .select(`
        id,
        payment_status,
        total_amount_rappen,
        wallee_transaction_id,
        appointments (
          id,
          start_time,
          title
        )
      `)
    
    if (paymentId) {
      query = query.eq('id', paymentId)
    } else if (transactionId) {
      query = query.eq('wallee_transaction_id', transactionId)
    } else {
      console.error('No payment ID or transaction ID provided')
      isLoading.value = false
      return
    }
    
    const { data, error } = await query.single()
    
    if (error || !data) {
      console.error('Payment not found:', error)
      paymentStatus.value = null
      isLoading.value = false
      return
    }
    
    paymentDetails.value = data
    paymentStatus.value = data.payment_status
    isLoading.value = false
    
    // Start countdown if payment is completed
    if (data.payment_status === 'completed' && !countdownInterval) {
      startCountdown()
    }
    
    // Stop checking if payment is completed or failed
    if (data.payment_status === 'completed' || data.payment_status === 'failed') {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval)
        statusCheckInterval = null
      }
    }
  } catch (err) {
    console.error('Error checking payment status:', err)
    isLoading.value = false
  }
}

const startCountdown = () => {
  countdownInterval = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      redirectToDashboard()
    }
  }, 1000)
}

const redirectToDashboard = () => {
  if (countdownInterval) clearInterval(countdownInterval)
  if (statusCheckInterval) clearInterval(statusCheckInterval)
  router.push('/customer-dashboard')
}

onMounted(() => {
  // Initial status check
  checkStatus()
  
  // Check status every 3 seconds if still pending
  statusCheckInterval = setInterval(() => {
    if (paymentStatus.value === 'pending') {
      checkStatus()
    }
  }, 3000)
})

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
  if (statusCheckInterval) clearInterval(statusCheckInterval)
})
</script>

