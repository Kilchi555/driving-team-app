<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Meine Kurse</h1>
            <p class="text-gray-600">Willkommen, {{ currentUser?.first_name }} {{ currentUser?.last_name }}</p>
          </div>
          <button
            @click="logout"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Abmelden
          </button>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Fehler beim Laden der Kurse</h3>
            <p class="text-sm text-red-700 mt-1">{{ error }}</p>
          </div>
        </div>
      </div>

      <!-- Courses List -->
      <div v-else-if="myCourses.length > 0" class="space-y-6">
        <div v-for="course in myCourses" :key="course.id" class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div class="p-6">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900">{{ course.name }}</h3>
                <p class="text-gray-600 mt-1">{{ course.description }}</p>
                
                <!-- Course Info -->
                <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span class="text-sm font-medium text-gray-500">Kategorie:</span>
                    <span class="ml-2 text-sm text-gray-900">{{ course.course_category?.name || 'Unbekannt' }}</span>
                  </div>
                  <div>
                    <span class="text-sm font-medium text-gray-500">Teilnehmer:</span>
                    <span class="ml-2 text-sm text-gray-900">{{ course.current_participants || 0 }} / {{ course.max_participants }}</span>
                  </div>
                  <div>
                    <span class="text-sm font-medium text-gray-500">Status:</span>
                    <span :class="getStatusClass(course)" class="ml-2 text-sm font-medium">{{ getStatusText(course) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- My Sessions -->
            <div v-if="course.sessions && course.sessions.length > 0" class="mt-6">
              <h4 class="text-md font-medium text-gray-900 mb-3">Meine Sessions</h4>
              <div class="space-y-3">
                <div 
                  v-for="session in getMySessions(course)" 
                  :key="session.id"
                  class="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="text-sm font-medium text-gray-900">
                        {{ session.description || `Session ${session.session_number}` }}
                      </div>
                      <div class="text-sm text-gray-600">
                        {{ formatDate(session.start_time) }} - {{ formatTime(session.start_time) }} bis {{ formatTime(session.end_time) }}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-medium text-blue-600">
                        👤 {{ currentUser?.first_name }} {{ currentUser?.last_name }}
                      </div>
                      <div class="text-xs text-gray-500">
                        Externer Instruktor
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Courses State -->
      <div v-else class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Keine Kurse zugewiesen</h3>
        <p class="mt-1 text-sm text-gray-500">
          Sie haben noch keine Kurse zugewiesen bekommen.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>

import { ref, onMounted, computed } from 'vue'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

const { currentUser, fetchCurrentUser } = useCurrentUser()
const authStore = useAuthStore()

const isLoading = ref(true)
const error = ref(null)
const myCourses = ref([])

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('de-CH')
}

const formatTime = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
}

const getMySessions = (course) => {
  if (!course.sessions || !currentUser.value) return []
  return course.sessions.filter(session => session.staff_id === currentUser.value.id)
}

const getStatusClass = (course) => {
  const status = getCourseStatus(course)
  switch (status) {
    case 'active':
      return 'text-green-600'
    case 'running':
      return 'text-blue-600'
    case 'completed':
      return 'text-gray-600'
    case 'cancelled':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

const getStatusText = (course) => {
  const status = getCourseStatus(course)
  switch (status) {
    case 'active':
      return 'Aktiv'
    case 'running':
      return 'Läuft'
    case 'completed':
      return 'Abgeschlossen'
    case 'cancelled':
      return 'Abgesagt'
    default:
      return 'Unbekannt'
  }
}

const getCourseStatus = (course) => {
  if (!course.sessions || course.sessions.length === 0) return 'draft'
  
  const now = new Date()
  const activeSession = course.sessions.find(s => {
    const startTime = new Date(s.start_time)
    const endTime = new Date(s.end_time)
    return startTime <= now && endTime >= now
  })
  if (activeSession) return 'running'
  
  const allSessionsFinished = course.sessions.every(s => new Date(s.end_time) < now)
  if (allSessionsFinished) return 'completed'
  
  const firstSession = course.sessions[0]
  if (firstSession && new Date(firstSession.start_time) > now) return 'active'
  
  return 'active'
}

const loadMyCourses = async () => {
  if (!currentUser.value?.tenant_id) return
  
  try {
    const { $supabase } = useNuxtApp()
    const { data: courses, error: coursesError } = await $supabase
      .from('courses')
      .select(`
        *,
        course_category:course_categories(name, icon),
        sessions:course_sessions(
          id,
          session_number,
          start_time,
          end_time,
          description,
          staff_id
        )
      `)
      .eq('tenant_id', currentUser.value.tenant_id)
      .eq('is_active', true)
      .contains('sessions', [{ staff_id: currentUser.value.id }])
    
    if (coursesError) throw coursesError
    
    myCourses.value = courses || []
    
  } catch (err) {
    console.error('Error loading courses:', err)
    error.value = 'Fehler beim Laden der Kurse'
  } finally {
    isLoading.value = false
  }
}

const logout = async () => {
  await authStore.logout()
  return await redirectToSlugOrLogin()
}

const redirectToSlugOrLogin = async () => {
  const route = useRoute()
  const slugMatch = route.path.match(/^\/([^\/]+)/)
  if (slugMatch && slugMatch[1] && slugMatch[1] !== 'external-instructor-dashboard') {
    const slug = slugMatch[1]
    logger.debug('Auth: Redirecting to slug route:', `/${slug}`)
    return await navigateTo(`/${slug}`)
  }
  
  logger.debug('Auth: No slug found, redirecting to login')
  return await navigateTo('/login')
}

onMounted(async () => {
  await fetchCurrentUser()
  
  if (!currentUser.value) {
    return await redirectToSlugOrLogin()
  }
  
  if (currentUser.value.role !== 'externer_instruktor') {
    await navigateTo('/customer-dashboard')
    return
  }
  
  await loadMyCourses()
})
</script>
