<!-- pages/customer/courses.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-6 space-y-4">
          <button
            @click="navigateToDashboard"
            class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-lg shadow hover:bg-gray-200 transition-colors"
          >
            Zurück
          </button>
          <div>
            <h1 class="text-3xl font-bold text-gray-900">Unsere Kurse</h1>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <LoadingLogo size="lg" />
        <p class="text-gray-600 mt-4">Kurse werden geladen...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-lg font-medium text-red-800 mb-2">Fehler beim Laden der Kurse</h3>
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button
          @click="loadCourses"
          class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Erneut versuchen
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      
      <!-- Filter Section -->
      <div class="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <div class="flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-2">Kategorie</label>
            <select
              v-model="selectedCategory"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Alle Kategorien</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>

        </div>
      </div>

      <!-- Courses Grid -->
      <div v-if="filteredCourses.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="course in filteredCourses"
          :key="course.id"
          class="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
        >
          <!-- Course Header -->
          <div class="p-6 border-b border-gray-200">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ course.name }}</h3>
                <p class="text-gray-600 text-sm">{{ course.description }}</p>
              </div>
              <span
                :class="[
                  'px-3 py-1 rounded-full text-xs font-medium',
                  getStatusClass(course.status)
                ]"
              >
                {{ getStatusText(course.status) }}
              </span>
            </div>
            
            <!-- Course Category -->
            <div class="flex items-center gap-2 mb-3">
              <span class="text-sm text-gray-500">Kategorie:</span>
              <span class="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                {{ course.category_name }}
              </span>
            </div>
          </div>

          <!-- Course Details -->
          <div class="p-6">
            <div class="space-y-3 mb-6">
              <!-- Price -->
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span class="text-sm text-gray-600">CHF {{ (course.price_per_participant_rappen / 100).toFixed(2) }}</span>
              </div>

              <!-- Max Participants -->
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span class="text-sm text-gray-600">
                  {{ course.current_participants || 0 }} / {{ course.max_participants }} Teilnehmer
                </span>
              </div>

              <!-- Course Sessions -->
              <div v-if="course.sessions && course.sessions.length > 0" class="space-y-2">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="text-sm font-medium text-gray-700">Termine:</span>
                </div>
                <div class="ml-8 space-y-1">
                  <div 
                    v-for="session in course.sessions" 
                    :key="session.id"
                    class="text-sm text-gray-600"
                  >
                    <div class="flex items-center gap-2">
                      <span class="text-gray-500">
                        {{ session.description || `Teil ${session.session_number}` }} {{ formatDate(session.start_time) }} {{ formatTime(session.start_time) }} - {{ formatTime(session.end_time) }}
                      </span>
                      <span v-if="showInstructorInfo">
                        <span v-if="session.instructor_type === 'internal' && session.staff" class="text-blue-600">
                          : {{ session.staff.first_name }} {{ session.staff.last_name.charAt(0) }}.
                        </span>
                        <span v-else-if="session.instructor_type === 'external' && session.external_instructor_name" class="text-green-600">
                          : {{ session.external_instructor_name.split(' ')[0] }} {{ session.external_instructor_name.split(' ')[1]?.charAt(0) || '' }}.
                        </span>
                        <span v-else class="text-gray-400">
                          : Kein Instruktor
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Registration Deadline -->
              <div v-if="course.registration_deadline" class="flex items-center gap-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span class="text-sm text-gray-600">
                  Anmeldung bis: {{ formatDate(course.registration_deadline) }}
                </span>
              </div>
            </div>

            <!-- Action Button -->
            <button
              @click="enrollInCourse(course)"
              :disabled="!canEnroll(course)"
              :class="[
                'w-full py-3 px-4 rounded-lg font-medium transition-colors',
                canEnroll(course)
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              ]"
            >
              {{ getEnrollButtonText(course) }}
            </button>
          </div>
        </div>
      </div>

      <!-- No Courses Found -->
      <div v-else class="text-center py-12">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Keine Kurse gefunden</h3>
        <p class="text-gray-600">Versuchen Sie andere Filter oder schauen Sie später wieder vorbei.</p>
      </div>
    </div>

    <!-- Enrollment Modal -->
    <div v-if="showEnrollmentModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-900">Kurs anmelden</h2>
            <button
              @click="showEnrollmentModal = false"
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div v-if="selectedCourse" class="mb-6">
            <h3 class="font-semibold text-gray-900 mb-2">{{ selectedCourse.name }}</h3>
            <p class="text-gray-600 text-sm mb-4">{{ selectedCourse.description }}</p>
            <div class="bg-blue-50 rounded-lg p-4">
              <div class="flex justify-between items-center">
                <span class="text-blue-800 font-medium">Kursgebühr:</span>
                <span class="text-blue-900 font-bold">CHF {{ (selectedCourse.price_per_participant_rappen / 100).toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <div class="flex space-x-3">
            <button
              @click="showEnrollmentModal = false"
              class="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Abbrechen
            </button>
            <button
              @click="confirmEnrollment"
              :disabled="isEnrolling"
              class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <span v-if="isEnrolling">Wird angemeldet...</span>
              <span v-else>Anmelden</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { logger } from '~/utils/logger'

import { ref, computed, onMounted, watch } from 'vue'
import { navigateTo } from '#app'
import { getSupabase } from '~/utils/supabase'
import { useAuthStore } from '~/stores/auth'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { formatDate } from '~/utils/dateUtils'

definePageMeta({
  layout: 'customer',
  middleware: 'auth'
})

// Composables
const authStore = useAuthStore()
const { currentUser, isClient, fetchCurrentUser } = useCurrentUser()

// State
const isLoading = ref(true)
const error = ref<string | null>(null)
const courses = ref<any[]>([])
const categories = ref<any[]>([])
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedStatus = ref('')
const showEnrollmentModal = ref(false)
const selectedCourse = ref<any>(null)
const isEnrolling = ref(false)

// Instructor display setting (synced with admin setting)
const showInstructorInfo = ref(true)

// Listen for localStorage changes from admin page
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'showInstructorColumn') {
      showInstructorInfo.value = e.newValue === 'true'
    }
  })
}

// Computed
const filteredCourses = computed(() => {
  let filtered = courses?.value || []

  // Filter by category
  if (selectedCategory?.value) {
    filtered = filtered.filter(course => course.course_category_id === selectedCategory.value)
  }

  // Filter by status
  if (selectedStatus?.value) {
    filtered = filtered.filter(course => {
      switch (selectedStatus.value) {
        case 'upcoming':
          return course.status === 'scheduled' || course.status === 'open' || course.status === 'active'
        case 'open':
          return (course.status === 'open' || course.status === 'active') && (course.current_participants || 0) < course.max_participants
        case 'full':
          return (course.current_participants || 0) >= course.max_participants
        default:
          return true
      }
    })
  }

  // Filter by search query
  if (searchQuery?.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(course =>
      course.name.toLowerCase().includes(query) ||
      course.description.toLowerCase().includes(query) ||
      course.category_name.toLowerCase().includes(query)
    )
  }

  return filtered
})

// Methods
const loadCourses = async () => {
  try {
    if (isLoading) isLoading.value = true
    if (error) error.value = null

    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase client not available')
    
    // Ensure we have current user data
    if (!currentUser?.value?.tenant_id) {
      throw new Error('No tenant information available')
    }

    // Load courses with category information and sessions for current tenant
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        description,
        price_per_participant_rappen,
        max_participants,
        current_participants,
        status,
        registration_deadline,
        course_category_id,
        course_categories (
          id,
          name
        ),
        course_sessions (
          id,
          session_number,
          start_time,
          end_time,
          title,
          description,
          instructor_type,
          external_instructor_name,
          staff_id,
          staff:staff_id (
            id,
            first_name,
            last_name
          )
        )
      `)
      .eq('is_active', true)
      .eq('is_public', true)
      .eq('tenant_id', currentUser.value.tenant_id)
      .order('created_at', { ascending: false })

    if (coursesError) throw coursesError

    // Transform data to include category name and session info
    courses.value = coursesData?.map(course => {
      const sessions = course.course_sessions || []
      const firstSession = sessions.length > 0 ? sessions[0] : null
      const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null
      
      return {
        ...course,
        category_name: (course.course_categories as any)?.name || 'Unbekannt',
        session_count: sessions.length,
        first_session_date: firstSession?.start_time,
        last_session_date: lastSession?.end_time,
        sessions: sessions.sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      }
    }) || []

    // Load categories for current tenant
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('course_categories')
      .select('id, name')
      .eq('is_active', true)
      .eq('tenant_id', currentUser.value.tenant_id)
      .order('name')

    if (categoriesError) throw categoriesError
    categories.value = categoriesData || []

    logger.debug('✅ Courses loaded:', courses.value.length)
    logger.debug('📊 Course data sample:', courses.value[0])
  } catch (err: any) {
    console.error('❌ Error loading courses:', err)
    error.value = err.message || 'Fehler beim Laden der Kurse'
  } finally {
    isLoading.value = false
  }
}


const getStatusClass = (status: string) => {
  switch (status) {
    case 'open':
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'scheduled':
      return 'bg-blue-100 text-blue-800'
    case 'full':
      return 'bg-red-100 text-red-800'
    case 'completed':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'open':
    case 'active':
      return 'Anmeldung offen'
    case 'scheduled':
      return 'Geplant'
    case 'full':
      return 'Ausgebucht'
    case 'completed':
      return 'Abgeschlossen'
    default:
      return 'Unbekannt'
  }
}

const canEnroll = (course: any) => {
  const now = new Date()
  const deadline = course.registration_deadline ? new Date(course.registration_deadline) : null
  
  return (
    (course.status === 'open' || course.status === 'active') &&
    (course.current_participants || 0) < course.max_participants &&
    (!deadline || deadline > now)
  )
}

const getEnrollButtonText = (course: any) => {
  if (course.status === 'full' || (course.current_participants || 0) >= course.max_participants) {
    return 'Ausgebucht'
  }
  
  const now = new Date()
  const deadline = course.registration_deadline ? new Date(course.registration_deadline) : null
  
  if (deadline && deadline <= now) {
    return 'Anmeldung geschlossen'
  }
  
  if (course.status === 'open' || course.status === 'active') {
    return 'Anmelden'
  }
  
  return 'Nicht verfügbar'
}

const enrollInCourse = (course: any) => {
  if (!canEnroll(course)) return
  
  selectedCourse.value = course
  showEnrollmentModal.value = true
}

const confirmEnrollment = async () => {
  if (!selectedCourse?.value || !currentUser?.value) return
  
  try {
    isEnrolling.value = true
    
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase client not available')

    // Create course enrollment
    const { error: enrollmentError } = await supabase
      .from('course_enrollments')
      .insert({
        course_id: selectedCourse.value.id,
        user_id: currentUser.value.id,
        enrollment_date: new Date().toISOString(),
        status: 'enrolled'
      })

    if (enrollmentError) throw enrollmentError

    // Update course participant count
    const { error: updateError } = await supabase
      .from('courses')
      .update({
        current_participants: (selectedCourse.value.current_participants || 0) + 1
      })
      .eq('id', selectedCourse.value.id)

    if (updateError) throw updateError

    // Reload courses to update counts
    await loadCourses()
    
    showEnrollmentModal.value = false
    selectedCourse.value = null
    
    // Show success message (you can implement a toast notification here)
    alert('Erfolgreich für den Kurs angemeldet!')
    
  } catch (err: any) {
    console.error('❌ Error enrolling in course:', err)
    alert('Fehler bei der Anmeldung: ' + (err.message || 'Unbekannter Fehler'))
  } finally {
    isEnrolling.value = false
  }
}

const navigateToDashboard = async () => {
  await navigateTo('/customer-dashboard')
}

const formatTime = (dateString: string) => {
  if (!dateString) return ''
  
  try {
    // Extrahiere Zeit direkt aus dem String ohne Date-Objekt
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2}).*?(\d{2}):(\d{2})/)
    
    if (!match) {
      return 'Ungültige Zeit'
    }
    
    const [, year, month, day, hour, minute] = match
    
    // Format als HH:MM
    return `${hour}:${minute}`
  } catch (error) {
    console.warn('Error formatting time:', dateString, error)
    return 'Zeit Fehler'
  }
}

// Lifecycle
onMounted(async () => {
  logger.debug('🔍 Customer courses page mounted')
  
  // Load instructor display setting from localStorage (synced with admin setting)
  const savedPreference = localStorage.getItem('showInstructorColumn')
  if (savedPreference !== null) {
    showInstructorInfo.value = savedPreference === 'true'
  }
  
  // Ensure user profile is loaded
  await fetchCurrentUser()
  
  // Check auth
  if (!authStore.isLoggedIn || !isClient?.value) {
    logger.debug('❌ Not logged in or not a client, redirecting...')
    await navigateTo('/login')
    return
  }
  
  await loadCourses()
})
</script>

<style scoped>
/* Custom styles if needed */
</style>
