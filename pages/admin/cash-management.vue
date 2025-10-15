<template>
  <div class="min-h-screen bg-gray-50">


    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Page Header -->
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">
          Kassenverwaltung
        </h2>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <LoadingLogo size="lg" :tenant-id="currentUser?.tenant_id" />
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <h3 class="text-sm font-medium text-red-800">Fehler beim Laden</h3>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div v-else class="mb-6">
        <nav class="flex space-x-8" aria-label="Tabs">
          <button
            @click="activeTab = 'overview'"
            :class="[
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            📊 Gesamtübersicht
          </button>
          <button
            @click="activeTab = 'office'"
            :class="[
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'office'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            🏢 Bürokassen
            <span v-if="officeRegisters.length > 0" class="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
              {{ officeRegisters.length }}
            </span>
          </button>
          <button
            @click="activeTab = 'instructor'"
            :class="[
              'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'instructor'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            👨‍🏫 Fahrlehrer-Kassen
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div v-if="!isLoading && !error" class="tab-content">
        
        <!-- Gesamtübersicht Tab -->
        <div v-if="activeTab === 'overview'" class="tab-panel">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <!-- Total Balance Card -->
            <div class="bg-white rounded-lg shadow-sm border p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Bürokassen</p>
                  <p class="text-2xl font-bold text-blue-600">{{ officeRegisters.length }}</p>
                  <p class="text-xs text-gray-500">Aktive Kassen</p>
                </div>
                <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span class="text-blue-600 text-xl">🏢</span>
                </div>
              </div>
            </div>

            <!-- Debug Info Card -->
            <div class="bg-white rounded-lg shadow-sm border p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Debug Info</p>
                  <p class="text-lg font-bold text-gray-900">{{ currentUser?.email || 'Kein User' }}</p>
                  <p class="text-xs text-gray-500">{{ currentUser?.tenant_id || 'Keine Tenant-ID' }}</p>
                </div>
                <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span class="text-yellow-600 text-xl">🔍</span>
                </div>
              </div>
            </div>

            <!-- Status Card -->
            <div class="bg-white rounded-lg shadow-sm border p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">System Status</p>
                  <p class="text-lg font-bold text-green-600">{{ isLoading ? 'Lädt...' : 'Bereit' }}</p>
                  <p class="text-xs text-gray-500">{{ error || 'Keine Fehler' }}</p>
                </div>
                <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span class="text-green-600 text-xl">✅</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bürokassen Tab -->
        <div v-if="activeTab === 'office'" class="tab-panel">
          <div class="bg-white rounded-lg shadow-sm border p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-gray-900">Bürokassen</h3>
            </div>
            
            <div v-if="officeRegisters.length === 0" class="text-center py-12">
              <div class="text-gray-400 text-6xl mb-4">🏢</div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">Noch keine Bürokassen</h3>
              <p class="text-gray-600 mb-4">
                Führen Sie zuerst die SQL-Migration aus: database_migration_multi_office_cash.sql
              </p>
            </div>
            
            <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div v-for="register in officeRegisters" :key="register.id" class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h4 class="font-medium text-gray-900">{{ register.name }}</h4>
                    <p class="text-sm text-gray-500">{{ register.location }}</p>
                    <span v-if="register.is_main_register" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mt-1">
                      HAUPTKASSE
                    </span>
                  </div>
                  <div class="text-right">
                    <div class="text-xl font-bold text-gray-900">{{ formatCurrency(register.current_balance_rappen) }}</div>
                    <div class="text-xs text-gray-500">{{ getRegisterTypeLabel(register.register_type) }}</div>
                  </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="flex space-x-2 mt-4">
                  <button
                    @click="openDepositModal(register)"
                    class="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                  >
                    💰 Aufstocken
                  </button>
                  <button
                    @click="openWithdrawModal(register)"
                    class="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                  >
                    💸 Abheben
                  </button>
                  <button
                    @click="viewRegisterDetails(register)"
                    class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-medium transition-colors"
                  >
                    📊
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Fahrlehrer-Kassen Tab -->
        <div v-if="activeTab === 'instructor'" class="tab-panel">
          <div v-if="isLoadingUser" class="flex justify-center py-12">
            <LoadingLogo size="lg" :tenant-id="currentUser?.tenant_id" />
            <div class="ml-4 text-gray-600">Lade Benutzerdaten...</div>
          </div>
          
          <AdminCashBalanceManager 
            v-else-if="manualCurrentUser"
            :current-user="manualCurrentUser"
          />
          
          <div v-else class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-yellow-800">Benutzerdaten werden geladen...</h3>
                <div class="mt-2 text-sm text-yellow-700">
                  Falls das Problem bestehen bleibt, loggen Sie sich erneut ein.
                </div>
                <button
                  @click="loadManualCurrentUser"
                  class="mt-3 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  🔄 Benutzerdaten neu laden
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Deposit Modal -->
    <div v-if="showDepositModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="showDepositModal = false">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" @click.stop>
        <div class="mb-4">
          <h3 class="text-lg font-medium text-gray-900">💰 Kasse aufstocken</h3>
          <p class="text-sm text-gray-600">{{ selectedRegister?.name }}</p>
        </div>

        <form @submit.prevent="handleDeposit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Betrag (CHF)</label>
            <input
              v-model.number="depositForm.amount"
              type="number"
              step="0.05"
              min="0.05"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="z.B. 500.00"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notiz (optional)</label>
            <textarea
              v-model="depositForm.notes"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="z.B. Tageseinnahmen, Startkapital..."
            ></textarea>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="showDepositModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              :disabled="isProcessing"
              class="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <svg v-if="isProcessing" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isProcessing ? 'Aufstocken...' : 'Kasse aufstocken' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Withdraw Modal -->
    <div v-if="showWithdrawModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="showWithdrawModal = false">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" @click.stop>
        <div class="mb-4">
          <h3 class="text-lg font-medium text-gray-900">💸 Geld abheben</h3>
          <p class="text-sm text-gray-600">{{ selectedRegister?.name }}</p>
          <p class="text-sm text-blue-600 font-medium">
            Verfügbar: {{ formatCurrency(selectedRegister?.current_balance_rappen || 0) }}
          </p>
        </div>

        <form @submit.prevent="handleWithdraw" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Betrag (CHF)</label>
            <input
              v-model.number="withdrawForm.amount"
              type="number"
              step="0.05"
              min="0.05"
              :max="(selectedRegister?.current_balance_rappen || 0) / 100"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="z.B. 100.00"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Grund (erforderlich)</label>
            <textarea
              v-model="withdrawForm.notes"
              rows="3"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="z.B. Bankeinzahlung, Ausgaben, Wechselgeld..."
            ></textarea>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="showWithdrawModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              :disabled="isProcessing || (withdrawForm.amount > (selectedRegister?.current_balance_rappen || 0) / 100)"
              class="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              <svg v-if="isProcessing" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isProcessing ? 'Abheben...' : 'Geld abheben' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Register Details Modal -->
    <div v-if="showDetailsModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="showDetailsModal = false">
      <div class="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white" @click.stop>
        <div class="mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xl font-medium text-gray-900">{{ selectedRegister?.name }}</h3>
              <p class="text-sm text-gray-600">{{ selectedRegister?.description }}</p>
              <div class="flex items-center space-x-4 mt-2">
                <span class="text-sm text-gray-500">📍 {{ selectedRegister?.location }}</span>
                <span class="text-sm text-gray-500">🏷️ {{ getRegisterTypeLabel(selectedRegister?.register_type) }}</span>
                <span v-if="selectedRegister?.is_main_register" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  HAUPTKASSE
                </span>
              </div>
            </div>
            <button @click="showDetailsModal = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- Current Balance & Quick Actions -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h4 class="font-semibold text-gray-900 mb-4">Aktueller Kassenstand</h4>
            <div class="text-center mb-6">
              <div class="text-4xl font-bold text-gray-900 mb-2">
                {{ formatCurrency(selectedRegister?.current_balance_rappen || 0) }}
              </div>
              <div class="text-sm text-gray-600">Verfügbares Bargeld</div>
            </div>
            
            <div class="space-y-3">
              <button
                @click="openDepositModal(selectedRegister); showDetailsModal = false"
                class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                💰 Geld einzahlen
              </button>
              <button
                @click="openWithdrawModal(selectedRegister); showDetailsModal = false"
                class="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                💸 Geld abheben
              </button>
              <button
                @click="refreshRegisterData"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                🔄 Aktualisieren
              </button>
            </div>
          </div>
          
          <!-- Movement History -->
          <div>
            <h4 class="font-semibold text-gray-900 mb-4">Bewegungshistorie (letzte 20)</h4>
            <div class="space-y-3 max-h-96 overflow-y-auto">
              <div 
                v-for="movement in registerMovements" 
                :key="movement.id"
                class="flex items-center justify-between p-3 bg-white rounded-lg border"
              >
                <div class="flex items-center space-x-3">
                  <div :class="getMovementIconClass(movement.movement_type)" class="w-8 h-8 rounded-full flex items-center justify-center">
                    <span class="text-sm">{{ getMovementIcon(movement.movement_type) }}</span>
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">
                      {{ getMovementTypeLabel(movement.movement_type) }}
                    </div>
                    <div class="text-sm text-gray-600">{{ movement.performer_name }}</div>
                    <div class="text-xs text-gray-500">{{ formatDateTime(movement.created_at) }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div :class="movement.movement_type === 'deposit' ? 'text-green-600' : 'text-red-600'" class="font-medium">
                    {{ movement.movement_type === 'deposit' ? '+' : '-' }}{{ formatCurrency(movement.amount_rappen) }}
                  </div>
                  <div class="text-xs text-gray-500">
                    Saldo: {{ formatCurrency(movement.balance_after_rappen) }}
                  </div>
                </div>
              </div>
              
              <div v-if="registerMovements.length === 0" class="text-center py-8 text-gray-500">
                <div class="text-4xl mb-2">📋</div>
                <div class="text-sm">Noch keine Bewegungen</div>
              </div>
            </div>
            
            <!-- Movement Notes -->
            <div v-if="registerMovements.length > 0" class="mt-4 pt-4 border-t">
              <h5 class="font-medium text-gray-900 mb-2">Letzte Notizen:</h5>
              <div class="space-y-1">
                <div 
                  v-for="movement in registerMovements.filter(m => m.notes).slice(0, 3)" 
                  :key="movement.id"
                  class="text-xs text-gray-600 bg-gray-50 p-2 rounded"
                >
                  "{{ movement.notes }}" - {{ formatDateTime(movement.created_at) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useCurrentUser } from '~/composables/useCurrentUser'
import AdminCashBalanceManager from '~/components/admin/CashBalanceManager.vue'

// Layout
definePageMeta({
  layout: 'admin',
  middleware: 'features'
})

// Composables
const { currentUser } = useCurrentUser()
const { 
  officeRegisters,
  totalBalance: totalOfficeBalance,
  isLoading: isLoadingOffice,
  error: officeError,
  loadOfficeRegisters
} = useOfficeCashRegisters()

// State
const activeTab = ref('overview')
const isLoading = ref(false)
const error = ref(null)
const showDepositModal = ref(false)
const showWithdrawModal = ref(false)
const selectedRegister = ref(null)
const isProcessing = ref(false)
const showDetailsModal = ref(false)
const registerMovements = ref([])
const isLoadingUser = ref(false)
const manualCurrentUser = ref(null)

// Forms
const depositForm = ref({
  amount: 0,
  notes: ''
})

const withdrawForm = ref({
  amount: 0,
  notes: ''
})

// Methods
const refreshAllData = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    await loadOfficeRegisters()
  } catch (err) {
    error.value = err.message || 'Fehler beim Laden der Daten'
    console.error('❌ Error refreshing cash data:', err)
  } finally {
    isLoading.value = false
  }
}

const formatCurrency = (rappen) => {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

const getRegisterTypeLabel = (type) => {
  const labels = {
    office: 'Bürokasse',
    reception: 'Empfangskasse',
    exam: 'Prüfungskasse',
    emergency: 'Notfallkasse'
  }
  return labels[type] || type
}

const openDepositModal = (register) => {
  selectedRegister.value = register
  depositForm.value = { amount: 0, notes: '' }
  showDepositModal.value = true
}

const openWithdrawModal = (register) => {
  selectedRegister.value = register
  withdrawForm.value = { amount: 0, notes: '' }
  showWithdrawModal.value = true
}

const viewRegisterDetails = async (register) => {
  selectedRegister.value = register
  showDetailsModal.value = true
  
  // Load register movements
  await loadRegisterMovements(register.id)
}

const loadRegisterMovements = async (registerId) => {
  try {
    const supabase = getSupabase()
    
    const { data, error } = await supabase
      .from('cash_movements')
      .select(`
        id, movement_type, amount_rappen, balance_before_rappen, balance_after_rappen,
        notes, created_at, office_cash_register_id,
        performer:performed_by(first_name, last_name, email)
      `)
      .eq('office_cash_register_id', registerId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    registerMovements.value = (data || []).map(movement => ({
      ...movement,
      performer_name: `${movement.performer?.first_name || ''} ${movement.performer?.last_name || ''}`.trim() || movement.performer?.email || 'System'
    }))
    
    console.log('✅ Register movements loaded:', registerMovements.value.length)
  } catch (err) {
    console.error('❌ Error loading register movements:', err)
    registerMovements.value = []
  }
}

const handleDeposit = async () => {
  if (!selectedRegister.value || !depositForm.value.amount) return
  
  isProcessing.value = true
  
  try {
    const supabase = getSupabase()
    const amountRappen = Math.round(depositForm.value.amount * 100)
    
    // Call the PostgreSQL function for office cash deposit
    const { error } = await supabase.rpc('office_cash_deposit', {
      p_register_id: selectedRegister.value.id,
      p_amount_rappen: amountRappen,
      p_notes: depositForm.value.notes || null
    })
    
    if (error) throw error
    
    console.log('✅ Deposit successful')
    showDepositModal.value = false
    await refreshAllData()
    
  } catch (err) {
    console.error('❌ Error making deposit:', err)
    alert('Fehler beim Aufstocken: ' + (err.message || 'Unbekannter Fehler'))
  } finally {
    isProcessing.value = false
  }
}

const handleWithdraw = async () => {
  if (!selectedRegister.value || !withdrawForm.value.amount || !withdrawForm.value.notes) return
  
  isProcessing.value = true
  
  try {
    const supabase = getSupabase()
    const amountRappen = Math.round(withdrawForm.value.amount * 100)
    
    // Call the PostgreSQL function for office cash withdrawal
    const { error } = await supabase.rpc('office_cash_withdrawal', {
      p_register_id: selectedRegister.value.id,
      p_amount_rappen: amountRappen,
      p_notes: withdrawForm.value.notes
    })
    
    if (error) throw error
    
    console.log('✅ Withdrawal successful')
    showWithdrawModal.value = false
    await refreshAllData()
    
  } catch (err) {
    console.error('❌ Error making withdrawal:', err)
    alert('Fehler beim Abheben: ' + (err.message || 'Unbekannter Fehler'))
  } finally {
    isProcessing.value = false
  }
}

const refreshRegisterData = async () => {
  if (selectedRegister.value) {
    await loadRegisterMovements(selectedRegister.value.id)
    await refreshAllData()
  }
}

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getMovementIcon = (type) => {
  const icons = {
    deposit: '💰',
    withdrawal: '💸',
    transfer: '🔄',
    adjustment: '⚖️'
  }
  return icons[type] || '💱'
}

const getMovementIconClass = (type) => {
  const classes = {
    deposit: 'bg-green-100 text-green-600',
    withdrawal: 'bg-red-100 text-red-600',
    transfer: 'bg-blue-100 text-blue-600',
    adjustment: 'bg-yellow-100 text-yellow-600'
  }
  return classes[type] || 'bg-gray-100 text-gray-600'
}

const getMovementTypeLabel = (type) => {
  const labels = {
    deposit: 'Einzahlung',
    withdrawal: 'Abhebung',
    transfer: 'Transfer',
    adjustment: 'Anpassung'
  }
  return labels[type] || type
}

const loadManualCurrentUser = async () => {
  isLoadingUser.value = true
  
  try {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Nicht authentifiziert')
    }
    
    console.log('🔍 Loading manual current user for:', user.email)
    
    const { data: userProfile, error } = await supabase
      .from('users')
      .select(`
        id, email, role, first_name, last_name, phone, tenant_id,
        is_active, preferred_payment_method
      `)
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()
    
    if (error) {
      console.error('❌ Error loading user profile:', error)
      throw new Error('Benutzerprofil nicht gefunden')
    }
    
    if (!userProfile.tenant_id) {
      throw new Error('Benutzer hat keine Tenant-Zuordnung')
    }
    
    manualCurrentUser.value = {
      ...userProfile,
      auth_user_id: user.id
    }
    
    console.log('✅ Manual current user loaded:', manualCurrentUser.value)
    
  } catch (err) {
    console.error('❌ Error loading manual current user:', err)
    alert('Fehler beim Laden der Benutzerdaten: ' + err.message)
  } finally {
    isLoadingUser.value = false
  }
}

// Debug current user and tenant
const debugCurrentState = async () => {
  console.log('🔍 DEBUG: Current state check')
  console.log('👤 Current user:', currentUser.value)
  
  if (currentUser.value) {
    console.log('🏢 User tenant_id:', currentUser.value.tenant_id)
    console.log('📧 User email:', currentUser.value.email)
    console.log('🎭 User role:', currentUser.value.role)
  }
  
  // Check what's in the database
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('🔑 Auth user:', user?.email)
  
  if (user) {
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('id, email, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()
    
    console.log('📊 DB user profile:', userProfile)
    console.log('❌ DB error:', error)
  }
}

// Auth check
const authStore = useAuthStore()

// Lifecycle
onMounted(async () => {
  console.log('🔍 Cash management page mounted, checking auth...')
  
  // Warte kurz auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  console.log('🔍 Auth state:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    hasProfile: authStore.hasProfile
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    console.log('❌ User not logged in, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Prüfe ob User Admin ist
  if (!authStore.isAdmin) {
    console.log('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  console.log('✅ Auth check passed, loading cash management...')
  
  // Original onMounted logic
  await debugCurrentState()
  await loadManualCurrentUser() // Load user data manually
  await refreshAllData()
})
</script>

<style scoped>
.tab-panel {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
