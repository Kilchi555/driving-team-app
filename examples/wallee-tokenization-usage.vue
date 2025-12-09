<!-- examples/wallee-tokenization-usage.vue -->
<!-- ✅ BEISPIEL: Wallee Tokenization in Payment-Seite nutzen -->

<template>
  <div class="payment-options">
    <!-- Neue Zahlung (normale Wallee-Transaktion) -->
    <div class="payment-option">
      <h3>Neue Zahlung</h3>
      <p>Zahlungsdaten werden bei Wallee gespeichert für zukünftige Zahlungen</p>
      <button @click="createNewPayment" :disabled="isProcessing">
        {{ isProcessing ? 'Wird verarbeitet...' : 'Jetzt bezahlen' }}
      </button>
    </div>
    
    <!-- Gespeicherte Zahlungsmethoden anzeigen -->
    <div v-if="savedPaymentMethods.length > 0" class="saved-methods">
      <h3>Gespeicherte Zahlungsmethoden</h3>
      <div v-for="method in savedPaymentMethods" :key="method.id" class="payment-method">
        <div class="method-info">
          <h4>{{ method.name }}</h4>
          <p>{{ method.description }}</p>
          <small>Zuletzt verwendet: {{ formatDate(method.lastUsed) }}</small>
          <small>Anzahl Zahlungen: {{ method.transactionCount }}</small>
        </div>
        <button @click="payWithSavedMethod(method)" :disabled="isProcessing">
          Mit dieser Methode bezahlen
        </button>
      </div>
    </div>
    
    <!-- Keine gespeicherten Methoden -->
    <div v-else-if="!isLoadingMethods" class="no-saved-methods">
      <p>Noch keine gespeicherten Zahlungsmethoden. Bei der ersten Zahlung werden diese automatisch gespeichert.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWalleeTokenization, type WalleePaymentMethod } from '~/composables/useWalleeTokenization'

// Composables
const { 
  getCustomerPaymentMethods, 
  createRecurringTransaction, 
  hasSavedPaymentMethods 
} = useWalleeTokenization()

// State
const savedPaymentMethods = ref<WalleePaymentMethod[]>([])
const isLoadingMethods = ref(false)
const isProcessing = ref(false)

// Beispiel-Daten
const customerEmail = 'customer@example.com'
const paymentAmount = 95.00

// ✅ Gespeicherte Zahlungsmethoden laden
const loadSavedPaymentMethods = async () => {
  isLoadingMethods.value = true
  
  try {
    const result = await getCustomerPaymentMethods(customerEmail)
    savedPaymentMethods.value = result.paymentMethods
    
    logger.debug('💳 Loaded saved payment methods:', {
      count: result.paymentMethods.length,
      totalTransactions: result.totalTransactions
    })
    
  } catch (error) {
    console.error('❌ Error loading saved payment methods:', error)
  } finally {
    isLoadingMethods.value = false
  }
}

// ✅ Neue Zahlung erstellen (normale Wallee-Transaktion)
const createNewPayment = async () => {
  isProcessing.value = true
  
  try {
    // Normale Wallee-Transaktion - Zahlungsmethoden werden automatisch gespeichert
    const response = await $fetch('/api/wallee/create-transaction', {
      method: 'POST',
      body: {
        orderId: `new-payment-${Date.now()}`,
        amount: paymentAmount,
        currency: 'CHF',
        customerEmail: customerEmail,
        customerName: 'Max Mustermann',
        description: 'Fahrstunde',
        successUrl: `${window.location.origin}/payment/success`,
        failedUrl: `${window.location.origin}/payment/failed`
      }
    })
    
    if (response.success && response.paymentUrl) {
      // Zur Wallee-Zahlungsseite weiterleiten
      window.location.href = response.paymentUrl
    }
    
  } catch (error) {
    console.error('❌ Error creating new payment:', error)
    alert('Fehler beim Erstellen der Zahlung')
  } finally {
    isProcessing.value = false
  }
}

// ✅ Mit gespeicherter Zahlungsmethode bezahlen
const payWithSavedMethod = async (method: WalleePaymentMethod) => {
  isProcessing.value = true
  
  try {
    logger.debug('💳 Paying with saved method:', method.name)
    
    // Wiederkehrende Zahlung mit gespeicherter Methode
    const response = await createRecurringTransaction({
      orderId: `recurring-${Date.now()}`,
      amount: paymentAmount,
      currency: 'CHF',
      customerEmail: customerEmail,
      customerName: 'Max Mustermann',
      description: 'Fahrstunde (gespeicherte Zahlungsmethode)',
      successUrl: `${window.location.origin}/payment/success`,
      failedUrl: `${window.location.origin}/payment/failed`
    })
    
    if (response.success && response.paymentUrl) {
      // Zur Wallee-Zahlungsseite weiterleiten
      // Wallee zeigt die gespeicherten Zahlungsmethoden an
      window.location.href = response.paymentUrl
    }
    
  } catch (error) {
    console.error('❌ Error paying with saved method:', error)
    alert('Fehler bei der Zahlung mit gespeicherter Methode')
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

// ✅ Beim Laden der Komponente
onMounted(async () => {
  await loadSavedPaymentMethods()
})
</script>

<style scoped>
.payment-options {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.payment-option, .saved-methods {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.payment-method {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 10px;
  border: 1px solid #e0e0e0;
}

.method-info h4 {
  margin: 0 0 5px 0;
  color: #333;
}

.method-info p {
  margin: 0 0 5px 0;
  color: #666;
  font-size: 14px;
}

.method-info small {
  display: block;
  color: #888;
  font-size: 12px;
  margin-bottom: 2px;
}

button {
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background: #0056b3;
}

.no-saved-methods {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
}
</style>
