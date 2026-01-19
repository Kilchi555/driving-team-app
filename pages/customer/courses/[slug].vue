<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="max-w-6xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <NuxtLink 
            to="/" 
            class="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Zurück</span>
          </NuxtLink>
          <h1 class="text-xl font-semibold text-slate-800">Unsere Kurse</h1>
          <div class="w-20"></div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="max-w-6xl mx-auto px-4 py-12">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p class="text-red-700">{{ error }}</p>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="max-w-6xl mx-auto px-4 py-8">
      <!-- Filters -->
      <div class="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Category Filter -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Kategorie</label>
            <select 
              v-model="selectedCategory" 
              class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Alle Kategorien</option>
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          
          <!-- Location Filter -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Standort</label>
            <select 
              v-model="selectedLocation" 
              class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Alle Standorte</option>
              <option v-for="loc in locations" :key="loc" :value="loc">{{ loc }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- No Courses -->
      <div v-if="filteredCourses.length === 0" class="bg-white rounded-xl shadow-sm p-12 text-center">
        <svg class="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p class="text-slate-500">Keine Kurse gefunden</p>
      </div>

      <!-- Course Cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="course in filteredCourses" 
          :key="course.id"
          class="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
          @click="openEnrollmentModal(course)"
        >
          <!-- Course Header -->
          <div class="p-5 border-b border-slate-100">
            <h3 class="font-semibold text-lg text-slate-800 mb-1">{{ course.name }}</h3>
            <p class="text-sm text-slate-500">{{ course.description || 'Standort wird noch bekannt gegeben' }}</p>
          </div>
          
          <!-- Sessions -->
          <div class="p-5 space-y-2">
            <div 
              v-for="(session, idx) in getGroupedSessions(course)" 
              :key="idx"
              class="flex items-center gap-3 text-sm"
            >
              <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium">
                {{ idx + 1 }}
              </div>
              <div>
                <p class="font-medium text-slate-700">{{ formatSessionDate(session.date) }}</p>
                <p class="text-slate-500">{{ session.timeRange }}{{ session.parts > 1 ? ` (${session.parts} Teile)` : '' }}</p>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="px-5 py-4 bg-slate-50 flex items-center justify-between gap-4">
            <div class="flex-1">
              <p class="text-sm text-slate-500">Preis</p>
              <p class="font-bold text-lg text-slate-800">CHF {{ formatPrice(course.price_per_participant_rappen) }}</p>
            </div>
            <div class="text-right flex-1">
              <p class="text-sm text-slate-500">Freie Plätze</p>
              <p class="font-semibold text-green-600">{{ course.free_slots || '?' }}</p>
            </div>
            <button 
              @click.stop="openEnrollmentModal(course)"
              class="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              Anmelden
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Enrollment Modal -->
    <CourseEnrollmentModal
      v-if="selectedCourse"
      :is-open="showEnrollmentModal"
      :course="selectedCourse"
      :tenant-id="tenantId"
      @close="closeEnrollmentModal"
      @enrolled="handleEnrolled"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import CourseEnrollmentModal from '~/components/customer/CourseEnrollmentModal.vue'

definePageMeta({
  layout: 'default',
  middleware: []
})

const route = useRoute()
const slug = computed(() => route.params.slug as string)

// State
const isLoading = ref(true)
const error = ref<string | null>(null)
const tenant = ref<any>(null)
const courses = ref<any[]>([])
const selectedCategory = ref('')
const selectedLocation = ref('')
const selectedCourse = ref<any>(null)
const showEnrollmentModal = ref(false)

// Computed
const tenantId = computed(() => tenant.value?.id || '')

const categories = computed(() => {
  const cats = new Set(courses.value.map(c => c.category).filter(Boolean))
  return Array.from(cats).sort()
})

const locations = computed(() => {
  const locs = new Set(courses.value.map(c => c.description).filter(Boolean))
  return Array.from(locs).sort()
})

const filteredCourses = computed(() => {
  let result = [...courses.value]
  
  if (selectedCategory.value) {
    result = result.filter(c => c.category === selectedCategory.value)
  }
  
  if (selectedLocation.value) {
    result = result.filter(c => c.description === selectedLocation.value)
  }
  
  // Sort by first session date
  result.sort((a, b) => {
    const aDate = a.course_sessions?.[0]?.start_time || ''
    const bDate = b.course_sessions?.[0]?.start_time || ''
    return aDate.localeCompare(bDate)
  })
  
  return result
})

// Methods
const loadTenant = async () => {
  const supabase = getSupabase()
  
  const { data, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('slug', slug.value)
    .single()
  
  if (tenantError || !data) {
    error.value = 'Fahrschule nicht gefunden'
    return null
  }
  
  return data
}

const loadCourses = async () => {
  if (!tenant.value?.id) return
  
  const supabase = getSupabase()
  const now = new Date().toISOString()
  
  const { data, error: coursesError } = await supabase
    .from('courses')
    .select(`
      id,
      name,
      category,
      description,
      price_per_participant_rappen,
      max_participants,
      current_participants,
      is_public,
      status,
      course_sessions (
        id,
        start_time,
        end_time,
        session_number
      )
    `)
    .eq('tenant_id', tenant.value.id)
    .eq('is_public', true)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  
  if (coursesError) {
    logger.error('Error loading courses:', coursesError)
    error.value = 'Fehler beim Laden der Kurse'
    return
  }
  
  // Filter courses where ALL sessions are in the future
  const futureCourses = (data || []).filter(course => {
    if (!course.course_sessions || course.course_sessions.length === 0) return false
    return course.course_sessions.every((s: any) => s.start_time > now)
  })
  
  // Calculate free slots
  courses.value = futureCourses.map(course => ({
    ...course,
    free_slots: (course.max_participants || 0) - (course.current_participants || 0)
  }))
  
  logger.debug(`Loaded ${courses.value.length} future courses`)
}

const getGroupedSessions = (course: any) => {
  if (!course.course_sessions || course.course_sessions.length === 0) return []
  
  // Sort sessions by start_time
  const sorted = [...course.course_sessions].sort((a, b) => 
    a.start_time.localeCompare(b.start_time)
  )
  
  // Group by date
  interface GroupedSession {
    date: string
    startTime: string
    endTime: string
    parts: number
  }
  
  const grouped: GroupedSession[] = []
  let currentDate = ''
  let currentGroup: GroupedSession | null = null
  
  for (const session of sorted) {
    const date = session.start_time.split('T')[0]
    
    if (date !== currentDate) {
      if (currentGroup) {
        grouped.push(currentGroup)
      }
      currentDate = date
      currentGroup = {
        date,
        startTime: session.start_time,
        endTime: session.end_time,
        parts: 1
      }
    } else {
      if (currentGroup) {
        currentGroup.endTime = session.end_time
        currentGroup.parts++
      }
    }
  }
  
  if (currentGroup) {
    grouped.push(currentGroup)
  }
  
  // Format time ranges
  return grouped.map(g => ({
    date: g.date,
    timeRange: `${formatTime(g.startTime)} - ${formatTime(g.endTime)}`,
    parts: g.parts
  }))
}

const formatSessionDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr + 'T00:00:00')
    return new Intl.DateTimeFormat('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  } catch {
    return dateStr
  }
}

const formatTime = (isoString: string) => {
  try {
    // Handle both "2026-01-20T18:00:00+00:00" and "2026-01-20 18:00:00+00" formats
    let hours, minutes
    
    if (isoString.includes('T')) {
      const timePart = isoString.split('T')[1]
      ;[hours, minutes] = timePart.split(':')
    } else {
      const timePart = isoString.split(' ')[1]
      ;[hours, minutes] = timePart.split(':')
    }
    
    return `${hours}:${minutes}`
  } catch {
    return ''
  }
}

const formatPrice = (rappen: number) => {
  return (rappen / 100).toFixed(2)
}

const openEnrollmentModal = (course: any) => {
  selectedCourse.value = course
  showEnrollmentModal.value = true
}

const closeEnrollmentModal = () => {
  showEnrollmentModal.value = false
  selectedCourse.value = null
}

const handleEnrolled = () => {
  closeEnrollmentModal()
  loadCourses() // Refresh to update free slots
}

// Apply query params to filters
watch(() => route.query, (query) => {
  if (query.category) selectedCategory.value = query.category as string
  if (query.location) selectedLocation.value = query.location as string
}, { immediate: true })

// Load data
onMounted(async () => {
  logger.debug('Loading courses for slug:', slug.value)
  
  try {
    tenant.value = await loadTenant()
    if (tenant.value) {
      await loadCourses()
    }
  } catch (e: any) {
    logger.error('Error:', e)
    error.value = 'Ein Fehler ist aufgetreten'
  } finally {
    isLoading.value = false
  }
})
</script>

