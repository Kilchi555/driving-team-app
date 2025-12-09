<!-- components/StaffCashBalance.vue -->
<template>
  <div class="bg-white rounded-lg shadow-sm border p-4">
    <div class="flex items-center justify-between mb-6">
      <div class="text-sm text-gray-500">
        Letzte Aktualisierung: {{ lastUpdated }}
      </div>
    </div>

    <!-- Current Balance -->
    <div class="text-center mb-8">
      <div class="text-4xl font-bold text-green-600 mb-2">
        {{ (currentBalance / 100).toFixed(2) }} CHF
      </div>
      <div class="text-gray-600">Aktueller Kassenstand</div>
    </div>

    <!-- Filter -->
    <div class="mb-6">
      <div class="flex items-center space-x-4">
        <label class="flex items-center space-x-2">
          <input
            v-model="showOnlyDeposits"
            type="checkbox"
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span class="text-sm font-medium text-gray-700">Nur Auf-/Abstockungen</span>
        </label>
        
        <div class="text-sm text-gray-500">
          {{ filteredFeed.length }} von {{ allFeedItems.length }} Einträgen
        </div>
      </div>
    </div>

    <!-- Combined Feed -->
    <div class="space-y-4">
      <div 
        v-for="item in filteredFeed" 
        :key="item.id"
        class="border rounded-lg p-4 hover:shadow-sm transition-shadow"
        :class="getItemBackgroundClass(item)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                 :class="getItemStatusClass(item)">
              {{ getItemStatusIcon(item) }}
            </div>
            <div>
              <div class="font-medium text-gray-900">
                {{ getItemTitle(item) }}
              </div>
              <div class="text-sm text-gray-500">
                {{ formatDateTime(item.data.created_at) }}
              </div>
              <div v-if="item.type === 'transaction'" class="text-xs text-gray-400">
                Student: {{ item.data.student_name }}
              </div>
            </div>
          </div>
          
          <div class="text-right">
            <div class="text-lg font-semibold"
                 :class="getItemAmountClass(item)">
              {{ getItemAmountText(item) }}
            </div>
            <div class="text-sm text-gray-500">
              {{ getItemSubtitle(item) }}
            </div>
          </div>
        </div>
        
        <div v-if="item.data.notes" class="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
          {{ item.data.notes }}
        </div>

        <!-- Action Buttons for Pending Transactions -->
        <div v-if="item.type === 'transaction' && item.data.status === 'pending'" class="mt-3 flex space-x-2">
          <button
            @click="editTransaction(item.data)"
            class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            ✏️ Notizen bearbeiten
          </button>
        </div>
      </div>

      <div v-if="filteredFeed.length === 0" class="text-center py-8">
        <div class="text-4xl mb-4">📊</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Keine Einträge gefunden</h3>
        <p class="text-gray-600">
          {{ showOnlyDeposits ? 'Keine Auf-/Abstockungen vorhanden' : 'Keine Kassenbewegungen oder Transaktionen vorhanden' }}
        </p>
      </div>
    </div>

    <!-- Edit Transaction Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Notizen bearbeiten</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Betrag (CHF)</label>
            <input
              :value="(selectedTransaction?.amount_rappen / 100).toFixed(2)"
              type="text"
              readonly
              class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
            />
            <p class="text-xs text-gray-500 mt-1">Betrag kann nicht bearbeitet werden</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Notizen</label>
            <textarea
              v-model="editNotes"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Details zur Bargeldzahlung..."
            ></textarea>
          </div>
        </div>

        <div class="flex space-x-3 mt-6">
          <button
            @click="closeEditModal"
            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            @click="submitEdit"
            :disabled="!editNotes || isEditing"
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isEditing">Speichere...</span>
            <span v-else>Speichern</span>
          </button>
        </div>
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
import { getSupabase } from '~/utils/supabase'
import { formatDate, formatDateTime } from '~/utils/dateUtils'
import Toast from '~/components/Toast.vue'

// Props
const props = defineProps({
  currentUser: {
    type: Object,
    required: true
  }
})

// Supabase
const supabase = getSupabase()

// State
const currentBalance = ref(0)
const cashMovements = ref([])
const cashTransactions = ref([])
const showOnlyDeposits = ref(false)

// Edit Modal State
const showEditModal = ref(false)
const selectedTransaction = ref(null)
const editNotes = ref('')
const isEditing = ref(false)

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
    const { data, error } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('instructor_id', props.currentUser.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    cashMovements.value = data || []

  } catch (err) {
    console.error('Error loading cash movements:', err)
    cashMovements.value = []
  }
}

// Load cash transactions
const loadCashTransactions = async () => {
  try {
    const { data, error } = await supabase
      .from('cash_transactions')
      .select(`
        *,
        student:student_id(id, first_name, last_name)
      `)
      .eq('instructor_id', props.currentUser.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    cashTransactions.value = (data || []).map(transaction => ({
      ...transaction,
      student_name: transaction.student ? `${transaction.student.first_name} ${transaction.student.last_name}` : 'Unbekannt'
    }))

  } catch (err) {
    console.error('Error loading cash transactions:', err)
    cashTransactions.value = []
  }
}

// Edit transaction
const editTransaction = (transaction) => {
  selectedTransaction.value = transaction
  editNotes.value = transaction.notes || ''
  showEditModal.value = true
}

// Submit edit
const submitEdit = async () => {
  if (!selectedTransaction.value) return

  isEditing.value = true

  try {
    const { error: updateError } = await supabase
      .from('cash_transactions')
      .update({ 
        notes: editNotes.value
      })
      .eq('id', selectedTransaction.value.id)

    if (updateError) throw updateError

    // Update local transaction data immediately
    const transactionIndex = cashTransactions.value.findIndex(t => t.id === selectedTransaction.value.id)
    if (transactionIndex !== -1) {
      cashTransactions.value[transactionIndex].notes = editNotes.value
    }

    // Force reactivity by creating a new array
    cashTransactions.value = [...cashTransactions.value]

    // Also refresh from database to ensure consistency
    await loadCashTransactions()
    closeEditModal()

    // Show success toast
    showSuccessToast('Notizen erfolgreich gespeichert!')

  } catch (err) {
    console.error('Error editing transaction:', err)
    showErrorToast('Fehler beim Speichern der Notizen', err.message)
  } finally {
    isEditing.value = false
  }
}

// Close edit modal
const closeEditModal = () => {
  showEditModal.value = false
  selectedTransaction.value = null
  editNotes.value = ''
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
    'cash_transaction': 'bg-blue-100 text-blue-600',
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
    return 'Bargeldtransaktion'
  }
  return item.data.title || 'Unbekannter Eintrag'
}

const getItemAmountClass = (item) => {
  if (item.type === 'movement') {
    return item.data.movement_type === 'deposit' ? 'text-green-600' : 'text-red-600'
  } else if (item.type === 'transaction') {
    return 'text-blue-600'
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
