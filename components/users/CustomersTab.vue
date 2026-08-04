<!-- components/users/CustomersTab.vue - Kunden-Tab -->
<template>
  <div class="h-full flex flex-col">
    <!-- Search & Filters -->
    <div class="bg-white border-b p-4">
      <div class="space-y-3">
        <!-- Search Bar -->
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Kunden suchen (Name oder E-Mail)..."
            class="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
        </div>

        <!-- Filter Toggles -->
        <div class="grid grid-cols-3 gap-4 text-sm">
          <!-- Inactive Toggle -->
          <div class="flex items-center gap-3 rounded-lg">
            <span class="text-sm font-medium text-gray-700">
              {{ showInactive ? 'Inaktive' : 'Aktive' }}
            </span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                v-model="showInactive" 
                type="checkbox" 
                class="sr-only peer"
                @change="() => loadCustomers(true)"
              >
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <!-- All Students Toggle (nur für Staff ohne can_view_all_students) -->
          <div v-if="currentUser?.role === 'staff' && !currentUser?.can_view_all_students" class="flex items-center gap-3 rounded-lg">
            <span class="text-sm font-medium text-gray-700">
              {{ showAllStudents ? 'Alle' : 'Meine' }}
            </span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="showAllStudents" type="checkbox" class="sr-only peer" @change="() => loadCustomers(true)">
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <!-- No Upcoming Appointments Toggle -->
          <div class="flex items-center gap-3 rounded-lg">
            <span class="text-sm font-medium text-gray-700">
              {{ showOnlyNoUpcoming ? 'Keine Termine' : 'Termin geplant' }}
            </span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="showOnlyNoUpcoming" type="checkbox" class="sr-only peer" @change="handleNoUpcomingToggle">
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>
        </div>

        <!-- Statistics -->
        <div class="flex gap-3 text-xs sm:text-sm text-gray-600">
          <span v-if="currentUser?.role === 'staff' && !showAllStudents">Meine: {{ customers.length }}</span>
          <span v-else>Alle: {{ customers.length }}</span>
          <span>Aktiv: {{ customers.filter(s => s.is_active).length }}</span>
          <span>Inaktiv: {{ customers.filter(s => !s.is_active).length }}</span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Error Loading Customers -->
      <div v-if="error" class="h-full flex items-center justify-center">
        <div class="text-center max-w-md p-6 bg-red-50 rounded-lg">
          <h3 class="text-lg font-bold text-red-800 mb-2">Fehler beim Laden</h3>
          <p class="text-red-600 mb-4">{{ error }}</p>
          <button 
            @click="() => loadCustomers(true)" 
            class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredCustomers.length === 0" class="h-full flex items-center justify-center">
        <div class="text-center px-4">
          <div class="text-6xl mb-4">👥</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            {{ searchQuery ? 'Keine Kunden gefunden' : 'Noch keine Kunden' }}
          </h3>
        </div>
      </div>

      <!-- Customers List -->
      <div v-else class="h-full overflow-y-auto relative">
        <!-- Loading Overlay -->
        <div v-if="isLoading" class="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
          <div class="text-center">
            <LoadingLogo size="xl" />
            <p class="text-gray-600 mt-4">Lade Kunden...</p>
          </div>
        </div>
        
        <!-- Mobile: Single Column, Desktop: Grid -->
        <div class="p-2 sm:p-4">
          <div class="space-y-2 sm:grid sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:space-y-0">
            <div
              v-for="customer in filteredCustomers"
              :key="customer.id"
              @click="customer.auth_user_id ? selectCustomer(customer) : showPendingActions(customer)"
              :class="[
                'bg-white rounded-lg shadow-sm border p-3 transition-all',
                customer.auth_user_id 
                  ? 'cursor-pointer hover:shadow-md active:scale-98 hover:border-green-300' 
                  : 'cursor-pointer hover:shadow-md hover:border-orange-300 opacity-75'
              ]"
            >
              <!-- Customer Info -->
              <div class="flex items-center justify-between">
                <!-- Left: Main Info -->
                <div class="flex-1 min-w-0">
                  <!-- Name & Category -->
                  <div class="flex items-center gap-2 mb-1">
                    <h3 :class="[
                      'font-semibold truncate flex-1',
                      customer.auth_user_id ? 'text-gray-900' : 'text-gray-600'
                    ]">
                      {{ customer.first_name }} {{ customer.last_name }}
                    </h3>
                    <!-- Category Badges -->
                    <div v-if="customer.category && customer.category.length > 0" class="flex flex-wrap gap-1">
                      <span 
                        v-for="cat in customer.category" 
                        :key="cat"
                        class="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-medium"
                      >
                        {{ cat }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- Contact Info -->
                  <div class="space-y-0.5">
                    <p v-if="customer.phone" class="text-sm text-gray-600 flex items-center gap-1">
                      <span class="text-xs">📱</span>
                      <a :href="`tel:${customer.phone}`" class="text-blue-600 hover:text-blue-800 hover:underline" @click.stop>
                        {{ formatPhone(customer.phone) }}
                      </a>                    
                    </p>
                  </div>
                </div>
                
                <!-- Right: Status & Actions -->
                <div class="flex flex-col items-end gap-2 ml-3">
                  <!-- Status Badge -->
                  <span :class="[
                    'text-xs px-2 py-1 rounded-full font-medium',
                    !customer.auth_user_id 
                      ? 'bg-orange-100 text-orange-700'
                      : customer.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                  ]">
                    {{ !customer.auth_user_id ? 'Pending' : customer.is_active ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                  
                  <!-- Quick Action Button -->
                  <button 
                    v-if="customer.auth_user_id"
                    @click.stop="quickAction(customer)"
                    class="text-xs text-green-600 hover:text-green-800 font-medium py-1 px-2 rounded hover:bg-green-50 transition-colors"
                  >
                    Details →
                  </button>
                  <span 
                    v-else
                    class="text-xs text-gray-400 font-medium py-1 px-2"
                  >
                    Warte auf Aktivierung
                  </span>
                </div>
              </div>

              <!-- Additional Info Row -->
              <div class="mt-2 pt-2 border-t border-gray-100">
                <div class="flex items-center justify-between text-xs text-gray-400">
                  <!-- Left: Additional info -->
                  <div class="flex items-center gap-3">
                    <span>
                      {{ t.staff }}: {{ customer.assignedInstructor || '-' }}
                    </span>
                    <span>
                      Lektionen: {{ customer.completedLessonsCount || '-' }}
                    </span>
                  </div>
                  
                  <!-- Right: Date -->
                  <span class="text-xs text-gray-400">
                    Letzter Termin: {{ customer.lastLesson ? formatRelativeDate(customer.lastLesson) : '-' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Customer Detail Modal -->
    <EnhancedStudentModal
      :selected-student="selectedCustomer"
      :current-user="currentUser"
      @close="selectedCustomer = null"
      @edit="editCustomer"
      @create-appointment="handleCreateAppointment"
      @evaluate-lesson="handleEvaluateLesson"
      @student-updated="handleCustomerUpdated"
      @open-reminder-modal="handleOpenReminderModal"
    />

    <!-- Add Customer Modal -->
    <AddStudentModal
      :show="showAddCustomerModal"
      :current-user="currentUser"
      @close="showAddCustomerModal = false"
      @added="handleCustomerAdded"
    />

    <!-- Pending Customer Actions Modal -->
    <div v-if="showPendingModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-black bg-opacity-50" @click="showPendingModal = false"></div>
      
      <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                {{ pendingCustomer?.first_name }} {{ pendingCustomer?.last_name }}
              </h3>
              <p class="text-sm text-gray-600 mb-4">
                Dieser Kunde hat sein Konto noch nicht aktiviert.
              </p>
              
              <div class="space-y-3">
                <!-- SMS erneut senden -->
                <button
                  @click="resendOnboardingSms"
                  :disabled="isResendingSms"
                  class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <span v-if="!isResendingSms">📱 SMS erneut senden</span>
                  <span v-else class="flex items-center gap-2">
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sendet...
                  </span>
                </button>
                
                <!-- Link kopieren -->
                <button
                  @click="copyOnboardingLink"
                  class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  📋 Link kopieren
                </button>
              </div>
              
              <div class="mt-4 pt-4 border-t text-xs text-gray-500">
                <p>Telefon: {{ formatPhone(pendingCustomer?.phone) }}</p>
                <p v-if="pendingCustomer?.onboarding_token_expires" class="mt-1">
                  Link gültig bis: {{ formatDate(pendingCustomer.onboarding_token_expires) }}
                </p>
              </div>
            </div>
          </div>
          
          <button
            @click="showPendingModal = false"
            class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useTerminology()

import { ref, onMounted, computed, watch } from 'vue'
import { logger } from '~/utils/logger'
import { filterByStudentSearch } from '~/utils/student-search'
import { useUIStore } from '~/stores/ui'
import EnhancedStudentModal from '~/components/EnhancedStudentModal.vue'
import AddStudentModal from '~/components/AddStudentModal.vue'
import LoadingLogo from '~/components/LoadingLogo.vue'

// Props
const props = defineProps<{
  currentUser: any
}>()

// Emits
const emit = defineEmits<{
  userUpdated: [updateData: any]
}>()

// Composables
const uiStore = useUIStore()

// Local state
const selectedCustomer = ref<any>(null)
const showAddCustomerModal = ref(false)
const customers = ref<any[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const showInactive = ref(false)
const showAllStudents = ref(false)
const showOnlyNoUpcoming = ref(false)
const showPendingModal = ref(false)
const pendingCustomer = ref<any>(null)
const isResendingSms = ref(false)

watch(
  () => props.currentUser?.can_view_all_students,
  (canViewAll) => {
    if (canViewAll) showAllStudents.value = true
  },
  { immediate: true }
)

// Computed
const filteredCustomers = computed(() => {
  let filtered = customers.value

  // Filter by search query (trim, multi-token full name, accents, phone digits)
  if (searchQuery.value) {
    filtered = filterByStudentSearch(filtered, searchQuery.value)
  }

  // Filter by upcoming appointments
  if (showOnlyNoUpcoming.value) {
    const now = new Date()
    
    filtered = filtered.filter(customer => {
      const hasUpcomingAppointments = customer.appointments?.some((apt: any) => {
        const appointmentDate = new Date(apt.start_time)
        return appointmentDate > now && ['scheduled', 'confirmed'].includes(apt.status)
      })
      return !hasUpcomingAppointments
    })
    
    // Sort by last appointment
    filtered = filtered.sort((a, b) => {
      const aLastAppointment = a.appointments?.length > 0 
        ? new Date(Math.max(...a.appointments.map((apt: any) => new Date(apt.start_time).getTime())))
        : new Date(0)
      
      const bLastAppointment = b.appointments?.length > 0 
        ? new Date(Math.max(...b.appointments.map((apt: any) => new Date(apt.start_time).getTime())))
        : new Date(0)
      
      return aLastAppointment.getTime() - bLastAppointment.getTime()
    })
  }

  return filtered
})

// Methods
const loadCustomers = async (_loadAppointments = true) => {
  if (!props.currentUser) return
  
  isLoading.value = true
  error.value = null
  
  try {
    logger.debug('🔄 Loading customers via get-students API...')

    // Same endpoint & filter logic as EventModal StudentSelector and pages/customers.vue
    // (server/utils/get-filtered-students.ts) — no client-side staff filtering.
    const params = new URLSearchParams()
    params.append('showAllStudents', showAllStudents.value.toString())
    params.append('showInactive', showInactive.value.toString())

    const response = await $fetch(`/api/admin/get-students?${params.toString()}`, {
      method: 'GET'
    }) as any

    if (!response?.success || !response?.data) {
      throw new Error('Failed to load customers from API')
    }

    const enrichedCustomers = (response.data as any[]).map((customer: any) => ({
      ...customer,
      assignedInstructor: '-',
      completedLessonsCount: 0,
      lastLesson: null,
      fullAddress: [customer.street, customer.street_nr, customer.zip, customer.city]
        .filter(Boolean)
        .join(' '),
      payment_provider: customer.payment_provider_customer_id ? 'Konfiguriert' : 'Nicht konfiguriert'
    }))

    customers.value = enrichedCustomers
    logger.debug('✅ Customers loaded successfully:', customers.value.length)

  } catch (err: any) {
    console.error('❌ Error loading customers:', err)
    error.value = err.message || 'Fehler beim Laden der Kunden'
    customers.value = []
  } finally {
    isLoading.value = false
  }
}

const selectCustomer = (customer: any) => {
  selectedCustomer.value = customer
}

const quickAction = (customer: any) => {
  selectedCustomer.value = customer
}

const editCustomer = () => {
  selectedCustomer.value = null
  logger.debug('Edit customer')
}

const handleCreateAppointment = () => {
  selectedCustomer.value = null
  logger.debug('Create appointment')
}

const handleEvaluateLesson = () => {
  selectedCustomer.value = null
  logger.debug('Evaluate lesson')
}

const handleCustomerUpdated = (updateData: any) => {
  logger.debug('📡 Customer updated:', updateData)

  // Staff removed themselves from assignment — drop from "Meine" list
  if (updateData._unassigned) {
    if (props.currentUser?.role === 'staff' && !showAllStudents.value) {
      customers.value = customers.value.filter(s => s.id !== updateData.id)
    }
    selectedCustomer.value = null
    emit('userUpdated', updateData)
    return
  }

  // Staff assigned themselves — reload so Meine/Alle stays consistent
  if (updateData._assigned) {
    selectedCustomer.value = null
    loadCustomers()
    emit('userUpdated', updateData)
    return
  }
  
  const customerIndex = customers.value.findIndex(s => s.id === updateData.id)
  if (customerIndex !== -1) {
    Object.assign(customers.value[customerIndex], updateData)
    
    if (selectedCustomer.value?.id === updateData.id) {
      Object.assign(selectedCustomer.value, updateData)
    }
  }
  
  emit('userUpdated', updateData)
}

const handleCustomerAdded = async (newCustomer: any) => {
  logger.debug('✅ New customer added:', newCustomer)
  showAddCustomerModal.value = false
  await loadCustomers()
}

const handleNoUpcomingToggle = async () => {
  if (showOnlyNoUpcoming.value) {
    await loadCustomers(true)
  }
}

const showPendingActions = (customer: any) => {
  pendingCustomer.value = customer
  showPendingModal.value = true
}

const handleOpenReminderModal = (student: any) => {
  pendingCustomer.value = student
  showPendingModal.value = true
}

const resendOnboardingSms = async () => {
  if (!pendingCustomer.value?.id) return
  
  isResendingSms.value = true
  
  try {
    const smsResponse = await $fetch('/api/students/resend-onboarding-sms', {
      method: 'POST',
      body: { studentId: pendingCustomer.value.id }
    }) as any

    if (!smsResponse?.success) {
      throw new Error(smsResponse?.message || 'Failed to send SMS via API')
    }

    uiStore.addNotification({
      type: 'success',
      title: 'SMS erfolgreich gesendet!',
      message: `Onboarding-Link wurde an ${smsResponse.phone || formatPhone(pendingCustomer.value.phone)} gesendet.`
    })
    showPendingModal.value = false
  } catch (err: any) {
    console.error('Error resending SMS:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: err.message || 'SMS konnte nicht gesendet werden.'
    })
  } finally {
    isResendingSms.value = false
  }
}

const copyOnboardingLink = async () => {
  if (!pendingCustomer.value?.id) return
  
  try {
    const tokenResponse = await $fetch('/api/students/get-onboarding-token', {
      method: 'GET',
      params: { studentId: pendingCustomer.value.id }
    }) as any

    if (!tokenResponse?.success || !tokenResponse?.onboarding_token) {
      throw new Error(tokenResponse?.message || 'Failed to fetch onboarding token')
    }

    const onboardingLink = `https://app.simy.ch/onboarding/${tokenResponse.onboarding_token}`
    
    try {
      await navigator.clipboard.writeText(onboardingLink)
    } catch {
      const input = document.createElement('input')
      input.type = 'text'
      input.value = onboardingLink
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    
    uiStore.addNotification({
      type: 'success',
      title: 'Link kopiert!',
      message: 'Der Onboarding-Link wurde in die Zwischenablage kopiert.'
    })
  } catch (err: any) {
    console.error('Error copying link:', err)
    uiStore.addNotification({
      type: 'error',
      title: 'Fehler',
      message: err.message || 'Link konnte nicht kopiert werden.'
    })
  }
}

// Utility functions
const formatPhone = (phone: string) => {
  if (!phone) return ''
  
  if (phone.startsWith('+41')) {
    return phone.replace('+41', '0').replace(/\s+/g, ' ')
  }
  
  return phone
}

const formatRelativeDate = (dateString: string) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return 'Gestern'
  if (diffDays < 7) return `vor ${diffDays}d`
  if (diffDays < 30) return `vor ${Math.floor(diffDays / 7)}w`
  if (diffDays < 365) return `vor ${Math.floor(diffDays / 30)}M`
  return `vor ${Math.floor(diffDays / 365)}J`
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'Kein Datum'
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum'
    }
    return date.toLocaleDateString('de-CH')
  } catch (error) {
    console.warn('Error formatting date:', dateString, error)
    return 'Datum Fehler'
  }
}

// Lifecycle
onMounted(async () => {
  await loadCustomers(true)
})
</script>

<style scoped>
/* Mobile optimizations */
.active\:scale-98:active {
  transform: scale(0.98);
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
