<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">
          Guthaben-Management
        </h3>
        <p class="text-sm text-gray-600">
          {{ student?.first_name }} {{ student?.last_name }}
        </p>
      </div>
      
      <!-- Aktuelles Guthaben -->
      <div class="text-right">
        <div :class="[
          'text-2xl font-bold',
          (currentCredit?.balance_rappen || 0) < 0 ? 'text-red-600' : 'text-green-600'
        ]">
          {{ formatCreditAmount(currentCredit?.balance_rappen || 0) }}
        </div>
        <div class="text-sm text-gray-500">
          {{ (currentCredit?.balance_rappen || 0) < 0 ? 'Offener Betrag' : 'Verfügbares Guthaben' }}
        </div>
        <div v-if="(currentCredit?.balance_rappen || 0) < 0" class="mt-1">
          <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
            ⚠️ Schulden
          </span>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="-mb-px flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            activeTab === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm'
          ]"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- Tab Content -->
    <div class="min-h-[400px]">
      <!-- Einzahlung Tab -->
      <div v-if="activeTab === 'deposit'" class="space-y-6">

        <form @submit.prevent="handleDeposit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Betrag (CHF)
            </label>
            <div class="relative">
              <input
                v-model="depositForm.amount"
                type="number"
                step="0.05"
                min="0.05"
                max="10000"
                class="p-2 block w-full pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                required
              />
              <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span class="text-gray-500 sm:text-sm">CHF</span>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Zahlungsmethode
            </label>
            <select
              v-model="depositForm.paymentMethod"
              class="p-2 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Bitte wählen</option>
              <option value="cash">Bar</option>
              <option value="online">Online (Karte/TWINT)</option>
              <option value="invoice">Rechnung</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Notiz (optional)
            </label>
            <textarea
              v-model="depositForm.notes"
              rows="3"
              class="p-2 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Grund für die Einzahlung..."
            ></textarea>
          </div>

          <div class="flex justify-end">
            <button
              type="submit"
              :disabled="isLoading"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isLoading" class="inline-flex items-center">
                <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Wird verarbeitet...
              </span>
              <span v-else>Guthaben einzahlen</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Auszahlung Tab -->
      <div v-if="activeTab === 'withdrawal'" class="space-y-6">

        <form @submit.prevent="handleWithdrawal" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Betrag (CHF)
            </label>
            <div class="relative">
              <input
                v-model="withdrawalForm.amount"
                type="number"
                step="0.05"
                min="0.05"
                :max="(currentCredit?.balance_rappen || 0) / 100"
                class="p-2 block w-full pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                required
              />
              <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span class="text-gray-500 sm:text-sm">CHF</span>
              </div>
            </div>
            <p class="mt-1 text-sm text-gray-500">
              Verfügbar: {{ formatCreditAmount(currentCredit?.balance_rappen || 0) }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Grund für Auszahlung
            </label>
            <input
              v-model="withdrawalForm.reason"
              type="text"
              class="p-2 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="z.B. Rückerstattung, Kündigung..."
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Notiz (optional)
            </label>
            <textarea
              v-model="withdrawalForm.notes"
              rows="3"
              class="p-2 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Zusätzliche Details..."
            ></textarea>
          </div>

          <div class="flex justify-end">
            <button
              type="submit"
              :disabled="isLoading || !currentCredit?.balance_rappen"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isLoading" class="inline-flex items-center">
                <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Wird verarbeitet...
              </span>
              <span v-else>Guthaben auszahlen</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Transaktionen Tab -->
      <div v-if="activeTab === 'transactions'" class="space-y-6">
        <div class="flex items-center justify-between">
          <h4 class="text-lg font-medium text-gray-900">Transaktions-Historie</h4>
          <button
            @click="loadTransactions"
            :disabled="isLoading"
            class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg class="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Aktualisieren
          </button>
        </div>

        <div v-if="isLoading" class="text-center py-8">
          <svg class="animate-spin h-8 w-8 text-gray-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-2 text-sm text-gray-500">Lade Transaktionen...</p>
        </div>

        <div v-else-if="transactions.length === 0" class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Keine Transaktionen</h3>
          <p class="mt-1 text-sm text-gray-500">
            Es wurden noch keine Guthaben-Transaktionen getätigt.
          </p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="transaction in transactions"
            :key="transaction.id"
            class="bg-gray-50 rounded-lg p-4 border border-gray-200"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <span
                  :class="[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    getTransactionTypeClass(transaction.transaction_type)
                  ]"
                >
                  {{ getTransactionTypeText(transaction.transaction_type) }}
                </span>
                <span class="text-sm text-gray-500">
                  {{ formatDate(transaction.created_at) }}
                </span>
              </div>
              <div class="text-right">
                <div
                  :class="[
                    'text-lg font-semibold',
                    transaction.amount_rappen >= 0 ? 'text-green-600' : 'text-red-600'
                  ]"
                >
                  {{ transaction.amount_rappen >= 0 ? '+' : '' }}{{ formatCreditAmount(transaction.amount_rappen) }}
                </div>
                <div class="text-sm text-gray-500">
                  Guthaben: {{ formatCreditAmount(transaction.balance_after_rappen) }}
                </div>
              </div>
            </div>
            
            <div v-if="transaction.notes" class="mt-2 text-sm text-gray-600">
              {{ transaction.notes }}
            </div>
            
            <div v-if="transaction.payment_method" class="mt-2 text-xs text-gray-500">
              Zahlungsmethode: {{ getPaymentMethodText(transaction.payment_method) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Fehler</h3>
          <div class="mt-2 text-sm text-red-700">{{ error }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useStudentCredits } from '~/composables/useStudentCredits'
import type { StudentCredit, CreditTransactionWithDetails } from '~/types/studentCredits'

interface Props {
  student: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

const props = defineProps<Props>()

// Composables
const {
  isLoading,
  error,
  getStudentCredit,
  depositCredit,
  withdrawCredit,
  getCreditTransactions,
  formatCreditAmount,
  chfToRappen
} = useStudentCredits()

// State
const activeTab = ref('deposit')
const currentCredit = ref<StudentCredit | null>(null)
const transactions = ref<CreditTransactionWithDetails[]>([])

// Form data
const depositForm = ref({
  amount: '',
  paymentMethod: '',
  notes: ''
})

const withdrawalForm = ref({
  amount: '',
  reason: '',
  notes: ''
})

// Tabs configuration
const tabs = [
  { id: 'deposit', name: 'Einzahlung' },
  { id: 'withdrawal', name: 'Auszahlung' },
  { id: 'transactions', name: 'Transaktionen' }
]

// Methods
const loadCredit = async () => {
  if (props.student?.id) {
    currentCredit.value = await getStudentCredit(props.student.id)
  }
}

const loadTransactions = async () => {
  if (props.student?.id) {
    transactions.value = await getCreditTransactions(props.student.id)
  }
}

const handleDeposit = async () => {
  if (!depositForm.value.amount || !depositForm.value.paymentMethod) return
  
  const amountRappen = chfToRappen(parseFloat(depositForm.value.amount))
  
  const success = await depositCredit({
    user_id: props.student.id,
    amount_rappen: amountRappen,
    payment_method: depositForm.value.paymentMethod as 'cash' | 'online' | 'invoice',
    notes: depositForm.value.notes
  })
  
  if (success) {
    // Form zurücksetzen
    depositForm.value = {
      amount: '',
      paymentMethod: '',
      notes: ''
    }
    
    // Guthaben und Transaktionen neu laden
    await loadCredit()
    await loadTransactions()
    
    // Erfolgsmeldung anzeigen
    // TODO: Toast-Benachrichtigung implementieren
  }
}

const handleWithdrawal = async () => {
  if (!withdrawalForm.value.amount || !withdrawalForm.value.reason) return
  
  const amountRappen = chfToRappen(parseFloat(withdrawalForm.value.amount))
  
  const success = await withdrawCredit({
    user_id: props.student.id,
    amount_rappen: amountRappen,
    reason: withdrawalForm.value.reason,
    notes: withdrawalForm.value.notes
  })
  
  if (success) {
    // Form zurücksetzen
    withdrawalForm.value = {
      amount: '',
      reason: '',
      notes: ''
    }
    
    // Guthaben und Transaktionen neu laden
    await loadCredit()
    await loadTransactions()
    
    // Erfolgsmeldung anzeigen
    // TODO: Toast-Benachrichtigung implementieren
  }
}

// Utility functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getTransactionTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    deposit: 'Einzahlung',
    withdrawal: 'Auszahlung',
    appointment_payment: 'Termin-Bezahlung',
    refund: 'Rückerstattung',
    cancellation: 'Stornierung'
  }
  return typeMap[type] || type
}

const getTransactionTypeClass = (type: string) => {
  const classMap: Record<string, string> = {
    deposit: 'text-green-600 bg-green-100',
    withdrawal: 'text-red-600 bg-red-100',
    appointment_payment: 'text-blue-600 bg-blue-100',
    refund: 'text-orange-600 bg-orange-100',
    cancellation: 'text-gray-600 bg-gray-100'
  }
  return classMap[type] || 'text-gray-600 bg-gray-100'
}

const getPaymentMethodText = (method: string) => {
  const methodMap: Record<string, string> = {
    cash: 'Bar',
    online: 'Online',
    invoice: 'Rechnung',
    credit: 'Guthaben'
  }
  return methodMap[method] || method
}

// Lifecycle
onMounted(async () => {
  await loadCredit()
  await loadTransactions()
})

// Watch for student changes
watch(() => props.student?.id, async (newId) => {
  if (newId) {
    await loadCredit()
    await loadTransactions()
  }
})
</script>
