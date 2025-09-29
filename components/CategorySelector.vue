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
          : 'border-gray-300 bg-gray-800 text-white focus:ring-2 focus:ring-green-500 disabled:opacity-50'
      ]"
    >
      <option value="" class="text-white bg-gray-800">
        {{ isLoading ? 'Kategorien laden...' : 'Kategorie wählen' }}
      </option>
      <option 
        v-for="category in availableCategoriesForUser" 
        :key="category.code"
        :value="category.code"
        class="text-white bg-gray-800"
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
  lesson_duration_minutes: number[]
  theory_durations?: number[]
  exam_duration_minutes?: number  
  color?: string
  is_active: boolean
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
  modelValue: string
  selectedUser?: any
  currentUser?: any
  currentUserRole?: string
  appointmentType?: string
  showDebugInfo?: boolean
  isPastAppointment?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
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
  let result: CategoryWithDurations[] = []
  
  console.log('🔍 Computing availableCategoriesForUser:', {
    role: props.currentUserRole,
    allCategoriesCount: allCategories.value.length,
    staffDurationsCount: 0 // ✅ ENTFERNT: staffCategoryDurations wird nicht mehr verwendet
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
      availableDurations: [props.appointmentType === 'exam' ? (cat.exam_duration_minutes || 135) : (cat.lesson_duration_minutes || 45)]
      }))
    console.log('👨‍💼 Admin: Showing all categories:', result.length)
  }
  // ✅ Staff sieht alle Kategorien aus der zentralen categories Tabelle
  else if (props.currentUserRole === 'staff') {
    console.log('👨‍🏫 Staff: Using all categories from central table')
    result = allCategories.value
      .filter(cat => cat.is_active)
      .map(cat => ({
        ...cat,
        availableDurations: [props.appointmentType === 'exam' ? (cat.exam_duration_minutes || 135) : (cat.lesson_duration_minutes || 45)]
      }))
    console.log('👨‍🏫 Staff: Final categories:', result.length, result.map(r => r.code))
  }
  // Client sieht alle aktiven Kategorien (für Terminbuchung)
  else {
    result = allCategories.value
      .filter(cat => cat.is_active)
      .map(cat => ({
        ...cat,
        availableDurations: [props.appointmentType === 'exam' ? (cat.exam_duration_minutes || 135) : (cat.lesson_duration_minutes || 45)]
      }))
    console.log('👤 Client: Showing all categories:', result.length)
  }
  
  // ✅ Sortieren nach Code und dann nach Name (display_order existiert nicht mehr)
  const sortedResult = result.sort((a, b) => {
    if (a.code !== b.code) {
      return a.code.localeCompare(b.code)
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
    
    // Get current user's tenant_id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Nicht angemeldet')

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) throw new Error('Fehler beim Laden der Benutzerinformationen')
    if (!userProfile.tenant_id) throw new Error('Kein Tenant zugewiesen')

    console.log('🔍 Loading categories for tenant:', userProfile.tenant_id)
    
    // ✅ KORREKTE REIHENFOLGE: Query zuerst definieren (with tenant filter)
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
        created_at
      `)
      .eq('is_active', true)
      .eq('tenant_id', userProfile.tenant_id)
      .order('code', { ascending: true })

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
        availableDurations: lessonDurations // Use converted lesson durations
      }
    })
    
    console.log('✅ All categories loaded from database:', result.data?.length)
    console.log('✅ Categories with durations:', allCategories.value.map(c => ({ 
      code: c.code, 
      durations: c.lesson_duration_minutes 
    })))

    // ✅ Staff-spezifische Dauern werden nicht mehr benötigt
    // Alle Dauern werden direkt aus der categories Tabelle geladen
    console.log('✅ Staff durations loading skipped - using central categories table')

  } catch (err: any) {
    console.error('❌ Error loading categories (switching to offline mode):', err)
    error.value = err.message || 'Offline-Modus: Verwende lokale Kategorien'
    
    // ✅ SOFORTIGER OFFLINE-FALLBACK (CategorySelector hat kein dynamicPricing/formData!)
    console.log('🔄 Using complete offline fallback categories')
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



// ✅ ENTFERNT: loadStaffCategoryDurations - wird nicht mehr benötigt
// Da wir jetzt die categories Tabelle als zentrale Quelle verwenden,
// werden alle Dauern direkt aus der categories Tabelle geladen
const loadStaffCategoryDurations = async (staffId: string) => {
  console.log('🔄 Staff category durations loading removed - using categories table instead')
  console.log('✅ All durations are now loaded from the central categories table')
  
  // ✅ Keine Aktion erforderlich - Dauern werden bereits in loadCategories geladen
}

const handleCategoryChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const newValue = target.value
  
  console.log('🔄 CategorySelector - Manual category change:', newValue)
  
  // ❌ Vergangene Termine können nicht mehr geändert werden
  if (props.isPastAppointment) {
    console.log('🚫 Cannot change category for past appointment')
    return
  }
  
  // ✅ BLOCKIERE alle anderen Auto-Updates während User-Auswahl
  isAutoEmitting.value = true
  
  emit('update:modelValue', newValue)
  
  const selected = availableCategoriesForUser.value.find(cat => cat.code === newValue) || null
  console.log('🎯 CategorySelector - Selected category:', selected)
  console.log('🎯 CategorySelector - Available durations:', selected?.availableDurations)
  
  emit('category-selected', selected)
  
  if (selected) {
    const pricePerMinute = 2.11
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
      emit('price-changed', 2.11)
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
     
     const pricePerMinute = 2.11
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

// ✅ Staff-Kategorien werden nicht mehr neu geladen
// Alle Kategorien werden direkt aus der categories Tabelle geladen
watch(() => props.currentUser?.id, (newUserId) => {
  if (newUserId && props.currentUserRole === 'staff') {
    console.log('✅ Staff user changed, but no need to reload categories')
    console.log('✅ All categories are loaded from the central categories table')
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