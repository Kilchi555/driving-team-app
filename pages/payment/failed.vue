<!-- pages/payment/failed.vue -->
<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      
      <!-- Error Card -->
      <div class="bg-white rounded-lg shadow-lg p-6 text-center">
        
        <!-- Error Icon -->
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>

        <!-- Error Message -->
        <h1 class="text-2xl font-bold text-gray-900 mb-2">Zahlung fehlgeschlagen</h1>
        <p class="text-gray-600 mb-6">
          Ihre Zahlung konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut oder wählen Sie eine andere Zahlungsart.
        </p>

        <!-- Error Details -->
        <div v-if="errorDetails" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
          <h3 class="font-semibold text-red-900 mb-2">Details</h3>
          <p class="text-sm text-red-800">{{ errorDetails.message }}</p>
          <p v-if="errorDetails.transactionId" class="text-xs text-red-600 mt-2 font-mono">
            Referenz: {{ errorDetails.transactionId }}
          </p>
        </div>

        <!-- Common Error Reasons -->
        <div class="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h3 class="font-semibold text-gray-900 mb-3">Mögliche Ursachen:</h3>
          <ul class="text-sm text-gray-600 space-y-1">
            <li>• Ungenügend Guthaben auf der Karte</li>
            <li>• Karte ist abgelaufen oder gesperrt</li>
            <li>• Technisches Problem beim Zahlungsanbieter</li>
            <li>• Verbindungsfehler</li>
          </ul>
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <button
            @click="retryPayment"
            class="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            💳 Zahlung wiederholen
          </button>
          
          <button
            @click="goToCalendar"
            class="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Zurück zum Dashboard
          </button>
          
          <button
            @click="contactSupport"
            class="w-full text-gray-600 py-2 px-4 rounded-lg font-medium hover:text-gray-800 transition-colors"
          >
            📞 Support kontaktieren
          </button>
        </div>
      </div>

      <!-- Additional Info -->
      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600">
          Bei anhaltenden Problemen kontaktieren Sie uns unter 
          <a href="mailto:info@drivingteam.ch" class="text-green-600 hover:underline">
            info@drivingteam.ch
          </a> oder 
          <a href="tel:+41444310033" class="text-green-600 hover:underline">
            044 431 00 33
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, onMounted } from 'vue'
import {  useRoute, useRouter } from '#app'
import { toLocalTimeString } from '~/utils/dateUtils'

// Router
const route = useRoute()
const router = useRouter()

// Supabase

// State
const errorDetails = ref<any>(null)
const failedPayment = ref<any>(null)

// Methods
const loadFailureDetails = async () => {
  try {
    const transactionId = route.query.transaction_id || route.query.id
    const errorCode = route.query.error
    const errorMessage = route.query.error_description
    
    logger.debug('❌ Payment failed:', { transactionId, errorCode, errorMessage })

    if (transactionId) {
      // ✅ SECURITY FIX: Use existing secure API instead of direct DB update
      try {
        const result = await $fetch('/api/payments/status', {
          method: 'POST',
          body: {
            transactionId,
            status: 'failed'
          }
        })
        
        // Payment details are returned by the API
        if (result.success && result.payment) {
          failedPayment.value = result.payment
        }
      } catch (apiError: any) {
        logger.warn('⚠️ Could not mark payment as failed via API:', apiError.message)
        // Non-critical - continue to show error page
      }
    }

    // Set error details
    errorDetails.value = {
      message: errorMessage || 'Die Zahlung wurde abgebrochen oder konnte nicht verarbeitet werden.',
      code: errorCode,
      transactionId: transactionId
    }

  } catch (err: any) {
    console.error('❌ Error loading failure details:', err)
    errorDetails.value = {
      message: 'Ein unbekannter Fehler ist aufgetreten.'
    }
  }
}

const retryPayment = () => {
  // Go back to calendar and show payment modal again
  if (failedPayment.value?.appointment_id) {
    router.push(`/?retry_payment=${failedPayment.value.appointment_id}`)
  } else {
    router.push('/')
  }
}

const goToCalendar = () => {
  router.push('/customer-dashboard')
}

const contactSupport = () => {
  // Open email client with pre-filled error info
  const subject = encodeURIComponent('Zahlungsproblem - Driving Team')
  const body = encodeURIComponent(`
Hallo,

ich hatte ein Problem bei der Zahlung meiner Fahrlektion.

Details:
- Transaktions-ID: ${errorDetails.value?.transactionId || 'Unbekannt'}
- Fehlermeldung: ${errorDetails.value?.message || 'Unbekannt'}
- Datum: ${new Date().toLocaleString('de-CH')}

Bitte helfen Sie mir bei der Lösung dieses Problems.

Vielen Dank!
  `)
  
  window.location.href = `mailto:info@drivingteam.ch?subject=${subject}&body=${body}`
}

// Lifecycle
onMounted(() => {
  loadFailureDetails()
})
</script>
