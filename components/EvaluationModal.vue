<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col">
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

      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="isLoading" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>

        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          {{ error }}
        </div>

        <div v-else class="space-y-4">
          <div class="relative">
            <div class="relative">
              <input
                v-model="searchQuery"
                @click="showDropdown = true"
                @input="showDropdown = true"
                type="text"
                placeholder="Bewertungspunkt suchen und hinzufügen..."
                class="search-input w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
              <div class="absolute left-3 top-3.5 text-gray-400">
                🔍
              </div>
            </div>

            <div 
              v-if="showDropdown && filteredCriteria.length > 0"
              class="criteria-dropdown absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              <div
                v-for="criteria in filteredCriteria"
                :key="criteria.id"
                @click="selectCriteria(criteria)"
                class="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-medium text-gray-900">{{ criteria.name }}</h4>
                    <p class="text-sm text-gray-600">{{ criteria.category_name }}</p>
                  </div>
                  <span v-if="criteria.short_code" class="text-xs bg-gray-100 px-2 py-1 rounded">
                    {{ criteria.short_code }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div
              v-for="(criteriaId, index) in selectedCriteriaOrder"
              :key="criteriaId"
              class="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">
                    {{ getCriteriaById(criteriaId)?.name }}
                  </h4>
                  <p class="text-sm text-gray-600">
                    {{ getCriteriaById(criteriaId)?.category_name }}
                  </p>
                </div>
                
                <button
                  @click="removeCriteria(criteriaId)"
                  class="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Bewertung (1-6)
                </label>
                <div class="flex gap-2">
                  <button
                    v-for="rating in [1, 2, 3, 4, 5, 6]"
                    :key="rating"
                    @click="setCriteriaRating(criteriaId, rating)"
                    :class="[
                      'w-10 h-10 rounded-full text-sm font-semibold transition-all',
                      getCriteriaRating(criteriaId) === rating
                        ? getRatingColor(rating, true)
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    ]"
                  >
                    {{ rating }}
                  </button>
                </div>
                <p class="text-xs text-gray-500 mt-1">
                  {{ getRatingText(getCriteriaRating(criteriaId)) }}
                </p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Notiz (optional)
                </label>
                <textarea
                  v-model="criteriaNotes[criteriaId]"
                  :placeholder="`Notiz zu ${getCriteriaById(criteriaId)?.name}...`"
                  class="w-full h-20 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          <div v-if="selectedCriteriaOrder.length === 0" class="text-center py-8">
            <div class="text-4xl mb-2">📝</div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Bewertungspunkte hinzufügen</h3>
            <p class="text-gray-600">
              Suchen Sie oben nach Bewertungspunkten und klicken Sie diese an, um die Lektion zu bewerten.
            </p>
          </div>
        </div>
      </div>

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
        
        <div v-if="!isValid && selectedCriteriaOrder.length > 0" class="mt-2 text-xs text-red-600">
          <p v-if="missingRequiredRatings.length > 0">
            • Folgende Bewertungspunkte müssen noch bewertet werden: {{ missingRequiredRatings.join(', ') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { formatDate } from '~/utils/dateUtils'
// Importiere den CriteriaEvaluationData-Typ
import { usePendingTasks, type CriteriaEvaluationData } from '~/composables/usePendingTasks'

// Props
interface Props {
  isOpen: boolean
  appointment: any
  studentCategory: string
  currentUser?: any
  eventType?: 'lesson' | 'staff_meeting' // ✅ Neuer Prop
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits(['close', 'saved'])

// WICHTIG: Verwende das zentrale usePendingTasks Composable
// Jetzt importieren wir saveCriteriaEvaluations
const { saveCriteriaEvaluations } = usePendingTasks()

// Supabase
const supabase = getSupabase()

// State
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)

// Search & Dropdown
const searchQuery = ref('')
const showDropdown = ref(false)
const allCriteria = ref<any[]>([]) // Wird von v_evaluation_matrix geladen

// Selected Criteria (in order of selection, newest first)
const selectedCriteriaOrder = ref<string[]>([])
const criteriaRatings = ref<Record<string, number>>({})
const criteriaNotes = ref<Record<string, string>>({})

// Computed
const filteredCriteria = computed(() => {
  if (!searchQuery.value) {
    // Wenn Suchfeld leer ist, zeige alle Kriterien, die noch nicht ausgewählt sind
    return allCriteria.value.filter(criteria => !selectedCriteriaOrder.value.includes(criteria.id))
  }
  
  const query = searchQuery.value.toLowerCase()
  return allCriteria.value.filter(criteria => 
    (criteria.name?.toLowerCase().includes(query) ||
    criteria.category_name?.toLowerCase().includes(query) ||
    criteria.short_code?.toLowerCase().includes(query)) &&
    // Don't show already selected criteria
    !selectedCriteriaOrder.value.includes(criteria.id)
  )
})

const isValid = computed(() => {
  // Valid nur wenn:
  // 1. Mindestens ein Kriterium ausgewählt ist
  // 2. ALLE ausgewählten Kriterien haben eine Bewertung
  if (selectedCriteriaOrder.value.length === 0) {
    return false
  }
  
  // Prüfen ob alle ausgewählten Kriterien bewertet wurden
  return selectedCriteriaOrder.value.every(criteriaId => {
    const rating = criteriaRatings.value[criteriaId]
    return rating && rating >= 1 && rating <= 6
  })
})

const missingRequiredRatings = computed(() => {
  const missing: string[] = []
  selectedCriteriaOrder.value.forEach(criteriaId => {
    const rating = criteriaRatings.value[criteriaId]
    if (!rating || rating < 1 || rating > 6) {
      const criteria = getCriteriaById(criteriaId)
      if (criteria) {
        missing.push(criteria.name)
      }
    }
  })
  return missing
})

// Methods
const closeModal = () => {
  console.log('🔥 EvaluationModal - closing modal')
  emit('close')
}

const loadAllCriteria = async () => {
  if (!props.studentCategory) {
    console.log('❌ No student category provided')
    return
  }
  
  console.log('🔥 EvaluationModal - loadAllCriteria called with category:', props.studentCategory)
  isLoading.value = true
  error.value = null
  
  try {
    // Da v_evaluation_matrix die category_id enthält, müssen wir hier die richtige Spalte verwenden
    // Der Fehler bei evaluation_criteria_id im vorherigen Schritt deutet darauf hin,
    // dass deine v_evaluation_matrix anders aufgebaut ist, als ich dachte.
    // Wir müssen die korrekten Spaltennamen aus v_evaluation_matrix verwenden.
    
    // Die Spaltennamen sind typischerweise:
    // id (der Kriterien-ID), name (Kriterienname), short_code, category_name (aus evaluation_categories)
    // Wenn deine v_evaluation_matrix nur 'evaluation_criteria_id' und 'criteria_name' etc. hat, 
    // dann müssen wir das entsprechend anpassen.
    // Laut deiner letzten Ausgabe: item.evaluation_criteria_id, item.criteria_name, item.category_name
    
    const { data, error: supabaseError } = await supabase
      .from('v_evaluation_matrix')
      .select(`
        evaluation_criteria_id,
        criteria_name,
        criteria_description,
        short_code,
        category_name
      `)
      // .eq('driving_category', props.studentCategory) // Diese Zeile könnte einen Fehler verursachen,
      // da ich nicht sicher bin, ob 'driving_category' in v_evaluation_matrix existiert.
      // Falls ja, lass sie drin. Falls nicht, kommentiere sie aus und füge sie später hinzu.
      // Basierend auf den vorherigen Logs, scheint diese Spalte NICHT zu existieren in evaluation_criteria.
      // Wenn evaluation_matrix eine View ist, die alles zusammenfügt, ist es wahrscheinlich,
      // dass sie eine Spalte wie `driving_category` hat.
      // Wenn der Fehler auftritt, liegt es an diesem .eq() Filter.
      
      // Ich gehe davon aus, dass deine v_evaluation_matrix das driving_category-Feld hat,
      // da du es als Prop übergibst. Wenn nicht, melde dich!
      .eq('driving_category', props.studentCategory) 


    if (supabaseError) {
      console.error('❌ Supabase error loading evaluation criteria:', supabaseError)
      throw supabaseError
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No criteria found for category', props.studentCategory)
      error.value = 'Keine Bewertungskriterien gefunden für Kategorie ' + props.studentCategory
      return
    }

    // Mappe die Daten auf das erwartete Format
    allCriteria.value = data.map(item => ({
      id: item.evaluation_criteria_id, // Wichtig: Die ID des Kriteriums
      name: item.criteria_name,
      description: item.criteria_description,
      short_code: item.short_code,
      category_name: item.category_name, // Name der Kategorie
      // Hier könntest du weitere Felder hinzufügen, falls aus v_evaluation_matrix vorhanden (z.B. min_rating, max_rating)
    }));

    console.log('✅ Loaded and processed criteria:', allCriteria.value.length)
    console.log('📋 First few processed criteria:', allCriteria.value.slice(0, 3))

  } catch (err: any) {
    console.error('❌ Error in loadAllCriteria:', err)
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}


const selectCriteria = (criteria: any) => {
  // Add to beginning of array (newest first) only if not already selected
  if (!selectedCriteriaOrder.value.includes(criteria.id)) {
    selectedCriteriaOrder.value.unshift(criteria.id)
    
    // Initialize rating and note if not exists
    if (!criteriaRatings.value[criteria.id]) {
      criteriaRatings.value[criteria.id] = 0 // Standardwert 0 oder null
    }
    if (!criteriaNotes.value[criteria.id]) {
      criteriaNotes.value[criteria.id] = ''
    }
  }
  
  // Clear search and hide dropdown
  searchQuery.value = ''
  showDropdown.value = false
}

const removeCriteria = (criteriaId: string) => {
  const index = selectedCriteriaOrder.value.indexOf(criteriaId)
  if (index > -1) {
    selectedCriteriaOrder.value.splice(index, 1)
  }
  
  // Remove rating and note
  delete criteriaRatings.value[criteriaId]
  delete criteriaNotes.value[criteriaId]
}

const getCriteriaById = (criteriaId: string) => {
  return allCriteria.value.find(c => c.id === criteriaId)
}

const setCriteriaRating = (criteriaId: string, rating: number) => {
  criteriaRatings.value[criteriaId] = rating
}

const getCriteriaRating = (criteriaId: string) => {
  return criteriaRatings.value[criteriaId] || 0 // Rückgabe 0, falls nicht gesetzt
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

const loadExistingEvaluation = async () => {
  if (!props.appointment?.id) return
  
  try {
    const { data, error: supabaseError } = await supabase
      .from('notes')
      .select('evaluation_criteria_id, criteria_rating, criteria_note') // Nur die relevanten Spalten laden
      .eq('appointment_id', props.appointment.id)
      .not('evaluation_criteria_id', 'is', null) // Nur Kriterien-Bewertungen laden

    if (supabaseError) throw supabaseError

    // Lade existierende Kriterien-Bewertungen und ordne sie neu an (neueste zuerst)
    selectedCriteriaOrder.value = [] // Zuerst leeren
    data?.forEach(note => {
      if (note.evaluation_criteria_id) {
        selectedCriteriaOrder.value.unshift(note.evaluation_criteria_id) // Add to beginning
        criteriaRatings.value[note.evaluation_criteria_id] = note.criteria_rating || 0
        criteriaNotes.value[note.evaluation_criteria_id] = note.criteria_note || ''
      }
    })

  } catch (err: any) {
    console.error('Error loading existing evaluation:', err)
  }
}

const saveEvaluation = async () => {
  console.log('🔥 EvaluationModal - saveEvaluation called')
  
  if (!isValid.value || !props.appointment?.id) {
    console.log('❌ Validation failed or no appointment ID')
    // Fehler anzeigen, wenn isValid false ist, z.B. über ein Toast
    error.value = missingRequiredRatings.value.length > 0
      ? `Bitte bewerten Sie alle ausgewählten Kriterien: ${missingRequiredRatings.value.join(', ')}`
      : 'Bitte wählen Sie mindestens ein Kriterium und bewerten Sie es.';
    return;
  }
  
  isSaving.value = true
  error.value = null
  
  try {
    // Erstelle ein Array von CriteriaEvaluationData-Objekten
    const evaluationsToSave: CriteriaEvaluationData[] = selectedCriteriaOrder.value.map(criteriaId => {
      return {
        criteria_id: criteriaId,
        rating: criteriaRatings.value[criteriaId],
        note: criteriaNotes.value[criteriaId] || '' // Sicherstellen, dass es ein String ist
      }
    })

    console.log('🔥 EvaluationModal - calling saveCriteriaEvaluations with:', {
      appointmentId: props.appointment.id,
      evaluations: evaluationsToSave,
      currentUser: props.currentUser?.id
    })

    // RUFE DIE NEUE FUNKTION IM COMPOSABLE AUF
    await saveCriteriaEvaluations(
      props.appointment.id,
      evaluationsToSave,
      props.currentUser?.id
    )

    console.log('✅ EvaluationModal - evaluations saved successfully via composable')
    
    // Emit saved event
    emit('saved', props.appointment.id)
    
  } catch (err: any) {
    console.error('❌ EvaluationModal - error saving evaluation:', err)
    error.value = err.message || 'Fehler beim Speichern der Bewertung'
  } finally {
    isSaving.value = false
  }
}

// Click outside or escape key to close dropdown
const handleClickOutside = (event: Event) => {
  const dropdown = document.querySelector('.criteria-dropdown')
  const input = document.querySelector('.search-input')
  
  if (dropdown && !dropdown.contains(event.target as Node) && 
      input && !input.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    showDropdown.value = false
  }
}

// Watchers
watch(showDropdown, (isOpen) => {
  if (isOpen) {
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)
  } else {
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleEscapeKey)
  }
})

// Watchers
watch(() => props.isOpen, (isOpen) => {
  console.log('🔥 EvaluationModal - isOpen changed:', isOpen)
  console.log('🔥 Student category:', props.studentCategory)
  console.log('🔥 Appointment:', props.appointment)
  
  if (isOpen) {
    console.log('🔄 EvaluationModal - loading data...')
    // Kleine Verzögerung um sicherzustellen dass alle Props gesetzt sind
    nextTick(() => {
      loadAllCriteria()
      loadExistingEvaluation()
    })
  } else {
    console.log('🔥 EvaluationModal - resetting form...')
    // Reset form
    searchQuery.value = ''
    showDropdown.value = false
    selectedCriteriaOrder.value = []
    criteriaRatings.value = {}
    criteriaNotes.value = {}
    error.value = null
    
    // Clean up event listeners
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleEscapeKey)
  }
}, { immediate: true })

// Zusätzlicher Watch für studentCategory
watch(() => props.studentCategory, (newCategory) => {
  console.log('🔄 Student category changed to:', newCategory)
  if (props.isOpen && newCategory) {
    console.log('🔄 Reloading criteria for new category...')
    loadAllCriteria()
  }
}, { immediate: true })
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
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
}

/* Focus states for accessibility */
input:focus, textarea:focus {
  outline: none;
}
</style>