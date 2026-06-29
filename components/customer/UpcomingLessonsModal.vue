<!-- components/UpcomingLessonsModal.vue -->
<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div class="bg-white rounded-lg w-full max-w-full sm:max-w-2xl md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      
      <!-- Header -->
      <div class="sticky top-0" :style="{ backgroundColor: primaryColor }">
        <div class="px-6 py-4">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="text-2xl font-bold text-white">
                Kommende Lektionen
              </h3>
          
            </div>
            <button @click="$emit('close')" class="text-white hover:opacity-80 text-2xl transition-opacity">
              ✕
            </button>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">

        <!-- Empty State -->
        <div v-if="filteredLessons.length === 0" class="text-center py-16">
          <div class="text-6xl mb-4">📅</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Keine kommenden Termine</h3>
          <p class="text-gray-500">{{ getEmptyStateMessage() }}</p>
        </div>

        <!-- Lektionsliste -->
        <div v-else class="space-y-4">
          <div 
            v-for="lesson in filteredLessons" 
            :key="lesson.id"
            class="rounded-xl shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden"
            :style="{ borderLeft: `6px solid ${primaryColor}` }"
          >
            <!-- Termin Karte Background Gradient -->
            <div class="bg-gradient-to-br from-white to-gray-50 p-4">
              
              <!-- Top Row: Datum und Status Badge -->
              <div class="flex items-start justify-between mb-3">
                <div>
                  <div class="flex items-center gap-3">
                    <span class="text-sm font-bold px-3 py-1 rounded-full text-white" :style="{ backgroundColor: primaryColor }">
                      {{ formatLessonDate(lesson.start_time) }}
                    </span>
                    <span v-if="getStatusText(lesson) !== 'Geplant'" class="text-xs font-semibold px-3 py-1 rounded-full" :style="{ backgroundColor: primaryColor + '20', color: primaryColor }">
                      {{ getStatusText(lesson) }}
                    </span>
                  </div>
                </div>
                <div class="text-sm font-bold" :style="{ color: primaryColor }">
                  {{ getTimeUntil(lesson.start_time) }}
                </div>
              </div>

              <!-- Lesson Type with Category Badge -->
              <div v-if="lesson.event_type_code" class="mb-3 pb-3 border-b border-gray-200">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 class="text-lg font-bold text-gray-900">
                    {{ getLessonTypeTitle(lesson.event_type_code, lesson) }}
                  </h4>
                  <!-- Show category for driving lessons (not "course_session") -->
                  <span v-if="lesson.type && lesson.type !== 'course_session'" class="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full text-white" :style="{ backgroundColor: primaryColor }">
                    {{ lesson.type }}
                  </span>
                  <!-- Show session number for courses as "Teil X" or "Teil X-Y" -->
                  <span v-if="lesson.event_type_code === 'course' && lesson.session_number" class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full" :style="{ backgroundColor: primaryColor + '20', color: primaryColor }">
                    Teil {{ lesson.session_number }}
                  </span>
                </div>
                <p v-if="lesson.staff?.first_name" class="text-sm font-medium text-gray-600">
                  mit {{ lesson.staff.first_name }} {{ lesson.staff.last_name }}
                </p>
              </div>

              <!-- Time and Duration -->
              <div class="mb-3 flex items-center gap-4 text-sm">
                <div class="flex items-center gap-2">
                  <span class="text-xl">🕐</span>
                  <span class="font-semibold text-gray-700">{{ formatTimeRange(lesson.start_time, lesson.end_time, lesson.event_type_code === 'course') }}</span>
                </div>
                <div v-if="lesson.duration_minutes" class="flex items-center gap-2">
                  <span class="text-xl">⏱️</span>
                  <span class="font-semibold text-gray-700">{{ lesson.duration_minutes }} Min.</span>
                </div>
              </div>

              <!-- Location / Pickup -->
              <div v-if="lesson.customer_pickup_address || (lesson.location_details && (lesson.location_details.address || lesson.location_details.formatted_address))" class="mb-3">
                <div class="flex items-start gap-2">
                  <span class="text-lg mt-0.5">📍</span>
                  <div>
                    <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Treffpunkt</p>
                    <p class="text-xs text-gray-900">
                      {{ lesson.customer_pickup_address || formatLocationAddress(lesson.location_details) }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Umplanen button (only for SARI course sessions within 7+ days) -->
              <div v-if="lesson.event_type_code === 'course'">
                <div v-if="canTransfer(lesson) && transferringLessonId !== lesson.id">
                  <button
                    @click.stop="startTransfer(lesson)"
                    class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                    :style="{ color: primaryColor, borderColor: primaryColor }"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                    </svg>
                    Umplanen
                  </button>
                </div>
                <p v-else-if="!canTransfer(lesson)" class="text-xs text-gray-400">
                  Umplanung nur bis 7 Tage vor Kursbeginn — bitte Fahrlehrer kontaktieren.
                </p>

                <!-- Inline transfer picker -->
                <div
                  v-if="transferringLessonId === lesson.id"
                  class="mt-2 p-3 border rounded-lg"
                  :style="{ backgroundColor: `${primaryColor}0d`, borderColor: `${primaryColor}33` }"
                >
                  <p class="text-sm font-medium mb-2" :style="{ color: primaryColor }">Umplanen zu:</p>
                  <div v-if="loadingTargetCourses" class="text-xs text-gray-500 mb-2">Kurse werden geladen…</div>
                  <div v-else-if="transferTargetCourses.length === 0" class="text-xs text-gray-500 mb-2">
                    Keine verfügbaren Kurse mit freien Plätzen.
                  </div>
                  <select
                    v-else
                    v-model="transferTargetCourseId"
                    class="w-full text-sm border rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2"
                    :style="{ borderColor: `${primaryColor}66`, '--tw-ring-color': `${primaryColor}66` } as any"
                  >
                    <option value="">Ziel-Kurs auswählen…</option>
                    <option v-for="c in transferTargetCourses" :key="c.id" :value="c.id">
                      {{ c.name }} ({{ (c.max_participants ?? 0) - (c.current_participants ?? 0) }} freie Plätze)
                    </option>
                  </select>
                  <p v-if="transferError" class="text-xs text-red-600 mb-2">{{ transferError }}</p>
                  <div class="flex gap-2">
                    <button
                      @click="confirmTransfer(lesson)"
                      :disabled="transferring || !transferTargetCourseId"
                      class="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      :style="{ backgroundColor: primaryColor }"
                    >
                      {{ transferring ? 'Umbuchen…' : 'Umbuchen bestätigen' }}
                    </button>
                    <button
                      @click="cancelTransfer"
                      class="px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>

              <!-- Footer: Kalender + Termin absagen -->
              <div class="pt-2 mt-1 border-t border-gray-100 flex items-center justify-between">
                <!-- Zum Kalender hinzufügen -->
                <button
                  @click.stop="addLessonToCalendar(lesson)"
                  class="group flex items-center gap-1 text-xs font-medium transition-colors"
                  :style="{ color: primaryColor }"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Kalender
                </button>

                <!-- Termin absagen -->
                <button
                  v-if="lesson.event_type_code !== 'course' && lesson.id"
                  @click.stop="openCancellationModal(lesson)"
                  class="group flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg class="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Termin absagen
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Stornierungsmodal (gleich wie in payments.vue) -->
  <CustomerCancellationModal
    :is-visible="showCancellationModal"
    :appointment="selectedCancellationLesson"
    :payment="null"
    @close="closeCancellationModal"
    @cancelled="onAppointmentCancelled"
  />
</template>

<script setup lang="ts">

import { computed, ref, watch } from 'vue'
import { useTenantBranding } from '~/composables/useTenantBranding'
import { logger } from '~/utils/logger'
import { useCalendarSync } from '~/composables/useCalendarSync'
import CustomerCancellationModal from './CustomerCancellationModal.vue'

// Props & Emits
interface Props {
  isOpen: boolean
  lessons: any[]
  tenantId?: string
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'transfer-done', 'appointment-cancelled'])

const { addToCalendar } = useCalendarSync()

async function addLessonToCalendar(lesson: any) {
  const staffName = lesson.staff
    ? `${lesson.staff.first_name} ${lesson.staff.last_name}`
    : null
  const locationStr =
    lesson.customer_pickup_address ||
    lesson.location_details?.address ||
    lesson.location_details?.formatted_address ||
    lesson.location_name ||
    ''
  await addToCalendar({
    title: lesson.type ? `Fahrlektion (${lesson.type})` : 'Fahrlektion',
    startDate: new Date(lesson.start_time),
    endDate: new Date(lesson.end_time),
    location: locationStr,
    notes: staffName ? `Fahrlehrer: ${staffName}` : undefined,
    appointmentId: lesson.id,
  })
}

// Cancellation state
const showCancellationModal = ref(false)
const selectedCancellationLesson = ref<any>(null)

const openCancellationModal = (lesson: any) => {
  selectedCancellationLesson.value = lesson
  showCancellationModal.value = true
}
const closeCancellationModal = () => {
  showCancellationModal.value = false
  selectedCancellationLesson.value = null
}
const onAppointmentCancelled = (appointmentId: string) => {
  closeCancellationModal()
  emit('appointment-cancelled', appointmentId)
}

// Transfer (Umplanung) state
const transferringLessonId = ref<string | null>(null)
const transferTargetCourseId = ref('')
const transferring = ref(false)
const transferError = ref('')
const transferTargetCourses = ref<any[]>([])
const loadingTargetCourses = ref(false)

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const canTransfer = (lesson: any): boolean => {
  if (lesson.event_type_code !== 'course') return false
  if (!lesson.course_registration_id) return false
  const start = lesson.start_time ? new Date(lesson.start_time) : null
  return !!start && start.getTime() - Date.now() > SEVEN_DAYS_MS
}

const startTransfer = async (lesson: any) => {
  transferringLessonId.value = lesson.id
  transferTargetCourseId.value = ''
  transferError.value = ''
  transferTargetCourses.value = []
  loadingTargetCourses.value = true

  try {
    const data = await $fetch<{ courses: any[] }>('/api/courses/transfer-targets', {
      query: { courseId: lesson.course_id }
    })
    transferTargetCourses.value = data?.courses ?? []
  } catch {
    transferTargetCourses.value = []
  } finally {
    loadingTargetCourses.value = false
  }
}

const cancelTransfer = () => {
  transferringLessonId.value = null
  transferTargetCourseId.value = ''
  transferError.value = ''
  transferTargetCourses.value = []
}

const confirmTransfer = async (lesson: any) => {
  if (!transferTargetCourseId.value || transferring.value) return
  transferring.value = true
  transferError.value = ''
  try {
    const response = await fetch('/api/sari/transfer-enrollment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationId: lesson.course_registration_id,
        targetCourseId: transferTargetCourseId.value,
        notifyCustomer: true,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.statusMessage || data?.message || 'Umplanung fehlgeschlagen')
    }
    cancelTransfer()
    emit('transfer-done', data)
  } catch (err: any) {
    transferError.value = err?.message || 'Umplanung fehlgeschlagen'
  } finally {
    transferring.value = false
  }
}

// Tenant branding colors — use the same composable-provided computeds
// as the rest of the customer area (correct path: branding.colors.primary).
// The fallback colors only apply if branding has not loaded yet.
const { primaryColor, secondaryColor } = useTenantBranding()

// State
const filterStatus = ref('all')
const filterCategory = ref('all')
const sortOrder = ref('asc') // 'asc' = früh zuerst, 'desc' = spät zuerst

// Location loading
const locationsMap = ref<Record<string, any>>({})
const isLoadingLocations = ref(false)

// Helper functions
const formatLessonDate = (dateString: string) => {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  
  // Get Zurich date for comparison
  const zurichDateStr = date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
  const zurichDate = new Date(zurichDateStr)
  const todayStr = today.toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' })
  const todayDate = new Date(todayStr)
  const tomorrowDate = new Date(todayDate)
  tomorrowDate.setDate(todayDate.getDate() + 1)
  
  if (zurichDate.getTime() === todayDate.getTime()) {
    return 'Heute'
  } else if (zurichDate.getTime() === tomorrowDate.getTime()) {
    return 'Morgen'
  } else {
    return date.toLocaleDateString('de-CH', {
      timeZone: 'Europe/Zurich',
      weekday: 'long',
      day: '2-digit', 
      month: 'long',
      year: 'numeric'
    })
  }
}

const formatTimeRange = (startTime: string, endTime: string, _isCourseSession: boolean = false) => {
  // Always convert UTC times to Zurich local time (Europe/Zurich = CET/CEST)
  const start = new Date(startTime)
  const end = new Date(endTime)

  const startStr = start.toLocaleTimeString('de-CH', {
    timeZone: 'Europe/Zurich',
    hour: '2-digit',
    minute: '2-digit'
  })

  const endStr = end.toLocaleTimeString('de-CH', {
    timeZone: 'Europe/Zurich',
    hour: '2-digit',
    minute: '2-digit'
  })

  return `${startStr} - ${endStr}`
}

const getLessonTypeTitle = (eventTypeCode: string, lesson?: any): string => {
  // If it's a course session, show the course name WITHOUT the date suffix
  if (eventTypeCode === 'course' && lesson?.course_name) {
    // Remove date pattern like " - 27.01.2026" or " - 31.01.2026" from name
    return lesson.course_name.replace(/\s*-\s*\d{2}\.\d{2}\.\d{4}$/, '')
  }
  
  const titles: Record<string, string> = {
    'exam': 'Prüfungsfahrt inkl. WarmUp und Rückfahrt',
    'theory': 'Theorielektion',
    'lesson': 'Fahrlektion',
    'course': 'Kurs'
  }
  return titles[eventTypeCode] || 'Fahrlektion'
}

const formatLocationAddress = (locationDetails: any): string => {
  // Verwende formatted_address falls verfügbar
  if (locationDetails.formatted_address) {
    return locationDetails.formatted_address
  }
  
  // Fallback auf address
  if (locationDetails.address) {
    return locationDetails.address
  }
  
  return 'Adresse nicht verfügbar'
}

const loadLocations = async () => {
  if (isLoadingLocations.value) return
  
  try {
    isLoadingLocations.value = true
    
    // Sammle alle location_ids aus den lessons
    const locationIds = [...new Set(props.lessons.map(lesson => lesson.location_id).filter(Boolean))]
    logger.debug('🔍 Modal: Loading locations from lessons data:', locationIds)
    
    if (locationIds.length === 0) {
      logger.debug('⚠️ Modal: No location IDs found')
      return
    }
    
    // ✅ Extract location data directly from lessons (already loaded)
    // This avoids an extra API call since locations are embedded in the appointments
    const locations = props.lessons
      .filter(lesson => lesson.location_id)
      .map(lesson => ({
        id: lesson.location_id,
        name: lesson.location_name || 'Unbekannter Ort',
        street: lesson.location_details?.address || lesson.location_details?.formatted_address || '',
        street_number: '',
        zip: '',
        city: ''
      }))
      .filter((loc, idx, arr) => arr.findIndex(l => l.id === loc.id) === idx) // Deduplicate
    
    logger.debug('✅ Modal: Locations extracted from lessons:', locations)
    
    locationsMap.value = locations.reduce((acc: Record<string, any>, loc: any) => {
      acc[loc.id] = {
        name: loc.name,
        street: loc.street,
        street_number: loc.street_number,
        zip: loc.zip,
        city: loc.city
      }
      return acc
    }, {} as Record<string, any>)
    
    logger.debug('✅ Modal: LocationsMap created:', locationsMap.value)
  } catch (error) {
    console.error('❌ Modal: Error in loadLocations:', error)
  } finally {
    isLoadingLocations.value = false
  }
}

const getTimeUntil = (startTime: string) => {
  const start = new Date(startTime)
  const now = new Date()
  const diffMs = start.getTime() - now.getTime()
  
  if (diffMs < 0) return 'Läuft'
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) {
    return `in ${diffDays} Tag${diffDays === 1 ? '' : 'en'}`
  } else if (diffHours > 0) {
    return `in ${diffHours}h`
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    return `in ${diffMinutes} Min.`
  }
}

// Watcher für das Modal
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen && props.lessons.length > 0) {
    logger.debug('🔍 Modal opened, loading locations...')
    await loadLocations()
  }
}, { immediate: true })

const getStatusText = (lesson: any) => {
  const now = new Date()
  const start = new Date(lesson.start_time)
  const end = new Date(lesson.end_time)
  
  if (now >= start && now <= end) {
    return 'Läuft'
  } else if (start.toDateString() === now.toDateString()) {
    return 'Heute'
  } else {
    return 'Geplant'
  }
}

const calculatePrice = (lesson: any) => {
  if (!lesson.price_per_minute || !lesson.duration_minutes) return 0
  return lesson.price_per_minute * lesson.duration_minutes
}

const toggleSort = () => {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

const getEmptyStateMessage = () => {
  switch (filterStatus.value) {
    case 'today':
      return 'Heute sind keine Lektionen geplant.'
    case 'this_week':
      return 'Diese Woche sind keine Lektionen mehr geplant.'
    default:
      return 'Es sind aktuell keine Lektionen geplant.'
  }
}

// Computed
const upcomingLessons = computed(() => {
  const now = new Date()
  return props.lessons.filter(lesson => new Date(lesson.start_time) > now)
})

const availableCategories = computed(() => {
  const categories = new Set<string>()
  upcomingLessons.value.forEach(lesson => {
    if (lesson.type) {
      categories.add(lesson.type)
    }
  })
  return Array.from(categories).sort()
})

const filteredLessons = computed(() => {
  let filtered = [...upcomingLessons.value]
  
  // Filter nach Status
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  
  switch (filterStatus.value) {
    case 'today':
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      filtered = filtered.filter(lesson => {
        const lessonDate = new Date(lesson.start_time)
        return lessonDate >= today && lessonDate < tomorrow
      })
      break
    case 'this_week':
      filtered = filtered.filter(lesson => {
        const lessonDate = new Date(lesson.start_time)
        return lessonDate >= today && lessonDate < nextWeek
      })
      break
    case 'upcoming':
      // Alle kommenden (Standard)
      break
  }
  
  // Filter nach Kategorie
  if (filterCategory.value !== 'all') {
    filtered = filtered.filter(lesson => lesson.type === filterCategory.value)
  }
  
  // Sortierung
  filtered.sort((a, b) => {
    const dateA = new Date(a.start_time).getTime()
    const dateB = new Date(b.start_time).getTime()
    return sortOrder.value === 'asc' ? dateA - dateB : dateB - dateA
  })
  
  // Group course sessions by date (same day = one entry)
  const grouped: any[] = []
  const courseSessionsByDateAndCourse: Map<string, any[]> = new Map()
  
  for (const lesson of filtered) {
    if (lesson.event_type_code === 'course') {
      // Group course sessions by date + course_id
      const date = lesson.start_time.split('T')[0]
      const key = `${date}_${lesson.course_id || lesson.id}`
      
      if (!courseSessionsByDateAndCourse.has(key)) {
        courseSessionsByDateAndCourse.set(key, [])
      }
      courseSessionsByDateAndCourse.get(key)!.push(lesson)
    } else {
      // Non-course lessons go directly to grouped
      grouped.push(lesson)
    }
  }
  
  // Convert grouped course sessions to single entries
  for (const [key, sessions] of courseSessionsByDateAndCourse.entries()) {
    // Sort by start_time within the group
    sessions.sort((a, b) => a.start_time.localeCompare(b.start_time))
    
    const firstSession = sessions[0]
    const lastSession = sessions[sessions.length - 1]
    
    // Calculate session number range (e.g., "1 & 2" or just "1")
    const sessionNumbers = sessions
      .map(s => s.session_number)
      .filter(Boolean)
      .sort((a, b) => a - b)
    
    const sessionLabel = sessionNumbers.length > 1
      ? `${sessionNumbers[0]} & ${sessionNumbers[sessionNumbers.length - 1]}`
      : sessionNumbers[0]?.toString() || ''
    
    // Create grouped entry with combined time range
    grouped.push({
      ...firstSession,
      id: key, // Use unique key for v-for
      start_time: firstSession.start_time,
      end_time: lastSession.end_time,
      session_number: sessionLabel, // "1-2" instead of just "1"
      grouped_count: sessions.length,
      // Keep location from first session
      location_details: firstSession.location_details
    })
  }
  
  // Re-sort after grouping
  grouped.sort((a, b) => {
    const dateA = new Date(a.start_time).getTime()
    const dateB = new Date(b.start_time).getTime()
    return sortOrder.value === 'asc' ? dateA - dateB : dateB - dateA
  })
  
  return grouped
})
</script>

<style scoped>
/* Smooth scrolling for modal content */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>