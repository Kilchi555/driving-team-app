<template>
  <div class="p-4">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="text-center">
        <LoadingLogo size="lg" :tenant-id="currentUser?.tenant_id" />
        <p class="text-gray-600 mt-4">Dashboard wird geladen...</p>
      </div>
    </div>

    <!-- Main Dashboard Content -->
    <div v-else class="space-y-8">

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
                <LoadingLogo size="lg" :tenant-id="currentUser?.tenant_id" />
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
                      <span class="font-medium text-green-600">{{ invoice.customer_name }}</span>
                    </div>
                    <div class="text-right">
                      <div class="font-semibold text-green-600">CHF {{ (invoice.total_amount_rappen / 100).toFixed(2) }}</div>
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
                      <span class="font-medium text-green-600">{{ invoice.customer_name }}</span>
                    </div>
                    <div class="text-right">
                      <div class="font-semibold text-green-600">CHF {{ (invoice.total_amount_rappen / 100).toFixed(2) }}</div>
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

        <!-- Students with Most Pending Payments -->
        <div class="bg-white rounded-lg shadow-sm border">
          <div class="px-6 py-4 border-b border-gray-200">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900">
                Meiste ausstehende Zahlungen
              </h3>
              <button 
                @click="showPendingStudentsModal = true"
                class="px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
              >
                Alle anzeigen
              </button>
            </div>
          </div>
          <div class="p-6">
            <div v-if="isLoadingPendingStudents" class="h-64 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <LoadingLogo size="lg" :tenant-id="currentUser?.tenant_id" />
                <div class="mt-2">Wird geladen...</div>
              </div>
            </div>
            <div v-else-if="pendingStudents.length === 0" class="h-64 flex items-center justify-center text-gray-500">
              <div class="text-center">
                <div class="text-4xl mb-2">✅</div>
                <div>Keine ausstehenden Zahlungen!</div>
              </div>
            </div>
            <div v-else class="space-y-4">
              <div v-for="student in pendingStudents" :key="student.id" 
                   class="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors"
                   @click="navigateToStudentPayments(student.id)">
                <div class="flex items-center gap-3">
                  <div>
                    <div class="font-medium text-gray-900">{{ student.first_name }} {{ student.last_name }}</div>
                    
                  </div>
                </div>
                <div>
                  <div class="font-semibold text-orange-600">{{ student.pending_payments_count }}</div>
                  <div class="text-xs text-gray-500">CHF {{ (student.total_pending_amount / 100).toFixed(2) }}</div>
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

  <!-- Pending Students Modal -->
  <div v-if="showPendingStudentsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900">
          Alle Schüler mit ausstehenden Zahlungen
        </h2>
        <button 
          @click="showPendingStudentsModal = false"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
        <div v-if="isLoadingPendingStudents" class="flex items-center justify-center py-12">
          <div class="text-center">
            <LoadingLogo size="lg" :tenant-id="currentUser?.tenant_id" />
            <div class="mt-2 text-gray-500">Wird geladen...</div>
          </div>
        </div>
        
        <div v-else-if="pendingStudents.length === 0" class="text-center py-12 text-gray-500">
          <div class="text-4xl mb-2">✅</div>
          <div>Keine ausstehenden Zahlungen gefunden!</div>
        </div>
        
        <div v-else class="space-y-4">
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div class="text-sm text-blue-600 font-medium">Gesamt Schüler</div>
              <div class="text-2xl font-bold text-blue-700">{{ pendingStudents.length }}</div>
            </div>
            <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div class="text-sm text-orange-600 font-medium">Gesamt ausstehende Zahlungen</div>
              <div class="text-2xl font-bold text-orange-700">{{ totalPendingPayments }}</div>
            </div>
            <div class="bg-red-50 p-4 rounded-lg border border-red-200">
              <div class="text-sm text-red-600 font-medium">Gesamt ausstehender Betrag</div>
              <div class="text-2xl font-bold text-red-700">CHF {{ (totalPendingAmount / 100).toFixed(2) }}</div>
            </div>
          </div>

          <!-- Students Table -->
          <div class="bg-gray-50 rounded-lg overflow-hidden">
            <table class="w-full">
              <thead class="bg-gray-100">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schüler</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Mail</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ausstehende Zahlungen</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gesamtbetrag</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aktion</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="student in pendingStudents" :key="student.id" class="hover:bg-gray-50">
                  <td class="px-4 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                        <span class="text-orange-600 font-semibold text-sm">
                          {{ student.first_name?.charAt(0) }}{{ student.last_name?.charAt(0) }}
                        </span>
                      </div>
                      <div>
                        <div class="font-medium text-gray-900">{{ student.first_name }} {{ student.last_name }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ student.email }}
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-center">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {{ student.pending_payments_count }}
                    </span>
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    CHF {{ (student.total_pending_amount / 100).toFixed(2) }}
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-center">
                    <button 
                      @click="navigateToStudentPayments(student.id); showPendingStudentsModal = false"
                      class="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                    >
                      Details anzeigen
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { definePageMeta, navigateTo } from '#imports'
import { getSupabase } from '~/utils/supabase'
import { toLocalTimeString, formatDate } from '~/utils/dateUtils'
import LoadingLogo from '~/components/LoadingLogo.vue'
import { useCurrentUser } from '~/composables/useCurrentUser'

definePageMeta({
  layout: 'admin'
})

// Current User für Tenant-ID
const { currentUser } = useCurrentUser()

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

interface PendingStudent {
  id: string
  first_name: string
  last_name: string
  email: string
  pending_payments_count: number
  total_pending_amount: number
}

// State
const isLoading = ref(false) // Start with false for immediate page display
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
    
    // Get current user's tenant_id
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', currentUser?.id)
      .single()
    
    const tenantId = userProfile?.tenant_id
    if (!tenantId) {
      console.error('❌ User hat keine tenant_id zugewiesen')
      return
    }
    
    // Get recent pending payments - FILTERED BY TENANT
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
      .eq('tenant_id', tenantId)
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
        .eq('tenant_id', tenantId)
      
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

// Pending students state
const isLoadingPendingStudents = ref(false)
const pendingStudents = ref<PendingStudent[]>([])
const showPendingStudentsModal = ref(false)

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

// Computed properties for pending students
const totalPendingPayments = computed(() => 
  pendingStudents.value.reduce((sum, student) => sum + student.pending_payments_count, 0)
)

const totalPendingAmount = computed(() => 
  pendingStudents.value.reduce((sum, student) => sum + student.total_pending_amount, 0)
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
    
    // Get current user's tenant_id for filtering
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
        .eq('auth_user_id', currentUser?.id)
      .single()
    
    const tenantId = userProfile?.tenant_id
    if (!tenantId) {
      console.error('❌ User hat keine tenant_id zugewiesen')
      return
    }
    console.log('🔍 Admin Dashboard - Current tenant_id:', tenantId)

    // Load various stats in parallel - FILTERED BY TENANT
    const [
      paymentsResponse,
      usersResponse,
      appointmentsResponse
    ] = await Promise.all([
      // Today's payments - FILTERED BY TENANT
      supabase
        .from('payments')
        .select('total_amount_rappen')
        .eq('payment_status', 'completed')
        .eq('tenant_id', tenantId)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd),
      
      // Active users - FILTERED BY TENANT
      supabase
        .from('users')
        .select('id, created_at')
        .eq('is_active', true)
        .eq('tenant_id', tenantId),
      
      // Today's appointments - FILTERED BY TENANT
      supabase
        .from('appointments')
        .select('id, start_time, type')
        .eq('tenant_id', tenantId)
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
        .eq('tenant_id', tenantId)
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

    // Get pending payments - FILTERED BY TENANT
    const { data: pendingPayments, error: pendingError } = await supabase
      .from('payments')
      .select('total_amount_rappen, payment_method, created_at')
      .eq('payment_status', 'pending')
      .eq('tenant_id', tenantId)

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
    
    // Load pending students
    await loadPendingStudents()
    
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
    
    // Get current user's tenant_id
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', currentUser?.id)
      .single()
    
    const tenantId = userProfile?.tenant_id
    if (!tenantId) {
      console.error('❌ User hat keine tenant_id zugewiesen')
      return
    }

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
      .eq('tenant_id', tenantId)
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
        .eq('tenant_id', tenantId)
      
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

const loadPendingStudents = async () => {
  try {
    isLoadingPendingStudents.value = true
    console.log('🔄 Loading students with pending payments...')
    
    // Get current user's tenant_id
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', currentUser?.id)
      .single()
    
    const tenantId = userProfile?.tenant_id
    if (!tenantId) {
      console.error('❌ User hat keine tenant_id zugewiesen')
      return
    }
    
    // Get all pending payments - FILTERED BY TENANT
    const { data: pendingPayments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        user_id,
        total_amount_rappen,
        payment_status,
        payment_method,
        created_at
      `)
      .eq('payment_status', 'pending')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    
    if (paymentsError) throw paymentsError
    
    console.log('💳 Found pending payments:', pendingPayments?.length || 0)
    
    if (!pendingPayments || pendingPayments.length === 0) {
      console.log('ℹ️ No pending payments found')
      pendingStudents.value = []
      return
    }
    
    // Get user names for the pending payments
    const userIds = [...new Set(pendingPayments.map(p => p.user_id).filter(Boolean))]
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
    const studentMap = new Map<string, PendingStudent>()
    
    pendingPayments.forEach(payment => {
      const userId = payment.user_id
      const existing = studentMap.get(userId)
      const userInfo = userNames[userId] || { first_name: '', last_name: '', email: '' }
      
      if (existing) {
        existing.pending_payments_count += 1
        existing.total_pending_amount += payment.total_amount_rappen || 0
      } else {
        studentMap.set(userId, {
          id: userId,
          first_name: userInfo.first_name,
          last_name: userInfo.last_name,
          email: userInfo.email,
          pending_payments_count: 1,
          total_pending_amount: payment.total_amount_rappen || 0
        })
      }
    })
    
    // Convert to array and sort by pending amount (highest first)
    pendingStudents.value = Array.from(studentMap.values())
      .sort((a, b) => b.total_pending_amount - a.total_pending_amount)
      .slice(0, 10) // Show top 10
    
    console.log('✅ Pending students loaded:', pendingStudents.value.length, 'students with pending payments')
    console.log('📊 Sample data:', pendingStudents.value.slice(0, 2))
  } catch (error) {
    console.error('❌ Error loading pending students:', error)
  } finally {
    isLoadingPendingStudents.value = false
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

const navigateToStudentPayments = (userId: string) => {
  navigateTo(`/admin/users/${userId}`)
}

// Lifecycle
// Load data immediately when component is created (not waiting for mount)
loadDashboardStats()

onMounted(() => {
  // Page is already displayed, data loads in background
  console.log('📊 Dashboard page mounted, data loading in background')
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