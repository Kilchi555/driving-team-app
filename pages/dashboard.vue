<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'
import CalendarComponent from '../components/CalendarComponent.vue'
import StaffSettings from '~/components/StaffSettings.vue'
import PendenzenModal from '~/components/PendenzenModal.vue'
import ProfileSetup from '~/components/ProfileSetup.vue'
import { navigateTo } from '#app'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { usePendingTasks } from '~/composables/usePendingTasks'
import { useAppointmentStatus } from '~/composables/useAppointmentStatus'
import { useFeatureFlags } from '@/utils/useFeatureFlags'


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
const isTodayActive = ref(false)
const currentMonth = ref('')

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
  profileExists: profileExists.value,
  pendingCount: pendingCount.value,
  isPendingLoading: isPendingLoading.value,
  pendingError: pendingError.value
}))

// NEU: Funktion für nach Profilerstellung
const handleProfileCreated = async () => {
  console.log('Profil wurde erstellt, lade Daten neu...')
  await fetchCurrentUser()
  
  // Nach erfolgreicher Profilerstellung Pending Tasks laden
  if (currentUser.value && ['staff', 'admin'].includes(currentUser.value.role)) {
    console.log('🔄 Loading pending tasks after profile creation...')
    await fetchPendingTasks(currentUser.value.id)
    console.log('✅ Pending tasks loaded, count:', pendingCount.value)
  }
}

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
    await fetchPendingTasks(currentUser.value.id)
    console.log('✅ Pending tasks refreshed, count:', pendingCount.value)
    
  } catch (err) {
    console.error('❌ Error refreshing pending data:', err)
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

// NEU: Watch für pendingCount um Debugging zu verbessern
watch(pendingCount, (newCount, oldCount) => {
  console.log(`🔄 Pending count changed: ${oldCount} → ${newCount}`)
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
    await refreshPendingData()
    console.log('✅ Pending data refresh completed')

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
  <div v-if="isLoading" class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Lade Dashboard...</p>
    </div>
  </div>

  <!-- Auth Error State (nur bei echten Auth-Fehlern) -->
  <div v-else-if="userError && userError === 'Nicht eingeloggt'" class="min-h-screen flex items-center justify-center">
    <div class="text-center max-w-md p-6 bg-red-50 rounded-lg">
      <h2 class="text-xl font-bold text-red-800 mb-4">Nicht angemeldet</h2>
      <p class="text-red-600 mb-4">Du musst dich anmelden, um das Dashboard zu verwenden.</p>
      <button 
        @click="navigateTo('/')" 
        class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Zum Login
      </button>
    </div>
  </div>

  <!-- NEU: Profile Setup State -->
  <div v-else-if="!profileExists && !userError" class="min-h-screen">
    <ProfileSetup @profile-created="handleProfileCreated" />
  </div>

  <!-- Success State - Dashboard -->
  <div v-else-if="currentUser && profileExists" class="h-screen flex flex-col">
    <!-- NEU: Status Update Indicator -->
    <div v-if="isUpdatingStatus" class="fixed top-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg z-50">
      🔄 Updating appointment status...
    </div>

    <!-- Error Indicator -->
    <div v-if="statusUpdateError" class="fixed top-4 right-4 bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg z-50">
      ❌ {{ statusUpdateError }}
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden">
      <CalendarComponent 
        ref="calendarRef" 
        :current-user="currentUser"
        @view-updated="onViewUpdate" 
        @appointment-changed="onAppointmentChanged"
      />
    </div>

    <!-- Footer Navigation -->
    <div class="fixed bottom-0 left-0 right-0 h-[50px] bg-white shadow z-50 flex justify-around items-center px-4">
      <button 
        @click="goToCustomers" 
        class="responsive bg-blue-500 hover:bg-blue-600 text-white font-bold px-3 py-2 rounded-xl shadow-lg transform active:scale-95 transition-all duration-200"
      >
        📋 Schüler
      </button>   
      
      <!-- Pendenzen Button - VERBESSERT -->
      <button 
        @click="() => { 
          console.log('🔥 Opening pendenzen modal, current count:', pendingCount); 
          showPendenzen = true; 
        }"
        :class="pendenzenButtonClasses"
      >
        {{ pendenzenButtonText }}
      </button>

      <!-- Pendenzen Modal -->
      <PendenzenModal
        :is-open="showPendenzen"
        :current-user="currentUser"
        @close="() => { 
          console.log('🔥 Closing pendenzen modal'); 
          showPendenzen = false; 
        }"
        @evaluate-lesson="handleEvaluateLesson"
      />
      
      <!-- Staff Settings nur für Staff/Admin -->
      <button 
        v-if="currentUser && (currentUser.role === 'staff' || currentUser.role === 'admin')"
        @click="showStaffSettings = true" 
        class="responsive bg-gray-500 hover:bg-gray-600 text-white font-bold px-3 py-2 rounded-xl shadow-lg transform active:scale-95 transition-all duration-200"
      >
        ⚙️ Profil
      </button>
    </div>
  </div>
  
  <!-- Fallback für andere Fehlerzustände -->
  <div v-else class="min-h-screen flex items-center justify-center">
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
/>
</template>

<style>
.responsive {
  font-size: clamp(0.8rem, 1.5vw, 2rem)
}
</style>