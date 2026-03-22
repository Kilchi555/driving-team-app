<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%);">
    <div class="w-full max-w-lg">

      <!-- Loading -->
      <div v-if="isLoading" class="bg-white rounded-3xl shadow-2xl p-12 text-center">
        <div class="inline-block w-14 h-14 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
        <h2 class="text-xl font-semibold text-gray-800 mb-2">Zahlung wird verarbeitet…</h2>
        <p class="text-gray-500 text-sm">Bitte einen Moment warten.</p>
      </div>

      <!-- ── SUCCESS + VOUCHERS ── -->
      <div v-else-if="paymentStatus === 'completed' || paymentStatus === 'authorized'">

        <!-- Success header card -->
        <div class="bg-white rounded-3xl shadow-2xl overflow-hidden mb-4">

          <!-- Green top banner -->
          <div class="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-8 text-center text-white">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
              <svg class="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h1 class="text-2xl font-bold mb-1">Zahlung erfolgreich!</h1>
            <p class="text-emerald-100 text-sm">
              <span v-if="paymentStatus === 'authorized'">Autorisiert – wird zum Termin abgebucht.</span>
              <span v-else>Deine Zahlung wurde erfolgreich verarbeitet.</span>
            </p>
          </div>

          <!-- Amount -->
          <div v-if="paymentDetails" class="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
            <span class="text-sm text-gray-500 font-medium">Bezahlter Betrag</span>
            <span class="text-lg font-bold text-gray-900">CHF {{ (paymentDetails.total_amount_rappen / 100).toFixed(2) }}</span>
          </div>

          <!-- Redirect hint or button -->
          <div class="px-8 py-5 text-center">
            <p v-if="!hasVouchers" class="text-sm text-gray-400 mb-4">
              Weiterleitung in {{ countdown }} Sekunden…
            </p>
            <button
              @click="redirectToDashboard"
              class="w-full py-3 rounded-2xl font-semibold text-sm text-white transition-all"
              style="background: linear-gradient(135deg, #10b981, #0d9488);"
            >
              Zum Dashboard
            </button>
          </div>
        </div>

        <!-- ── Voucher cards ── -->
        <div v-if="hasVouchers && vouchers.length > 0" class="space-y-4">

          <div class="text-center mb-2">
            <span class="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 bg-white/80 rounded-full px-4 py-1.5 shadow-sm">
              🎁 Deine Gutscheine wurden per E-Mail verschickt
            </span>
          </div>

          <div
            v-for="voucher in vouchers"
            :key="voucher.id"
            class="bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <!-- Voucher hero -->
            <div class="relative overflow-hidden px-8 py-7 text-white" :style="`background: linear-gradient(135deg, ${brandPrimary} 0%, ${brandPrimary}cc 100%);`">
              <!-- Decorative circles -->
              <div class="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10"></div>
              <div class="absolute -bottom-10 left-1/4 w-48 h-48 rounded-full bg-white/5"></div>

              <div class="relative z-10">
                <div class="inline-block bg-white/15 border border-white/25 text-white text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-4">
                  Geschenkgutschein
                </div>
                <div class="text-5xl font-black tracking-tight mb-1">
                  <span class="text-xl font-semibold opacity-80 align-top mt-2.5 inline-block mr-1">CHF</span>{{ (voucher.amount_rappen / 100).toFixed(2) }}
                </div>
                <div class="text-white/80 text-sm font-medium">{{ voucher.name }}</div>
                <div v-if="voucher.description" class="text-white/60 text-xs mt-0.5">{{ voucher.description }}</div>
              </div>
            </div>

            <!-- Tear line -->
            <div class="relative h-5 bg-gray-50">
              <div class="absolute inset-0 flex items-center justify-between px-5">
                <div class="w-5 h-5 rounded-full bg-gray-50 -ml-2.5 shadow-inner"></div>
                <div class="flex-1 border-t-2 border-dashed border-gray-200 mx-2"></div>
                <div class="w-5 h-5 rounded-full bg-gray-50 -mr-2.5 shadow-inner"></div>
              </div>
            </div>

            <!-- Code & info -->
            <div class="px-8 py-6">
              <!-- Code -->
              <div class="mb-5">
                <p class="text-xs font-bold tracking-widest uppercase text-gray-400 mb-2">Gutscheincode</p>
                <div class="inline-flex items-center gap-3 rounded-xl px-5 py-3 border-2" :style="`background:${brandPrimary}08; border-color:${brandPrimary}25;`">
                  <span class="text-lg">🎟</span>
                  <span class="font-mono text-xl font-black tracking-widest" :style="`color:${brandPrimary};`">{{ voucher.code }}</span>
                  <button
                    @click="copyCode(voucher.code)"
                    class="ml-1 text-gray-400 hover:text-gray-700 transition-colors"
                    title="Code kopieren"
                  >
                    <svg v-if="copiedCode !== voucher.code" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                    <svg v-else class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Meta row -->
              <div class="flex items-center justify-between text-sm mb-6">
                <div>
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Empfänger</p>
                  <p class="font-semibold text-gray-800">{{ voucher.recipient_name || 'Inhaber/in' }}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Gültig bis</p>
                  <p class="font-semibold text-gray-800">{{ formatValidUntil(voucher.valid_until) }}</p>
                </div>
              </div>

              <p class="text-center text-xs text-gray-400 mt-3">
                📧 Gutschein wurde an deine E-Mail-Adresse gesendet (inkl. PDF)
              </p>

              <!-- Redeem button -->
              <div class="mt-6 pt-6 border-t border-gray-100">
                <button
                  @click="selectedVoucherForRedeem = voucher; showRedeemModal = true"
                  class="w-full py-3 rounded-xl font-semibold text-sm transition-all text-white"
                  :style="`background: ${brandPrimary}; opacity: 0.9;`"
                  @mouseenter="$event.target.style.opacity = '1'"
                  @mouseleave="$event.target.style.opacity = '0.9'"
                >
                  💰 Sofort als Guthaben einlösen
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Redeem Modal -->
        <div v-if="showRedeemModal && selectedVoucherForRedeem && currentUserId">
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div class="bg-white rounded-xl max-w-md w-full shadow-2xl">
              <!-- Header -->
              <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600">
                <div class="flex justify-between items-center">
                  <div class="flex items-center space-x-2">
                    <span class="text-2xl">💰</span>
                    <h3 class="text-xl font-semibold text-white">
                      Gutschein einlösen
                    </h3>
                  </div>
                  <button 
                    @click="showRedeemModal = false; selectedVoucherForRedeem = null" 
                    class="text-white hover:text-gray-200 text-2xl font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <!-- Body -->
              <div class="px-6 py-6">
                <div v-if="redeemSuccess" class="text-center py-6">
                  <div class="text-6xl mb-4 animate-bounce">🎉</div>
                  <h4 class="text-2xl font-bold text-green-600 mb-2">Erfolgreich eingelöst!</h4>
                  <p class="text-gray-600 mb-4">{{ redeemMessage }}</p>
                  <button
                    @click="showRedeemModal = false; selectedVoucherForRedeem = null; redeemSuccess = false"
                    class="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    Schließen
                  </button>
                </div>

                <div v-else>
                  <div class="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p class="text-sm text-blue-800 font-medium">
                      ℹ️ Dein Gutschein im Wert von <strong>CHF {{ (selectedVoucherForRedeem.amount_rappen / 100).toFixed(2) }}</strong> wird als Guthaben gutgeschrieben.
                    </p>
                  </div>

                  <div v-if="redeemError" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p class="text-sm font-medium text-red-800">⚠️ {{ redeemError }}</p>
                  </div>

                  <div class="flex space-x-3">
                    <button
                      @click="showRedeemModal = false; selectedVoucherForRedeem = null"
                      :disabled="redeemLoading"
                      class="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-semibold disabled:opacity-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      @click="doRedeemVoucher(selectedVoucherForRedeem)"
                      :disabled="redeemLoading"
                      class="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center"
                    >
                      <span v-if="!redeemLoading">Einlösen</span>
                      <span v-else class="flex items-center">
                        <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Wird eingelöst...
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Failed -->
      <div v-else-if="paymentStatus === 'failed'" class="bg-white rounded-3xl shadow-2xl p-10 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-5">
          <svg class="w-9 h-9 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Zahlung fehlgeschlagen</h2>
        <p class="text-gray-500 text-sm mb-6">Die Zahlung konnte nicht verarbeitet werden.</p>
        <button @click="redirectToDashboard" class="w-full py-3 rounded-2xl bg-gray-800 text-white font-semibold text-sm">
          Zurück
        </button>
      </div>

      <!-- Pending -->
      <div v-else-if="paymentStatus === 'pending'" class="bg-white rounded-3xl shadow-2xl p-10 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-5">
          <svg class="w-9 h-9 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Zahlung wird verarbeitet</h2>
        <p class="text-gray-500 text-sm mb-6">Das kann einen Moment dauern.</p>
        <button @click="checkStatus" class="w-full py-3 rounded-2xl bg-amber-500 text-white font-semibold text-sm mb-3">
          Status aktualisieren
        </button>
        <button @click="redirectToDashboard" class="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm">
          Zum Dashboard
        </button>
      </div>

      <!-- Not found -->
      <div v-else class="bg-white rounded-3xl shadow-2xl p-10 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-5">
          <svg class="w-9 h-9 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Zahlung nicht gefunden</h2>
        <p class="text-gray-500 text-sm mb-6">Die Zahlungsinformationen konnten nicht geladen werden.</p>
        <button @click="checkStatus" class="w-full py-3 rounded-2xl bg-blue-600 text-white font-semibold text-sm mb-3">
          Neu laden
        </button>
        <button @click="redirectToDashboard" class="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm">
          Zum Dashboard
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { definePageMeta } from '#imports'

// Allow guest access to success page (don't require auth)
definePageMeta({
  ssr: false
})

import { getSupabase } from '~/utils/supabase'
import { useVouchers } from '~/composables/useVouchers'
import { logger } from '~/utils/logger'

const route = useRoute()

const isLoading = ref(true)
const paymentStatus = ref<string | null>(null)
const paymentDetails = ref<any>(null)
const countdown = ref(5)
const vouchers = ref<any[]>([])
const copiedCode = ref<string | null>(null)
const downloadingId = ref<string | null>(null)
const brandPrimary = ref('#1a56db')
const currentUserId = ref<string | null>(null)
const showRedeemModal = ref(false)
const selectedVoucherForRedeem = ref<any>(null)
const redeemLoading = ref(false)
const redeemError = ref('')
const redeemSuccess = ref(false)
const redeemMessage = ref('')

let countdownInterval: NodeJS.Timeout | null = null
let statusCheckInterval: NodeJS.Timeout | null = null

const { downloadVoucherPDF: doDownloadPDF } = useVouchers()

const transactionId = (route.query.transactionId || route.query.transaction_id) as string | undefined
const paymentId = route.query.paymentId as string | undefined

const hasVouchers = computed(() => vouchers.value.length > 0)

const formatValidUntil = (dateStr: string) => {
  if (!dateStr) return '–'
  return new Date(dateStr).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })
}

const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code)
    copiedCode.value = code
    setTimeout(() => { copiedCode.value = null }, 2000)
  } catch { /* ignore */ }
}

const downloadVoucherPDF = async (voucherId: string) => {
  downloadingId.value = voucherId
  try {
    await doDownloadPDF(voucherId)
  } finally {
    downloadingId.value = null
  }
}

// Load tenant branding for voucher card color
const loadBranding = async (tenantId: string) => {
  try {
    const supabase = getSupabase()
    const { data } = await supabase.from('tenants').select('primary_color').eq('id', tenantId).single()
    if (data?.primary_color) brandPrimary.value = data.primary_color
  } catch { /* ignore */ }
}

const checkStatus = async () => {
  try {
    isLoading.value = true

    if (!paymentId && !transactionId) {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()
      const authUser = session?.user
      if (authUser) {
        const { data: userData } = await supabase.from('users').select('id, tenant_id').eq('auth_user_id', authUser.id).single()
        if (userData) {
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
          const { data: recentPayment } = await supabase
            .from('payments')
            .select('id, payment_status, total_amount_rappen, metadata')
            .eq('user_id', userData.id)
            .in('payment_status', ['completed', 'authorized'])
            .gte('created_at', fiveMinutesAgo)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (recentPayment) {
            paymentDetails.value = recentPayment
            paymentStatus.value = recentPayment.payment_status
            isLoading.value = false
            await checkForVouchers(recentPayment, [])
            if (!hasVouchers.value) startCountdown()
            return
          }
        }
      }
      isLoading.value = false
      return
    }

    // Use the server-side endpoint so guest users (no session) can also read their payment
    const params = new URLSearchParams()
    if (paymentId) params.set('payment_id', paymentId)
    else if (transactionId) params.set('transaction_id', transactionId)

    let data: any = null
    let apiVouchers: any[] = []
    try {
      const response = await $fetch<{ data: any; vouchers: any[] }>(`/api/shop/get-payment?${params.toString()}`)
      data = response.data
      apiVouchers = response.vouchers || []
    } catch {
      paymentStatus.value = null
      isLoading.value = false
      return
    }

    if (!data) {
      paymentStatus.value = null
      isLoading.value = false
      return
    }

    paymentDetails.value = data
    paymentStatus.value = data.payment_status
    isLoading.value = false

    if (data.tenant_id) await loadBranding(data.tenant_id)

    await checkForVouchers(data, apiVouchers)

    if ((data.payment_status === 'completed' || data.payment_status === 'authorized') && !hasVouchers.value) {
      startCountdown()
    }

    if (['completed', 'authorized', 'failed'].includes(data.payment_status)) {
      if (statusCheckInterval) { clearInterval(statusCheckInterval); statusCheckInterval = null }
    }
  } catch (err) {
    console.error('Error checking payment status:', err)
    isLoading.value = false
  }
}

const checkForVouchers = async (payment: any, initialVouchers: any[]) => {
  try {
    const metadata = typeof payment.metadata === 'string' ? JSON.parse(payment.metadata) : payment.metadata
    const hasVoucherProducts = metadata?.products?.some((p: any) => p.is_voucher)
    if (!hasVoucherProducts) return

    let records = initialVouchers
    if (records.length === 0) {
      // Webhook may still be processing — retry once via API
      await new Promise(resolve => setTimeout(resolve, 2500))
      try {
        const params = new URLSearchParams({ payment_id: payment.id })
        const response = await $fetch<{ data: any; vouchers: any[] }>(`/api/shop/get-payment?${params.toString()}`)
        records = response.vouchers || []
      } catch { /* ignore */ }
    }
    if (records.length > 0) {
      vouchers.value = records
      logger.debug('🎁 Vouchers loaded:', records.length)
      if (brandPrimary.value === '#1a56db' && records[0]?.tenant_id) {
        await loadBranding(records[0].tenant_id)
      }
    }
  } catch { /* ignore parse errors */ }
}

const startCountdown = () => {
  setTimeout(() => {
    countdownInterval = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) redirectToDashboard()
    }, 1000)
  }, 2000)
}

const redirectToDashboard = async () => {
  if (countdownInterval) clearInterval(countdownInterval)
  if (statusCheckInterval) clearInterval(statusCheckInterval)
  const { data: { session } } = await getSupabase().auth.getSession()
  window.location.href = session ? '/customer-dashboard' : '/shop'
}

const doRedeemVoucher = async (voucher: any) => {
  if (!currentUserId.value) {
    redeemError.value = 'Benutzer-ID nicht gefunden'
    return
  }

  redeemLoading.value = true
  redeemError.value = ''

  try {
    const response = await $fetch<any>('/api/vouchers/redeem', {
      method: 'POST',
      body: {
        code: voucher.code,
        user_id: currentUserId.value
      }
    })

    if (response.success) {
      redeemSuccess.value = true
      redeemMessage.value = response.message || `CHF ${(voucher.amount_rappen / 100).toFixed(2)} wurden deinem Guthaben hinzugefügt.`
      logger.debug('✅ Voucher redeemed successfully:', voucher.code)
    }
  } catch (error: any) {
    console.error('❌ Error redeeming voucher:', error)
    const msg = error.data?.statusMessage || error.statusMessage || error.data?.message || error.message
    redeemError.value = msg || 'Ein Fehler ist beim Einlösen aufgetreten'
  } finally {
    redeemLoading.value = false
  }
}

onMounted(async () => {
  // Try to get current user ID (for guest or authenticated)
  try {
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.user?.id) {
      // Authenticated user
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single()
      if (userData?.id) currentUserId.value = userData.id
    } else if (paymentId) {
      // Guest user - try to extract from payment data
      const params = new URLSearchParams({ payment_id: paymentId })
      const response = await $fetch<{ data: any }>(`/api/shop/get-payment?${params.toString()}`)
      if (response?.data?.user_id) currentUserId.value = response.data.user_id
    }
  } catch { /* ignore */ }

  checkStatus()
  let pollCount = 0
  statusCheckInterval = setInterval(() => {
    pollCount++
    if (paymentStatus.value === 'pending' && pollCount < 15) {
      checkStatus()
    } else if (pollCount >= 15) {
      if (statusCheckInterval) { clearInterval(statusCheckInterval); statusCheckInterval = null }
    }
  }, 2000)
})

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
  if (statusCheckInterval) clearInterval(statusCheckInterval)
})
</script>
