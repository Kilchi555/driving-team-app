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

        <!-- Filter und Sortierung -->
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            
            <!-- Filter nach Status -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                v-model="filterStatus"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-600"
              >
                <option value="all" class="text-gray-600">Alle Termine</option>
                <option value="upcoming" class="text-gray-600">Kommende</option>
                <option value="today" class="text-gray-600">Heute</option>
                <option value="this_week" class="text-gray-600">Diese Woche</option>
              </select>
            </div>
            
            <!-- Filter nach Kategorie -->
            <div v-if="availableCategories.length > 1">
              <label class="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
              <select
                v-model="filterCategory"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-600"
              >
                <option value="all" class="text-gray-600">Alle Kategorien</option>
                <option v-for="category in availableCategories" :key="category" :value="category" class="text-gray-600">
                  {{ category }}
                </option>
              </select>
            </div>
            
            <!-- Sortierung Switch -->
            <div class="flex gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Sortierung</label>
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500">Spät</span>
                  <button
                    @click="toggleSort"
                    :class="[
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                      sortOrder === 'asc' ? 'bg-blue-600' : 'bg-gray-200'
                    ]"
                  >
                    <span
                      :class="[
                        'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                        sortOrder === 'asc' ? 'translate-x-5' : 'translate-x-1'
                      ]"
                    />
                  </button>
                  <span class="text-xs text-gray-500">Früh</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>

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
                    {{ lesson.type }}
                  </span>
                  <span 
                    :class="[
                      'inline-flex items-center px-2 py-1 text-xs font-medium rounded-full',
                      getStatusColor(lesson)
                    ]"
                  >
                    {{ getStatusText(lesson) }}
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
                    <span>📍 {{ lesson.location_name || 'Ort wird noch bekannt gegeben' }}</span>
                </div>
                <div v-if="lesson.price_per_minute && lesson.duration_minutes" class="text-right text-xs text-gray-500">
                  CHF {{ calculatePrice(lesson).toFixed(2) }}
                </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

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

// Helper functions
const formatLessonDate = (dateString: string) => {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Heute'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Morgen'
  } else {
    return date.toLocaleDateString('de-CH', { 
      weekday: 'long',
      day: '2-digit', 
      month: 'long',
      year: 'numeric'
    })
  }
}

const formatTimeRange = (startTime: string, endTime: string) => {
  const start = new Date(startTime)
  const end = new Date(endTime)
  
  const startStr = start.toLocaleTimeString('de-CH', { 
    hour: '2-digit', 
    minute: '2-digit'
  })
  const endStr = end.toLocaleTimeString('de-CH', { 
    hour: '2-digit', 
    minute: '2-digit'
  })
  
  return `${startStr} - ${endStr}`
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