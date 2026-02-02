<!-- components/StaffCashBalance.vue -->
<template>
  <div class="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg overflow-hidden">
    <!-- Header with Balance -->
    <div class="text-white px-6 py-6" :style="{ backgroundColor: tenantPrimaryColor }">
      <div>
        <p class="text-xs font-medium mb-1" :style="{ color: 'rgba(255, 255, 255, 0.6)' }">Aktueller Kassenstand</p>
        <h1 class="text-4xl font-bold">
          {{ (currentBalance / 100).toFixed(2) }} <span class="text-2xl font-semibold">CHF</span>
        </h1>
      </div>
    </div>

    <!-- Main Content -->
    <div class="p-1">
      <!-- Two Column Layout -->
      <div v-if="filteredFeed.length > 0" class="space-y-1">
        <div 
          v-for="item in filteredFeed" 
          :key="item.id"
          class="border-b border-gray-200 p-2"
          :class="getItemBackgroundClass(item)"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center space-x-3 flex-1">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold flex-shrink-0"
                   :class="item.type === 'transaction' ? '' : getItemStatusClass(item)"
                   :style="item.type === 'transaction' ? { backgroundColor: tenantPrimaryColor + '20', color: tenantPrimaryColor } : {}">
                {{ getItemStatusIcon(item) }}
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-semibold text-gray-900 truncate">
                  {{ getItemTitle(item) }}
                </h4>
                <p class="text-xs text-gray-500">
                  {{ formatDateTime(item.data.created_at) }}
                </p>
              </div>
            </div>
          </div>
          
          <div class="text-right">
            <p class="text-lg font-bold whitespace-nowrap"
               :class="getItemAmountClass(item)"
               :style="item.type === 'transaction' ? { color: tenantPrimaryColor } : {}">
              {{ getItemAmountText(item) }}
            </p>
          </div>
          
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <div class="text-6xl mb-4">📊</div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Keine Einträge gefunden</h3>
        <p class="text-gray-600">
          {{ showOnlyDeposits ? 'Keine Auf-/Abstockungen vorhanden' : 'Keine Kassenbewegungen oder Transaktionen vorhanden' }}
        </p>
      </div>
    </div>

    <!-- Toast Component -->
    <Toast
      :show="showToast"
      :type="toastType"
      :title="toastTitle"
      :message="toastMessage"
      @close="closeToast"
    />
  </div>
</template>

<script setup>

import { ref, computed, onMounted } from 'vue'
import { formatDate, formatDateTime } from '~/utils/dateUtils'
import { logger } from '~/utils/logger'
import Toast from '~/components/Toast.vue'
import { useTenant } from '~/composables/useTenant'

// Props
const props = defineProps({
  currentUser: {
    type: Object,
    required: true
  }
})

// Tenant
const { tenantPrimaryColor } = useTenant()

// Supabase

// State
const currentBalance = ref(0)
const cashMovements = ref([])
const cashTransactions = ref([])
const showOnlyDeposits = ref(false)

// Toast State
const showToast = ref(false)
const toastType = ref('success')
const toastTitle = ref('')
const toastMessage = ref('')

// Computed
const lastUpdated = computed(() => {
  const now = new Date()
  return formatDate(now)
})

const allFeedItems = computed(() => {
  const items = []
  
  // Add movements
  cashMovements.value.forEach(movement => {
    items.push({
      id: `movement-${movement.id}`,
      type: 'movement',
      data: movement,
      timestamp: new Date(movement.created_at)
    })
  })
  
  // Add transactions
  cashTransactions.value.forEach(transaction => {
    items.push({
      id: `transaction-${transaction.id}`,
      type: 'transaction',
      data: transaction,
      timestamp: new Date(transaction.created_at)
    })
  })
  
  // Sort by timestamp (newest first)
  return items.sort((a, b) => b.timestamp - a.timestamp)
})

const filteredFeed = computed(() => {
  if (!showOnlyDeposits.value) {
    return allFeedItems.value
  }
  
  return allFeedItems.value.filter(item => {
    if (item.type === 'movement') {
      return item.data.movement_type === 'deposit' || item.data.movement_type === 'withdrawal'
    }
    return false // Hide transactions when filtering
  })
})

// Load data on mount
onMounted(async () => {
  logger.debug('🚀 StaffCashBalance mounted, loading data...')
  await loadCashMovements()
  await loadCashTransactions()
  await loadCashBalance() // Load balance AFTER movements and transactions
  logger.debug('✅ All data loaded')
})

// Load cash balance
const loadCashBalance = async () => {
  try {
    logger.debug('🔍 Loading cash balance for staff:', props.currentUser.id)
    
    // Calculate balance from movements and transactions (same logic as admin)
    let balance = 0

    // Calculate from movements
    cashMovements.value.forEach(movement => {
      if (movement.movement_type === 'deposit') {
        balance += movement.amount_rappen
        logger.debug(`➕ Adding deposit: ${movement.amount_rappen / 100} CHF`)
      } else if (movement.movement_type === 'withdrawal') {
        balance -= movement.amount_rappen
        logger.debug(`➖ Subtracting withdrawal: ${movement.amount_rappen / 100} CHF`)
      }
    })

    // Calculate from transactions (ONLY pending ones, confirmed ones are ignored)
    cashTransactions.value.forEach(transaction => {
      if (transaction.status === 'pending') {
        balance += transaction.amount_rappen
        logger.debug(`➕ Adding pending transaction: ${transaction.amount_rappen / 100} CHF`)
      } else if (transaction.status === 'confirmed') {
        logger.debug(`❌ Ignoring confirmed transaction: ${transaction.amount_rappen / 100} CHF`)
      }
    })

    logger.debug(`💰 Final calculated balance: ${balance / 100} CHF`)
    currentBalance.value = balance

  } catch (err) {
    console.error('Error loading cash balance:', err)
    currentBalance.value = 0
  }
}

// Load cash movements
const loadCashMovements = async () => {
  try {
    const response = await $fetch(
      '/api/staff/cash-balance',
      {
        method: 'POST',
        body: {
          action: 'loadMovements',
          data: {
            instructorId: props.currentUser.id
          }
        }
      }
    )

    if (response && response.success) {
      cashMovements.value = response.data || []
    }
  } catch (err) {
    console.error('Error loading cash movements:', err)
    cashMovements.value = []
  }
}

// Load cash transactions
const loadCashTransactions = async () => {
  try {
    const response = await $fetch(
      '/api/staff/cash-balance',
      {
        method: 'POST',
        body: {
          action: 'loadTransactions',
          data: {
            instructorId: props.currentUser.id
          }
        }
      }
    )

    if (response && response.success) {
      cashTransactions.value = response.data || []
    }
  } catch (err) {
    console.error('Error loading cash transactions:', err)
    cashTransactions.value = []
  }
}

// Toast functions
const showSuccessToast = (title, message = '') => {
  toastType.value = 'success'
  toastTitle.value = title
  toastMessage.value = message
  showToast.value = true
}

const showErrorToast = (title, message = '') => {
  toastType.value = 'error'
  toastTitle.value = title
  toastMessage.value = message
  showToast.value = true
}

const closeToast = () => {
  showToast.value = false
}

// Utility functions
const getMovementTypeClass = (type) => {
  const classes = {
    'deposit': 'bg-green-100 text-green-600',
    'withdrawal': 'bg-red-100 text-red-600',
    'adjustment': 'bg-yellow-100 text-yellow-600'
  }
  return classes[type] || 'bg-gray-100 text-gray-600'
}

const getMovementTypeIcon = (type) => {
  const icons = {
    'deposit': '➕',
    'withdrawal': '➖',
    'cash_transaction': '💰',
    'adjustment': '⚖️'
  }
  return icons[type] || '❓'
}

const getMovementTypeText = (type) => {
  const texts = {
    'deposit': 'Kasse aufgestockt',
    'withdrawal': 'Kasse abgestockt',
    'cash_transaction': 'Bargeldtransaktion',
    'adjustment': 'Korrektur'
  }
  return texts[type] || type
}

const getTransactionStatusClass = (status) => {
  const classes = {
    'pending': 'bg-yellow-100 text-yellow-600',
    'confirmed': 'bg-green-100 text-green-600',
    'disputed': 'bg-red-100 text-red-600'
  }
  return classes[status] || 'bg-gray-100 text-gray-600'
}

const getTransactionStatusIcon = (status) => {
  const icons = {
    'pending': '⏳',
    'confirmed': '✅',
    'disputed': '❌'
  }
  return icons[status] || '❓'
}

const getTransactionStatusText = (status) => {
  const texts = {
    'pending': 'Ausstehend',
    'confirmed': 'Bestätigt',
    'disputed': 'Strittig'
  }
  return texts[status] || status
}

// New functions for simplified feed
const getItemStatusClass = (item) => {
  if (item.type === 'movement') {
    return getMovementTypeClass(item.data.movement_type)
  } else if (item.type === 'transaction') {
    return getTransactionStatusClass(item.data.status)
  }
  return 'bg-gray-100 text-gray-600'
}

const getItemStatusIcon = (item) => {
  if (item.type === 'movement') {
    return getMovementTypeIcon(item.data.movement_type)
  } else if (item.type === 'transaction') {
    return getTransactionStatusIcon(item.data.status)
  }
  return '❓'
}

const getItemTitle = (item) => {
  if (item.type === 'movement') {
    return getMovementTypeText(item.data.movement_type)
  } else if (item.type === 'transaction') {
    return item.data.student_name || 'Unbekannter Schüler'
  }
  return item.data.title || 'Unbekannter Eintrag'
}

const getItemAmountClass = (item) => {
  if (item.type === 'movement') {
    return item.data.movement_type === 'deposit' ? 'text-green-600' : 'text-red-600'
  }
  return ''
}

const getItemAmountText = (item) => {
  if (item.type === 'movement') {
    return `${item.data.movement_type === 'deposit' ? '+' : '-'}${(item.data.amount_rappen / 100).toFixed(2)} CHF`
  } else if (item.type === 'transaction') {
    return `${(item.data.amount_rappen / 100).toFixed(2)} CHF`
  }
  return '0.00 CHF'
}

const getItemSubtitle = (item) => {
  if (item.type === 'movement') {
    return `Kasse: ${(item.data.balance_after_rappen / 100).toFixed(2)} CHF`
  } else if (item.type === 'transaction') {
    return `Status: ${getTransactionStatusText(item.data.status)}`
  }
  return ''
}

const getItemBackgroundClass = (item) => {
  if (item.type === 'transaction' && item.data.status === 'confirmed') {
    return 'bg-green-50'
  }
  return ''
}
</script>
