<!-- components/UpcomingLessonsModal.vue -->
<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div class="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 rounded-t-lg">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-xl font-semibold text-gray-900">
              Kommende Lektionen
            </h3>
            <p class="text-sm text-gray-600 mt-1">
              {{ upcomingLessons.length }} geplante Termine
            </p>
          </div>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 text-2xl">
            ✕
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-2 space-y-6">

        <!-- Empty State -->
        <div v-if="filteredLessons.length === 0" class="text-center py-12">
          <div class="text-4xl mb-4">📅</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Keine kommenden Termine</h3>
          <p class="text-gray-500">{{ getEmptyStateMessage() }}</p>
        </div>

        <!-- Lektionsliste -->
        <div v-else class="space-y-3">
          <div 
            v-for="lesson in filteredLessons" 
            :key="lesson.id"
            class="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <h4 class="text-xs font-semibold text-gray-900">
                    {{ formatLessonDate(lesson.start_time) }}
                  </h4>
                  <span 
                    v-if="lesson.type" 
                    class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                  >
                    Kategorie {{ lesson.type }}
                  </span>
                </div>
                
                <!-- Lektionstyp basierend auf event_type_code -->
                <div v-if="lesson.event_type_code" class="mb-2">
                  <span class="text-sm text-gray-700 font-medium">
                    {{ getLessonTypeTitle(lesson.event_type_code) }}
                    <span v-if="lesson.staff?.first_name" class="text-gray-600">
                      mit {{ lesson.staff.first_name }}
                    </span>
                  </span>
                </div>
                
                <div class="flex items-center gap-4 text-sm text-gray-600">
                  <span>🕐 {{ formatTimeRange(lesson.start_time, lesson.end_time) }}</span>
                  <span v-if="lesson.duration_minutes">⏱️ {{ lesson.duration_minutes }} Min.</span>
                  <div class="font-semibold">                  <span>{{ getTimeUntil(lesson.start_time) }}</span>
                    </div>
                </div>
              </div>
            </div>
                <div class="mt-2 text-sm text-gray-600">
                    <div v-if="lesson.location_details && (lesson.location_details.address || lesson.location_details.formatted_address)" class="mt-1 text-xs text-gray-500">
                        Treffpunkt: {{ formatLocationAddress(lesson.location_details) }}
                    </div>
                </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { computed, ref } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Props & Emits
interface Props {
  isOpen: boolean
  lessons: any[]
}

const props = defineProps<Props>()
const emit = defineEmits(['close'])

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

const formatTimeRange = (startTime: string, endTime: string) => {
  // Convert UTC times to Zurich local time
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

const getLessonTypeTitle = (eventTypeCode: string): string => {
  const titles: Record<string, string> = {
    'exam': 'Prüfungsfahrt inkl. WarmUp und Rückfahrt',
    'theory': 'Theorielektion',
    'lesson': 'Fahrlektion'
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
    logger.debug('🔍 Modal: Loading locations for IDs:', locationIds)
    
    if (locationIds.length === 0) {
      logger.debug('⚠️ Modal: No location IDs found')
      return
    }
    
    const supabase = getSupabase()
    const { data: locations, error } = await supabase
      .from('locations')
      .select('id, name, address, formatted_address')
      .in('id', locationIds)
    
    if (error) {
      console.error('❌ Modal: Error loading locations:', error)
      return
    }
    
    if (locations) {
      logger.debug('✅ Modal: Locations loaded:', locations)
      
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
    }
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
import { watch } from 'vue'

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen && props.lessons.length > 0) {
    logger.debug('🔍 Modal opened, loading locations...')
    await loadLocations()
  }
}, { immediate: true })

const getStatusColor = (lesson: any) => {
  const now = new Date()
  const start = new Date(lesson.start_time)
  const end = new Date(lesson.end_time)
  
  if (now >= start && now <= end) {
    return 'bg-green-100 text-green-700'
  } else if (start.toDateString() === now.toDateString()) {
    return 'bg-blue-100 text-blue-700'
  } else {
    return 'bg-gray-100 text-gray-700'
  }
}

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
  
  return filtered
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