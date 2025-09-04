<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="px-4 py-6 sm:px-0">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Schüler-Guthaben</h1>
          <p class="mt-2 text-sm text-gray-600">
            Verwalten Sie das Guthaben aller Schüler für Vorauszahlungen
          </p>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Aktive Schüler</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ statistics.activeStudents }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Gesamt-Guthaben</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ formatCreditAmount(statistics.totalBalance) }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Durchschnitt</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ formatCreditAmount(statistics.averageBalance) }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">Alle Schüler</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ statistics.totalCredits }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters and Search -->
      <div class="bg-white shadow rounded-lg mb-6">
        <div class="px-4 py-5 sm:p-6">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Suche</label>
              <input
                v-model="searchQuery"
                type="text"
                class="p-2 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Name oder E-Mail..."
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Guthaben-Status</label>
              <select
                v-model="balanceFilter"
                class="p-2 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle</option>
                <option value="with_credit">Mit Guthaben</option>
                <option value="without_credit">Ohne Guthaben</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Sortierung</label>
              <select
                v-model="sortBy"
                class="p-2 block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="name">Name</option>
                <option value="balance">Guthaben (hoch)</option>
                <option value="balance_low">Guthaben (niedrig)</option>
                <option value="last_activity">Letzte Aktivität</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Students Table -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <div v-if="isLoading" class="text-center py-8">
            <svg class="animate-spin h-8 w-8 text-gray-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="mt-2 text-sm text-gray-500">Lade Schüler...</p>
          </div>

          <div v-else-if="filteredStudents.length === 0" class="text-center py-8">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Keine Schüler gefunden</h3>
            <p class="mt-1 text-sm text-gray-500">
              {{ searchQuery ? 'Versuchen Sie einen anderen Suchbegriff.' : 'Es wurden noch keine Schüler angelegt.' }}
            </p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schüler
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guthaben
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Letzte Aktivität
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr 
                  v-for="student in filteredStudents" 
                  :key="student.id" 
                  class="hover:bg-gray-50 cursor-pointer transition-colors"
                  @click="openStudentCreditManager(student)"
                >
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span class="text-sm font-medium text-gray-700">
                            {{ student.first_name?.charAt(0) }}{{ student.last_name?.charAt(0) }}
                          </span>
                        </div>
                      </div>
                      <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">
                          {{ student.first_name }} {{ student.last_name }}
                        </div>
                        <div class="text-sm text-gray-500">{{ student.email }}</div>
                      </div>
                    </div>
                  </td>
                  
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900 font-medium">
                      {{ formatCreditAmount(student.credit?.balance_rappen || 0) }}
                    </div>
                    <div v-if="student.credit?.balance_rappen > 0" class="text-xs text-green-600">
                      Aktiv
                    </div>
                  </td>
                  
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(student.credit?.updated_at || student.created_at) }}
                  </td>
                  
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      :class="[
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        student.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      ]"
                    >
                      {{ student.is_active ? 'Aktiv' : 'Inaktiv' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Student Credit Manager Modal -->
    <div v-if="showCreditManagerModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
        
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">
                Guthaben verwalten: {{ selectedStudent?.first_name }} {{ selectedStudent?.last_name }}
              </h3>
              <button
                @click="showCreditManagerModal = false"
                class="text-gray-400 hover:text-gray-600"
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <StudentCreditManager
              v-if="selectedStudent"
              :student="selectedStudent"
              @credit-updated="handleCreditUpdated"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Transactions History Modal -->
    <div v-if="showTransactionsModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
        
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">
                Transaktions-Historie: {{ selectedStudent?.first_name }} {{ selectedStudent?.last_name }}
              </h3>
              <button
                @click="showTransactionsModal = false"
                class="text-gray-400 hover:text-gray-600"
              >
                <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div v-if="selectedStudent" class="space-y-4">
              <div class="bg-gray-50 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <span class="text-sm font-medium text-gray-700">Aktuelles Guthaben:</span>
                    <span class="ml-2 text-lg font-bold text-green-600">
                      {{ formatCreditAmount(selectedStudent.credit?.balance_rappen || 0) }}
                    </span>
                  </div>
                  <button
                    @click="loadStudentTransactions(selectedStudent.id)"
                    :disabled="isLoadingTransactions"
                    class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <svg class="-ml-0.5 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Aktualisieren
                  </button>
                </div>
              </div>
              
              <div v-if="isLoadingTransactions" class="text-center py-8">
                <svg class="animate-spin h-8 w-8 text-gray-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p class="mt-2 text-sm text-gray-500">Lade Transaktionen...</p>
              </div>
              
              <div v-else-if="studentTransactions.length === 0" class="text-center py-8">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">Keine Transaktionen</h3>
                <p class="mt-1 text-sm text-gray-500">
                  Es wurden noch keine Guthaben-Transaktionen getätigt.
                </p>
              </div>
              
              <div v-else class="space-y-3 max-h-96 overflow-y-auto">
                <div
                  v-for="transaction in studentTransactions"
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { definePageMeta } from '#imports'
import { useStudentCredits } from '~/composables/useStudentCredits'
import { getSupabase } from '~/utils/supabase'
import StudentCreditManager from '~/components/StudentCreditManager.vue'
import type { StudentCredit, CreditTransactionWithDetails } from '~/types/studentCredits'

definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

// Composables
const {
  isLoading,
  error,
  getCreditStatistics,
  getCreditTransactions,
  formatCreditAmount
} = useStudentCredits()

// State
const students = ref<any[]>([])
const statistics = ref({
  totalCredits: 0,
  totalBalance: 0,
  activeStudents: 0,
  averageBalance: 0
})

const searchQuery = ref('')
const balanceFilter = ref('')
const sortBy = ref('name')

const showCreditManagerModal = ref(false)
const showTransactionsModal = ref(false)
const selectedStudent = ref<any>(null)
const studentTransactions = ref<CreditTransactionWithDetails[]>([])
const isLoadingTransactions = ref(false)

// Computed
const filteredStudents = computed(() => {
  let filtered = students.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(student => 
      student.first_name?.toLowerCase().includes(query) ||
      student.last_name?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query)
    )
  }

  // Balance filter
  if (balanceFilter.value === 'with_credit') {
    filtered = filtered.filter(student => (student.credit?.balance_rappen || 0) > 0)
  } else if (balanceFilter.value === 'without_credit') {
    filtered = filtered.filter(student => !student.credit?.balance_rappen || student.credit.balance_rappen === 0)
  }

  // Sort
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
      case 'balance':
        return (b.credit?.balance_rappen || 0) - (a.credit?.balance_rappen || 0)
      case 'balance_low':
        return (a.credit?.balance_rappen || 0) - (b.credit?.balance_rappen || 0)
      case 'last_activity':
        const aDate = new Date(a.credit?.updated_at || a.created_at)
        const bDate = new Date(b.credit?.updated_at || b.created_at)
        return bDate.getTime() - aDate.getTime()
      default:
        return 0
    }
  })

  return filtered
})

// Methods
const loadStudents = async () => {
  try {
    const supabase = getSupabase()
    
    const { data, error: fetchError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        is_active,
        created_at,
        student_credits (
          balance_rappen,
          updated_at
        )
      `)
      .eq('role', 'client')
      .order('first_name')

    if (fetchError) throw fetchError

    // Flatten the credit data
    students.value = data?.map(student => ({
      ...student,
      credit: student.student_credits?.[0] || null
    })) || []

  } catch (err: any) {
    console.error('❌ Error loading students:', err)
  }
}

const loadStatistics = async () => {
  try {
    statistics.value = await getCreditStatistics()
  } catch (err: any) {
    console.error('❌ Error loading statistics:', err)
  }
}

const openStudentCreditManager = (student: any) => {
  selectedStudent.value = student
  showCreditManagerModal.value = true
}

const loadStudentTransactions = async (userId: string) => {
  try {
    isLoadingTransactions.value = true
    studentTransactions.value = await getCreditTransactions(userId)
  } catch (err: any) {
    console.error('❌ Error loading student transactions:', err)
  } finally {
    isLoadingTransactions.value = false
  }
}

const handleCreditUpdated = async () => {
  // Reload data after credit update
  await loadStudents()
  await loadStatistics()
}

// Utility functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
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
  await loadStudents()
  await loadStatistics()
})
</script>
