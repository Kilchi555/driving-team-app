<!-- components/admin/CashBalanceManager.vue -->
<template>
  <div>

    <!-- Staff list -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div v-if="staffBalances.length === 0" class="px-5 py-10 text-center text-sm text-gray-400">
        Keine Mitarbeiter-Kassen gefunden.
      </div>
      <div v-else>
        <div
          v-for="(staff, idx) in staffBalances"
          :key="staff.id"
          class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5 sm:py-3.5"
          :class="{ 'border-t border-gray-100': idx > 0 }"
        >
          <!-- Top row: avatar + name + balance -->
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <!-- Avatar -->
            <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-semibold text-gray-600">
                {{ staff.first_name?.charAt(0) }}{{ staff.last_name?.charAt(0) }}
              </span>
            </div>
            <!-- Name + email -->
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 leading-tight">{{ staff.first_name }} {{ staff.last_name }}</p>
              <p class="text-xs text-gray-400 truncate">{{ staff.email }}</p>
            </div>
            <!-- Balance — inline on mobile, separate on desktop -->
            <span
              class="text-sm font-semibold tabular-nums flex-shrink-0 sm:mx-6"
              :class="getStaffCurrentBalance(staff.id) >= 0 ? 'text-gray-900' : 'text-red-600'"
            >
              {{ (getStaffCurrentBalance(staff.id) / 100).toFixed(2) }} CHF
            </span>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 sm:flex-shrink-0">
            <button
              class="flex-1 sm:flex-none text-xs px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium transition-colors whitespace-nowrap text-center"
              @click="openHandoverModal(staff)"
            >
              Kassenabgabe
            </button>
            <button
              class="flex-1 sm:flex-none text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors text-center"
              @click="viewStaffTransactions(staff)"
            >
              Details
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Up Modal -->
    <div v-if="showTopUpModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-4 sm:p-6">
        <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Kasse aufstocken</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Mitarbeiter</label>
            <select
              v-model="topUpStaffId"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Mitarbeiter auswählen</option>
              <option
                v-for="staff in staffBalances"
                :key="staff.id"
                :value="staff.id"
              >
                {{ staff.first_name }} {{ staff.last_name }}
              </option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Betrag (CHF)</label>
            <input
              v-model="topUpAmount"
              type="number"
              step="0.01"
              min="0.01"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Grund (optional)</label>
            <input
              v-model="topUpReason"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Grundstock, Rückerstattung..."
            >
          </div>
        </div>

        <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
          <button
            class="w-full sm:flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
            @click="closeTopUpModal"
          >
            Abbrechen
          </button>
          <button
            :disabled="!topUpStaffId || !topUpAmount || isTopUpLoading"
            class="w-full sm:flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            @click="submitTopUp"
          >
            <span v-if="isTopUpLoading">Lade auf...</span>
            <span v-else>Aufstocken</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Withdraw Modal -->
    <div v-if="showWithdrawModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-4 sm:p-6">
        <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Kasse abstocken</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Mitarbeiter</label>
            <select
              v-model="withdrawStaffId"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Mitarbeiter auswählen</option>
              <option
                v-for="staff in staffBalances"
                :key="staff.id"
                :value="staff.id"
              >
                {{ staff.first_name }} {{ staff.last_name }}
              </option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Betrag (CHF)</label>
            <input
              v-model="withdrawAmount"
              type="number"
              step="0.01"
              min="0.01"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Grund (optional)</label>
            <input
              v-model="withdrawReason"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="z.B. Abhebung, Korrektur..."
            >
          </div>
        </div>

        <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
          <button
            class="w-full sm:flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
            @click="closeWithdrawModal"
          >
            Abbrechen
          </button>
          <button
            :disabled="!withdrawStaffId || !withdrawAmount || isWithdrawLoading"
            class="w-full sm:flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            @click="submitWithdraw"
          >
            <span v-if="isWithdrawLoading">Entnehme...</span>
            <span v-else>Abstocken</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Staff Details Modal -->
    <div v-if="showStaffModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        <!-- Header -->
        <div class="flex-shrink-0 px-6 py-4 border-b border-gray-100">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-semibold text-gray-900">{{ selectedStaff?.first_name }} {{ selectedStaff?.last_name }}</h3>
              <p class="text-xs text-gray-400 mt-0.5">{{ selectedStaff?.email }}</p>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-right">
                <p class="text-xs text-gray-400">Kassenstand</p>
                <p class="text-lg font-semibold" :class="calculatedCurrentBalance >= 0 ? 'text-gray-900' : 'text-red-600'">
                  {{ (calculatedCurrentBalance / 100).toFixed(2) }} CHF
                </p>
              </div>
              <button class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors" @click="closeStaffModal">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          <!-- Summary strip -->
          <div class="flex items-center gap-6 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500">
            <span>Einzahlungen: <span class="font-medium text-green-600">+{{ (totalDeposits / 100).toFixed(2) }}</span></span>
            <span>Abgaben: <span class="font-medium text-red-600">-{{ (totalWithdrawals / 100).toFixed(2) }}</span></span>
            <span>Ausstehend: <span class="font-medium text-blue-600">+{{ (totalPendingTransactions / 100).toFixed(2) }}</span></span>
          </div>
        </div>

        <!-- Feed -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="staffFeedItems.length === 0" class="px-6 py-12 text-center text-sm text-gray-400">
            Keine Kassenbewegungen vorhanden.
          </div>
          <div v-else>
            <div
              v-for="(item, idx) in staffFeedItems"
              :key="item.id"
              class="flex items-start px-6 py-3"
              :class="{ 'border-t border-gray-100': idx > 0 }"
            >
              <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 mr-3" :class="getItemStatusClass(item)">
                {{ getItemStatusIcon(item) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900">{{ getItemTitle(item) }}</p>
                <div class="flex items-center gap-3 mt-0.5">
                  <span class="text-xs text-gray-400">{{ formatDateTime(item.data.created_at) }}</span>
                  <span v-if="item.type === 'transaction' && item.data.student_name" class="text-xs text-gray-400">{{ item.data.student_name }}</span>
                </div>
                <p v-if="item.data.notes && !item.data.notes.startsWith('Automatisch erstellt aus Payment ID')" class="text-xs text-gray-500 mt-1 italic">{{ item.data.notes }}</p>
              </div>
              <div class="text-right ml-4 flex-shrink-0">
                <p class="text-sm font-semibold tabular-nums" :class="getItemAmountClass(item)">{{ getItemAmountText(item) }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ getItemSubtitle(item) }}</p>
              </div>
            </div>
          </div>
        </div>
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
            >
            <p class="text-xs text-gray-500 mt-1">Betrag kann nicht bearbeitet werden</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Notizen</label>
            <textarea
              v-model="editNotes"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Details zur Bargeldzahlung..."
            />
          </div>
        </div>

        <div class="flex space-x-3 mt-6">
          <button
            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            @click="closeEditModal"
          >
            Abbrechen
          </button>
          <button
            :disabled="!editNotes || isEditing"
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="submitEdit"
          >
            <span v-if="isEditing">Speichere...</span>
            <span v-else>Speichern</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Cash Handover Modal -->
    <div v-if="showHandoverModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-4 sm:p-6">
        <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Kassenabgabe erfassen</h3>
        <p class="text-sm text-gray-500 mb-4">Bargeld wurde von Mitarbeiter an die Fahrschule übergeben.</p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Mitarbeiter</label>
            <select
              v-model="handoverStaffId"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Mitarbeiter auswählen</option>
              <option
                v-for="staff in staffBalances"
                :key="staff.id"
                :value="staff.id"
              >
                {{ staff.first_name }} {{ staff.last_name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Betrag (CHF)</label>
            <input
              v-model="handoverAmount"
              type="number"
              step="0.05"
              min="0.05"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="0.00"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Notizen <span class="text-gray-400">(optional)</span></label>
            <input
              v-model="handoverNotes"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="z.B. Wochenauszahlung, Monatskasse..."
            >
          </div>

          <div class="bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-500">
            Datum: {{ new Date().toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) }}
          </div>
        </div>

        <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
          <button
            class="w-full sm:flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
            @click="closeHandoverModal"
          >
            Abbrechen
          </button>
          <button
            :disabled="!handoverStaffId || !handoverAmount || isHandoverLoading"
            class="w-full sm:flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            @click="submitHandover"
          >
            <span v-if="isHandoverLoading">Wird erfasst...</span>
            <span v-else>Kassenabgabe erfassen</span>
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

<script setup lang="ts">

import { ref, computed, onMounted } from 'vue'
import { formatDateTime } from '~/utils/dateUtils'
import Toast from '~/components/Toast.vue'

// Supabase

// State
const staffBalances = ref([])
const isLoading = ref(false)

// Modal States
const showTopUpModal = ref(false)
const showWithdrawModal = ref(false)
const showStaffModal = ref(false)
const showEditModal = ref(false)

// Top Up State
const topUpStaffId = ref('')
const topUpAmount = ref('')
const topUpReason = ref('')
const isTopUpLoading = ref(false)

// Withdraw State
const withdrawStaffId = ref('')
const withdrawAmount = ref('')
const withdrawReason = ref('')
const isWithdrawLoading = ref(false)

// Cash Handover State
const showHandoverModal = ref(false)
const handoverStaffId = ref('')
const handoverAmount = ref('')
const handoverNotes = ref('')
const isHandoverLoading = ref(false)

// Staff Details State
const selectedStaff = ref(null)
const staffMovements = ref([])
const staffTransactions = ref([])

// Edit Transaction State
const selectedTransaction = ref(null)
const editNotes = ref('')
const isEditing = ref(false)

// Toast State
const showToast = ref(false)
const toastType = ref('success')
const toastTitle = ref('')
const toastMessage = ref('')

// Computed
const totalDeposits = computed(() => {
  if (!selectedStaff.value) return 0
  return staffMovements.value
    .filter(m => m.movement_type === 'deposit')
    .reduce((sum, m) => sum + m.amount_rappen, 0)
})

const totalWithdrawals = computed(() => {
  if (!selectedStaff.value) return 0
  return staffMovements.value
    .filter(m => m.movement_type === 'withdrawal' || m.movement_type === 'cash_handover')
    .reduce((sum, m) => sum + m.amount_rappen, 0)
})

const totalPendingTransactions = computed(() => {
  if (!selectedStaff.value) return 0
  return staffTransactions.value
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount_rappen, 0)
})



// Calculate current balance based on movements and transactions
const calculatedCurrentBalance = computed(() => {
  if (!selectedStaff.value) return 0
  
  // Start with deposits
  let balance = totalDeposits.value
  
  // Subtract withdrawals
  balance -= totalWithdrawals.value
  
  // Add pending transactions (money collected but not yet confirmed)
  const pendingAmount = staffTransactions.value
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount_rappen, 0)
  balance += pendingAmount
  
  logger.debug('💰 Balance calculation:', {
    deposits: totalDeposits.value,
    withdrawals: totalWithdrawals.value,
    pending: pendingAmount,
    finalBalance: balance
  })
  
  return balance
})

const staffFeedItems = computed(() => {
  const items = []
  
  // Add movements
  staffMovements.value.forEach(movement => {
    items.push({
      id: `movement-${movement.id}`,
      type: 'movement',
      data: movement,
      timestamp: new Date(movement.created_at)
    })
  })
  
  // Add transactions
  staffTransactions.value.forEach(transaction => {
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

// Load data on mount
onMounted(async () => {
  logger.debug('🚀 CashBalanceManager mounted, loading staff balances...')
  await loadStaffBalances()
  logger.debug('✅ Staff balances loaded:', staffBalances.value)
})

// Load staff balances
const loadStaffBalances = async () => {
  isLoading.value = true
  
  try {
    const response: any = await $fetch('/api/admin/cash-management', {
      method: 'POST',
      body: { action: 'load_staff_balances' }
    })
    staffBalances.value = response.data || []
  } catch (err: any) {
    console.error('Error loading staff balances:', err)
    showErrorToast('Fehler beim Laden der Kassenstände', err.message)
    staffBalances.value = []
  } finally {
    isLoading.value = false
  }
}

// View staff transactions
const viewStaffTransactions = async (staff) => {
  selectedStaff.value = staff
  showStaffModal.value = true
  
  // Load staff-specific data
  await loadStaffMovements(staff.id)
  await loadStaffTransactions(staff.id)
}

// Load staff movements
const loadStaffMovements = async (staffId) => {
  try {
    const response: any = await $fetch('/api/admin/cash-management', {
      method: 'POST',
      body: { action: 'load_staff_movements', instructor_id: staffId }
    })
    staffMovements.value = response.data || []
  } catch (err) {
    console.error('Error loading staff movements:', err)
    staffMovements.value = []
  }
}

// Load staff transactions
const loadStaffTransactions = async (staffId) => {
  try {
    const response: any = await $fetch('/api/admin/cash-management', {
      method: 'POST',
      body: { action: 'load_staff_transactions', instructor_id: staffId }
    })
    staffTransactions.value = response.data || []
  } catch (err) {
    console.error('Error loading staff transactions:', err)
    staffTransactions.value = []
  }
}

// Refresh staff data (movements and transactions)
const refreshStaffData = async (staffId) => {
  await loadStaffMovements(staffId)
  await loadStaffTransactions(staffId)
}

// Close staff modal
const closeStaffModal = () => {
  showStaffModal.value = false
  selectedStaff.value = null
  staffMovements.value = []
  staffTransactions.value = []
}

// Top Up functions
const closeTopUpModal = () => {
  showTopUpModal.value = false
  topUpStaffId.value = ''
  topUpAmount.value = ''
  topUpReason.value = ''
}

const submitTopUp = async () => {
  if (!topUpStaffId.value || !topUpAmount.value) return

  isTopUpLoading.value = true

  try {
    const amountRappen = Math.round(parseFloat(topUpAmount.value) * 100)
    const staff = staffBalances.value.find(s => s.id === topUpStaffId.value)
    const currentBalance = staff ? staff.current_balance_rappen : 0
    const newBalance = currentBalance + amountRappen

    await $fetch('/api/admin/cash-management', {
      method: 'POST',
      body: {
        action: 'top_up_cash',
        instructor_id: topUpStaffId.value,
        amount_rappen: amountRappen,
        balance_before_rappen: currentBalance,
        balance_after_rappen: newBalance,
        notes: topUpReason.value || 'Kasse aufgestockt'
      }
    })

    closeTopUpModal()
    await loadStaffBalances()
    if (selectedStaff.value && selectedStaff.value.id === topUpStaffId.value) {
      await refreshStaffData(topUpStaffId.value)
    }
    showSuccessToast('Kasse erfolgreich aufgestockt!')
  } catch (err) {
    console.error('Error topping up cash:', err)
    showErrorToast('Fehler beim Aufstocken der Kasse', err.message)
  } finally {
    isTopUpLoading.value = false
  }
}

// Helper function to get current balance for a specific staff member (sync version for UI)
const getStaffCurrentBalance = (staffId) => {
  try {
    logger.debug('🔍 Getting balance for staff:', staffId)
    logger.debug('📊 Available staff balances:', staffBalances.value)
    
    // Find the staff member in staffBalances
    const staff = staffBalances.value.find(s => s.id === staffId)
    if (!staff) {
      logger.debug('❌ Staff not found in staffBalances')
      return 0
    }

    logger.debug('✅ Staff found:', staff)
    logger.debug('💰 Balance:', staff.current_balance_rappen / 100, 'CHF')
    
    // Return the calculated balance from loadStaffBalances
    return staff.current_balance_rappen || 0
  } catch (err) {
    console.error('Error getting staff current balance:', err)
    return 0
  }
}

// Withdraw functions
const closeWithdrawModal = () => {
  showWithdrawModal.value = false
  withdrawStaffId.value = ''
  withdrawAmount.value = ''
  withdrawReason.value = ''
}

const submitWithdraw = async () => {
  if (!withdrawStaffId.value || !withdrawAmount.value) return

  isWithdrawLoading.value = true

  try {
    const amountRappen = Math.round(parseFloat(withdrawAmount.value) * 100)
    const staff = staffBalances.value.find(s => s.id === withdrawStaffId.value)
    const currentBalance = staff ? staff.current_balance_rappen : 0
    const newBalance = currentBalance - amountRappen

    await $fetch('/api/admin/cash-management', {
      method: 'POST',
      body: {
        action: 'withdraw_cash',
        instructor_id: withdrawStaffId.value,
        amount_rappen: amountRappen,
        balance_before_rappen: currentBalance,
        balance_after_rappen: newBalance,
        notes: withdrawReason.value || 'Kasse abgestockt'
      }
    })

    closeWithdrawModal()
    await loadStaffBalances()
    if (selectedStaff.value && selectedStaff.value.id === withdrawStaffId.value) {
      await refreshStaffData(withdrawStaffId.value)
    }
    showSuccessToast('Kasse erfolgreich abgestockt!')
  } catch (err) {
    console.error('Error withdrawing cash:', err)
    showErrorToast('Fehler beim Abstocken der Kasse', err.message)
  } finally {
    isWithdrawLoading.value = false
  }
}

// Cash Handover
const openHandoverModal = (staff = null) => {
  handoverStaffId.value = staff ? staff.id : ''
  handoverAmount.value = ''
  handoverNotes.value = ''
  showHandoverModal.value = true
}

const closeHandoverModal = () => {
  showHandoverModal.value = false
  handoverStaffId.value = ''
  handoverAmount.value = ''
  handoverNotes.value = ''
}

const submitHandover = async () => {
  if (!handoverStaffId.value || !handoverAmount.value) return
  isHandoverLoading.value = true
  try {
    const amountRappen = Math.round(parseFloat(handoverAmount.value) * 100)
    await $fetch('/api/admin/cash-management', {
      method: 'POST',
      body: {
        action: 'staff_cash_handover',
        instructor_id: handoverStaffId.value,
        amount_rappen: amountRappen,
        notes: handoverNotes.value || null
      }
    })
    closeHandoverModal()
    await loadStaffBalances()
    if (selectedStaff.value && selectedStaff.value.id === handoverStaffId.value) {
      await refreshStaffData(handoverStaffId.value)
    }
    showSuccessToast('Kassenabgabe erfolgreich erfasst!')
  } catch (err) {
    console.error('Error recording cash handover:', err)
    showErrorToast('Fehler beim Erfassen der Kassenabgabe', err.message)
  } finally {
    isHandoverLoading.value = false
  }
}

// Transaction actions
const confirmTransaction = async (transaction) => {
  try {
    await $fetch('/api/admin/cash-management', {
      method: 'POST',
      body: { action: 'confirm_transaction', transaction_id: transaction.id, confirmation_amount: transaction.amount_rappen, confirmation_notes: '' }
    })
    const idx = staffTransactions.value.findIndex(t => t.id === transaction.id)
    if (idx !== -1) {
      staffTransactions.value[idx].status = 'confirmed'
      staffTransactions.value[idx].confirmed_at = new Date().toISOString()
    }
    staffTransactions.value = [...staffTransactions.value]
    showSuccessToast('Transaktion erfolgreich bestätigt!')
  } catch (err) {
    console.error('Error confirming transaction:', err)
    showErrorToast('Fehler beim Bestätigen der Transaktion', err.message)
  }
}

const disputeTransaction = async (transaction) => {
  try {
    await $fetch('/api/admin/cash-management', {
      method: 'POST',
      body: { action: 'dispute_transaction', transaction_id: transaction.id }
    })
    const idx = staffTransactions.value.findIndex(t => t.id === transaction.id)
    if (idx !== -1) staffTransactions.value[idx].status = 'disputed'
    staffTransactions.value = [...staffTransactions.value]
    showSuccessToast('Transaktion als strittig markiert!')
  } catch (err) {
    console.error('Error disputing transaction:', err)
    showErrorToast('Fehler beim Markieren der Transaktion', err.message)
  }
}

const editTransaction = (transaction) => {
  selectedTransaction.value = transaction
  editNotes.value = transaction.notes || ''
  showEditModal.value = true
}

const submitEdit = async () => {
  if (!selectedTransaction.value) return
  isEditing.value = true
  try {
    await $fetch('/api/admin/cash-management', {
      method: 'POST',
      body: { action: 'edit_transaction_notes', transaction_id: selectedTransaction.value.id, notes: editNotes.value }
    })
    const idx = staffTransactions.value.findIndex(t => t.id === selectedTransaction.value.id)
    if (idx !== -1) staffTransactions.value[idx].notes = editNotes.value
    staffTransactions.value = [...staffTransactions.value]
    closeEditModal()
    showSuccessToast('Notizen erfolgreich gespeichert!')
  } catch (err) {
    console.error('Error editing transaction:', err)
    showErrorToast('Fehler beim Speichern der Notizen', err.message)
  } finally {
    isEditing.value = false
  }
}

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
    'adjustment': 'bg-yellow-100 text-yellow-600',
    'cash_handover': 'bg-purple-100 text-purple-700'
  }
  return classes[type] || 'bg-gray-100 text-gray-600'
}

const getMovementTypeIcon = (type) => {
  const icons = {
    'deposit': '➕',
    'withdrawal': '➖',
    'cash_transaction': '💰',
    'adjustment': '⚖️',
    'cash_handover': '🏦'
  }
  return icons[type] || '❓'
}

const getMovementTypeText = (type) => {
  const texts = {
    'deposit': 'Kasse aufgestockt',
    'withdrawal': 'Kasse abgestockt',
    'cash_transaction': 'Bargeldtransaktion',
    'adjustment': 'Korrektur',
    'system_init': 'Kasse eröffnet',
    'cash_handover': 'Kassenabgabe an Fahrschule'
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

// Feed item functions
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
