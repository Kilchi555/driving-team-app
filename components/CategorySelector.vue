<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      🚗 Kategorie
    </label>
    
    <select
      :value="modelValue"
      @change="handleCategoryChange"
      :disabled="isLoading"
      class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
    >
      <option value="">
        {{ isLoading ? 'Kategorien laden...' : 'Kategorie wählen' }}
      </option>
      <option 
        v-for="category in availableCategoriesForUser" 
        :key="category.code"
        :value="category.code"
      >
        {{ category.name }}
      </option>
    </select>

    <!-- Error State -->
    <div v-if="error" class="mt-2 text-red-600 text-sm">
      ❌ {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getSupabase } from '~/utils/supabase'

interface Category {
  id: number
  name: string
  code: string
  description?: string
  price_per_lesson: number
  lesson_duration_minutes: number
  color?: string
  is_active: boolean
  display_order: number
  price_unit: string
}

interface CategoryWithDurations extends Category {
  availableDurations: number[]
}

interface StaffCategoryDuration {
  id: string
  created_at: string
  staff_id: string
  category_code: string
  duration_minutes: number
  is_active: boolean
  display_order: number
}

interface Props {
  modelValue: string
  selectedUser?: any
  currentUser?: any
  currentUserRole?: string
  showDebugInfo?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'category-selected', category: CategoryWithDurations | null): void
  (e: 'price-changed', price: number): void
  (e: 'durations-changed', durations: number[]): void
}

const props = withDefaults(defineProps<Props>(), {
  showDebugInfo: false
})
const emit = defineEmits<Emits>()

// State
const allCategories = ref<Category[]>([])
const staffCategoryDurations = ref<StaffCategoryDuration[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

// Computed
const selectedCategory = computed(() => {
  if (!props.modelValue) return null
  return availableCategoriesForUser.value.find(cat => cat.code === props.modelValue) || null
})

const availableCategoriesForUser = computed(() => {
  let result: CategoryWithDurations[] = []
  
  // Admin kann alle Kategorien sehen
  if (props.currentUserRole === 'admin') {
    result = allCategories.value
      .filter(cat => cat.is_active)
      .map(cat => ({
        ...cat,
        availableDurations: [cat.lesson_duration_minutes] // Standard-Dauer für Admins
      }))
  }
  // Staff sieht nur seine zugewiesenen Kategorien mit seinen verfügbaren Dauern
  else if (props.currentUserRole === 'staff') {
    // Gruppiere Staff-Kategorien-Dauern nach category_code
    const groupedByCode: Record<string, number[]> = {}
    
    staffCategoryDurations.value.forEach(item => {
      if (!groupedByCode[item.category_code]) {
        groupedByCode[item.category_code] = []
      }
      groupedByCode[item.category_code].push(item.duration_minutes)
    })

    // Erstelle CategoryWithDurations für jede Staff-Kategorie
    result = Object.entries(groupedByCode).map(([code, durations]) => {
      const baseCategory = allCategories.value.find(cat => cat.code === code)
      if (!baseCategory) return null

      return {
        ...baseCategory,
        availableDurations: durations.sort((a, b) => a - b)
      }
    }).filter((item): item is CategoryWithDurations => item !== null)
  }
  // Client sieht alle aktiven Kategorien (für Terminbuchung)
  else {
    result = allCategories.value
      .filter(cat => cat.is_active)
      .map(cat => ({
        ...cat,
        availableDurations: [cat.lesson_duration_minutes] // Standard-Dauer für Clients
      }))
  }
  
  // Sortieren nach display_order und dann nach Name
  return result.sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order
    }
    return a.name.localeCompare(b.name)
  })
})

// Methods
const loadCategories = async () => {
  console.log('🔥 CategorySelector - loadCategories called')
  isLoading.value = true
  error.value = null

  try {
    const supabase = getSupabase()
    
    // Alle Kategorien laden
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, code, description, price_per_lesson, lesson_duration_minutes, color, is_active, display_order, price_unit')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (categoriesError) throw categoriesError
    allCategories.value = categoriesData || []
    console.log('✅ All categories loaded:', categoriesData?.length)

    // Wenn es ein Staff-Benutzer ist, seine spezifischen Kategorie-Dauern laden
    if (props.currentUserRole === 'staff' && props.currentUser?.id) {
      await loadStaffCategoryDurations(props.currentUser.id)
    }

  } catch (err: any) {
    console.error('❌ Error loading categories:', err)
    error.value = err.message || 'Fehler beim Laden der Kategorien'
  } finally {
    isLoading.value = false
  }
}

const loadStaffCategoryDurations = async (staffId: string) => {
  console.log('🔄 Loading staff category durations for:', staffId)
  
  try {
    const supabase = getSupabase()
    
    // Staff-Kategorie-Dauern laden - KORREKTE TABELLE
    const { data: durationsData, error: durationsError } = await supabase
      .from('staff_category_durations')
      .select('id, created_at, staff_id, category_code, duration_minutes, is_active, display_order')
      .eq('staff_id', staffId)
      .eq('is_active', true)
      .order('category_code', { ascending: true })
      .order('display_order', { ascending: true })

    if (durationsError) throw durationsError

    staffCategoryDurations.value = durationsData || []
    
    console.log('✅ Staff category durations loaded:', durationsData?.length)
    
    if (durationsData && durationsData.length > 0) {
      const categories = [...new Set(durationsData.map(d => d.category_code))]
      console.log('📊 Categories found:', categories)
      
      // Debug: Zeige Dauern pro Kategorie
      categories.forEach(code => {
        const durations = durationsData.filter(d => d.category_code === code).map(d => d.duration_minutes)
        console.log(`📊 ${code}: [${durations.join(', ')}] Minuten`)
      })
    } else {
      console.log('⚠️ No category durations found for staff:', staffId)
    }

  } catch (err: any) {
    console.error('❌ Error loading staff category durations:', err)
    // Bei Fehlern leere Liste
    staffCategoryDurations.value = []
  }
}

const handleCategoryChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newValue = target.value
  
  console.log('🔄 CategorySelector - category changed:', newValue)
  console.log('🎯 CategorySelector - Will emit events now!')

  
  emit('update:modelValue', newValue)
  
  const selected = availableCategoriesForUser.value.find(cat => cat.code === newValue) || null
    console.log('🎯 CategorySelector - Selected category:', selected)

  emit('category-selected', selected)
    console.log('🎯 CategorySelector - Events emitted!')

  
  // Preis pro Minute berechnen (alle Preise sind auf 45min basis)
  if (selected) {
    const pricePerMinute = selected.price_per_lesson / 45
    emit('price-changed', pricePerMinute)
    emit('durations-changed', selected.availableDurations)
    console.log('💰 Price per minute:', pricePerMinute)
    console.log('⏱️ Available durations:', selected.availableDurations)
  } else {
    emit('price-changed', 0)
    emit('durations-changed', [])
  }
}

// Watchers
watch(() => props.selectedUser, (newUser) => {
  if (newUser?.category && newUser.category !== props.modelValue) {
    console.log('👤 User category detected:', newUser.category)
    emit('update:modelValue', newUser.category)
    
    const selected = availableCategoriesForUser.value.find(cat => cat.code === newUser.category)
    if (selected) {
      emit('category-selected', selected)
      const pricePerMinute = selected.price_per_lesson / 45
      emit('price-changed', pricePerMinute)
      emit('durations-changed', selected.availableDurations)
    }
  }
}, { immediate: true })

// Wenn sich der currentUser ändert, Staff-Kategorien neu laden
watch(() => props.currentUser?.id, (newUserId) => {
  if (newUserId && props.currentUserRole === 'staff') {
    loadStaffCategoryDurations(newUserId)
  }
}, { immediate: true })

// Lifecycle
onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
select option {
  padding: 8px;
}

select:hover {
  border-color: #10b981;
}
</style>