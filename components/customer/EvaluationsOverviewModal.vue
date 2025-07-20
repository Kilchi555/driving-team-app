<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div class="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      
      <!-- Header -->
      <div class="sticky top-0 bg-white border-b px-6 py-4 rounded-t-lg">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-xl font-semibold text-gray-900">
              Meine Bewertungen
            </h3>
            <p v-if="availableDrivingCategories.length > 0" class="text-sm text-gray-600 mt-1">
              {{ availableDrivingCategories.length === 1 
                ? `Kategorie ${availableDrivingCategories[0]}` 
                : `Kategorien: ${availableDrivingCategories.join(', ')}` }}
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
            
            <!-- Filter nach Fahrerkategorie -->
            <div v-if="availableDrivingCategories.length > 1">
              <label class="block text-sm font-medium text-gray-700 mb-1">Fahrerkategorie</label>
              <select
                v-model="filterDrivingCategory"
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-600"
              >
                <option value="all" class="text-gray-600">Alle Kategorien</option>
                <option v-for="category in availableDrivingCategories" :key="category" :value="category" class="text-gray-600">
                  {{ category }}
                </option>
              </select>
            </div>
            
            <!-- Filter nach Bewertungskategorie -->
            <div v-if="availableCategories.length > 0">
              <label class="block text-sm font-medium text-gray-700 mb-1">Bewertungskategorie</label>
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
            
            <!-- Sortierung Switches nebeneinander -->
            <div class="flex gap-6">
              <!-- Sortierung nach Datum -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500">Alt</span>
                  <button
                    @click="toggleDateSort"
                    :class="[
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                      sortBy === 'date' && sortOrder === 'desc' ? 'bg-blue-600' : 'bg-gray-200'
                    ]"
                  >
                    <span
                      :class="[
                        'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                        sortBy === 'date' && sortOrder === 'desc' ? 'translate-x-5' : 'translate-x-1'
                      ]"
                    />
                  </button>
                  <span class="text-xs text-gray-500">Neu</span>
                </div>
              </div>
              
              <!-- Sortierung nach Bewertung -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Bewertung</label>
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500">⭐</span>
                  <button
                    @click="toggleRatingSort"
                    :class="[
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
                      sortBy === 'rating' && sortOrder === 'desc' ? 'bg-green-600' : 'bg-gray-200'
                    ]"
                  >
                    <span
                      :class="[
                        'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                        sortBy === 'rating' && sortOrder === 'desc' ? 'translate-x-5' : 'translate-x-1'
                      ]"
                    />
                  </button>
                  <span class="text-xs text-gray-500">⭐⭐⭐</span>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        <!-- Empty States -->
        <div v-if="allEvaluations.length === 0" class="text-center py-12">
          <div class="text-4xl mb-4">📊</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Noch keine Bewertungen</h3>
          <p class="text-gray-500">Ihre Bewertungen werden hier angezeigt, sobald der Fahrlehrer sie erstellt hat.</p>
        </div>

        <div v-else-if="groupedByLesson.length === 0 && filterCategory !== 'all'" class="text-center py-12">
          <div class="text-4xl mb-4">🔍</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Keine Bewertungen gefunden</h3>
          <p class="text-gray-500 mb-4">Für die ausgewählte Kategorie "{{ filterCategory }}" wurden keine Bewertungen gefunden.</p>
          <button
            @click="filterCategory = 'all'"
            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Alle Kategorien anzeigen
          </button>
        </div>

        <!-- Bewertungsliste gruppiert nach Terminen -->
        <div v-else class="space-y-6">
          <div 
            v-for="lessonGroup in groupedByLesson" 
            :key="lessonGroup.lesson_id"
            class="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            <!-- Termin Header -->
            <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="font-semibold text-gray-900">
                      📅 {{ formatLessonDate(lessonGroup.lesson_date) }}
                    </h4>
                    <span 
                      v-if="lessonGroup.driving_category" 
                      class="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                    >
                      Kategorie {{ lessonGroup.driving_category }}
                    </span>
                  </div>
                  <div class="flex items-center gap-4 text-sm text-gray-600 mt-1">
                    <span>🕐 {{ formatTimeRange(lessonGroup.start_time, lessonGroup.end_time) }}</span>
                    <span v-if="lessonGroup.duration_minutes">⏱️ {{ lessonGroup.duration_minutes }} Min.</span>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm text-gray-100">{{ lessonGroup.evaluations.length }}</div>
                </div>
              </div>
            </div>

            <!-- Bewertungen für diesen Termin -->
            <div class="p-4 space-y-3">
              <div 
                v-for="(evaluation, index) in lessonGroup.evaluations" 
                :key="`${evaluation.criteria_id}-${index}`"
                class="bg-gray-50 rounded-lg p-3 border border-gray-100"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h5 class="font-medium text-gray-900">
                      {{ evaluation.criteria_name }}
                    </h5>
                    <p v-if="evaluation.criteria_category_name" class="text-sm text-gray-600 mt-1">
                      {{ evaluation.criteria_category_name }}
                    </p>
                  </div>

                  <div :class="[
                    'px-3 py-1 rounded-full text-sm font-medium border',
                    getRatingColor(evaluation.criteria_rating)
                  ]">
                    {{ evaluation.criteria_rating }} - {{ getRatingText(evaluation.criteria_rating) }}
                  </div>
                </div>

                <div v-if="evaluation.criteria_note" class="mt-3 p-2 bg-white rounded-md border border-gray-100">
                  <p class="text-sm text-gray-700">{{ evaluation.criteria_note }}</p>
                </div>
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

// Props & Emits
interface Props {
  isOpen: boolean
  lessons: any[] // lessons enthalten bereits appointment.type (Kategorie)
}

const props = defineProps<Props>()
const emit = defineEmits(['close'])

// State
const sortBy = ref('date') // 'date' oder 'rating'
const sortOrder = ref('desc') // 'asc' oder 'desc' 
const filterCategory = ref('all') // Filter nach Bewertungskategorie
const filterDrivingCategory = ref('all') // Filter nach Fahrerkategorie (appointment.type)

// Helper functions
const formatLessonDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-CH', { 
    weekday: 'long',
    day: '2-digit', 
    month: 'long',
    year: 'numeric'
  })
}

const formatTimeRange = (startTime: string, endTime?: string) => {
  const start = new Date(startTime)
  const startStr = start.toLocaleTimeString('de-CH', { 
    hour: '2-digit', 
    minute: '2-digit'
  })
  
  if (endTime) {
    const end = new Date(endTime)
    const endStr = end.toLocaleTimeString('de-CH', { 
      hour: '2-digit', 
      minute: '2-digit'
    })
    return `${startStr} - ${endStr}`
  }
  
  return startStr
}

const extractCategoryFromTitle = (title: string): string | null => {
  // Suche nach Kategorie in Klammern am Ende: (B), (A), (A1), etc.
  const match = title.match(/\(([A-Z0-9]+)\)(?:\s*$|$)/)
  return match ? match[1] : null
}

const getUniqueDrivingCategories = () => {
  const categories = new Set<string>()
  props.lessons?.forEach(lesson => {
    if (lesson.type) {
      categories.add(lesson.type)
    } else {
      // Fallback: Versuche Kategorie aus Titel zu extrahieren
      const categoryFromTitle = extractCategoryFromTitle(lesson.title || '')
      if (categoryFromTitle) {
        categories.add(categoryFromTitle)
      }
    }
  })
  return Array.from(categories).sort()
}

// Toggle-Funktionen für die Switches
const toggleDateSort = () => {
  if (sortBy.value === 'date') {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortBy.value = 'date'
    sortOrder.value = 'desc' // Standard: neueste zuerst
  }
}

const toggleRatingSort = () => {
  if (sortBy.value === 'rating') {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortBy.value = 'rating'
    sortOrder.value = 'desc' // Standard: beste zuerst
  }
}

const getRatingColor = (rating: number) => {
  const colors = {
    1: 'bg-red-100 text-red-700 border-red-200',
    2: 'bg-orange-100 text-orange-700 border-orange-200',
    3: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    4: 'bg-blue-100 text-blue-700 border-blue-200',
    5: 'bg-green-100 text-green-700 border-green-200',
    6: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }
  return colors[rating as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200'
}

const getRatingText = (rating: number) => {
  const texts = {
    1: 'Besprochen',
    2: 'Geübt', 
    3: 'Ungenügend',
    4: 'Genügend',
    5: 'Gut',
    6: 'Prüfungsreif'
  }
  return texts[rating as keyof typeof texts] || ''
}

const calculateAverageRating = (evaluations: any[]) => {
  if (evaluations.length === 0) return 0
  const sum = evaluations.reduce((total, evaluation) => total + evaluation.criteria_rating, 0)
  return sum / evaluations.length
}

// Computed
const allEvaluations = computed(() => {
  const evaluations: any[] = []
  
  props.lessons?.forEach(lesson => {
    if (lesson.criteria_evaluations && lesson.criteria_evaluations.length > 0) {
      lesson.criteria_evaluations.forEach((evaluation: any) => {
        // Kategorie aus lesson.type oder als Fallback aus dem Titel
        const drivingCategory = lesson.type || extractCategoryFromTitle(lesson.title || '') || ''
        
        evaluations.push({
          ...evaluation,
          lesson_id: lesson.id,
          lesson_date: lesson.start_time,
          lesson_title: lesson.title,
          location_name: lesson.location_name,
          driving_category: drivingCategory,
          sort_date: new Date(lesson.start_time).getTime()
        })
      })
    }
  })

  return evaluations
})

const availableCategories = computed(() => {
  const categories = new Set<string>()
  allEvaluations.value.forEach(evaluation => {
    if (evaluation.criteria_category_name) {
      categories.add(evaluation.criteria_category_name)
    }
  })
  return Array.from(categories).sort()
})

const availableDrivingCategories = computed(() => {
  return getUniqueDrivingCategories()
})

const groupedByLesson = computed(() => {
  let filtered = [...allEvaluations.value]

  // Filter nach Fahrerkategorie
  if (filterDrivingCategory.value !== 'all') {
    filtered = filtered.filter(evaluation => 
      evaluation.driving_category === filterDrivingCategory.value
    )
  }

  // Filter nach Bewertungskategorie
  if (filterCategory.value !== 'all') {
    filtered = filtered.filter(evaluation => 
      evaluation.criteria_category_name === filterCategory.value
    )
  }

  // Gruppierung nach Lektion/Termin
  const grouped: Record<string, {
    lesson_id: string
    lesson_date: string
    lesson_title: string
    location_name: string
    driving_category: string
    start_time: string
    end_time?: string
    duration_minutes?: number
    sort_date: number
    evaluations: any[]
  }> = {}

  filtered.forEach(evaluation => {
    const lessonId = evaluation.lesson_id
    if (!grouped[lessonId]) {
      // Finde die entsprechende Lektion für zusätzliche Infos
      const lesson = props.lessons.find(l => l.id === lessonId)
      grouped[lessonId] = {
        lesson_id: lessonId,
        lesson_date: evaluation.lesson_date,
        lesson_title: evaluation.lesson_title || 'Fahrstunde',
        location_name: evaluation.location_name || 'Treffpunkt nicht definiert',
        driving_category: evaluation.driving_category || lesson?.type || '',
        start_time: lesson?.start_time || evaluation.lesson_date,
        end_time: lesson?.end_time,
        duration_minutes: lesson?.duration_minutes,
        sort_date: evaluation.sort_date,
        evaluations: []
      }
    }
    grouped[lessonId].evaluations.push(evaluation)
  })

  // Sortiere Lektionen
  const sortedGroups = Object.values(grouped).sort((a, b) => {
    if (sortBy.value === 'date') {
      return sortOrder.value === 'desc' ? b.sort_date - a.sort_date : a.sort_date - b.sort_date
    } else if (sortBy.value === 'rating') {
      const avgA = calculateAverageRating(a.evaluations)
      const avgB = calculateAverageRating(b.evaluations)
      return sortOrder.value === 'desc' ? avgB - avgA : avgA - avgB
    }
    return 0
  })

  return sortedGroups
})

const sortedEvaluations = computed(() => {
  // Für Rückwärtskompatibilität - falls die alte flache Liste noch benötigt wird
  return groupedByLesson.value.flatMap(group => group.evaluations)
})

const stats = computed(() => {
  if (allEvaluations.value.length === 0) return null

  const ratings = allEvaluations.value.map(e => e.criteria_rating)
  const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
  
  const distribution = [1, 2, 3, 4, 5, 6].reduce((acc: Record<number, number>, rating) => {
    acc[rating] = ratings.filter(r => r === rating).length
    return acc
  }, {} as Record<number, number>)

  return {
    total: allEvaluations.value.length,
    average: average.toFixed(1),
    distribution
  }
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