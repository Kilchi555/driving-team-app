<!-- pages/test-wallee-tokenization.vue -->
<!-- ✅ TEST-SEITE für Wallee Tokenisierung -->

<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-4xl mx-auto">
      
      <!-- Header -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 class="text-2xl font-bold text-gray-900 mb-2">🧪 Wallee Tokenisierung Test</h1>
        <p class="text-gray-600">Teste die gespeicherten Zahlungsmethoden von Wallee</p>
      </div>

      <!-- Test Configuration -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">Test-Konfiguration</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Kunden-E-Mail</label>
            <input 
              v-model="testEmail" 
              type="email" 
              placeholder="test@example.com"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Betrag (CHF)</label>
            <input 
              v-model="testAmount" 
              type="number" 
              step="0.01"
              placeholder="95.00"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
          <input 
            v-model="testDescription" 
            type="text" 
            placeholder="Fahrstunde Test"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 class="text-lg font-semibold mb-4">Test-Aktionen</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Neue Zahlung -->
          <button 
            @click="createNewPayment"
            :disabled="isProcessing || !testEmail || !testAmount"
            class="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div class="text-center">
              <div class="text-2xl mb-2">💳</div>
              <div class="font-semibold">Neue Zahlung</div>
              <div class="text-sm opacity-90">Tokenisierung aktiviert</div>
            </div>
          </button>
          
          <!-- Gespeicherte Methoden laden -->
          <button 
            @click="loadSavedMethods"
            :disabled="isLoadingMethods || !testEmail"
            class="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div class="text-center">
              <div class="text-2xl mb-2">🔍</div>
              <div class="font-semibold">Methoden laden</div>
              <div class="text-sm opacity-90">Gespeicherte anzeigen</div>
            </div>
          </button>
          
          <!-- Wiederkehrende Zahlung -->
          <button 
            @click="createRecurringPayment"
            :disabled="isProcessing || !testEmail || !testAmount || savedMethods.length === 0"
            class="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div class="text-center">
              <div class="text-2xl mb-2">🔄</div>
              <div class="font-semibold">Wiederkehrend</div>
              <div class="text-sm opacity-90">Mit gespeicherten</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Results -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-lg font-semibold mb-4">Ergebnisse</h2>
        
        <!-- Loading -->
        <div v-if="isLoadingMethods" class="text-center py-4">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 mx-auto mb-2"></div>
          <p class="text-gray-600">Lade gespeicherte Zahlungsmethoden...</p>
        </div>
        
        <!-- Saved Methods -->
        <div v-else-if="savedMethods.length > 0" class="space-y-4">
          <h3 class="font-semibold text-gray-900">Gespeicherte Zahlungsmethoden ({{ savedMethods.length }})</h3>
          
          <div v-for="method in savedMethods" :key="method.id" class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="font-semibold text-gray-900">{{ method.name }}</h4>
                <p class="text-sm text-gray-600">{{ method.description }}</p>
                <div class="mt-2 text-xs text-gray-500">
                  <div>Zuletzt verwendet: {{ formatDate(method.lastUsed) }}</div>
                  <div>Anzahl Zahlungen: {{ method.transactionCount }}</div>
                </div>
              </div>
              <button 
                @click="payWithMethod(method)"
                :disabled="isProcessing"
                class="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm"
              >
                Mit dieser bezahlen
              </button>
            </div>
          </div>
        </div>
        
        <!-- No Methods -->
        <div v-else-if="!isLoadingMethods" class="text-center py-8 text-gray-500">
          <div class="text-4xl mb-4">💳</div>
          <p>Noch keine gespeicherten Zahlungsmethoden</p>
          <p class="text-sm">Erstelle eine neue Zahlung, um die Tokenisierung zu testen</p>
        </div>
        
        <!-- Processing Status -->
        <div v-if="isProcessing" class="text-center py-4">
          <div class="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 mx-auto mb-2"></div>
          <p class="text-gray-600">Verarbeite Zahlung...</p>
        </div>
        
        <!-- Logs -->
        <div v-if="logs.length > 0" class="mt-6">
          <h3 class="font-semibold text-gray-900 mb-2">Logs</h3>
          <div class="bg-gray-100 rounded-lg p-4 max-h-40 overflow-y-auto">
            <div v-for="(log, index) in logs" :key="index" class="text-sm font-mono">
              <span class="text-gray-500">{{ log.timestamp }}</span>
              <span :class="log.type === 'error' ? 'text-red-600' : 'text-gray-800'">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWalleeTokenization, type WalleePaymentMethod } from '~/composables/useWalleeTokenization'

// Composables
const { 
  getCustomerPaymentMethods, 
  createRecurringTransaction, 
  hasSavedPaymentMethods 
} = useWalleeTokenization()

// State
const testEmail = ref('test@drivingteam.ch')
const testAmount = ref(95.00)
const testDescription = ref('Fahrstunde Test')
const savedMethods = ref<WalleePaymentMethod[]>([])
const isLoadingMethods = ref(false)
const isProcessing = ref(false)
const logs = ref<Array<{timestamp: string, message: string, type: 'info' | 'error'}>>([])

// ✅ Log-Funktion
const addLog = (message: string, type: 'info' | 'error' = 'info') => {
  logs.value.unshift({
    timestamp: new Date().toLocaleTimeString(),
    message,
    type
  })
  // Keep only last 10 logs
  if (logs.value.length > 10) {
    logs.value = logs.value.slice(0, 10)
  }
}

// ✅ Neue Zahlung erstellen
const createNewPayment = async () => {
  isProcessing.value = true
  addLog(`Erstelle neue Zahlung für ${testEmail.value} - CHF ${testAmount.value}`)
  
  try {
    const response = await $fetch('/api/wallee/create-transaction', {
      method: 'POST',
      body: {
        orderId: `test-new-${Date.now()}`,
        amount: testAmount.value,
        currency: 'CHF',
        customerEmail: testEmail.value,
        customerName: 'Test Kunde',
        description: testDescription.value,
        successUrl: `${window.location.origin}/payment/success`,
        failedUrl: `${window.location.origin}/payment/failed`
      }
    })
    
    if (response.success && response.paymentUrl) {
      addLog(`✅ Zahlung erstellt - Weiterleitung zu Wallee`)
      window.location.href = response.paymentUrl
    } else {
      throw new Error(response.error || 'Unbekannter Fehler')
    }
    
  } catch (error: any) {
    addLog(`❌ Fehler: ${error.message}`, 'error')
    console.error('❌ Error creating new payment:', error)
  } finally {
    isProcessing.value = false
  }
}

// ✅ Gespeicherte Methoden laden
const loadSavedMethods = async () => {
  isLoadingMethods.value = true
  addLog(`Lade gespeicherte Zahlungsmethoden für ${testEmail.value}`)
  
  try {
    const result = await getCustomerPaymentMethods(testEmail.value)
    savedMethods.value = result.paymentMethods
    
    addLog(`✅ ${result.paymentMethods.length} gespeicherte Methoden gefunden`)
    
  } catch (error: any) {
    addLog(`❌ Fehler beim Laden: ${error.message}`, 'error')
    console.error('❌ Error loading saved methods:', error)
  } finally {
    isLoadingMethods.value = false
  }
}

// ✅ Wiederkehrende Zahlung
const createRecurringPayment = async () => {
  isProcessing.value = true
  addLog(`Erstelle wiederkehrende Zahlung für ${testEmail.value}`)
  
  try {
    const response = await createRecurringTransaction({
      orderId: `test-recurring-${Date.now()}`,
      amount: testAmount.value,
      currency: 'CHF',
      customerEmail: testEmail.value,
      customerName: 'Test Kunde',
      description: `${testDescription.value} (wiederkehrend)`,
      successUrl: `${window.location.origin}/payment/success`,
      failedUrl: `${window.location.origin}/payment/failed`
    })
    
    if (response.success && response.paymentUrl) {
      addLog(`✅ Wiederkehrende Zahlung erstellt`)
      window.location.href = response.paymentUrl
    } else {
      throw new Error('Unbekannter Fehler')
    }
    
  } catch (error: any) {
    addLog(`❌ Fehler: ${error.message}`, 'error')
    console.error('❌ Error creating recurring payment:', error)
  } finally {
    isProcessing.value = false
  }
}

// ✅ Mit spezifischer Methode bezahlen
const payWithMethod = async (method: WalleePaymentMethod) => {
  isProcessing.value = true
  addLog(`Bezahle mit ${method.name}`)
  
  try {
    const response = await createRecurringTransaction({
      orderId: `test-method-${Date.now()}`,
      amount: testAmount.value,
      currency: 'CHF',
      customerEmail: testEmail.value,
      customerName: 'Test Kunde',
      description: `${testDescription.value} (${method.name})`,
      successUrl: `${window.location.origin}/payment/success`,
      failedUrl: `${window.location.origin}/payment/failed`
    })
    
    if (response.success && response.paymentUrl) {
      addLog(`✅ Zahlung mit ${method.name} erstellt`)
      window.location.href = response.paymentUrl
    } else {
      throw new Error('Unbekannter Fehler')
    }
    
  } catch (error: any) {
    addLog(`❌ Fehler: ${error.message}`, 'error')
    console.error('❌ Error paying with method:', error)
  } finally {
    isProcessing.value = false
  }
}

// ✅ Datum formatieren
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ✅ Beim Laden der Seite
onMounted(() => {
  addLog('🧪 Wallee Tokenisierung Test-Seite geladen')
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>


