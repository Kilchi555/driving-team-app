<template>
  <div class="cash-transactions-overview">
    
    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Zeitraum</label>
          <select v-model="timeFilter" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="today">Heute</option>
            <option value="week">Diese Woche</option>
            <option value="month">Dieser Monat</option>
            <option value="all">Alle</option>
          </select>
        </div>
        
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select v-model="statusFilter" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">Alle Status</option>
            <option value="pending">Ausstehend</option>
            <option value="confirmed">Bestätigt</option>
            <option value="disputed">Streitig</option>
          </select>
        </div>
        
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Typ</label>
          <select v-model="typeFilter" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">Alle Typen</option>
            <option value="instructor">Fahrlehrer</option>
            <option value="office">Bürokasse</option>
          </select>
        </div>
        
        <div class="flex items-end">
          <button
            @click="loadTransactions"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            🔍 Filtern
          </button>
        </div>
      </div>
    </div>

    <!-- Transactions Table -->
    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">
          Transaktionen ({{ filteredTransactions.length }})
        </h3>
      </div>
      
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center py-12">
        <LoadingLogo size="md" />
      </div>
      
      <!-- Transactions List -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Typ</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Von/An</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Betrag</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kasse</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="transaction in filteredTransactions" :key="transaction.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 text-sm text-gray-900">
                {{ formatDateTime(transaction.created_at) }}
              </td>
              <td class="px-6 py-4">
                <span :class="getTypeIconClass(transaction.movement_type)" class="inline-flex items-center px-2 py-1 text-xs rounded-full">
                  {{ getTypeIcon(transaction.movement_type) }} {{ getTypeLabel(transaction.movement_type) }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-900">
                {{ transaction.performer_name || 'System' }}
              </td>
              <td class="px-6 py-4 text-sm font-medium text-gray-900">
                {{ formatCurrency(transaction.amount_rappen) }}
              </td>
              <td class="px-6 py-4">
                <span :class="getStatusClass(transaction.status)" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full">
                  {{ getStatusLabel(transaction.status) }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">
                {{ transaction.register_name || 'Fahrlehrer-Kasse' }}
              </td>
            </tr>
            
            <!-- Empty State -->
            <tr v-if="filteredTransactions.length === 0">
              <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                <div class="text-lg">💱</div>
                <div class="text-sm mt-2">Keine Transaktionen gefunden</div>
                <div class="text-xs mt-1">Versuchen Sie andere Filter</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// State
const isLoading = ref(false)
const transactions = ref<any[]>([])
const timeFilter = ref('week')
const statusFilter = ref('')
const typeFilter = ref('')

// Computed
const filteredTransactions = computed(() => {
  let filtered = transactions.value
  
  if (statusFilter.value) {
    filtered = filtered.filter(t => t.status === statusFilter.value)
  }
  
  if (typeFilter.value) {
    filtered = filtered.filter(t => t.source_type === typeFilter.value)
  }
  
  return filtered
})

// Methods
const formatCurrency = (rappen: number): string => {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getTypeIcon = (type: string): string => {
  const icons = {
    deposit: '💰',
    withdrawal: '💸',
    transfer: '🔄',
    adjustment: '⚖️'
  }
  return icons[type] || '💱'
}

const getTypeLabel = (type: string): string => {
  const labels = {
    deposit: 'Einzahlung',
    withdrawal: 'Abhebung',
    transfer: 'Transfer',
    adjustment: 'Anpassung'
  }
  return labels[type] || type
}

const getTypeIconClass = (type: string): string => {
  const classes = {
    deposit: 'bg-green-100 text-green-800',
    withdrawal: 'bg-red-100 text-red-800',
    transfer: 'bg-blue-100 text-blue-800',
    adjustment: 'bg-yellow-100 text-yellow-800'
  }
  return classes[type] || 'bg-gray-100 text-gray-800'
}

const getStatusClass = (status: string): string => {
  const classes = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    disputed: 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getStatusLabel = (status: string): string => {
  const labels = {
    pending: 'Ausstehend',
    confirmed: 'Bestätigt',
    disputed: 'Streitig'
  }
  return labels[status] || status
}

const loadTransactions = async () => {
  isLoading.value = true
  
  try {
    // TODO: Load actual transactions from database
    // For now, mock data
    transactions.value = []
    console.log('✅ Transactions loaded')
  } catch (err) {
    console.error('❌ Error loading transactions:', err)
  } finally {
    isLoading.value = false
  }
}

// Lifecycle
onMounted(async () => {
  await loadTransactions()
})
</script>

<style scoped>
/* Add any specific styles here */
</style>













