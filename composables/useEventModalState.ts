// composables/useEventModalState.ts
import { ref, reactive, computed, nextTick } from 'vue'

// Centralized State mit Race Condition Prevention
export const useEventModalState = () => {
  
  // === LOADING STATES ===
  const isInitializing = ref(false)
  const isUserInteraction = ref(false)
  const updateQueue = ref<string[]>([])
  
  // === CORE DATA ===
  const formData = reactive({
    selectedStudent: null,
    selectedCategory: null,
    selectedDuration: 45,
    availableDurations: [45],
    isAutoSelecting: false
  })
  
  // === RACE CONDITION PREVENTION ===
  const preventRaceCondition = async (operation: string, callback: () => void) => {
    if (isInitializing.value) {
      console.log(`🚫 Race prevented: ${operation} during initialization`)
      return
    }
    
    if (updateQueue.value.includes(operation)) {
      console.log(`🚫 Race prevented: ${operation} already in queue`)
      return
    }
    
    updateQueue.value.push(operation)
    
    try {
      await nextTick()
      callback()
    } finally {
      updateQueue.value = updateQueue.value.filter(op => op !== operation)
    }
  }
  
  // === DEBOUNCED OPERATIONS ===
  let durationUpdateTimeout: any = null
  
  const setDurationsDebounced = (durations: number[], source: string) => {
    clearTimeout(durationUpdateTimeout)
    
    durationUpdateTimeout = setTimeout(() => {
      preventRaceCondition(`duration-update-${source}`, () => {
        console.log(`⏱️ Setting durations from ${source}:`, durations)
        formData.availableDurations = [...durations]
        
        // Auto-select first duration only if none selected
        if (!formData.selectedDuration || !durations.includes(formData.selectedDuration)) {
          formData.selectedDuration = durations[0] || 45
          console.log(`✅ Auto-selected duration: ${formData.selectedDuration}`)
        }
      })
    }, 100) // 100ms debounce
  }
  
  // === STUDENT SELECTION WITH LOCK ===
  const selectStudent = async (student: any) => {
    if (formData.isAutoSelecting) {
      console.log('🚫 Student selection blocked - auto-selection in progress')
      return
    }
    
    isUserInteraction.value = true
    formData.isAutoSelecting = true
    
    try {
      console.log('👤 Manual student selection:', student?.first_name)
      formData.selectedStudent = student
      
      // Clear dependent selections
      formData.selectedCategory = null
      formData.availableDurations = [45]
      formData.selectedDuration = 45
      
      await nextTick()
      
      // Auto-select category if student has one
      if (student?.category && !isInitializing.value) {
        setTimeout(() => {
          preventRaceCondition('auto-category-from-student', () => {
            console.log('🎯 Auto-selecting category from student:', student.category)
            // Emit to parent to trigger category selection
          })
        }, 150) // Delayed auto-selection
      }
      
    } finally {
      formData.isAutoSelecting = false
      isUserInteraction.value = false
    }
  }
  
  // === CATEGORY SELECTION WITH LOCK ===
  const selectCategory = async (category: any, isAutomatic = false) => {
    if (formData.isAutoSelecting && !isAutomatic) {
      console.log('🚫 Category selection blocked - auto-selection in progress')
      return
    }
    
    preventRaceCondition('category-selection', () => {
      console.log('🎯 Category selected:', category?.code)
      formData.selectedCategory = category
      
      if (category?.availableDurations) {
        setDurationsDebounced(category.availableDurations, 'category-selection')
      }
    })
  }
  
  // === INITIALIZATION MODE ===
  const startInitialization = () => {
    console.log('🔄 Starting initialization mode')
    isInitializing.value = true
    updateQueue.value = []
  }
  
  const finishInitialization = async () => {
    await nextTick()
    isInitializing.value = false
    console.log('✅ Initialization completed')
  }
  
  // === COMPUTED HELPERS ===
  const canAutoSelect = computed(() => {
    return !isInitializing.value && !formData.isAutoSelecting
  })
  
  const isInUserInteraction = computed(() => {
    return isUserInteraction.value
  })
  
  return {
    // State
    formData,
    isInitializing,
    canAutoSelect,
    isInUserInteraction,
    
    // Methods
    selectStudent,
    selectCategory,
    setDurationsDebounced,
    preventRaceCondition,
    startInitialization,
    finishInitialization
  }
}