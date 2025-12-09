<template>
  <div class="bg-white p-6 rounded-lg border border-gray-200">
    <h3 class="text-lg font-medium text-gray-900 mb-4">
      ⏱️ Lektionsdauern pro Kategorie
    </h3>
    
    <p class="text-sm text-gray-600 mb-6">
      Konfigurieren Sie für jede Fahrzeugkategorie die verfügbaren Lektionsdauern. 
      Diese werden bei der Terminbuchung zur Auswahl angezeigt.
    </p>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-32 bg-gray-200 rounded animate-pulse"></div>
    </div>

    <!-- Error state -->
    <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
      ❌ {{ error }}
    </div>

    <!-- Kategorien -->
    <div v-if="!isLoading" class="space-y-6">
      <div 
        v-for="category in availableCategories"
        :key="category.code"
        class="border border-gray-200 rounded-lg p-4"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div 
              class="w-4 h-4 rounded-full"
              :style="{ backgroundColor: category.color || '#gray' }"
            ></div>
            <h4 class="font-medium text-gray-900">
              Kategorie {{ category.code }} - {{ category.name }}
            </h4>
            <span class="text-xs text-gray-500">
              CHF {{ category.price_per_lesson }}/45min
            </span>
          </div>
        </div>

        <!-- Aktuelle Dauern für diese Kategorie -->
        <div v-if="categoryDurations[category.code]?.length > 0" class="mb-3">
          <div class="text-xs font-medium text-gray-600 mb-1">Aktuell konfiguriert:</div>
          <div class="flex flex-wrap gap-1">
            <span 
              v-for="duration in getFormattedDurations(categoryDurations[category.code])"
              :key="duration.value"
              class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
            >
              {{ duration.label }}
            </span>
          </div>
        </div>

        <!-- Verfügbare Dauern für diese Kategorie -->
        <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <label 
            v-for="duration in getAllPossibleDurations()"
            :key="`${category.code}-${duration.value}`"
            class="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors text-sm"
            :class="{
              'border-green-500 bg-green-50': isDurationSelectedForCategory(category.code, duration.value),
              'border-gray-300': !isDurationSelectedForCategory(category.code, duration.value)
            }"
          >
            <input
              type="checkbox"
              :checked="isDurationSelectedForCategory(category.code, duration.value)"
              @change="toggleDurationForCategory(category.code, duration.value)"
              class="w-3 h-3 text-green-600 border-gray-300 rounded focus:ring-green-500 mr-2"
            >
            <span class="text-xs">{{ duration.label }}</span>
          </label>
        </div>

        <!-- Info für diese Kategorie -->
        <div class="mt-2 text-xs text-gray-500">
          Standard-Lektionsdauer: {{ category.lesson_duration_minutes || 45 }}min
        </div>
      </div>
    </div>

    <!-- Save Actions -->
    <div class="mt-8 flex gap-3">
      <button
        @click="saveAllDurations"
        :disabled="isSaving"
        class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {{ isSaving ? 'Speichern...' : 'Alle Änderungen speichern' }}
      </button>
      
      <button
        @click="resetToDefaults"
        type="button"
        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        Auf Standard zurücksetzen
      </button>

      <button
        @click="createDefaultsForAll"
        type="button"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Standard-Dauern erstellen
      </button>
    </div>

    <!-- Save feedback -->
    <div v-if="saveSuccess" class="mt-3 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-600">
      ✅ Lektionsdauern erfolgreich gespeichert!
    </div>
    
    <div v-if="saveError" class="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
      ❌ {{ saveError }}
    </div>

    <!-- Statistik -->
    <div v-if="!isLoading" class="mt-6 p-3 bg-gray-50 rounded text-sm">
      <div class="font-medium text-gray-700 mb-2">Übersicht:</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div v-for="category in availableCategories" :key="category.code">
          <span class="font-medium">{{ category.code }}:</span>
          <span class="ml-1">{{ categoryDurations[category.code]?.length || 0 }} Dauern</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { ref, computed, onMounted, watch } from 'vue'
import { useStaffCategoryDurations } from '~/composables/useStaffCategoryDurations'
import { getSupabase } from '~/utils/supabase'

interface Props {
  currentUser: any
}

const props = defineProps<Props>()

// Composable verwenden
const {
  saveStaffCategoryDurations,
  loadAllStaffDurations,
  createDefaultDurations
} = useStaffCategoryDurations()

// State
const availableCategories = ref<any[]>([])
const categoryDurations = ref<Record<string, number[]>>({})
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref<string | null>(null)
const saveSuccess = ref(false)
const saveError = ref<string | null>(null)

// Alle möglichen Dauern (15min steps von 45-240)
const getAllPossibleDurations = () => {
  const durations = [45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240]
  
  return durations.map(duration => ({
    value: duration,
    label: duration >= 120 
      ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
      : `${duration}min`
  }))
}

// Helper Functions
const getFormattedDurations = (durations: number[]) => {
  return durations.map(duration => ({
    value: duration,
    label: duration >= 120 
      ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? duration % 60 + 'min' : ''}`.trim() 
      : `${duration}min`
  }))
}

const isDurationSelectedForCategory = (categoryCode: string, duration: number) => {
  return categoryDurations.value[categoryCode]?.includes(duration) || false
}

const toggleDurationForCategory = (categoryCode: string, duration: number) => {
  if (!categoryDurations.value[categoryCode]) {
    categoryDurations.value[categoryCode] = []
  }
  
  const index = categoryDurations.value[categoryCode].indexOf(duration)
  if (index > -1) {
    categoryDurations.value[categoryCode].splice(index, 1)
  } else {
    categoryDurations.value[categoryCode].push(duration)
    categoryDurations.value[categoryCode].sort((a: number, b: number) => a - b)
  }
}

// Data Loading
const loadCategories = async () => {
  logger.debug('🔥 Loading categories for staff settings')
  
  try {
    const supabase = getSupabase()
    const { data, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .order('name')

    if (fetchError) throw fetchError

    availableCategories.value = data || []
    logger.debug('✅ Categories loaded:', data?.length)
  } catch (err: any) {
    console.error('❌ Error loading categories:', err)
    error.value = err.message
  }
}

const loadCurrentDurations = async () => {
  if (!props.currentUser?.id) return

  logger.debug('🔥 Loading current staff durations')
  
  try {
    const supabase = getSupabase()
    const { data, error: fetchError } = await supabase
      .from('staff_category_durations')
      .select('category_code, duration_minutes')
      .eq('staff_id', props.currentUser.id)
      .eq('is_active', true)
      .order('category_code')
      .order('duration_minutes')

    if (fetchError) throw fetchError

    // Gruppiere Dauern nach Kategorie
    const grouped: Record<string, number[]> = {}
    data?.forEach(item => {
      if (!grouped[item.category_code]) {
        grouped[item.category_code] = []
      }
      grouped[item.category_code].push(item.duration_minutes)
    })

    categoryDurations.value = grouped
    logger.debug('✅ Current durations loaded:', grouped)
  } catch (err: any) {
    console.error('❌ Error loading current durations:', err)
    error.value = err.message
  }
}

const loadData = async () => {
  isLoading.value = true
  error.value = null

  try {
    await Promise.all([
      loadCategories(),
      loadCurrentDurations()
    ])
  } catch (err: any) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

// Save Functions
const saveAllDurations = async () => {
  if (!props.currentUser?.id) return

  isSaving.value = true
  saveError.value = null
  saveSuccess.value = false

  try {
    // Speichere für jede Kategorie die konfigurierten Dauern
    const savePromises = Object.entries(categoryDurations.value).map(([categoryCode, durations]) => {
      if (durations.length > 0) {
        return saveStaffCategoryDurations(props.currentUser.id, categoryCode, durations)
      }
      return Promise.resolve()
    })

    await Promise.all(savePromises)
    
    saveSuccess.value = true
    logger.debug('✅ All durations saved successfully')
    
    // Success message nach 3 Sekunden ausblenden
    setTimeout(() => {
      saveSuccess.value = false
    }, 3000)
    
  } catch (err: any) {
    console.error('❌ Error saving durations:', err)
    saveError.value = err.message
  } finally {
    isSaving.value = false
  }
}

const resetToDefaults = async () => {
  // Setze Standard-Dauern für alle Kategorien
  const defaults: Record<string, number[]> = {}
  availableCategories.value.forEach(category => {
    const baseDuration = category.lesson_duration_minutes || 45
    defaults[category.code] = [baseDuration]
    
    // Füge zusätzliche Standard-Dauern hinzu
    if (baseDuration === 45) {
      defaults[category.code] = [45, 90]
    } else if (baseDuration === 90) {
      defaults[category.code] = [90, 135]
    } else {
      defaults[category.code] = [baseDuration]
    }
  })
  
  categoryDurations.value = defaults
  saveError.value = null
  saveSuccess.value = false
}

const createDefaultsForAll = async () => {
  if (!props.currentUser?.id) return

  try {
    await createDefaultDurations(props.currentUser.id)
    await loadCurrentDurations() // Reload nach dem Erstellen
    saveSuccess.value = true
  } catch (err: any) {
    saveError.value = err.message
  }
}

// Watchers
watch(() => props.currentUser?.id, (newUserId) => {
  if (newUserId) {
    loadData()
  }
})

// Lifecycle
onMounted(() => {
  if (props.currentUser?.id) {
    loadData()
  }
})
</script>

<style scoped>
.transition-colors {
  transition: all 0.2s ease-in-out;
}

/* Custom checkbox styling */
input[type="checkbox"]:checked + span {
  font-weight: 500;
}
</style>