<!-- EvaluationModal.vue - Mobile-optimierte Bewertungskomponente -->
<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="bg-green-600 text-white p-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold">Lektion bewerten</h2>
            <p class="text-green-100 text-sm">
              {{ appointment?.title }} - {{ formatDate(appointment?.start_time) }}
            </p>
          </div>
          <button @click="closeModal" class="text-white hover:text-green-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          {{ error }}
        </div>

        <!-- Evaluation Form -->
        <div v-else class="space-y-6">
          <!-- Allgemeine Bewertung & Notiz -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold text-gray-900 mb-3">Gesamtbewertung</h3>
            
            <!-- Overall Rating -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Gesamtnote (1-6)
              </label>
              <div class="flex gap-2">
                <button
                  v-for="rating in [1, 2, 3, 4, 5, 6]"
                  :key="rating"
                  @click="overallRating = rating"
                  :class="[
                    'w-10 h-10 rounded-full font-semibold transition-all',
                    overallRating === rating
                      ? getRatingColor(rating, true)
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  ]"
                >
                  {{ rating }}
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                {{ getRatingText(overallRating) }}
              </p>
            </div>

            <!-- Overall Note -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Allgemeine Notiz
              </label>
              <textarea
                v-model="overallNote"
                placeholder="Gesamteindruck, Verbesserungen, Lob..."
                class="w-full h-24 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              ></textarea>
            </div>
          </div>

          <!-- Detailed Criteria Evaluation -->
          <div v-for="category in evaluationCategories" :key="category.id" class="border rounded-lg overflow-hidden">
            <!-- Category Header -->
            <div 
              class="p-4 cursor-pointer select-none"
              :style="{ backgroundColor: category.color + '20', borderLeft: `4px solid ${category.color}` }"
              @click="toggleCategory(category.id)"
            >
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-gray-900">{{ category.name }}</h3>
                <div class="flex items-center gap-2">
                  <!-- Progress indicator -->
                  <span class="text-xs bg-white px-2 py-1 rounded-full text-gray-600">
                    {{ getCategoryProgress(category.id) }}
                  </span>
                  <!-- Expand/Collapse icon -->
                  <svg 
                    class="w-5 h-5 text-gray-500 transform transition-transform"
                    :class="{ 'rotate-180': expandedCategories.includes(category.id) }"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
              <p v-if="category.description" class="text-sm text-gray-600 mt-1">
                {{ category.description }}
              </p>
            </div>

            <!-- Category Criteria -->
            <div v-show="expandedCategories.includes(category.id)" class="border-t">
              <div 
                v-for="criteria in category.criteria" 
                :key="criteria.id"
                class="p-4 border-b last:border-b-0"
              >
                <!-- Mobile Layout -->
                <div class="space-y-3">
                  <!-- Criteria Name & Required indicator -->
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h4 class="font-medium text-gray-900 flex items-center gap-2">
                        {{ criteria.name }}
                        <span v-if="criteria.is_required" class="text-red-500 text-xs">*</span>
                      </h4>
                      <p v-if="criteria.description" class="text-sm text-gray-600 mt-1">
                        {{ criteria.description }}
                      </p>
                    </div>
                    <span v-if="criteria.short_code" class="text-xs bg-gray-100 px-2 py-1 rounded">
                      {{ criteria.short_code }}
                    </span>
                  </div>

                  <!-- Rating Buttons -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Bewertung ({{ criteria.min_rating }}-{{ criteria.max_rating }})
                    </label>
                    <div class="flex gap-1 flex-wrap">
                      <button
                        v-for="rating in getRatingRange(criteria)"
                        :key="rating"
                        @click="setCriteriaRating(criteria.id, rating)"
                        :class="[
                          'w-10 h-10 rounded-full text-sm font-semibold transition-all',
                          getCriteriaRating(criteria.id) === rating
                            ? getRatingColor(rating, true)
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        ]"
                      >
                        {{ rating }}
                      </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">
                      {{ getRatingText(getCriteriaRating(criteria.id)) }}
                    </p>
                  </div>

                  <!-- Criteria Note -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Notiz zu "{{ criteria.name }}"
                    </label>
                    <textarea
                      v-model="criteriaNotes[criteria.id]"
                      :placeholder="`Spezifische Beobachtungen zu ${criteria.name}...`"
                      class="w-full h-20 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
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
            Abbrechen
          </button>
          <button
            @click="saveEvaluation"
            :disabled="isSaving || !isValid"
            :class="[
              'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
              isValid && !isSaving
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            ]"
          >
            {{ isSaving ? 'Speichern...' : 'Bewertung speichern' }}
          </button>
        </div>
        
        <!-- Validation hints -->
        <div v-if="!isValid" class="mt-2 text-xs text-red-600">
          <p v-if="!overallRating">• Gesamtnote ist erforderlich</p>
          <p v-if="missingRequiredCriteria.length > 0">
            • Pflichtkriterien fehlen: {{ missingRequiredCriteria.join(', ') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'

// Props
interface Props {
  isOpen: boolean
  appointment: any
  studentCategory: string // B, A, A1, etc.
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits(['close', 'saved'])

// Supabase
const supabase = getSupabase()

// State
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)

// Evaluation data
const evaluationCategories = ref<any[]>([])
const expandedCategories = ref<string[]>([])

// Form data
const overallRating = ref<number | null>(null)
const overallNote = ref('')
const criteriaRatings = ref<Record<string, number>>({})
const criteriaNotes = ref<Record<string, string>>({})

// Computed
const isValid = computed(() => {
  return overallRating.value && missingRequiredCriteria.value.length === 0
})

const missingRequiredCriteria = computed(() => {
  const missing: string[] = []
  evaluationCategories.value.forEach(category => {
    category.criteria?.forEach((criteria: any) => {
      if (criteria.is_required && !criteriaRatings.value[criteria.id]) {
        missing.push(criteria.name)
      }
    })
  })
  return missing
})

// Methods
const closeModal = () => {
  emit('close')
}

const loadEvaluationMatrix = async () => {
  if (!props.studentCategory) return
  
  isLoading.value = true
  error.value = null
  
  try {
    // Load evaluation matrix for this driving category
    const { data, error: supabaseError } = await supabase
      .from('v_evaluation_matrix')
      .select('*')
      .eq('driving_category', props.studentCategory)
      .order('category_order')
      .order('criteria_order')

    if (supabaseError) throw supabaseError

    // Group by category
    const grouped = data?.reduce((acc: any, item: any) => {
      const categoryId = item.evaluation_category_id
      if (!acc[categoryId]) {
        acc[categoryId] = {
          id: categoryId,
          name: item.category_name,
          color: item.category_color || '#6B7280',
          criteria: []
        }
      }
      
      acc[categoryId].criteria.push({
        id: item.evaluation_criteria_id,
        name: item.criteria_name,
        description: item.criteria_description,
        short_code: item.short_code,
        is_required: item.is_required,
        min_rating: item.min_rating,
        max_rating: item.max_rating
      })
      
      return acc
    }, {})

    evaluationCategories.value = Object.values(grouped || {})
    
    // Expand first category by default
    if (evaluationCategories.value.length > 0) {
      expandedCategories.value = [evaluationCategories.value[0].id]
    }

  } catch (err: any) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

const loadExistingEvaluation = async () => {
  if (!props.appointment?.id) return
  
  try {
    const { data, error: supabaseError } = await supabase
      .from('notes')
      .select('*')
      .eq('appointment_id', props.appointment.id)

    if (supabaseError) throw supabaseError

    // Load existing ratings
    data?.forEach(note => {
      if (note.staff_rating && !note.evaluation_criteria_id) {
        // Overall rating
        overallRating.value = note.staff_rating
        overallNote.value = note.staff_note || ''
      } else if (note.evaluation_criteria_id) {
        // Criteria-specific rating
        criteriaRatings.value[note.evaluation_criteria_id] = note.criteria_rating || 0
        criteriaNotes.value[note.evaluation_criteria_id] = note.criteria_note || ''
      }
    })

  } catch (err: any) {
    console.error('Error loading existing evaluation:', err)
  }
}

const toggleCategory = (categoryId: string) => {
  const index = expandedCategories.value.indexOf(categoryId)
  if (index > -1) {
    expandedCategories.value.splice(index, 1)
  } else {
    expandedCategories.value.push(categoryId)
  }
}

const getCategoryProgress = (categoryId: string) => {
  const category = evaluationCategories.value.find(c => c.id === categoryId)
  if (!category) return '0/0'
  
  const total = category.criteria.length
  const completed = category.criteria.filter((c: any) => criteriaRatings.value[c.id]).length
  
  return `${completed}/${total}`
}

const getRatingRange = (criteria: any) => {
  const range = []
  for (let i = criteria.min_rating; i <= criteria.max_rating; i++) {
    range.push(i)
  }
  return range
}

const setCriteriaRating = (criteriaId: string, rating: number) => {
  criteriaRatings.value[criteriaId] = rating
}

const getCriteriaRating = (criteriaId: string) => {
  return criteriaRatings.value[criteriaId] || null
}

const getCriteriaNote = (criteriaId: string) => {
  return criteriaNotes.value[criteriaId] || ''
}

// Diese Funktion ist jetzt optional, da wir v-model verwenden
const setCriteriaNote = (criteriaId: string, note: string) => {
  if (!criteriaNotes.value[criteriaId]) {
    criteriaNotes.value[criteriaId] = ''
  }
  criteriaNotes.value[criteriaId] = note
}

const getRatingColor = (rating: number, selected = false) => {
  const colors = {
    1: selected ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700',
    2: selected ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700',
    3: selected ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700',
    4: selected ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-700',
    5: selected ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700',
    6: selected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'
  }
  return colors[rating as keyof typeof colors] || (selected ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-700')
}

const getRatingText = (rating: number | null) => {
  const texts = {
    1: 'Besprochen',
    2: 'Geübt',
    3: 'Ungenügend',
    4: 'Genügend',
    5: 'Gut',
    6: 'Prüfungsreif'
  }
  return rating ? texts[rating as keyof typeof texts] || '' : ''
}

const saveEvaluation = async () => {
  if (!isValid.value || !props.appointment?.id) return
  
  isSaving.value = true
  
  try {
    // Delete existing notes for this appointment
    await supabase
      .from('notes')
      .delete()
      .eq('appointment_id', props.appointment.id)

    const notesToInsert = []

    // Overall rating and note
    notesToInsert.push({
      appointment_id: props.appointment.id,
      staff_rating: overallRating.value,
      staff_note: overallNote.value,
      evaluation_criteria_id: null,
      criteria_rating: null,
      criteria_note: null
    })

    // Criteria-specific ratings and notes
    Object.entries(criteriaRatings.value).forEach(([criteriaId, rating]) => {
      if (rating) {
        notesToInsert.push({
          appointment_id: props.appointment.id,
          staff_rating: null,
          staff_note: '',
          evaluation_criteria_id: criteriaId,
          criteria_rating: rating,
          criteria_note: criteriaNotes.value[criteriaId] || ''
        })
      }
    })

    // Insert all notes
    const { error: insertError } = await supabase
      .from('notes')
      .insert(notesToInsert)

    if (insertError) throw insertError

    emit('saved')
    closeModal()

  } catch (err: any) {
    error.value = err.message
  } finally {
    isSaving.value = false
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('de-CH', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Watchers
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    loadEvaluationMatrix()
    loadExistingEvaluation()
  } else {
    // Reset form
    overallRating.value = null
    overallNote.value = ''
    criteriaRatings.value = {}
    criteriaNotes.value = {}
    expandedCategories.value = []
    error.value = null
  }
})

watch(() => props.studentCategory, () => {
  if (props.isOpen) {
    loadEvaluationMatrix()
  }
})
</script>

<style scoped>
/* Custom scrollbar for better mobile experience */
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

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Smooth transitions */
.transition-all {
  transition: all 0.2s ease-in-out;
}

/* Mobile touch optimization */
@media (hover: none) and (pointer: coarse) {
  .hover\:bg-gray-300:hover {
    background-color: #d1d5db;
  }
  
  .hover\:bg-green-700:hover {
    background-color: #15803d;
  }
}
</style>