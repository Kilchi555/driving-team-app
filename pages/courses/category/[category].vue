<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-6xl mx-auto">
      
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-3xl font-bold text-gray-900 mb-4">
          {{ categoryInfo?.icon }} {{ categoryInfo?.name || 'Kursarten' }}
        </h1>
        <p v-if="categoryInfo?.description" class="text-lg text-gray-600 max-w-2xl mx-auto">
          {{ categoryInfo.description }}
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <div class="text-gray-600">Lade Kurse...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <div class="text-red-600 mb-4">
          <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-800 mb-2">Fehler beim Laden</h2>
        <p class="text-gray-600 mb-4">{{ error }}</p>
        <button 
          @click="goBack" 
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Zurück
        </button>
      </div>

      <!-- No Courses State -->
      <div v-else-if="courses.length === 0" class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-800 mb-2">Keine Kurse verfügbar</h2>
        <p class="text-gray-600 mb-4">
          Für diese Kursart sind momentan keine Kurse verfügbar.
        </p>
        <button 
          @click="goBack" 
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Zurück
        </button>
      </div>

      <!-- Courses Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="course in courses"
          :key="course.id"
          class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
        >
          <!-- Course Header -->
          <div class="p-6">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ course.name }}</h3>
                <p v-if="course.description" class="text-gray-600 text-sm mb-3">
                  {{ course.description }}
                </p>
              </div>
              <div class="ml-4 flex-shrink-0">
                <span 
                  :class="getStatusBadgeClass(course)"
                  class="px-2 py-1 text-xs font-medium rounded-full"
                >
                  {{ getStatusText(course) }}
                </span>
              </div>
            </div>

            <!-- Course Details -->
            <div class="space-y-2 text-sm text-gray-600 mb-4">
              <div class="flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{{ course.current_participants || 0 }} / {{ course.max_participants }} Teilnehmer</span>
              </div>
              
              <div v-if="getInstructorName(course)" class="flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{{ getInstructorName(course) }}</span>
              </div>

              <div v-if="course.next_session" class="flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{{ formatDateTime(course.next_session.start_time) }}</span>
              </div>

              <div v-if="course.price_per_participant_rappen" class="flex items-center">
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="font-semibold text-green-600">
                  {{ (course.price_per_participant_rappen / 100).toFixed(2) }} CHF
                </span>
              </div>
            </div>

            <!-- Action Button -->
            <div class="pt-4 border-t border-gray-100">
              <button
                v-if="!isCourseFull(course)"
                @click="enrollInCourse(course)"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Jetzt anmelden
              </button>
              <div
                v-else
                class="w-full bg-gray-300 text-gray-600 font-medium py-2 px-4 rounded-lg text-center"
              >
                Ausgebucht
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Back Button -->
      <div class="text-center mt-12">
        <button 
          @click="goBack" 
          class="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          ← Zurück zur Übersicht
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
// ✅ MIGRATED TO API - import { getSupabase } from '~/utils/supabase'
import { formatDateTime } from '~/utils/dateUtils'

const route = useRoute()
const router = useRouter()
// ✅ MIGRATED TO API - const supabase = getSupabase()

// State
const courses = ref<any[]>([])
const categoryInfo = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

// Computed
const categoryCode = computed(() => route.params.category as string)

// Methods
const loadCategoryAndCourses = async () => {
  try {
    isLoading.value = true
    error.value = null

    // Load category info
    const { data: category, error: categoryError } = await supabase
      .from('course_categories')
      .select('*')
      .eq('code', categoryCode.value)
      .single()

    if (categoryError) throw categoryError
    categoryInfo.value = category

    // Load courses for this category
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select(`
        *,
        course_category:course_categories(name, icon, color),
        instructor:users!courses_instructor_id_fkey(first_name, last_name),
        next_session:course_sessions(start_time),
        registrations:course_registrations(status)
      `)
      .eq('course_category_id', category.id)
      .eq('is_active', true)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (coursesError) throw coursesError

    // Calculate current participants for each course
    courses.value = coursesData.map(course => {
      const confirmedRegistrations = course.registrations?.filter((r: any) => r.status === 'confirmed') || []
      return {
        ...course,
        current_participants: confirmedRegistrations.length
      }
    })

  } catch (err: any) {
    console.error('Error loading category and courses:', err)
    error.value = 'Fehler beim Laden der Kurse'
  } finally {
    isLoading.value = false
  }
}

const enrollInCourse = (course: any) => {
  router.push(`/courses/enroll/${course.id}`)
}

const isCourseFull = (course: any) => {
  return (course.current_participants || 0) >= (course.max_participants || 0)
}

const getStatusText = (course: any) => {
  if (isCourseFull(course)) return 'Ausgebucht'
  if ((course.current_participants || 0) >= (course.max_participants * 0.8)) return 'Fast ausgebucht'
  return 'Verfügbar'
}

const getStatusBadgeClass = (course: any) => {
  if (isCourseFull(course)) return 'bg-red-100 text-red-800'
  if ((course.current_participants || 0) >= (course.max_participants * 0.8)) return 'bg-yellow-100 text-yellow-800'
  return 'bg-green-100 text-green-800'
}

const getInstructorName = (course: any) => {
  if (course.external_instructor_name) {
    return course.external_instructor_name
  }
  if (course.instructor) {
    return `${course.instructor.first_name} ${course.instructor.last_name}`
  }
  return null
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  loadCategoryAndCourses()
})
</script>

<style scoped>
/* Additional styling if needed */
</style>
