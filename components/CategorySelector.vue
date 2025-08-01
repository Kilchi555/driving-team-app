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
import { toLocalTimeString } from '~/utils/dateUtils'

interface Category {
  id: number
  created_at?: string
  name: string
  code: string
  description?: string
  price_per_lesson: number
  lesson_duration_minutes: number
  exam_duration_minutes?: number  // ✅ NEU HINZUGEFÜGT
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
const isAutoEmitting = ref(false)
const isInitializing = ref(false)

// Computed
const selectedCategory = computed(() => {
  if (!props.modelValue) return null
  return availableCategoriesForUser.value.find(cat => cat.code === props.modelValue) || null
})

const availableCategoriesForUser = computed(() => {
  let result: CategoryWithDurations[] = []
  
  console.log('🔍 Computing availableCategoriesForUser:', {
    role: props.currentUserRole,
    allCategoriesCount: allCategories.value.length,
    staffDurationsCount: staffCategoryDurations.value.length
  })
  
  // ✅ DEFENSIVE: Warte bis Categories geladen sind
  if (allCategories.value.length === 0) {
    console.log('⏳ Categories not loaded yet, returning empty')
    return []
  }
  
  // Admin kann alle Kategorien sehen
  if (props.currentUserRole === 'admin') {
    result = allCategories.value
      .filter(cat => cat.is_active)
      .map(cat => ({
        ...cat,
        availableDurations: [cat.lesson_duration_minutes] // Standard-Dauer für Admins
      }))
    console.log('👨‍💼 Admin: Showing all categories:', result.length)
  }
  // Staff sieht nur seine zugewiesenen Kategorien mit seinen verfügbaren Dauern
  else if (props.currentUserRole === 'staff') {
    // ✅ DEFENSIVE: Check ob Staff-Dauern geladen sind
    if (staffCategoryDurations.value.length === 0) {
      console.log('⏳ Staff durations not loaded yet, using fallback')
      result = allCategories.value
        .filter(cat => cat.is_active)
        .map(cat => ({
          ...cat,
          availableDurations: [cat.lesson_duration_minutes]
        }))
    } else {
      // Gruppiere Staff-Kategorien-Dauern nach category_code
      const groupedByCode: Record<string, number[]> = {}
      
      staffCategoryDurations.value.forEach(item => {
        if (!groupedByCode[item.category_code]) {
          groupedByCode[item.category_code] = []
        }
        groupedByCode[item.category_code].push(item.duration_minutes)
      })

      console.log('📊 Staff categories grouped:', groupedByCode)

      // Erstelle CategoryWithDurations für jede Staff-Kategorie
      result = Object.entries(groupedByCode).map(([code, durations]) => {
        const baseCategory = allCategories.value.find(cat => cat.code === code)
        if (!baseCategory) {
          console.log(`❌ Category ${code} not found in allCategories`)
          return null
        }

        return {
          ...baseCategory,
          availableDurations: durations.sort((a, b) => a - b)
        }
      }).filter((item): item is CategoryWithDurations => item !== null)
      
      // ✅ FALLBACK: Wenn Staff keine spezifischen Dauern hat, alle Kategorien mit Standard-Dauern zeigen
      if (result.length === 0) {
        console.log('⚠️ Staff has no specific category durations, showing ALL categories as fallback')
        result = allCategories.value
          .filter(cat => cat.is_active)
          .map(cat => ({
            ...cat,
            availableDurations: [cat.lesson_duration_minutes] // Standard-Dauer
          }))
      }
    }
    
    console.log('👨‍🏫 Staff: Final categories:', result.length, result.map(r => r.code))
  }
  // Client sieht alle aktiven Kategorien (für Terminbuchung)
  else {
    result = allCategories.value
      .filter(cat => cat.is_active)
      .map(cat => ({
        ...cat,
        availableDurations: [cat.lesson_duration_minutes] // Standard-Dauer für Clients
      }))
    console.log('👤 Client: Showing all categories:', result.length)
  }
  
  // Sortieren nach display_order und dann nach Name
  const sortedResult = result.sort((a, b) => {
    if (a.display_order !== b.display_order) {
      return a.display_order - b.display_order
    }
    return a.name.localeCompare(b.name)
  })
  
  console.log('📋 Final sorted categories:', sortedResult.map(cat => ({
    code: cat.code,
    name: cat.name,
    durations: cat.availableDurations
  })))
  
  return sortedResult
})



// Methods
// ✅ 1. CategorySelector.vue - Verbesserte loadCategories Funktion
// CategorySelector.vue - Korrigierte loadCategories Funktion (NUR CategorySelector Code)

const loadCategories = async () => {
  console.log('🔥 CategorySelector - loadCategories called')
  
  isLoading.value = true
  isInitializing.value = true
  error.value = null
  
  try {
    const supabase = getSupabase()
    
    // ✅ KORREKTE REIHENFOLGE: Query zuerst definieren
    const queryPromise = supabase
      .from('categories')
      .select(`
        id, 
        name, 
        code, 
        description, 
        price_per_lesson, 
        lesson_duration_minutes, 
        color, 
        is_active, 
        display_order, 
        price_unit, 
        exam_duration_minutes,
        created_at
      `)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    // ✅ Dann Timeout definieren
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Network timeout - using offline mode')), 3000)
    )

    // ✅ Race zwischen Query und Timeout
    const result = await Promise.race([
      queryPromise,
      timeoutPromise
    ])

    // ✅ KORREKTE PROPERTY-ZUGRIFFE
    if (result.error) {
      console.error('❌ Database error:', result.error)
      throw result.error
    }

    allCategories.value = result.data || []
    console.log('✅ All categories loaded from database:', result.data?.length)

    // Staff-spezifische Dauern laden falls nötig
    if (props.currentUserRole === 'staff' && props.currentUser?.id) {
      await loadStaffCategoryDurations(props.currentUser.id)
    }

  } catch (err: any) {
    console.error('❌ Error loading categories (switching to offline mode):', err)
    error.value = err.message || 'Offline-Modus: Verwende lokale Kategorien'
    
    // ✅ SOFORTIGER OFFLINE-FALLBACK (CategorySelector hat kein dynamicPricing/formData!)
    console.log('🔄 Using complete offline fallback categories')
    allCategories.value = [
      { 
        id: 1, code: 'B', name: 'B - Auto', description: 'Autoprüfung Kategorie B',
        price_per_lesson: 95, lesson_duration_minutes: 45, exam_duration_minutes: 180,
        color: 'hellgrün', is_active: true, display_order: 1, price_unit: 'per_lesson',
        created_at: toLocalTimeString(new Date())},
      { 
        id: 2, code: 'A1', name: 'A1 - Motorrad 125cc', description: 'Motorrad A1',
        price_per_lesson: 95, lesson_duration_minutes: 45, exam_duration_minutes: 120,
        color: 'hellgrün', is_active: true, display_order: 2, price_unit: 'per_lesson',
        created_at: toLocalTimeString(new Date())},
   
      { 
        id: 3, code: 'A35kW', name: 'A35kW - Motorrad 35kW', description: 'Motorrad A35kW',
        price_per_lesson: 95, lesson_duration_minutes: 45, exam_duration_minutes: 120,
        color: 'hellgrün', is_active: true, display_order: 3, price_unit: 'per_lesson',
        created_at: toLocalTimeString(new Date())},
     
      { 
        id: 4, code: 'A', name: 'A - Motorrad', description: 'Motorrad A',
        price_per_lesson: 95, lesson_duration_minutes: 45, exam_duration_minutes: 120,
        color: 'hellgrün', is_active: true, display_order: 4, price_unit: 'per_lesson',
        created_at: toLocalTimeString(new Date())},
   
      { 
        id: 5, code: 'BE', name: 'BE - Anhänger', description: 'Anhänger BE',
        price_per_lesson: 120, lesson_duration_minutes: 45, exam_duration_minutes: 90,
        color: 'orange', is_active: true, display_order: 5, price_unit: 'per_lesson',
        created_at: toLocalTimeString(new Date())},
    
      { 
        id: 6, code: 'C1', name: 'C1 - LKW klein', description: 'LKW C1',
        price_per_lesson: 150, lesson_duration_minutes: 45, exam_duration_minutes: 180,
        color: 'gelb', is_active: true, display_order: 6, price_unit: 'per_lesson',
        created_at: toLocalTimeString(new Date())},
     
      { 
        id: 7, code: 'D1', name: 'D1 - Bus klein', description: 'Bus D1',
        price_per_lesson: 150, lesson_duration_minutes: 45, exam_duration_minutes: 180,
        color: 'gelb', is_active: true, display_order: 7, price_unit: 'per_lesson',
        created_at: toLocalTimeString(new Date())},
   
      { 
        id: 8, code: 'C', name: 'C - LKW', description: 'LKW C',
        price_per_lesson: 170, lesson_duration_minutes: 45, exam_duration_minutes: 180,
        color: 'rot', is_active: true, display_order: 8, price_unit: 'per_lesson',
        created_at: toLocalTimeString(new Date())},
     
      { 
        id: 9, code: 'CE', name: 'CE - LKW mit Anhänger', description: 'LKW CE',
        price_per_lesson: 200, lesson_duration_minutes: 45, exam_duration_minutes: 180,
        color: 'violett', is_active: true, display_order: 9, price_unit: 'per_lesson',
        created_at: toLocalTimeString(new Date())},
     
      { 
        id: 10, code: 'D', name: 'D - Bus', description: 'Bus D',
        price_per_lesson: 200, lesson_duration_minutes: 45, exam_duration_minutes: 180,
        color: 'türkis', is_active: true, display_order: 10, price_unit: 'per_lesson',
        created_at: toLocalTimeString(new Date())},
     
      { 
        id: 11, code: 'Motorboot', name: 'Motorboot', description: 'Motorboot',
        price_per_lesson: 95, lesson_duration_minutes: 45, exam_duration_minutes: 120,
        color: 'hellblau', is_active: true, display_order: 11, price_unit: 'per_lesson',
        created_at: toLocalTimeString(new Date())},
     
      { 
        id: 12, code: 'BPT', name: 'BPT - Berufsprüfung Transport', description: 'Berufsprüfung Transport',
        price_per_lesson: 100, lesson_duration_minutes: 45, exam_duration_minutes: 180,
        color: 'dunkelblau', is_active: true, display_order: 12, price_unit: 'per_lesson',
        created_at: toLocalTimeString(new Date())},
   
    ]
    
  } finally {
    isLoading.value = false
    
    // ✅ GARANTIERTE DURATION-EMISSION IM OFFLINE-MODUS
    if (props.modelValue) {
      console.log('🔄 Categories loaded (offline), checking current selection:', props.modelValue)
      const selected = availableCategoriesForUser.value.find(cat => cat.code === props.modelValue)
      
      if (selected) {
        console.log('✅ Re-emitting durations for loaded category (offline):', selected.availableDurations)
        
        // ✅ Sofortige Emission im Offline-Modus
        setTimeout(() => {
          if (!isAutoEmitting.value) {
            emit('durations-changed', selected.availableDurations)
          }
        }, 50)  // Kürzere Verzögerung im Offline-Modus
      }
    }
    
    // Initialization Mode beenden
    setTimeout(() => {
      isInitializing.value = false
      console.log('✅ CategorySelector initialization completed (offline mode)')
    }, 100)  // Kürzere Verzögerung im Offline-Modus
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
   staffCategoryDurations.value = []
 }

 // ✅ RACE-SAFE: Nach dem Laden der Staff-Dauern prüfen
 if (props.modelValue && !isInitializing.value) {
   console.log('🔄 Staff durations loaded, checking current selection:', props.modelValue)
   const selected = availableCategoriesForUser.value.find(cat => cat.code === props.modelValue)
   
   if (selected) {
     console.log('✅ Emitting durations after staff load:', selected.availableDurations)
     
     // ✅ RACE-SAFE Emit mit Verzögerung
     setTimeout(() => {
       if (!isAutoEmitting.value) {
         emit('durations-changed', selected.availableDurations)
       }
     }, 100)
   }
 }
}

const handleCategoryChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newValue = target.value
  
  console.log('🔄 CategorySelector - Manual category change:', newValue)
  
  // ✅ BLOCKIERE alle anderen Auto-Updates während User-Auswahl
  isAutoEmitting.value = true
  
  emit('update:modelValue', newValue)
  
  const selected = availableCategoriesForUser.value.find(cat => cat.code === newValue) || null
  console.log('🎯 CategorySelector - Selected category:', selected)
  console.log('🎯 CategorySelector - Available durations:', selected?.availableDurations)
  
  emit('category-selected', selected)
  
  if (selected) {
    const pricePerMinute = selected.price_per_lesson / 45
    emit('price-changed', pricePerMinute)
    
    // ✅ FINAL: Dauern emittieren
    console.log('⏱️ CategorySelector - FINAL Emitting durations-changed:', selected.availableDurations)
    emit('durations-changed', selected.availableDurations)
    
    console.log('💰 Price per minute:', pricePerMinute)
  } else {
    console.log('❌ No category selected, emitting empty durations')
    emit('price-changed', 0)
    emit('durations-changed', [])
  }
  
  // ✅ LÄNGERE Blockierung um andere Events zu verhindern
  setTimeout(() => {
    isAutoEmitting.value = false
    console.log('✅ CategorySelector - User selection completed, auto-emit enabled')
  }, 1000) // 1 Sekunde statt 300ms
}

// Watchers
// GEZIELTER FIX für CategorySelector.vue
// Ersetzen Sie den User-Watcher (Zeile 314-328) mit diesem korrigierten Code:

watch(() => props.selectedUser, (newUser, oldUser) => {
  // ✅ Skip während Initialisierung
  if (isInitializing.value) {
    console.log('🚫 Auto-category selection blocked - initializing')
    return
  }
  
  // ✅ Skip wenn bereits Kategorie gewählt (verhindert Überschreibung)
  if (props.modelValue) {
    console.log('🚫 Auto-category selection blocked - category already selected')
    return
  }

  // ✅ FIX: Bei freeslots (kein User) Standard-Kategorie 'B' laden
  if (!newUser) {
    console.log('🎯 No user selected - loading default category: B')
    const defaultCategory = availableCategoriesForUser.value.find(cat => cat.code === 'B')
    
    if (defaultCategory) {
      console.log('🎯 Auto-selected default category:', defaultCategory)
      isAutoEmitting.value = true
      
      emit('update:modelValue', 'B')
      emit('category-selected', defaultCategory)
      emit('price-changed', defaultCategory.price_per_lesson / 45)
      emit('durations-changed', defaultCategory.availableDurations)
      
      setTimeout(() => {
        isAutoEmitting.value = false
      }, 200)
    }
    return
  }

  if (oldUser?.id === newUser.id) return

 
 if (newUser?.category && newUser.category !== props.modelValue) {
   console.log('👤 User category detected:', newUser.category)
   
   // ✅ FIX: Nur erste Kategorie nehmen wenn mehrere
   const primaryCategory = newUser.category.split(',')[0].trim()
   console.log('🎯 Using primary category:', primaryCategory)
   
   // ✅ Mark als Auto-Selection
   isAutoEmitting.value = true
   
   emit('update:modelValue', primaryCategory)
   
   // 🔥 KRITISCHER FIX: Suche nach primaryCategory statt newUser.category
   const selected = availableCategoriesForUser.value.find(cat => cat.code === primaryCategory)
   
   if (selected) {
     console.log('🎯 Auto-selected category:', selected)
     emit('category-selected', selected)
     
     const pricePerMinute = selected.price_per_lesson / 45
     emit('price-changed', pricePerMinute)
     
     // ✅ RACE-SAFE Auto-Emit
     console.log('⏱️ Auto-emitting durations-changed:', selected.availableDurations)
     emit('durations-changed', selected.availableDurations)
     
     // ✅ Reset Auto-Emit Flag
     setTimeout(() => {
       isAutoEmitting.value = false
     }, 200)
   }
 }
}, { immediate: false })

// Wenn sich der currentUser ändert, Staff-Kategorien neu laden
watch(() => props.currentUser?.id, (newUserId) => {
  if (newUserId && props.currentUserRole === 'staff') {
    loadStaffCategoryDurations(newUserId)
  }
}, { immediate: true })

// Neuer Watcher in CategorySelector.vue hinzufügen:
watch([() => allCategories.value.length, () => props.modelValue], ([categoriesCount, modelValue]) => {
 // ✅ Skip während Initialisierung
 if (isInitializing.value) {
   console.log('🚫 Re-emit blocked - initializing')
   return
 }
 
 // ✅ Skip wenn Auto-Selection läuft
 if (isAutoEmitting.value) {
   console.log('🚫 Re-emit blocked - auto-selection in progress')
   return
 }
 
 if (categoriesCount > 0 && modelValue) {
   console.log('🔄 Categories loaded, re-emitting for:', modelValue)
   const selected = availableCategoriesForUser.value.find(cat => cat.code === modelValue)
   
   if (selected) {
     console.log('✅ Re-emitting durations-changed:', selected.availableDurations)
     
     // ✅ RACE-SAFE Re-Emit mit Verzögerung
     setTimeout(() => {
       if (!isAutoEmitting.value) {
         emit('durations-changed', selected.availableDurations)
       }
     }, 150)
   }
 }
}, { immediate: false })  // ✅ KEIN immediate: true!

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