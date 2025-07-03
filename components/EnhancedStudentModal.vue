<!-- EnhancedStudentModal.vue - Student Details mit Lektionshistorie -->
<template>
  <div v-if="selectedStudent" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="bg-green-600 text-white p-4">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h3 class="text-lg font-bold">{{ selectedStudent.first_name }} {{ selectedStudent.last_name }}</h3>
            <p class="text-green-100 text-sm">{{ selectedStudent.email }}</p>
          </div>
          <div class="flex items-center gap-3">
            <!-- Status Badge -->
            <span :class="[
              'text-xs px-2 py-1 rounded-full font-medium',
              selectedStudent.is_active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            ]">
              {{ selectedStudent.is_active ? 'Aktiv' : 'Inaktiv' }}
            </span>
            <!-- Close Button -->
            <button @click="closeModal" class="text-white hover:text-green-200">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="bg-gray-50 border-b px-4">
        <div class="flex">
          <button
            @click="activeTab = 'details'"
            :class="[
              'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'details'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            ]"
          >
            Details
          </button>
          <button
            @click="activeTab = 'lessons'"
            :class="[
              'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'lessons'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            ]"
          >
            Lektionen
            <span v-if="lessonsCount > 0" class="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
              {{ lessonsCount }}
            </span>
          </button>
          <button
            @click="activeTab = 'progress'"
            :class="[
              'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'progress'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            ]"
          >
            Fortschritt
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Details Tab -->
        <div v-if="activeTab === 'details'" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div class="space-y-3">
              <div><strong class="text-gray-900 font-semibold">E-Mail:</strong> 
                <span class="text-gray-700">{{ selectedStudent.email || 'Nicht angegeben' }}</span>
              </div>
              <div><strong class="text-gray-900 font-semibold">Telefon:</strong> 
                <span class="text-gray-700">{{ selectedStudent.phone || 'Nicht angegeben' }}</span>
              </div>
              <div><strong class="text-gray-900 font-semibold">Kategorie:</strong> 
                <span class="text-gray-700">{{ selectedStudent.category || 'Nicht angegeben' }}</span>
              </div>
              <div v-if="selectedStudent.assignedInstructor">
                <strong class="text-gray-900 font-semibold">Fahrlehrer:</strong> 
                <span class="text-gray-700">{{ selectedStudent.assignedInstructor }}</span>
              </div>
            </div>
            
            <div class="space-y-3">
              <div v-if="selectedStudent.birthdate">
                <strong class="text-gray-900 font-semibold">Geburtsdatum:</strong> 
                <span class="text-gray-700">{{ formatDate(selectedStudent.birthdate) }}</span>
              </div>
              <div v-if="selectedStudent.fullAddress">
                <strong class="text-gray-900 font-semibold">Adresse:</strong> 
                <span class="text-gray-700">{{ selectedStudent.fullAddress }}</span>
              </div>
              <div v-if="selectedStudent.lessonsCount">
                <strong class="text-gray-900 font-semibold">Lektionen total:</strong> 
                <span class="text-gray-700">{{ selectedStudent.lessonsCount }}</span>
              </div>
              <div v-if="selectedStudent.lastLesson">
                <strong class="text-gray-900 font-semibold">Letzte Lektion:</strong> 
                <span class="text-gray-700">{{ formatDate(selectedStudent.lastLesson) }}</span>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-semibold text-gray-900 mb-3">Aktionen</h4>
            <div class="flex flex-wrap gap-2">
              <button
                v-if="selectedStudent.phone"
                @click="callStudent(selectedStudent.phone)"
                class="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                📞 Anrufen
              </button>
              <button
                v-if="selectedStudent.email"
                @click="emailStudent(selectedStudent.email)"
                class="bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition-colors"
              >
                ✉️ E-Mail
              </button>
              <button
                @click="createAppointment(selectedStudent)"
                class="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
              >
                📅 Termin buchen
              </button>
            </div>
          </div>
        </div>

        <!-- Lessons Tab -->
        <div v-if="activeTab === 'lessons'">
          <!-- Loading State -->
          <div v-if="isLoadingLessons" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>

          <!-- Error State -->
          <div v-else-if="lessonsError" class="bg-red-50 border border-red-200 rounded p-4 text-red-700">
            {{ lessonsError }}
          </div>

          <!-- No Lessons -->
          <div v-else-if="lessons.length === 0" class="text-center py-8">
            <div class="text-4xl mb-2">📚</div>
            <h4 class="font-semibold text-gray-900 mb-2">Noch keine Lektionen</h4>
            <p class="text-gray-600 mb-4">Dieser Schüler hat noch keine Fahrlektionen absolviert.</p>
            <button
              @click="createAppointment(selectedStudent)"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Erste Lektion buchen
            </button>
          </div>

          <!-- Lessons List -->
          <div v-else class="space-y-4">
            <!-- Filter -->
            <div class="flex items-center gap-4 mb-4">
              <select 
                v-model="lessonFilter" 
                class="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Alle Lektionen</option>
                <option value="evaluated">Nur bewertete</option>
                <option value="pending">Unbewertete</option>
              </select>
              <span class="text-sm text-gray-600">{{ filteredLessons.length }} Lektionen</span>
            </div>

            <!-- Lessons -->
            <div class="space-y-3">
              <div
                v-for="lesson in filteredLessons"
                :key="lesson.id"
                class="bg-white border rounded-lg p-4 hover:shadow-md transition-all"
              >
                <!-- Lesson Header -->
                <div class="flex items-start justify-between mb-3">
                  <div class="flex-1">
                    <h4 class="font-semibold text-gray-900">
                      {{ lesson.title || 'Fahrlektion' }}
                    </h4>
                    <p class="text-sm text-gray-600">
                      {{ formatDateTime(lesson.start_time) }}
                      <span v-if="lesson.duration_minutes" class="ml-2">
                        ({{ lesson.duration_minutes }}min)
                      </span>
                    </p>
                  </div>
                  
                  <!-- Overall Rating -->
                  <div v-if="lesson.overall_rating" class="text-right">
                    <div class="flex items-center gap-1">
                      <span :class="[
                        'px-2 py-1 rounded-full text-xs font-medium',
                        getRatingColor(lesson.overall_rating)
                      ]">
                        {{ lesson.overall_rating }}/6
                      </span>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">
                      {{ getRatingText(lesson.overall_rating) }}
                    </p>
                  </div>
                  
                  <!-- No Rating -->
                  <div v-else class="text-right">
                    <span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                      Nicht bewertet
                    </span>
                  </div>
                </div>

                <!-- General Note -->
                <div v-if="lesson.general_note" class="mb-3">
                  <p class="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {{ lesson.general_note }}
                  </p>
                </div>

                <!-- Detailed Criteria Ratings -->
                <div v-if="lesson.criteria_evaluations && lesson.criteria_evaluations.length > 0" class="space-y-2">
                  <h5 class="text-sm font-medium text-gray-900">Detailbewertungen:</h5>
                  
                  <!-- Group by Category -->
                  <div v-for="(categoryGroup, categoryName) in groupedCriteriaEvaluations(lesson.criteria_evaluations)" 
                       :key="categoryName" 
                       class="border-l-2 border-gray-200 pl-3">
                    
                    <h6 class="text-xs font-medium text-gray-700 mb-1">{{ categoryName }}</h6>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div v-for="evaluation in categoryGroup" 
                           :key="evaluation.criteria_id" 
                           class="flex items-center justify-between text-xs">
                        <span class="text-gray-600">{{ evaluation.criteria_name }}</span>
                        <div class="flex items-center gap-2">
                          <span :class="[
                            'px-1.5 py-0.5 rounded text-xs font-medium',
                            getRatingColor(evaluation.criteria_rating)
                          ]">
                            {{ evaluation.criteria_rating }}/6
                          </span>
                          <!-- Criteria Note (if exists) -->
                          <button 
                            v-if="evaluation.criteria_note"
                            @click="showCriteriaNote(evaluation)"
                            class="text-blue-600 hover:text-blue-800"
                            title="Notiz anzeigen"
                          >
                            💬
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- No Detailed Evaluation -->
                <div v-else-if="!lesson.overall_rating" class="text-center py-2">
                  <button
                    @click="evaluateLesson(lesson)"
                    class="text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    📝 Jetzt bewerten
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Progress Tab -->
        <div v-if="activeTab === 'progress'" class="space-y-4">
          <div class="text-center py-8">
            <div class="text-4xl mb-2">📊</div>
            <h4 class="font-semibold text-gray-900 mb-2">Lernfortschritt</h4>
            <p class="text-gray-600">Fortschritts-Dashboard wird hier implementiert...</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-gray-50 px-4 py-3 border-t">
        <div class="flex gap-3">
          <button
            @click="closeModal"
            class="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Schließen
          </button>
          <button
            @click="editStudent(selectedStudent)"
            class="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Bearbeiten
          </button>
        </div>
      </div>
    </div>

    <!-- Criteria Note Modal -->
    <div v-if="showNoteModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
      <div class="bg-white rounded-lg max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="font-semibold text-gray-900">{{ selectedCriteria?.criteria_name }}</h4>
          <button @click="showNoteModal = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">Bewertung:</span>
            <span :class="[
              'px-2 py-1 rounded text-sm font-medium',
              getRatingColor(selectedCriteria?.criteria_rating)
            ]">
              {{ selectedCriteria?.criteria_rating }}/6 - {{ getRatingText(selectedCriteria?.criteria_rating) }}
            </span>
          </div>
          
          <div>
            <span class="text-sm text-gray-600 block mb-2">Notiz:</span>
            <p class="text-sm text-gray-800 bg-gray-50 p-3 rounded">
              {{ selectedCriteria?.criteria_note }}
            </p>
          </div>
        </div>
        
        <button
          @click="showNoteModal = false"
          class="mt-4 w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Schließen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Props
interface Props {
  selectedStudent: any
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits(['close', 'edit', 'create-appointment', 'evaluate-lesson'])

// Supabase
const supabase = getSupabase()

// State
const activeTab = ref('details')
const isLoadingLessons = ref(false)
const lessonsError = ref<string | null>(null)
const lessons = ref<any[]>([])
const lessonFilter = ref('all')

// Modal state
const showNoteModal = ref(false)
const selectedCriteria = ref<any>(null)

// Computed
const lessonsCount = computed(() => lessons.value.length)

const filteredLessons = computed(() => {
  const allLessons = lessons.value
  
  if (lessonFilter.value === 'evaluated') {
    return allLessons.filter(lesson => lesson.overall_rating)
  } else if (lessonFilter.value === 'pending') {
    return allLessons.filter(lesson => !lesson.overall_rating)
  }
  
  return allLessons
})

// Methods
const closeModal = () => {
  emit('close')
}

const editStudent = (student: any) => {
  emit('edit', student)
}

const createAppointment = (student: any) => {
  emit('create-appointment', student)
}

const evaluateLesson = (lesson: any) => {
  emit('evaluate-lesson', lesson)
}

const loadLessons = async () => {
  if (!props.selectedStudent?.id) return
  
  isLoadingLessons.value = true
  lessonsError.value = null
  
  try {
    // Load appointments for this student
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        duration_minutes,
        status
      `)
      .eq('user_id', props.selectedStudent.id)
      .in('status', ['completed', 'cancelled'])
      .order('start_time', { ascending: false })

    if (appointmentsError) throw appointmentsError

    if (!appointments || appointments.length === 0) {
      lessons.value = []
      return
    }

    // Load evaluations for these appointments
    const appointmentIds = appointments.map(a => a.id)
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select(`
        appointment_id,
        staff_rating,
        staff_note,
        criteria_rating,
        criteria_note,
        evaluation_criteria_id,
        evaluation_criteria(
          name,
          short_code
        )
      `)
      .in('appointment_id', appointmentIds)

    if (notesError) throw notesError

    // Group notes by appointment
    const notesByAppointment = (notes || []).reduce((acc: any, note: any) => {
      if (!acc[note.appointment_id]) {
        acc[note.appointment_id] = {
          overall_rating: null,
          general_note: '',
          criteria_evaluations: []
        }
      }
      
      if (note.staff_rating) {
        // Overall evaluation
        acc[note.appointment_id].overall_rating = note.staff_rating
        acc[note.appointment_id].general_note = note.staff_note || ''
      } else if (note.evaluation_criteria_id) {
        // Criteria-specific evaluation
        acc[note.appointment_id].criteria_evaluations.push({
          criteria_id: note.evaluation_criteria_id,
          criteria_name: note.evaluation_criteria?.name || 'Unbekannt',
          criteria_short_code: note.evaluation_criteria?.short_code || '',
          criteria_rating: note.criteria_rating,
          criteria_note: note.criteria_note
        })
      }
      
      return acc
    }, {})

    // Combine appointments with their evaluations
    lessons.value = appointments.map(appointment => ({
      ...appointment,
      ...notesByAppointment[appointment.id]
    }))

  } catch (err: any) {
    console.error('Error loading lessons:', err)
    lessonsError.value = err.message || 'Fehler beim Laden der Lektionen'
  } finally {
    isLoadingLessons.value = false
  }
}

const groupedCriteriaEvaluations = (evaluations: any[]) => {
  // TODO: Group by evaluation category when we have that data
  // For now, just return as "Allgemein"
  return {
    'Bewertungspunkte': evaluations
  }
}

const showCriteriaNote = (criteria: any) => {
  selectedCriteria.value = criteria
  showNoteModal.value = true
}

const getRatingColor = (rating: number) => {
  const colors = {
    1: 'bg-red-100 text-red-700',
    2: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700',
    4: 'bg-blue-100 text-blue-700',
    5: 'bg-green-100 text-green-700',
    6: 'bg-emerald-100 text-emerald-700'
  }
  return colors[rating as keyof typeof colors] || 'bg-gray-100 text-gray-700'
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH')
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const callStudent = (phone: string) => {
  if (phone) {
    window.open(`tel:${phone}`)
  }
}

const emailStudent = (email: string) => {
  if (email) {
    window.open(`mailto:${email}`)
  }
}

// Watchers
watch(() => props.selectedStudent, (newStudent) => {
  if (newStudent) {
    activeTab.value = 'details'
    if (activeTab.value === 'lessons') {
      loadLessons()
    }
  }
}, { immediate: true })

watch(activeTab, (newTab) => {
  if (newTab === 'lessons' && props.selectedStudent) {
    loadLessons()
  }
})
</script>

<style scoped>
/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out, border-color 0.2s ease-in-out;
}

/* Mobile optimizations */
@media (hover: none) and (pointer: coarse) {
  .hover\:shadow-md:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
}
</style>