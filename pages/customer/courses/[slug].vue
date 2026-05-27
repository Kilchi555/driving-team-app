<template>
  <div 
    class="h-[100svh] flex flex-col bg-gradient-to-br from-slate-50 to-slate-100"
    :style="{'--primary-color': tenantBranding?.primary_color || '#10B981'} as any"
  >
    <!-- Header -->
    <div 
      class="shadow-sm border-b flex-shrink-0 pt-safe"
      :style="{'backgroundColor': tenantBranding?.primary_color || '#10B981'}"
    >
      <div class="max-w-6xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <button 
            @click="router.back()"
            class="flex items-center gap-2 text-white hover:opacity-80 transition-opacity cursor-pointer"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Zurück</span>
          </button>
          <h1 class="text-xl font-semibold text-white text-right">Unsere Kurse</h1>
        </div>
      </div>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto">

    <!-- Initial Loading Overlay -->
    <div
      v-if="isInitializing"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50"
    >
      <div class="mb-8">
        <img
          v-if="tenantBranding && (tenant?.logo_wide_url || tenant?.logo_url)"
          :src="tenant.logo_wide_url || tenant.logo_url"
          alt="Logo"
          class="h-16 object-contain drop-shadow-md"
        />
        <div
          v-else
          class="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
          :style="{ backgroundColor: tenantBranding?.primary_color || '#10B981' }"
        >
          {{ getInitials(tenant?.name || '') }}
        </div>
      </div>
      <div
        class="w-10 h-10 rounded-full border-4 border-gray-200 animate-spin"
        :style="{ borderTopColor: tenantBranding?.primary_color || '#10B981' }"
      ></div>
      <p class="mt-4 text-sm text-gray-500">Kurse werden geladen…</p>
    </div>

    <!-- Loading State (within-page) -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div
        class="animate-spin rounded-full h-12 w-12 border-b-2"
        :style="{ borderBottomColor: tenantBranding?.primary_color || '#10B981' }"
      ></div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="max-w-6xl mx-auto px-4 py-12">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p class="text-red-700">{{ error }}</p>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="max-w-6xl mx-auto px-4 py-8">
      <!-- Filters -->
      <div class="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div class="grid grid-cols-2 gap-4 max-w-md">
          <!-- Category Filter -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Kategorie</label>
            <select 
              v-model="selectedCategory" 
              class="tenant-focus w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2"
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
              class="tenant-focus w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2"
            >
              <option value="">Alle Standorte</option>
              <option v-for="loc in locations" :key="loc" :value="loc">{{ loc }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Meine Anmeldung (authenticated users only) -->
      <div v-if="myRegistrations.length > 0" class="mb-6">
        <h2 class="text-base font-semibold text-slate-700 mb-3">Meine Anmeldungen</h2>
        <div class="space-y-3">
          <div
            v-for="reg in myRegistrations"
            :key="reg.id"
            class="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-4"
          >
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-slate-800">{{ reg.courses?.name }}</p>
                <p class="text-sm text-slate-500 mt-0.5">
                  Kategorie: {{ reg.courses?.category }}
                  <span v-if="reg.courses?.course_start_date">
                    · {{ formatSessionDate(reg.courses.course_start_date.split('T')[0]) }}
                  </span>
                </p>
                <span class="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full"
                  :class="{
                    'bg-green-100 text-green-800': reg.status === 'confirmed' || reg.status === 'enrolled',
                    'bg-yellow-100 text-yellow-800': reg.status === 'pending',
                  }">
                  {{ reg.status === 'confirmed' || reg.status === 'enrolled' ? 'Bestätigt' : 'Ausstehend' }}
                </span>
              </div>
              <!-- Umplanen button (only for SARI-managed courses with > 7 days until start) -->
              <div class="flex-shrink-0">
                <button
                  v-if="reg.courses?.sari_managed && canCustomerTransfer(reg)"
                  @click.stop="startCustomerTransfer(reg)"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border-2 transition-colors"
                  :style="{
                    color: tenantBranding?.primary_color || '#10B981',
                    borderColor: tenantBranding?.primary_color || '#10B981',
                  }"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                  </svg>
                  Umplanen
                </button>
                <p
                  v-else-if="reg.courses?.sari_managed && !canCustomerTransfer(reg)"
                  class="text-xs text-slate-400 max-w-[160px] text-right"
                >
                  Umplanung nur bis 7 Tage vor Kursbeginn — bitte Fahrlehrer kontaktieren.
                </p>
              </div>
            </div>
            <!-- Inline transfer picker for this registration -->
            <div
              v-if="customerTransferRegId === reg.id"
              class="mt-3 p-3 border rounded-lg"
              :style="{
                backgroundColor: `${tenantBranding?.primary_color || '#10B981'}0d`,
                borderColor: `${tenantBranding?.primary_color || '#10B981'}33`
              }"
            >
              <p class="text-sm font-medium mb-2" :style="{ color: tenantBranding?.primary_color || '#10B981' }">Umplanen zu:</p>
              <div v-if="customerTransferOptions(reg).length === 0" class="text-sm text-gray-500 mb-2">
                Keine verfügbaren Kurse derselben Kategorie mit freien Plätzen.
              </div>
              <select
                v-else
                v-model="customerTransferTargetId"
                class="tenant-focus w-full text-sm border rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2"
                :style="{ borderColor: `${tenantBranding?.primary_color || '#10B981'}66` }"
              >
                <option value="">Ziel-Kurs auswählen…</option>
                <option v-for="c in customerTransferOptions(reg)" :key="c.id" :value="c.id">
                  {{ c.name }} ({{ (c.max_participants ?? 0) - (c.current_participants ?? 0) }} freie Plätze)
                </option>
              </select>
              <p v-if="customerTransferError" class="text-xs text-red-600 mb-2">{{ customerTransferError }}</p>
              <div class="flex gap-2">
                <button
                  @click="confirmCustomerTransfer(reg)"
                  :disabled="customerTransferring || !customerTransferTargetId"
                  class="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :style="{ backgroundColor: tenantBranding?.primary_color || '#10B981' }"
                >
                  {{ customerTransferring ? 'Umbuchen…' : 'Umbuchen bestätigen' }}
                </button>
                <button
                  @click="cancelCustomerTransfer"
                  class="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
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
          class="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border-2 border-slate-200"
          :class="course.status !== 'waitlist' ? 'cursor-pointer' : ''"
          @click="course.status !== 'waitlist' && openEnrollmentModal(course)"
        >
          <!-- Course Header -->
          <div class="p-5 border-b border-slate-100">
            <h3 class="font-semibold text-lg text-slate-800 mb-1">{{ removeDateFromTitle(course.name) }}</h3>
            <p class="text-sm text-slate-500">{{ course.description || 'Standort wird noch bekannt gegeben' }}</p>
          </div>
          
          <!-- Sessions -->
          <div class="p-5 space-y-2">
            <!-- Waitlist: no date yet -->
            <div v-if="course.status === 'waitlist'" class="flex items-center gap-3 text-sm">
              <div 
                class="w-8 h-8 rounded-full flex items-center justify-center font-medium text-white"
                :style="{'backgroundColor': tenantBranding?.primary_color || '#10B981'}"
              >
                ?
              </div>
              <p class="text-slate-500 italic">Datum folgt — Warteliste offen</p>
            </div>
            <!-- Regular sessions -->
            <div 
              v-else
              v-for="(session, idx) in getGroupedSessions(course)" 
              :key="idx"
              class="flex items-center gap-3 text-sm"
            >
              <div 
                class="w-8 h-8 rounded-full flex items-center justify-center font-medium text-white"
                :style="{'backgroundColor': tenantBranding?.primary_color || '#10B981'}"
              >
                {{ idx + 1 }}
              </div>
              <div>
                <p class="font-medium text-slate-700">
                  {{ formatSessionDate(session.date) }} 
                  <span class="font-normal text-slate-600">{{ session.timeRange }}</span>
                </p>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="px-5 py-4 bg-slate-50 space-y-4">
            <!-- Waitlist footer -->
            <div v-if="course.status === 'waitlist'">
              <p class="text-sm text-slate-500 mb-3">Trage dich auf die Warteliste ein – wir benachrichtigen dich, sobald ein Termin feststeht.</p>
              <a
                :href="`/booking/waitlist/${course.id}`"
                @click.stop
                class="block w-full px-4 py-2 text-white font-medium rounded-lg transition-opacity hover:opacity-90 text-center"
                :style="{'backgroundColor': tenantBranding?.primary_color || '#10B981'}"
              >
                Auf Warteliste eintragen
              </a>
            </div>

            <!-- Regular course footer -->
            <template v-else>
              <!-- Price and Free Slots -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-sm text-slate-500">Preis</p>
                  <p class="font-bold text-lg text-slate-800">CHF {{ formatPrice(course.price_per_participant_rappen) }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm text-slate-500">Freie Plätze</p>
                  <p class="font-semibold" :class="{'text-red-500': course.free_slots === 0}" :style="course.free_slots > 0 ? {'color': tenantBranding?.primary_color || '#10B981'} : {}">
                    <span v-if="course.free_slots > 3">mehr als 3</span>
                    <span v-else-if="course.free_slots === 0">Ausgebucht</span>
                    <span v-else-if="course.free_slots !== undefined">{{ course.free_slots }}</span>
                    <span v-else>?</span>
                  </p>
                </div>
              </div>
              
              <!-- Buttons -->
              <div class="space-y-2">
                <!-- Sessions anpassen Button (only if course has free slots) -->
                <button
                  v-if="hasChangeableSessions(course) && course.free_slots > 0"
                  @click.stop="openSessionCustomizer(course)"
                  class="w-full px-4 py-2 font-medium rounded-lg border-2 transition-colors flex items-center justify-center gap-2"
                  :style="{
                    'color': tenantBranding?.primary_color || '#10B981',
                    'borderColor': tenantBranding?.primary_color || '#10B981'
                  }"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Sessions anpassen
                </button>
                
                <!-- Anmelden Button -->
                <button 
                  v-if="course.free_slots > 0"
                  @click.stop="openEnrollmentModal(course)"
                  class="w-full px-4 py-2 text-white font-medium rounded-lg transition-opacity hover:opacity-90"
                  :style="{
                    'backgroundColor': tenantBranding?.primary_color || '#10B981'
                  }"
                >
                  Anmelden
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    </div><!-- end scrollable content -->

    <!-- Enrollment Modal -->
    <CourseEnrollmentModal
      v-if="selectedCourse"
      :is-open="showEnrollmentModal"
      :course="selectedCourse"
      :tenant-id="tenantId"
      :tenant-slug="slug"
      :wallee-enabled-override="tenantWalleeEnabled"
      @close="closeEnrollmentModal"
      @enrolled="handleEnrolled"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAsyncData } from '#app'
import { logger } from '~/utils/logger'
import { useUIStore } from '~/stores/ui'
import CourseEnrollmentModal from '~/components/customer/CourseEnrollmentModal.vue'

definePageMeta({
  layout: 'default',
  middleware: []
})

const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug as string)

// State
const isLoading = ref(false)
const isInitializing = ref(true)
const error = ref<string | null>(null)
const tenant = ref<any>(null)
const tenantBranding = ref<any>(null)
const tenantWalleeEnabled = ref<boolean>(false)
const courses = ref<any[]>([])
const selectedCategory = ref('')
const selectedLocation = ref('')
const selectedCourse = ref<any>(null)
const showEnrollmentModal = ref(false)

// My registrations (authenticated users)
const myRegistrations = ref<any[]>([])
const customerTransferRegId = ref<string | null>(null)
const customerTransferTargetId = ref<string>('')
const customerTransferring = ref(false)
const customerTransferError = ref('')

// Pre-fetch tenant branding so the header colour is available before onMounted
// Using a try/catch so a failing API (wrong slug, network error) never throws
// up to Nuxt's error page — the component's own error state handles it.
const { data: initData, error: initError } = await useAsyncData(
  `courses-init-${slug.value}`,
  () => $fetch<any>('/api/courses/public', { query: { slug: slug.value } }),
  { watch: [slug], lazy: true }
).catch(() => ({ data: ref(null), error: ref(null) }))

if (initData.value?.success && initData.value?.tenant) {
  tenant.value = initData.value.tenant
  tenantBranding.value = {
    primary_color: initData.value.tenant.primary_color || '#10B981',
    secondary_color: initData.value.tenant.secondary_color,
    accent_color: initData.value.tenant.accent_color
  }
}

// Computed
const tenantId = computed(() => tenant.value?.id || '')

const categories = computed(() => {
  let coursesToUse = courses.value
  
  // If location is selected, only show categories of courses in that location
  if (selectedLocation.value) {
    coursesToUse = coursesToUse.filter(c => getCourseCity(c) === selectedLocation.value)
  }
  
  const cats = new Set(coursesToUse.map(c => c.category).filter(Boolean))
  return Array.from(cats).sort()
})

const getInitials = (name: string): string => {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

// Returns the city for a course. Uses the dedicated `city` column when available,
// falls back to extracting it from description or name for legacy records.
const getCourseCity = (c: any): string => {
  if (c.city) return c.city
  return extractCity(c.description || c.name)
}

// Extract city from free-text description or course name (legacy fallback).
// Handles:
//   "Herrengasse 17, 8853 Zürich SZ"  →  "Zürich"  (PLZ format)
//   "Swiss Life Arena in Zürich"       →  "Zürich"  ("in City" pattern)
//   "VKU Zürich"                       →  "Zürich"  (last capitalised word)
const extractCity = (text: string): string => {
  if (!text) return ''
  const plzMatch = text.match(/,\s*\d{4}\s+([A-Za-zäöüÄÖÜ\-\s]+?)(?:\s+[A-Z]{2})?$/)
  if (plzMatch) return plzMatch[1].trim()
  const inMatch = text.match(/\bin\s+([A-ZÄÖÜ][A-Za-zäöüÄÖÜ\-]+)(?:\s+[A-Z]{2})?$/)
  if (inMatch) return inMatch[1].trim()
  const lastWordMatch = text.match(/\s([A-ZÄÖÜ][A-Za-zäöüÄÖÜ\-]+)(?:\s+[A-Z]{2})?$/)
  if (lastWordMatch) return lastWordMatch[1].trim()
  return ''
}

const locations = computed(() => {
  let coursesToUse = courses.value
  
  // If category is selected, only show locations of courses in that category
  if (selectedCategory.value) {
    coursesToUse = coursesToUse.filter(c => c.category === selectedCategory.value)
  }
  
  const locs = new Set(coursesToUse.map(c => getCourseCity(c)).filter(Boolean))
  return Array.from(locs).sort()
})

const filteredCourses = computed(() => {
  let result = [...courses.value]
  
  if (selectedCategory.value) {
    result = result.filter(c => c.category === selectedCategory.value)
  }
  
  if (selectedLocation.value) {
    result = result.filter(c => getCourseCity(c) === selectedLocation.value)
  }
  
  // Waitlist courses first, then by next session date ascending
  result.sort((a, b) => {
    const aIsWaitlist = a.status === 'waitlist'
    const bIsWaitlist = b.status === 'waitlist'
    if (aIsWaitlist && !bIsWaitlist) return -1
    if (!aIsWaitlist && bIsWaitlist) return 1
    const aDate = a.course_sessions?.[0]?.start_time || ''
    const bDate = b.course_sessions?.[0]?.start_time || ''
    return aDate.localeCompare(bDate)
  })
  
  return result
})

// Methods
const loadData = async () => {
  try {
    // Use secure public API instead of direct DB queries
    const response = await $fetch('/api/courses/public', {
      query: { slug: slug.value }
    }) as any

    if (!response.success) {
      error.value = 'Fehler beim Laden der Kurse'
      return
    }

    // Set tenant data
    tenant.value = response.tenant
    tenantWalleeEnabled.value = response.tenant.wallee_enabled ?? false
    
    // Load branding
    tenantBranding.value = {
      primary_color: response.tenant.primary_color || '#10B981',
      secondary_color: response.tenant.secondary_color,
      accent_color: response.tenant.accent_color
    }
    
    // Filter courses where ALL sessions are in the future, OR it's a waitlist course
    const now = new Date().toISOString()
    const futureCourses = (response.courses || []).filter((course: any) => {
      if (course.status === 'waitlist') return true
      if (!course.course_sessions || course.course_sessions.length === 0) return false
      return course.course_sessions.every((s: any) => s.start_time > now)
    })
    
    // Calculate free slots
    courses.value = futureCourses.map((course: any) => ({
      ...course,
      free_slots: (course.max_participants || 0) - (course.current_participants || 0)
    }))
    
    logger.debug(`Loaded ${courses.value.length} future courses`)
  } catch (err: any) {
    logger.error('Error loading data:', err)
    error.value = err.data?.statusMessage || 'Fahrschule nicht gefunden'
  }
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
    const formatted = new Intl.DateTimeFormat('de-CH', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
    // Remove comma after weekday: "Mo, 20.01.2026" → "Mo 20.01.2026"
    return formatted.replace(/, /, ' ')
  } catch {
    return dateStr
  }
}

const formatTime = (isoString: string) => {
  try {
    // Always convert to Swiss local time (Europe/Zurich) before displaying
    const date = new Date(isoString.replace(' ', 'T'))
    return date.toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Zurich'
    })
  } catch {
    return ''
  }
}

const formatPrice = (rappen: number) => {
  return (rappen / 100).toFixed(2)
}

const removeDateFromTitle = (title: string): string => {
  if (!title) return ''
  return title.replace(/\s*-\s*\d{2}\.\d{2}\.\d{4}$/, '')
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
  // Show success message via global UI store
  const uiStore = useUIStore()
  uiStore.showSuccess('Anmeldung erfolgreich!', 'Die Bestätigungsmail wurde versendet.')
  loadData() // Refresh to update free slots
}

// Check if a course has changeable sessions (for the button)
const hasChangeableSessions = (course: any): boolean => {
  if (!course?.course_sessions?.length) return false
  
  const sorted = [...course.course_sessions].sort((a: any, b: any) => 
    a.start_time.localeCompare(b.start_time)
  )
  
  // Group by date
  const byDate: Map<string, any[]> = new Map()
  for (const session of sorted) {
    const date = session.start_time.split('T')[0]
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(session)
  }
  
  // Check if there are more than 1 group (more than 1 day)
  return byDate.size > 1
}

const openSessionCustomizer = (course: any) => {
  selectedCourse.value = course
  showEnrollmentModal.value = true
  // The modal will automatically show the session customizer on mount
}

// Check for success params on mount (after Wallee payment redirect)
const checkSuccessParams = () => {
  if (route.query.success === 'true') {
    logger.debug('✅ Success params found - payment completed')
    // Show success via global UI store
    const uiStore = useUIStore()
    uiStore.showSuccess('Anmeldung erfolgreich!', 'Die Bestätigungsmail wurde versendet.')
    // Clean up the URL
    window.history.replaceState({}, '', route.path)
  }
}

// Apply query params to filters
watch(() => route.query, (query) => {
  // Handle success parameter
  checkSuccessParams()
  
  // Apply filter params
  if (query.category) selectedCategory.value = query.category as string
  if (query.location) selectedLocation.value = query.location as string
}, { immediate: true })

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const canCustomerTransfer = (reg: any): boolean => {
  const startDate = reg.courses?.course_start_date ? new Date(reg.courses.course_start_date) : null
  if (!startDate) return false
  return startDate.getTime() - Date.now() > SEVEN_DAYS_MS
}

const customerTransferOptions = (reg: any) => {
  return courses.value.filter(c =>
    c.id !== reg.course_id &&
    c.sari_managed &&
    c.category === reg.courses?.category &&
    c.is_active !== false &&
    (c.max_participants ?? 0) > (c.current_participants ?? 0)
  )
}

const startCustomerTransfer = (reg: any) => {
  customerTransferRegId.value = reg.id
  customerTransferTargetId.value = ''
  customerTransferError.value = ''
}

const cancelCustomerTransfer = () => {
  customerTransferRegId.value = null
  customerTransferTargetId.value = ''
  customerTransferError.value = ''
}

const confirmCustomerTransfer = async (reg: any) => {
  if (!customerTransferTargetId.value) {
    customerTransferError.value = 'Bitte einen Ziel-Kurs auswählen.'
    return
  }
  if (customerTransferring.value) return
  customerTransferring.value = true
  customerTransferError.value = ''
  try {
    const response = await fetch('/api/sari/transfer-enrollment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId: reg.id, targetCourseId: customerTransferTargetId.value, notifyCustomer: true }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.statusMessage || data?.message || 'Umplanung fehlgeschlagen')
    }
    cancelCustomerTransfer()
    const uiStore = useUIStore()
    uiStore.showSuccess('Umplanung erfolgreich!', `Du wurdest umgebucht zu "${data.toCourse?.name}".`)
    await loadData()
    await loadMyRegistrations()
  } catch (err: any) {
    customerTransferError.value = err?.message || 'Umplanung fehlgeschlagen'
  } finally {
    customerTransferring.value = false
  }
}

const loadMyRegistrations = async () => {
  if (!tenant.value?.id) return
  try {
    const data = await $fetch<{ registrations: any[] }>('/api/courses/my-registrations', {
      query: { tenantId: tenant.value.id }
    })
    myRegistrations.value = data?.registrations ?? []
  } catch {
    // Not authenticated or other error — silently ignore
    myRegistrations.value = []
  }
}

// Load data
onMounted(async () => {
  logger.debug('Loading courses for slug:', slug.value)
  
  try {
    await loadData()
    await loadMyRegistrations()
  } catch (e: any) {
    logger.error('Error:', e)
    error.value = 'Ein Fehler ist aufgetreten'
  } finally {
    isInitializing.value = false
  }
})
</script>

<style scoped>
.tenant-focus:focus {
  --tw-ring-color: var(--primary-color, #10B981);
  border-color: var(--primary-color, #10B981);
}
</style>

