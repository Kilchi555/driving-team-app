<template>
  <div class="cash-overview-dashboard">
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      
      <!-- Total Balance -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Gesamtbestand</p>
            <p class="text-2xl font-bold text-gray-900">{{ formatCurrency(totalBalance) }}</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <span class="text-green-600 text-xl">💰</span>
          </div>
        </div>
      </div>

      <!-- Office Registers -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Bürokassen</p>
            <p class="text-2xl font-bold text-blue-600">{{ officeRegisters.length }}</p>
            <p class="text-xs text-gray-500">{{ formatCurrency(officeBalance) }}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <span class="text-blue-600 text-xl">🏢</span>
          </div>
        </div>
      </div>

      <!-- Instructor Cashes -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Fahrlehrer-Kassen</p>
            <p class="text-2xl font-bold text-purple-600">{{ instructorCount }}</p>
            <p class="text-xs text-gray-500">{{ formatCurrency(instructorBalance) }}</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <span class="text-purple-600 text-xl">👨‍🏫</span>
          </div>
        </div>
      </div>

      <!-- Today's Activity -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Heute</p>
            <p class="text-2xl font-bold text-orange-600">{{ todayTransactions }}</p>
            <p class="text-xs text-gray-500">{{ formatCurrency(todayAmount) }}</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <span class="text-orange-600 text-xl">📅</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      
      <!-- Balance Distribution -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Kassenverteilung</h3>
        <div class="space-y-4">
          
          <!-- Office Registers -->
          <div v-for="register in officeRegisters" :key="register.id" class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span class="text-blue-600 text-sm">{{ getRegisterIcon(register.register_type) }}</span>
              </div>
              <div>
                <div class="font-medium text-gray-900">{{ register.name }}</div>
                <div class="text-xs text-gray-500">{{ register.location }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-medium text-gray-900">{{ formatCurrency(register.current_balance_rappen) }}</div>
              <div class="text-xs text-gray-500">
                {{ register.assigned_staff.length }} Staff
              </div>
            </div>
          </div>
          
          <!-- Add message if no office registers -->
          <div v-if="officeRegisters.length === 0" class="text-center py-8 text-gray-500">
            <div class="text-lg">🏢</div>
            <div class="text-sm mt-2">Noch keine Bürokassen erstellt</div>
            <button
              @click="$emit('create-office-register')"
              class="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Erste Bürokasse erstellen
            </button>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Letzte Aktivitäten</h3>
        <div class="space-y-3">
          <div v-for="activity in recentActivities" :key="activity.id" class="flex items-center space-x-3">
            <div class="flex-shrink-0">
              <div :class="getActivityIconClass(activity.type)" class="w-8 h-8 rounded-full flex items-center justify-center">
                <span class="text-sm">{{ getActivityIcon(activity.type) }}</span>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-900">{{ activity.description }}</p>
              <p class="text-xs text-gray-500">{{ formatDateTime(activity.created_at) }}</p>
            </div>
            <div class="text-sm font-medium text-gray-900">
              {{ formatCurrency(activity.amount_rappen) }}
            </div>
          </div>
          
          <div v-if="recentActivities.length === 0" class="text-center py-8 text-gray-500">
            <div class="text-lg">📋</div>
            <div class="text-sm mt-2">Keine aktuellen Aktivitäten</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="bg-white rounded-lg shadow-sm border p-6">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">Schnellstatistiken</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        <div class="text-center">
          <div class="text-xl font-bold text-gray-900">{{ totalCashRegisters }}</div>
          <div class="text-xs text-gray-600">Gesamt Kassen</div>
        </div>
        
        <div class="text-center">
          <div class="text-xl font-bold text-green-600">{{ activeRegisters }}</div>
          <div class="text-xs text-gray-600">Aktive Kassen</div>
        </div>
        
        <div class="text-center">
          <div class="text-xl font-bold text-blue-600">{{ totalStaffAssignments }}</div>
          <div class="text-xs text-gray-600">Staff-Zuweisungen</div>
        </div>
        
        <div class="text-center">
          <div class="text-xl font-bold text-purple-600">{{ pendingTransactions }}</div>
          <div class="text-xs text-gray-600">Offene Transaktionen</div>
        </div>
        
        <div class="text-center">
          <div class="text-xl font-bold text-orange-600">{{ todayMovements }}</div>
          <div class="text-xs text-gray-600">Heute Bewegungen</div>
        </div>
        
        <div class="text-center">
          <div class="text-xl font-bold text-red-600">{{ lowBalanceAlerts }}</div>
          <div class="text-xs text-gray-600">Niedrige Bestände</div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Props {
  officeRegisters: any[]
  instructorCount: number
  totalOfficeBalance: number
}

const props = defineProps<Props>()

// State
const recentActivities = ref<any[]>([])
const pendingTransactions = ref(0)
const todayMovements = ref(0)
const todayTransactions = ref(0)
const todayAmount = ref(0)

// Computed
const totalBalance = computed(() => {
  return props.totalOfficeBalance // + instructor balance (would need to be passed)
})

const officeBalance = computed(() => props.totalOfficeBalance)
const instructorBalance = computed(() => 0) // TODO: Calculate from instructor balances

const totalCashRegisters = computed(() => props.officeRegisters.length + props.instructorCount)
const activeRegisters = computed(() => props.officeRegisters.filter(r => r.is_active).length)

const totalStaffAssignments = computed(() => {
  return props.officeRegisters.reduce((sum, register) => sum + register.assigned_staff.length, 0)
})

const lowBalanceAlerts = computed(() => {
  // Registers with balance < CHF 100
  return props.officeRegisters.filter(r => r.current_balance_rappen < 10000).length
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

const getRegisterIcon = (type: string): string => {
  const icons = {
    office: '🏢',
    reception: '🏪',
    exam: '📋',
    emergency: '🚨'
  }
  return icons[type] || '🏢'
}

const getActivityIcon = (type: string): string => {
  const icons = {
    deposit: '💰',
    withdrawal: '💸',
    transfer: '🔄',
    confirmation: '✅'
  }
  return icons[type] || '💱'
}

const getActivityIconClass = (type: string): string => {
  const classes = {
    deposit: 'bg-green-100 text-green-600',
    withdrawal: 'bg-red-100 text-red-600',
    transfer: 'bg-blue-100 text-blue-600',
    confirmation: 'bg-green-100 text-green-600'
  }
  return classes[type] || 'bg-gray-100 text-gray-600'
}

// Load recent activities
const loadRecentActivities = async () => {
  try {
    // Mock data for now - in real implementation, load from cash_movements
    recentActivities.value = [
      {
        id: '1',
        type: 'deposit',
        description: 'Geld eingezahlt in Hauptkasse',
        amount_rappen: 20000,
        created_at: new Date().toISOString()
      }
    ]
  } catch (err) {
    console.error('Error loading recent activities:', err)
  }
}

// Lifecycle
onMounted(async () => {
  await loadRecentActivities()
})
</script>

<style scoped>
/* Tab transition animations */
.tab-content {
  min-height: 400px;
}
</style>













