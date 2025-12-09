<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
    <!-- Header -->
    <div class="bg-white shadow-lg border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-3 sm:py-4">
          <div class="flex items-center space-x-2 sm:space-x-4">
            <button 
              @click="goBack"
              class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 class="text-xl sm:text-2xl font-bold text-gray-900">Zahlungsmittel</h1>
              <p class="text-xs sm:text-sm text-gray-600">Verwalten Sie Ihre gespeicherten Zahlungsmethoden</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
        <p class="mt-4 text-gray-600 text-base sm:text-lg">Zahlungsmittel werden geladen...</p>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      
      <!-- Info Box: Zahlungsmittel werden automatisch gespeichert -->
      <div class="mb-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div class="flex items-start space-x-3">
          <svg class="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div class="flex-1">
            <h3 class="font-semibold text-blue-900 mb-1">Zahlungsmittel werden automatisch gespeichert</h3>
            <p class="text-sm text-blue-800">
              Wenn Sie Ihren ersten Termin bestätigen und bezahlen, wird Ihr Zahlungsmittel automatisch gespeichert. 
              Sie sehen hier alle gespeicherten Zahlungsmittel, die für zukünftige automatische Abbuchungen verwendet werden.
            </p>
          </div>
        </div>
      </div>

      <!-- Payment Methods List -->
      <div v-if="paymentMethods.length > 0" class="space-y-4">
        <div
          v-for="method in paymentMethods"
          :key="method.id"
          class="bg-white rounded-xl shadow-lg border p-4 sm:p-6 hover:shadow-xl transition-shadow"
          :class="method.is_default ? 'border-blue-500 border-2' : 'border-gray-200'"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4 flex-1">
              <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <h3 class="text-lg font-semibold text-gray-900">{{ method.display_name }}</h3>
                    <span
                      v-if="method.is_default"
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      Standard
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">
                    {{ method.payment_method_type || 'Karte' }}
                    <span v-if="method.expires_at" class="ml-2">
                      • Läuft ab {{ formatDate(method.expires_at) }}
                    </span>
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    Gespeichert bei Wallee (PCI-DSS compliant)
                  </p>
                </div>
            </div>
            <div class="flex items-center space-x-2">
              <button
                v-if="!method.is_default"
                @click="setAsDefault(method.id)"
                class="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Als Standard setzen
              </button>
              <button
                @click="deletePaymentMethod(method.id)"
                class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white rounded-xl shadow-lg border border-gray-200 p-8 sm:p-12 text-center">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Noch keine Zahlungsmittel</h3>
        <p class="text-gray-600 mb-4">
          Ihr Zahlungsmittel wird automatisch gespeichert, wenn Sie Ihren ersten Termin bestätigen und bezahlen.
        </p>
      </div>

      <!-- Info Box -->
      <div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex">
          <svg class="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
          </svg>
          <div class="text-sm text-blue-800">
            <strong>Automatische Abbuchung:</strong> Wenn Sie bei der Terminbestätigung der automatischen Abbuchung zustimmen, 
            wird der Betrag automatisch von Ihrem Standard-Zahlungsmittel abgebucht. Sie können jederzeit ein anderes Zahlungsmittel 
            als Standard festlegen.
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { navigateTo, useRoute } from '#app'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { storeToRefs } from 'pinia'

definePageMeta({
  middleware: 'auth',
  layout: 'customer'
})

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const route = useRoute()

const isLoading = ref(true)
const paymentMethods = ref<any[]>([])

const loadPaymentMethods = async () => {
  if (!user.value?.id) return

  try {
    isLoading.value = true
    const supabase = getSupabase()
    
    // Get user's business ID
    const { data: userData } = await supabase
      .from('users')
      .select('id, tenant_id, email')
      .eq('auth_user_id', user.value.id)
      .single()

    if (!userData) return

    // Load payment methods from database (Wallee tokens)
    const { data: localMethods, error: localError } = await supabase
      .from('customer_payment_methods')
      .select('*')
      .eq('user_id', userData.id)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (localError) {
      console.warn('Warning loading local payment methods:', localError)
    }

    // ✅ OPTIONAL: Synchronisiere mit Wallee API, um aktuelle Token zu holen
    // (Wallee speichert die Zahlungsmittel, wir speichern nur Referenzen)
    try {
      // Lade Token von Wallee für diesen Kunden (falls Wallee API das unterstützt)
      // Für jetzt verwenden wir nur die lokal gespeicherten Token
      paymentMethods.value = localMethods || []
    } catch (walleeError) {
      console.warn('Could not sync with Wallee:', walleeError)
      // Fallback: Verwende lokal gespeicherte Token
      paymentMethods.value = localMethods || []
    }

  } catch (err: any) {
    console.error('Error loading payment methods:', err)
    alert('Fehler beim Laden der Zahlungsmittel: ' + err.message)
  } finally {
    isLoading.value = false
  }
}

const setAsDefault = async (methodId: string) => {
  try {
    const supabase = getSupabase()
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.value?.id)
      .single()

    if (!userData) return

    // Remove default from all methods
    await supabase
      .from('customer_payment_methods')
      .update({ is_default: false })
      .eq('user_id', userData.id)

    // Set new default
    const { error } = await supabase
      .from('customer_payment_methods')
      .update({ is_default: true })
      .eq('id', methodId)
      .eq('user_id', userData.id)

    if (error) throw error

    await loadPaymentMethods()

  } catch (err: any) {
    console.error('Error setting default:', err)
    alert('Fehler beim Setzen des Standards: ' + err.message)
  }
}

const deletePaymentMethod = async (methodId: string) => {
  if (!confirm('Möchten Sie dieses Zahlungsmittel wirklich löschen?')) return

  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('customer_payment_methods')
      .update({ is_active: false })
      .eq('id', methodId)

    if (error) throw error

    await loadPaymentMethods()

  } catch (err: any) {
    console.error('Error deleting payment method:', err)
    alert('Fehler beim Löschen: ' + err.message)
  }
}


const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    month: '2-digit',
    year: 'numeric'
  })
}

const goBack = () => {
  navigateTo('/customer-dashboard')
}

// ✅ Verarbeite Return-URL von Wallee nach Tokenization
const handleWalleeReturn = async () => {
  // Wallee fügt automatisch transactionId oder transaction_id zur URL hinzu
  const walleeToken = route.query.wallee_token as string
  const transactionId = (route.query.transactionId || route.query.transaction_id) as string | undefined
  
  if (!walleeToken && !transactionId) return
  
  logger.debug('🔍 Wallee return detected:', { 
    walleeToken, 
    transactionId,
    allQueryParams: route.query 
  })
  
  try {
    const supabase = getSupabase()
    
    // Get user's business ID
    const { data: userData } = await supabase
      .from('users')
      .select('id, tenant_id, email')
      .eq('auth_user_id', user.value?.id)
      .single()

    if (!userData) {
      console.error('❌ User not found for tokenization return')
      return
    }

    if (transactionId && (walleeToken === 'success' || !walleeToken)) {
      // ✅ Versuche Token von Wallee zu holen und zu speichern
      logger.debug('💳 Attempting to save payment token from transaction:', transactionId)
      
      try {
        const result = await $fetch('/api/wallee/save-payment-token', {
          method: 'POST',
          body: {
            transactionId: transactionId,
            userId: userData.id,
            tenantId: userData.tenant_id
          }
        })
        
        if (result.success) {
          logger.debug('✅ Payment method token saved successfully:', result.tokenId)
          // Reload payment methods
          await loadPaymentMethods()
          // Remove query parameters from URL
          await navigateTo('/customer/payment-methods')
          alert('Zahlungsmittel wurde erfolgreich hinzugefügt!')
        } else {
          console.warn('⚠️ Token could not be saved yet:', result.message)
          // Token wird möglicherweise später via Webhook gespeichert
          await navigateTo('/customer/payment-methods')
        }
      } catch (saveError: any) {
        console.error('❌ Error saving payment token:', saveError)
        // Nicht kritisch - Token wird möglicherweise später via Webhook gespeichert
        await navigateTo('/customer/payment-methods')
      }
    } else if (walleeToken === 'failed') {
      console.warn('⚠️ Payment method tokenization failed')
      await navigateTo('/customer/payment-methods')
      alert('Das Hinzufügen des Zahlungsmittels ist fehlgeschlagen. Bitte versuchen Sie es erneut.')
    }
  } catch (err: any) {
    console.error('❌ Error handling Wallee return:', err)
    await navigateTo('/customer/payment-methods')
  }
}

onMounted(async () => {
  await loadPaymentMethods()
  await handleWalleeReturn()
})
</script>

