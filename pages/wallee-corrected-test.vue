<!-- pages/wallee-corrected-test.vue -->
<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-black mb-8">🔧 Wallee CORRECTED API Test</h1>
      
      <!-- Wallee Support Instructions -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold text-blue-800 mb-3">📋 Wallee Support Vorgaben</h2>
        <div class="text-sm text-blue-700 space-y-2">
          <p><strong>Korrekte API-Call Format:</strong></p>
          <pre class="bg-blue-100 p-3 rounded text-xs overflow-x-auto">
POST /api/transaction/create?spaceId=82592 HTTP/1.1
Host: app-wallee.com
Authorization: Basic MTQwNTI1Olp0SkFQV2E0bjFHazg2bHJOYUFaVFhOZlAzZ3BLckFLc1NEUHFFdThSZTg5
Content-Type: application/json;charset=utf-8

{
  "lineItems": [{
    "uniqueId": "appointment-test123",
    "name": "Fahrstunde",
    "quantity": 1,
    "amountIncludingTax": 95.00,
    "type": "PRODUCT"
  }],
  "currency": "CHF",
  "customerId": "test-customer",
  "merchantReference": "appointment-test123",
  "language": "de-CH",
  "autoConfirmationEnabled": true,
  "customerEmailAddress": "test@drivingteam.ch"
}
          </pre>
        </div>
      </div>

      <!-- MAC Authentication Test -->
      <div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold text-green-800 mb-3">🔐 MAC-Authentifizierung Test (OFFIZIELL)</h2>
        <p class="text-sm text-green-700 mb-4">
          Basierend auf der offiziellen Wallee API-Dokumentation verwenden wir jetzt MAC-Authentifizierung 
          mit x-mac-* Headern statt Basic Auth.
        </p>
        <button 
          @click="testMacAuthentication"
          :disabled="isLoading"
          class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium mr-4"
        >
          {{ isLoading ? 'Testing MAC Auth...' : '🔐 Test MAC Authentication' }}
        </button>
        
        <button 
          @click="testMacVariants"
          :disabled="isLoading"
          class="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 disabled:opacity-50 font-medium mr-4"
        >
          {{ isLoading ? 'Testing Variants...' : '🔍 Test MAC Variants' }}
        </button>
        
        <button 
          @click="testExactSupportFormat"
          :disabled="isLoading"
          class="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium mr-4"
        >
          {{ isLoading ? 'Testing Support Format...' : '🎯 Test Exact Support Format' }}
        </button>
        
        <button 
          @click="testWithSupportData"
          :disabled="isLoading"
          class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
        >
          {{ isLoading ? 'Testing Support Data...' : '✅ Test With Support Data' }}
        </button>
      </div>

      <!-- Test Form -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold text-black mb-4">💳 Test mit korrigiertem Format</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-black mb-2">Order ID</label>
            <input 
              v-model="testData.orderId"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              placeholder="appointment-test123"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-black mb-2">Amount (CHF)</label>
            <input 
              v-model.number="testData.amount"
              type="number"
              step="0.01"
              min="0.01"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              placeholder="95.00"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-black mb-2">Customer Email</label>
            <input 
              v-model="testData.customerEmail"
              type="email"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              placeholder="test@drivingteam.ch"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-black mb-2">Description</label>
            <input 
              v-model="testData.description"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              placeholder="Fahrstunde"
            />
          </div>
          
          <button 
            @click="testCorrectedTransaction"
            :disabled="isLoading || !testData.orderId || !testData.amount || !testData.customerEmail"
            class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {{ isLoading ? 'Testing Corrected API...' : '🚀 Test Corrected Transaction API' }}
          </button>
        </div>
      </div>

      <!-- Result Display -->
      <div v-if="result" class="bg-white rounded-lg shadow p-6 mb-6">
        <div v-if="result.success" class="text-green-800">
          <h3 class="text-xl font-semibold mb-4 flex items-center">
            ✅ SUCCESS! Transaction Created
          </h3>
          
          <div class="space-y-3">
            <div class="bg-green-50 p-4 rounded-lg">
              <p class="font-medium">Transaction ID: <span class="font-mono">{{ result.transactionId }}</span></p>
              <p class="font-medium">Payment URL: 
                <a :href="result.paymentUrl" target="_blank" class="text-blue-600 underline break-all">
                  {{ result.paymentUrl }}
                </a>
              </p>
            </div>
            
            <div v-if="result.debug" class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-semibold mb-2">🔍 Request Details:</h4>
              <div class="text-sm space-y-2">
                <p><strong>URL:</strong> <span class="font-mono">{{ result.debug.requestUrl }}</span></p>
                <p><strong>Response Status:</strong> <span class="font-mono">{{ result.debug.responseStatus }}</span></p>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="text-red-800">
          <h3 class="text-xl font-semibold mb-4 flex items-center">
            ❌ Transaction Failed
          </h3>
          
          <div class="bg-red-50 p-4 rounded-lg mb-4">
            <p class="font-medium mb-2">Error: {{ result.error }}</p>
            <p v-if="result.statusCode" class="text-sm">Status Code: {{ result.statusCode }}</p>
          </div>
          
          <div v-if="result.debug" class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold mb-2">🔍 Debug Information:</h4>
            <div class="text-sm space-y-2">
              <p><strong>Request URL:</strong> <span class="font-mono">{{ result.debug.requestUrl }}</span></p>
              <p><strong>Status Code:</strong> <span class="font-mono">{{ result.debug.responseStatus || 'N/A' }}</span></p>
            </div>
          </div>
        </div>
        
        <details class="mt-6">
          <summary class="text-sm text-gray-600 cursor-pointer hover:text-gray-800">📋 Complete Response Details</summary>
          <pre class="text-xs text-gray-700 mt-3 bg-gray-50 p-4 rounded overflow-x-auto">{{ JSON.stringify(result, null, 2) }}</pre>
        </details>
      </div>

      <!-- Debug Logs Section -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-black mb-4">📊 Server Debug Logs</h3>
        <p class="text-sm text-gray-600 mb-3">
          Check your terminal/console for detailed HTTP request and response logs. 
          The corrected API endpoint logs the complete HTTP request format as requested by Wallee support.
        </p>
        
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-medium mb-2">What gets logged:</h4>
          <ul class="text-sm text-gray-700 space-y-1">
            <li>• Complete HTTP request format (headers, URL, body)</li>
            <li>• Raw HTTP response (status, headers, body)</li>
            <li>• Authentication details (base64 encoding)</li>
            <li>• Environment variables validation</li>
          </ul>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
        <h3 class="text-red-800 font-semibold">❌ Error</h3>
        <p class="text-red-700">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref } from 'vue'

// State
const isLoading = ref(false)
const error = ref('')
const result = ref<any>(null)

// Test data with defaults matching Wallee support example
const testData = ref({
  orderId: 'appointment-test123',
  amount: 95.00,
  customerEmail: 'test@drivingteam.ch',
  description: 'Fahrstunde'
})

// Test method with support data
const testWithSupportData = async () => {
  isLoading.value = true
  error.value = ''
  result.value = null
  
  try {
    logger.debug('✅ Testing With Support Data...')
    
    const response = await $fetch('/api/wallee/test-with-support-data', {
      method: 'POST',
      body: testData.value
    })
    
    logger.debug('✅ Support Data Test:', response)
    result.value = response
    
  } catch (err: any) {
    console.error('❌ Support Data Error:', err)
    error.value = err.message || 'Unknown error'
    
    result.value = {
      success: false,
      error: err.message || 'Unknown error',
      statusCode: err.statusCode,
      debug: err.data
    }
  } finally {
    isLoading.value = false
  }
}

// Test method for exact support format
const testExactSupportFormat = async () => {
  isLoading.value = true
  error.value = ''
  result.value = null
  
  try {
    logger.debug('🎯 Testing Exact Support Format...')
    
    const response = await $fetch('/api/wallee/test-exact-support-format', {
      method: 'POST',
      body: testData.value
    })
    
    logger.debug('✅ Support Format Test:', response)
    result.value = response
    
  } catch (err: any) {
    console.error('❌ Support Format Error:', err)
    error.value = err.message || 'Unknown error'
    
    result.value = {
      success: false,
      error: err.message || 'Unknown error',
      statusCode: err.statusCode,
      debug: err.data
    }
  } finally {
    isLoading.value = false
  }
}

// Test method for MAC variants
const testMacVariants = async () => {
  isLoading.value = true
  error.value = ''
  result.value = null
  
  try {
    logger.debug('🔍 Testing MAC Variants...')
    
    const response = await $fetch('/api/wallee/debug-mac-variants', {
      method: 'POST'
    })
    
    logger.debug('✅ MAC Variants Test:', response)
    result.value = response
    
  } catch (err: any) {
    console.error('❌ MAC Variants Error:', err)
    error.value = err.message || 'Unknown error'
    
    result.value = {
      success: false,
      error: err.message || 'Unknown error',
      statusCode: err.statusCode,
      debug: err.data
    }
  } finally {
    isLoading.value = false
  }
}

// Test method for MAC authentication
const testMacAuthentication = async () => {
  isLoading.value = true
  error.value = ''
  result.value = null
  
  try {
    logger.debug('🔐 Testing MAC Authentication with data:', testData.value)
    
    const response = await $fetch('/api/wallee/create-transaction-mac', {
      method: 'POST',
      body: testData.value
    })
    
    logger.debug('✅ MAC Auth API Success:', response)
    result.value = response
    
  } catch (err: any) {
    console.error('❌ MAC Auth API Error:', err)
    error.value = err.message || 'Unknown error'
    
    result.value = {
      success: false,
      error: err.message || 'Unknown error',
      statusCode: err.statusCode,
      debug: err.data
    }
  } finally {
    isLoading.value = false
  }
}

// Test method for corrected transaction API
const testCorrectedTransaction = async () => {
  isLoading.value = true
  error.value = ''
  result.value = null
  
  try {
    logger.debug('🚀 Testing corrected Wallee API with data:', testData.value)
    
    const response = await $fetch('/api/wallee/create-transaction-corrected', {
      method: 'POST',
      body: testData.value
    })
    
    logger.debug('✅ Corrected API Success:', response)
    result.value = response
    
  } catch (err: any) {
    console.error('❌ Corrected API Error:', err)
    error.value = err.message || 'Unknown error'
    
    result.value = {
      success: false,
      error: err.message || 'Unknown error',
      statusCode: err.statusCode,
      debug: err.data
    }
  } finally {
    isLoading.value = false
  }
}
</script>
