<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <!-- Voucher Download Modal -->
      <VoucherDownloadModal
        v-if="paymentDetails && hasVouchers"
        :show-modal="showVoucherModal"
        :vouchers="vouchers"
        @close="showVoucherModal = false; startCountdown()"
      />

      <!-- Main Success Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
      <!-- Loading State -->
      <div v-if="isLoading" class="text-center">
        <div class="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mb-4"></div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Zahlung wird verarbeitet...</h2>
        <p class="text-gray-600">Bitte warten Sie einen Moment.</p>
      </div>

      <!-- Success State -->
      <div v-else-if="paymentStatus === 'completed' || paymentStatus === 'authorized'" class="text-center">
        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <svg class="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Zahlung erfolgreich!</h2>
        <p class="text-gray-600 mb-6">
          <span v-if="paymentStatus === 'authorized'">Ihre Zahlung wurde autorisiert und wird zum Termin abgebucht.</span>
          <span v-else>Ihre Zahlung wurde erfolgreich verarbeitet.</span>
        </p>
        
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
        <p class="text-gray-600 mb-4">Die Zahlungsinformationen konnten nicht geladen werden.</p>
        <p class="text-sm text-gray-500 mb-6">
          Die Zahlung wird möglicherweise noch verarbeitet. Bitte versuchen Sie es erneut.
        </p>

        <button
          @click="checkStatus"
          class="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold mb-3"
        >
          <svg class="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Neu laden
        </button>

        <button
          @click="redirectToDashboard"
          class="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
        >
          Zum Dashboard
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSupabase } from '~/utils/supabase'
import VoucherDownloadModal from '~/components/VoucherDownloadModal.vue'

const route = useRoute()
const router = useRouter()

const isLoading = ref(true)
const paymentStatus = ref<string | null>(null)
const paymentDetails = ref<any>(null)
const countdown = ref(5)
const showVoucherModal = ref(false)
const vouchers = ref<any[]>([])
let countdownInterval: NodeJS.Timeout | null = null
let statusCheckInterval: NodeJS.Timeout | null = null

const transactionId = route.query.transactionId as string
const paymentId = route.query.paymentId as string

// ✅ Check if payment contains vouchers
const hasVouchers = computed(() => {
  if (!paymentDetails.value?.product_sales) return false
  return paymentDetails.value.product_sales.some((ps: any) => ps.product?.is_voucher)
})

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
    isLoading.value = true
    const supabase = getSupabase()
    
    // ✅ NEW: If no payment/transaction ID, try to find the most recent completed payment for logged-in user
    if (!paymentId && !transactionId) {
      console.log('🔍 No payment ID provided, trying to find recent payment for current user...')
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        console.log('👤 Auth user:', user.id)
        
        const { data: userData } = await supabase
          .from('users')
          .select('id, tenant_id')
          .eq('auth_user_id', user.id)
          .single()
        
        if (userData) {
          console.log('🏢 User data found:', { user_id: userData.id, tenant_id: userData.tenant_id })
          
          // Find the most recent completed OR authorized payment (created within last 5 minutes)
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
          
          const { data: recentPayment, error: recentError } = await supabase
            .from('payments')
            .select(`
              id,
              payment_status,
              total_amount_rappen,
              wallee_transaction_id,
              created_at,
              product_sales (
                id,
                product:products (
                  id,
                  name,
                  price_rappen,
                  is_voucher
                )
              ),
              appointments (
                id,
                start_time,
                title
              )
            `)
            .eq('user_id', userData.id)
            .eq('tenant_id', userData.tenant_id)
            .in('payment_status', ['completed', 'authorized'])
            .gte('created_at', fiveMinutesAgo)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          console.log('📊 Query result:', { payment: recentPayment, error: recentError })
          
          if (recentPayment) {
            console.log('✅ Found recent payment:', recentPayment.id)
            paymentDetails.value = recentPayment
            paymentStatus.value = recentPayment.payment_status
            isLoading.value = false
            startCountdown()
            return
          } else {
            console.warn('⚠️ No recent completed payment found within 5 minutes')
          }
        } else {
          console.warn('⚠️ User data not found')
        }
      } else {
        console.warn('⚠️ No authenticated user')
      }
      
      console.error('No payment ID or transaction ID provided and could not find recent payment')
      isLoading.value = false
      return
    }
    
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
    
    // Start countdown if payment is completed or authorized
    if ((data.payment_status === 'completed' || data.payment_status === 'authorized') && !countdownInterval) {
      startCountdown()
    }
    
    // Stop checking if payment is completed, authorized, or failed
    if (data.payment_status === 'completed' || data.payment_status === 'authorized' || data.payment_status === 'failed') {
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
  // Wait 3 seconds for webhook to process, then start countdown
  setTimeout(() => {
    countdownInterval = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        redirectToDashboard()
      }
    }, 1000)
  }, 3000)
}

const redirectToDashboard = () => {
  if (countdownInterval) clearInterval(countdownInterval)
  if (statusCheckInterval) clearInterval(statusCheckInterval)
  // Force a hard page reload to ensure data is fresh from the server
  window.location.href = '/customer-dashboard'
}

onMounted(() => {
  // Initial status check
  checkStatus()
  
  // Check status every 2 seconds if still pending (for max 30 seconds)
  let pollCount = 0
  const maxPolls = 15 // 15 * 2s = 30s
  
  statusCheckInterval = setInterval(() => {
    pollCount++
    
    if (paymentStatus.value === 'pending' && pollCount < maxPolls) {
      checkStatus()
    } else if (pollCount >= maxPolls) {
      // Stop polling after 30s
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval)
        statusCheckInterval = null
      }
    }
  }, 2000)
})

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
  if (statusCheckInterval) clearInterval(statusCheckInterval)
})
</script>

