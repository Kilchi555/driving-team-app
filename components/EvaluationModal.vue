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

      <!-- Sortierungs-Regler -->
      <div v-if="selectedCriteriaOrder.length > 1" class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
        <div class="flex items-center space-x-3">
          <span class="text-gray-500 text-xs font-semibold">Sortierung:</span>
          <button
            @click="sortByNewest = true"
            :class="[
              'px-3 py-1 text-xs rounded-md transition-colors',
              sortByNewest ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            ]"
          >
          Nach Datum    </button>
          <button
            @click="sortByNewest = false"
            :class="[
              'px-3 py-1 text-xs rounded-md transition-colors',
              !sortByNewest ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            ]"
          >
          Nach Bewertung    
      </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="isLoading" class="flex items-center justify-center py-4">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>

        <div v-else-if="error" class="bg-red-50 border border-red-200 rounded p-2 text-red-700">
          {{ error }}
        </div>

        <div v-else class="space-y-2">
          <div class="relative">
            <div class="relative">
              <input
                v-model="searchQuery"
                @click="showDropdown = true"
                @input="showDropdown = true"
                type="text"
                placeholder="Bewertungspunkt suchen und hinzufügen..."
                class="search-input w-full pl-10 pr-2 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
              v-for="(criteriaId, index) in sortedCriteriaOrder"
              :key="criteriaId"
              class="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">
                    {{ getCriteriaById(criteriaId)?.name }}
                  </h4>
                      <!-- NEU: Lektionsdatum hinzufügen -->
                  <p v-if="criteriaAppointments[criteriaId]?.start_time" class="text-xs text-gray-500 mt-1">
                    📅 Bewertung vom {{ formatLessonDate(criteriaId) }}
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
                  class="w-full h-10 p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
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
            {{ isSaving ? 'Speichern...' : 'Speichern' }}
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
const showDeleteConfirmation = ref(false)


// Search & Dropdown
const searchQuery = ref('')
const showDropdown = ref(false)
const allCriteria = ref<any[]>([]) // Wird von v_evaluation_matrix geladen

// Selected Criteria (in order of selection, newest first)
const selectedCriteriaOrder = ref<string[]>([])
const criteriaRatings = ref<Record<string, number>>({})
const criteriaNotes = ref<Record<string, string>>({})
const sortByNewest = ref(true) // true = neueste zuerst, false = schlechteste zuerst
const criteriaTimestamps = ref<Record<string, string>>({}) // Neue ref für Timestamps
const criteriaAppointments = ref<Record<string, { appointment_id: string, start_time: string }>>({})


// Computed

const filteredCriteria = computed(() => {
  // Zeige nur Kriterien, die NICHT bereits ausgewählt/bewertet sind
  const unratedCriteria = allCriteria.value.filter(criteria => 
    !selectedCriteriaOrder.value.includes(criteria.id)
  )
  
  // Wenn kein Suchtext eingegeben, zeige alle unbewerteten
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    return unratedCriteria
  }
  
  // Filtere unbewertete Kriterien nach Suchtext
  const query = searchQuery.value.toLowerCase()
  return unratedCriteria.filter(criteria => 
    (criteria.name?.toLowerCase().includes(query) ||
     criteria.category_name?.toLowerCase().includes(query) ||
     criteria.short_code?.toLowerCase().includes(query))
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

// Verbesserte sortedCriteriaOrder mit Lektionsdatum
const sortedCriteriaOrder = computed(() => {
  console.log('🔍 SORT DEBUG - sortByNewest:', sortByNewest.value)
  console.log('🔍 SORT DEBUG - criteriaAppointments:', criteriaAppointments.value)
  
  if (!sortByNewest.value) {
    // Sortiere nach Bewertung (schlechteste zuerst)
    return [...selectedCriteriaOrder.value].sort((a, b) => {
      const ratingA = criteriaRatings.value[a] || 7
      const ratingB = criteriaRatings.value[b] || 7
      console.log('🔍 RATING SORT:', a, ratingA, 'vs', b, ratingB)
      return ratingA - ratingB
    })
  } else {
    // Sortiere nach Lektionsdatum (neueste Lektionen zuerst)
    return [...selectedCriteriaOrder.value].sort((a, b) => {
      const appointmentA = criteriaAppointments.value[a]
      const appointmentB = criteriaAppointments.value[b]
      
      if (appointmentA?.start_time && appointmentB?.start_time) {
        console.log('🔍 DATE SORT:', appointmentA.start_time, 'vs', appointmentB.start_time)
        return new Date(appointmentB.start_time).getTime() - new Date(appointmentA.start_time).getTime()
      }
      
      console.log('🔍 FALLBACK SORT for:', a, b)
      const indexA = selectedCriteriaOrder.value.indexOf(a)
      const indexB = selectedCriteriaOrder.value.indexOf(b)
      return indexA - indexB
    })
  }
})

// Methods
const closeModal = () => {
  console.log('🔥 EvaluationModal - closing modal')
  emit('close')
}

// KOMPLETT SAUBERE VERSION - Ersetzen Sie Ihre gesamte loadAllCriteria Funktion mit dieser:

const loadAllCriteria = async () => {
  if (!props.studentCategory) {
    return
  }
  
  isLoading.value = true
  error.value = null
  
  try {
    // Erste Abfrage: Hole alle category_criteria für die Kategorie
    const { data: categoryCriteria, error: ccError } = await supabase
      .from('category_criteria')
      .select('evaluation_criteria_id, evaluation_category_id, driving_category, is_required, display_order')
      .eq('driving_category', props.studentCategory)

    if (ccError) throw ccError

    if (!categoryCriteria || categoryCriteria.length === 0) {
      error.value = 'Keine Bewertungskriterien gefunden für Kategorie ' + props.studentCategory
      return
    }

    // Extrahiere alle IDs für weitere Abfragen
    const criteriaIds = categoryCriteria.map(cc => cc.evaluation_criteria_id)
    const categoryIds = [...new Set(categoryCriteria.map(cc => cc.evaluation_category_id))]

    // Zweite Abfrage: Hole evaluation_criteria
    const { data: criteria, error: cError } = await supabase
      .from('evaluation_criteria')
      .select('id, name, description, short_code, is_active')
      .in('id', criteriaIds)
      .eq('is_active', true)

    if (cError) throw cError

    // Dritte Abfrage: Hole evaluation_categories
    const { data: categories, error: catError } = await supabase
      .from('evaluation_categories')
      .select('id, name, color, display_order, is_active')
      .in('id', categoryIds)
      .eq('is_active', true)

    if (catError) throw catError

    // Debug: Test der ersten Verknüpfung
    const testCc = categoryCriteria[0]
    const testCriterion = criteria?.find(c => c.id === testCc.evaluation_criteria_id)
    const testCategory = categories?.find(cat => cat.id === testCc.evaluation_category_id)

    // Kombiniere alle Daten
    allCriteria.value = categoryCriteria.map(cc => {
      const criterion = criteria?.find(c => c.id === cc.evaluation_criteria_id)
      const category = categories?.find(cat => cat.id === cc.evaluation_category_id)
      
      return {
        id: criterion?.id || '',
        name: criterion?.name || '',
        description: criterion?.description || '',
        short_code: criterion?.short_code || '',
        category_name: category?.name || '',
        category_color: category?.color || '#gray',
        category_order: category?.display_order || 0,
        criteria_order: cc.display_order || 0,
        is_required: cc.is_required || false,
        min_rating: 1,
        max_rating: 6
      }
    })
    .filter(item => item.name) // Nur gültige Einträge
    .sort((a, b) => {
      // Sortiere nach Kategorie-Reihenfolge, dann nach Kriterien-Reihenfolge
      if (a.category_order !== b.category_order) {
        return a.category_order - b.category_order
      }
      return a.criteria_order - b.criteria_order
    })

  } catch (err: any) {
    error.value = err.message || 'Fehler beim Laden der Bewertungskriterien'
  } finally {
    isLoading.value = false
  }
}

// Beim Hinzufügen neuer Kriterien das aktuelle Appointment setzen
const selectCriteria = (criteria: any) => {
  if (!selectedCriteriaOrder.value.includes(criteria.id)) {
    selectedCriteriaOrder.value.unshift(criteria.id)
    
    // Setze aktuelles Appointment für neue Kriterien
    if (props.appointment) {
      criteriaAppointments.value[criteria.id] = {
        appointment_id: props.appointment.id,
        start_time: props.appointment.start_time
      }
    }
    
    // Initialize rating and note
    if (!criteriaRatings.value[criteria.id]) {
      criteriaRatings.value[criteria.id] = 0
    }
    if (!criteriaNotes.value[criteria.id]) {
      criteriaNotes.value[criteria.id] = ''
    }
  }
  
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
const loadStudentEvaluationHistory = async () => {
  console.log('🔍 DEBUG: Loading student evaluation history')
  console.log('🔍 DEBUG: student ID:', props.appointment?.user_id)
  if (!props.appointment?.user_id) {
    console.log('❌ No student ID')
    return
  }

  try {
    // Schritt 1: Hole alle Termine für diesen Schüler MIT start_time
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, start_time')
      .eq('user_id', props.appointment.user_id)
      .order('start_time', { ascending: false }) // Neueste Termine zuerst

    if (appointmentsError) throw appointmentsError

    const appointmentIds = appointments?.map(app => app.id) || []
    console.log('🔍 DEBUG: found appointments for student:', appointmentIds.length)
    if (appointmentIds.length === 0) return

    // Erstelle ein Mapping von appointment_id zu start_time
    const appointmentDateMap = new Map()
    appointments?.forEach(apt => {
      appointmentDateMap.set(apt.id, apt.start_time)
    })

    // Schritt 2: Hole ALLE Bewertungen für diese Termine
    const { data, error: supabaseError } = await supabase
      .from('notes')
      .select(`
        evaluation_criteria_id,
        criteria_rating,
        criteria_note,
        appointment_id
      `)
      .in('appointment_id', appointmentIds)
      .not('evaluation_criteria_id', 'is', null)

    console.log('🔍 DEBUG: found historical notes:', data?.length)
    if (supabaseError) throw supabaseError

    // Gruppiere Bewertungen nach Kriterien (zeige die neueste pro Kriterium)
    const latestByCriteria = new Map()
    data?.forEach(note => {
      const criteriaId = note.evaluation_criteria_id
      const appointmentDate = appointmentDateMap.get(note.appointment_id)
      
      if (!latestByCriteria.has(criteriaId)) {
        latestByCriteria.set(criteriaId, { ...note, lesson_date: appointmentDate })
      } else {
        // Vergleiche Lektionsdaten - neuere Lektion überschreibt ältere
        const existing = latestByCriteria.get(criteriaId)
        const existingDate = existing.lesson_date
        if (appointmentDate && existingDate && new Date(appointmentDate) > new Date(existingDate)) {
          latestByCriteria.set(criteriaId, { ...note, lesson_date: appointmentDate })
        }
      }
    })

    // Sortiere nach Lektionsdatum (neueste Lektionen zuerst)
    const sortedByLessonDate = Array.from(latestByCriteria.entries())
      .sort(([, noteA], [, noteB]) => {
        const dateA = noteA.lesson_date
        const dateB = noteB.lesson_date
        if (!dateA || !dateB) return 0
        return new Date(dateB).getTime() - new Date(dateA).getTime()
      })
      .map(([criteriaId]) => criteriaId)

    selectedCriteriaOrder.value = sortedByLessonDate

    // Speichere Appointment-Daten für Sortierung
    criteriaAppointments.value = {}
    latestByCriteria.forEach((note, criteriaId) => {
      criteriaRatings.value[criteriaId] = note.criteria_rating || 0
      criteriaNotes.value[criteriaId] = note.criteria_note || ''
      // Speichere Lektionsdatum für Sortierung
      criteriaAppointments.value[criteriaId] = {
        appointment_id: note.appointment_id,
        start_time: note.lesson_date
      }
    })

    console.log('🔍 DEBUG: loaded historical criteria:', selectedCriteriaOrder.value.length)
    console.log('🔍 DEBUG: lesson dates saved:', criteriaAppointments.value)

  } catch (err: any) {
    console.error('❌ Error loading student history:', err)
  }
}

const formatLessonDate = (criteriaId: string) => {
  const appointment = criteriaAppointments.value[criteriaId]
  if (!appointment?.start_time) return ''
  
  const date = new Date(appointment.start_time)
  return date.toLocaleDateString('de-CH', { 
    day: '2-digit', 
    month: '2-digit',
    year: '2-digit'
  })
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
  
  if (isOpen) {
    console.log('🔄 EvaluationModal - loading data...')
    // Kleine Verzögerung um sicherzustellen dass alle Props gesetzt sind
    nextTick(() => {
      loadAllCriteria()
      loadStudentEvaluationHistory()
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
    criteriaTimestamps.value = {}
    
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