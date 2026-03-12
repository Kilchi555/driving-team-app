<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4">
    <div class="bg-white rounded-lg max-w-4xl w-full h-[calc(100svh-1rem)] sm:h-[90vh] flex flex-col evaluation-modal-container">
      <div class="bg-green-600 text-white p-4 flex-shrink-0">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold">Lektion bewerten</h2>
          </div>
          
          <!-- ✅ NEU: Cancel Button für Termin-Absage -->
          <button 
            @click="openCancelModal"
            class="mr-3 px-4 py-2 bg-green-600 border-2 border-white text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
            title="Termin absagen"
          >
            Abgesagt
          </button>
          
          <button @click="closeModal" class="text-white hover:text-green-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Sortierungs-Regler -->
      <div v-if="currentTermCriteria.length > 1" class="flex items-center justify-between p-2 bg-gray-50 border-b flex-shrink-0">
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

      <div class="flex-1 overflow-y-auto p-4 evaluation-modal-content">
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
                placeholder="Thema suchen und hinzufügen..."
                class="search-input w-full pl-10 pr-2 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
          
            </div>

            <div 
              v-if="showDropdown && filteredCriteria.length > 0"
              class="criteria-dropdown absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-50 max-h-60 overflow-y-auto"
            >
                          <!-- Gruppierte Kriterien nach Kategorien -->
            <template v-for="(categoryGroup, categoryName) in groupedCriteria" :key="categoryName">
              <!-- Kategorie-Überschrift -->
              <div class="px-3 py-3 bg-blue-50 border-b border-blue-200">
                <h3 class="text-base font-bold text-blue-800">{{ categoryName }}</h3>
              </div>
              
              <!-- Kriterien dieser Kategorie -->
              <div
                v-for="criteria in categoryGroup"
                :key="criteria.id"
                @click="selectCriteria(criteria)"
                class="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex items-center justify-between"
              >
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">{{ criteria.name }}</h4>
                </div>
                
                <!-- ✅ NEU: Zeige nur Punkte in Farben wenn bereits bewertet -->
                <div v-if="getAllRatingsForCriteria(criteria.id).length > 0" class="ml-3 flex items-center gap-1">
                  <div
                    v-for="rating in getAllRatingsForCriteria(criteria.id)"
                    :key="rating"
                    :style="{ backgroundColor: getRatingColor(rating) }"
                    class="w-6 h-6 rounded-full flex items-center justify-center"
                  >
                    <span class="text-xs font-bold text-white">{{ rating }}</span>
                  </div>
                </div>
              </div>
            </template>
            </div>
          </div>

          <div class="space-y-2">
            <div
              v-for="(criteriaId, index) in currentTermCriteria"
              :key="criteriaId"
              class="bg-gray-50 rounded-lg p-3 border border-gray-200"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                  <h4 class="font-medium text-gray-900">
                    {{ getCriteriaById(criteriaId)?.name }}
                  </h4>         
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
                        ? getRatingColorClass(rating, true)
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
                <textarea
                  v-model="criteriaNotes[criteriaId]"
                  :placeholder="`Notiz optional...`"
                  class="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none overflow-y-auto"
                  style="height: 2.5rem; max-height: 10rem;"
                  rows="1"
                ></textarea>
              </div>
            </div>
          </div>

          <div v-if="currentTermCriteria.length === 0" class="text-center py-8">
            <div class="text-4xl mb-2">📝</div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Bewertungspunkte hinzufügen</h3>
            <p class="text-gray-600">
              Suchen Sie oben nach Bewertungspunkten und klicken Sie diese an, um die Lektion zu bewerten.
            </p>
          </div>
        </div>
      </div>

      

      <div class="bg-gray-50 px-4 py-3 border-t flex-shrink-0 evaluation-modal-footer">
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
            <strong>Muss noch bewertet werden:</strong> {{ missingRequiredRatings.join(', ') }}
          </p>
        </div>
      </div>
    </div>
    

  </div>
</template>

<script setup lang="ts">

import { ref, computed, watch, nextTick, onMounted } from 'vue'
// import { getSupabase } from '~/utils/supabase'
import { formatDate } from '~/utils/dateUtils'
import { logger } from '~/utils/logger'
import { useTenant } from '~/composables/useTenant'
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
const emit = defineEmits(['close', 'saved', 'cancel'])

// WICHTIG: Verwende das zentrale usePendingTasks Composable
// Jetzt importieren wir saveCriteriaEvaluations
const { saveCriteriaEvaluations } = usePendingTasks()

// Tenant
const { currentTenant } = useTenant()


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
const newlyRatedCriteria = ref<string[]>([]) // Track which criteria were newly rated in this session
const allCriteriaRatings = ref<Record<string, number[]>>({}) // ✅ NEU: Speichert ALLE Bewertungen pro Kriterium


// Computed

const filteredCriteria = computed(() => {
  // ✅ NEU: Zeige ALLE Kriterien (unbewertete + bereits bewertete)
  let criteria = allCriteria.value
  
  // Filtere nach Fahrkategorie des Schülers
  if (props.studentCategory) {
    logger.debug('🎓 Filtering criteria by student category:', props.studentCategory)
    const beforeFilter = criteria.length
    
    criteria = criteria.filter(c => {
      const drivingCategories = c.driving_categories || []
      const includesStudentCategory = 
        drivingCategories.length === 0 || 
        (Array.isArray(drivingCategories) && drivingCategories.includes(props.studentCategory))
      return includesStudentCategory
    })
    logger.debug('✅ After category filter: ', beforeFilter, '→', criteria.length, 'criteria remain')
  }
  
  // Wenn kein Suchtext eingegeben, zeige alle Kriterien
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    logger.debug('📚 filteredCriteria - returning all:', criteria.length)
    return criteria
  }
  
  // Filtere nach Suchtext
  const query = searchQuery.value.toLowerCase()
  const filtered = criteria.filter(c => 
    (c.name?.toLowerCase().includes(query) ||
     c.category_name?.toLowerCase().includes(query) ||
     false)
  )
  
  logger.debug('📚 filteredCriteria - returning filtered:', filtered.length)
  return filtered
})

// Gruppierte Kriterien nach Kategorien - mit Sortierung nach display_order
const groupedCriteria = computed(() => {
  const groups: Record<string, { order: number, criteria: any[] }> = {}
  
  logger.debug('📚 groupedCriteria - filteredCriteria.value:', filteredCriteria.value.length)
  logger.debug('📚 groupedCriteria - first criterion:', filteredCriteria.value[0])
  
  filteredCriteria.value.forEach(criteria => {
    const categoryName = criteria.evaluation_categories?.name || 'Unbekannte Kategorie'
    logger.debug('📚 groupedCriteria - processing:', criteria.name, 'categoryName:', categoryName)
    if (!groups[categoryName]) {
      groups[categoryName] = {
        order: criteria.category_order ?? 999,
        criteria: []
      }
    }
    groups[categoryName].criteria.push(criteria)
  })
  
  // Sortiere Kriterien innerhalb jeder Kategorie nach criteria_order
  Object.keys(groups).forEach(categoryName => {
    groups[categoryName].criteria.sort((a, b) => {
      const aOrder = a.criteria_order ?? 999
      const bOrder = b.criteria_order ?? 999
      return aOrder - bOrder
    })
  })
  
  // Konvertiere zu Array und sortiere nach Kategorie-Reihenfolge
  const sortedGroups = Object.entries(groups)
    .sort((a, b) => a[1].order - b[1].order)
    .reduce((acc, [key, value]) => {
      acc[key] = value.criteria
      return acc
    }, {} as Record<string, any[]>)
  
  logger.debug('📚 groupedCriteria - final groups:', Object.keys(sortedGroups))
  return sortedGroups
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
  logger.debug('🔍 SORT DEBUG - sortByNewest:', sortByNewest.value)
  logger.debug('🔍 SORT DEBUG - selectedCriteriaOrder:', selectedCriteriaOrder.value)
  logger.debug('🔍 SORT DEBUG - criteriaRatings:', criteriaRatings.value)
  
  if (!sortByNewest.value) {
    // Sortiere nach Bewertung (schlechteste zuerst)
    const sorted = [...selectedCriteriaOrder.value].sort((a, b) => {
      const ratingA = criteriaRatings.value[a] || 7
      const ratingB = criteriaRatings.value[b] || 7
      logger.debug('🔍 RATING SORT:', a, 'rating:', ratingA, 'vs', b, 'rating:', ratingB, 'result:', ratingA - ratingB)
      return ratingA - ratingB
    })
    logger.debug('🔍 AFTER RATING SORT:', sorted)
    return sorted
  } else {
    // Sortiere nach Lektionsdatum (neueste Lektionen zuerst)
    const sorted = [...selectedCriteriaOrder.value].sort((a, b) => {
      const appointmentA = criteriaAppointments.value[a]
      const appointmentB = criteriaAppointments.value[b]
      
      if (appointmentA?.start_time && appointmentB?.start_time) {
        logger.debug('🔍 DATE SORT:', appointmentA.start_time, 'vs', appointmentB.start_time)
        return new Date(appointmentB.start_time).getTime() - new Date(appointmentA.start_time).getTime()
      }
      
      logger.debug('🔍 FALLBACK SORT for:', a, b)
      const indexA = selectedCriteriaOrder.value.indexOf(a)
      const indexB = selectedCriteriaOrder.value.indexOf(b)
      return indexA - indexB
    })
    logger.debug('🔍 AFTER DATE SORT:', sorted)
    return sorted
  }
})

// ✅ NEU: Nur die Bewertungen des aktuellen Termins anzeigen
const currentTermCriteria = computed(() => {
  // Filtere selectedCriteriaOrder um nur die Kriterien zu zeigen,
  // die vom aktuellen Termin stammen (nicht die historischen)
  return sortedCriteriaOrder.value.filter(criteriaId => {
    const appointment = criteriaAppointments.value[criteriaId]
    // Zeige nur wenn es das aktuelle Appointment ist
    return appointment?.appointment_id === props.appointment?.id
  })
})

// Methods
const closeModal = () => {
  logger.debug('🔥 EvaluationModal - closing modal')
  emit('close')
}

// ✅ NEU: Funktion um Cancel-Modal zu öffnen
const openCancelModal = () => {
  logger.debug('🔥 EvaluationModal - opening cancel modal for appointment:', props.appointment?.id)
  emit('cancel', props.appointment)
}

// KOMPLETT SAUBERE VERSION - Ersetzen Sie Ihre gesamte loadAllCriteria Funktion mit dieser:

const loadAllCriteria = async () => {
  if (!props.studentCategory) {
    return
  }
  
  isLoading.value = true
  error.value = null
  
  try {
    // Check if it's a theory lesson
    const isTheoryLesson = props.appointment?.appointment_type === 'theory' || props.appointment?.event_type_code === 'theory'
    
    logger.debug('📚 Loading evaluation criteria via Backend API - isTheory:', isTheoryLesson)
    
    // Load criteria via backend API (uses auth token automatically)
    const response = await $fetch<{ success: boolean, criteria: any[], tenantId: string, error?: string }>('/api/staff/get-evaluation-criteria', {
      query: {
        isTheoryLesson: isTheoryLesson.toString(),
        studentCategory: props.studentCategory || ''
      }
    })
    
    if (!response.success) {
      throw new Error(response.error || 'Fehler beim Laden der Bewertungskriterien')
    }
    
    const criteria = response.criteria || []
    const tenantIdFromResponse = response.tenantId
    
    logger.debug('✅ Loaded', criteria.length, 'evaluation criteria')
    
    // DEBUG: Analyse der Kriterien
    const beIncluded = criteria.filter((c: any) => !c.driving_categories || c.driving_categories.length === 0 || c.driving_categories.includes('BE'))
    const beExcluded = criteria.filter((c: any) => c.driving_categories && c.driving_categories.length > 0 && !c.driving_categories.includes('BE'))
    
    logger.debug(`🔍 ANALYSIS: ${beIncluded.length} will be shown for BE, ${beExcluded.length} will be hidden`)
    logger.debug('🔍 CHECKING FOR RAMPEFAHREN AND SPURVERSATZ:')
    const rampefahren = criteria.find((c: any) => c.name === 'Rampefahren')
    const spurversatz = criteria.find((c: any) => c.name === 'Spurversatz')
    logger.debug('  Rampefahren:', rampefahren ? '✅ FOUND' : '❌ NOT FOUND', rampefahren)
    logger.debug('  Spurversatz:', spurversatz ? '✅ FOUND' : '❌ NOT FOUND', spurversatz)
    logger.debug('🚫 HIDDEN (not for BE):', beExcluded.map(c => `${c.name} [${(c.driving_categories || []).join(',')}]`))
    
    if (!criteria || criteria.length === 0) {
      const categoryType = isTheoryLesson ? 'Theorie' : props.studentCategory
      error.value = `Keine Bewertungskriterien gefunden für ${categoryType}`
      return
    }

    // Extrahiere alle Kategorie-IDs
    const categoryIds = [...new Set(criteria.map(c => c.category_id).filter(Boolean))]

    // Hole evaluation_categories (filtered by tenant)
    // Now using /api/admin/evaluation endpoint
    
    let categories: any[] = []
    try {
      // Nutze tenant_id aus der API Response (bereits authentifiziert)
      const tenantId = tenantIdFromResponse || props.appointment?.tenant_id || currentTenant.value?.id
      
      logger.debug('🔍 Loading categories with tenant_id:', tenantId)
      
      // Nur API aufrufen, wenn wir eine tenant_id haben
      if (tenantId) {
        const response = await $fetch('/api/admin/evaluation', {
          method: 'POST',
          body: {
            action: 'get-evaluation-categories',
            tenant_id: tenantId
          }
        }) as any
        
        if (response?.success) {
          categories = (response.data || []).filter((cat: any) => categoryIds.includes(cat.id))
          logger.debug('✅ Loaded', categories.length, 'categories from API')
        }
      } else {
        logger.warn('⚠️ No tenant_id found, skipping category API call')
      }
    } catch (err) {
      logger.warn('⚠️ Could not load categories via API, using defaults', err)
    }

    // Kombiniere alle Daten
    logger.debug('🔍 PRE-FILTER: Processing', criteria.length, 'raw criteria from API')
    
    const processedCriteria = criteria.map(criterion => {
      const category = categories?.find(cat => cat.id === criterion.category_id)
      
      return {
        id: criterion.id || '',
        name: criterion.name || '',
        description: criterion.description || '',
        short_code: '', // Nicht mehr in der neuen Struktur vorhanden
        category_name: category?.name || '',
        category_color: category?.color || '#gray',
        evaluation_categories: criterion.evaluation_categories || { name: category?.name || 'Unbekannte Kategorie' },
        category_order: category?.display_order ?? 999,
        criteria_order: criterion.display_order || 0,
        is_required: false,
        min_rating: 1,
        max_rating: 6,
        driving_categories: criterion.driving_categories || [],
        tenant_id: (criterion.evaluation_categories as any)?.[0]?.tenant_id ?? null
      }
    })
    
    logger.debug('🔍 POST-MAP: After mapping', processedCriteria.length, 'criteria')
    
    const filtered = processedCriteria.filter(item => {
      if (!item.name) {
        logger.debug(`⚠️ FILTERED OUT - no name: id=${item.id} driving_categories=${JSON.stringify(item.driving_categories)}`)
        return false
      }
      return true
    })
    
    logger.debug('🔍 POST-FILTER: After name filter', filtered.length, 'criteria')
    logger.debug('🔍 DROPPED:', processedCriteria.length - filtered.length, 'criteria')
    
    // Deduplicate by name+category_name: prefer tenant-specific over global (tenant_id = null)
    const deduped = Object.values(
      filtered.reduce((acc: Record<string, any>, c: any) => {
        const key = `${c.name}__${c.category_name}`
        const existing = acc[key]
        if (!existing) {
          acc[key] = c
        } else {
          // Prefer the tenant-specific one (has tenant_id) over global (no tenant_id)
          if (!existing.tenant_id && c.tenant_id) {
            acc[key] = c
          }
        }
        return acc
      }, {})
    )
    
    allCriteria.value = (deduped as any[]).sort((a, b) => {
      if (a.category_order !== b.category_order) {
        return a.category_order - b.category_order
      }
      return a.criteria_order - b.criteria_order
    })

    logger.debug('✅ Loaded criteria with new system:', allCriteria.value.length, 'criteria (after filtering out items with no name)')

  } catch (err: any) {
    console.error('❌ Error loading criteria:', err)
    error.value = err.message || 'Fehler beim Laden der Bewertungskriterien'
  } finally {
    isLoading.value = false
  }
}

// Beim Hinzufügen neuer Kriterien das aktuelle Appointment setzen
const selectCriteria = (criteria: any) => {
  // Prüfe ob das Kriterium bereits in selectedCriteriaOrder ist
  if (selectedCriteriaOrder.value.includes(criteria.id)) {
    searchQuery.value = ''
    showDropdown.value = false
    return
  }
  
  selectedCriteriaOrder.value.unshift(criteria.id)
  if (!newlyRatedCriteria.value.includes(criteria.id)) {
    newlyRatedCriteria.value.push(criteria.id) // Mark as newly rated in this session
  }
  
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
  
  // ✅ NEU: Wenn dieses Kriterium bereits historische Bewertungen hat, 
  // aber noch nicht in allCriteriaRatings, kopiere die aktuelle Bewertung hin
  if (criteriaRatings.value[criteria.id] && !allCriteriaRatings.value[criteria.id]) {
    allCriteriaRatings.value[criteria.id] = [criteriaRatings.value[criteria.id]]
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
  const newIndex = newlyRatedCriteria.value.indexOf(criteriaId)
  if (newIndex > -1) {
    newlyRatedCriteria.value.splice(newIndex, 1)
  }
}

const getCriteriaById = (criteriaId: string) => {
  return allCriteria.value.find(c => c.id === criteriaId)
}

const setCriteriaRating = (criteriaId: string, rating: number) => {
  const oldRating = criteriaRatings.value[criteriaId]
  criteriaRatings.value[criteriaId] = rating
  
  // Track this criteria as "edited this session" if rating changed
  if (oldRating !== rating && !newlyRatedCriteria.value.includes(criteriaId)) {
    newlyRatedCriteria.value.push(criteriaId)
    logger.debug(`📝 Criteria ${criteriaId} marked as edited (rating: ${oldRating} → ${rating})`)
  }
}

const getCriteriaRating = (criteriaId: string) => {
  return criteriaRatings.value[criteriaId] || 0 // Rückgabe 0, falls nicht gesetzt
}

const getRatingColorClass = (rating: number, selected = false) => {
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
  logger.debug('🔥 EvaluationModal - saveEvaluation called')
  
  if (!isValid.value || !props.appointment?.id) {
    logger.debug('❌ Validation failed or no appointment ID')
    error.value = missingRequiredRatings.value.length > 0
      ? `Bitte bewerten Sie alle ausgewählten Kriterien: ${missingRequiredRatings.value.join(', ')}`
      : 'Bitte wählen Sie mindestens ein Kriterium und bewerten Sie es.';
    return;
  }
  
  isSaving.value = true
  error.value = null
  
  try {
    // Load previous appointment evaluations via API
    const prevResponse = await $fetch('/api/staff/evaluation-history', {
      method: 'POST',
      body: {
        action: 'get-previous',
        appointment_id: props.appointment.id,
        user_id: props.appointment.user_id,
        student_category: props.studentCategory
      }
    }) as any

    const existingEvalMap: Record<string, any> = {}
    if (prevResponse?.data?.evaluations) {
      prevResponse.data.evaluations.forEach((note: any) => {
        existingEvalMap[note.evaluation_criteria_id] = {
          rating: note.criteria_rating,
          note: note.criteria_note || ''
        }
      })
    }
    
    // Filter to save only criteria that were ACTIVELY added/changed in this session
    // This prevents re-saving old evaluations from history when opening a new appointment
    const evaluationsToSave: CriteriaEvaluationData[] = selectedCriteriaOrder.value
      .filter(criteriaId => {
        const currentRating = criteriaRatings.value[criteriaId]
        const currentNote = criteriaNotes.value[criteriaId] || ''
        const existingEval = existingEvalMap[criteriaId]
        
        // IMPORTANT: Only save if the criteria was actively selected in this session
        // This is tracked in newlyRatedCriteria when user clicks on a criteria
        const wasNewlyRatedThisSession = newlyRatedCriteria.value.includes(criteriaId)
        
        // If not newly rated this session, check if it was changed from its current value
        // (in case user is editing an existing evaluation for this appointment)
        if (!wasNewlyRatedThisSession) {
          // Check if this criteria already has a saved evaluation for THIS appointment
          // If so, we should save changes. If not, skip (it's from history).
          const criteriaAppointment = criteriaAppointments.value[criteriaId]
          const isFromCurrentAppointment = criteriaAppointment?.appointment_id === props.appointment?.id
          
          if (!isFromCurrentAppointment) {
            logger.debug(`⏭️ SKIPPING criteria ${criteriaId} - from history, not edited this session`)
            return false
          }
        }
        
        // Save if:
        // 1. No previous eval (new evaluation)
        // 2. Was newly rated in this session (even if same value as before)
        // 3. Rating or note changed
        if (!existingEval) {
          logger.debug(`✨ NEW evaluation for criteria ${criteriaId}: rating=${currentRating}`)
          return true
        }
        
        // If criteria was newly added/selected in this session, always save (even if values are same)
        if (wasNewlyRatedThisSession) {
          logger.debug(`🆕 NEWLY RATED evaluation for criteria ${criteriaId} (even if same value): rating=${currentRating}`)
          return true
        }
        
        const ratingChanged = existingEval.rating !== currentRating
        const noteChanged = existingEval.note !== currentNote
        
        if (ratingChanged || noteChanged) {
          logger.debug(`🔄 CHANGED evaluation for criteria ${criteriaId}: ${existingEval.rating}→${currentRating}`)
          return true
        }
        
        logger.debug(`⏭️ UNCHANGED evaluation for criteria ${criteriaId}, skipping save`)
        return false
      })
      .map(criteriaId => {
        return {
          criteria_id: criteriaId,
          rating: criteriaRatings.value[criteriaId],
          note: criteriaNotes.value[criteriaId] || ''
        }
      })
    
    logger.debug(`🔥 Saving ${evaluationsToSave.length} changed/new criteria (out of ${selectedCriteriaOrder.value.length} selected)`)

    if (evaluationsToSave.length === 0) {
      logger.debug('ℹ️ No changes detected, nothing to save')
      emit('saved', props.appointment.id)
      return
    }

    logger.debug('🔥 EvaluationModal - calling saveCriteriaEvaluations with:', {
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

    logger.debug('✅ EvaluationModal - evaluations saved successfully via composable')
    
    // Emit saved event
    emit('saved', props.appointment.id)
    
  } catch (err: any) {
    console.error('❌ EvaluationModal - error saving evaluation:', err)
    error.value = err.message || 'Fehler beim Speichern der Bewertung'
  } finally {
    isSaving.value = false
  }
}
// NEU: Lade Bewertungen für den AKTUELLEN Termin
const loadCurrentAppointmentEvaluations = async () => {
  logger.debug('🔍 Loading evaluations for current appointment:', props.appointment?.id)
  
  if (!props.appointment?.id) {
    logger.debug('❌ No appointment ID')
    return false
  }

  try {
    // Load current appointment evaluations via API
    const response = await $fetch('/api/staff/evaluation-history', {
      method: 'POST',
      body: {
        action: 'get-current',
        appointment_id: props.appointment.id,
        user_id: props.appointment.user_id,
        student_category: props.studentCategory
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to load evaluations')
    }

    const currentNotes = response.data?.evaluations || []
    logger.debug('✅ Found', currentNotes.length, 'evaluations for current appointment')

    if (currentNotes.length > 0) {
      originalNotes.value = {}
      allCriteriaRatings.value = {} // ✅ Reset für neue Daten
      
      currentNotes.forEach((note: any) => {
        const criteriaId = note.evaluation_criteria_id
        criteriaRatings.value[criteriaId] = note.criteria_rating || 0
        criteriaNotes.value[criteriaId] = note.criteria_note || ''
        originalNotes.value[criteriaId] = note.criteria_note || ''
        
        // ✅ NEU: Speichere aktuelle Bewertung in allCriteriaRatings
        if (!allCriteriaRatings.value[criteriaId]) {
          allCriteriaRatings.value[criteriaId] = []
        }
        if (note.criteria_rating) {
          allCriteriaRatings.value[criteriaId].push(note.criteria_rating)
        }
        
        criteriaAppointments.value[criteriaId] = {
          appointment_id: props.appointment?.id,
          start_time: props.appointment?.start_time
        }
        
        // ✅ WICHTIG: Nicht automatisch zu selectedCriteriaOrder hinzufügen!
        // Der User muss das Kriterium explizit im Dropdown anklicken
        // if (!selectedCriteriaOrder.value.includes(criteriaId)) {
        //   selectedCriteriaOrder.value.push(criteriaId)
        // }
      })
      return true
    }

    return false
  } catch (err) {
    console.error('❌ Error in loadCurrentAppointmentEvaluations:', err)
    return false
  }
}

const loadStudentEvaluationHistory = async () => {
  logger.debug('🔍 DEBUG: Loading student evaluation history')
  logger.debug('🔍 DEBUG: student ID:', props.appointment?.user_id)
  logger.debug('🔍 DEBUG: current category:', props.studentCategory)
  
  if (!props.appointment?.user_id) {
    logger.debug('❌ No student ID')
    return
  }

  try {
    // Load evaluation history via API
    const response = await $fetch('/api/staff/evaluation-history', {
      method: 'POST',
      body: {
        action: 'get-history',
        appointment_id: props.appointment.id,
        user_id: props.appointment.user_id,
        student_category: props.studentCategory
      }
    }) as any

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to load history')
    }

    const evaluations = response.data?.evaluations || []
    const appointmentDateMap = response.data?.appointmentDateMap || {}

    logger.debug('🔍 DEBUG: loaded historical criteria:', evaluations.length)

    // Sort by lesson date (newest first)
    const sortedByLessonDate = evaluations
      .sort((a: any, b: any) => {
        const dateA = a.lesson_date
        const dateB = b.lesson_date
        if (!dateA || !dateB) return 0
        return new Date(dateB).getTime() - new Date(dateA).getTime()
      })
      .map((e: any) => e.evaluation_criteria_id)

    // ✅ NICHT zu selectedCriteriaOrder hinzufügen! Historische Daten nur für Dropdown-Farben
    // selectedCriteriaOrder.value = sortedByLessonDate

    // Setup data for dropdown display only
    allCriteriaRatings.value = {}
    
    evaluations.forEach((note: any) => {
      const criteriaId = note.evaluation_criteria_id
      criteriaRatings.value[criteriaId] = note.criteria_rating || 0
      criteriaNotes.value[criteriaId] = note.criteria_note || ''
      
      // Sammle ALLE Bewertungen für dieses Kriterium (für Dropdown-Anzeige)
      if (!allCriteriaRatings.value[criteriaId]) {
        allCriteriaRatings.value[criteriaId] = []
      }
      if (note.criteria_rating && !allCriteriaRatings.value[criteriaId].includes(note.criteria_rating)) {
        allCriteriaRatings.value[criteriaId].push(note.criteria_rating)
      }
      
      criteriaAppointments.value[criteriaId] = {
        appointment_id: note.appointment_id,
        start_time: note.lesson_date
      }
    })

    logger.debug('🔍 DEBUG: lesson dates saved:', criteriaAppointments.value)

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

// Track note changes to mark criteria as edited
const originalNotes = ref<Record<string, string>>({})

watch(criteriaNotes, (newNotes) => {
  // Check each note for changes
  Object.keys(newNotes).forEach(criteriaId => {
    const originalNote = originalNotes.value[criteriaId] || ''
    const currentNote = newNotes[criteriaId] || ''
    
    // If note changed and not already tracked
    if (originalNote !== currentNote && !newlyRatedCriteria.value.includes(criteriaId)) {
      newlyRatedCriteria.value.push(criteriaId)
      logger.debug(`📝 Criteria ${criteriaId} marked as edited (note changed)`)
    }
  })
}, { deep: true })

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
    logger.debug('🔄 EvaluationModal - loading data...')
    // Kleine Verzögerung um sicherzustellen dass alle Props gesetzt sind
    nextTick(async () => {
      await loadAllCriteria()
      
      // Versuche zuerst die Bewertungen für den aktuellen Termin zu laden
      const hasCurrentEvaluations = await loadCurrentAppointmentEvaluations()
      
      // Wenn keine aktuellen Bewertungen vorhanden sind, lade die Historie
      if (!hasCurrentEvaluations) {
        logger.debug('📚 No current evaluations found, loading history...')
        await loadStudentEvaluationHistory()
      } else {
        logger.debug('✅ Current evaluations loaded, skipping history')
      }
    })
  } else {
    logger.debug('🔥 EvaluationModal - resetting form...')
    // Reset form
    searchQuery.value = ''
    showDropdown.value = false
    selectedCriteriaOrder.value = []
    criteriaRatings.value = {}
    criteriaNotes.value = {}
    originalNotes.value = {} // Reset original notes tracking
    error.value = null
    criteriaTimestamps.value = {}
    newlyRatedCriteria.value = [] // Clear tracking
    allCriteriaRatings.value = {} // ✅ NEU: Reset rating history
    

    

    
    // Clean up event listeners
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleEscapeKey)
  }
}, { immediate: true })

// Zusätzlicher Watch für studentCategory
watch(() => props.studentCategory, (newCategory) => {
  logger.debug('🔄 Student category changed to:', newCategory)
  if (props.isOpen && newCategory) {
    logger.debug('🔄 Reloading criteria for new category...')
    loadAllCriteria()
  }
}, { immediate: true })

// ✅ NEU: Watch für Appointment-Wechsel um State zu clearen
watch(() => props.appointment?.id, (newAppointmentId) => {
  if (newAppointmentId && props.isOpen) {
    logger.debug('🔄 Appointment changed to:', newAppointmentId)
    logger.debug('🔄 Clearing selectedCriteriaOrder and criteriaAppointments')
    selectedCriteriaOrder.value = []
    criteriaRatings.value = {}
    criteriaNotes.value = {}
    criteriaAppointments.value = {}
    allCriteriaRatings.value = {}
    originalNotes.value = {}
    newlyRatedCriteria.value = []
  }
}, { immediate: true })

// ✅ NEU: Helper Funktionen für Rating-Farben
const allRatings = ref<any[]>([])

const getRatingColor = (ratingValue: number): string => {
  const rating = allRatings.value.find((r: any) => r.rating === ratingValue)
  return rating?.color || '#999999'
}

const getRatingLabel = (ratingValue: number): string => {
  const rating = allRatings.value.find((r: any) => r.rating === ratingValue)
  return rating?.label || 'Unbekannt'
}

// ✅ NEU: Funktion um alle Bewertungen für ein Kriterium zu bekommen
const getAllRatingsForCriteria = (criteriaId: string): number[] => {
  return allCriteriaRatings.value[criteriaId] || []
}

onMounted(async () => {
  try {
    const tenantId = currentTenant.value?.id || props.appointment?.tenant_id
    if (!tenantId) {
      logger.warn('⚠️ No tenant ID available for loading ratings')
      return
    }
    
    const response = await $fetch('/api/staff/get-rating-points', {
      method: 'POST',
      body: { tenantId }
    }) as any
    
    if (response?.success) {
      allRatings.value = response.data || []
      logger.debug('✅ Ratings loaded:', allRatings.value.length)
    } else {
      logger.warn('⚠️ Failed to load ratings:', response?.error)
    }
  } catch (err) {
    logger.warn('⚠️ Failed to load ratings:', err)
  }
})
</script>

<style scoped>
/* iOS Safari Fix: Use dynamic viewport height */
.evaluation-modal-container {
  max-height: 95vh;
  max-height: 95dvh; /* Dynamic viewport height for iOS */
  overflow: hidden;
}

/* Ensure content area is scrollable */
.evaluation-modal-content {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
}

/* Footer with Safe Area padding for iOS notch/home indicator */
.evaluation-modal-footer {
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
  padding-bottom: calc(0.75rem + constant(safe-area-inset-bottom)); /* Fallback for older iOS */
}

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

/* Mobile optimization for iOS */
@media (max-width: 640px) {
  .evaluation-modal-container {
    max-height: 95vh;
    max-height: 95dvh; /* Full height on mobile */
  }
}

/* Fallback for browsers that don't support dvh */
@supports not (height: 1dvh) {
  .evaluation-modal-container {
    max-height: 95vh;
  }
  
  @media (max-width: 640px) {
    .evaluation-modal-container {
      max-height: 95vh; /* Full height on mobile */
    }
  }
}
</style>

