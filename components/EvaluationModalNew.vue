<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] flex flex-col">
      <!-- Header -->
      <div class="bg-blue-600 text-white p-4 flex-shrink-0">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold">Bewertung - {{ props.appointment?.title }}</h2>
            <p class="text-blue-100 text-sm">
              {{ props.appointment?.start_time ? formatDateTime(props.appointment.start_time) : '' }}
            </p>
          </div>
          <button @click="closeModal" class="text-white hover:text-blue-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-hidden flex">
        <!-- Left Panel: Criteria Selection -->
        <div class="w-1/3 border-r border-gray-200 flex flex-col">
          <div class="p-4 border-b border-gray-200">
            <h3 class="font-semibold text-gray-900 mb-2">Bewertungskriterien</h3>
            
            <!-- Search -->
            <div class="relative">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Kriterien suchen..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                @focus="showDropdown = true"
              />
              
              <!-- Dropdown -->
              <div
                v-if="showDropdown && filteredCriteria.length > 0"
                class="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-50 max-h-60 overflow-y-auto"
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
                    class="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <h4 class="font-medium text-gray-900">{{ criteria.name }}</h4>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Selected Criteria List -->
          <div class="flex-1 overflow-y-auto p-4">
            <div v-if="selectedCriteriaOrder.length === 0" class="text-center text-gray-500 py-8">
              <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p>Keine Kriterien ausgewählt</p>
              <p class="text-sm">Suchen Sie nach Kriterien und wählen Sie sie aus</p>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="criteriaId in sortedSelectedCriteria"
                :key="criteriaId"
                class="bg-gray-50 rounded-lg p-3"
              >
                <div class="flex items-center justify-between mb-2">
                  <h4 class="font-medium text-gray-900">{{ getCriteriaById(criteriaId)?.name }}</h4>
                  <button
                    @click="removeCriteria(criteriaId)"
                    class="text-red-600 hover:text-red-800"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                <p class="text-sm text-gray-600">{{ getCriteriaById(criteriaId)?.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Ratings -->
        <div class="w-2/3 flex flex-col">
          <div class="p-4 border-b border-gray-200">
            <h3 class="font-semibold text-gray-900 mb-2">Bewertungen</h3>
            <p class="text-sm text-gray-600">Bewerten Sie die ausgewählten Kriterien</p>
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <div v-if="selectedCriteriaOrder.length === 0" class="text-center text-gray-500 py-8">
              <p>Wählen Sie Kriterien aus, um sie zu bewerten</p>
            </div>

            <div v-else class="space-y-6">
              <div
                v-for="criteriaId in sortedSelectedCriteria"
                :key="criteriaId"
                class="border border-gray-200 rounded-lg p-4"
              >
                <div class="mb-4">
                  <h4 class="font-semibold text-gray-900 text-lg">{{ getCriteriaById(criteriaId)?.name }}</h4>
                  <p class="text-gray-600">{{ getCriteriaById(criteriaId)?.description }}</p>
                </div>

                <!-- Rating Scale -->
                <div class="mb-4">
                  <label class="block text-sm font-medium text-gray-700 mb-2">Bewertung</label>
                  <div class="flex space-x-2">
                    <button
                      v-for="rating in evaluationScale"
                      :key="rating.rating"
                      @click="setCriteriaRating(criteriaId, rating.rating)"
                      :class="[
                        'px-4 py-2 rounded-lg font-medium transition-colors',
                        getCriteriaRating(criteriaId) === rating.rating
                          ? 'text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      ]"
                      :style="{
                        backgroundColor: getCriteriaRating(criteriaId) === rating.rating ? rating.color : 'transparent',
                        border: `2px solid ${rating.color}`
                      }"
                    >
                      {{ rating.rating }} - {{ rating.label }}
                    </button>
                  </div>
                </div>

                <!-- Notes -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Notizen</label>
                  <textarea
                    v-model="criteriaNotes[criteriaId]"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optionale Notizen zu diesem Kriterium..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-between items-center">
        <div class="text-sm text-gray-600">
          {{ selectedCriteriaOrder.length }} Kriterien ausgewählt
        </div>
        <div class="flex space-x-3">
          <button
            @click="closeModal"
            class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            @click="saveEvaluations"
            :disabled="isSaving || selectedCriteriaOrder.length === 0"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isSaving">Speichern...</span>
            <span v-else>Bewertungen speichern</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

// Props
interface Props {
  appointment: any
  studentCategory: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  close: []
  saved: []
}>()

// Supabase

// State
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)

// Search & Dropdown
const searchQuery = ref('')
const showDropdown = ref(false)
const allCriteria = ref<any[]>([])
const evaluationScale = ref<any[]>([])

// Selected Criteria
const selectedCriteriaOrder = ref<string[]>([])
const criteriaRatings = ref<Record<string, number>>({})
const criteriaNotes = ref<Record<string, string>>({})

// Computed
const filteredCriteria = computed(() => {
  const unratedCriteria = allCriteria.value.filter(criteria => 
    !selectedCriteriaOrder.value.includes(criteria.id)
  )
  
  if (!searchQuery.value || searchQuery.value.trim() === '') {
    return unratedCriteria
  }
  
  const query = searchQuery.value.toLowerCase()
  return unratedCriteria.filter(criteria => 
    criteria.name?.toLowerCase().includes(query) ||
    criteria.description?.toLowerCase().includes(query) ||
    criteria.category_name?.toLowerCase().includes(query)
  )
})

const groupedCriteria = computed(() => {
  const groups: Record<string, { order: number, criteria: any[] }> = {}
  filteredCriteria.value.forEach(criteria => {
    const categoryName = criteria.category_name || 'Sonstiges'
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
  
  return sortedGroups
})

const sortedSelectedCriteria = computed(() => {
  return [...selectedCriteriaOrder.value]
})

// Methods
const closeModal = () => {
  emit('close')
}

const loadData = async () => {
  if (!props.studentCategory) return
  
  isLoading.value = true
  error.value = null
  
  try {
    // Get current user's tenant_id FIRST
    const user = authStore.user // ✅ MIGRATED: Use auth store instead
    if (!user) throw new Error('Nicht angemeldet')

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
    if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')

    // Load evaluation categories (tenant-specific + global defaults)
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('evaluation_categories')
      .select('id, name, color, display_order, is_active, tenant_id')
      .eq('is_active', true)
      .or(`tenant_id.eq.${userProfile.tenant_id},tenant_id.is.null`)
      .order('display_order', { ascending: true })

    if (categoriesError) throw categoriesError

    // Load evaluation criteria for these categories (tenant-specific + global defaults)
    const { data: criteriaData, error: criteriaError } = await supabase
      .from('evaluation_criteria')
      .select('id, name, description, category_id, display_order, is_active')
      .eq('is_active', true)
      .in('category_id', (categoriesData || []).map(c => c.id))
      .order('category_id, display_order', { ascending: true })

    if (criteriaError) throw criteriaError

    // Build the evaluation matrix by joining categories and criteria
    const matrix = (categoriesData || []).flatMap(category => {
      const categoryName = category.name
      const categoryOrder = category.display_order
      const categoryId = category.id
      
      return (criteriaData || [])
        .filter(criteria => criteria.category_id === categoryId)
        .map(criteria => ({
          category_id: categoryId,
          category_name: categoryName,
          category_color: category.color,
          category_order: categoryOrder,
          driving_categories: [props.studentCategory], // Filter will be client-side if needed
          tenant_id: category.tenant_id,
          criteria_id: criteria.id,
          criteria_name: criteria.name,
          criteria_description: criteria.description,
          criteria_order: criteria.display_order,
          is_required: false,
          is_active: criteria.is_active
        }))
    })

    allCriteria.value = matrix

    // Load evaluation scale (filtered by tenant)
    const { data: scaleData, error: scaleError } = await supabase
      .from('evaluation_scale')
      .select('*')
      .eq('tenant_id', userProfile.tenant_id)
      .order('rating')

    if (scaleError) throw scaleError
    evaluationScale.value = scaleData || []

  } catch (err: any) {
    error.value = err.message || 'Fehler beim Laden der Daten'
  } finally {
    isLoading.value = false
  }
}

const selectCriteria = (criteria: any) => {
  if (!selectedCriteriaOrder.value.includes(criteria.id)) {
    selectedCriteriaOrder.value.unshift(criteria.id)
    
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
  return criteriaRatings.value[criteriaId] || 0
}

const saveEvaluations = async () => {
  isSaving.value = true
  
  try {
    const notesToInsert = selectedCriteriaOrder.value.map(criteriaId => ({
      appointment_id: props.appointment.id,
      evaluation_criteria_id: criteriaId,
      criteria_rating: criteriaRatings.value[criteriaId] || 0,
      criteria_note: criteriaNotes.value[criteriaId] || ''
    }))

    const { error: insertError } = await supabase
      .from('notes')
      .upsert(notesToInsert, { onConflict: 'appointment_id,evaluation_criteria_id' })

    if (insertError) throw insertError

    emit('saved')
  } catch (err: any) {
    error.value = err.message || 'Fehler beim Speichern'
  } finally {
    isSaving.value = false
  }
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('de-CH')
}

// Lifecycle
onMounted(() => {
  loadData()
})

// Watch for student category changes
watch(() => props.studentCategory, () => {
  loadData()
})
</script>
