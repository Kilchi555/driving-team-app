<script setup lang="ts">

import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { logger } from '~/utils/logger'
import { useRoute } from 'vue-router'
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
import { useAuthStore } from '~/stores/auth'
import LoadingLogo from '~/components/LoadingLogo.vue'

// ✅ Protect this page - require authentication
definePageMeta({
  middleware: 'auth'
})


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
  markAppointmentEvaluated,
  isUpdating: isUpdatingStatus,
  updateError: statusUpdateError 
} = useAppointmentStatus()

// Refs
const calendarRef = ref<{ getApi(): CalendarApi } | null>(null)
const showStaffSettings = ref(false)
const showCustomers = ref(false)
const showPendenzen = ref(false)
const showProductSaleModal = ref(false)
const isTodayActive = ref(false)
const currentMonth = ref('')
const selectedStaffId = ref<string | null>(null) // For admin staff filtering

// Computed: Dynamically select the default tab based on pending counts
const defaultPendenzenTab = computed(() => {
  const pendenzenCount = pendingTasksComposable.unconfirmedNext24hCount?.value || 0
  const bewertungenCount = pendingCount.value || 0
  const unbestätigtCount = unconfirmedNext24hCount.value || 0
  
  logger.debug('📊 Default tab selection:', { pendenzenCount, bewertungenCount, unbestätigtCount })
  
  // Priorisiere den Tab mit den meisten Pendenzen
  if (unbestätigtCount > 0 && unbestätigtCount >= pendenzenCount && unbestätigtCount >= bewertungenCount) {
    return 'unconfirmed'
  } else if (bewertungenCount > 0 && bewertungenCount >= pendenzenCount && bewertungenCount >= unbestätigtCount) {
    return 'bewertungen'
  } else if (pendenzenCount > 0) {
    return 'pendenzen'
  }
  
  return 'pendenzen'
})

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
  logger.debug('🔍 Dashboard - User role changed:', newRole)
  logger.debug('🔍 Dashboard - Is admin:', newRole === 'admin')
}, { immediate: true })

// NEU: Zentrale Funktion zum Aktualisieren der Pendenzen
const refreshPendingData = async () => {
  if (!currentUser.value || !['staff', 'admin'].includes(currentUser.value.role)) {
    return
  }

  try {
    logger.debug('🔄 Refreshing pending data...')
    
    // Pending Tasks neu laden
    await fetchPendingTasks(currentUser.value.id, currentUser.value.role)
    logger.debug('✅ Pending tasks refreshed, count:', pendingCount.value)
    
  } catch (err) {
    console.error('❌ Error refreshing pending data:', err)
  }
}

// NEU: Nur Kalender neu laden (für Settings-Updates, ohne Modal zu öffnen)
const refreshCalendarOnly = async () => {
  logger.debug('🔄 Refreshing calendar only (settings updated)...')
  
  try {
    if (calendarRef.value && 'refreshCalendar' in calendarRef.value) {
      await (calendarRef.value as any).refreshCalendar?.()
      logger.debug('✅ Calendar refreshed')
    }
  } catch (err) {
    console.error('❌ Error refreshing calendar:', err)
  }
}

// NEU: Zentrale Funktion zum kompletten Neu-Laden aller Dashboard-Daten
const reloadDashboardData = async () => {
  logger.debug('🔄 Reloading all dashboard data...')
  
  try {
    // 1. Kalender neu laden (falls Methode existiert)
    if (calendarRef.value && 'refreshCalendar' in calendarRef.value) {
      await (calendarRef.value as any).refreshCalendar?.()
      logger.debug('✅ Calendar data reloaded')
    } else {
      logger.debug('⚠️ Calendar refresh method not available')
    }
    
    // 2. Pendenzen neu laden
    await refreshPendingData()
    logger.debug('✅ Pending data reloaded')
    
    // ENTFERNT: Modal wird NICHT mehr automatisch geöffnet bei jedem Reload
    // Das war störend wenn man nur Arbeitszeiten ändert
    
    logger.debug('✅ Dashboard reload complete')
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
  logger.debug('🔥 Evaluating lesson:', appointment)
  selectedAppointment.value = appointment
  showEvaluationModal.value = true
}
const onAppointmentChanged = async (event: { type: string, data: any }) => {
  logger.debug('📅 Appointment changed:', event.type, event.data)
  
  // Bei jedem Termin-Change die Pendenzen aktualisieren
  await refreshPendingData()
}

// Admin Staff Switcher Handler
const onStaffChanged = (staffId: string | null) => {
  logger.debug('🔄 Admin staff filter changed:', staffId)
  selectedStaffId.value = staffId
  // The CalendarComponent will react to this change via props
}

// NEU: Watch für pendingCount um Debugging zu verbessern
watch(pendingCount, (newCount, oldCount) => {
  logger.debug(`🔄 Pending count changed: ${oldCount} → ${newCount}`)
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
  logger.debug('🚀 Dashboard mounting...')

    logger.debug('🔥 Feature Flags Debug:', isEnabled('AUTO_REFRESH_PENDING'))

  
  await fetchCurrentUser()
  
  logger.debug('🔥 Current user after fetch:', currentUser.value)
  logger.debug('Debug - profileExists:', profileExists?.value)
  logger.debug('Debug - userError:', userError.value)
  
  // KRITISCH: Prüfe auf kaputte Session (Session existiert aber kein Profil)
  if (!currentUser.value && userError.value === 'Nicht eingeloggt') {
    console.error('❌ Dashboard: Broken session detected! User is null but trying to access dashboard.')
    logger.debug('🧹 Clearing broken session and redirecting...')
    
    // Session bereinigen
    const authStore = useAuthStore()
    await authStore.logout()
    
    // ✅ Redirect: Versuche zur Slug-Route aus localStorage, sonst zum Login
    let lastTenantSlug: string | null = null
    try {
      lastTenantSlug = localStorage.getItem('last_tenant_slug')
      if (lastTenantSlug) {
        logger.debug('Auth: Redirecting to last tenant slug:', `/${lastTenantSlug}`)
        return await navigateTo(`/${lastTenantSlug}`)
      }
    } catch (e) {
      logger.warn('Auth: Could not read localStorage:', e)
    }
    
    logger.debug('Auth: No last tenant slug found, redirecting to login')
    return await navigateTo('/login')
  }


  if (currentUser.value && profileExists.value && ['staff', 'admin'].includes(currentUser.value.role)) {
    logger.debug('🔄 About to refresh pending data...')
    logger.debug('🔥 Current user ID:', currentUser.value.id)
    logger.debug('🔥 Current user role:', currentUser.value.role)
    await refreshPendingData()
    logger.debug('✅ Pending data refresh completed')
    logger.debug('🔥 Pending count after refresh:', pendingCount.value)

  }
  logger.debug('🔄 About to update today state...')

  updateTodayState()
  updateCurrentMonth()
  logger.debug('✅ Today state updated')


// ✅ AUTO-REFRESH MIT FEATURE FLAG:
  logger.debug('🔍 Checking auto-refresh conditions...')
  logger.debug('🔍 process.client:', process.client)
  logger.debug('🔍 isEnabled result:', isEnabled('AUTO_REFRESH_PENDING'))

  if (process.client && isEnabled('AUTO_REFRESH_PENDING')) {
    logger.debug('🔄 Setting up auto-refresh interval (Feature Flag enabled)...')
    refreshInterval.value = setInterval(async () => {
      if (currentUser.value && profileExists.value && ['staff', 'admin'].includes(currentUser.value.role)) {
        logger.debug('🔄 Auto-refreshing pending data...')
        await refreshPendingData()
      }
    }, 5 * 60 * 1000) as unknown as number
  } else if (process.client) {
    logger.debug('⏸️ Auto-refresh disabled via Feature Flag')
     } else {
    logger.debug('⏸️ Auto-refresh disabled - not client side')
  }
    logger.debug('✅ onMounted completed')
})

// Cleanup on unmount (bleibt gleich)
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
    logger.debug('🧹 Cleaned up refresh interval')
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
          logger.debug('🔥 Opening pendenzen modal, current count:', pendingCount); 
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
          logger.debug('🔥 Closing pendenzen modal'); 
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
    @settings-updated="refreshCalendarOnly"
/>
</template>

<style>
.responsive {
  font-size: clamp(0.8rem, 1.5vw, 2rem)
}
</style>