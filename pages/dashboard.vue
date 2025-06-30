<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import CalendarComponent from '../components/CalendarComponent.vue'
import StaffSettings from '~/components/StaffSettings.vue'
import PendenzenModal from '~/components/PendenzenModal.vue'
import ProfileSetup from '~/components/ProfileSetup.vue'
import { navigateTo } from '#app'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { usePendingTasks } from '~/composables/usePendingTasks'

interface CalendarApi {
  today(): void
  next(): void
  prev(): void
  getDate(): Date
  view: { currentStart: Date }
}

// GEÄNDERT: profileExists hinzugefügt
const { currentUser, fetchCurrentUser, isLoading, userError, profileExists } = useCurrentUser()
const { pendingCount, buttonClasses, fetchPendingTasks } = usePendingTasks()

const calendarRef = ref<{ getApi(): CalendarApi } | null>(null)
const showStaffSettings = ref(false)
const showCustomers = ref(false)
const showPendenzen = ref(false)
const isTodayActive = ref(false)
const currentMonth = ref('')

onMounted(async () => {
  await fetchCurrentUser()
  
  // // NEU: Nur bei echten Auth-Fehlern redirecten
  // if (userError.value && userError.value === 'Nicht eingeloggt') {
  //   console.log('Redirect zu Login: Nicht authentifiziert')
  //   await navigateTo('/')
  //   return
  // }

  // Debug-Ausgaben
  console.log('Debug - profileExists:', profileExists?.value)
  console.log('Debug - userError:', userError.value)
  console.log('Debug - currentUser:', currentUser.value)

  // NEU: Pending Tasks nur laden wenn Profil existiert
  if (currentUser.value && profileExists.value && ['staff', 'admin'].includes(currentUser.value.role)) {
    await fetchPendingTasks(currentUser.value.id)
  }

  updateTodayState()
  updateCurrentMonth()
})

// NEU: Funktion für nach Profilerstellung
const handleProfileCreated = async () => {
  console.log('Profil wurde erstellt, lade Daten neu...')
  await fetchCurrentUser()
  
  // Nach erfolgreicher Profilerstellung Pending Tasks laden
  if (currentUser.value && ['staff', 'admin'].includes(currentUser.value.role)) {
    await fetchPendingTasks(currentUser.value.id)
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

// Auto-refresh alle 5 Minuten - GEÄNDERT: Nur wenn Profil existiert
const refreshInterval = setInterval(async () => {
  if (currentUser.value && profileExists.value && ['staff', 'admin'].includes(currentUser.value.role)) {
    await fetchPendingTasks(currentUser.value.id)
  }
}, 5 * 60 * 1000)

onUnmounted(() => {
  clearInterval(refreshInterval)
})
</script>

<template>
  <!-- DEBUG INFO - Temporär -->
  <div class="fixed top-0 left-0 z-[100] bg-black text-white p-2 text-xs">
    Debug: profileExists={{ profileExists }}, userError={{ userError }}, hasUser={{ !!currentUser }}
  </div>

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
    <!-- Header -->
    <div class="fixed top-0 left-0 right-0 h-[50px] bg-white shadow z-50 flex items-center justify-between px-4">
      <div class="flex items-center gap-4">
        <img src="/images/Driving_Team_ch.jpg" class="h-10 w-auto" alt="Driving Team">
      </div>

      <!-- Navigation Controls -->
      <div class="flex gap-2">
        <button
          class="responsive font-bold text-white px-3 py-2 rounded-xl shadow-md transition-all duration-200 transform active:scale-95 hover:bg-blue-600 disabled:bg-gray-400 bg-blue-500"
          :disabled="isTodayActive"
          @click="goToToday"
        >
          Heute
        </button>
        <button 
          class="responsive font-bold text-white text-xl px-4 py-1 rounded-xl shadow-md transition-all duration-200 transform active:scale-95 bg-green-500 hover:bg-green-600" 
          @click="goPrev"
        >
          ‹
        </button>
        <button 
          class="responsive font-bold text-white text-xl px-4 py-1 rounded-xl shadow-md transition-all duration-200 transform active:scale-95 bg-green-500 hover:bg-green-600" 
          @click="goNext"
        >
          ›
        </button>
      </div>

      <!-- Month Display -->
      <div class="responsive font-semibold text-gray-800">
        {{ currentMonth }}
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 pt-[50px] pb-[50px] overflow-hidden">
      <CalendarComponent 
        ref="calendarRef" 
        :current-user="currentUser"
        @view-updated="onViewUpdate" 
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
      
      <button 
        :class="buttonClasses" 
        class="responsive"
        @click="showPendenzen = true"
      >
        ⏰ Offene ({{ pendingCount }})
      </button>
      
      <!-- Staff Settings nur für Staff/Admin -->
      <button 
        v-if="currentUser && (currentUser.role === 'staff' || currentUser.role === 'admin')"
        @click="showStaffSettings = true" 
        class="responsive bg-gray-500 hover:bg-gray-600 text-white font-bold px-3 py-2 rounded-xl shadow-lg transform active:scale-95 transition-all duration-200"
      >
        ⚙️ Einstellungen
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
  <PendenzenModal 
    :show="showPendenzen"
    @close="showPendenzen = false"
  />
</template>

<style>
.responsive {
  font-size: clamp(0.8rem, 1.5vw, 2rem)
}
</style>