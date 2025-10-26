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
        <p class="text-gray-600 mb-6">Ihre Zahlung wurde erfolgreich verarbeitet. Sie erhalten in Kürze eine Bestätigung per E-Mail.</p>
        <!-- Gutschein-Übersicht -->
        <div v-if="hasVouchers" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 class="text-lg font-semibold text-blue-900 mb-3 flex items-center">🎁 Ihre Gutscheine</h3>
          <div class="space-y-2">
            <div v-for="voucher in vouchers" :key="voucher.id" class="bg-white rounded-lg p-3 border border-blue-100">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-medium text-gray-900">{{ voucher.name }}</div>
                  <div class="text-sm text-gray-600">Code: {{ voucher.code }}</div>
                  <div class="text-sm text-gray-600">Betrag: CHF {{ formatVoucherAmount(voucher) }}</div>
                  <div v-if="voucher.voucher_recipient_name" class="text-sm text-gray-600">Empfänger: {{ voucher.voucher_recipient_name }}</div>
                </div>
                <div class="text-right">
                  <div class="text-sm text-green-600 font-medium">Aktiv</div>
                  <div class="text-xs text-gray-500">Gültig bis: {{ new Date(voucher.valid_until).toLocaleDateString('de-CH') }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Payment Details -->
        <div v-if="paymentDetails" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <h3 class="font-semibold text-blue-900 mb-3">Zahlungsdetails</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-blue-800 font-medium">Betrag:</span><span class="font-bold text-blue-900">CHF {{ paymentDetails.amount }}</span></div>
            <div class="flex justify-between"><span class="text-blue-800 font-medium">Zahlungsart:</span><span class="font-bold text-blue-900">{{ paymentDetails.method }}</span></div>
            <div class="flex justify-between"><span class="text-blue-800 font-medium">Transaktions-ID:</span><span class="font-bold font-mono text-xs text-blue-900">{{ paymentDetails.transactionId }}</span></div>
            <div class="flex justify-between"><span class="text-blue-800 font-medium">Datum:</span><span class="font-bold text-blue-900">{{ formatDate(paymentDetails.date) }}</span></div>
          </div>
        </div>
        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center py-4">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          <span class="ml-2 text-gray-600">Zahlungsdetails werden geladen...</span>
        </div>
        <!-- Actions -->
        <div class="space-y-3">
          <button @click="goToCalendar" class="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors">Zurück zum Dashboard</button>
          <button v-if="paymentDetails" @click="downloadReceipt" class="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors">📄 Quittung herunterladen</button>
          <button v-if="hasVouchers" @click="downloadVouchers" class="w-full bg-blue-100 text-blue-700 py-2 px-4 rounded-lg font-medium hover:bg-blue-200 transition-colors">🎁 Gutschein(e) herunterladen</button>
        </div>
      </div>
      <!-- Additional Info -->
      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600">Bei Fragen zur Zahlung kontaktieren Sie uns unter <a href="mailto:info@drivingteam.ch" class="text-green-600 hover:underline">info@drivingteam.ch</a></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from '#app'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const router = useRouter()
const supabase = getSupabase()

const isLoading = ref(true)
const paymentDetails = ref<any>(null)
const vouchers = ref<any[]>([])

// Helper: Beträge für Voucher konsistent berechnen
const formatVoucherAmount = (v: any): string => {
  const num = (x: any) => { const n = Number(x); return Number.isFinite(n) ? n : undefined }
  let amount: number | undefined
  if (v.discount_type === 'fixed') {
    const dv = num(v.discount_value); if (dv && dv > 0) amount = dv
  }
  if (amount === undefined) { const r = num(v.remaining_amount_rappen); if (r && r > 0) amount = r / 100 }
  if (amount === undefined) { const m = num(v.max_discount_rappen); if (m && m > 0) amount = m / 100 }
  if (amount === undefined) { const vr = num(v.value_rappen); if (vr && vr > 0) amount = vr / 100 }
  return (amount ?? 0).toFixed(2)
}

const loadPaymentDetails = async () => {
  try {
    // Check if we have multiple payment IDs in the URL
    const paymentIdsParam = route.query.payment_ids as string
    
    if (paymentIdsParam) {
      // Multiple payments from payment-process
      const paymentIds = paymentIdsParam.split(',')
      console.log('✅ Processing multiple payments:', paymentIds)
      
      // Update all payments to completed
      for (const paymentId of paymentIds) {
        const { data: payment, error: fetchError } = await supabase
          .from('payments')
          .select('*')
          .eq('id', paymentId)
          .single()
        
        if (!fetchError && payment && payment.payment_status !== 'completed') {
          console.log('💾 Updating payment to completed:', paymentId)
          await supabase
            .from('payments')
            .update({
              payment_status: 'completed',
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentId)
          
          // Also update the associated appointment
          if (payment.appointment_id) {
            await supabase
              .from('appointments')
              .update({
                is_paid: true,
                payment_status: 'paid',
                updated_at: new Date().toISOString()
              })
              .eq('id', payment.appointment_id)
          }
        }
      }
      
      // Load the first payment for display
      const { data: firstPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentIds[0])
        .single()
      
      if (firstPayment) {
        const totalAmount = paymentIds.length * (firstPayment.total_amount_rappen || 0)
        
        paymentDetails.value = {
          id: paymentIds.join(', '),
          amount: (totalAmount / 100).toFixed(2),
          adminFee: '0.00',
          discount: '0.00',
          method: getPaymentMethodName(firstPayment.payment_method),
          transactionId: firstPayment.wallee_transaction_id || firstPayment.id,
          date: new Date().toISOString(),
          status: 'completed',
          appointment: null,
          user: null,
          metadata: firstPayment.metadata
        }
      }
    } else {
      // Single payment (legacy)
      const transactionId = route.query.transaction_id || route.query.id
      if (!transactionId) return
      
      const { data: payment, error } = await supabase.from('payments').select('*').eq('id', transactionId).single()
      if (error || !payment) {
        paymentDetails.value = { error: true, message: 'Zahlung konnte nicht gefunden werden. Bitte kontaktieren Sie den Support.' }
        return
      }
      
      if (payment.payment_status !== 'completed') {
        try { await $fetch('/api/payments/status', { method: 'POST', body: { paymentId: payment.id, status: 'completed' } }) } catch {}
      }
      
      paymentDetails.value = {
        id: payment.id,
        amount: (payment.total_amount_rappen / 100).toFixed(2),
        adminFee: payment.admin_fee_rappen ? (payment.admin_fee_rappen / 100).toFixed(2) : '0.00',
        discount: payment.discount_rappen ? (payment.discount_rappen / 100).toFixed(2) : '0.00',
        method: getPaymentMethodName(payment.payment_method),
        transactionId: payment.id,
        date: payment.paid_at || payment.created_at,
        status: 'completed',
        appointment: null,
        user: null,
        metadata: payment.metadata
      }
      
      await loadVouchers(payment.id)
    }
  } finally {
    isLoading.value = false
  }
}

const getPaymentMethodName = (method: string): string => {
  const methods: Record<string, string> = { twint: 'Twint', wallee_card: 'Kreditkarte', stripe_card: 'Kreditkarte', debit_card: 'Debitkarte', cash: 'Bar', invoice: 'Rechnung' }
  return methods[method] || method
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Kein Datum'
  try { const date = new Date(dateString); if (isNaN(date.getTime())) return 'Ungültiges Datum'; return date.toLocaleDateString('de-CH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return 'Datum Fehler' }
}

const goToCalendar = async () => {
  // Prüfe zuerst den Benutzerstatus
  const authStore = useAuthStore()
  await authStore.fetchUserProfile()
  
  if (authStore.isClient) {
    router.push('/customer-dashboard')
  } else if (authStore.isAdmin) {
    router.push('/admin')
  } else {
    // Fallback zur Hauptseite
    router.push('/')
  }
}

const downloadReceipt = async () => {
  if (!paymentDetails.value) return
  
  try {
    const paymentId = (paymentDetails.value.id || route.query.transaction_id || route.query.id) as string
    if (!paymentId) throw new Error('Payment ID is required')
    
    console.log('📄 Downloading receipt for payment:', paymentId)
    
    const res = await fetch('/api/payments/receipt', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ paymentId }) 
    })
    
    console.log('📄 Response status:', res.status)
    console.log('📄 Response headers:', Object.fromEntries(res.headers.entries()))
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('❌ Receipt API error:', res.status, errorText)
      throw new Error(`Server error: ${res.status} - ${errorText}`)
    }
    
    const buffer = await res.arrayBuffer()
    console.log('📄 Received buffer size:', buffer.byteLength)
    
    if (buffer.byteLength === 0) {
      throw new Error('Empty PDF received from server')
    }
    
    const blob = new Blob([buffer], { type: 'application/pdf' })
    console.log('📄 Created blob size:', blob.size)
    
    // Try multiple download methods
    try {
      // Method 1: Standard download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Quittung_${paymentId}.pdf`
      link.style.display = 'none'
      
      // Add to DOM and trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup after a short delay
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link)
        }
        URL.revokeObjectURL(url)
      }, 1000)
      
    } catch (downloadError) {
      console.warn('⚠️ Standard download failed, trying alternative method:', downloadError)
      
      // Method 2: Open in new window
      const url = URL.createObjectURL(blob)
      const newWindow = window.open(url, '_blank')
      if (newWindow) {
        newWindow.document.title = `Quittung_${paymentId}.pdf`
        setTimeout(() => URL.revokeObjectURL(url), 5000)
      } else {
        throw new Error('Popup blocked. Bitte erlauben Sie Popups für diese Seite.')
      }
    }
    
    console.log('✅ Receipt downloaded successfully')
  } catch (err: any) { 
    console.error('❌ Error downloading receipt:', err)
    alert(`Fehler beim Herunterladen der Quittung: ${err.message}`)
  }
}

// Gutschein-Funktionen
const loadVouchers = async (paymentId: string) => {
  try {
    const { data: voucherData } = await supabase
      .from('discounts')
      .select('id, code, name, discount_value, discount_type, remaining_amount_rappen, max_discount_rappen, value_rappen, voucher_recipient_name, voucher_recipient_email, valid_until, created_at')
      .eq('payment_id', paymentId)
      .eq('is_voucher', true)
      .order('created_at', { ascending: true })
    vouchers.value = voucherData || []
  } catch (err: any) { console.error('❌ Error loading vouchers:', err) }
}

const downloadVouchers = async () => {
  if (vouchers.value.length === 0) return
  for (const voucher of vouchers.value) {
    try {
      const res = await fetch('/api/vouchers/download-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voucherId: voucher.id }) })
      if (!res.ok) { console.error('❌ Error generating voucher PDF:', await res.text()); continue }
      const pdfBuffer = await res.arrayBuffer(); const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
      const objectUrl = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = objectUrl; link.download = `Gutschein_${voucher.code}.pdf`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(objectUrl)
      await new Promise(r => setTimeout(r, 500))
    } catch (err: any) { console.error('❌ Error downloading voucher:', voucher.code, err) }
  }
}

const hasVouchers = computed(() => vouchers.value.length > 0)

onMounted(() => { loadPaymentDetails() })
</script>