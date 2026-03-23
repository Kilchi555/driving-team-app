<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">
      🚗 Kategorie
    </label>
    
    <select
      :value="modelValue"
      @change="handleCategoryChange"
      :disabled="isLoading || props.isPastAppointment"
      :class="[
        'w-full p-3 border rounded-lg focus:outline-none',
        props.isPastAppointment
          ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
          : 'border-gray-300 bg-white text-black focus:ring-2 focus:ring-green-500 disabled:opacity-50'
      ]"
    >
      <option value="" class="text-black bg-white">
        {{ isLoading ? 'Kategorien laden...' : 'Kategorie wählen' }}
      </option>
      <option 
        v-for="category in availableCategoriesForUser" 
        :key="category.code"
        :value="category.code"
        class="text-black bg-white"
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
import { useAuthStore } from '~/stores/auth'
import { toLocalTimeString } from '~/utils/dateUtils'
import { logger } from '~/utils/logger'
import { useCategoryWithFallback } from '~/composables/useCategoryWithFallback'

interface Category {
  id: number
  created_at?: string
  name: string
  code: string
  description?: string
  lesson_duration_minutes: number[]
  theory_durations?: number[]
  exam_duration_minutes?: number  
  color?: string
  is_active: boolean
  parent_category_id?: string | null
}

interface CategoryWithDurations extends Category {
  availableDurations: number[]
}

// ✅ ENTFERNT: StaffCategoryDuration Interface - wird nicht mehr benötigt
// interface StaffCategoryDuration {
//   id: string
//   created_at: string
//   staff_id: string
//   category_code: string
//   duration_minutes: number
//   is_active: boolean
// }

interface Props {
  modelValue: string | null // ✅ Can be null for "other" event types
  selectedUser?: any
  currentUser?: any
  currentUserRole?: string
  appointmentType?: string
  showDebugInfo?: boolean
  isPastAppointment?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string | null): void // ✅ Allow null
  (e: 'category-selected', category: CategoryWithDurations | null): void
  (e: 'price-changed', price: number): void
  (e: 'durations-changed', durations: number[]): void
}

const props = withDefaults(defineProps<Props>(), {
  showDebugInfo: false,
  appointmentType: 'lesson',
  isPastAppointment: false
})
const emit = defineEmits<Emits>()

// State
const allCategories = ref<Category[]>([])
// ✅ ENTFERNT: staffCategoryDurations - wird nicht mehr benötigt
// const staffCategoryDurations = ref<StaffCategoryDuration[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const isAutoEmitting = ref(false)
const isInitializing = ref(false)
const hasFiredCategorySelected = ref(false) // ✅ Tracks whether category-selected was ever emitted

// Computed
const selectedCategory = computed(() => {
  if (!props.modelValue) return null
  return availableCategoriesForUser.value.find(cat => cat.code === props.modelValue) || null
})

const getCorrectDuration = (category: Category): number => {
  if (props.appointmentType === 'exam') {
    return category.exam_duration_minutes || 135
  } else {
    return category.lesson_duration_minutes || 45
  }
}

const availableCategoriesForUser = computed(() => {
  logger.debug('🔍 Computing availableCategoriesForUser:', {
    role: props.currentUserRole,
    allCategoriesCount: allCategories.value.length
  })
  
  if (allCategories.value.length === 0) {
    logger.debug('⏳ Categories not loaded yet, returning empty')
    return []
  }
  
  const activeCategories = allCategories.value.filter(cat => cat.is_active)

  // Sammle alle IDs die als parent_category_id referenziert werden
  const parentIds = new Set(
    activeCategories
      .map(cat => cat.parent_category_id)
      .filter(Boolean)
  )

  // Zeige nur Kategorien die NICHT als Parent referenziert werden
  // d.h. wenn eine Kategorie Kinder hat, wird sie ausgeblendet
  const filtered = activeCategories.filter(cat => !parentIds.has(cat.id as any))

  logger.debug('📊 Parent IDs found:', Array.from(parentIds))
  logger.debug('✅ Categories after filtering parents with children:', filtered.map(c => `${c.code} (parent: ${c.parent_category_id})`))

  const result: CategoryWithDurations[] = filtered.map(cat => ({
    ...cat,
    availableDurations: [props.appointmentType === 'exam' ? (cat.exam_duration_minutes || 135) : (cat.lesson_duration_minutes?.[0] || 45)]
  }))

  const sortedResult = result.sort((a, b) => a.code.localeCompare(b.code))

  logger.debug('📋 Final sorted categories:', sortedResult.map(cat => ({
    code: cat.code,
    name: cat.name,
    parent_category_id: cat.parent_category_id,
  })))

  return sortedResult
})



// Methods
// ✅ 1. CategorySelector.vue - Verbesserte loadCategories Funktion
// CategorySelector.vue - Korrigierte loadCategories Funktion (NUR CategorySelector Code)

const loadCategories = async () => {
  logger.debug('🔥 CategorySelector - loadCategories called')
  
  isLoading.value = true
  isInitializing.value = true
  error.value = null
  
  try {
    const supabase = getSupabase()
    const authStore = useAuthStore()
    
    // Get tenant_id from auth store
    const tenantId = authStore.userProfile?.tenant_id
    if (!tenantId) throw new Error('User has no tenant assigned')

    logger.debug('🔍 Loading categories for tenant:', tenantId)

    // Get tenant business_type
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', tenantId)
      .single()

    if (tenantError) throw tenantError
    
    // Only load categories if business_type is driving_school
    if (tenantData?.business_type !== 'driving_school') {
      logger.debug('🚫 Categories not available for business_type:', tenantData?.business_type)
      allCategories.value = []
      isLoading.value = false
      isInitializing.value = false
      return
    }
    
    // ✅ KORREKTE REIHENFOLGE: Query zuerst definieren (with tenant filter)
    // ✅ UPDATED: Now loads parent_category_id for fallback to parent evaluation criteria
    const queryPromise = supabase
      .from('categories')
      .select(`
        id, 
        name, 
        code, 
        description, 
        lesson_duration_minutes, 
        theory_durations,
        color, 
        is_active, 
        exam_duration_minutes,
        parent_category_id,
        created_at
      `)
      .eq('is_active', true)
      .eq('tenant_id', tenantId)
      .order('code', { ascending: true })

    // ✅ Dann Timeout definieren
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Network timeout - using offline mode')), 3000)
    )

    // ✅ Race zwischen Query und Timeout
    const result = await Promise.race([
      queryPromise,
      timeoutPromise
    ]) as any

    // ✅ KORREKTE PROPERTY-ZUGRIFFE
    if (result.error) {
      console.error('❌ Database error:', result.error)
      throw result.error
    }

    // Transform database data to match expected format
    allCategories.value = (result.data || []).map(cat => {
      // ✅ CONVERT STRING ARRAYS TO NUMBER ARRAYS
      let lessonDurations = cat.lesson_duration_minutes
      if (Array.isArray(lessonDurations)) {
        // Convert string array ["45","60","90"] to number array [45,60,90]
        lessonDurations = lessonDurations.map((d: any) => {
          const num = parseInt(d.toString(), 10)
          return isNaN(num) ? 45 : num
        })
      } else if (lessonDurations) {
        // Single value - convert to number array
        const num = parseInt(lessonDurations.toString(), 10)
        lessonDurations = [isNaN(num) ? 45 : num]
      } else {
        lessonDurations = [45] // fallback
      }

      let theoryDurations = cat.theory_durations
      if (Array.isArray(theoryDurations)) {
        // Convert string array to number array
        theoryDurations = theoryDurations.map((d: any) => {
          const num = parseInt(d.toString(), 10)
          return isNaN(num) ? 45 : num
        })
      } else if (theoryDurations) {
        // Single value - convert to number array
        const num = parseInt(theoryDurations.toString(), 10)
        theoryDurations = [isNaN(num) ? 45 : num]
      } else {
        theoryDurations = []
      }

      // ✅ CONVERT exam_duration_minutes from string to number
      let examDuration = cat.exam_duration_minutes
      if (examDuration) {
        const num = parseInt(examDuration.toString(), 10)
        examDuration = isNaN(num) ? 135 : num // fallback to 135 minutes
      } else {
        examDuration = 135 // default exam duration
      }

      return {
        ...cat,
        lesson_duration_minutes: lessonDurations,
        theory_durations: theoryDurations,
        exam_duration_minutes: examDuration,  // ✅ CONVERTED TO NUMBER
        availableDurations: lessonDurations, // Use converted lesson durations
        parent_category_id: cat.parent_category_id // ✅ PRESERVE PARENT INFO
      }
    })
    
    logger.debug('✅ All categories loaded from database:', result.data?.length)
    logger.debug('✅ Categories with durations:', allCategories.value.map(c => ({ 
      code: c.code, 
      durations: c.lesson_duration_minutes 
    })))

    // ✅ Staff-spezifische Dauern werden nicht mehr benötigt
    // Alle Dauern werden direkt aus der categories Tabelle geladen
    logger.debug('✅ Staff durations loading skipped - using central categories table')

  } catch (err: any) {
    console.error('❌ Error loading categories (switching to offline mode):', err)
    error.value = err.message || 'Offline-Modus: Verwende lokale Kategorien'
    
    // ✅ SOFORTIGER OFFLINE-FALLBACK (CategorySelector hat kein dynamicPricing/formData!)
    logger.debug('🔄 Using complete offline fallback categories')
    allCategories.value = [
      { 
        id: 1, code: 'B', name: 'B - Auto', description: 'Autoprüfung Kategorie B',
        lesson_duration_minutes: [45, 60, 90, 120, 180], exam_duration_minutes: 135,
        color: '#66cc66', is_active: true,
        availableDurations: [45, 60, 90, 120, 180],
        created_at: toLocalTimeString(new Date())},
      { 
        id: 2, code: 'A1', name: 'A1 - Motorrad 125cc', description: 'Motorrad A1',
        lesson_duration_minutes: [45, 60, 90], exam_duration_minutes: 90,
        color: '#66cc66', is_active: true,
        availableDurations: [45, 60, 90],
        created_at: toLocalTimeString(new Date())},
   
      { 
        id: 3, code: 'A35kW', name: 'A35kW - Motorrad 35kW', description: 'Motorrad A35kW',
        lesson_duration_minutes: [45, 60, 90], exam_duration_minutes: 90,
        color: '#66cc66', is_active: true,
        availableDurations: [45, 60, 90],
        created_at: toLocalTimeString(new Date())},
     
      { 
        id: 4, code: 'A', name: 'A - Motorrad', description: 'Motorrad A',
        lesson_duration_minutes: [45, 60, 90], exam_duration_minutes: 90,
        color: '#66cc66', is_active: true,
        availableDurations: [45, 60, 90],
        created_at: toLocalTimeString(new Date())},
   
      { 
        id: 5, code: 'BE', name: 'BE - Anhänger', description: 'Anhänger BE',
        lesson_duration_minutes: [45, 60, 90, 120], exam_duration_minutes: 135,
        color: '#ff9900', is_active: true,
        availableDurations: [45, 60, 90, 120],
        created_at: toLocalTimeString(new Date())},
    
      { 
        id: 6, code: 'C1', name: 'C1 - LKW klein', description: 'LKW C1',
        lesson_duration_minutes: [45, 60, 90, 120, 180], exam_duration_minutes: 180,
        color: '#ffcc00', is_active: true,
        availableDurations: [45, 60, 90, 120, 180],
        created_at: toLocalTimeString(new Date())},
     
      { 
        id: 7, code: 'D1', name: 'D1 - Bus klein', description: 'Bus D1',
        lesson_duration_minutes: [45, 60, 90, 120, 180], exam_duration_minutes: 180,
        color: '#ffcc00', is_active: true,
        availableDurations: [45, 60, 90, 120, 180],
        created_at: toLocalTimeString(new Date())},
   
      { 
        id: 8, code: 'C', name: 'C - LKW', description: 'LKW C',
        lesson_duration_minutes: [45, 60, 90, 120, 180], exam_duration_minutes: 180,
        color: '#cc0000', is_active: true,
        availableDurations: [45, 60, 90, 120, 180],
        created_at: toLocalTimeString(new Date())},
     
      { 
        id: 9, code: 'CE', name: 'CE - LKW mit Anhänger', description: 'LKW CE',
        lesson_duration_minutes: [45, 60, 90, 120, 180], exam_duration_minutes: 180,
        color: '#9900cc', is_active: true,
        availableDurations: [45, 60, 90, 120, 180],
        created_at: toLocalTimeString(new Date())},
         
      { 
        id: 10, code: 'D', name: 'D - Bus', description: 'Bus D',
        lesson_duration_minutes: [45, 60, 90, 120, 180], exam_duration_minutes: 180,
        color: '#00cccc', is_active: true,
        availableDurations: [45, 60, 90, 120, 180],
        created_at: toLocalTimeString(new Date())},
     
      { 
        id: 11, code: 'Motorboot', name: 'Motorboot', description: 'Motorboot',
        lesson_duration_minutes: [45, 60, 90, 120], exam_duration_minutes: 135,
        color: '#66ccff', is_active: true,
        availableDurations: [45, 60, 90, 120],
        created_at: toLocalTimeString(new Date())},
     
      { 
        id: 12, code: 'BPT', name: 'BPT - Berufsprüfung Transport', description: 'Berufsprüfung Transport',
        lesson_duration_minutes: [45, 60, 90, 120], exam_duration_minutes: 135,
        color: '#003366', is_active: true,
        availableDurations: [45, 60, 90, 120],
        created_at: toLocalTimeString(new Date())},
   
    ]
    
  } finally {
    isLoading.value = false
    
    // Initialization Mode beenden
    setTimeout(() => {
      isInitializing.value = false
      logger.debug('✅ CategorySelector initialization completed (offline mode)')
      
      // ✅ POST-INIT: category-selected nachholen falls noch nie gefeuert
      // (passiert wenn formData.type schon gesetzt war bevor Kategorien geladen wurden)
      if (!hasFiredCategorySelected.value) {
        logger.debug('🔄 Post-init: category-selected never fired, triggering now...')
        
        let targetCode: string | null = null
        
        // In edit mode: always respect the current modelValue (appointment's category)
        // In create mode: prefer user's category over the default "B"
        const isDefaultCategory = props.modelValue === 'B' && !props.categoryCode
        if (props.modelValue && !isDefaultCategory) {
          targetCode = props.modelValue
          logger.debug('🔄 Post-init: using existing modelValue as target:', targetCode)
        } else if (props.selectedUser?.category) {
          const rawCategory = Array.isArray(props.selectedUser.category)
            ? props.selectedUser.category[0]
            : props.selectedUser.category?.split(',')[0]
          targetCode = rawCategory?.trim() || null
          logger.debug('🔄 Post-init: using user category:', targetCode)
        }
        
        if (targetCode) {
          let selected = availableCategoriesForUser.value.find(cat => cat.code === targetCode)
          
          // Falls Parent-Kategorie (herausgefiltert): erstes Kind nehmen
          if (!selected) {
            const parentCat = allCategories.value.find(cat => cat.code === targetCode)
            if (parentCat) {
              selected = availableCategoriesForUser.value.find(cat => String(cat.parent_category_id) === String(parentCat.id))
              logger.debug('🎯 Post-init: falling back to first child category:', selected?.code)
            }
          }
          
          if (selected) {
            logger.debug('🎯 Post-init: emitting category-selected for:', selected.code)
            hasFiredCategorySelected.value = true
            isAutoEmitting.value = true
            emit('update:modelValue', selected.code)
            emit('category-selected', selected)
            emit('price-changed', 2.11)
            emit('durations-changed', selected.availableDurations)
            setTimeout(() => { isAutoEmitting.value = false }, 200)
          } else {
            logger.debug('⚠️ Post-init: no matching category found for:', targetCode)
            // Garantiere zumindest durations-changed für modelValue
            const fallback = availableCategoriesForUser.value.find(cat => cat.code === props.modelValue)
            if (fallback) {
              emit('durations-changed', fallback.availableDurations)
            }
          }
        }
      }
    }, 100)
  }
}



// ✅ ENTFERNT: loadStaffCategoryDurations - wird nicht mehr benötigt
// Da wir jetzt die categories Tabelle als zentrale Quelle verwenden,
// werden alle Dauern direkt aus der categories Tabelle geladen
const loadStaffCategoryDurations = async (staffId: string) => {
  logger.debug('🔄 Staff category durations loading removed - using categories table instead')
  logger.debug('✅ All durations are now loaded from the central categories table')
  
  // ✅ Keine Aktion erforderlich - Dauern werden bereits in loadCategories geladen
}

const handleCategoryChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newValue = target.value
  
  logger.debug('🔄 CategorySelector - Manual category change:', newValue)
  
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (props.isPastAppointment) {
    logger.debug('🚫 Cannot change category for past appointment')
    return
  }
  
  // ✅ BLOCKIERE alle anderen Auto-Updates während User-Auswahl
  isAutoEmitting.value = true
  
  emit('update:modelValue', newValue)
  
  const selected = availableCategoriesForUser.value.find(cat => cat.code === newValue) || null
  logger.debug('🎯 CategorySelector - Selected category:', selected)
  logger.debug('🎯 CategorySelector - Available durations:', selected?.availableDurations)
  
  hasFiredCategorySelected.value = true
  emit('category-selected', selected)
  
  if (selected) {
    const pricePerMinute = 2.11
    emit('price-changed', pricePerMinute)
    
    // ✅ FINAL: Dauern emittieren
    logger.debug('⏱️ CategorySelector - FINAL Emitting durations-changed:', selected.availableDurations)
    emit('durations-changed', selected.availableDurations)
    
    logger.debug('💰 Price per minute:', pricePerMinute)
  } else {
    logger.debug('❌ No category selected, emitting empty durations')
    emit('price-changed', 0)
    emit('durations-changed', [])
  }
  
  // ✅ LÄNGERE Blockierung um andere Events zu verhindern
  setTimeout(() => {
    isAutoEmitting.value = false
    logger.debug('✅ CategorySelector - User selection completed, auto-emit enabled')
  }, 1000) // 1 Sekunde statt 300ms
}

// Watchers
// GEZIELTER FIX für CategorySelector.vue
// Ersetzen Sie den User-Watcher (Zeile 314-328) mit diesem korrigierten Code:

watch(() => props.selectedUser, (newUser, oldUser) => {
  // ✅ Skip während Initialisierung
  if (isInitializing.value) {
    logger.debug('🚫 Auto-category selection blocked - initializing')
    return
  }
  
  // ✅ Skip wenn bereits Kategorie gewählt (verhindert Überschreibung)
  if (props.modelValue) {
    logger.debug('🚫 Auto-category selection blocked - category already selected')
    return
  }

  // ✅ FIX: Bei freeslots (kein User) Standard-Kategorie 'B' laden
  if (!newUser) {
    logger.debug('🎯 No user selected - loading default category: B')
    const defaultCategory = availableCategoriesForUser.value.find(cat => cat.code === 'B')
    
    if (defaultCategory) {
      logger.debug('🎯 Auto-selected default category:', defaultCategory)
      isAutoEmitting.value = true
      hasFiredCategorySelected.value = true
      
      emit('update:modelValue', 'B')
      emit('category-selected', defaultCategory)
      emit('price-changed', 2.11)
      emit('durations-changed', defaultCategory.availableDurations)
      
      setTimeout(() => {
        isAutoEmitting.value = false
      }, 200)
    }
    return
  }

  if (oldUser?.id === newUser.id) return

 
 if (newUser?.category) {
   logger.debug('👤 User category detected:', newUser.category)
   
   // ✅ FIX: category kann ein Array (text[]) oder String sein
   const rawCategory = Array.isArray(newUser.category)
     ? newUser.category[0]
     : newUser.category.split(',')[0]
   const primaryCategory = rawCategory?.trim()
   
   if (!primaryCategory) return
   
   logger.debug('🎯 Using primary category:', primaryCategory)
   
   // ✅ STEP 1: Suche in der gefilterten Liste (Subcategories)
   let selected = availableCategoriesForUser.value.find(cat => cat.code === primaryCategory)
   logger.debug('🔍 Step 1 - Found in filtered list (subcategories):', selected?.code)
   
     // ✅ STEP 2: Falls nicht gefunden, suche in ALL categories (auch Parents)
   if (!selected) {
     const allCat = allCategories.value.find(cat => cat.code === primaryCategory)
     if (allCat) {
       logger.debug('🔍 Step 2 - Found in all categories (might be parent):', allCat.code)
       // ✅ Falls Parent: nehme das Kind
       if (allCat.parent_category_id === null && allCat.id) {
         // Das ist ein Parent - suche das erste Kind
         const childCat = allCategories.value.find(cat => String(cat.parent_category_id) === String(allCat.id))
         if (childCat) {
           selected = availableCategoriesForUser.value.find(cat => cat.code === childCat.code)
           logger.debug('🎯 Primary is parent - using first child:', selected?.code)
         }
       } else {
         // Das ist ein Subcategory - suche es in der verfügbaren Liste
         selected = availableCategoriesForUser.value.find(cat => cat.code === allCat.code)
         logger.debug('🎯 Primary is subcategory - using it:', selected?.code)
       }
     }
   }
   
   if (!selected) {
     logger.debug('⚠️ No matching category found for:', primaryCategory)
     return
   }
   
   // ✅ Kategorie bereits korrekt gesetzt, aber category-selected noch nie gefeuert?
   // (passiert wenn EventModal formData.type vorab auf 'B' setzt)
   if (props.modelValue === selected.code && hasFiredCategorySelected.value) {
     logger.debug('🚫 Auto-category selection skipped - already set to:', selected.code)
     return
   }
   
   logger.debug('🎯 Watcher: emitting category-selected for:', selected.code, '(hasFired:', hasFiredCategorySelected.value, ')')
   
   // ✅ Mark als Auto-Selection
   isAutoEmitting.value = true
   hasFiredCategorySelected.value = true
   
   emit('update:modelValue', selected.code)
   emit('category-selected', selected)
   emit('price-changed', 2.11)
   emit('durations-changed', selected.availableDurations)
   
   setTimeout(() => {
     isAutoEmitting.value = false
   }, 200)
 }
}, { immediate: false })

// ✅ Staff-Kategorien werden nicht mehr neu geladen
// Alle Kategorien werden direkt aus der categories Tabelle geladen
watch(() => props.currentUser?.id, (newUserId) => {
  if (newUserId && props.currentUserRole === 'staff') {
    logger.debug('✅ Staff user changed, but no need to reload categories')
    logger.debug('✅ All categories are loaded from the central categories table')
  }
}, { immediate: true })

// Neuer Watcher in CategorySelector.vue hinzufügen:
watch([() => allCategories.value.length, () => props.modelValue], ([categoriesCount, modelValue]) => {
 // ✅ Skip während Initialisierung
 if (isInitializing.value) {
   logger.debug('🚫 Re-emit blocked - initializing')
   return
 }
 
 // ✅ Skip wenn Auto-Selection läuft
 if (isAutoEmitting.value) {
   logger.debug('🚫 Re-emit blocked - auto-selection in progress')
   return
 }
 
 if (categoriesCount > 0 && modelValue) {
   logger.debug('🔄 Categories loaded, re-emitting for:', modelValue)
   const selected = availableCategoriesForUser.value.find(cat => cat.code === modelValue)
   
   if (selected) {
     logger.debug('✅ Re-emitting durations-changed:', selected.availableDurations)
     
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