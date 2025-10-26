<template>
  <div class="office-cash-manager">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Bürokassen-Verwaltung</h2>
          <p class="text-sm text-gray-600 mt-1">
            Verwalten Sie mehrere Bürokassen und Staff-Zuweisungen
          </p>
        </div>
        <button
          @click="showCreateModal = true"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ➕ Neue Bürokasse
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <LoadingLogo size="lg" />
    </div>

    <!-- Office Registers Grid -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      
      <!-- Main Register (always first) -->
      <div v-if="mainRegister" class="office-register-card main-register">
        <div class="register-header">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span class="text-blue-600 text-xl">🏦</span>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">{{ mainRegister.name }}</h3>
                <p class="text-xs text-blue-600 font-medium">HAUPTKASSE</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-2xl font-bold text-gray-900">
                {{ formatCurrency(mainRegister.current_balance_rappen) }}
              </div>
              <div class="text-xs text-gray-500">{{ mainRegister.location }}</div>
            </div>
          </div>
        </div>
        
        <div class="register-content">
          <div class="mb-4">
            <div class="text-sm text-gray-600 mb-2">Zugewiesene Staff:</div>
            <div class="flex flex-wrap gap-1">
              <span 
                v-for="staff in mainRegister.assigned_staff" 
                :key="staff.staff_id"
                :class="getStaffBadgeClass(staff.access_level)"
                class="px-2 py-1 text-xs rounded-full"
              >
                {{ staff.staff_name }} ({{ getAccessLevelLabel(staff.access_level) }})
              </span>
            </div>
          </div>
          
          <div class="flex space-x-2">
            <button
              @click="openRegisterDetails(mainRegister)"
              class="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Details
            </button>
            <button
              @click="openStaffAssignment(mainRegister)"
              class="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Staff verwalten
            </button>
          </div>
        </div>
      </div>

      <!-- Additional Registers -->
      <div 
        v-for="register in additionalRegisters" 
        :key="register.id"
        class="office-register-card"
      >
        <div class="register-header">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <span class="text-gray-600 text-xl">{{ getRegisterIcon(register.register_type) }}</span>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">{{ register.name }}</h3>
                <p class="text-xs text-gray-500">{{ getRegisterTypeLabel(register.register_type) }}</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xl font-bold text-gray-900">
                {{ formatCurrency(register.current_balance_rappen) }}
              </div>
              <div class="text-xs text-gray-500">{{ register.location }}</div>
            </div>
          </div>
        </div>
        
        <div class="register-content">
          <div class="mb-4">
            <div class="text-sm text-gray-600 mb-2">Zugewiesene Staff:</div>
            <div v-if="register.assigned_staff.length > 0" class="flex flex-wrap gap-1">
              <span 
                v-for="staff in register.assigned_staff" 
                :key="staff.staff_id"
                :class="getStaffBadgeClass(staff.access_level)"
                class="px-2 py-1 text-xs rounded-full"
              >
                {{ staff.staff_name }} ({{ getAccessLevelLabel(staff.access_level) }})
              </span>
            </div>
            <div v-else class="text-xs text-gray-400 italic">Keine Staff zugewiesen</div>
          </div>
          
          <div class="flex space-x-2">
            <button
              @click="openRegisterDetails(register)"
              class="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Details
            </button>
            <button
              @click="openStaffAssignment(register)"
              class="flex-1 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Staff
            </button>
            <button
              @click="toggleRegisterStatus(register)"
              :class="register.is_active ? 'bg-red-50 hover:bg-red-100 text-red-700' : 'bg-green-50 hover:bg-green-100 text-green-700'"
              class="px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              {{ register.is_active ? '⏸️' : '▶️' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Add New Register Card -->
      <div class="office-register-card add-new-card" @click="showCreateModal = true">
        <div class="flex flex-col items-center justify-center h-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
          <div class="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-3">
            <span class="text-2xl">➕</span>
          </div>
          <div class="text-sm font-medium">Neue Bürokasse</div>
          <div class="text-xs">Klicken zum Erstellen</div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="mt-8 bg-gray-50 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Gesamtübersicht</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{{ officeRegisters.length }}</div>
          <div class="text-sm text-gray-600">Aktive Kassen</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{{ formatCurrency(totalBalance) }}</div>
          <div class="text-sm text-gray-600">Gesamtbestand</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">{{ totalAssignedStaff }}</div>
          <div class="text-sm text-gray-600">Zugewiesene Staff</div>
        </div>
      </div>
    </div>

    <!-- Create Register Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="showCreateModal = false">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white" @click.stop>
        <div class="mb-4">
          <h3 class="text-lg font-medium text-gray-900">Neue Bürokasse erstellen</h3>
        </div>

        <form @submit.prevent="handleCreateRegister" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              v-model="createForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="z.B. Empfangskasse"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Standort</label>
            <input
              v-model="createForm.location"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="z.B. Empfang, Büro Nord"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Typ</label>
            <select
              v-model="createForm.register_type"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="office">Bürokasse</option>
              <option value="reception">Empfangskasse</option>
              <option value="exam">Prüfungskasse</option>
              <option value="emergency">Notfallkasse</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              v-model="createForm.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Zweck und Verwendung dieser Kasse..."
            ></textarea>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              @click="showCreateModal = false"
              class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              :disabled="isCreating"
              class="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <svg v-if="isCreating" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isCreating ? 'Erstellen...' : 'Kasse erstellen' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Staff Assignment Modal -->
    <div v-if="showStaffModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="showStaffModal = false">
      <div class="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white" @click.stop>
        <div class="mb-4">
          <h3 class="text-lg font-medium text-gray-900">
            Staff-Zuweisungen: {{ selectedRegister?.name }}
          </h3>
          <p class="text-sm text-gray-600">{{ selectedRegister?.location }}</p>
        </div>

        <!-- Current Assignments -->
        <div class="mb-6">
          <h4 class="text-md font-medium text-gray-900 mb-3">Aktuelle Zuweisungen</h4>
          <div v-if="selectedRegister?.assigned_staff.length" class="space-y-2">
            <div 
              v-for="staff in selectedRegister.assigned_staff" 
              :key="staff.staff_id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span class="text-xs font-medium">{{ getInitials(staff.staff_name) }}</span>
                </div>
                <div>
                  <div class="font-medium text-gray-900">{{ staff.staff_name }}</div>
                  <div class="text-xs text-gray-500">{{ getAccessLevelLabel(staff.access_level) }}</div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <span :class="getStaffBadgeClass(staff.access_level)" class="px-2 py-1 text-xs rounded-full">
                  {{ getAccessLevelLabel(staff.access_level) }}
                </span>
                <button
                  @click="removeStaffAssignment(staff.staff_id)"
                  class="text-red-600 hover:text-red-800 text-sm"
                >
                  Entfernen
                </button>
              </div>
            </div>
          </div>
          <div v-else class="text-sm text-gray-500 italic">Keine Staff zugewiesen</div>
        </div>

        <!-- Add New Assignment -->
        <div class="border-t pt-6">
          <h4 class="text-md font-medium text-gray-900 mb-3">Neue Zuweisung</h4>
          <form @submit.prevent="handleStaffAssignment" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Staff auswählen</label>
                <select
                  v-model="assignmentForm.staff_id"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Staff auswählen --</option>
                  <option 
                    v-for="staff in availableStaff" 
                    :key="staff.id" 
                    :value="staff.id"
                  >
                    {{ staff.first_name }} {{ staff.last_name }} ({{ staff.role }})
                  </option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Berechtigung</label>
                <select
                  v-model="assignmentForm.access_level"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="viewer">Viewer (nur lesen)</option>
                  <option value="operator">Operator (Transaktionen)</option>
                  <option value="manager">Manager (Vollzugriff)</option>
                </select>
              </div>
            </div>
            
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                @click="showStaffModal = false"
                class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Schließen
              </button>
              <button
                type="submit"
                :disabled="isAssigning"
                class="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {{ isAssigning ? 'Zuweisen...' : 'Staff zuweisen' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Register Details Modal -->
    <div v-if="showDetailsModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="showDetailsModal = false">
      <div class="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white" @click.stop>
        <div class="mb-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-medium text-gray-900">{{ selectedRegister?.name }}</h3>
              <p class="text-sm text-gray-600">{{ selectedRegister?.description }}</p>
            </div>
            <button @click="showDetailsModal = false" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Register Details Content -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Current Balance & Actions -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-medium text-gray-900 mb-3">Kassenstand</h4>
            <div class="text-3xl font-bold text-gray-900 mb-4">
              {{ formatCurrency(selectedRegister?.current_balance_rappen || 0) }}
            </div>
            
            <div class="space-y-2">
              <button
                @click="showDepositModal = true"
                class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                💰 Geld einzahlen
              </button>
              <button
                @click="showWithdrawModal = true"
                class="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                💸 Geld abheben
              </button>
            </div>
          </div>
          
          <!-- Recent Movements -->
          <div>
            <h4 class="font-medium text-gray-900 mb-3">Letzte Bewegungen</h4>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div 
                v-for="movement in recentMovements" 
                :key="movement.id"
                class="flex items-center justify-between p-2 bg-white rounded border"
              >
                <div class="flex items-center space-x-2">
                  <span :class="getMovementIcon(movement.movement_type)">
                    {{ getMovementEmoji(movement.movement_type) }}
                  </span>
                  <div>
                    <div class="text-sm font-medium">{{ formatCurrency(movement.amount_rappen) }}</div>
                    <div class="text-xs text-gray-500">{{ movement.performer_name }}</div>
                  </div>
                </div>
                <div class="text-xs text-gray-500">
                  {{ formatDate(movement.created_at) }}
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
import { ref, computed, onMounted } from 'vue'

// Composables
const { 
  officeRegisters,
  mainRegister,
  additionalRegisters,
  totalBalance,
  isLoading,
  error,
  loadOfficeRegisters,
  createOfficeRegister,
  assignStaffToRegister
} = useOfficeCashRegisters()

// State
const showCreateModal = ref(false)
const showStaffModal = ref(false)
const showDetailsModal = ref(false)
const showDepositModal = ref(false)
const showWithdrawModal = ref(false)
const selectedRegister = ref<any>(null)
const isCreating = ref(false)
const isAssigning = ref(false)
const availableStaff = ref<any[]>([])
const recentMovements = ref<any[]>([])

// Forms
const createForm = ref({
  name: '',
  description: '',
  location: '',
  register_type: 'office' as 'office' | 'reception' | 'exam' | 'emergency'
})

const assignmentForm = ref({
  staff_id: '',
  access_level: 'operator' as 'manager' | 'operator' | 'viewer'
})

// Computed
const totalAssignedStaff = computed(() => {
  return officeRegisters.value.reduce((sum, register) => sum + register.assigned_staff.length, 0)
})

// Methods
const formatCurrency = (rappen: number): string => {
  return `CHF ${(rappen / 100).toFixed(2)}`
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getRegisterIcon = (type: string): string => {
  const icons = {
    office: '🏢',
    reception: '🏪',
    exam: '📋',
    emergency: '🚨'
  }
  return icons[type as keyof typeof icons] || '🏢'
}

const getRegisterTypeLabel = (type: string): string => {
  const labels = {
    office: 'Bürokasse',
    reception: 'Empfangskasse', 
    exam: 'Prüfungskasse',
    emergency: 'Notfallkasse'
  }
  return labels[type as keyof typeof labels] || type
}

const getAccessLevelLabel = (level: string): string => {
  const labels = {
    manager: 'Manager',
    operator: 'Operator',
    viewer: 'Viewer'
  }
  return labels[level as keyof typeof labels] || level
}

const getStaffBadgeClass = (level: string): string => {
  const classes = {
    manager: 'bg-red-100 text-red-800',
    operator: 'bg-blue-100 text-blue-800',
    viewer: 'bg-gray-100 text-gray-800'
  }
  return classes[level as keyof typeof classes] || 'bg-gray-100 text-gray-800'
}

const getMovementEmoji = (type: string): string => {
  const emojis = {
    deposit: '💰',
    withdrawal: '💸',
    transfer: '🔄',
    adjustment: '⚖️'
  }
  return emojis[type as keyof typeof emojis] || '💱'
}

const getMovementIcon = (type: string): string => {
  const classes = {
    deposit: 'text-green-600',
    withdrawal: 'text-red-600',
    transfer: 'text-blue-600',
    adjustment: 'text-yellow-600'
  }
  return classes[type as keyof typeof classes] || 'text-gray-600'
}

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)
}

const handleCreateRegister = async () => {
  isCreating.value = true
  
  try {
    const registerId = await createOfficeRegister(
      createForm.value.name,
      createForm.value.description,
      createForm.value.location,
      createForm.value.register_type
    )
    
    if (registerId) {
      showCreateModal.value = false
      createForm.value = {
        name: '',
        description: '',
        location: '',
        register_type: 'office'
      }
    }
  } catch (err) {
    console.error('Error creating register:', err)
  } finally {
    isCreating.value = false
  }
}

const openRegisterDetails = async (register: any) => {
  selectedRegister.value = register
  showDetailsModal.value = true
  
  // Load recent movements
  const { getRegisterMovements } = useOfficeCashRegisters()
  recentMovements.value = await getRegisterMovements(register.id)
}

const openStaffAssignment = async (register: any) => {
  selectedRegister.value = register
  showStaffModal.value = true
  
  // Load available staff
  await loadAvailableStaff()
}

const loadAvailableStaff = async () => {
  try {
    const supabase = getSupabase()
    const tenantId = await getCurrentTenantId()
    
    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, role')
      .eq('tenant_id', tenantId)
      .in('role', ['staff', 'admin'])
      .eq('is_active', true)
      .order('first_name')

    if (error) throw error
    availableStaff.value = data || []
  } catch (err) {
    console.error('Error loading available staff:', err)
  }
}

const handleStaffAssignment = async () => {
  if (!selectedRegister.value) return
  
  isAssigning.value = true
  
  try {
    const success = await assignStaffToRegister(
      selectedRegister.value.id,
      assignmentForm.value.staff_id,
      assignmentForm.value.access_level
    )
    
    if (success) {
      assignmentForm.value = {
        staff_id: '',
        access_level: 'operator'
      }
    }
  } catch (err) {
    console.error('Error assigning staff:', err)
  } finally {
    isAssigning.value = false
  }
}

const removeStaffAssignment = async (staffId: string) => {
  // TODO: Implement remove staff assignment
  console.log('Remove staff assignment:', staffId)
}

const toggleRegisterStatus = async (register: any) => {
  // TODO: Implement toggle register status
  console.log('Toggle register status:', register.id)
}

// Lifecycle
onMounted(async () => {
  await loadOfficeRegisters()
})
</script>

<style scoped>
.office-register-card {
  @apply bg-white rounded-lg shadow-sm border p-6 transition-all duration-200;
}

.office-register-card:hover {
  @apply shadow-md;
}

.main-register {
  @apply border-blue-200 bg-blue-50;
}

.add-new-card {
  @apply border-dashed border-gray-300 bg-gray-50;
  min-height: 200px;
}

.register-header {
  @apply mb-4;
}

.register-content {
  @apply space-y-3;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>




















