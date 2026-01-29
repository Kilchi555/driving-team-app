<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Stundenübersicht</h1>
      <p class="text-gray-600">Übersicht über die Arbeitsstunden der Fahrlehrer</p>
    </div>

    <!-- Filter Controls -->
    <div class="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Jahr</label>
          <select v-model="selectedYear" @change="onYearChange" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Monat</label>
          <select v-model="selectedMonth" @change="onMonthChange" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">Ganzes Jahr</option>
            <option v-for="(month, index) in monthNames" :key="index" :value="index">{{ month }}</option>
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Von</label>
          <input v-model="customStartDate" type="date" @change="onCustomDateChange" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Bis</label>
          <input v-model="customEndDate" type="date" @change="onCustomDateChange" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        
        <div class="flex items-end">
          <button @click="loadStaffHours" :disabled="isLoading" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {{ isLoading ? 'Lade...' : 'Aktualisieren' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-600">Lade Stundenübersicht...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
      <div class="flex">
        <div class="text-red-400 mr-3">⚠️</div>
        <div>
          <h3 class="text-red-800 font-medium">Fehler beim Laden der Daten</h3>
          <p class="text-red-700 mt-1">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="text-3xl text-blue-500 mr-4">👥</div>
            <div>
              <p class="text-sm font-medium text-gray-600">Aktive Fahrlehrer</p>
              <p class="text-2xl font-bold text-gray-900">{{ summary.activeStaff }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="text-3xl text-green-500 mr-4">⏱️</div>
            <div>
              <p class="text-sm font-medium text-gray-600">Gesamtstunden</p>
              <p class="text-2xl font-bold text-gray-900">{{ formatHours(summary.totalHours) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="text-3xl text-orange-500 mr-4">📚</div>
            <div>
              <p class="text-sm font-medium text-gray-600">Durchschnitt pro Fahrlehrer</p>
              <p class="text-2xl font-bold text-gray-900">{{ formatHours(summary.averageHours) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg shadow p-6">
          <div class="flex items-center">
            <div class="text-3xl text-purple-500 mr-4">🎯</div>
            <div>
              <p class="text-sm font-medium text-gray-600">Termine gesamt</p>
              <p class="text-2xl font-bold text-gray-900">{{ summary.totalAppointments }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Staff Hours Table -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900">
              Fahrlehrer-Stunden {{ selectedYear }}{{ selectedMonth !== 'all' ? ` - ${monthNames[selectedMonth]}` : '' }}
            </h2>
            <div class="flex items-center space-x-3">
              <span class="text-sm font-medium text-gray-700">Monatsübersicht</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  :checked="showDetailedView"
                  @change="toggleView"
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span class="ml-3 text-sm font-medium text-gray-700">Jahresübersicht</span>
              </label>
            </div>
          </div>
        </div>
        
        <div v-if="staffHours.length === 0" class="text-center py-8 text-gray-500">
          Keine Daten für den ausgewählten Zeitraum verfügbar
        </div>
        
        <!-- Simple View -->
        <div v-else-if="!showDetailedView" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Fahrlehrer
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th v-for="category in availableCategories" :key="category.code" class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {{ category.code }}
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  VKU
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NHK
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PGS
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  FL-WB
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rest
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abgesagt
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="staff in staffHours" :key="staff.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span class="text-sm font-medium text-blue-600">
                          {{ getInitials(staff.first_name, staff.last_name) }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ staff.first_name }} {{ staff.last_name }}
                      </div>
                      <div class="text-sm text-gray-500">{{ staff.email }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-semibold">
                  {{ formatHours(staff.total_hours) }}
                </td>
                <td v-for="category in availableCategories" :key="category.code" class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {{ formatHours(staff.category_stats?.[category.code]?.hours || 0) }}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {{ formatHours(staff.vku_hours || 0) }}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {{ formatHours(staff.nhk_hours || 0) }}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {{ formatHours(staff.pgs_hours || 0) }}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {{ formatHours(staff.fl_wb_hours || 0) }}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {{ formatHours(staff.rest_hours || 0) }}
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {{ formatHours(staff.cancelled_hours) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Year Overview -->
        <div v-else class="overflow-x-auto">
          <div class="px-6 py-3 bg-blue-50 border-b border-blue-200">
            <h3 class="text-sm font-medium text-blue-800">Jahresübersicht {{ selectedYear }}</h3>
          </div>
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">Fahrlehrer</th>
                <th v-for="month in months" :key="month" class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                  {{ month }}
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100 font-bold">Total</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="staff in staffHours" :key="staff.id" class="hover:bg-gray-50">
                <td class="px-4 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-8 w-8">
                      <div class="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span class="text-sm font-medium text-gray-700">
                          {{ getInitials(staff.first_name, staff.last_name) }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-3">
                      <div class="text-sm font-medium text-gray-900">
                        {{ staff.first_name }} {{ staff.last_name }}
                      </div>
                    </div>
                  </div>
                </td>
                <td v-for="month in months" :key="month" class="px-3 py-4 text-center text-sm text-gray-900">
                  {{ getStaffHoursForMonth(staff, month) }}
                </td>
                <td class="px-4 py-4 text-center text-sm font-bold text-gray-900 bg-gray-50">
                  {{ staff.total_hours.toFixed(1) }}h
                </td>
              </tr>
              <!-- Total Row -->
              <tr class="bg-gray-100 font-bold">
                <td class="px-4 py-4 whitespace-nowrap sticky left-0 bg-gray-100 z-10">
                  <div class="text-sm font-medium text-gray-900">Total</div>
                </td>
                <td v-for="month in months" :key="month" class="px-3 py-4 text-center text-sm text-gray-900">
                  {{ getTotalHoursForMonth(month) }}
                </td>
                <td class="px-4 py-4 text-center text-sm text-gray-900 bg-gray-200">
                  {{ getGrandTotal() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, onMounted, computed } from 'vue'
import { navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'
// ✅ Using secure API instead of direct Supabase

// Meta
definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

// Composables - using secure API (no direct Supabase)

// State
const isLoading = ref(false)
const error = ref<string | null>(null)
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref('all')
const originalSelectedMonth = ref('all') // Store original month selection
const customStartDate = ref('')
const customEndDate = ref('')
const showDetailedView = ref(false)
const staffHours = ref<any[]>([])
const staffMonthlyHours = ref<Record<string, Record<string, number>>>({})
const availableCategories = ref<any[]>([])
const summary = ref({
  activeStaff: 0,
  totalHours: 0,
  averageHours: 0,
  totalAppointments: 0
})

// Month names for the year overview
const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

// Available years (current year and 2 years back)
const availableYears = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1]
})

// Computed
const dateRange = computed(() => {
  return {
    start: customStartDate.value ? new Date(customStartDate.value).toISOString() : '',
    end: customEndDate.value ? new Date(customEndDate.value + 'T23:59:59').toISOString() : ''
  }
})

// Methods
const onYearChange = () => {
  updateDateRange()
  loadStaffHours() // Reload data for the new year
}

const onMonthChange = () => {
  // Store the original month selection
  originalSelectedMonth.value = selectedMonth.value
  
  updateDateRange()
  
  // If selecting a specific month (not "all"), switch to simple view
  if (selectedMonth.value !== 'all') {
    showDetailedView.value = false
  }
  
  loadStaffHours()
}

const onCustomDateChange = () => {
  // When manually changing dates, switch to simple view
  showDetailedView.value = false
  loadStaffHours()
}

const toggleView = () => {
  showDetailedView.value = !showDetailedView.value
  
  if (showDetailedView.value) {
    // Switching to year overview - set filters to show whole year
    selectedMonth.value = 'all'
    updateDateRange()
  } else {
    // Switching to simple view - restore original month selection
    selectedMonth.value = originalSelectedMonth.value
    updateDateRange()
  }
  
  // Reload data after view change
  loadStaffHours()
}

const updateDateRange = () => {
  const year = selectedYear.value
  const month = selectedMonth.value
  
  if (month === 'all') {
    // Whole year - use local date formatting to avoid timezone issues
    customStartDate.value = `${year}-01-01`
    customEndDate.value = `${year}-12-31`
  } else {
    // Specific month - use local date formatting
    const monthNum = parseInt(month)
    const monthStr = String(monthNum + 1).padStart(2, '0')
    const lastDay = new Date(year, monthNum + 1, 0).getDate()
    
    customStartDate.value = `${year}-${monthStr}-01`
    customEndDate.value = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`
  }
}

const loadStaffHours = async () => {
  try {
    isLoading.value = true
    error.value = null

    const { start, end } = dateRange.value
    if (!start || !end) {
      throw new Error('Bitte wählen Sie einen gültigen Zeitraum')
    }

    logger.debug('🔍 Loading staff hours via secure API')

    // ✅ Use secure backend API instead of direct Supabase queries
    const response = await $fetch('/api/admin/get-staff-hours', {
      query: {
        startDate: start,
        endDate: end
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to load staff hours')
    }

    // Use the response data directly
    staffHours.value = response.staffWithHours || []
    staffMonthlyHours.value = response.staffMonthlyHours || {}
    availableCategories.value = response.availableCategories || []
    summary.value = response.summary || {
      activeStaff: 0,
      totalHours: 0,
      averageHours: 0,
      totalAppointments: 0
    }

    logger.debug('✅ Staff hours loaded via API:', staffHours.value.length, 'staff members')

  } catch (err: any) {
    console.error('❌ Error loading staff hours:', err)
    error.value = err.message || 'Fehler beim Laden der Stundenübersicht'
  } finally {
    isLoading.value = false
  }
}

// Utility functions
const formatHours = (hours: number) => {
  if (hours === 0) return '0h'
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  return minutes > 0 ? `${wholeHours}h ${minutes}m` : `${wholeHours}h`
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Keine'
  return new Date(dateString).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

// Helper functions for year overview
const getStaffHoursForMonth = (staff: any, month: string) => {
  const monthlyHours = staffMonthlyHours.value[staff.id]
  if (!monthlyHours || !monthlyHours[month]) return '0.0h'
  return `${monthlyHours[month].toFixed(1)}h`
}

const getTotalHoursForMonth = (month: string) => {
  const total = staffHours.value.reduce((sum, staff) => {
    const monthlyHours = staffMonthlyHours.value[staff.id]
    return sum + (monthlyHours?.[month] || 0)
  }, 0)
  return `${total.toFixed(1)}h`
}

const getGrandTotal = () => {
  const total = staffHours.value.reduce((sum, staff) => sum + staff.total_hours, 0)
  return `${total.toFixed(1)}h`
}

// Auth check
const authStore = useAuthStore()

// Initialize
onMounted(async () => {
  logger.debug('🔍 Staff hours page mounted, checking auth...')
  
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
  
  logger.debug('✅ Auth check passed, loading staff hours...')
  
  // Original onMounted logic
  // Set default values
  const now = new Date()
  selectedYear.value = now.getFullYear()
  selectedMonth.value = now.getMonth().toString()
  
  // Initialize original month selection
  originalSelectedMonth.value = selectedMonth.value
  
  // Update date range based on initial selection
  updateDateRange()
  
  loadStaffHours()
})
</script>
