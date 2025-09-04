<!-- pages/wallee-test.vue -->
<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-black mb-8">🔧 Wallee Integration Test</h1>
      
      <!-- Instructions -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 class="text-lg font-semibold text-blue-800 mb-2">📋 Test-Anleitung</h2>
        <ol class="text-sm text-blue-700 space-y-1">
          <li>1. <strong>Credentials Check:</strong> Prüft ob alle Wallee-Umgebungsvariablen gesetzt sind</li>
          <li>2. <strong>Permissions Test:</strong> Testet die Wallee-Berechtigungen und gibt Fix-Anweisungen</li>
          <li>3. <strong>Transaction Test:</strong> Erstellt eine echte Test-Transaktion</li>
        </ol>
        <p class="text-xs text-blue-600 mt-2">
          💡 Bei Permission-Problemen: Gehen Sie zu <a href="https://app-wallee.com/" target="_blank" class="underline">Wallee Dashboard</a> → Settings → Users → Application Users
        </p>
      </div>
      
      <!-- Simple Test -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold text-black mb-4">🔧 Simple Test</h2>
        <p class="text-sm text-gray-600 mb-4">Testet nur die Environment-Variablen ohne externe API-Calls</p>
        <button 
          @click="simpleTest"
          :disabled="isLoading"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {{ isLoading ? 'Testing...' : 'Simple Test' }}
        </button>
        
        <div v-if="simpleTestResult" class="mt-4 p-4 rounded" :class="simpleTestResult.success ? 'bg-green-50' : 'bg-red-50'">
          <div v-if="simpleTestResult.success" class="text-green-800">
            <h3 class="font-semibold mb-2">✅ Simple Test OK</h3>
            <p class="text-sm">{{ simpleTestResult.message }}</p>
            <div v-if="simpleTestResult.credentials" class="mt-2 text-xs">
              <strong>Space ID:</strong> {{ simpleTestResult.credentials.spaceId }}<br>
              <strong>User ID:</strong> {{ simpleTestResult.credentials.userId }}<br>
              <strong>Secret Key:</strong> {{ simpleTestResult.credentials.secretKeyPreview }}
            </div>
          </div>
          
          <div v-else class="text-red-800">
            <h3 class="font-semibold mb-2">❌ Simple Test Failed</h3>
            <p class="text-sm">{{ simpleTestResult.error }}</p>
            
            <div v-if="simpleTestResult.fixInstructions" class="bg-yellow-50 p-3 rounded border border-yellow-200 mt-2">
              <h4 class="font-medium text-yellow-800 mb-2">🔧 Fix Instructions:</h4>
              <ol class="text-sm text-yellow-700 space-y-1">
                <li v-for="(instruction, index) in simpleTestResult.fixInstructions" :key="index">
                  {{ instruction }}
                </li>
              </ol>
            </div>
          </div>
          
          <details class="mt-3">
            <summary class="text-xs text-gray-600 cursor-pointer">Raw Response</summary>
            <pre class="text-xs text-gray-700 mt-2">{{ JSON.stringify(simpleTestResult, null, 2) }}</pre>
          </details>
        </div>
      </div>

      <!-- Credentials Check -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold text-black mb-4">🔐 Credentials Check</h2>
        <button 
          @click="checkCredentials"
          :disabled="isLoading"
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {{ isLoading ? 'Checking...' : 'Check Credentials' }}
        </button>
        
        <div v-if="credentialsResult" class="mt-4 p-4 bg-gray-50 rounded">
          <pre class="text-sm text-black">{{ JSON.stringify(credentialsResult, null, 2) }}</pre>
        </div>
      </div>

      <!-- Connection Test -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold text-black mb-4">🌐 Connection Test</h2>
        <button 
          @click="testConnection"
          :disabled="isLoading"
          class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {{ isLoading ? 'Testing...' : 'Test Connection' }}
        </button>
        
        <div v-if="connectionResult" class="mt-4 p-4 bg-gray-50 rounded">
          <pre class="text-sm text-black">{{ JSON.stringify(connectionResult, null, 2) }}</pre>
        </div>
      </div>

      <!-- Auth Test -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold text-black mb-4">🔑 Authentication Test</h2>
        <button 
          @click="testAuth"
          :disabled="isLoading"
          class="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {{ isLoading ? 'Testing...' : 'Test Authentication' }}
        </button>
        
        <div v-if="authResult" class="mt-4 p-4 bg-gray-50 rounded">
          <pre class="text-sm text-black">{{ JSON.stringify(authResult, null, 2) }}</pre>
        </div>
      </div>

      <!-- Permissions Test -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold text-black mb-4">🔐 Permissions Test</h2>
        <p class="text-sm text-gray-600 mb-4">Testet die Wallee-Berechtigungen und gibt detaillierte Anweisungen bei Problemen</p>
        <button 
          @click="testPermissions"
          :disabled="isLoading"
          class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {{ isLoading ? 'Testing...' : 'Test Permissions' }}
        </button>
        
        <div v-if="permissionsResult" class="mt-4 p-4 rounded" :class="permissionsResult.success ? 'bg-green-50' : 'bg-red-50'">
          <div v-if="permissionsResult.success" class="text-green-800">
            <h3 class="font-semibold mb-2">✅ Permissions OK</h3>
            <p class="text-sm">{{ permissionsResult.message }}</p>
            <div v-if="permissionsResult.userDetails" class="mt-2 text-xs">
              <strong>User:</strong> {{ permissionsResult.userDetails.name }} ({{ permissionsResult.userDetails.id }})
            </div>
          </div>
          
          <div v-else class="text-red-800">
            <h3 class="font-semibold mb-2">❌ Permissions Problem</h3>
            <p class="text-sm mb-3">{{ permissionsResult.error }}</p>
            
            <div v-if="permissionsResult.fixInstructions" class="bg-yellow-50 p-3 rounded border border-yellow-200">
              <h4 class="font-medium text-yellow-800 mb-2">🔧 Fix Instructions:</h4>
              <ol class="text-sm text-yellow-700 space-y-1">
                <li v-for="(instruction, index) in permissionsResult.fixInstructions" :key="index">
                  <span v-if="typeof instruction === 'string'">{{ instruction }}</span>
                  <div v-else-if="instruction.permissions" class="ml-4 mt-2">
                    <div v-for="permission in instruction.permissions" :key="permission" class="text-xs">
                      {{ permission }}
                    </div>
                  </div>
                </li>
              </ol>
            </div>
          </div>
          
          <details class="mt-3">
            <summary class="text-xs text-gray-600 cursor-pointer">Raw Response</summary>
            <pre class="text-xs text-gray-700 mt-2">{{ JSON.stringify(permissionsResult, null, 2) }}</pre>
          </details>
        </div>
      </div>

      <!-- Debug Request Test -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold text-black mb-4">🔍 Debug Request Test</h2>
        <p class="text-sm text-gray-600 mb-4">Kompletter HTTP-Request mit Debug-Logs</p>
        <button 
          @click="testDebugRequest"
          :disabled="isLoading"
          class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {{ isLoading ? 'Debugging...' : 'Debug Request' }}
        </button>
        
        <div v-if="debugRequestResult" class="mt-4 p-4 bg-gray-50 rounded">
          <pre class="text-sm text-black">{{ JSON.stringify(debugRequestResult, null, 2) }}</pre>
        </div>
      </div>

      <!-- Transaction Test -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-xl font-semibold text-black mb-4">💳 Transaction Test</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-black mb-2">Amount (CHF)</label>
            <input 
              v-model.number="testAmount"
              type="number"
              step="0.01"
              min="0.01"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              placeholder="10.00"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-black mb-2">Customer Email</label>
            <input 
              v-model="testEmail"
              type="email"
              class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              placeholder="test@example.com"
            />
          </div>
          <button 
            @click="testTransaction"
            :disabled="isLoading || !testAmount || !testEmail"
            class="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50"
          >
            {{ isLoading ? 'Creating...' : 'Create Test Transaction' }}
          </button>
        </div>
        
        <div v-if="transactionResult" class="mt-4 p-4 rounded" :class="transactionResult.success ? 'bg-green-50' : 'bg-red-50'">
          <div v-if="transactionResult.success" class="text-green-800">
            <h3 class="font-semibold mb-2">✅ Transaction Created</h3>
            <p class="text-sm">Transaction ID: {{ transactionResult.transactionId }}</p>
            <p class="text-sm">Payment URL: {{ transactionResult.paymentUrl }}</p>
          </div>
          
          <div v-else class="text-red-800">
            <h3 class="font-semibold mb-2">❌ Transaction Failed</h3>
            <p class="text-sm">{{ transactionResult.error || 'Unknown error' }}</p>
            
            <div v-if="transactionResult.statusCode === 442" class="bg-yellow-50 p-3 rounded border border-yellow-200 mt-2">
              <h4 class="font-medium text-yellow-800 mb-2">🔧 Permission Issue Detected</h4>
              <p class="text-xs text-yellow-700">
                This is likely a Wallee permissions issue. Please run the "Test Permissions" above first.
              </p>
            </div>
          </div>
          
          <details class="mt-3">
            <summary class="text-xs text-gray-600 cursor-pointer">Raw Response</summary>
            <pre class="text-xs text-gray-700 mt-2">{{ JSON.stringify(transactionResult, null, 2) }}</pre>
          </details>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 class="text-red-800 font-semibold">❌ Error</h3>
        <p class="text-red-700">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// State
const isLoading = ref(false)
const error = ref('')
const simpleTestResult = ref<any>(null)
const credentialsResult = ref<any>(null)
const connectionResult = ref<any>(null)
const authResult = ref<any>(null)
const permissionsResult = ref<any>(null)
const debugRequestResult = ref<any>(null)
const transactionResult = ref<any>(null)
const testAmount = ref(10.00)
const testEmail = ref('test@example.com')

// Methods
const simpleTest = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    const result = await $fetch('/api/wallee/simple-test')
    simpleTestResult.value = result
  } catch (err: any) {
    error.value = err.message || 'Unknown error'
    simpleTestResult.value = {
      success: false,
      error: err.message || 'Unknown error'
    }
  } finally {
    isLoading.value = false
  }
}

const checkCredentials = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    const result = await $fetch('/api/wallee/debug-credentials')
    credentialsResult.value = result
  } catch (err: any) {
    error.value = err.message || 'Unknown error'
  } finally {
    isLoading.value = false
  }
}

const testConnection = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    const result = await $fetch('/api/wallee/test-connection')
    connectionResult.value = result
  } catch (err: any) {
    error.value = err.message || 'Unknown error'
  } finally {
    isLoading.value = false
  }
}

const testAuth = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    const result = await $fetch('/api/wallee/test-auth', {
      method: 'POST'
    })
    authResult.value = result
  } catch (err: any) {
    error.value = err.message || 'Unknown error'
  } finally {
    isLoading.value = false
  }
}

const testPermissions = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    const result = await $fetch('/api/wallee/check-permissions')
    permissionsResult.value = result
  } catch (err: any) {
    error.value = err.message || 'Unknown error'
    permissionsResult.value = {
      success: false,
      error: err.message || 'Unknown error'
    }
  } finally {
    isLoading.value = false
  }
}

const testDebugRequest = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    const result = await $fetch('/api/wallee/debug-request')
    debugRequestResult.value = result
  } catch (err: any) {
    error.value = err.message || 'Unknown error'
  } finally {
    isLoading.value = false
  }
}

const testTransaction = async () => {
  isLoading.value = true
  error.value = ''
  
  try {
    const result = await $fetch('/api/wallee/create-transaction', {
      method: 'POST',
      body: {
        orderId: `test-${Date.now()}`,
        amount: testAmount.value,
        currency: 'CHF',
        customerEmail: testEmail.value,
        customerName: 'Test Customer',
        description: 'Test Transaction'
      }
    })
    transactionResult.value = result
  } catch (err: any) {
    error.value = err.message || 'Unknown error'
  } finally {
    isLoading.value = false
  }
}
</script>