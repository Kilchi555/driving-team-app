<!-- pages/wallee-test.vue -->
<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-3xl font-bold mb-8 text-center">Wallee API Test</h1>
      
      <!-- Test Buttons -->
      <div class="space-y-4 mb-8">
        
        <!-- Connection Test -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">🔗 Connection Test</h2>
          <button 
            @click="testConnection" 
            class="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            :disabled="loading"
          >
            {{ loading ? 'Testing...' : 'Test Wallee Connection' }}
          </button>
        </div>
        
        <!-- Mock Payment Test -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">💳 Payment Test</h2>
          <p class="text-gray-600 mb-4">Öffnet Ihre bestehende Mock-Payment-Seite</p>
          <button 
            @click="openMockPayment" 
            class="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Mock Payment öffnen
          </button>
        </div>
        
        <!-- Real Transaction Test -->
        <div class="bg-white p-6 rounded-lg shadow">
          <h2 class="text-xl font-semibold mb-4">🚀 Echte Transaction</h2>
          <p class="text-gray-600 mb-4">Erstellt echte Wallee Transaction</p>
          <button 
            @click="testRealTransaction" 
            class="w-full bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            :disabled="loading"
          >
            {{ loading ? 'Creating...' : 'Echte Transaction testen' }}
          </button>
        </div>
      </div>

      <!-- Neuer Test-Button hinzufügen -->
<div class="bg-white p-6 rounded-lg shadow">
  <h2 class="text-xl font-semibold mb-4">🧪 Permission Tests</h2>
  <p class="text-gray-600 mb-4">Testet verschiedene Wallee API Endpoints</p>
  <button 
    @click="testPermissions" 
    class="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
    :disabled="loading"
  >
    {{ loading ? 'Testing...' : 'Test All Permissions' }}
  </button>
</div>
      
      <!-- Results -->
      <div v-if="result || error" class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold mb-4">Test Ergebnisse:</h3>
        
// In wallee-test.vue - Ersetzen Sie die Success-Anzeige:

<!-- Success -->
<div v-if="result" class="bg-green-50 border border-green-200 rounded p-4 mb-4">
  <h4 class="font-medium text-green-800 mb-2">✅ Erfolg</h4>
  
  <!-- ✅ ERWEITERTE DEBUG-ANZEIGE -->
  <div v-if="result.fullSpaceInfo" class="mb-4">
    <h5 class="font-medium text-green-700 mb-2">📋 Vollständige Wallee Space Daten:</h5>
    <pre class="text-xs text-green-600 bg-white p-2 rounded border overflow-auto max-h-32">{{ JSON.stringify(result.fullSpaceInfo, null, 2) }}</pre>
  </div>
  
  <!-- Standard-Anzeige -->
  <pre class="text-sm text-green-700 overflow-auto whitespace-pre-wrap">{{ JSON.stringify(result, null, 2) }}</pre>
  
  <!-- ✅ ZUSÄTZLICHE FELDER falls vorhanden -->
  <div v-if="result.spaceName || result.state" class="mt-2 text-sm">
    <div v-if="result.spaceName" class="text-green-700">Space Name: {{ result.spaceName }}</div>
    <div v-if="result.state" class="text-green-700">State: {{ result.state }}</div>
  </div>
</div>
        
        <!-- Error -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <h4 class="font-medium text-red-800 mb-2">❌ Fehler</h4>
          <pre class="text-sm text-red-700 overflow-auto whitespace-pre-wrap">{{ error }}</pre>
        </div>
        
        <button 
          @click="clearResults" 
          class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Löschen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const loading = ref(false)
const result = ref<any>(null)
const error = ref<string | null>(null)

// Test Wallee Connection
const testConnection = async () => {
  loading.value = true
  error.value = null
  result.value = null
  
  try {
    console.log('🔄 Testing Wallee connection...')
    const response = await $fetch('/api/wallee/test-connection')
    result.value = response
    console.log('✅ Connection successful:', response)
  } catch (err: any) {
    error.value = `Connection Error:\n${err.message}\nStatus: ${err.statusCode || 'Unknown'}`
    console.error('❌ Connection failed:', err)
  } finally {
    loading.value = false
  }
}

// Open Mock Payment (nutzt Ihre bestehende Seite)
const openMockPayment = () => {
  console.log('🎭 Opening your existing mock payment page...')
  
  // Nutzt Ihre bestehende Mock-Payment-Seite
  const url = `/mock-payment-page?txn=test-${Date.now()}&amount=95.00&email=test@drivingteam.ch`
  
  if (typeof window !== 'undefined') {
    window.open(url, '_blank')
  }
}

// Test Real Wallee Transaction
const testRealTransaction = async () => {
  loading.value = true
  error.value = null
  result.value = null
  
  try {
    console.log('🔄 Creating real Wallee transaction...')
    
    const response = await $fetch('/api/wallee/create-transaction', {
      method: 'POST',
      body: {
        appointmentId: 'test-' + Date.now(),
        amount: 10.00, // Kleiner Betrag für Test
        currency: 'CHF',
        customerId: 'test-customer',
        customerEmail: 'test@drivingteam.ch'
      }
    }) as any
    
    result.value = response
    console.log('✅ Transaction created:', response)
    
    // Falls erfolgreich → zur echten Wallee Payment Page weiterleiten
    if (response.success && response.paymentUrl && typeof window !== 'undefined') {
      const openPaymentPage = confirm(
        `Transaction erfolgreich erstellt!\n\nTransaction ID: ${response.transactionId}\n\nMöchten Sie zur Wallee Payment-Seite weiterleiten?`
      )
      
      if (openPaymentPage) {
        window.open(response.paymentUrl, '_blank')
      }
    }
    
  } catch (err: any) {
    error.value = `Transaction Error:\n${err.message}\nStatus: ${err.statusCode || 'Unknown'}\n\nDetails: ${JSON.stringify(err.data || {}, null, 2)}`
    console.error('❌ Transaction failed:', err)
  } finally {
    loading.value = false
  }
}

const testPermissions = async () => {
  loading.value = true
  error.value = null
  result.value = null
  
  try {
    const response = await $fetch('/api/wallee/test-permissions')
    result.value = response
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Clear Results
const clearResults = () => {
  result.value = null
  error.value = null
}
</script>