<template>
  <div class="bg-white rounded-lg shadow-sm border">
    <!-- Header -->
    <div class="px-4 sm:px-6 py-4 sm:py-6 border-b border-gray-200">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h2 class="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">Bargeldkontrolle</h2>
          <p class="text-sm text-gray-600 mt-1">
            {{ isAdmin ? 'Alle Bargeldtransaktionen' : 'Meine Bargeldeinnahmen' }}
          </p>
        </div>
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <!-- Status Filter -->
          <select 
            v-model="statusFilter" 
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            <option value="all">Alle Status</option>
            <option value="pending">Ausstehend</option>
            <option value="confirmed">Bestätigt</option>
            <option value="disputed">Strittig</option>
          </select>
          
          <!-- Refresh Button -->
          <button 
            :disabled="isLoading || !currentUser?.id"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
            @click="loadCashTransactions"
          >
            <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span v-else class="flex items-center">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Aktualisieren
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-4 sm:p-6">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-col sm:flex-row items-center justify-center py-8 sm:py-12 text-center">
        <div class="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mb-3 sm:mb-0 sm:mr-3"/>
        <span class="text-gray-600 text-sm sm:text-base">Lade Bargeldtransaktionen...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-red-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="text-red-800 text-sm sm:text-base">{{ error }}</p>
        </div>
        <button 
          :disabled="!currentUser?.id" 
          class="mt-3 text-red-600 hover:text-red-800 underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          @click="loadCashTransactions"
        >
          Erneut versuchen
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredTransactions.length === 0" class="text-center py-8 sm:py-12">
        <div class="text-3xl sm:text-4xl mb-3 sm:mb-4">💰</div>
        <h3 class="text-base sm:text-lg font-medium text-gray-900 mb-2">
          {{ statusFilter === 'all' ? 'Keine Bargeldtransaktionen' : `Keine ${getStatusText(statusFilter)} Transaktionen` }}
        </h3>
        <p class="text-gray-600 text-sm sm:text-base">
          {{ statusFilter === 'all' ? 'Es wurden noch keine Bargeldtransaktionen erfasst.' : `Es gibt keine ${getStatusText(statusFilter)} Transaktionen.` }}
        </p>
      </div>

      <!-- Transactions List -->
      <div v-else class="space-y-3 sm:space-y-4">
        <div
          v-for="transaction in filteredTransactions"
          :key="transaction.id"
          :class="[
            'border rounded-lg p-3 sm:p-4 transition-all',
            getTransactionStatusClass(transaction.status)
          ]"
        >
          <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <!-- Transaction Info -->
            <div class="flex-1">
              <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                <!-- Status Badge -->
                <span
:class="[
                  'px-2 py-1 text-xs font-medium rounded-full w-fit',
                  getStatusBadgeClass(transaction.status)
                ]">
                  {{ getStatusText(transaction.status) }}
                </span>
                
                <!-- Amount -->
                <span class="text-lg sm:text-xl font-semibold text-gray-900">
                  CHF {{ (transaction.amount_rappen / 100).toFixed(2) }}
                </span>
              </div>

              <!-- Student & Appointment Info -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3">
                <div>
                  <p class="text-xs sm:text-sm font-medium text-gray-900">Schüler</p>
                  <p class="text-sm text-gray-600">{{ transaction.student_name }}</p>
                </div>
                <div>
                  <p class="text-xs sm:text-sm font-medium text-gray-900">Termin</p>
                  <p class="text-sm text-gray-600">{{ formatDateTime(transaction.appointment_start_time) }}</p>
                </div>
                <div>
                  <p class="text-xs sm:text-sm font-medium text-gray-900">Fahrlehrer</p>
                  <p class="text-sm text-gray-600">{{ transaction.instructor_name }}</p>
                </div>
                <div>
                  <p class="text-xs sm:text-sm font-medium text-gray-900">Eingezogen am</p>
                  <p class="text-sm text-gray-600">{{ formatDate(transaction.collected_at) }}</p>
                </div>
              </div>

              <!-- Notes -->
              <div v-if="transaction.notes" class="mb-3">
                <p class="text-sm font-medium text-gray-900 mb-1">Notizen</p>
                <p class="text-sm text-gray-600">{{ transaction.notes }}</p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto">
              <!-- Confirm Button (Admin only) -->
              <button
                v-if="isAdmin && transaction.status === 'pending'"
                :disabled="isConfirming"
                class="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors duration-200 flex items-center justify-center"
                @click="confirmTransaction(transaction)"
              >
                <span v-if="isConfirming">Bestätige...</span>
                <span v-else class="flex items-center">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  Bestätigen
                </span>
              </button>

              <!-- Dispute Button (Admin only) -->
              <button
                v-if="isAdmin && transaction.status === 'pending'"
                :disabled="isDisputing"
                class="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors duration-200 flex items-center justify-center"
                @click="disputeTransaction(transaction)"
              >
                <span v-if="isDisputing">Strittig...</span>
                <span v-else class="flex items-center">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  Strittig
                </span>
              </button>

              <!-- Edit Button (Instructor only) -->
              <button
                v-if="!isAdmin && currentUser?.id && transaction.instructor_id === currentUser.id && transaction.status === 'pending'"
                class="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm transition-colors duration-200 flex items-center justify-center"
                @click="editTransaction(transaction)"
              >
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                  Notizen bearbeiten
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmationModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Bargeld bestätigen</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Bestätigter Betrag (CHF)</label>
            <input
              v-model="confirmationAmount"
              type="number"
              step="0.01"
              min="0"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Notizen (optional)</label>
            <textarea
              v-model="confirmationNotes"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Zusätzliche Informationen..."
            />
          </div>
        </div>

        <div class="flex space-x-3 mt-6">
          <button
            class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            @click="closeConfirmationModal"
          >
            Abbrechen
          </button>
          <button
            :disabled="!confirmationAmount || isConfirming"
            class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="submitConfirmation"
          >
            <span v-if="isConfirming">Bestätige...</span>
            <span v-else>Bestätigen</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Transaction Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Bargeldtransaktion bearbeiten</h3>
        
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
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, watch } from 'vue'
import { formatDate, formatDateTime } from '~/utils/dateUtils'

// Props
interface Props {
  currentUser: any
  isAdmin?: boolean
  staffFilterId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  isAdmin: false,
  staffFilterId: null
})

// Supabase

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const cashTransactions = ref<any[]>([])
const statusFilter = ref('all')

// Modal State
const showConfirmationModal = ref(false)
const showEditModal = ref(false)
const selectedTransaction = ref<any>(null)
const confirmationAmount = ref('')
const confirmationNotes = ref('')
const editAmount = ref('')
const editNotes = ref('')

// Loading States
const isConfirming = ref(false)
const isDisputing = ref(false)
const isEditing = ref(false)

// Computed
const filteredTransactions = computed(() => {
  if (statusFilter.value === 'all') {
    return cashTransactions.value
  }
  return cashTransactions.value.filter(t => t.status === statusFilter.value)
})

// Methods
const loadCashTransactions = async () => {
  // Prüfe ob der Benutzer geladen ist
  if (!props.currentUser?.id) {
    console.warn('Current user not loaded yet, skipping loadCashTransactions')
    return
  }

  logger.debug('🔍 Loading cash transactions...', {
    currentUser: props.currentUser,
    isAdmin: props.isAdmin,
    userId: props.currentUser.id
  })

  isLoading.value = true
  error.value = null

  try {
    // Get current user's tenant_id first
    const currentUserData = authStore.user // ✅ MIGRATED
    if (!currentUserData?.user) throw new Error('Not authenticated')
    
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', currentUserData.user.id)
      .single()
    
    if (profileError || !userProfile?.tenant_id) {
      throw new Error('User has no tenant assigned')
    }
    
    logger.debug('🔍 Loading cash transactions for tenant:', userProfile.tenant_id)
    
    // Lade zuerst die cash_transactions - FILTERED BY TENANT
    let query = supabase
      .from('cash_transactions')
      .select('*')
      .eq('tenant_id', userProfile.tenant_id)
      .order('created_at', { ascending: false })

    // Filter by instructor if not admin OR if staff filter is applied
    if (!props.isAdmin && props.currentUser?.id) {
      query = query.eq('instructor_id', props.currentUser.id)
      logger.debug('🔍 Filtering by instructor_id:', props.currentUser.id)
    } else if (props.isAdmin && props.staffFilterId) {
      query = query.eq('instructor_id', props.staffFilterId)
      logger.debug('🔍 Admin filtering by specific staff_id:', props.staffFilterId)
    } else {
      logger.debug('🔍 Loading all transactions (admin mode)')
    }

    logger.debug('🔍 Query:', query)

    const { data: transactions, error: queryError } = await query

    if (queryError) throw queryError

    logger.debug('🔍 Query result:', {
      transactions: transactions,
      count: transactions?.length || 0,
      error: queryError
    })

    if (!transactions || transactions.length === 0) {
      logger.debug('🔍 No transactions found, setting empty array')
      cashTransactions.value = []
      return
    }

    // Sammle alle benötigten IDs
    const userIds = new Set<string>()
    const appointmentIds = new Set<string>()
    
    transactions.forEach(t => {
      userIds.add(t.instructor_id)
      userIds.add(t.student_id)
      if (t.confirmed_by) userIds.add(t.confirmed_by)
      if (t.appointment_id) appointmentIds.add(t.appointment_id)
    })

    // Lade alle benötigten Benutzerdaten - FILTERED BY TENANT
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', Array.from(userIds))
      .eq('tenant_id', userProfile.tenant_id)

    if (usersError) throw usersError

    // Lade alle benötigten Appointment-Daten - FILTERED BY TENANT
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, start_time')
      .in('id', Array.from(appointmentIds))
      .eq('tenant_id', userProfile.tenant_id)

    if (appointmentsError) throw appointmentsError

    // Erstelle Lookup-Maps
    const usersMap = new Map(users?.map(u => [u.id, u]) || [])
    const appointmentsMap = new Map(appointments?.map(a => [a.id, a]) || [])

    // Transform data for easier use
    cashTransactions.value = transactions.map(transaction => {
      const instructor = usersMap.get(transaction.instructor_id)
      const student = usersMap.get(transaction.student_id)
      const confirmedBy = transaction.confirmed_by ? usersMap.get(transaction.confirmed_by) : null
      const appointment = appointmentsMap.get(transaction.appointment_id)

      return {
        ...transaction,
        instructor_name: instructor ? `${instructor.first_name} ${instructor.last_name}` : 'Unbekannt',
        student_name: student ? `${student.first_name} ${student.last_name}` : 'Unbekannt',
        appointment_start_time: appointment?.start_time || null,
        confirmed_by_name: confirmedBy ? 
          `${confirmedBy.first_name} ${confirmedBy.last_name}` : null
      }
    })

  } catch (err: any) {
    console.error('Error loading cash transactions:', err)
    error.value = err.message || 'Fehler beim Laden der Bargeldtransaktionen'
  } finally {
    isLoading.value = false
  }
}

const confirmTransaction = (transaction: any) => {
  selectedTransaction.value = transaction
  confirmationAmount.value = (transaction.amount_rappen / 100).toFixed(2)
  confirmationNotes.value = ''
  showConfirmationModal.value = true
}

const disputeTransaction = async (transaction: any) => {
  if (!confirm('Möchten Sie diese Transaktion als strittig markieren?')) return

  isDisputing.value = true

  try {
    const { error: updateError } = await supabase
      .from('cash_transactions')
      .update({ 
        status: 'disputed'
      })
      .eq('id', transaction.id)

    if (updateError) throw updateError

    // Update local transaction data immediately
    const transactionIndex = cashTransactions.value.findIndex(t => t.id === transaction.id)
    if (transactionIndex !== -1) {
      cashTransactions.value[transactionIndex].status = 'disputed'
    }

    // Also refresh from database to ensure consistency
    await loadCashTransactions()

  } catch (err: any) {
    console.error('Error disputing transaction:', err)
    alert('Fehler beim Markieren als strittig')
  } finally {
    isDisputing.value = false
  }
}

const editTransaction = (transaction: any) => {
  selectedTransaction.value = transaction
  editNotes.value = transaction.notes || ''
  showEditModal.value = true
}

const submitConfirmation = async () => {
  if (!selectedTransaction.value || !confirmationAmount.value) return

  isConfirming.value = true

  try {
    const amountRappen = Math.round(parseFloat(confirmationAmount.value) * 100)

    // Update transaction
    const { error: updateError } = await supabase
      .from('cash_transactions')
      .update({ 
        status: 'confirmed',
        confirmed_by: props.currentUser?.id,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', selectedTransaction.value.id)

    if (updateError) throw updateError

    // Update local transaction data immediately
    const transactionIndex = cashTransactions.value.findIndex(t => t.id === selectedTransaction.value.id)
    if (transactionIndex !== -1) {
      cashTransactions.value[transactionIndex].status = 'confirmed'
      cashTransactions.value[transactionIndex].confirmed_by = props.currentUser?.id
      cashTransactions.value[transactionIndex].confirmed_at = new Date().toISOString()
    }

    // Create confirmation record
    const { error: confirmationError } = await supabase
      .from('cash_confirmations')
      .insert({
        transaction_id: selectedTransaction.value.id,
        confirmed_by: props.currentUser?.id,
        amount_confirmed: amountRappen,
        notes: confirmationNotes.value
      })

    if (confirmationError) throw confirmationError

    // Also refresh from database to ensure consistency
    await loadCashTransactions()
    closeConfirmationModal()

  } catch (err: any) {
    console.error('Error confirming transaction:', err)
    alert('Fehler beim Bestätigen der Transaktion')
  } finally {
    isConfirming.value = false
  }
}

const submitEdit = async () => {
  if (!selectedTransaction.value) return

  isEditing.value = true

  try {
    logger.debug('🔧 Submitting edit for transaction:', selectedTransaction.value.id)
    logger.debug('🔧 New notes:', editNotes.value)

    const { error: updateError } = await supabase
      .from('cash_transactions')
      .update({ 
        notes: editNotes.value
      })
      .eq('id', selectedTransaction.value.id)

    if (updateError) throw updateError

    logger.debug('✅ Database update successful')

    // Update local transaction data immediately
    const transactionIndex = cashTransactions.value.findIndex(t => t.id === selectedTransaction.value.id)
    logger.debug('🔍 Found transaction at index:', transactionIndex)
    
    if (transactionIndex !== -1) {
      logger.debug('🔧 Updating local transaction notes from:', cashTransactions.value[transactionIndex].notes, 'to:', editNotes.value)
      cashTransactions.value[transactionIndex].notes = editNotes.value
      logger.debug('✅ Local update successful, new notes:', cashTransactions.value[transactionIndex].notes)
    } else {
      console.warn('⚠️ Transaction not found in local array')
    }

    // Force reactivity by creating a new array
    cashTransactions.value = [...cashTransactions.value]

    // Also refresh from database to ensure consistency
    await loadCashTransactions()
    closeEditModal()

  } catch (err: any) {
    console.error('Error editing transaction:', err)
    alert('Fehler beim Bearbeiten der Transaktion')
  } finally {
    isEditing.value = false
  }
}

const closeConfirmationModal = () => {
  showConfirmationModal.value = false
  selectedTransaction.value = null
  confirmationAmount.value = ''
  confirmationNotes.value = ''
}

const closeEditModal = () => {
  showEditModal.value = false
  selectedTransaction.value = null
  editAmount.value = ''
  editNotes.value = ''
}

// Utility functions
const getTransactionStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    'pending': 'bg-yellow-50 border-yellow-200',
    'confirmed': 'bg-green-50 border-green-200',
    'disputed': 'bg-red-50 border-red-200'
  }
  return classes[status] || 'bg-white border-gray-200'
}

const getStatusBadgeClass = (status: string) => {
  const classes: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'confirmed': 'bg-green-100 text-green-800',
    'disputed': 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    'pending': 'Ausstehend',
    'confirmed': 'Bestätigt',
    'disputed': 'Strittig'
  }
  return texts[status] || status
}

// Watcher für currentUser
watch(() => props.currentUser, (newUser: any) => {
  logger.debug('🔍 Watcher triggered:', { newUser, hasId: newUser?.id })
  if (newUser?.id) {
    logger.debug('✅ User loaded, loading cash transactions...')
    loadCashTransactions()
  } else {
    logger.debug('⚠️ User not loaded yet or no ID')
  }
}, { immediate: true })

// Watcher für staffFilterId
watch(() => props.staffFilterId, (newFilterId) => {
  logger.debug('🔍 Staff filter changed:', newFilterId)
  if (props.currentUser?.id) {
    loadCashTransactions()
  }
})

// Lifecycle
onMounted(() => {
  logger.debug('🔍 Component mounted, currentUser:', props.currentUser)
  // loadCashTransactions() wird jetzt vom Watcher aufgerufen
})
</script>
