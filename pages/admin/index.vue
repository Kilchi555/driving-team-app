<template>
  <div class="p-4">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <!-- Main Dashboard Content -->
    <div v-else class="space-y-8">
      
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Total Revenue Today -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Umsatz heute</p>
              <p class="text-2xl font-bold text-green-600">
                CHF {{ (stats.todayRevenue / 100).toFixed(2) }}
              </p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span class="text-green-600 text-xl">💰</span>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            {{ stats.todayLessons }} Fahrstunden heute
          </p>
        </div>

        <!-- Active Users -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Aktive Benutzer</p>
              <p class="text-2xl font-bold text-blue-600">{{ stats.activeUsers }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span class="text-blue-600 text-xl">👥</span>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            {{ stats.newUsersThisWeek }} neue diese Woche
          </p>
        </div>

        <!-- Pending Payments -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Offene Zahlungen</p>
              <p class="text-2xl font-bold text-orange-600">{{ stats.pendingPayments }}</p>
            </div>
            <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span class="text-orange-600 text-xl">⏳</span>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            CHF {{ (stats.pendingAmount / 100).toFixed(2) }} ausstehend
          </p>
        </div>

        <!-- Upcoming Appointments -->
        <div class="bg-white rounded-lg shadow-sm border p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Termine heute</p>
              <p class="text-2xl font-bold text-purple-600">{{ stats.todayAppointments }}</p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span class="text-purple-600 text-xl">📅</span>
            </div>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            {{ stats.tomorrowAppointments }} morgen geplant
          </p>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Revenue Chart -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">
              📈 Umsatz letzte 7 Tage
            </h3>
          </div>
          <div class="p-6">
            <div class="h-64 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <div class="text-4xl mb-2">📊</div>
                <div>Chart wird geladen...</div>
                <div class="text-sm mt-2">Total 7 Tage: CHF {{ (stats.weekRevenue / 100).toFixed(2) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Category Distribution -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">
              🚗 Beliebteste Kategorien
            </h3>
          </div>
          <div class="p-6">
            <div class="space-y-4">
              <div v-for="category in stats.topCategories" :key="category.code" 
                   class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-full" 
                       :style="{ backgroundColor: category.color || '#3B82F6' }"></div>
                  <span class="font-medium">{{ category.code }}</span>
                </div>
                <div class="text-right">
                  <div class="font-semibold">{{ category.count }}</div>
                  <div class="text-xs text-gray-500">Termine</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900">
              🕒 Letzte Aktivitäten
            </h3>
            <NuxtLink to="/admin/payment-overview" 
                      class="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Alle anzeigen →
            </NuxtLink>
          </div>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div v-for="activity in recentActivities" :key="activity.id" 
                 class="flex items-center gap-4 py-3 border-b border-gray-100 last:border-b-0">
              <div class="w-10 h-10 rounded-full flex items-center justify-center"
                   :class="activity.type === 'payment' ? 'bg-green-100' : 
                          activity.type === 'booking' ? 'bg-blue-100' : 'bg-gray-100'">
                <span class="text-sm">{{ activity.icon }}</span>
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">{{ activity.title }}</p>
                <p class="text-xs text-gray-500">{{ activity.description }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium text-gray-900">{{ activity.amount }}</p>
                <p class="text-xs text-gray-500">{{ activity.time }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { definePageMeta } from '#imports'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString } from '~/utils/dateUtils'

definePageMeta({
  layout: 'admin',
  middleware: ['auth'] 
})

// Types
interface DashboardStats {
  todayRevenue: number
  todayLessons: number
  weekRevenue: number
  activeUsers: number
  newUsersThisWeek: number
  pendingPayments: number
  pendingAmount: number
  todayAppointments: number
  tomorrowAppointments: number
  topCategories: CategoryStat[]
}

interface CategoryStat {
  code: string
  count: number
  color: string
}

interface Activity {
  id: number
  type: string
  icon: string
  title: string
  description: string
  amount: string
  time: string
}

// State
const isLoading = ref(true)
const supabase = getSupabase()

const stats = ref<DashboardStats>({
  todayRevenue: 0,
  todayLessons: 0,
  weekRevenue: 0,
  activeUsers: 0,
  newUsersThisWeek: 0,
  pendingPayments: 0,
  pendingAmount: 0,
  todayAppointments: 0,
  tomorrowAppointments: 0,
  topCategories: []
})

const recentActivities = ref<Activity[]>([
  {
    id: 1,
    type: 'payment',
    icon: '💰',
    title: 'Zahlung erhalten',
    description: 'Max Mustermann - Kategorie B',
    amount: 'CHF 95.00',
    time: 'vor 2h'
  },
  {
    id: 2,
    type: 'booking',
    icon: '📅',
    title: 'Neuer Termin gebucht',
    description: 'Anna Schmidt - Kategorie C',
    amount: 'CHF 170.00',
    time: 'vor 4h'
  },
  {
    id: 3,
    type: 'user',
    icon: '👤',
    title: 'Neuer Benutzer registriert',
    description: 'Peter Weber',
    amount: '',
    time: 'vor 1d'
  }
])

// Methods
const loadDashboardStats = async () => {
  try {
    console.log('🔄 Loading dashboard statistics...')
    
    // Get today's date range
    const today = new Date()
    const todayStart = toLocalTimeString(new Date(today.setHours(0, 0, 0, 0)))
    const todayEnd = toLocalTimeString(new Date(today.setHours(23, 59, 59, 999)))
    
    // Get week range
    const weekStart = toLocalTimeString(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))
    
    // Load various stats in parallel
    const [
      paymentsResponse,
      usersResponse,
      appointmentsResponse
    ] = await Promise.all([
      // Today's payments
      supabase
        .from('payments')
        .select('total_amount_rappen')
        .eq('payment_status', 'completed')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd),
      
      // Active users
      supabase
        .from('users')
        .select('id, created_at')
        .eq('is_active', true),
      
      // Today's appointments
      supabase
        .from('appointments')
        .select('id, start_time, type')
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd)
    ])

    // Process results
    if (paymentsResponse.data) {
      stats.value.todayRevenue = paymentsResponse.data.reduce((sum, p) => sum + (p.total_amount_rappen || 0), 0)
      stats.value.todayLessons = paymentsResponse.data.length
    }

    if (usersResponse.data) {
      stats.value.activeUsers = usersResponse.data.length
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      stats.value.newUsersThisWeek = usersResponse.data.filter(
        u => new Date(u.created_at) > weekAgo
      ).length
    }

    if (appointmentsResponse.data) {
      stats.value.todayAppointments = appointmentsResponse.data.length
      
      // Count tomorrow's appointments
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const tomorrowStart = toLocalTimeString(new Date(tomorrow.setHours(0, 0, 0, 0)))
      const tomorrowEnd = toLocalTimeString(new Date(tomorrow.setHours(23, 59, 59, 999)))
      
      const { data: tomorrowAppts } = await supabase
        .from('appointments')
        .select('id')
        .gte('start_time', tomorrowStart)
        .lte('start_time', tomorrowEnd)
      
      stats.value.tomorrowAppointments = tomorrowAppts?.length || 0
      
      // Top categories from appointments
      const categoryCount = appointmentsResponse.data.reduce((acc, apt) => {
        acc[apt.type] = (acc[apt.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      stats.value.topCategories = Object.entries(categoryCount)
        .map(([code, count]) => ({ 
          code, 
          count: count as number, 
          color: getCategoryColor(code) 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    }

    // Get pending payments
    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('total_amount_rappen')
      .eq('payment_status', 'pending')

    if (pendingPayments) {
      stats.value.pendingPayments = pendingPayments.length
      stats.value.pendingAmount = pendingPayments.reduce((sum, p) => sum + (p.total_amount_rappen || 0), 0)
    }

    console.log('✅ Dashboard stats loaded:', stats.value)

  } catch (error) {
    console.error('❌ Error loading dashboard stats:', error)
  } finally {
    isLoading.value = false
  }
}

const getCategoryColor = (categoryCode: string): string => {
  const colors: Record<string, string> = {
    'B': '#10B981',
    'A': '#3B82F6', 
    'A1': '#3B82F6',
    'C': '#F59E0B',
    'CE': '#EF4444',
    'D': '#8B5CF6'
  }
  return colors[categoryCode] || '#6B7280'
}

// Lifecycle
onMounted(() => {
  loadDashboardStats()
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.transition-colors {
  transition: all 0.2s ease-in-out;
}
</style>