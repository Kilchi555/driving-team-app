<!-- pages/optimized-workflow-test.vue -->
<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-black mb-8">🚀 Optimierter Speicher-Workflow Test</h1>
      
      <!-- Workflow Übersicht -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold text-blue-800 mb-3">📋 Optimierter Speicher-Workflow</h2>
        <div class="text-sm text-blue-700 space-y-2">
          <p><strong>1. Termindaten</strong> → <code>appointments</code> Tabelle</p>
          <p><strong>2. Produkte</strong> → <code>products</code> Tabelle</p>
          <p><strong>3. Rabatte</strong> → <code>discounts</code> Tabelle</p>
          <p><strong>4. Zahlungen</strong> → <code>payments</code> Tabelle (alles zusammengerechnet)</p>
          <p><strong>✅ Wichtig:</strong> Produkte und Rabatte können auch ohne Termin erstellt werden!</p>
        </div>
      </div>

      <!-- Test Szenarien -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        <!-- Szenario 1: Termin mit Produkten und Rabatten -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-xl font-semibold text-black mb-4">💳 Szenario 1: Termin + Produkte + Rabatte</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-black mb-2">Termin Titel</label>
              <input 
                v-model="scenario1.title"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                placeholder="Fahrstunde B"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-black mb-2">Student ID</label>
              <input 
                v-model="scenario1.user_id"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                placeholder="uuid-here"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-black mb-2">Dauer (Minuten)</label>
              <input 
                v-model.number="scenario1.duration_minutes"
                type="number"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                placeholder="45"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-black mb-2">Fahrkategorie</label>
              <select 
                v-model="scenario1.type"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              >
                <option value="B">B (Auto)</option>
                <option value="A">A (Motorrad)</option>
                <option value="BE">BE (Auto + Anhänger)</option>
                <option value="C">C (LKW)</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-black mb-2">Zahlungsmethode</label>
              <select 
                v-model="scenario1.paymentMethod"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              >
                <option value="cash">Bargeld</option>
                <option value="invoice">Rechnung</option>
                <option value="online">Online</option>
              </select>
            </div>
            
            <button 
              @click="testScenario1"
              :disabled="isLoading || !scenario1.title || !scenario1.user_id"
              class="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {{ isLoading ? 'Testing...' : '🚀 Test Szenario 1' }}
            </button>
          </div>
        </div>

        <!-- Szenario 2: Nur Produkte (ohne Termin) -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-xl font-semibold text-black mb-4">🛍️ Szenario 2: Nur Produkte (ohne Termin)</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-black mb-2">Student ID</label>
              <input 
                v-model="scenario2.user_id"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                placeholder="uuid-here"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-black mb-2">Staff ID</label>
              <input 
                v-model="scenario2.staff_id"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                placeholder="uuid-here"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-black mb-2">Zahlungsmethode</label>
              <select 
                v-model="scenario2.paymentMethod"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
              >
                <option value="cash">Bargeld</option>
                <option value="invoice">Rechnung</option>
                <option value="online">Online</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-black mb-2">Beschreibung</label>
              <input 
                v-model="scenario2.description"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md text-black"
                placeholder="Theorieunterricht + Lernmaterial"
              />
            </div>
            
            <button 
              @click="testScenario2"
              :disabled="isLoading || !scenario2.user_id"
              class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {{ isLoading ? 'Testing...' : '🛍️ Test Szenario 2' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Ergebnis Anzeige -->
      <div v-if="result" class="bg-white rounded-lg shadow p-6 mb-6">
        <div v-if="result.success" class="text-green-800">
          <h3 class="text-xl font-semibold mb-4 flex items-center">
            ✅ SUCCESS! Workflow Completed
          </h3>
          
          <div class="space-y-4">
            <div class="bg-green-50 p-4 rounded-lg">
              <h4 class="font-semibold mb-2">Erstellte Objekte:</h4>
              <div class="space-y-2 text-sm">
                <p v-if="result.appointment"><strong>Termin:</strong> {{ result.appointment.id }}</p>
                <p><strong>Payment:</strong> {{ result.payment.id }}</p>
                <p><strong>Payment Status:</strong> {{ result.payment.payment_status }}</p>
                <p><strong>Gesamtbetrag:</strong> {{ (result.payment.total_amount_rappen / 100).toFixed(2) }} CHF</p>
              </div>
            </div>
            
            <div v-if="result.payment.payment_items" class="bg-gray-50 p-4 rounded-lg">
              <h4 class="font-semibold mb-2">Payment Items:</h4>
              <div class="space-y-1 text-sm">
                <div v-for="item in result.payment.payment_items" :key="item.id" class="flex justify-between">
                  <span>{{ item.description }}</span>
                  <span class="font-mono">{{ (item.total_price_rappen / 100).toFixed(2) }} CHF</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="text-red-800">
          <h3 class="text-xl font-semibold mb-4 flex items-center">
            ❌ Workflow Failed
          </h3>
          
          <div class="bg-red-50 p-4 rounded-lg">
            <p class="font-medium mb-2">Error: {{ result.error }}</p>
          </div>
        </div>
        
        <details class="mt-6">
          <summary class="text-sm text-gray-600 cursor-pointer hover:text-gray-800">📋 Complete Response Details</summary>
          <pre class="text-xs text-gray-700 mt-3 bg-gray-50 p-4 rounded overflow-x-auto">{{ JSON.stringify(result, null, 2) }}</pre>
        </details>
      </div>

      <!-- Debug Information -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-semibold text-black mb-4">🔍 Debug Information</h3>
        <p class="text-sm text-gray-600 mb-3">
          Diese Seite testet den optimierten Speicher-Workflow, bei dem:
        </p>
        
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-medium mb-2">Was passiert:</h4>
          <ul class="text-sm text-gray-700 space-y-1">
            <li>• <strong>Szenario 1:</strong> Termin → DB, Payment Items → DB, Payment → DB</li>
            <li>• <strong>Szenario 2:</strong> Nur Payment Items → DB, Payment → DB (ohne Termin)</li>
            <li>• Alle Berechnungen werden automatisch durch DB-Trigger durchgeführt</li>
            <li>• Keine Payment-Daten mehr in der appointments Tabelle</li>
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
import { ref } from 'vue'
import { usePaymentsNew } from '~/composables/usePaymentsNew'

// Composables
const { 
  createAppointmentWithPayment, 
  createStandaloneProductPayment,
  loadProducts,
  loadDiscounts 
} = usePaymentsNew()

// State
const isLoading = ref(false)
const error = ref('')
const result = ref<any>(null)

// Test-Daten für Szenario 1: Termin + Produkte + Rabatte
const scenario1 = ref({
  title: 'Fahrstunde B',
  user_id: '',
  duration_minutes: 45,
  type: 'B',
  paymentMethod: 'cash' as 'cash' | 'invoice' | 'online'
})

// Test-Daten für Szenario 2: Nur Produkte
const scenario2 = ref({
  user_id: '',
  staff_id: '',
  paymentMethod: 'cash' as 'cash' | 'invoice' | 'online',
  description: 'Theorieunterricht + Lernmaterial'
})

// Test Szenario 1: Termin mit Produkten und Rabatten
const testScenario1 = async () => {
  isLoading.value = true
  error.value = ''
  result.value = null
  
  try {
    console.log('🚀 Testing Scenario 1: Appointment + Products + Discounts')
    
    // Mock-Daten für den Test
    const appointmentData = {
      title: scenario1.value.title,
      description: 'Test-Fahrstunde',
      user_id: scenario1.value.user_id,
      staff_id: undefined,
      location_id: undefined,
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + scenario1.value.duration_minutes * 60000).toISOString(),
      duration_minutes: scenario1.value.duration_minutes,
      type: scenario1.value.type,
      event_type_code: 'lesson',
      status: 'scheduled'
    }
    
    // Mock-Produkte laden (oder Standard-Produkte verwenden)
    const products = await loadProducts()
    const discounts = await loadDiscounts()
    
    console.log('📦 Loaded products:', products.length)
    console.log('🎫 Loaded discounts:', discounts.length)
    
    // Workflow ausführen
    const resultData = await createAppointmentWithPayment(
      appointmentData,
      products.slice(0, 2), // Erste 2 Produkte
      discounts.slice(0, 1), // Ersten Rabatt
      scenario1.value.paymentMethod
    )
    
    if (resultData) {
      result.value = {
        success: true,
        appointment: resultData.appointment,
        payment: resultData.payment
      }
      console.log('✅ Scenario 1 completed successfully:', resultData)
    } else {
      throw new Error('Failed to create appointment with payment')
    }
    
  } catch (err: any) {
    console.error('❌ Scenario 1 Error:', err)
    error.value = err.message || 'Unknown error'
    
    result.value = {
      success: false,
      error: err.message || 'Unknown error'
    }
  } finally {
    isLoading.value = false
  }
}

// Test Szenario 2: Nur Produkte (ohne Termin)
const testScenario2 = async () => {
  isLoading.value = true
  error.value = ''
  result.value = null
  
  try {
    console.log('🛍️ Testing Scenario 2: Standalone Products')
    
    // Mock-Produkte laden
    const products = await loadProducts()
    const discounts = await loadDiscounts()
    
    if (products.length === 0) {
      throw new Error('No products available for testing')
    }
    
    console.log('📦 Loaded products:', products.length)
    console.log('🎫 Loaded discounts:', discounts.length)
    
    // Workflow ausführen
    const payment = await createStandaloneProductPayment(
      scenario2.value.user_id,
      scenario2.value.staff_id,
      products.slice(0, 3), // Erste 3 Produkte
      discounts.slice(0, 1), // Ersten Rabatt
      scenario2.value.paymentMethod,
      scenario2.value.description
    )
    
    if (payment) {
      result.value = {
        success: true,
        payment: payment
      }
      console.log('✅ Scenario 2 completed successfully:', payment)
    } else {
      throw new Error('Failed to create standalone product payment')
    }
    
  } catch (err: any) {
    console.error('❌ Scenario 2 Error:', err)
    error.value = err.message || 'Unknown error'
    
    result.value = {
      success: false,
      error: err.message || 'Unknown error'
    }
  } finally {
    isLoading.value = false
  }
}
</script>
