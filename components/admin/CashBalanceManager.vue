<!-- components/admin/CashBalanceManager.vue -->
<template>
  <div class="bg-white rounded-lg shadow-sm border p-6">


    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
      <h2 class="text-xl sm:text-lg font-semibold text-gray-900">💰 Kassen</h2>
      <div class="flex space-x-2">
        <button
          class="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
          @click="showTopUpModal = true"
        >
          <span class="hidden sm:inline">Kasse aufstocken</span>
          <span class="sm:hidden">➕ Aufstocken</span>
        </button>
        <button
          class="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
          @click="showWithdrawModal = true"
        >
          <span class="hidden sm:inline">Kasse abstocken</span>
          <span class="sm:hidden">➖ Abstocken</span>
        </button>
      </div>
    </div>

    <!-- Staff Overview -->
    <div class="space-y-4">
      <div 
        v-for="staff in staffBalances" 
        :key="staff.id"
        class="border rounded-lg p-4 hover:shadow-sm transition-shadow"
      >
        <!-- Mobile: Stacked layout, Desktop: Side by side -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <!-- Staff Info -->
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span class="text-blue-600 font-medium text-sm">
                {{ staff.first_name?.charAt(0) }}{{ staff.last_name?.charAt(0) }}
              </span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-gray-900 text-base sm:text-sm">
                {{ staff.first_name }} {{ staff.last_name }}
              </div>
              <div class="text-sm text-gray-500 truncate">
                {{ staff.email }}
              </div>
            </div>
          </div>
          
          <!-- Balance Info -->
          <div class="text-left sm:text-right">
            <div class="text-xl sm:text-lg font-semibold text-green-600">
              {{ (getStaffCurrentBalance(staff.id) / 100).toFixed(2) }} CHF
            </div>
            <div class="text-sm text-gray-500 hidden sm:block">Aktueller Kassenstand</div>
          </div>
        </div>

        <!-- Action Button - Full width on mobile -->
        <div class="mt-4 sm:mt-4 sm:flex sm:justify-end">
          <button
            class="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            @click="viewStaffTransactions(staff)"
          >
            <span class="hidden sm:inline">Transaktionen</span>
            <span class="sm:hidden">📊 Transaktionen anzeigen</span>
          </button>
        </div>
      </div>

      <div v-if="staffBalances.length === 0" class="text-center py-8">
        <div class="text-4xl mb-4">👥</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Keine Mitarbeiter gefunden</h3>
        <p class="text-gray-600">Es sind noch keine Kassenstände für Mitarbeiter vorhanden.</p>
        <button
          class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          @click="loadStaffBalances"
        >
          Erneut laden
        </button>
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
    <div v-if="showStaffModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div class="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] flex flex-col">
        <!-- Header -->
        <div class="flex-shrink-0 p-4 sm:p-6 border-b">
          <div class="flex items-center justify-between">
            <h3 class="text-lg sm:text-xl font-semibold text-gray-900">
              Kassenübersicht: {{ selectedStaff?.first_name }} {{ selectedStaff?.last_name }}
            </h3>
            <button
              class="text-gray-400 hover:text-gray-600 p-1"
              @click="closeStaffModal"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="mt-2 text-sm text-gray-500">
            Aktueller Kassenstand: <span class="font-medium text-green-600">{{ (calculatedCurrentBalance / 100).toFixed(2) }} CHF</span>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4 sm:p-6">
          <div class="space-y-4 sm:space-y-6">
            <!-- Balance Summary -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="font-medium text-gray-900 mb-3">Kassenübersicht</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm">
                <div class="bg-white p-3 rounded border">
                  <div class="text-gray-600 text-xs uppercase tracking-wide">Aufstockungen</div>
                  <div class="text-lg font-semibold text-green-600">
                    +{{ (totalDeposits / 100).toFixed(2) }} CHF
                  </div>
                </div>
                <div class="bg-white p-3 rounded border">
                  <div class="text-gray-600 text-xs uppercase tracking-wide">Abstockungen</div>
                  <div class="text-lg font-semibold text-red-600">
                    -{{ (totalWithdrawals / 100).toFixed(2) }} CHF
                  </div>
                </div>
                <div class="bg-white p-3 rounded border">
                  <div class="text-gray-600 text-xs uppercase tracking-wide">Pending Transaktionen</div>
                  <div class="text-lg font-semibold text-blue-600">
                    +{{ (totalPendingTransactions / 100).toFixed(2) }} CHF
                  </div>
                </div>
              </div>
              
              <!-- Calculation Breakdown -->
              <div class="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                <div class="text-xs text-blue-800 uppercase tracking-wide font-medium mb-2">Berechnung:</div>
                <div class="text-sm text-blue-700 space-y-1">
                  <div>+ Aufstockungen: {{ (totalDeposits / 100).toFixed(2) }} CHF</div>
                  <div>- Abstockungen: {{ (totalWithdrawals / 100).toFixed(2) }} CHF</div>
                  <div>+ Pending Transaktionen: {{ (totalPendingTransactions / 100).toFixed(2) }} CHF</div>
                  <div class="border-t border-blue-300 pt-1 mt-2 font-medium">
                    = Kassenstand: {{ (calculatedCurrentBalance / 100).toFixed(2) }} CHF
                  </div>
                </div>
              </div>
            </div>

            <!-- All Movements and Transactions -->
            <div class="space-y-3 sm:space-y-4">
              <div 
                v-for="item in staffFeedItems" 
                :key="item.id"
                class="border rounded-lg p-3 sm:p-4 hover:shadow-sm transition-shadow"
                :class="getItemBackgroundClass(item)"
              >
                <!-- Mobile: Stacked, Desktop: Side by side -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <!-- Item Info -->
                  <div class="flex items-start space-x-3">
                    <div
class="w-10 h-10 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                         :class="getItemStatusClass(item)">
                      {{ getItemStatusIcon(item) }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-gray-900 text-base sm:text-sm">
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
                  
                  <!-- Amount Info -->
                  <div class="text-left sm:text-right">
                    <div
class="text-xl sm:text-lg font-semibold"
                         :class="getItemAmountClass(item)">
                      {{ getItemAmountText(item) }}
                    </div>
                    <div class="text-sm text-gray-500">
                      {{ getItemSubtitle(item) }}
                    </div>
                  </div>
                </div>
                
                <!-- Notes -->
                <div v-if="item.data.notes" class="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {{ item.data.notes }}
                </div>

                <!-- Action Buttons for Pending Transactions -->
                <div v-if="item.type === 'transaction' && item.data.status === 'pending'" class="mt-3">
                  <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      class="w-full sm:w-auto px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                      @click="confirmTransaction(item.data)"
                    >
                      <span class="hidden sm:inline">✅ Bestätigen</span>
                      <span class="sm:hidden">✅ Bestätigen</span>
                    </button>
                    <button
                      class="w-full sm:w-auto px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                      @click="disputeTransaction(item.data)"
                    >
                      <span class="hidden sm:inline">❌ Bestreiten</span>
                      <span class="sm:hidden">❌ Bestreiten</span>
                    </button>
                    <button
                      class="w-full sm:w-auto px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                      @click="editTransaction(item.data)"
                    >
                      <span class="hidden sm:inline">✏️ Notizen bearbeiten</span>
                      <span class="sm:hidden">✏️ Notizen</span>
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="staffFeedItems.length === 0" class="text-center py-8">
                <div class="text-4xl mb-4">📊</div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Keine Einträge gefunden</h3>
                <p class="text-gray-600">Keine Kassenbewegungen oder Transaktionen vorhanden.</p>
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
import { formatDateTime } from '~/utils/dateUtils'
import Toast from '~/components/Toast.vue'

// Supabase
const supabase = getSupabase()

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
    .filter(m => m.movement_type === 'withdrawal')
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
    // Get current user's tenant_id first
    const { data: currentUserData } = await supabase.auth.getUser()
    if (!currentUserData?.user) throw new Error('Not authenticated')
    
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', currentUserData.user.id)
      .single()
    
    if (profileError || !userProfile?.tenant_id) {
      throw new Error('User has no tenant assigned')
    }
    
    logger.debug('🔍 Loading staff balances for tenant:', userProfile.tenant_id)
    
    // Get only staff users (exclude admins) - FILTERED BY TENANT
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'staff')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('first_name')

    if (usersError) throw usersError
    
    logger.debug('👥 Found users:', users?.map(u => ({ name: `${u.first_name} ${u.last_name}`, role: u.role, id: u.id })))

    // Load existing balances from cash_balances - FILTERED BY TENANT
    const { data: balancesRows, error: balancesError } = await supabase
      .from('cash_balances')
      .select('*')
      .eq('tenant_id', userProfile.tenant_id)

    if (balancesError) throw balancesError
    
    logger.debug('💰 Found cash_balances rows:', balancesRows)

    const instructorIdToBalance = new Map((balancesRows || []).map(row => [row.instructor_id, row]))

    // Get all movements and transactions for all staff - FILTERED BY TENANT
    const { data: movements, error: movementsError } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('tenant_id', userProfile.tenant_id)

    if (movementsError) throw movementsError
    
    logger.debug('📊 Found cash_movements:', movements)

    const { data: transactions, error: transactionsError } = await supabase
      .from('cash_transactions')
      .select('*')
      .eq('tenant_id', userProfile.tenant_id)

    if (transactionsError) throw transactionsError
    
    logger.debug('💳 Found cash_transactions:', transactions)

    // Calculate balance for each staff member
    staffBalances.value = users.map(user => {
      // Start with persisted balance if available
      const persisted = instructorIdToBalance.get(user.id)
      let balance = persisted ? (persisted.current_balance_rappen || 0) : 0

      // If no persisted balance, compute from movements + pending transactions
      if (!persisted) {
        movements?.forEach(movement => {
          if (movement.instructor_id === user.id) {
            if (movement.movement_type === 'deposit') {
              balance += movement.amount_rappen
            } else if (movement.movement_type === 'withdrawal') {
              balance -= movement.amount_rappen
            }
          }
        })

        transactions?.forEach(transaction => {
          if (transaction.instructor_id === user.id && transaction.status === 'pending') {
            balance += transaction.amount_rappen
          }
        })
      }

      return {
        ...user,
        current_balance_rappen: balance,
        last_updated: persisted?.last_updated || null,
        notes: persisted?.notes || null
      }
    })

    logger.debug('💰 Staff balances (with persisted where available):', staffBalances.value.map(s => ({
      name: `${s.first_name} ${s.last_name}`,
      balance: s.current_balance_rappen / 100
    })))

  } catch (err) {
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
    const { data, error } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('instructor_id', staffId)
      .order('created_at', { ascending: false })

    if (error) throw error
    staffMovements.value = data || []

  } catch (err) {
    console.error('Error loading staff movements:', err)
    staffMovements.value = []
  }
}

// Load staff transactions
const loadStaffTransactions = async (staffId) => {
  try {
    logger.debug('🔍 Loading transactions for staff:', staffId)
    
    const { data, error } = await supabase
      .from('cash_transactions')
      .select(`
        *,
        student:student_id(id, first_name, last_name)
      `)
      .eq('instructor_id', staffId)
      .order('created_at', { ascending: false })

    if (error) throw error

    staffTransactions.value = (data || []).map(transaction => ({
      ...transaction,
      student_name: transaction.student ? `${transaction.student.first_name} ${transaction.student.last_name}` : 'Unbekannt'
    }))

    logger.debug('✅ Transactions loaded:', {
      total: staffTransactions.value.length,
      pending: staffTransactions.value.filter(t => t.status === 'pending').length,
      confirmed: staffTransactions.value.filter(t => t.status === 'confirmed').length,
      disputed: staffTransactions.value.filter(t => t.status === 'disputed').length,
      transactions: staffTransactions.value
    })

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
    
    // Get current balance from staffBalances (already calculated)
    const staff = staffBalances.value.find(s => s.id === topUpStaffId.value)
    const currentBalance = staff ? staff.current_balance_rappen : 0
    
    logger.debug('💰 Topping up cash:', {
      staffId: topUpStaffId.value,
      amount: topUpAmount.value,
      currentBalance: currentBalance / 100,
      amountRappen
    })
    
    // Calculate new balance after top-up
    const newBalance = currentBalance + amountRappen
    
    // Get current admin user ID
    const { data: { user } } = await supabase.auth.getUser()
    
    // Insert movement
    const { error: movementError } = await supabase
      .from('cash_movements')
      .insert({
        instructor_id: topUpStaffId.value,
        movement_type: 'deposit',
        amount_rappen: amountRappen,
        balance_before_rappen: currentBalance,
        balance_after_rappen: newBalance,
        performed_by: user?.id,
        notes: topUpReason.value || 'Kasse aufgestockt'
      })

    if (movementError) throw movementError

    closeTopUpModal()
    await loadStaffBalances()
    
    // Refresh staff data if modal is open
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

// Helper function to calculate current balance for a specific staff member (async version for database calls)
const calculateCurrentBalance = async (staffId) => {
  try {
    // Get movements for this staff member
    const { data: movements, error: movementsError } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('instructor_id', staffId)
      .order('created_at', { ascending: true })

    if (movementsError) throw movementsError

    // Get transactions for this staff member
    const { data: transactions, error: transactionsError } = await supabase
      .from('cash_transactions')
      .select('*')
      .eq('instructor_id', staffId)

    if (transactionsError) throw transactionsError

    let balance = 0

    // Calculate from movements
    movements?.forEach(movement => {
      if (movement.movement_type === 'deposit') {
        balance += movement.amount_rappen
      } else if (movement.movement_type === 'withdrawal') {
        balance -= movement.amount_rappen
      }
    })

    // Calculate from transactions (only pending ones, confirmed ones are removed from DB)
    transactions?.forEach(transaction => {
      if (transaction.status === 'pending') {
        balance += transaction.amount_rappen
      }
    })

    return balance
  } catch (err) {
    console.error('Error calculating current balance:', err)
    return 0
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
    
    // Get current balance from staffBalances (already calculated)
    const staff = staffBalances.value.find(s => s.id === withdrawStaffId.value)
    const currentBalance = staff ? staff.current_balance_rappen : 0
    
    logger.debug('💰 Withdrawing cash:', {
      staffId: withdrawStaffId.value,
      amount: withdrawAmount.value,
      currentBalance: currentBalance / 100,
      amountRappen
    })
    
    // Calculate new balance after withdrawal
    const newBalance = currentBalance - amountRappen
    
    // Get current admin user ID
    const { data: { user } } = await supabase.auth.getUser()
    
    // Insert movement
    const { error: movementError } = await supabase
      .from('cash_movements')
      .insert({
        instructor_id: withdrawStaffId.value,
        movement_type: 'withdrawal',
        amount_rappen: amountRappen,
        balance_before_rappen: currentBalance,
        balance_after_rappen: newBalance,
        performed_by: user?.id,
        notes: withdrawReason.value || 'Kasse abgestockt'
      })

    if (movementError) throw movementError

    closeWithdrawModal()
    await loadStaffBalances()
    
    // Refresh staff data if modal is open
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

// Transaction actions
const confirmTransaction = async (transaction) => {
  try {
    const { error } = await supabase
      .from('cash_transactions')
      .update({
        status: 'confirmed',
        confirmed_by: (await supabase.auth.getUser()).data.user?.id,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', transaction.id)

    if (error) throw error

    // Update local data
    const transactionIndex = staffTransactions.value.findIndex(t => t.id === transaction.id)
    if (transactionIndex !== -1) {
      staffTransactions.value[transactionIndex].status = 'confirmed'
      staffTransactions.value[transactionIndex].confirmed_by = supabase.auth.user()?.id
      staffTransactions.value[transactionIndex].confirmed_at = new Date().toISOString()
    }

    // Force reactivity
    staffTransactions.value = [...staffTransactions.value]

    showSuccessToast('Transaktion erfolgreich bestätigt!')

  } catch (err) {
    console.error('Error confirming transaction:', err)
    showErrorToast('Fehler beim Bestätigen der Transaktion', err.message)
  }
}

const disputeTransaction = async (transaction) => {
  try {
    const { error } = await supabase
      .from('cash_transactions')
      .update({
        status: 'disputed'
      })
      .eq('id', transaction.id)

    if (error) throw error

    // Update local data
    const transactionIndex = staffTransactions.value.findIndex(t => t.id === transaction.id)
    if (transactionIndex !== -1) {
      staffTransactions.value[transactionIndex].status = 'disputed'
    }

    // Force reactivity
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
    const { error } = await supabase
      .from('cash_transactions')
      .update({ 
        notes: editNotes.value
      })
      .eq('id', selectedTransaction.value.id)

    if (error) throw error

    // Update local data
    const transactionIndex = staffTransactions.value.findIndex(t => t.id === selectedTransaction.value.id)
    if (transactionIndex !== -1) {
      staffTransactions.value[transactionIndex].notes = editNotes.value
    }

    // Force reactivity
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
