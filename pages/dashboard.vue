<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'
import CalendarComponent from '../components/CalendarComponent.vue'
import StaffSettings from '~/components/StaffSettings.vue'
import PendenzenModal from '~/components/PendenzenModal.vue'
import ProductSaleModal from '~/components/ProductSaleModal.vue'
import AdminStaffSwitcher from '~/components/AdminStaffSwitcher.vue'
import { navigateTo } from '#app'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { usePendingTasks } from '~/composables/usePendingTasks'
import { useAppointmentStatus } from '~/composables/useAppointmentStatus'
import { useFeatureFlags } from '@/utils/useFeatureFlags'
import LoadingLogo from '~/components/LoadingLogo.vue'


interface CalendarApi {
  today(): void
  next(): void
  prev(): void
  getDate(): Date
  view: { currentStart: Date }
}

// Composables
const { currentUser, fetchCurrentUser, isLoading, userError, profileExists } = useCurrentUser()
const { isEnabled } = useFeatureFlags()


// WICHTIG: Hole das ganze Composable-Objekt für volle Reaktivität
const pendingTasksComposable = usePendingTasks()
const { 
  pendingAppointments,
  pendingCount,
  unconfirmedNext24h,
  unconfirmedNext24hCount,
  buttonClasses,
  buttonText,
  fetchPendingTasks,
  isLoading: isPendingLoading,
  error: pendingError
} = pendingTasksComposable

const { 
  updateOverdueAppointments, 
  markAppointmentEvaluated,
  isUpdating: isUpdatingStatus,
  updateError: statusUpdateError 
} = useAppointmentStatus()

// Refs
const calendarRef = ref<{ getApi(): CalendarApi } | null>(null)
const showStaffSettings = ref(false)
const showCustomers = ref(false)
const showPendenzen = ref(false)
const defaultPendenzenTab = ref<'bewertungen' | 'unconfirmed'>('bewertungen')
const showProductSaleModal = ref(false)
const isTodayActive = ref(false)
const currentMonth = ref('')
const selectedStaffId = ref<string | null>(null) // For admin staff filtering

// NEU: Lokale computed für bessere Reaktivität
const pendenzenButtonClasses = computed(() => {
  return buttonClasses.value
})

const pendenzenButtonText = computed(() => {
  return buttonText.value
})

// Debug computed für bessere Nachverfolgung
const debugInfo = computed(() => ({
  userEmail: currentUser.value?.email || 'NULL',
  userRole: currentUser.value?.role || 'NULL',
  isAdmin: currentUser.value?.role === 'admin',
  profileExists: profileExists.value,
  pendingCount: pendingCount.value,
  isPendingLoading: isPendingLoading.value,
  pendingError: pendingError.value
}))

// Computed für Staff Switcher Sichtbarkeit
const shouldShowStaffSwitcher = computed(() => {
  return currentUser.value && 
         (currentUser.value.role === 'admin' || currentUser.value.role === 'staff')
})

// Debug: Log admin status
watch(() => currentUser.value?.role, (newRole) => {
  console.log('🔍 Dashboard - User role changed:', newRole)
  console.log('🔍 Dashboard - Is admin:', newRole === 'admin')
}, { immediate: true })

// NEU: Zentrale Funktion zum Aktualisieren der Pendenzen
const refreshPendingData = async () => {
  if (!currentUser.value || !['staff', 'admin'].includes(currentUser.value.role)) {
    return
  }

  try {
    console.log('🔄 Refreshing pending data...')
    
    // 1. Erst überfällige Termine updaten
    const result = await updateOverdueAppointments()
    if (result.updated > 0) {
      console.log(`✅ Updated ${result.updated} appointments to 'completed'`)
    }
    
    // 2. Dann Pending Tasks neu laden
    await fetchPendingTasks(currentUser.value.id, currentUser.value.role)
    console.log('✅ Pending tasks refreshed, count:', pendingCount.value)
    
  } catch (err) {
    console.error('❌ Error refreshing pending data:', err)
  }
}

// NEU: Zentrale Funktion zum kompletten Neu-Laden aller Dashboard-Daten
const reloadDashboardData = async () => {
  console.log('🔄 Reloading all dashboard data...')
  
  try {
    // 1. Kalender neu laden
    if (calendarRef.value?.refreshCalendar) {
      await calendarRef.value.refreshCalendar()
      console.log('✅ Calendar data reloaded')
    }
    
    // 2. Pendenzen neu laden
    await refreshPendingData()
    console.log('✅ Pending data reloaded')
    
    // 3. Falls unbestätigte Termine (24h) existieren: Modal öffnen auf Tab "unconfirmed"
    if ((unconfirmedNext24hCount?.value || 0) > 0) {
      console.log('🔔 Opening Pendenzen modal for unconfirmed appointments within 24h:', unconfirmedNext24hCount.value)
      defaultPendenzenTab.value = 'unconfirmed'
      showPendenzen.value = true
    }
    
    console.log('✅ Dashboard reload complete')
  } catch (err) {
    console.error('❌ Error reloading dashboard:', err)
  }
}

const goToToday = () => {
  const api = calendarRef.value?.getApi()
  if (!api) return
  api.today()
  updateTodayState()
  updateCurrentMonth()
}

const goNext = () => {
  const api = calendarRef.value?.getApi()
  if (!api) return
  api.next()
  updateTodayState()
  updateCurrentMonth()
}

const goPrev = () => {
  const api = calendarRef.value?.getApi()
  if (!api) return
  api.prev()
  updateTodayState()
  updateCurrentMonth()
}

const updateTodayState = () => {
  const api = calendarRef.value?.getApi()
  if (!api) return

  const viewStart = api.view.currentStart
  const now = new Date()

  isTodayActive.value = viewStart.getFullYear() === now.getFullYear() &&
    getWeekNumber(viewStart) === getWeekNumber(now)
}

const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

const updateCurrentMonth = () => {
  const api = calendarRef.value?.getApi()
  if (!api) return

  const date = api.getDate()
  currentMonth.value = date.toLocaleDateString('de-CH', {
    month: 'long',
    year: 'numeric',
  })
}

const onViewUpdate = (currentStart: Date) => {
  updateTodayState()
  updateCurrentMonth()
}

const goToCustomers = () => {
  navigateTo('/customers')
}

watch(calendarRef, () => {
  updateTodayState()
})

// Definiere refreshInterval außerhalb der Funktionen
const refreshInterval = ref<number | null>(null)

// HINZUFÜGEN: State für Evaluation Modal
const showEvaluationModal = ref(false)
const selectedAppointment = ref<any>(null)

// HINZUFÜGEN: Event Handler für Pendenzen Modal
const handleEvaluateLesson = (appointment: any) => {
  console.log('🔥 Evaluating lesson:', appointment)
  selectedAppointment.value = appointment
  showEvaluationModal.value = true
}
const onAppointmentChanged = async (event: { type: string, data: any }) => {
  console.log('📅 Appointment changed:', event.type, event.data)
  
  // Bei jedem Termin-Change die Pendenzen aktualisieren
  await refreshPendingData()
}

// Admin Staff Switcher Handler
const onStaffChanged = (staffId: string | null) => {
  console.log('🔄 Admin staff filter changed:', staffId)
  selectedStaffId.value = staffId
  // The CalendarComponent will react to this change via props
}

// NEU: Watch für pendingCount um Debugging zu verbessern
watch(pendingCount, (newCount, oldCount) => {
  console.log(`🔄 Pending count changed: ${oldCount} → ${newCount}`)
}, { immediate: true })

// Watch for userError changes and redirect to tenant login
watch(userError, async (error) => {
  if (error === 'Nicht eingeloggt' && process.client) {
    // Try to get tenant slug from localStorage
    let tenantSlug: string | null = null
    try {
      tenantSlug = localStorage.getItem('last_tenant_slug')
    } catch (e) {
      // Ignore localStorage errors
    }
    
    if (tenantSlug) {
      await navigateTo(`/${tenantSlug}`)
    } else {
      await navigateTo('/login')
    }
  }
}, { immediate: true })

// onMounted
// onMounted - UPDATED VERSION mit Feature Flags
onMounted(async () => {
  console.log('🚀 Dashboard mounting...')

    console.log('🔥 Feature Flags Debug:', isEnabled('AUTO_REFRESH_PENDING'))

  
  await fetchCurrentUser()
  
  console.log('🔥 Current user after fetch:', currentUser.value)
  console.log('Debug - profileExists:', profileExists?.value)
  console.log('Debug - userError:', userError.value)


  if (currentUser.value && profileExists.value && ['staff', 'admin'].includes(currentUser.value.role)) {
    console.log('🔄 About to refresh pending data...')
    console.log('🔥 Current user ID:', currentUser.value.id)
    console.log('🔥 Current user role:', currentUser.value.role)
    await refreshPendingData()
    console.log('✅ Pending data refresh completed')
    console.log('🔥 Pending count after refresh:', pendingCount.value)

  }
  console.log('🔄 About to update today state...')

  updateTodayState()
  updateCurrentMonth()
  console.log('✅ Today state updated')


// ✅ AUTO-REFRESH MIT FEATURE FLAG:
  console.log('🔍 Checking auto-refresh conditions...')
  console.log('🔍 process.client:', process.client)
  console.log('🔍 isEnabled result:', isEnabled('AUTO_REFRESH_PENDING'))

  if (process.client && isEnabled('AUTO_REFRESH_PENDING')) {
    console.log('🔄 Setting up auto-refresh interval (Feature Flag enabled)...')
    refreshInterval.value = setInterval(async () => {
      if (currentUser.value && profileExists.value && ['staff', 'admin'].includes(currentUser.value.role)) {
        console.log('🔄 Auto-refreshing pending data...')
        await refreshPendingData()
      }
    }, 5 * 60 * 1000) as unknown as number
  } else if (process.client) {
    console.log('⏸️ Auto-refresh disabled via Feature Flag')
     } else {
    console.log('⏸️ Auto-refresh disabled - not client side')
  }
    console.log('✅ onMounted completed')
})

// Cleanup on unmount (bleibt gleich)
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    console.log('🧹 Cleaned up refresh interval')
  }
})
</script>

<template>

  <!-- Loading State -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-[100svh]">
    <LoadingLogo 
      size="2xl" 
      loading-text="Dashboard wird geladen..."
    />
  </div>

  <!-- Auth Error State - Redirect automatically -->
  <div v-else-if="userError && userError === 'Nicht eingeloggt'" class="min-h-[100svh] flex items-center justify-center">
    <LoadingLogo 
      size="2xl" 
      loading-text="Weiterleitung zum Login..."
    />
  </div>

  <!-- Success State - Dashboard -->
  <div v-else-if="currentUser" class="h-[100svh] flex flex-col">
    <!-- Temporär entfernt: Reload Button oben rechts -->
    <!--
    <button
      @click="reloadDashboardData"
      class="fixed top-2 right-2 z-50 w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transform active:scale-95 transition-all duration-200 flex items-center justify-center"
      title="Dashboard neu laden"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
    -->

    <!-- NEU: Status Update Indicator -->
    <div v-if="isUpdatingStatus" class="fixed top-4 right-20 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg z-50">
      🔄 Updating appointment status...
    </div>

    <!-- Error Indicator -->
    <div v-if="statusUpdateError" class="fixed top-4 right-20 bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg z-50">
      ❌ {{ statusUpdateError }}
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden">
      
      <!-- Temporär entfernt: Admin Staff Switcher -->
      <!--
      <AdminStaffSwitcher
        v-if="shouldShowStaffSwitcher"
        :current-user="currentUser"
        :current-staff-id="selectedStaffId || undefined"
        @staff-changed="onStaffChanged"
      />
      -->
      
      <CalendarComponent 
        ref="calendarRef" 
        :current-user="currentUser"
        :admin-staff-filter="selectedStaffId"
        @view-updated="onViewUpdate" 
        @appointment-changed="onAppointmentChanged"
      />
    </div>

    <!-- Footer Navigation -->
    <div class="fixed bottom-0 left-0 right-0 h-[50px] bg-white shadow z-50 flex justify-around items-center px-4">
      <button 
        @click="goToCustomers" 
        class="bg-blue-500 hover:bg-blue-600 text-white font-bold px-3 py-2 rounded-xl shadow-lg transform active:scale-95 transition-all duration-200 min-w-[80px] h-[36px] flex items-center justify-center text-sm"
      >
        Schüler
      </button>   
      
      <!-- Pendenzen Button - VERBESSERT -->
      <button 
        @click="() => { 
          console.log('🔥 Opening pendenzen modal, current count:', pendingCount); 
          showPendenzen = true; 
        }"
        :class="`${pendenzenButtonClasses} min-w-[80px] h-[36px] flex items-center justify-center text-sm`"
      >
        {{ pendenzenButtonText }}
      </button>

      <!-- Pendenzen Modal -->
      <PendenzenModal
        :is-open="showPendenzen"
        :current-user="currentUser"
        :default-tab="defaultPendenzenTab"
        @close="() => { 
          console.log('🔥 Closing pendenzen modal'); 
          showPendenzen = false; 
        }"
        @evaluate-lesson="handleEvaluateLesson"
      />
      
      <!-- Staff Settings nur für Staff/Admin -->
      <button 
        @click="showStaffSettings = true" 
        class="bg-gray-500 hover:bg-gray-600 text-white font-bold px-3 py-2 rounded-xl shadow-lg transform active:scale-95 transition-all duration-200 min-w-[80px] h-[36px] flex items-center justify-center text-sm"
      >
        Profil
      </button>
    </div>
  </div>
  
  <!-- Fallback für andere Fehlerzustände -->
  <div v-else class="min-h-[100svh] flex items-center justify-center">
    <div class="text-center max-w-md p-6 bg-yellow-50 rounded-lg">
      <h2 class="text-xl font-bold text-yellow-800 mb-4">Unbekannter Zustand</h2>
      <p class="text-yellow-600 mb-4">{{ userError || 'Ein unerwarteter Fehler ist aufgetreten.' }}</p>
      <button 
        @click="fetchCurrentUser()" 
        class="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 mr-2"
      >
        Erneut versuchen
      </button>
      <button 
        @click="navigateTo('/')" 
        class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
      >
        Zum Login
      </button>
    </div>
  </div>

  <!-- Modals -->
  <StaffSettings 
    v-if="showStaffSettings && currentUser" 
    :current-user="currentUser"
    @close="showStaffSettings = false"
    @settings-updated="reloadDashboardData"
/>
</template>

<style>
.responsive {
  font-size: clamp(0.8rem, 1.5vw, 2rem)
}
</style>