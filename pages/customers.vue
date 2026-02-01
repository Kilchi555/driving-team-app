<!-- pages/customers.vue - Mobile-Optimierte Version -->
<template>
  <!-- Loading State -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-[100svh]">
    <LoadingLogo size="2xl"  />
  </div>

  <!-- Error State -->
  <div v-else-if="userError" class="min-h-[100svh] flex items-center justify-center">
    <div class="text-center max-w-md p-6 bg-red-50 rounded-lg">
      <h2 class="text-xl font-bold text-red-800 mb-4">Fehler</h2>
      <p class="text-red-600 mb-4">{{ userError }}</p>
      <button 
        @click="navigateTo('/')" 
        class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Zum Login
      </button>
    </div>
  </div>

  <!-- Main Content -->
  <div v-else-if="currentUser" class="h-[100svh] flex flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b p-4">
      <div class="flex items-center justify-between">
        <!-- Back Button & Title -->
        <div class="flex items-center gap-4">
          <button 
            @click="goBack"
            :class="[
              'text-2xl transition-colors duration-200',
              isNavigating 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-gray-600 hover:text-gray-800 cursor-pointer'
            ]"
            :disabled="isNavigating"
          >
            {{ isNavigating ? '⟳' : '←' }}
          </button>
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
            {{ isNavigating ? 'Lade Kalender...' : 'Schülerliste' }}
          </h1>
        </div>

        <!-- Add Student Button (nur Desktop) -->
        <button 
          v-if="currentUser.role !== 'client'"
          @click="addNewStudent"
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          + Neu
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="mt-4 space-y-3">
        <!-- Search Bar -->
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Schüler suchen (Name oder E-Mail)..."
            class="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
          <div class="absolute left-3 top-2.5 text-gray-400">
          </div>
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
                @change="() => loadStudents(true)"
              >
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <!-- All Students Toggle (nur für Staff) -->
          <div v-if="currentUser.role === 'staff' || 'admin'" class="flex items-center gap-3 rounded-lg">
            <span class="text-sm font-medium text-gray-700">
              {{ showAllStudents ? 'Alle' : 'Meine' }}
            </span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="showAllStudents" type="checkbox" class="sr-only peer" @change="() => loadStudents(true)">
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <!-- No Upcoming Appointments Toggle -->
          <div class="flex items-center gap-3 rounded-lg">
            <span class="text-sm font-medium text-gray-700">
              {{ showOnlyNoUpcoming ? 'Keine Termine geplant' : 'Termin geplant' }}
            </span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input v-model="showOnlyNoUpcoming" type="checkbox" class="sr-only peer" @change="handleNoUpcomingToggle">
              <div class="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>
        </div>

        <!-- Statistics -->
        <div class="flex gap-3 text-xs sm:text-sm text-gray-600">
          <span v-if="!showAllStudents">Meine: {{ students.length }}</span>
          <span v-else>Alle: {{ students.length }}</span>
          <span>Aktiv: {{ students.filter(s => s.is_active).length }}</span>
          <span>Inaktiv: {{ students.filter(s => !s.is_active).length }}</span>
        </div>
      </div>
    </div>

    <!-- Student Credit Balance Card (wenn ein Student ausgewählt ist) -->
    <div v-if="selectedStudent && selectedStudent.student_credits" class="bg-white border-b shadow-sm px-4 py-3">
      <div class="max-w-7xl mx-auto">
        <div class="flex items-center justify-between gap-4">
          <div class="flex-1">
            <p class="text-xs sm:text-sm text-gray-600 mb-1">
              Guthaben von <span class="font-semibold text-gray-900">{{ selectedStudent.first_name }} {{ selectedStudent.last_name }}</span>
            </p>
            <p class="text-lg sm:text-2xl font-bold text-green-600">
              CHF {{ (selectedStudent.student_credits.balance_rappen / 100).toFixed(2) }}
            </p>
          </div>
          <div class="flex-shrink-0">
            <svg class="w-8 h-8 sm:w-10 sm:h-10 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden">
      <!-- Error Loading Students -->
      <div v-if="error" class="h-full flex items-center justify-center">
        <div class="text-center max-w-md p-6 bg-red-50 rounded-lg">
          <h3 class="text-lg font-bold text-red-800 mb-2">Fehler beim Laden</h3>
          <p class="text-red-600 mb-4">{{ error }}</p>
          <button 
            @click="() => loadStudents(true)" 
            class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredStudents.length === 0" class="h-full flex items-center justify-center">
        <div class="text-center px-4">
          <div class="text-6xl mb-4">👥</div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            {{ searchQuery ? 'Keine Schüler gefunden' : 'Noch keine Schüler' }}
          </h3>
        </div>
      </div>

      <!-- Mobile-Optimierte Students List -->
      <div v-else class="h-full overflow-y-auto relative">
        <!-- Loading Overlay für Schülerliste -->
        <div v-if="isLoading" class="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
          <div class="text-center">
            <LoadingLogo size="xl"  />
            <p class="text-gray-600 mt-4">Lade Schüler...</p>
          </div>
        </div>
        
        <!-- Mobile: Single Column, Desktop: Grid -->
        <div class="p-2 sm:p-4">
          <div class="space-y-2 sm:grid sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:space-y-0">
            <div
              v-for="student in filteredStudents"
              :key="student.id"
              @click="selectStudent(student)"
              :class="[
                'bg-white rounded-lg shadow-sm border p-3 transition-all',
                'cursor-pointer hover:shadow-md active:scale-98 hover:border-green-300'
              ]"
            >

              <!-- Mobile-First Layout -->
              <div class="flex items-center justify-between">
                <!-- Left: Main Info -->
                <div class="flex-1 min-w-0"> <!-- min-w-0 für text truncation -->
                  <!-- Name & Category in one line -->
                  <div class="flex items-center gap-2 mb-1">
                    <h3 :class="[
                      'font-semibold truncate flex-1',
                      student.auth_user_id ? 'text-gray-900' : 'text-gray-600'
                    ]">
                      {{ student.first_name }} {{ student.last_name }}
                    </h3>
                    <!-- Category Badges - compact -->
                    <div v-if="student.category && student.category.length > 0" class="flex flex-wrap gap-1">
                      <span 
                        v-for="cat in student.category" 
                        :key="cat"
                        class="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-medium"
                      >
                        {{ cat }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- Contact Info - compact -->
                  <div class="space-y-0.5">
                    <p v-if="student.phone" class="text-sm text-gray-600 flex items-center gap-1">
                      <span class="text-xs">📱</span>
                      <a :href="`tel:${student.phone}`" class="text-blue-600 hover:text-blue-800 hover:underline"  @click.stop>
                        {{ formatPhone(student.phone) }}
                      </a>                    
                    </p>
                  </div>
                </div>
                
                <!-- Right: Status & Actions -->
                <div class="flex flex-col items-end gap-2 ml-3">
                  <!-- Status Badge -->
                  <span :class="[
                    'text-xs px-2 py-1 rounded-full font-medium',
                    !student.auth_user_id 
                      ? 'bg-orange-100 text-orange-700'
                      : student.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                  ]">
                    {{ !student.auth_user_id ? 'Pending' : student.is_active ? 'Aktiv' : 'Inaktiv' }}
                  </span>
                  
                  <!-- Quick Action Button (für alle) -->
                  <button 
                    @click.stop="quickAction(student)"
                    class="text-xs text-green-600 hover:text-green-800 font-medium py-1 px-2 rounded hover:bg-green-50 transition-colors"
                  >
                    Details →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- Enhanced Student Detail Modal -->
     <EnhancedStudentModal
    :selected-student="selectedStudent"
    :current-user="currentUser"
    @close="selectedStudent = null"
    @edit="editStudent"
    @create-appointment="handleCreateAppointment"
    @evaluate-lesson="handleEvaluateLesson"
    @student-updated="handleStudentUpdated"
    @open-reminder-modal="handleOpenReminderModal"
  />

  <!-- Add Student Modal -->
  <AddStudentModal
    :show="showAddStudentModal"
    :current-user="currentUser"
    @close="showAddStudentModal = false"
    @added="handleStudentAdded"
  />

  <!-- Pending Student Actions Modal -->
  <div v-if="showPendingModal" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black bg-opacity-50" @click="showPendingModal = false"></div>
    
    <div class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              {{ pendingStudent?.first_name }} {{ pendingStudent?.last_name }}
            </h3>
            <p class="text-sm text-gray-600 mb-4">
              Dieser Schüler hat sein Konto noch nicht aktiviert.
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
              <p>Telefon: {{ formatPhone(pendingStudent?.phone) }}</p>
              <p v-if="pendingStudent?.onboarding_token_expires" class="mt-1">
                Link gültig bis: {{ formatDate(pendingStudent.onboarding_token_expires) }}
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

  <!-- Success/Error Toast Modal -->
  <transition name="fade">
    <div v-if="showToast" class="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div 
        class="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 pointer-events-auto"
        :class="{
          'border-l-4 border-green-500': toastType === 'success',
          'border-l-4 border-red-500': toastType === 'error',
          'border-l-4 border-yellow-500': toastType === 'warning',
          'border-l-4 border-blue-500': toastType === 'info'
        }"
      >
        <div class="p-6">
          <div class="flex items-start gap-4">
            <!-- Icon -->
            <div class="flex-shrink-0 text-2xl">
              <span v-if="toastType === 'success'">✅</span>
              <span v-else-if="toastType === 'error'">❌</span>
              <span v-else-if="toastType === 'warning'">⚠️</span>
              <span v-else>ℹ️</span>
            </div>

            <!-- Content -->
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 mb-1">
                {{ toastTitle }}
              </h3>
              <p v-if="toastMessage" class="text-sm text-gray-600">
                {{ toastMessage }}
              </p>
            </div>

            <!-- Close Button -->
            <button
              @click="() => { clearToastTimeout(); showToast = false }"
              class="flex-shrink-0 text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">

import { ref, onMounted, computed } from 'vue'
import { navigateTo } from '#app'
import { useCurrentUser } from '~/composables/useCurrentUser'
// ✅ MIGRATED TO API - import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { useSmsService } from '~/composables/useSmsService'
import { useUIStore } from '~/stores/ui'
import EnhancedStudentModal from '~/components/EnhancedStudentModal.vue'
import AddStudentModal from '~/components/AddStudentModal.vue'
import LoadingLogo from '~/components/LoadingLogo.vue'


// Supabase client
// ✅ MIGRATED TO API - const supabase = getSupabase()

// Composables
const { currentUser, fetchCurrentUser, isLoading: isUserLoading, userError } = useCurrentUser()
const { sendSms } = useSmsService()
const uiStore = useUIStore()

// Local state
const selectedStudent = ref<any>(null)
const showAddStudentModal = ref(false)
const students = ref<any[]>([])
const isLoading = ref(false)
const isNavigating = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const showInactive = ref(false)
const showAllStudents = ref(false)
const showOnlyNoUpcoming = ref(false)
const showPendingModal = ref(false)
const pendingStudent = ref<any>(null)
const isResendingSms = ref(false)
const showReminderModal = ref(false)
const currentReminderAppointment = ref<any>(null)

// Toast state
const showToast = ref(false)
const toastType = ref<'success' | 'error' | 'warning' | 'info'>('success')
const toastTitle = ref('')
const toastMessage = ref('')

// Computed
const filteredStudents = computed(() => {
  logger.debug('🔄 filteredStudents computed triggered:', {
    studentsCount: students.value.length,
    showInactive: showInactive.value,
    showOnlyNoUpcoming: showOnlyNoUpcoming.value,
    searchQuery: searchQuery.value
  })
  
  let filtered = students.value

  // ✅ Aktiv/Inaktiv Filterung passiert jetzt in der DB-Abfrage (loadStudents)
  // Keine lokale Filterung mehr nötig

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(s => 
      s.first_name?.toLowerCase().includes(query) ||
      s.last_name?.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query)
    )
    logger.debug('✅ Filtered by search query:', filtered.length, 'students')
  }

  // Filter by upcoming appointments
  if (showOnlyNoUpcoming.value) {
    const beforeFilter = filtered.length
    const now = new Date()
    
    filtered = filtered.filter(student => {
      // Prüfe ob der Schüler geplante Termine hat
      const hasUpcomingAppointments = student.appointments?.some((apt: any) => {
        const appointmentDate = new Date(apt.start_time)
        return appointmentDate > now && ['scheduled', 'confirmed'].includes(apt.status)
      })
      return !hasUpcomingAppointments
    })
    
    // Sortiere nach dem letzten Termin (die am längsten her sind zuoberst)
    filtered = filtered.sort((a, b) => {
      const aLastAppointment = a.appointments?.length > 0 
        ? new Date(Math.max(...a.appointments.map((apt: any) => new Date(apt.start_time).getTime())))
        : new Date(0) // Falls keine Termine, ganz nach oben
      
      const bLastAppointment = b.appointments?.length > 0 
        ? new Date(Math.max(...b.appointments.map((apt: any) => new Date(apt.start_time).getTime())))
        : new Date(0) // Falls keine Termine, ganz nach oben
      
      return aLastAppointment.getTime() - bLastAppointment.getTime() // Älteste zuerst
    })
    
    logger.debug(`✅ Showing students without upcoming appointments: ${beforeFilter} → ${filtered.length} students`)
  }

  logger.debug('🔄 Final filtered students:', filtered.length)
  return filtered
})

// Filter students (for toggle changes)
const filterStudents = () => {
  // This function is called when the "No Upcoming" toggle changes
  // The filteredStudents computed property will automatically update
  logger.debug('🔄 Filtering students - showOnlyNoUpcoming:', showOnlyNoUpcoming.value)
}

const handleNoUpcomingToggle = async () => {
  logger.debug('🔄 No upcoming toggle changed:', showOnlyNoUpcoming.value)
  
  if (showOnlyNoUpcoming.value) {
    // If switching to "No Upcoming", we need appointments data
    logger.debug('📅 Loading appointments for "No Upcoming" filter...')
    await loadStudents(true)
  }
  
  // The filteredStudents computed property will handle the rest
}

// Navigation functions
const goBack = async () => {
  if (isNavigating.value) return // Prevent multiple clicks
  
  try {
    isNavigating.value = true
    logger.debug('🔙 Navigating back to dashboard...')
    
    // ✅ Optimierte Navigation mit Cache-Invalidierung
    try {
      // Verwende replace statt navigateTo für bessere Performance
      await navigateTo('/dashboard', { replace: true })
    } catch (navError) {
      console.warn('⚠️ navigateTo failed, trying window.location:', navError)
      // Fallback 1: Direct window navigation
      window.location.href = '/dashboard'
    }
  } catch (error) {
    console.error('❌ All navigation methods failed:', error)
    // Fallback 2: Force reload to dashboard
    window.location.replace('/dashboard')
  } finally {
    // ✅ Kürzere Timeout für bessere UX
    setTimeout(() => {
      isNavigating.value = false
    }, 1000)
  }
}

const addNewStudent = () => {
  logger.debug('🚀 Opening add student modal')
  showAddStudentModal.value = true
}

const handleStudentAdded = async (newStudent: any) => {
  logger.debug('✅ New student added:', newStudent)
  showAddStudentModal.value = false
  // Reload students list
  await loadStudents()
}

// Mobile optimization methods
const formatPhone = (phone: string) => {
  if (!phone) return ''
  
  // Swiss format: +41 79 123 45 67 -> 079 123 45 67
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

const quickAction = (student: any) => {
  selectedStudent.value = student
}

const editStudent = (student: any) => {
  selectedStudent.value = null
  // TODO: Implement edit modal
  logger.debug('Edit student:', student)
}

const viewLessons = (student: any) => {
  // TODO: Show lessons history for student
  logger.debug('View lessons for:', student)
}

const callStudent = (student: any) => {
  if (student.phone) {
    window.open(`tel:${student.phone}`)
  }
}

const handleCreateAppointment = (student: any) => {
  selectedStudent.value = null
  // Verwende deine bestehende createAppointment Funktion oder navigiere direkt
  logger.debug('Create appointment for:', student)
  // navigateTo(`/appointments/create?student=${student.id}`)
  
  // Oder falls du die bestehende Funktion verwenden willst:
  // createAppointment(student)
}

const handleEvaluateLesson = (lesson: any) => {
  selectedStudent.value = null
  // TODO: Öffne Bewertungsmodal für diese spezifische Lektion
  logger.debug('Evaluate lesson:', lesson)
  // showEvaluationModal.value = true
  // selectedAppointment.value = lesson
}

const handleStudentUpdated = (updateData: { id: string, [key: string]: any }) => {
  logger.debug('📡 Received student update:', updateData)
  
  // Find and update the student in the local students array
  const studentIndex = students.value.findIndex(s => s.id === updateData.id)
  if (studentIndex !== -1) {
    // Update the student object with new data
    Object.assign(students.value[studentIndex], updateData)
    logger.debug('✅ Updated local student data')
    
    // Also update selectedStudent if it's the same student
    if (selectedStudent.value?.id === updateData.id) {
      Object.assign(selectedStudent.value, updateData)
      logger.debug('✅ Updated selectedStudent data')
    }
  }
}

const emailStudent = (student: any) => {
  if (student.email) {
    window.open(`mailto:${student.email}`)
  }
}

const calculateAge = (birthdate: string) => {
  if (!birthdate) return ''
  const birth = new Date(birthdate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

// Lifecycle
onMounted(async () => {
  await fetchCurrentUser()
  
  if (userError.value || !currentUser.value) {
    await navigateTo('/')
    return
  }

  // Load students with appointments for complete data
  await loadStudents(true)
})

// Methods - ECHTE SUPABASE CALLS mit korrekten Spaltennamen
const loadStudents = async (loadAppointments = true) => {
  if (!currentUser.value) return
  
  isLoading.value = true
  error.value = null
  
  try {
    logger.debug('Current user role:', currentUser.value.role)
    
    // Use the new backend API endpoint that bypasses RLS
    // Authentication is handled via HTTP-Only cookies (sent automatically)
    const response = await $fetch('/api/admin/get-tenant-users', {
      method: 'GET'
      // No Authorization header needed - cookies are sent automatically
    }) as any

    if (!response?.success || !response?.data) {
      throw new Error('Failed to load users from API')
    }

    logger.debug('✅ Users loaded successfully via API:', response.data.length)
    
    // Filter for clients only
    let data = (response.data as any[]).filter((u: any) => u.role === 'client')
    
    logger.debug('📚 Filtered to client users:', data.length)
    
    if (!data) {
      students.value = []
      logger.debug('ℹ️ No students found')
      return
    }

    // ✅ Client-seitige Filterung für active/inactive users
    let filteredData = data
    if (showInactive.value) {
      // Show only INACTIVE students (is_active = false AND not pending/auth_user_id = null)
      filteredData = data.filter((student: any) => {
        return student.is_active === false && student.auth_user_id !== null
      })
      logger.debug(`📊 Client-side filtering (INACTIVE only): ${data.length} total → ${filteredData.length} inactive`)
    } else {
      // Show ACTIVE students OR pending users (auth_user_id = null)
      filteredData = data.filter((student: any) => {
        return student.is_active === true || student.auth_user_id === null
      })
      logger.debug(`📊 Client-side filtering (ACTIVE): ${data.length} total → ${filteredData.length} active/pending`)
    }

    // ✅ NEU: Intelligente Filterung basierend auf showAllStudents
    let studentsToProcess = filteredData as any[]
    
    // ✅ DEBUG: Zeige alle geladenen Schüler
    logger.debug('🔍 All loaded students:', studentsToProcess.map((s: any) => ({ 
      id: s.id, 
      name: `${s.first_name} ${s.last_name}`, 
      is_active: s.is_active,
      email: s.email 
    })))
    
    // ✅ DEBUG: Zeige is_active Status aller Schüler
    const activeCount = studentsToProcess.filter((s: any) => s.is_active).length
    const inactiveCount = studentsToProcess.filter((s: any) => !s.is_active).length
    logger.debug(`📊 Students status: ${activeCount} active, ${inactiveCount} inactive`)
    
    
    if (!showAllStudents.value) {
      // "Meine" - Filter by assigned staff (check both assigned_staff_id and assigned_staff_ids array)
      logger.debug('👤 Filter: Show only MY students (assigned to me)')
      logger.debug('🔍 Current user details:', {
        id: currentUser.value.id,
        email: currentUser.value.email,
        role: currentUser.value.role,
        first_name: currentUser.value.first_name
      })
      
      // ✅ Filter to only students assigned to current user (single or multiple staff)
      studentsToProcess = studentsToProcess.filter((s: any) => {
        // Check both assigned_staff_id (single) and assigned_staff_ids (array)
        const isSingleAssigned = s.assigned_staff_id === currentUser.value.id
        const isArrayAssigned = (s.assigned_staff_ids || []).includes(currentUser.value.id)
        return isSingleAssigned || isArrayAssigned
      })
      logger.debug(`✅ Filtered to ${studentsToProcess.length} students assigned to me`)
    } else {
      // "Alle" - Show all students in tenant
      logger.debug('👑 Filter: Show ALL students in tenant')
      // studentsToProcess already contains all filtered data (active/inactive)
      logger.debug(`✅ Showing all ${studentsToProcess.length} students in tenant`)
    }

    // ✅ OPTIMIERT: Lade alle Fahrlehrer-Daten in EINER Abfrage
    logger.debug('🚀 Loading all staff data in one query...')
    
    // Alle Schüler-IDs sammeln
    const studentIds = studentsToProcess.map((s: any) => s.id)
    
    // EINE Abfrage für alle Fahrlehrer aller Schüler
    const { data: allLessonInstructors, error: lessonError } = await supabase
      .from('appointments')
      .select('user_id, staff_id')
      .in('user_id', studentIds)
      .not('staff_id', 'is', null)

    if (lessonError) {
      console.error('❌ Error loading lesson instructors:', lessonError)
    }

    // EINE Abfrage für alle Fahrlehrer-Details
    let instructorData: any[] = []
    if (allLessonInstructors && allLessonInstructors.length > 0) {
      const uniqueInstructorIds = [...new Set(allLessonInstructors.map((l: any) => l.staff_id))]
      logger.debug('🔍 Unique instructor IDs for all students:', uniqueInstructorIds)
      
      const { data: instructors, error: instructorError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', uniqueInstructorIds)

      if (instructorError) {
        console.error('❌ Error loading instructor data:', instructorError)
      } else {
        instructorData = instructors || []
        logger.debug('✅ Loaded instructor data for all students:', instructorData.length)
      }
    }

    // Erweiterte Schüler-Daten mit zusätzlichen Informationen
    const enrichedStudents = studentsToProcess.map((student: any) => {
      // ✅ OPTIMIERT: Verwende bereits geladene Daten
      let assignedInstructor = '-'
      
      // Finde Fahrlehrer für diesen Schüler
      const studentInstructors = allLessonInstructors?.filter((l: any) => l.user_id === student.id) || []
      
      if (studentInstructors.length > 0) {
        const uniqueInstructorIds = [...new Set(studentInstructors.map((l: any) => l.staff_id))]
        const instructors = instructorData.filter((i: any) => uniqueInstructorIds.includes(i.id))
        
        if (instructors.length > 0) {
          const instructorInitials = instructors.map((instructor: any) => 
            `${instructor.first_name.charAt(0)}.${instructor.last_name.charAt(0)}.`
          ).join(', ')
          
          assignedInstructor = instructorInitials
        }
      }

        // ✅ OPTIMIERT: Verwende bereits geladene Termine statt neue DB-Abfragen
        const studentAppointments = student.appointments || []
        
        // Zähle Termine basierend auf Status (nur nicht gelöschte)
        const scheduledLessonsCount = studentAppointments.filter((apt: any) => 
          apt.status === 'scheduled' && !apt.deleted_at
        ).length

        const completedLessonsCount = studentAppointments.filter((apt: any) => 
          ['confirmed', 'completed'].includes(apt.status) && !apt.deleted_at
        ).length

        const cancelledLessonsCount = studentAppointments.filter((apt: any) => 
          ['cancelled', 'aborted', 'no_show'].includes(apt.status) && !apt.deleted_at
        ).length

        const deletedLessonsCount = studentAppointments.filter((apt: any) => 
          apt.deleted_at
        ).length

        // Letzter Termin (nur nicht gelöschte)
        const lastLesson = studentAppointments
          .filter((apt: any) => !apt.deleted_at)
          .sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0]

        return {
          ...(student as any),
          assignedInstructor,
          scheduledLessonsCount: scheduledLessonsCount || 0,
          completedLessonsCount: completedLessonsCount || 0,
          cancelledLessonsCount: cancelledLessonsCount || 0,
          deletedLessonsCount: deletedLessonsCount || 0,
          lessonsCount: (scheduledLessonsCount || 0) + (completedLessonsCount || 0) + (cancelledLessonsCount || 0), // Gesamt alle Termine
          lastLesson: lastLesson?.start_time || null,
          // Formatierte Adresse
          fullAddress: [(student as any).street, (student as any).street_nr, (student as any).zip, (student as any).city]
            .filter(Boolean)
            .join(' '),
          // Payment provider korrekt mappen
          payment_provider: (student as any).payment_provider_customer_id ? 'Konfiguriert' : 'Nicht konfiguriert'
        }
      })

    students.value = enrichedStudents
    logger.debug('✅ Students loaded successfully:', students.value.length)
    logger.debug('📊 Sample student:', students.value[0])
    logger.debug('🔍 Final students list:', students.value.map((s: any) => ({ name: `${s.first_name} ${s.last_name}`, instructor: s.assignedInstructor })))

    // Load billing addresses for students
    logger.debug('📋 Loading billing addresses for students')
    const { data: billingAddresses, error: billingError } = await supabase
      .from('company_billing_addresses')
      .select('id, contact_person, email, phone, street, street_number, zip, city, country')
      // Don't filter by tenant_id - billing addresses may have null tenant_id
      .order('created_at', { ascending: false })
      .limit(1) // Get the most recent one

    logger.debug('📋 Billing addresses result:', { billingAddresses, billingError })

    // Load billing addresses for students
    logger.debug('📋 Loading billing addresses for each user')
    const { data: companyBillingAddresses, error: billingAddressError } = await supabase
      .from('company_billing_addresses')
      .select('*')
      .in('user_id', studentIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    logger.debug('📋 Billing addresses result:', { count: companyBillingAddresses?.length, billingAddressError })

    if (!billingAddressError && companyBillingAddresses && companyBillingAddresses.length > 0) {
      logger.debug('📋 Found', companyBillingAddresses.length, 'billing addresses')
      
      // Group addresses by user_id
      const addressesByUser: Record<string, any[]> = {}
      companyBillingAddresses.forEach(addr => {
        if (!addressesByUser[addr.user_id]) {
          addressesByUser[addr.user_id] = []
        }
        addressesByUser[addr.user_id].push(addr)
      })
      
      // Add billing addresses to each student
      enrichedStudents.forEach((student: any) => {
        const userAddresses = addressesByUser[student.id] || []
        if (userAddresses.length > 0) {
          const addr = userAddresses[0] // Most recent one for this user
          
          // Format as multi-line address
          const addressLines = [
            addr.company_name,
            addr.contact_person,
            addr.street && addr.street_number ? `${addr.street} ${addr.street_number}` : addr.street,
            addr.zip && addr.city ? `${addr.zip} ${addr.city}` : (addr.zip || addr.city),
            addr.country
          ].filter(Boolean)
          
          student.invoice_address = addressLines.join('\n')
          
          logger.debug('📋 Added invoice address to student:', student.id)
        }
      })
      students.value = enrichedStudents
    } else {
      logger.debug('⚠️ No billing addresses found or error:', billingAddressError?.message)
    }


  } catch (err: any) {
    console.error('❌ Error loading students:', err)
    error.value = err.message || 'Fehler beim Laden der Schüler'
    students.value = []
  } finally {
    isLoading.value = false
  }
}

const selectStudent = (student: any) => {
  selectedStudent.value = student
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

// Pending Student Actions
const showPendingActions = (student: any) => {
  pendingStudent.value = student
  showPendingModal.value = true
}

const resendOnboardingSms = async () => {
  if (!pendingStudent.value) return
  
  isResendingSms.value = true
  
  try {
    logger.debug('📧 Sending new onboarding reminder...', {
      studentId: pendingStudent.value.id,
      email: pendingStudent.value.email,
      phone: pendingStudent.value.phone,
      firstName: pendingStudent.value.first_name
    })

    // ============================================
    // Call new secure API to send onboarding SMS
    // ============================================
    logger.debug('📧 Calling secure API to send onboarding SMS...')
    
    if (!pendingStudent.value?.id) {
      logger.error('❌ Student ID missing!', { pendingStudent: pendingStudent.value })
      throw new Error('Student ID is missing')
    }
    
    logger.debug('📋 Sending SMS for student:', {
      studentId: pendingStudent.value.id,
      firstName: pendingStudent.value.first_name
    })
    
    // Authentication is handled via HTTP-Only cookies (sent automatically)
    const smsResponse = await $fetch('/api/students/resend-onboarding-sms', {
      method: 'POST',
      body: {
        studentId: pendingStudent.value.id
      }
      // No Authorization header needed - cookies are sent automatically
    }) as any

    if (!smsResponse?.success) {
      throw new Error(smsResponse?.message || 'Failed to send SMS via API')
    }

    logger.debug('✅ SMS sent via API:', smsResponse)
    
    // Show success toast
    showSuccessToast(
      'SMS erfolgreich gesendet!',
      `Onboarding-Link wurde an ${smsResponse.phone} gesendet.`
    )
    
    // ✅ WICHTIG: Verzögere Modal-Close damit Toast sichtbar bleibt (3 Sekunden)
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    logger.debug('🚀 Closing pending modal after toast display')
    showPendingModal.value = false
  } catch (err: any) {
    console.error('❌ Error resending reminder:', err)
    logger.debug('❌ Error details:', err)
    
    const errorMsg = err.message || 'Unbekannter Fehler'
    showErrorToast(
      'Fehler beim SMS-Versand',
      errorMsg
    )
  } finally {
    isResendingSms.value = false
  }
}

const copyOnboardingLink = async () => {
  if (!pendingStudent.value) return
  
  try {
    logger.debug('📋 Fetching onboarding token via secure API...')
    
    // ============================================
    // Call secure API to get onboarding token
    // ============================================
    // Authentication is handled via HTTP-Only cookies (sent automatically)
    const tokenResponse = await $fetch('/api/students/get-onboarding-token', {
      method: 'GET',
      params: {
        studentId: pendingStudent.value.id
      }
      // No Authorization header needed - cookies are sent automatically
    }) as any

    if (!tokenResponse?.success || !tokenResponse?.onboarding_token) {
      throw new Error(tokenResponse?.message || 'Failed to fetch onboarding token')
    }

    logger.debug('✅ Token retrieved via API:', {
      studentName: tokenResponse.student_name
    })

    const onboardingLink = `https://simy.ch/onboarding/${tokenResponse.onboarding_token}`
    
    try {
      // Try modern clipboard API first (works on HTTPS + localhost)
      await navigator.clipboard.writeText(onboardingLink)
      logger.debug('✅ Link copied via clipboard API')
    } catch (clipboardError) {
      // Fallback: Use old-school method for HTTP/HTTPS compatibility
      logger.debug('⚠️ Clipboard API failed, using fallback method:', clipboardError)
      
      // Create temporary input element
      const input = document.createElement('input')
      input.type = 'text'
      input.value = onboardingLink
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      logger.debug('✅ Link copied via fallback method')
    }
    
    showSuccessToast(
      'Link kopiert!',
      'Der Onboarding-Link wurde in die Zwischenablage kopiert.'
    )
    
    logger.debug('🔗 Onboarding-Link copied:', onboardingLink)
  } catch (err: any) {
    console.error('Error copying link:', err)
    logger.debug('❌ Error details:', err)
    
    const errorMsg = err.message || 'Link konnte nicht kopiert werden'
    showErrorToast(
      'Fehler beim Link-Kopieren',
      errorMsg
    )
  }
}

const handleOpenReminderModal = (student: any) => {
  pendingStudent.value = student
  showPendingModal.value = true
}

// Toast auto-hide timeout
let toastTimeoutId: ReturnType<typeof setTimeout> | null = null

// Clear existing timeout
const clearToastTimeout = () => {
  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId)
    toastTimeoutId = null
  }
}

// Toast Helper Functions
const showSuccessToast = (title: string, message: string = '') => {
  logger.debug('🔔 showSuccessToast called:', { title, message })
  clearToastTimeout()
  toastType.value = 'success'
  toastTitle.value = title
  toastMessage.value = message
  showToast.value = true
  logger.debug('🔔 Toast state updated:', { showToast: showToast.value })
  
  // Auto-hide after 6 seconds (increased from 3 seconds for better readability)
  toastTimeoutId = setTimeout(() => {
    showToast.value = false
    toastTimeoutId = null
  }, 6000)
}

const showErrorToast = (title: string, message: string = '') => {
  logger.debug('🔔 showErrorToast called:', { title, message })
  clearToastTimeout()
  toastType.value = 'error'
  toastTitle.value = title
  toastMessage.value = message
  showToast.value = true
  logger.debug('🔔 Toast state updated:', { showToast: showToast.value })
  
  // Auto-hide after 8 seconds for errors (longer to read error message)
  toastTimeoutId = setTimeout(() => {
    showToast.value = false
    toastTimeoutId = null
  }, 8000)
}
</script>

<style scoped>
/* Mobile optimizations */
.active\:scale-98:active {
  transform: scale(0.98);
}

/* Smooth touch interactions */
@media (hover: none) and (pointer: coarse) {
  .cursor-pointer {
    cursor: default;
  }
  
  .hover\:shadow-md:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
}

/* Ensure text doesn't break layout on small screens */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Floating action button shadow */
.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
</style>