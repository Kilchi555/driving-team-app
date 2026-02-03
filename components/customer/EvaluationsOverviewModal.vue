<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
    <div class="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
      
      <!-- Header with Gradient -->
      <div class="sticky top-0 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 px-6 py-6 rounded-t-2xl">
        <div class="flex justify-between items-center">
          <h3 class="text-2xl font-bold text-white">
            Meine Bewertungen
          </h3>
          <button 
            @click="$emit('close')" 
            class="text-white hover:bg-blue-700 rounded-full p-2 transition-all duration-200 hover:scale-110"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50">

        <!-- Empty States -->
        <div v-if="allEvaluations.length === 0" class="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-300">
          <div class="text-6xl mb-4">📊</div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Noch keine Bewertungen</h3>
          <p class="text-gray-500 px-4">Deine Bewertungen werden hier angezeigt, sobald der Fahrlehrer sie erstellt hat.</p>
        </div>

        <div v-else-if="groupedByLesson.length === 0 && filterCategory !== 'all'" class="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-300">
          <div class="text-6xl mb-4">🔍</div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Keine Bewertungen gefunden</h3>
          <p class="text-gray-500 mb-4">Für die ausgewählte Kategorie "{{ filterCategory }}" wurden keine Bewertungen gefunden.</p>
          <button
            @click="filterCategory = 'all'"
            class="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-medium"
          >
            Alle Kategorien anzeigen
          </button>
        </div>

        <!-- Bewertungsliste gruppiert nach Terminen -->
        <div v-else class="space-y-4">
          <div 
            v-for="lessonGroup in groupedByLesson" 
            :key="lessonGroup.lesson_id"
            class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:border-blue-300"
          >
            <!-- Termin Header mit Gradient -->
            <div class="bg-gradient-to-r from-blue-50 to-cyan-50 px-6 py-4 border-b border-gray-200">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h4 class="font-bold text-gray-900 text-base">
                      {{ lessonGroup.is_exam ? 'Prüfungsfahrt' : 'Fahrlektion' }}
                    </h4>
                    <div 
                      v-if="lessonGroup.staff?.first_name"
                      class="text-sm text-gray-600"
                    >
                      mit <span class="font-semibold">{{ lessonGroup.staff.first_name }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                    <span class="flex items-center gap-1">📅 {{ formatCompactDate(lessonGroup.lesson_date) }}</span>
                    <span class="flex items-center gap-1">🕐 {{ formatTimeRange(lessonGroup.start_time, lessonGroup.end_time) }}</span>
                    <span v-if="lessonGroup.duration_minutes" class="flex items-center gap-1">⏱️ {{ lessonGroup.duration_minutes }}min</span>
                    <span v-if="lessonGroup.driving_category" class="ml-auto px-3 py-1 text-xs font-bold bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full">
                      Kategorie {{ lessonGroup.driving_category }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bewertungen für diesen Termin -->
            <div class="p-4 space-y-2">
              <!-- Regular Evaluations -->
              <template v-if="!lessonGroup.is_exam">
                <div 
                  v-for="(evaluation, index) in lessonGroup.evaluations" 
                  :key="`${evaluation.criteria_id}-${index}`"
                  class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                >
                  <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <h5 class="font-bold text-gray-900 text-sm break-words">
                        {{ evaluation.criteria_name }}
                      </h5>
                      <p v-if="evaluation.criteria_category_name" class="text-xs text-gray-600 mt-1 font-semibold break-words">
                        📋 {{ evaluation.criteria_category_name }}
                      </p>
                    </div>

                    <div :class="[
                      'px-3 py-1 text-xs font-bold rounded-full flex-shrink-0 transition-all duration-200 whitespace-nowrap',
                      getRatingColor(evaluation.criteria_rating)
                    ]">
                      {{ evaluation.criteria_rating }} - {{ getRatingText(evaluation.criteria_rating) }}
                    </div>
                  </div>

                  <div v-if="evaluation.criteria_note" class="mt-3 p-3 bg-white rounded-lg border-l-4 border-blue-400">
                    <p class="text-xs text-gray-700 italic break-words">💬 "{{ evaluation.criteria_note }}"</p>
                  </div>
                </div>
              </template>

              <!-- Exam Results -->
              <template v-else>
                <div 
                  v-for="(evaluation, index) in lessonGroup.evaluations" 
                  :key="`exam-${index}`"
                  class="bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-300 shadow-lg"
                >
                  <!-- Exam Pass/Fail Status -->
                  <div class="flex items-center justify-between mb-6">
                    <h5 class="text-xl font-bold text-gray-900">
                      🎓 Prüfungsergebnis
                    </h5>
                    <div :class="[
                      'px-6 py-2 rounded-full text-lg font-bold border-2 transition-all duration-200',
                      evaluation.exam_passed 
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white border-green-600 shadow-lg' 
                        : 'bg-gradient-to-r from-red-400 to-rose-500 text-white border-red-600 shadow-lg'
                    ]">
                      {{ evaluation.exam_passed ? '✅ BESTANDEN' : '❌ NICHT BESTANDEN' }}
                    </div>
                  </div>

                  <!-- Examiner Behavior Rating -->
                  <div v-if="evaluation.examiner_behavior_rating" class="bg-white rounded-xl p-4 border-2 border-blue-200 mb-4 hover:shadow-md transition-all duration-200">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-bold text-gray-800">👤 Verhalten während Prüfung:</span>
                      <div :class="[
                        'px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all duration-200',
                        getRatingColor(evaluation.examiner_behavior_rating)
                      ]">
                        ⭐ {{ evaluation.examiner_behavior_rating }} - {{ getRatingText(evaluation.examiner_behavior_rating) }}
                      </div>
                    </div>
                  </div>

                  <!-- Examiner Notes -->
                  <div v-if="evaluation.examiner_behavior_notes" class="bg-white rounded-xl p-4 border-2 border-blue-200 shadow-md">
                    <p class="text-sm font-bold text-gray-800 mb-2">📝 Notizen vom Experten:</p>
                    <p class="text-sm text-gray-700 italic bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded-lg">{{ evaluation.examiner_behavior_notes }}</p>
                  </div>

                  <!-- No notes/rating -->
                  <div v-if="!evaluation.examiner_behavior_rating && !evaluation.examiner_behavior_notes" class="bg-white rounded-xl p-4 border-2 border-blue-200">
                    <p class="text-sm text-gray-600 italic">ℹ️ Keine zusätzlichen Notizen vom Experten</p>
                  </div>
                </div>
              </template>
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

// Kompakte Datumsformatierung für die Leisten (z.B. "Mo 27.11.25")
const formatCompactDate = (dateString: string) => {
  const date = new Date(dateString)
  const dayStr = date.toLocaleDateString('de-CH', { weekday: 'short' }).substring(0, 2)
  const dateStr = date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' })
  return `${dayStr} ${dateStr}`
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
    // ✅ Check if lesson has criteria evaluations OR exam results
    const hasEvaluations = lesson.criteria_evaluations && lesson.criteria_evaluations.length > 0
    const hasExamResults = lesson.exam_results && lesson.exam_results.length > 0
    
    if (hasEvaluations) {
      // Regular lesson with criteria evaluations
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
          sort_date: new Date(lesson.start_time).getTime(),
          is_exam: false,
          staff: lesson.staff
        })
      })
    } else if (hasExamResults) {
      // ✅ Exam with exam_results - add as special evaluation
      lesson.exam_results.forEach((examResult: any) => {
        const drivingCategory = lesson.type || extractCategoryFromTitle(lesson.title || '') || ''
        
        evaluations.push({
          lesson_id: lesson.id,
          lesson_date: lesson.start_time,
          lesson_title: lesson.title,
          location_name: lesson.location_name,
          driving_category: drivingCategory,
          sort_date: new Date(lesson.start_time).getTime(),
          is_exam: true,
          exam_passed: examResult.passed,
          examiner_behavior_rating: examResult.examiner_behavior_rating,
          examiner_behavior_notes: examResult.examiner_behavior_notes,
          exam_date: examResult.exam_date,
          staff: lesson.staff
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
    is_exam: boolean
    staff?: any
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
        lesson_title: evaluation.lesson_title || (evaluation.is_exam ? 'Prüfungsfahrt' : 'Fahrstunde'),
        location_name: evaluation.location_name || 'Treffpunkt nicht definiert',
        driving_category: evaluation.driving_category || lesson?.type || '',
        start_time: lesson?.start_time || evaluation.lesson_date,
        end_time: lesson?.end_time,
        duration_minutes: lesson?.duration_minutes,
        sort_date: evaluation.sort_date,
        is_exam: evaluation.is_exam || false,
        staff: evaluation.staff || lesson?.staff,
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