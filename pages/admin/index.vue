<template>
  <div class="p-4">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="text-center">
        <LoadingLogo size="lg" />
        <p class="text-gray-600 mt-4">Dashboard wird geladen...</p>
      </div>
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
        <!-- Recent Invoices Overview -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">
              📄 Kürzlich erstellte Rechnungen
            </h3>
          </div>
          <div class="p-6">
            <div v-if="isLoadingInvoices" class="h-64 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <LoadingLogo size="lg" />
                <div class="mt-2">Rechnungen werden geladen...</div>
              </div>
            </div>
            <div v-else-if="recentInvoices.length === 0" class="h-64 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <div class="text-4xl mb-2">📄</div>
                <div>Keine Rechnungen in den letzten 2 Wochen</div>
                <div class="text-sm mt-1 text-gray-400">(diese Woche + letzte Woche)</div>
              </div>
            </div>
            <div v-else class="space-y-4">
              <!-- This Week -->
              <div class="border-b border-gray-100 pb-3">
                <h4 class="text-sm font-medium text-gray-700 mb-2">📅 Diese Woche</h4>
                <div class="space-y-2">
                  <div v-for="invoice in thisWeekInvoices" :key="invoice.id" 
                       class="flex items-center justify-between text-sm">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span class="font-medium">{{ invoice.customer_name }}</span>
                    </div>
                    <div class="text-right">
                      <div class="font-semibold">CHF {{ (invoice.total_amount_rappen / 100).toFixed(2) }}</div>
                      <div class="text-xs text-gray-500">{{ formatDate(invoice.created_at) }}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Last Week -->
              <div>
                <h4 class="text-sm font-medium text-gray-700 mb-2">📅 Letzte Woche</h4>
                <div class="space-y-2">
                  <div v-for="invoice in lastWeekInvoices" :key="invoice.id" 
                       class="flex items-center justify-between text-sm">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span class="font-medium">{{ invoice.customer_name }}</span>
                    </div>
                    <div class="text-right">
                      <div class="font-semibold">CHF {{ (invoice.total_amount_rappen / 100).toFixed(2) }}</div>
                      <div class="text-xs text-gray-500">{{ formatDate(invoice.created_at) }}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Summary -->
              <div class="pt-3 border-t border-gray-100">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Diese Woche:</span>
                  <span class="font-semibold text-green-600">CHF {{ (thisWeekTotal / 100).toFixed(2) }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Letzte Woche:</span>
                  <span class="font-semibold text-blue-600">CHF {{ (lastWeekTotal / 100).toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Students with Unpaid Lessons -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="px-6 py-4 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-gray-900">
              💰 Fahrschüler mit unbezahlten Lektionen
            </h3>
          </div>
          <div class="p-6">
            <div v-if="isLoadingUnpaidStudents" class="h-64 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <LoadingLogo size="lg" />
                <div class="mt-2">Wird geladen...</div>
              </div>
            </div>
            <div v-else-if="unpaidStudents.length === 0" class="h-64 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <div class="text-4xl mb-2">✅</div>
                <div>Alle Lektionen sind bezahlt!</div>
              </div>
            </div>
            <div v-else class="space-y-4">
              <div v-for="student in unpaidStudents" :key="student.id" 
                   class="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <span class="text-red-600 font-semibold text-sm">
                      {{ student.first_name?.charAt(0) }}{{ student.last_name?.charAt(0) }}
                    </span>
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{{ student.first_name }} {{ student.last_name }}</div>
                    <div class="text-sm text-gray-500">{{ student.email }}</div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="font-semibold text-red-600">{{ student.unpaid_lessons_count }}</div>
                  <div class="text-xs text-gray-500">Unbezahlte Lektionen</div>
                  <div class="text-xs text-gray-500">CHF {{ (student.total_unpaid_amount / 100).toFixed(2) }}</div>
                </div>
              </div>
              
              <!-- Summary -->
              <div class="pt-3 border-t border-gray-100">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Gesamt unbezahlte Lektionen:</span>
                  <span class="font-semibold text-red-600">{{ totalUnpaidLessons }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Gesamt unbezahlter Betrag:</span>
                  <span class="font-semibold text-red-600">CHF {{ (totalUnpaidAmount / 100).toFixed(2) }}</span>
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
                          activity.type === 'pending_payment' ? 'bg-orange-100' :
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
import { ref, onMounted, computed } from 'vue'
import { definePageMeta } from '#imports'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString, formatDate } from '~/utils/dateUtils'
import LoadingLogo from '~/components/LoadingLogo.vue'

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

interface Invoice {
  id: string
  customer_name: string
  total_amount_rappen: number
  created_at: string
  status: string
}

interface UnpaidStudent {
  id: string
  first_name: string
  last_name: string
  email: string
  unpaid_lessons_count: number
  total_unpaid_amount: number
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

const recentActivities = ref<Activity[]>([])

// Function to load recent activities including pending payments
const loadRecentActivities = async () => {
  try {
    console.log('🔄 Loading recent activities...')
    
    // Get recent pending payments
    const { data: pendingPayments, error: pendingError } = await supabase
      .from('payments')
      .select(`
        id,
        total_amount_rappen,
        payment_method,
        created_at,
        user_id
      `)
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (pendingError) {
      console.error('❌ Error loading pending payments for activities:', pendingError)
    }
    
    // Get user names for pending payments
    const userIds = [...new Set((pendingPayments || []).map(p => p.user_id).filter(Boolean))]
    let userNames: Record<string, string> = {}
    
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds)
      
      if (!usersError && users) {
        userNames = users.reduce((acc, user) => {
          acc[user.id] = `${user.first_name || ''} ${user.last_name || ''}`.trim()
          return acc
        }, {} as Record<string, string>)
      }
    }
    
    // Transform pending payments to activities
    const pendingActivities = (pendingPayments || []).map((payment, index) => ({
      id: index + 1,
      type: 'pending_payment',
      icon: '⏳',
      title: 'Ausstehende Zahlung',
      description: `${userNames[payment.user_id] || 'Unbekannter Benutzer'} - ${payment.payment_method}`,
      amount: `CHF ${(payment.total_amount_rappen / 100).toFixed(2)}`,
      time: formatDate(payment.created_at)
    }))
    
    // Add some static activities for now (can be expanded later)
    const staticActivities: Activity[] = [
      {
        id: pendingActivities.length + 1,
        type: 'info',
        icon: 'ℹ️',
        title: 'Dashboard aktualisiert',
        description: 'Alle Daten wurden erfolgreich geladen',
        amount: '',
        time: 'Gerade eben'
      }
    ]
    
    recentActivities.value = [...pendingActivities, ...staticActivities]
    console.log('✅ Recent activities loaded:', recentActivities.value.length)
  } catch (error) {
    console.error('❌ Error loading recent activities:', error)
  }
}

// Invoice state
const isLoadingInvoices = ref(false)
const recentInvoices = ref<Invoice[]>([])

// Unpaid students state
const isLoadingUnpaidStudents = ref(false)
const unpaidStudents = ref<UnpaidStudent[]>([])

// Computed properties for invoices
const thisWeekInvoices = computed(() => {
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return recentInvoices.value.filter(invoice => 
    new Date(invoice.created_at) >= weekStart
  )
})

const lastWeekInvoices = computed(() => {
  const now = new Date()
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  return recentInvoices.value.filter(invoice => {
    const invoiceDate = new Date(invoice.created_at)
    return invoiceDate >= twoWeeksAgo && invoiceDate < weekStart
  })
})

const thisWeekTotal = computed(() => 
  thisWeekInvoices.value.reduce((sum, invoice) => sum + invoice.total_amount_rappen, 0)
)

const lastWeekTotal = computed(() => 
  lastWeekInvoices.value.reduce((sum, invoice) => sum + invoice.total_amount_rappen, 0)
)

// Computed properties for unpaid students
const totalUnpaidLessons = computed(() => 
  unpaidStudents.value.reduce((sum, student) => sum + student.unpaid_lessons_count, 0)
)

const totalUnpaidAmount = computed(() => 
  unpaidStudents.value.reduce((sum, student) => sum + student.total_unpaid_amount, 0)
)

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
    const { data: pendingPayments, error: pendingError } = await supabase
      .from('payments')
      .select('total_amount_rappen, payment_method, created_at')
      .eq('payment_status', 'pending')

    if (pendingError) {
      console.error('❌ Error loading pending payments:', pendingError)
    } else if (pendingPayments) {
      stats.value.pendingPayments = pendingPayments.length
      stats.value.pendingAmount = pendingPayments.reduce((sum, p) => sum + (p.total_amount_rappen || 0), 0)
      console.log('💰 Pending payments loaded:', pendingPayments.length, 'payments, total amount:', stats.value.pendingAmount)
    }

    console.log('✅ Dashboard stats loaded:', stats.value)
    
    // Load recent invoices
    await loadRecentInvoices()
    
    // Load unpaid students
    await loadUnpaidStudents()
    
    // Load recent activities
    await loadRecentActivities()

  } catch (error) {
    console.error('❌ Error loading dashboard stats:', error)
  } finally {
    isLoading.value = false
  }
}

const loadRecentInvoices = async () => {
  try {
    isLoadingInvoices.value = true
    console.log('🔄 Loading recent invoices...')
    
    // Get invoices from the last 2 weeks
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const twoWeeksAgoStr = toLocalTimeString(twoWeeksAgo)
    
    const { data: invoices, error } = await supabase
      .from('payments')
      .select(`
        id,
        total_amount_rappen,
        created_at,
        payment_status,
        user_id
      `)
      .eq('payment_method', 'invoice')
      .gte('created_at', twoWeeksAgoStr)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Get user names for the invoices
    const userIds = [...new Set((invoices || []).map(invoice => invoice.user_id).filter(Boolean))]
    let userNames: Record<string, string> = {}
    
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds)
      
      if (!usersError && users) {
        userNames = users.reduce((acc, user) => {
          acc[user.id] = `${user.first_name || ''} ${user.last_name || ''}`.trim()
          return acc
        }, {} as Record<string, string>)
      }
    }
    
    // Transform the data to match our Invoice interface
    recentInvoices.value = (invoices || []).map(invoice => ({
      id: invoice.id,
      customer_name: userNames[invoice.user_id] || 'Unbekannter Kunde',
      total_amount_rappen: invoice.total_amount_rappen || 0,
      created_at: invoice.created_at,
      status: invoice.payment_status
    }))
    
    console.log('✅ Recent invoices loaded:', recentInvoices.value.length)
  } catch (error) {
    console.error('❌ Error loading recent invoices:', error)
  } finally {
    isLoadingInvoices.value = false
  }
}

const loadUnpaidStudents = async () => {
  try {
    isLoadingUnpaidStudents.value = true
    console.log('🔄 Loading unpaid students...')
    
    // Get completed appointments
    const { data: completedAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        user_id,
        start_time
      `)
      .eq('status', 'completed')
      .is('deleted_at', null)
    
    if (appointmentsError) throw appointmentsError
    
    if (!completedAppointments || completedAppointments.length === 0) {
      unpaidStudents.value = []
      return
    }
    
    // Get all payments for these appointments
    const appointmentIds = completedAppointments.map(apt => apt.id)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        appointment_id,
        total_amount_rappen,
        payment_status
      `)
      .in('appointment_id', appointmentIds)
    
    if (paymentsError) throw paymentsError
    
    // Group payments by appointment
    const paymentsByAppointment = (payments || []).reduce((acc, payment) => {
      if (!acc[payment.appointment_id]) {
        acc[payment.appointment_id] = []
      }
      acc[payment.appointment_id].push(payment)
      return acc
    }, {} as Record<string, any[]>)
    
    // Find appointments without completed payments (but allow pending payments)
    // FIXED: Only consider appointments as "unpaid" if they have NO payments at all
    // or only failed payments. Pending payments should NOT be considered unpaid.
    const unpaidAppointments = completedAppointments.filter(apt => {
      const appointmentPayments = paymentsByAppointment[apt.id] || []
      
      // If no payments at all, it's unpaid
      if (appointmentPayments.length === 0) {
        return true
      }
      
      // If has payments, check if ALL are failed (not pending or completed)
      const hasActivePayment = appointmentPayments.some(p => 
        p.payment_status === 'completed' || p.payment_status === 'pending'
      )
      
      return !hasActivePayment
    })
    
    console.log('🔍 Debug unpaid logic:')
    console.log('- Total completed appointments:', completedAppointments.length)
    console.log('- Appointments with payments:', Object.keys(paymentsByAppointment).length)
    console.log('- Truly unpaid appointments:', unpaidAppointments.length)
    
    if (unpaidAppointments.length === 0) {
      unpaidStudents.value = []
      return
    }
    
    // Get user names for the unpaid appointments
    const userIds = [...new Set(unpaidAppointments.map(apt => apt.user_id).filter(Boolean))]
    let userNames: Record<string, { first_name: string, last_name: string, email: string }> = {}
    
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .in('id', userIds)
      
      if (!usersError && users) {
        userNames = users.reduce((acc, user) => {
          acc[user.id] = {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || ''
          }
          return acc
        }, {} as Record<string, { first_name: string, last_name: string, email: string }>)
      }
    }
    
    // Group by student and calculate totals
    const studentMap = new Map<string, UnpaidStudent>()
    
    unpaidAppointments.forEach(apt => {
      const userId = apt.user_id
      const existing = studentMap.get(userId)
      const userInfo = userNames[userId] || { first_name: '', last_name: '', email: '' }
      
      // Get the total amount for this appointment from payments (failed payments)
      const appointmentPayments = paymentsByAppointment[apt.id] || []
      const totalAmount = appointmentPayments.reduce((sum, p) => sum + (p.total_amount_rappen || 0), 0)
      
      if (existing) {
        existing.unpaid_lessons_count += 1
        existing.total_unpaid_amount += totalAmount
      } else {
        studentMap.set(userId, {
          id: userId,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          email: userInfo.email,
          unpaid_lessons_count: 1,
          total_unpaid_amount: totalAmount
        })
      }
    })
    
    // Convert to array and sort by unpaid amount (highest first)
    unpaidStudents.value = Array.from(studentMap.values())
      .sort((a, b) => b.total_unpaid_amount - a.total_unpaid_amount)
      .slice(0, 10) // Show top 10
    
    console.log('✅ Unpaid students loaded:', unpaidStudents.value.length)
  } catch (error) {
    console.error('❌ Error loading unpaid students:', error)
  } finally {
    isLoadingUnpaidStudents.value = false
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