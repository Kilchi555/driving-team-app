<!-- components/ExamResultModal.vue -->
<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 z-[10000]">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[95vh] overflow-hidden flex flex-col">
      
      <!-- Header -->
      <div class="text-white px-6 py-4 flex-shrink-0" :style="{ backgroundColor: primaryColor || '#2563eb' }">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold">Prüfungsergebnis eintragen</h3>
          </div>
          <button @click="$emit('close')" class="text-white hover:opacity-80 transition-opacity">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">



        <!-- Experte auswählen -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Experte (optional)</label>
          
          <div class="flex space-x-2">
            <div class="flex-1 relative">
              <!-- Suchfeld -->
              <input 
                v-model="examinerSearch" 
                type="text" 
                placeholder="Experten suchen..." 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 transition-all"
                :style="{ '--tw-ring-color': primaryColor || '#2563eb' }"
                @focus="showExaminerDropdown = true"
                @input="showExaminerDropdown = true"
                @blur="showExaminerDropdown = false"
              >
              
              <!-- Dropdown mit gefilterten Experten -->
              <div v-if="showExaminerDropdown" class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[10001] max-h-60 overflow-y-auto">
                <div v-if="filteredExaminers.length > 0">
                  <div 
                    v-for="examiner in filteredExaminers" 
                    :key="examiner.id"
                    @mousedown.prevent="selectExaminer(examiner)"
                    :class="[
                      'px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0',
                      examResult.examiner_id === examiner.id 
                        ? 'text-white' 
                        : 'hover:bg-gray-50'
                    ]"
                    :style="examResult.examiner_id === examiner.id ? { backgroundColor: primaryColor || '#2563eb' } : {}"
                  >
                    <div class="font-medium text-gray-700">
                      {{ (examiner.first_name ? examiner.first_name + ' ' : '') + (examiner.last_name || '') }}
                    </div>
                  </div>
                </div>
                <div v-else class="px-3 py-4 text-center text-gray-500">
                  <div v-if="examinerSearch.trim()">
                    Keine Experten gefunden für "{{ examinerSearch }}"
                  </div>
                  <div v-else>
                    Keine Experten verfügbar
                  </div>
                </div>
              </div>
              
              <!-- Ausgewählter Experte (grünes Feld mit Entfernen) -->
              <div v-if="selectedExaminerName" class="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
                <div>
                  <div class="font-medium text-green-800">{{ selectedExaminerName }}</div>
                </div>
                <button 
                  type="button"
                  @click="clearSelectedExaminer"
                  class="ml-3 p-1 rounded-full text-red-600 hover:bg-red-100"
                  aria-label="Auswahl entfernen"
                  title="Auswahl entfernen"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <button 
              @click="showAddExaminerModal = true" 
              class="px-3 py-2 text-white rounded-md hover:opacity-90 transition-opacity h-10 shrink-0"
              :style="{ backgroundColor: primaryColor || '#2563eb' }"
              title="Neuen Experten hinzufügen"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Bestanden? -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Ergebnis *</label>
          <div class="flex space-x-3">
            <button 
              @click="examResult.passed = true"
              :class="[
                'flex-1 px-2 py-2 rounded-lg border-2 font-medium transition-all duration-200 flex items-center justify-center space-x-2',
                examResult.passed === true
                  ? 'bg-green-100 border-green-500 text-green-700 shadow-md scale-105'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-green-400 hover:bg-green-50'
              ]"
            >
              <span>Bestanden</span>
            </button>
            
            <button 
              @click="examResult.passed = false"
              :class="[
                'flex-1 px-2 py-2 rounded-lg border-2 font-medium transition-all duration-200 flex items-center justify-center space-x-2',
                examResult.passed === false
                  ? 'bg-red-100 border-red-500 text-red-700 shadow-md scale-105'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-red-400 hover:bg-red-50'
              ]"
            >
              <span>Nicht bestanden</span>
            </button>
          </div>
        </div>

        <!-- Experten-Verhalten bewerten -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Experten-Verhalten</label>
          <div class="space-y-3">
            <!-- Bewertung 1-6 -->
            <div class="space-y-2">
              <span class="text-sm text-gray-600">Bewertung:</span>
              <div class="flex space-x-1">
                <button 
                  v-for="rating in 6" 
                  :key="rating"
                  @click="setRating(rating)"
                  :class="[
                    'w-10 h-10 rounded-full text-sm font-semibold transition-all',
                    examResult.examiner_behavior_rating === rating
                      ? getRatingColor(rating, true)
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  ]"
                >
                  {{ rating }}
                </button>
              </div>
              <p class="text-xs text-gray-500">
                {{ examResult.examiner_behavior_rating ? getRatingText(examResult.examiner_behavior_rating) : 'Bitte bewerten' }}
              </p>
            </div>
            
            <!-- Bewertungskommentare -->
            <div>
              <label class="block text-xs text-gray-600 mb-1">Kommentar zum Experten-Verhalten</label>
              <textarea 
                v-model="examResult.examiner_behavior_notes" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 transition-all" 
                :style="{ '--tw-ring-color': primaryColor || '#2563eb' }"
                rows="3"
                placeholder="Wie war das Verhalten des Experten? Fair, freundlich, professionell?"
                required
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Validierung -->
        <div v-if="validationErrors.length > 0" class="bg-red-50 border border-red-200 rounded-md p-4">
          <h4 class="text-sm font-medium text-red-800 mb-2">Bitte korrigieren Sie folgende Fehler:</h4>
          <ul class="text-sm text-red-700 space-y-1">
            <li v-for="error in validationErrors" :key="error">• {{ error }}</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
        <button @click="$emit('close')" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
          Abbrechen
        </button>
        <button 
          @click="saveExamResult" 
          :disabled="isSaving"
          class="px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          :style="{ backgroundColor: primaryColor || '#2563eb' }"
        >
          <span v-if="isSaving" class="flex items-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Speichern...
          </span>
          <span v-else>Speichern</span>
        </button>
      </div>
    </div>

    <!-- Add Examiner Modal -->
    <div v-if="showAddExaminerModal" class="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-700">Neuen Experten hinzufügen</h3>
        </div>
        
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Vorname (optional)</label>
            <input v-model="newExaminer.first_name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 transition-all" :style="{ '--tw-ring-color': primaryColor || '#2563eb' }">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
            <input v-model="newExaminer.last_name" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 transition-all" :style="{ '--tw-ring-color': primaryColor || '#2563eb' }" required>
          </div>
        </div>
        
        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button @click="showAddExaminerModal = false" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">
            Abbrechen
          </button>
          <button @click="addExaminer" class="px-4 py-2 text-white rounded-md hover:opacity-90 transition-opacity" :style="{ backgroundColor: primaryColor || '#2563eb' }">
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { useTenantBranding } from '~/composables/useTenantBranding'

// Props
interface Props {
  isVisible: boolean
  appointment: any
  currentUser: any
}

const props = defineProps<Props>()

// ✅ Get current user from composable (has tenant_id)
const { currentUser: authUser, fetchCurrentUser } = useCurrentUser()

// ✅ Get tenant branding colors
const { primaryColor } = useTenantBranding()

// Emits
const emit = defineEmits<{
  close: []
  'exam-result-saved': [appointmentId: string]
}>()

// State
const isSaving = ref(false)
const showAddExaminerModal = ref(false)
const availableExaminers = ref<any[]>([])
const validationErrors = ref<string[]>([])

// Suchbare Expertenauswahl
const examinerSearch = ref('')
const showExaminerDropdown = ref(false)
const selectedExaminerName = ref('')

// Exam Result Form
const examResult = ref({
  examiner_id: '',
  passed: null as boolean | null,
  examiner_behavior_rating: 1,
  examiner_behavior_notes: ''
})

// New Examiner Form
const newExaminer = ref({
  first_name: '',
  last_name: ''
})

// Computed
const isFormValid = computed(() => {
  return examResult.value.passed !== null &&
         examResult.value.examiner_behavior_rating > 0
})

// Gefilterte Experten basierend auf der Suche
const filteredExaminers = computed(() => {
  if (!examinerSearch.value.trim()) {
    return availableExaminers.value
  }
  
  const searchTerm = examinerSearch.value.toLowerCase()
  return availableExaminers.value.filter(examiner => {
    const fullName = `${examiner.first_name || ''} ${examiner.last_name || ''}`.toLowerCase()
    return fullName.includes(searchTerm)
  })
})

// Methods
const loadExaminers = async () => {
  try {
    logger.debug('🔍 Loading examiners from backend API')
    
    const response = await $fetch('/api/examiners/list') as any
    
    if (response?.data) {
      logger.debug('✅ Examiners loaded:', response.data.length)
      availableExaminers.value = response.data
    } else {
      logger.debug('⚠️ No examiners found')
      availableExaminers.value = []
    }
    
  } catch (err: any) {
    console.error('❌ Error loading examiners:', err)
    logger.error('❌ Error loading examiners:', err.message)
  }
}

// Experten aus Dropdown auswählen
const selectExaminer = (examiner: any) => {
  examResult.value.examiner_id = examiner.id
  selectedExaminerName.value = `${examiner.first_name || ''} ${examiner.last_name || ''}`.trim()
  examinerSearch.value = ''
  showExaminerDropdown.value = false
}

// Bewertung setzen mit Logging
const setRating = (rating: number) => {
  logger.debug('🔥 Setting rating:', rating, 'Current value:', examResult.value.examiner_behavior_rating)
  examResult.value.examiner_behavior_rating = rating
  logger.debug('🔥 Rating set to:', examResult.value.examiner_behavior_rating)
}

// Auswahl löschen
const clearSelectedExaminer = () => {
  examResult.value.examiner_id = ''
  selectedExaminerName.value = ''
  examinerSearch.value = ''
  showExaminerDropdown.value = false
}

const addExaminer = async () => {
  try {
    if (!newExaminer.value.last_name) {
      alert('Bitte geben Sie den Nachnamen ein.')
      return
    }

    logger.debug('📝 Creating new examiner via API:', {
      first_name: newExaminer.value.first_name,
      last_name: newExaminer.value.last_name
    })

    // ✅ Use secure backend API instead of direct Supabase insert
    const response = await $fetch('/api/examiners/create', {
      method: 'POST',
      body: {
        first_name: newExaminer.value.first_name.trim(),
        last_name: newExaminer.value.last_name.trim()
      }
    }) as any

    if (!response?.data?.id) {
      throw new Error('Invalid response from server')
    }

    const newExaminerData = response.data

    // Reset form
    newExaminer.value = {
      first_name: '',
      last_name: ''
    }

    // Close modal and reload examiners
    showAddExaminerModal.value = false
    await loadExaminers()

    // Auto-select the new examiner
    examResult.value.examiner_id = newExaminerData.id
    
    // Update the visual display with the new examiner's name
    selectedExaminerName.value = `${newExaminerData.first_name || ''} ${newExaminerData.last_name || ''}`.trim()

    logger.debug('✅ New examiner added via API and auto-selected:', newExaminerData)

  } catch (err: any) {
    console.error('❌ Error adding examiner:', err)
    logger.error('❌ Error adding examiner:', err.message)
    alert(`Fehler beim Hinzufügen des Experten: ${err.message || 'Unknown error'}`)
  }
}

const validateForm = () => {
  validationErrors.value = []
  
  if (examResult.value.passed === null) {
    validationErrors.value.push('Bitte wählen Sie das Prüfungsergebnis aus.')
  }
  
  // Experte ist optional - wenn keiner ausgewählt, wird "Experte unbekannt" gespeichert
  // if (!examResult.value.examiner_id) {
  //   validationErrors.value.push('Bitte wählen Sie einen Experten aus.')
  // }
  
  if (!examResult.value.examiner_behavior_rating || examResult.value.examiner_behavior_rating < 1 || examResult.value.examiner_behavior_rating > 6) {
    validationErrors.value.push('Bitte bewerten Sie das Experten-Verhalten (1-6).')
  }
  
  // Kommentare zum Experten-Verhalten sind optional
  // if (!examResult.value.examiner_behavior_notes.trim()) {
  //   validationErrors.value.push('Bitte geben Sie Kommentare zum Experten-Verhalten ein.')
  // }
  
  return validationErrors.value.length === 0
}

const saveExamResult = async () => {
  logger.debug('🔥 saveExamResult called')
  logger.debug('🔥 Current examResult:', examResult.value)
  
  if (!validateForm()) {
    logger.debug('❌ Validation failed')
    return
  }
  
  logger.debug('✅ Validation passed, starting to save...')
  isSaving.value = true
  
  try {
    const examData = {
      appointment_id: props.appointment.id,
      examiner_id: examResult.value.examiner_id || null,
      passed: examResult.value.passed,
      examiner_behavior_rating: examResult.value.examiner_behavior_rating,
      examiner_behavior_notes: examResult.value.examiner_behavior_notes || null,
      exam_date: props.appointment.start_time
    }
    
    logger.debug('🔥 Sending exam result to backend:', examData)
    
    // Call secure backend API
    const response = await $fetch('/api/exams/save-result', {
      method: 'POST',
      body: examData
    }) as any
    
    if (response?.data) {
      logger.debug('✅ Exam result saved:', response.data)
      
      // Emit success
      emit('exam-result-saved', props.appointment.id)
      logger.debug('✅ Success event emitted')
    } else {
      throw new Error('Invalid response from server')
    }

  } catch (err: any) {
    console.error('❌ Error saving exam result:', err)
    logger.error('❌ Error saving exam result:', err.message)
    alert(`Fehler beim Speichern: ${err.message || 'Unknown error'}`)
  } finally {
    isSaving.value = false
    logger.debug('🔥 saveExamResult finished')
  }
}

const getRatingColor = (rating: number | null, selected = false) => {
  if (!rating) return selected ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-700'
  
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
  if (!rating) return 'Bitte bewerten'
  
  const texts = {
    1: 'Sehr schlecht',
    2: 'Schlecht',
    3: 'Unbefriedigend',
    4: 'Befriedigend',
    5: 'Gut',
    6: 'Sehr gut'
  }
  return texts[rating as keyof typeof texts] || 'Bitte bewerten'
}

// Lifecycle
onMounted(() => {
  fetchCurrentUser()
  loadExaminers()
})

// Watch for appointment changes
watch(() => props.appointment, (newAppointment) => {
  if (newAppointment) {
    // Reset form
    examResult.value = {
      examiner_id: '',
      passed: null,
      examiner_behavior_rating: 1,
      examiner_behavior_notes: ''
    }
    validationErrors.value = []
  }
}, { immediate: true })
</script>
