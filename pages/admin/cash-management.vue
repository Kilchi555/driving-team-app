<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <h1 class="text-xl font-semibold text-gray-900 mb-8">Kassenverwaltung</h1>

      <!-- Loading -->
      <div v-if="isLoading" class="flex justify-center items-center py-20">
        <LoadingLogo size="lg" :tenant-id="currentUser?.tenant_id" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
        <svg class="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <div>
          <p class="font-medium text-red-800">Fehler beim Laden</p>
          <p class="text-red-600 mt-0.5">{{ error }}</p>
        </div>
      </div>

      <div v-else class="space-y-8">

        <!-- Bürokassen -->
        <section>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Bürokassen</p>
          <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div v-if="officeRegisters.length === 0" class="px-5 py-10 text-center text-sm text-gray-400">
              Keine Bürokassen vorhanden.
            </div>
            <div v-else>
              <div
                v-for="(register, idx) in officeRegisters"
                :key="register.id"
                class="flex items-center px-5 py-3.5"
                :class="{ 'border-t border-gray-100': idx > 0 }"
              >
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-900">{{ register.name }}</span>
                    <span v-if="register.is_main_register" class="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">Hauptkasse</span>
                  </div>
                  <p class="text-xs text-gray-400 mt-0.5">{{ register.location || getRegisterTypeLabel(register.register_type) }}</p>
                </div>
                <span class="text-sm font-semibold text-gray-900 tabular-nums mx-6">{{ formatCurrency(register.current_balance_rappen) }}</span>
                <div class="flex items-center gap-2">
                  <button @click="openDepositModal(register)" class="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-medium transition-colors">Einzahlen</button>
                  <button @click="openWithdrawModal(register)" class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium transition-colors">Abheben</button>
                  <button @click="viewRegisterDetails(register)" class="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors">Details</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Fahrlehrer-Kassen -->
        <section>
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Fahrlehrer-Kassen</p>

          <div v-if="isLoadingUser" class="flex justify-center py-12">
            <LoadingLogo size="lg" :tenant-id="currentUser?.tenant_id" />
          </div>

          <AdminCashBalanceManager
            v-else-if="manualCurrentUser"
            :current-user="manualCurrentUser"
          />

          <div v-else class="bg-yellow-50 border border-yellow-200 rounded-xl p-5 text-sm">
            <p class="font-medium text-yellow-800">Benutzerdaten werden geladen...</p>
            <p class="text-yellow-700 mt-1">Falls das Problem bestehen bleibt, loggen Sie sich erneut ein.</p>
            <button @click="loadManualCurrentUser" class="mt-3 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Neu laden
            </button>
          </div>
        </section>

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
                class="w-full text-white px-4 py-3 rounded-lg font-medium transition-colors hover:opacity-90"
                :style="{ background: primaryColor }"
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

import { ref, computed, onMounted, readonly } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { useOfficeCashRegisters } from '~/composables/useOfficeCashRegisters'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import AdminCashBalanceManager from '~/components/admin/CashBalanceManager.vue'

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

const { primaryColor } = useTenantBranding()

// Auth check - must be first
const authStore = useAuthStore()

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
const activeTab = ref('instructor')
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
    
    logger.debug('✅ Register movements loaded:', registerMovements.value.length)
  } catch (err) {
    console.error('❌ Error loading register movements:', err)
    registerMovements.value = []
  }
}

const handleDeposit = async () => {
  if (!selectedRegister.value || !depositForm.value.amount) return
  
  isProcessing.value = true
  
  try {
    const amountRappen = Math.round(depositForm.value.amount * 100)
    
    // Call the backend API endpoint for office cash deposit
    const response = await $fetch('/api/admin/cash-operations', {
      method: 'POST',
      body: {
        action: 'deposit',
        register_id: selectedRegister.value.id,
        amount_rappen: amountRappen,
        notes: depositForm.value.notes || null
      }
    })
    
    logger.debug('✅ Deposit successful')
    showDepositModal.value = false
    await refreshAllData()
    
  } catch (err) {
    console.error('❌ Error making deposit:', err)
    alert('Fehler beim Aufstocken: ' + (err?.message || 'Unbekannter Fehler'))
  } finally {
    isProcessing.value = false
  }
}

const handleWithdraw = async () => {
  if (!selectedRegister.value || !withdrawForm.value.amount || !withdrawForm.value.notes) return
  
  isProcessing.value = true
  
  try {
    const amountRappen = Math.round(withdrawForm.value.amount * 100)
    
    // Call the backend API endpoint for office cash withdrawal
    const response = await $fetch('/api/admin/cash-operations', {
      method: 'POST',
      body: {
        action: 'withdraw',
        register_id: selectedRegister.value.id,
        amount_rappen: amountRappen,
        notes: withdrawForm.value.notes
      }
    })
    
    logger.debug('✅ Withdrawal successful')
    showWithdrawModal.value = false
    await refreshAllData()
    
  } catch (err) {
    console.error('❌ Error making withdrawal:', err)
    alert('Fehler beim Abheben: ' + (err?.message || 'Unbekannter Fehler'))
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
    adjustment: 'Anpassung',
    system_init: 'Kasse eröffnet'
  }
  return labels[type] || type
}

const loadManualCurrentUser = async () => {
  isLoadingUser.value = true
  try {
    const profile = authStore.userProfile
    const user = authStore.user

    if (!profile || !user) {
      throw new Error('Nicht authentifiziert')
    }
    if (!profile.tenant_id) {
      throw new Error('Benutzer hat keine Tenant-Zuordnung')
    }

    manualCurrentUser.value = {
      ...profile,
      auth_user_id: user.id
    }

    logger.debug('✅ Manual current user loaded from store:', manualCurrentUser.value)
  } catch (err) {
    console.error('❌ Error loading manual current user:', err)
    alert('Fehler beim Laden der Benutzerdaten: ' + err.message)
  } finally {
    isLoadingUser.value = false
  }
}

// Debug current user and tenant
const debugCurrentState = async () => {
  logger.debug('🔍 DEBUG: Current state check')
  logger.debug('👤 Current user:', currentUser.value)
  
  if (currentUser.value) {
    logger.debug('🏢 User tenant_id:', currentUser.value.tenant_id)
    logger.debug('📧 User email:', currentUser.value.email)
    logger.debug('🎭 User role:', currentUser.value.role)
  }
  
  logger.debug('🔑 Auth user initialized')
}

// Lifecycle
onMounted(async () => {
  logger.debug('🔍 Cash management page mounted, checking auth...')
  
  // Warte kurz auf Auth-Initialisierung
  let attempts = 0
  while (!authStore.isInitialized && attempts < 10) {
    await new Promise(resolve => setTimeout(resolve, 100))
    attempts++
  }
  
  logger.debug('🔍 Auth state:', {
    isInitialized: authStore.isInitialized,
    isLoggedIn: authStore.isLoggedIn,
    isAdmin: authStore.isAdmin,
    hasProfile: authStore.hasProfile
  })
  
  // Prüfe ob User eingeloggt ist
  if (!authStore.isLoggedIn) {
    logger.debug('❌ User not logged in, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  // Prüfe ob User Admin ist
  if (!authStore.isAdmin) {
    logger.debug('❌ User not admin, redirecting to dashboard')
    return navigateTo('/dashboard')
  }
  
  logger.debug('✅ Auth check passed, loading cash management...')
  
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
