<!-- pages/mock-payment-page.vue -->
<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
      
      <!-- Header -->
      <div class="bg-blue-600 text-white p-6 text-center">
        <h1 class="text-2xl font-bold">Sichere Zahlung</h1>
        <p class="text-blue-100">Driving Team Zürich GmbH</p>
      </div>
      
      <!-- Payment Info -->
      <div class="p-6">
        <div class="text-center mb-6">
          <div class="text-3xl font-bold text-gray-900">
            CHF {{ amount }}
          </div>
          <div class="text-gray-600">Fahrstunde Zahlung</div>
        </div>
        
        <!-- Mock Payment Methods -->
        <div class="space-y-3 mb-6">
          <button
            @click="selectMethod('card')"
            class="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 focus:border-green-500 flex items-center space-x-3"
          >
            <span class="text-2xl">💳</span>
            <span class="font-medium text-gray-600">Kreditkarte</span>
          </button>
          
          <button
            @click="selectMethod('apple')"
            class="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 focus:border-green-500 focus:shadow-green-500 flex items-center space-x-3"
          >
            <span class="text-2xl">🍎</span>
            <span class="font-medium text-gray-600">Apple Pay</span>
          </button>
          
          <button
            @click="selectMethod('google')"
            class="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 focus:border-green-500 flex items-center space-x-3"
          >
            <span class="text-2xl">📱</span>
            <span class="font-medium text-gray-600">Google Pay</span>
          </button>
        </div>
        
        <!-- Action Buttons -->
        <div class="space-y-3">
          <button
            @click="processPayment(true)"
            :disabled="isProcessing"
            class="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {{ isProcessing ? 'Verarbeitung...' : `CHF ${amount} bezahlen` }}
          </button>
          
          <button
            @click="processPayment(false)"
            class="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
          >
            Zahlung abbrechen
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Props from URL
const transactionId = computed(() => route.query.txn as string)
const amount = computed(() => route.query.amount as string)
const email = computed(() => route.query.email as string)

// State
const isProcessing = ref(false)

// Methods
const selectMethod = (method: string) => {
  logger.debug('🎭 Payment method selected:', method)
}

const processPayment = async (success: boolean) => {
  isProcessing.value = true
  
  try {
    // Simuliere Payment Processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Redirect basierend auf Erfolg
    if (success) {
      await router.push(`/payment/success?transaction_id=${transactionId.value}`)
    } else {
      await router.push(`/payment/failed?transaction_id=${transactionId.value}`)
    }
    
  } catch (error) {
    console.error('Mock payment error:', error)
    await router.push(`/payment/failed?transaction_id=${transactionId.value}`)
  } finally {
    isProcessing.value = false
  }
}
</script>