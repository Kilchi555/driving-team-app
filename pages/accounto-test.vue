<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">🏦 Accounto API Test</h1>
        <p class="text-gray-600">Test der Accounto API-Integration für Rechnungserstellung</p>
      </div>

      <!-- Environment Check -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">🔧 Environment Check</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">ACCOUNTO_API_KEY</label>
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-600">
                {{ accountoApiKey ? `${accountoApiKey.substring(0, 20)}...` : 'Nicht gesetzt' }}
              </span>
              <span v-if="accountoApiKey" class="text-green-600">✅</span>
              <span v-else class="text-red-600">❌</span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">ACCOUNTO_BASE_URL</label>
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-600">{{ accountoBaseUrl }}</span>
              <span class="text-green-600">✅</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Test Buttons -->
      <div class="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">🧪 API Tests</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            @click="debugEnvironment"
            :disabled="isDebuggingEnv"
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
          >
            <span v-if="isDebuggingEnv">Debugge...</span>
            <span v-else class="flex items-center">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Environment Debug
            </span>
          </button>
          
          <button
            @click="testConnection"
            :disabled="isTestingConnection"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
          >
            <span v-if="isTestingConnection">Teste...</span>
            <span v-else class="flex items-center">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
              </svg>
              Verbindung testen
            </span>
          </button>
          
          <button
            @click="testCreateInvoice"
            :disabled="isTestingInvoice"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
          >
            <span v-if="isTestingInvoice">Erstelle...</span>
            <span v-else class="flex items-center">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Test-Rechnung erstellen
            </span>
          </button>
        </div>
      </div>

      <!-- Results -->
      <div v-if="testResults" class="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">📊 Testergebnisse</h2>
        
        <!-- Environment Debug -->
        <div v-if="testResults.environment" class="mb-6">
          <h3 class="text-lg font-medium text-gray-900 mb-3">🔍 Environment Debug</h3>
          <div :class="[
            'p-4 rounded-lg border',
            testResults.environment.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          ]">
            <div class="flex items-center">
              <span v-if="testResults.environment.success" class="text-green-600 mr-2">✅</span>
              <span v-else class="text-red-600 mr-2">❌</span>
              <span class="font-medium">{{ testResults.environment.message }}</span>
            </div>
            <div v-if="testResults.environment.config" class="mt-4 space-y-4">
              <!-- API Key Status -->
              <div>
                <h4 class="font-medium text-gray-900 mb-2">🔑 API Key Status</h4>
                <div class="bg-gray-100 p-3 rounded">
                  <p><strong>Status:</strong> {{ testResults.environment.config.apiKey.status }}</p>
                  <p><strong>Länge:</strong> {{ testResults.environment.config.apiKey.length }} Zeichen</p>
                  <p><strong>Vorschau:</strong> {{ testResults.environment.config.apiKey.preview }}</p>
                  <div v-if="testResults.environment.config.apiKey.issues.length > 0">
                    <p class="font-medium text-red-600 mt-2">Probleme:</p>
                    <ul class="list-disc list-inside text-sm text-red-600">
                      <li v-for="issue in testResults.environment.config.apiKey.issues" :key="issue">{{ issue }}</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <!-- Base URL Status -->
              <div>
                <h4 class="font-medium text-gray-900 mb-2">🌐 Base URL Status</h4>
                <div class="bg-gray-100 p-3 rounded">
                  <p><strong>Status:</strong> {{ testResults.environment.config.baseUrl.status }}</p>
                  <p><strong>URL:</strong> {{ testResults.environment.config.baseUrl.value }}</p>
                  <div v-if="testResults.environment.config.baseUrl.issues.length > 0">
                    <p class="font-medium text-yellow-600 mt-2">Hinweise:</p>
                    <ul class="list-disc list-inside text-sm text-yellow-600">
                      <li v-for="issue in testResults.environment.config.baseUrl.issues" :key="issue">{{ issue }}</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <!-- Empfehlungen -->
              <div v-if="testResults.environment.recommendations.length > 0">
                <h4 class="font-medium text-blue-900 mb-2">💡 Empfehlungen</h4>
                <div class="bg-blue-50 p-3 rounded">
                  <ul class="list-disc list-inside text-sm text-blue-800">
                    <li v-for="rec in testResults.environment.recommendations" :key="rec">{{ rec }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Connection Test -->
        <div v-if="testResults.connection" class="mb-6">
          <h3 class="text-lg font-medium text-gray-900 mb-3">🔗 Verbindungstest</h3>
          <div :class="[
            'p-4 rounded-lg border',
            testResults.connection.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          ]">
            <div class="flex items-center">
              <span v-if="testResults.connection.success" class="text-green-600 mr-2">✅</span>
              <span v-else class="text-red-600 mr-2">❌</span>
              <span class="font-medium">{{ testResults.connection.message }}</span>
            </div>
            <div v-if="testResults.connection.details" class="mt-2 text-sm text-gray-600">
              <pre class="bg-gray-100 p-2 rounded overflow-x-auto">{{ JSON.stringify(testResults.connection.details, null, 2) }}</pre>
            </div>
          </div>
        </div>

        <!-- Invoice Test -->
        <div v-if="testResults.invoice" class="mb-6">
          <h3 class="text-lg font-medium text-gray-900 mb-3">🧾 Rechnungstest</h3>
          <div :class="[
            'p-4 rounded-lg border',
            testResults.invoice.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          ]">
            <div class="flex items-center">
              <span v-if="testResults.invoice.success" class="text-green-600 mr-2">✅</span>
              <span v-else class="text-red-600 mr-2">❌</span>
              <span class="font-medium">{{ testResults.invoice.message }}</span>
            </div>
            <div v-if="testResults.invoice.details" class="mt-2 text-sm text-gray-600">
              <pre class="bg-gray-100 p-2 rounded overflow-x-auto">{{ JSON.stringify(testResults.invoice.details, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-red-800 text-sm">{{ error }}</p>
        </div>
      </div>

      <!-- Instructions -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 class="text-xl font-semibold text-blue-900 mb-4">📋 Anleitung</h2>
        <div class="space-y-3 text-blue-800">
          <p><strong>1. Environment Debug:</strong> Klicken Sie auf "Environment Debug" um die Konfiguration zu prüfen</p>
          <p><strong>2. Environment Variables setzen:</strong></p>
          <pre class="bg-blue-100 p-2 rounded text-sm">ACCOUNTO_API_KEY=ihr_api_key_hier
ACCOUNTO_BASE_URL=https://api.accounto.ch</pre>
          
          <p><strong>3. Verbindung testen:</strong> Klicken Sie auf "Verbindung testen"</p>
          
          <p><strong>4. Test-Rechnung erstellen:</strong> Klicken Sie auf "Test-Rechnung erstellen"</p>
          
          <p><strong>5. Fehler analysieren:</strong> Schauen Sie sich die detaillierten Fehlermeldungen an</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// State
const isDebuggingEnv = ref(false)
const isTestingConnection = ref(false)
const isTestingInvoice = ref(false)
const testResults = ref<any>(null)
const error = ref<string | null>(null)

// Environment variables
const accountoApiKey = computed(() => process.env.ACCOUNTO_API_KEY)
const accountoBaseUrl = computed(() => process.env.ACCOUNTO_BASE_URL || 'https://api.accounto.ch')

// Debug environment
const debugEnvironment = async () => {
  isDebuggingEnv.value = true
  error.value = null
  
  try {
    logger.debug('🔍 Debugging Accounto environment...')
    
    const response = await $fetch('/api/accounto/debug-env', {
      method: 'GET'
    })
    
    testResults.value = {
      ...testResults.value,
      environment: response
    }
    
    logger.debug('✅ Environment debug completed:', response)
    
  } catch (err: any) {
    console.error('❌ Environment debug failed:', err)
    error.value = err.message || 'Environment Debug fehlgeschlagen'
    
    testResults.value = {
      ...testResults.value,
      environment: {
        success: false,
        message: 'Environment Debug fehlgeschlagen',
        details: err
      }
    }
  } finally {
    isDebuggingEnv.value = false
  }
}

// Test connection
const testConnection = async () => {
  isTestingConnection.value = true
  error.value = null
  
  try {
    logger.debug('🔗 Testing Accounto API connection...')
    
    const response = await $fetch('/api/accounto/test-connection', {
      method: 'GET'
    })
    
    testResults.value = {
      ...testResults.value,
      connection: response
    }
    
    logger.debug('✅ Connection test completed:', response)
    
  } catch (err: any) {
    console.error('❌ Connection test failed:', err)
    error.value = err.message || 'Verbindungstest fehlgeschlagen'
    
    testResults.value = {
      ...testResults.value,
      connection: {
        success: false,
        message: 'Verbindungstest fehlgeschlagen',
        details: err
      }
    }
  } finally {
    isTestingConnection.value = false
  }
}

// Test invoice creation
const testCreateInvoice = async () => {
  isTestingInvoice.value = true
  error.value = null
  
  try {
    logger.debug('🧾 Testing Accounto invoice creation...')
    
    const testData = {
      appointments: [
        {
          id: 'test-1',
          title: 'Test Fahrstunde',
          start_time: new Date().toISOString(),
          duration_minutes: 45,
          amount: 95
        }
      ],
      customerData: {
        firstName: 'Test',
        lastName: 'Kunde',
        email: 'test@example.com',
        phone: '+41791234567'
      },
      billingAddress: {
        company_name: 'Test AG',
        contact_person: 'Test Kontakt',
        street: 'Teststrasse',
        street_number: '123',
        zip: '8000',
        city: 'Zürich',
        vat_number: 'CHE-123.456.789'
      },
      emailData: {
        email: 'test@example.com',
        subject: 'Test-Rechnung',
        message: 'Dies ist eine Test-Rechnung für die Accounto-Integration.'
      },
      totalAmount: 95
    }
    
    const response = await $fetch('/api/accounto/create-invoice', {
      method: 'POST',
      body: testData
    })
    
    testResults.value = {
      ...testResults.value,
      invoice: response
    }
    
    logger.debug('✅ Invoice test completed:', response)
    
  } catch (err: any) {
    console.error('❌ Invoice test failed:', err)
    error.value = err.message || 'Rechnungstest fehlgeschlagen'
    
    testResults.value = {
      ...testResults.value,
      invoice: {
        success: false,
        message: 'Rechnungstest fehlgeschlagen',
        details: err
      }
    }
  } finally {
    isTestingInvoice.value = false
  }
}
</script>
